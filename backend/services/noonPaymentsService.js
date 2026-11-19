// backend/services/noonPaymentsService.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend .env is loaded regardless of process.cwd()
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

/**
 * Official Noon Payments JavaScript Payment Session SDK & Order API Service
 * Follows https://docs.noonpayments.com/sdk/reference/js
 * and https://docs.noonpayments.com/sdk/reference/np-payment-session-sdk
 */

const DEFAULT_SANDBOX_ENDPOINT = "https://api-test.noonpayments.com";

/**
 * Check if Noon Payments credentials are fully populated in the environment.
 * If credentials are missing, returns false so caller can gracefully notify.
 */
export function isNoonConfigured() {
  const appId = (process.env.NOON_PAYMENTS_APPLICATION_ID || "").trim();
  const authKey = (process.env.NOON_PAYMENTS_AUTHORIZATION_KEY || "").trim();
  const businessId = (process.env.NOON_PAYMENTS_BUSINESS_IDENTIFIER || "").trim();

  return Boolean(appId && authKey && businessId);
}

/**
 * Get active configuration with safe defaults
 */
export function getNoonConfig() {
  const configured = isNoonConfigured();
  const endpoint = (process.env.NOON_PAYMENTS_API_ENDPOINT || "").trim() || DEFAULT_SANDBOX_ENDPOINT;
  const currency = (process.env.NOON_PAYMENTS_CURRENCY || "").trim() || "AED";
  const paymentAction = (process.env.NOON_PAYMENTS_PAYMENT_ACTION || "").trim() || "SALE";
  const paymentCategory = (process.env.NOON_PAYMENTS_PAYMENT_CATEGORY || "").trim() || "pay";
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
  const returnUrl = (process.env.NOON_PAYMENTS_RETURN_URL || "").trim() || `${clientUrl}/payment/noon-return`;

  return {
    configured,
    endpoint: endpoint.replace(/\/+$/, ""),
    currency: currency.toUpperCase(),
    paymentAction: paymentAction.toUpperCase(),
    paymentCategory,
    returnUrl,
  };
}

/**
 * Build the Noon Payments Authorization header: Key Base64(BusinessIdentifier.ApplicationIdentifier:ApplicationKey)
 */
export function getNoonAuthHeader() {
  if (!isNoonConfigured()) {
    throw new Error(
      "Noon Payments credentials are not configured in environment variables. Please set NOON_PAYMENTS_BUSINESS_IDENTIFIER, NOON_PAYMENTS_APPLICATION_ID, and NOON_PAYMENTS_AUTHORIZATION_KEY."
    );
  }

  const busId = (process.env.NOON_PAYMENTS_BUSINESS_IDENTIFIER || "").trim();
  const appId = (process.env.NOON_PAYMENTS_APPLICATION_ID || "").trim();
  const appKey = (process.env.NOON_PAYMENTS_AUTHORIZATION_KEY || "").trim();

  const credentialString = `${busId}.${appId}:${appKey}`;
  const base64Credentials = Buffer.from(credentialString, "utf8").toString("base64");

  return `Key ${base64Credentials}`;
}

/**
 * 1. Create Payment Session
 * Server-to-server call to initialize a payment session and retrieve the session JWT
 * Official docs: POST /payment/v1/session/create
 */
export async function createPaymentSession() {
  const config = getNoonConfig();

  if (!config.configured) {
    return {
      success: false,
      configured: false,
      message:
        "Noon Payments gateway credentials are not yet configured. Please insert your Noon Payments Application ID, Authorization Key, and Business Identifier into the environment.",
    };
  }

  const url = `${config.endpoint}/payment/v1/session/create`;
  const authHeader = getNoonAuthHeader();

  try {
    // Official Noon specification: Create Session requires no request body
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    const data = await res.json().catch(() => ({}));
    const requestReference =
      data.requestReference ||
      data.result?.reference ||
      data.reference ||
      null;

    // Safe upstream logging: result code, message, request reference (never log keys or JWT)
    console.log(`[NoonPayments] createPaymentSession response HTTP ${res.status}:`, {
      resultCode: data.resultCode,
      message: data.message || "OK",
      classDescription: data.classDescription || null,
      requestReference,
    });

    if (!res.ok || (data.resultCode !== undefined && data.resultCode !== 0)) {
      const errMsg =
        data.message ||
        data.classDescription ||
        `Noon Payments Create Session failed with HTTP ${res.status}`;
      return {
        success: false,
        configured: true,
        status: res.status,
        message: errMsg,
        resultCode: data.resultCode,
        requestReference,
      };
    }

    // Extract JWT from result payload
    const jwt =
      data.result?.jwt ||
      data.result?.token ||
      data.result?.sessionJwt ||
      (typeof data.result === "string" ? data.result : null);

    if (!jwt) {
      return {
        success: false,
        configured: true,
        status: res.status,
        message: "Noon Payments did not return a valid session JWT",
        resultCode: data.resultCode,
        requestReference,
      };
    }

    return {
      success: true,
      configured: true,
      jwt,
      sessionIdentifier: data.result?.sessionIdentifier || null,
      requestReference,
      endPoint: config.endpoint,
    };
  } catch (error) {
    console.error("[NoonPayments] createPaymentSession network error:", error.message);
    return {
      success: false,
      configured: true,
      message: `Failed to connect to Noon Payments: ${error.message}`,
    };
  }
}

