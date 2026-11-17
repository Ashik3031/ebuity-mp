import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import { getNoonConfig, isNoonConfigured, createPaymentSession } from "./services/noonPaymentsService.js";

async function runDiagnostic() {
  console.log("=== NOON PAYMENTS CREATE SESSION DIAGNOSTIC ===");
  console.log("Configured:", isNoonConfigured());
  const config = getNoonConfig();
  console.log("Endpoint:", config.endpoint);
  console.log("Currency:", config.currency);
  console.log("Payment Action:", config.paymentAction);

  console.log("\nCalling createPaymentSession()...");
  const result = await createPaymentSession();
  console.log("Result:", {
    success: result.success,
    configured: result.configured,
    hasJwt: Boolean(result.jwt),
    jwtPrefix: result.jwt ? result.jwt.substring(0, 25) + "..." : null,
    sessionIdentifier: result.sessionIdentifier,
    requestReference: result.requestReference,
    endPoint: result.endPoint,
    message: result.message,
    resultCode: result.resultCode,
  });

  if (result.success && result.jwt) {
    console.log("\n>>> SUCCESS: Valid session JWT obtained from Noon Payments sandbox API.");
  } else {
    console.error("\n>>> FAILED: Upstream Noon Payments error:", result.message);
  }
}

runDiagnostic().catch(console.error);