/**
 * 2. Initiate Payment Order
 * Server-to-server call using sessionIdentifier from the client SDK
 * Official docs: POST /payment/v1/order
 *
 * @param {Object} params
 * @param {string} params.reference - Unique order/booking reference
 * @param {number|string} params.amount - Validated server-side amount
 * @param {string} [params.currency] - Currency (default AED)
 * @param {string} [params.name] - Order name / description
 * @param {string} [params.description] - Order description
 * @param {string} params.sessionIdentifier - sessionIdentifier returned by SDK pay()
 * @param {string} [params.returnUrl] - Return URL after 3DS authentication
 */
export async function initiatePaymentOrder({
  reference,
  amount,
  currency,
  name,
  description,
  sessionIdentifier,
  returnUrl,
}) {
  const config = getNoonConfig();

  if (!config.configured) {
    return {
      success: false,
      configured: false,
      message: "Noon Payments credentials not configured in environment.",
    };
  }

  if (!sessionIdentifier || typeof sessionIdentifier !== "string") {
    return {
      success: false,
      message: "Missing or invalid sessionIdentifier from client SDK.",
    };
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      success: false,
      message: "Invalid transaction amount.",
    };
  }

  const formattedAmount = Number(Number(amount).toFixed(2));
  const targetReturnUrl = returnUrl || config.returnUrl;
  const targetCurrency = (currency || config.currency).toUpperCase();

  const payload = {
    apiOperation: "INITIATE",
    order: {
      reference: String(reference),
      amount: formattedAmount,
      currency: targetCurrency,
      name: name || `Order ${reference}`,
      description: description || "Rose Essence Checkout",
      channel: "WEB",
      category: config.paymentCategory,
    },
    configuration: {
      paymentAction: config.paymentAction,
      returnUrl: targetReturnUrl,
    },
    paymentData: {
      type: "SESSION",
      data: {
        sessionIdentifier,
      },
    },
  };

  // Safe outgoing request logging (redact sensitive tokens)
  console.log(`[NoonPayments] initiatePaymentOrder outgoing payload:`, {
    apiOperation: payload.apiOperation,
    order: payload.order,
    configuration: payload.configuration,
    paymentData: {
      type: payload.paymentData.type,
      data: {
        sessionIdentifier: "[REDACTED]",
      },
    },
  });

  const url = `${config.endpoint}/payment/v1/order`;
  const authHeader = getNoonAuthHeader();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    // Safe upstream logging (never log secret keys or sessionIdentifier)
    console.log(`[NoonPayments] initiatePaymentOrder response HTTP ${res.status}:`, {
      resultCode: data.resultCode,
      resultClass: data.resultClass,
      classDescription: data.classDescription || null,
      actionHint: data.actionHint || null,
      message: data.message || "OK",
      requestReference: data.requestReference || null,
      reference,
      orderId: data.result?.order?.id || null,
      orderStatus: data.result?.order?.status || null,
    });

    if (!res.ok || (data.resultCode !== undefined && data.resultCode !== 0)) {
      const errMsg =
        data.message ||
        data.classDescription ||
        `Payment initiation failed with code ${data.resultCode || res.status}`;
      return {
        success: false,
        status: "FAILED",
        resultCode: data.resultCode,
        resultClass: data.resultClass,
        classDescription: data.classDescription,
        actionHint: data.actionHint,
        requestReference: data.requestReference,
        message: errMsg,
        reference,
      };
    }

    const orderResult = data.result?.order || {};
    const checkoutData = data.result?.checkoutData || {};
    const nextActions = data.result?.nextActions;
    const noonOrderId = orderResult.id ? String(orderResult.id) : null;
    const orderStatus = (orderResult.status || "").toUpperCase();

    // Check if 3DS redirection is required
    const redirectUrl = checkoutData.postUrl || checkoutData.redirectUrl;
    if (redirectUrl) {
      return {
        success: true,
        status: "AUTHENTICATING",
        nextAction: "REDIRECT",
        redirectUrl,
        noonOrderId,
        reference,
        amount: formattedAmount,
        currency: targetCurrency,
      };
    }

    // Check for direct success (frictionless 3DS or non-3DS card)
    if (orderStatus === "SUCCESS" || orderStatus === "PAID" || orderStatus === "AUTHORIZED") {
      return {
        success: true,
        status: "SUCCESS",
        nextAction: "NONE",
        noonOrderId,
        reference,
        amount: formattedAmount,
        currency: targetCurrency,
      };
    }

    // Pending state
    if (orderStatus === "INITIATED" || orderStatus === "PENDING" || orderStatus === "PROCESSING") {
      return {
        success: true,
        status: "PENDING",
        nextAction: nextActions || "WAIT",
        noonOrderId,
        reference,
        amount: formattedAmount,
        currency: targetCurrency,
      };
    }

    return {
      success: false,
      status: orderStatus || "FAILED",
      message: data.message || "Payment could not be completed.",
      noonOrderId,
      reference,
    };
  } catch (error) {
    console.error("[NoonPayments] initiatePaymentOrder error:", error.message);
    return {
      success: false,
      status: "FAILED",
      message: `Failed to initiate payment: ${error.message}`,
    };
  }
}

/**
 * 3. Verify Payment / Get Order Status
 * Server-to-server call to retrieve the definitive transaction state from Noon Payments
 * Official docs: GET /payment/v1/order/{orderId}
 *
 * @param {string} noonOrderId - Order ID returned during initiation
 */
export async function verifyOrderPayment(noonOrderId) {
  const config = getNoonConfig();

  if (!config.configured) {
    return {
      success: false,
      configured: false,
      message: "Noon Payments credentials not configured in environment.",
    };
  }

  if (!noonOrderId) {
    return {
      success: false,
      message: "Noon Order ID is required for verification.",
    };
  }

  const url = `${config.endpoint}/payment/v1/order/${encodeURIComponent(noonOrderId)}`;
  const authHeader = getNoonAuthHeader();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    const data = await res.json().catch(() => ({}));

    // Safe upstream logging for order verification
    console.log(`[NoonPayments] verifyOrderPayment response HTTP ${res.status}:`, {
      resultCode: data.resultCode,
      message: data.message || "OK",
      noonOrderId,
      orderStatus: data.result?.order?.status || null,
    });

    if (!res.ok || (data.resultCode !== undefined && data.resultCode !== 0)) {
      return {
        success: false,
        message: data.message || `Order verification failed with HTTP ${res.status}`,
        resultCode: data.resultCode,
      };
    }

    const orderData = data.result?.order || {};
    const transactions = Array.isArray(data.result?.transactions)
      ? data.result.transactions
      : [];

    const status = (orderData.status || "").toUpperCase();

    // Check if any transaction succeeded
    const hasSuccessfulTransaction = transactions.some(
      (tx) => (tx.status || "").toUpperCase() === "SUCCESS"
    );

    const isPaid = status === "SUCCESS" || status === "PAID" || hasSuccessfulTransaction;
    const isCancelled = status === "CANCELLED" || status === "CANCELED";
    const isFailed = status === "FAILED" || (!isPaid && !isCancelled && status !== "INITIATED");

    return {
      success: true,
      noonOrderId: String(orderData.id || noonOrderId),
      reference: orderData.reference || null,
      status: isPaid ? "SUCCESS" : isCancelled ? "CANCELLED" : isFailed ? "FAILED" : "PENDING",
      rawStatus: orderData.status,
      amount: orderData.amount,
      currency: orderData.currency,
      totalReversedAmount: orderData.totalReversedAmount || 0,
      totalCapturedAmount: orderData.totalCapturedAmount || 0,
      isPaid,
      transactions,
    };
  } catch (error) {
    console.error("[NoonPayments] verifyOrderPayment error:", error.message);
    return {
      success: false,
      message: `Failed to verify payment status: ${error.message}`,
    };
  }
}

/**
 * 4. Verify Noon Payments Webhook V2 Signature
 * Official Noon Webhook V2 specification:
 * - Request header `np-webhook-version` is "2"
 * - Payload is a JWS string in compact serialization: Header.Payload.Signature
 * - Signed using HMAC-SHA256 (HS256) with the Webhook Secret Key from Merchant Portal
 *
 * @param {string|Buffer} rawBody - Raw body containing the JWS token
 * @param {string} [secret] - Webhook secret key (defaults to env NOON_PAYMENTS_WEBHOOK_SECRET)
 * @param {string} [versionHeader] - Header value for `np-webhook-version`
 * @returns {{ valid: boolean, payload?: Object, error?: string, code?: number }}
 */
export function verifyNoonWebhookSignature(rawBody, secret, versionHeader) {
  const webhookSecret = (secret !== undefined && secret !== null ? secret : process.env.NOON_PAYMENTS_WEBHOOK_SECRET || "").trim();

  if (!webhookSecret) {
    return {
      valid: false,
      error: "NOON_PAYMENTS_WEBHOOK_SECRET is not configured in environment.",
      code: 503,
    };
  }

  // Validate version header if supplied
  if (versionHeader !== undefined && versionHeader !== null) {
    const ver = String(versionHeader).trim();
    if (ver !== "" && ver !== "2") {
      return {
        valid: false,
        error: `Unsupported webhook version: "${ver}". Expected version "2".`,
        code: 400,
      };
    }
  }

  let token = "";
  if (typeof rawBody === "string") {
    const trimmed = rawBody.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        token = String(parsed.token || parsed.jws || parsed.data || parsed.payload || "").trim();
      } catch {
        // Fall back to raw string
      }
    }
    if (!token) {
      token = trimmed;
    }
  } else if (Buffer.isBuffer(rawBody)) {
    const str = rawBody.toString("utf8").trim();
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const parsed = JSON.parse(str);
        token = String(parsed.token || parsed.jws || parsed.data || parsed.payload || "").trim();
      } catch {
        // Fall back to raw string
      }
    }
    if (!token) {
      token = str;
    }
  } else if (rawBody && typeof rawBody === "object") {
    token = String(rawBody.token || rawBody.jws || rawBody.data || rawBody.payload || "").trim();
  }

  // Strip optional surrounding quotes
  token = token.replace(/^"(.*)"$/, "$1");

  if (!token) {
    return {
      valid: false,
      error: "Empty or missing webhook body.",
      code: 400,
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      valid: false,
      error: "Malformed JWS payload. Expected Header.Payload.Signature format.",
      code: 400,
    };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Verify algorithm in Header
  let header;
  try {
    const headerJson = Buffer.from(headerB64, "base64url").toString("utf8");
    header = JSON.parse(headerJson);
  } catch (err) {
    return {
      valid: false,
      error: "Invalid JWS header encoding.",
      code: 400,
    };
  }

  if (header.alg && header.alg !== "HS256") {
    return {
      valid: false,
      error: `Unsupported algorithm "${header.alg}". Expected HS256.`,
      code: 400,
    };
  }

  // 2. Cryptographic signature check using constant-time comparison
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signingInput)
    .digest("base64url");

  const sigBuffer = Buffer.from(signatureB64, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const isHmacValid =
    sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer);

  if (!isHmacValid) {
    // Secondary check with jsonwebtoken library
    try {
      jwt.verify(token, webhookSecret, { algorithms: ["HS256"], ignoreExpiration: true });
    } catch {
      return {
        valid: false,
        error: "JWS signature verification failed. The payload has been tampered with or signed with a different key.",
        code: 401,
      };
    }
  }

  // 3. Parse verified payload
  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    return {
      valid: true,
      payload,
      header,
    };
  } catch (err) {
    return {
      valid: false,
      error: "Failed to parse decoded JWS payload as JSON.",
      code: 400,
    };
  }
}

/**
 * Helper to generate a valid Noon Payments Webhook V2 JWS string (useful for testing & mocks)
 *
 * @param {Object} payload - The event payload
 * @param {string} secret - Webhook secret key
 * @returns {string} - JWS compact string: Header.Payload.Signature
 */
export function createNoonWebhookJwsFixture(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: "noon_key_1",
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = Buffer.from(JSON.stringify(header), "utf8").toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}


