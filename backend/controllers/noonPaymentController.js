// backend/controllers/noonPaymentController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import ServiceZone from "../models/ServiceZone.js";
import AvailabilityConfig from "../models/AvailabilityConfig.js";
import Staff from "../models/Staff.js";
import userModel from "../models/userModel.js";
import Cart from "../models/cartModel.js";
import NoonWebhookEvent from "../models/NoonWebhookEvent.js";
import crypto from "crypto";
import {
  isNoonConfigured,
  getNoonConfig,
  createPaymentSession,
  initiatePaymentOrder,
  verifyOrderPayment,
  verifyNoonWebhookSignature,
} from "../services/noonPaymentsService.js";
import {
  getStoreSettings,
  computeServerSubtotal,
  buildPricingSnapshot,
} from "../utils/pricing.util.js";
import { checkAndDecrementStock } from "../utils/stock.util.js";
import {
  findBestEligibleStaff,
  getAlternativeSlots,
  createUAEDate,
} from "../services/staffAssignmentService.js";
import {
  notifyBookingConfirmed,
} from "../services/notificationService.js";
import {
  broadcastBookingCreated,
  broadcastOrderCreated,
} from "../services/realtimeService.js";
import { emailOrderConfirmed } from "../services/email.service.js";
import {
  resolveCustomerAndServiceAddress,
  validateBookingServices,
  validateBookingSchedule,
  generateUniqueBookingNumber,
} from "../services/bookingCreationService.js";

// Helper: remove purchased items from user's cart
async function removePurchasedFromCart(userId, purchased, session = null) {
  if (!userId) return;
  const cart = await Cart.findOne({ user: userId }).session(session || null);
  if (!cart) return;

  for (const p of purchased) {
    const vid = String(p.variantId || "");
    const size = String(p.size || "");

    const idx = cart.items.findIndex((i) => {
      const iVid = String(i.variant || "");
      const iSize = String(i.size || "");
      return iVid === vid && iSize === size;
    });

    if (idx > -1) {
      const newQty = (cart.items[idx].quantity || 0) - Number(p.quantity || 0);
      if (newQty > 0) cart.items[idx].quantity = newQty;
      else cart.items.splice(idx, 1);
    }
  }

  await cart.save({ session: session || undefined });
}

/**
 * GET /api/payment/noon/config-status
 * Public helper so the frontend knows if Noon Payments is configured
 * Never exposes secret credentials
 */
export const getNoonConfigStatus = async (req, res) => {
  try {
    const config = getNoonConfig();
    return res.status(200).json({
      success: true,
      configured: config.configured,
      currency: config.currency,
      endpoint: config.endpoint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check configuration status",
    });
  }
};

/**
 * POST /api/payment/noon/create-session
 * Calls Noon Payments Create Session API to generate a fresh payment session JWT
 */
export const createSessionHandler = async (req, res) => {
  try {
    const result = await createPaymentSession();
    if (!result.success) {
      const statusCode = !result.configured
        ? 503
        : (result.status && result.status >= 400 && result.status < 600 ? result.status : 400);

      return res.status(statusCode).json({
        success: false,
        message: result.message || "Failed to create payment session with Noon Payments",
        resultCode: result.resultCode,
        requestReference: result.requestReference || result.reference,
        configured: result.configured,
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("[NoonPaymentController] createSessionHandler error:", error);
    return res.status(502).json({
      success: false,
      message: error.message || "Upstream payment gateway communication error",
    });
  }
};

/**
 * POST /api/payment/noon/initiate-product-order
 * 1. Computes server-side pricing (never trusts client amount)
 * 2. Creates the Order record in database with paymentStatus="Pending"
 * 3. Calls Noon Payments Order API with sessionIdentifier
 * 4. Handles 3DS redirection or direct payment completion
 */
export const initiateProductOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const { products, address, sessionIdentifier, guestToken: clientGuestToken } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Products are required." });
    }
    if (!address) {
      return res.status(400).json({ success: false, message: "Delivery address is required." });
    }
    if (!sessionIdentifier) {
      return res.status(400).json({ success: false, message: "Payment sessionIdentifier is required." });
    }

    // Server-side calculation of pricing
    const [settings, subtotal] = await Promise.all([
      getStoreSettings(),
      computeServerSubtotal(products),
    ]);
    const pricing = buildPricingSnapshot({ subtotal, settings });
    const totalAmount = pricing.grandTotal;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order total amount." });
    }

    const guestToken = !userId
      ? clientGuestToken || crypto.randomBytes(24).toString("hex")
      : null;

    const normalizedAddress = {
      ...address,
      email: String(address.email || req.user?.email || "").trim().toLowerCase(),
    };

    // Create unique merchant reference
    const merchantReference = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create Order with pending payment
    const order = await Order.create({
      user: userId,
      guestToken,
      products,
      totalAmount,
      paymentMethod: "NOON",
      paymentStatus: "Pending",
      noonReference: merchantReference,
      status: "Pending",
      address: normalizedAddress,
      pricing,
      statusHistory: [{ status: "Pending", note: "Order placed awaiting Noon Payments authorization" }],
    });

    // Initiate payment with Noon Payments
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");
    const returnUrl = `${clientUrl}/payment/noon-return?type=product&orderId=${order._id}`;

    const noonResult = await initiatePaymentOrder({
      reference: merchantReference,
      amount: totalAmount,
      currency: "AED",
      name: `Order #${order._id.toString().slice(-6)}`,
      description: `Rose Essence Order ${merchantReference}`,
      sessionIdentifier,
      returnUrl,
    });

    if (!noonResult.success) {
      // Update order to Failed
      order.paymentStatus = "Failed";
      order.noonPaymentStatus = "FAILED";
      order.statusHistory.push({ status: "Cancelled", note: `Payment failed: ${noonResult.message}` });
      await order.save();

      return res.status(400).json({
        success: false,
        message: noonResult.message || "Payment initiation failed",
        resultCode: noonResult.resultCode,
        resultClass: noonResult.resultClass,
        classDescription: noonResult.classDescription,
        actionHint: noonResult.actionHint,
        requestReference: noonResult.requestReference,
        orderId: order._id,
      });
    }

    // Save Noon Order ID
    order.noonOrderId = noonResult.noonOrderId;
    order.noonPaymentStatus = noonResult.status;

    // Handle 3DS Redirection
    if (noonResult.nextAction === "REDIRECT" && noonResult.redirectUrl) {
      order.statusHistory.push({ status: "Pending", note: "3DS authentication required" });
      await order.save();

      return res.status(200).json({
        success: true,
        orderId: order._id,
        guestToken,
        noonOrderId: noonResult.noonOrderId,
        requiresRedirect: true,
        redirectUrl: noonResult.redirectUrl,
      });
    }

    // Direct Success (frictionless 3DS or non-3DS)
    if (noonResult.status === "SUCCESS") {
      order.paymentStatus = "Paid";
      order.status = "Pending";
      order.statusHistory.push({ status: "Pending", note: "Noon Payments captured successfully" });

      // Atomically decrement stock
      try {
        await checkAndDecrementStock(products, null);
      } catch (stkErr) {
        console.warn("[NoonProductOrder] Stock decrement note:", stkErr.message);
      }

      // Clear server cart if authenticated
      if (userId) {
        await removePurchasedFromCart(userId, products, null).catch(() => { });
      }

      await order.save();

      // Trigger background notifications
      emailOrderConfirmed({
        to: order.address?.email,
        order,
        user: { name: order.address?.fullName, email: order.address?.email },
      }).catch(() => { });

      broadcastOrderCreated(order);

      return res.status(200).json({
        success: true,
        orderId: order._id,
        guestToken,
        noonOrderId: noonResult.noonOrderId,
        requiresRedirect: false,
        order,
      });
    }

    // Pending / processing state
    await order.save();
    return res.status(200).json({
      success: true,
      orderId: order._id,
      guestToken,
      noonOrderId: noonResult.noonOrderId,
      requiresRedirect: false,
      status: noonResult.status,
    });
  } catch (error) {
    console.error("[NoonPaymentController] initiateProductOrder error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process product payment order",
    });
  }
};

/**
 * POST /api/payment/noon/initiate-booking-payment
 * 1. Validates treatment services, date & time
 * 2. Creates service Booking with paymentStatus="pending"
 * 3. Calls Noon Payments Order API with sessionIdentifier
 * 4. Handles 3DS redirection or direct payment completion
 */
export const initiateBookingPayment = async (req, res) => {
  try {
    const {
      serviceIds,
      address,
      addressId,
      saveAddressToProfile,
      scheduledDate,
      scheduledTime: rawScheduledTime,
      specialRequests,
      sessionIdentifier,
    } = req.body;

    if (!sessionIdentifier) {
      return res.status(400).json({
        success: false,
        message: "Payment sessionIdentifier is required.",
      });
    }

    // 1. Resolve Customer and Service Address (Unified for Guest & Logged-in)
    const {
      customerId,
      customerDetails,
      serviceAddress,
      isGuestBooking,
      guestClaimToken,
    } = await resolveCustomerAndServiceAddress({
      user: req.user,
      address,
      addressId,
      saveAddressToProfile: Boolean(saveAddressToProfile || req.body.saveAddress),
    });

    // 2. Validate Service Selection
    const {
      validIds,
      serviceSnapshots,
      totalDurationMinutes,
      totalPrice,
    } = await validateBookingServices(serviceIds);

    // 3. Validate Date & Time Schedule
    const {
      scheduledTime,
      scheduledStartTime,
      scheduledEndTime,
    } = validateBookingSchedule({
      scheduledDate,
      rawScheduledTime,
      totalDurationMinutes,
    });

    // Config & Staff assignment
    let config = await AvailabilityConfig.findOne({ key: "default_config" });
    const bufferMins = config?.bufferMinutes || 30;
    const activeStaffCount = await Staff.countDocuments({ isActive: true });
    let assignedStaff = null;
    let staffAssignmentStatus = "unassigned";
    const assignmentHistory = [];

    if (activeStaffCount > 0) {
      const assignmentResult = await findBestEligibleStaff({
        serviceIds: validIds,
        scheduledDate,
        startTime: scheduledStartTime,
        endTime: scheduledEndTime,
        bufferMinutes: bufferMins,
      });

      if (assignmentResult.success && assignmentResult.staff) {
        assignedStaff = assignmentResult.staff._id;
        staffAssignmentStatus = "assigned";
        assignmentHistory.push({
          staffId: assignmentResult.staff._id,
          staffName: assignmentResult.staff.name,
          action: "auto_assigned",
          reason: "Assigned staff member for online prepaid booking",
          performedBy: "system",
          timestamp: new Date(),
        });
      }
    }

    const bookingNumber = generateUniqueBookingNumber(scheduledDate);
    const merchantReference = `BKG-${bookingNumber}`;

    const booking = await Booking.create({
      bookingNumber,
      customer: customerId,
      customerDetails,
      services: serviceSnapshots,
      totalDurationMinutes,
      totalPrice,
      currency: "AED",
      serviceAddress,
      scheduledDate,
      scheduledTime,
      scheduledStartTime,
      scheduledEndTime,
      status: "confirmed",
      paymentMethod: "noon",
      paymentStatus: "pending",
      noonReference: merchantReference,
      isGuestBooking,
      guestClaimToken: isGuestBooking ? guestClaimToken : null,
      specialRequests: specialRequests ? String(specialRequests).trim() : "",
      slotLockKey: `${scheduledDate}_${scheduledTime}_${assignedStaff || "unassigned"}`,
      assignedStaff,
      staffAssignmentStatus,
      assignmentHistory,
      travelBufferMinutes: bufferMins,
      statusHistory: [
        {
          status: "pending",
          note: isGuestBooking
            ? "Guest booking initiated awaiting Noon Payments authorization"
            : "Customer booking initiated awaiting Noon Payments authorization",
        },
      ],
    });

    // Initiate payment with Noon Payments
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");
    const returnUrl = `${clientUrl}/payment/noon-return?type=booking&bookingId=${booking._id}${guestClaimToken ? `&claimToken=${guestClaimToken}` : ""}`;

    const noonResult = await initiatePaymentOrder({
      reference: merchantReference,
      amount: totalPrice,
      currency: "AED",
      name: `Booking #${bookingNumber}`,
      description: `Rose Essence Booking ${bookingNumber}`,
      sessionIdentifier,
      returnUrl,
    });

    if (!noonResult.success) {
      booking.paymentStatus = "unpaid";
      booking.noonPaymentStatus = "FAILED";
      await booking.save();

      return res.status(400).json({
        success: false,
        message: noonResult.message || "Booking payment initiation failed",
        resultCode: noonResult.resultCode,
        resultClass: noonResult.resultClass,
        classDescription: noonResult.classDescription,
        actionHint: noonResult.actionHint,
        requestReference: noonResult.requestReference,
        bookingId: booking._id,
        bookingNumber,
      });
    }

    booking.noonOrderId = noonResult.noonOrderId;
    booking.noonPaymentStatus = noonResult.status;

    // Handle 3DS Redirection
    if (noonResult.nextAction === "REDIRECT" && noonResult.redirectUrl) {
      await booking.save();
      return res.status(200).json({
        success: true,
        bookingId: booking._id,
        bookingNumber,
        noonOrderId: noonResult.noonOrderId,
        requiresRedirect: true,
        redirectUrl: noonResult.redirectUrl,
        guestClaimToken: isGuestBooking ? guestClaimToken : undefined,
      });
    }

    // Direct Success
    if (noonResult.status === "SUCCESS") {
      booking.paymentStatus = "paid";
      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate("assignedStaff", "name email phone profileImage")
        .lean();

      notifyBookingConfirmed(populatedBooking).catch(() => { });
      broadcastBookingCreated(populatedBooking);

      return res.status(200).json({
        success: true,
        bookingId: booking._id,
        bookingNumber,
        noonOrderId: noonResult.noonOrderId,
        requiresRedirect: false,
        booking: {
          ...populatedBooking,
          guestClaimToken: isGuestBooking ? guestClaimToken : undefined,
        },
        guestClaimToken: isGuestBooking ? guestClaimToken : undefined,
      });
    }

    await booking.save();
    return res.status(200).json({
      success: true,
      bookingId: booking._id,
      bookingNumber,
      noonOrderId: noonResult.noonOrderId,
      requiresRedirect: false,
      status: noonResult.status,
      guestClaimToken: isGuestBooking ? guestClaimToken : undefined,
    });
  } catch (error) {
    console.error("[NoonPaymentController] initiateBookingPayment error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to process booking payment",
      error: error.message,
    });
  }
};

/**
 * POST /api/payment/noon/verify
 * Verifies final payment status using Noon Payments Get Order API
 * Updates local database record idempotently
 */
export const verifyPaymentHandler = async (req, res) => {
  try {
    const { noonOrderId, orderId, bookingId, type } = req.body;

    if (!noonOrderId && !orderId && !bookingId) {
      return res.status(400).json({
        success: false,
        message: "Noon Order ID, local Order ID, or Booking ID is required.",
      });
    }

    // Look up target record to find noonOrderId if not passed directly
    let targetNoonId = noonOrderId;
    let targetOrder = null;
    let targetBooking = null;

    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      targetOrder = await Order.findById(orderId);
      if (targetOrder?.noonOrderId) targetNoonId = targetOrder.noonOrderId;
    } else if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      targetBooking = await Booking.findById(bookingId);
      if (targetBooking?.noonOrderId) targetNoonId = targetBooking.noonOrderId;
    }

    if (!targetNoonId) {
      // Find by noonOrderId in database
      targetOrder = await Order.findOne({ noonOrderId });
      if (!targetOrder) {
        targetBooking = await Booking.findOne({ noonOrderId });
      }
      targetNoonId = noonOrderId;
    }

    if (!targetNoonId) {
      return res.status(400).json({
        success: false,
        message: "Could not locate a valid Noon Order ID for verification.",
      });
    }

    // Call official Noon Payments GET Order API
    const verification = await verifyOrderPayment(targetNoonId);

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message || "Payment verification failed with Noon Payments",
        resultCode: verification.resultCode,
      });
    }

    // Process Product Order update
    if (type === "product" || targetOrder || (orderId && !targetBooking)) {
      const order = targetOrder || (await Order.findById(orderId));
      if (order) {
        const wasAlreadyPaid = order.paymentStatus === "Paid";
        const wasAlreadyRefunded = order.paymentStatus === "Refunded";

        if (verification.isPaid) {
          order.noonPaymentStatus = verification.status || "CAPTURED";
          order.paymentStatus = "Paid";
          if (!wasAlreadyPaid) {
            order.statusHistory.push({
              status: order.status,
              note: `Noon payment verified (${verification.noonOrderId})`,
            });

            // Decrement stock if not already done
            try {
              await checkAndDecrementStock(order.products, null);
            } catch (err) {
              console.warn("[NoonVerify] Stock note:", err.message);
            }

            // Clear cart if user logged in
            if (order.user) {
              await removePurchasedFromCart(order.user, order.products, null).catch(() => { });
            }

            // Send confirmation email
            emailOrderConfirmed({
              to: order.address?.email,
              order,
              user: { name: order.address?.fullName, email: order.address?.email },
            }).catch(() => { });

            broadcastOrderCreated(order);
          }
        } else if (!wasAlreadyPaid && !wasAlreadyRefunded && (verification.status === "FAILED" || verification.status === "CANCELLED")) {
          // Never downgrade an already paid order from verify handler
          order.noonPaymentStatus = verification.status;
          order.paymentStatus = "Failed";
          order.statusHistory.push({
            status: "Cancelled",
            note: `Noon payment rejected or cancelled (${verification.status})`,
          });
        }

        await order.save();

        return res.status(200).json({
          success: true,
          type: "product",
          isPaid: verification.isPaid,
          status: verification.status,
          orderId: order._id,
          order,
        });
      }
    }

    // Process Service Booking update
    if (type === "booking" || targetBooking || (bookingId && !targetOrder)) {
      const booking = targetBooking || (await Booking.findById(bookingId));
      if (booking) {
        const wasAlreadyPaid = booking.paymentStatus === "paid";
        const wasAlreadyRefunded = booking.paymentStatus === "refunded";

        if (verification.isPaid) {
          booking.noonPaymentStatus = verification.status || "CAPTURED";
          booking.paymentStatus = "paid";
          if (!wasAlreadyPaid) {
            const populatedBooking = await Booking.findById(booking._id)
              .populate("assignedStaff", "name email phone profileImage")
              .lean();

            notifyBookingConfirmed(populatedBooking).catch(() => { });
            broadcastBookingCreated(populatedBooking);
          }
        } else if (!wasAlreadyPaid && !wasAlreadyRefunded && (verification.status === "FAILED" || verification.status === "CANCELLED")) {
          // Never downgrade an already paid booking from verify handler
          booking.noonPaymentStatus = verification.status;
          booking.paymentStatus = "unpaid";
        }

        await booking.save();

        return res.status(200).json({
          success: true,
          type: "booking",
          isPaid: verification.isPaid,
          status: verification.status,
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          booking,
        });
      }
    }

    return res.status(200).json({
      success: true,
      isPaid: verification.isPaid,
      status: verification.status,
      noonOrderId: verification.noonOrderId,
      details: verification,
    });
  } catch (error) {
    console.error("[NoonPaymentController] verifyPaymentHandler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify Noon payment",
    });
  }
};

/**
 * POST /api/payment/noon/webhook
 * Public endpoint for Noon Payments Webhook V2 (JWS)
 * Handles asynchronous payment updates for both Product Orders and Service Bookings
 * Follows official Noon Payments Webhook V2 specification:
 * - JWS compact serialization (Header.Payload.Signature) with HS256
 * - Deterministic idempotency tracking
 * - Ambiguous status reconciliation via GET ORDER API
 * - Strict anti-downgrade lifecycle protection
 * - Sanitized logging and storage
 */
export const handleNoonWebhook = async (req, res) => {
  const versionHeader = req.headers["np-webhook-version"] || req.headers["webhook-version"];
  const rawBody = req.body;

  // 1. Signature Verification using exact Noon Webhook V2 specification
  const verification = verifyNoonWebhookSignature(
    rawBody,
    process.env.NOON_PAYMENTS_WEBHOOK_SECRET,
    versionHeader
  );

  if (!verification.valid) {
    const statusCode = verification.code || 401;
    console.warn(`[NoonWebhook] Rejected webhook (${statusCode}): ${verification.error}`);
    return res.status(statusCode).json({
      success: false,
      message: verification.error,
    });
  }

  const payload = verification.payload || {};

  // Extract core parameters from payload
  const rawOrderId =
    payload.orderId ??
    payload.order?.id ??
    payload.order?.orderId ??
    payload.id ??
    "";
  const orderId = String(rawOrderId).trim();

  const merchantOrderRef = String(
    payload.merchantOrderRef ||
    payload.merchantReference ||
    payload.orderReference ||
    payload.order?.reference ||
    payload.order?.merchantOrderRef ||
    payload.order?.merchantReference ||
    ""
  ).trim();

  const orderStatus = String(payload.orderStatus || payload.order?.status || "").trim().toUpperCase();
  const txnStatus = String(payload.txnStatus || "").trim().toUpperCase();
  const eventType = String(payload.eventType || payload.type || "").trim();
  const timeStamp = payload.timeStamp || payload.timestamp || payload.date || "";

  // 2. Deterministic Event Identification for Idempotency
  // If Noon sends eventId/id/notificationId, use it. Otherwise, compute deterministic key from
  // orderId + orderStatus + txnStatus/timeStamp so webhook retries always resolve to the same ID!
  let eventId = String(payload.eventId || payload.id || payload.notificationId || "").trim();
  if (!eventId) {
    if (orderId && orderStatus) {
      eventId = `evt_${orderId}_${orderStatus}_${txnStatus || timeStamp || "static"}`;
    } else {
      const hash = crypto
        .createHash("sha256")
        .update(typeof rawBody === "string" ? rawBody : JSON.stringify(payload))
        .digest("hex")
        .substring(0, 24);
      eventId = `evt_hash_${hash}`;
    }
  }

  // Sanitize payload before database persistence (strip card/security tokens)
  const sanitizePayload = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = [
      "sessionidentifier",
      "sessionjwt",
      "jwt",
      "authorizationkey",
      "appkey",
      "secret",
      "cvv",
      "securitycode",
    ];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  };

  const safePayload = sanitizePayload(payload);
  const eventDate = timeStamp ? new Date(timeStamp) : null;
  const validEventDate = eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null;

  // 3. Persistent Idempotency Check & Atomic Registration
  let eventRecord;
  try {
    eventRecord = await NoonWebhookEvent.create({
      eventId,
      eventType,
      orderId,
      merchantOrderRef,
      orderStatus,
      txnStatus,
      txnId: String(payload.txnId || "").trim(),
      txnAmount: Number(payload.txnAmount) || 0,
      timeStamp: validEventDate,
      status: "PROCESSING",
      rawPayload: safePayload,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate event already registered in database
      console.log(`[NoonWebhook] Idempotent duplicate event blocked: ${eventId}`);
      return res.status(200).json({
        success: true,
        message: "Webhook event already processed (idempotent duplicate)",
        eventId,
      });
    }
    console.error("[NoonWebhook] Failed to record webhook event in DB:", err);
    return res.status(500).json({
      success: false,
      message: "Database error during idempotency check",
    });
  }

  try {
    // 4. Out-of-order Chronological Sequence Check (per Noon V2 timeStamp specification)
    if (orderId && validEventDate) {
      const priorProcessedEvent = await NoonWebhookEvent.findOne({
        orderId,
        status: "PROCESSED",
        timeStamp: { $gt: validEventDate },
      });

      if (priorProcessedEvent) {
        console.warn(
          `[NoonWebhook] Out-of-order event skipped: Event ${eventId} (timestamp: ${validEventDate.toISOString()}) is older than already processed event ${priorProcessedEvent.eventId} (timestamp: ${priorProcessedEvent.timeStamp.toISOString()}).`
        );
        eventRecord.status = "IGNORED";
        eventRecord.errorMessage = "Out-of-order event skipped (older timestamp than already processed event)";
        eventRecord.processedAt = new Date();
        await eventRecord.save();

        return res.status(200).json({
          success: true,
          message: "Out-of-order event acknowledged and skipped",
          eventId,
        });
      }
    }

    // 5. Locate Target Entity (Product Order or Service Booking)
    let targetOrder = null;
    let targetBooking = null;

    // A. Match by Noon Order ID
    if (orderId) {
      targetOrder = await Order.findOne({ noonOrderId: orderId });
      if (!targetOrder) {
        targetBooking = await Booking.findOne({ noonOrderId: orderId });
      }
    }

    // B. Match by Merchant Reference variants (e.g. BKG-RB-xxx vs RB-xxx, ORD-xxx)
    if (!targetOrder && !targetBooking && merchantOrderRef) {
      const isObjectId = mongoose.Types.ObjectId.isValid(merchantOrderRef);
      const cleanRef = merchantOrderRef.trim();
      const strippedBookingRef = cleanRef.replace(/^BKG-/, "");
      const strippedOrderRef = cleanRef.replace(/^ORD-/, "");

      // Check Order
      targetOrder = await Order.findOne({
        $or: [
          { orderNumber: cleanRef },
          { noonReference: cleanRef },
          { orderNumber: strippedOrderRef },
          { noonReference: `ORD-${strippedOrderRef}` },
          ...(isObjectId ? [{ _id: cleanRef }] : []),
        ],
      });

      // Check Booking
      if (!targetOrder) {
        targetBooking = await Booking.findOne({
          $or: [
            { bookingNumber: cleanRef },
            { noonReference: cleanRef },
            { bookingNumber: strippedBookingRef },
            { noonReference: `BKG-${strippedBookingRef}` },
            ...(isObjectId ? [{ _id: cleanRef }] : []),
          ],
        });
      }
    }

    // 5. Ambiguous Notification & GET ORDER Reconciliation
    // Per official Noon Payments best practice and audit requirements:
    // When orderStatus is non-final, ambiguous (e.g. MARKED_FOR_REVIEW, AUTHORIZED, PENDING),
    // or when reconciliation is needed, query GET ORDER for the authoritative gateway state.
    const ambiguousStatuses = [
      "MARKED_FOR_REVIEW",
      "AUTHORIZED",
      "AUTHENTICATED",
      "PENDING",
      "INITIATED",
      "UNKNOWN",
      "",
    ];
    const isAmbiguous =
      ambiguousStatuses.includes(orderStatus) ||
      !orderStatus ||
      (orderStatus === "PENDING" && txnStatus === "SUCCESS");

    let effectiveStatus = orderStatus;
    let isGatewayVerifiedPaid = false;

    if (isAmbiguous && orderId) {
      try {
        console.log(
          `[NoonWebhook] Ambiguous status ("${orderStatus || "none"}") for orderId "${orderId}". Querying GET ORDER for reconciliation...`
        );
        const verification = await verifyOrderPayment(orderId);
        if (verification && verification.success) {
          effectiveStatus = (verification.rawStatus || verification.status || "").toUpperCase();
          isGatewayVerifiedPaid = Boolean(verification.isPaid);
          console.log(
            `[NoonWebhook] Reconciliation result for ${orderId}: effectiveStatus="${effectiveStatus}", isPaid=${isGatewayVerifiedPaid}`
          );
        }
      } catch (reconErr) {
        console.warn(`[NoonWebhook] GET ORDER reconciliation error for ${orderId}:`, reconErr.message);
      }
    }

    // Determine normalized transaction lifecycle statuses
    const isSuccess =
      isGatewayVerifiedPaid ||
      ["CAPTURED", "PAID", "SUCCESS"].includes(effectiveStatus) ||
      (effectiveStatus === "AUTHORIZED" && txnStatus === "SUCCESS");

    const isRefund =
      ["REFUNDED", "REVERSED", "PARTIALLY_REFUNDED"].includes(effectiveStatus) ||
      ["REFUND", "REVERSE"].includes(eventType.toUpperCase());

    const isFailed =
      ["FAILED", "REJECTED"].includes(effectiveStatus) || txnStatus === "FAILED";

    const isCancelled =
      ["CANCELLED", "CANCELED", "EXPIRED"].includes(effectiveStatus) || txnStatus === "CANCELLED";

    // 6. Handle Product Order with Anti-Downgrade Protection
    if (targetOrder) {
      eventRecord.targetType = "ORDER";
      eventRecord.targetId = targetOrder._id;

      const wasAlreadyPaid = targetOrder.paymentStatus === "Paid";
      const wasAlreadyRefunded = targetOrder.paymentStatus === "Refunded";

      if (orderId && !targetOrder.noonOrderId) {
        targetOrder.noonOrderId = orderId;
      }

      if (wasAlreadyRefunded) {
        // Terminal state: never modify refunded orders
        console.log(
          `[NoonWebhook] Order ${targetOrder.orderNumber || targetOrder._id} is already Refunded; ignoring event ${eventId}.`
        );
      } else if (wasAlreadyPaid) {
        // Already Paid: only a valid REFUND/REVERSAL can transition status
        if (isRefund) {
          targetOrder.paymentStatus = "Refunded";
          targetOrder.status = "Cancelled";
          targetOrder.noonPaymentStatus = effectiveStatus || "REFUNDED";
          targetOrder.statusHistory.push({
            status: "Cancelled",
            note: `Noon Webhook payment refunded/reversed (${orderId || eventId})`,
          });
          await targetOrder.save();
        } else {
          // Prevent accidental downgrade from delayed FAILED / CANCELLED / PENDING notification
          console.log(
            `[NoonWebhook] Order ${targetOrder.orderNumber || targetOrder._id} is already Paid; ignoring delayed "${effectiveStatus}" notification to prevent downgrade.`
          );
        }
      } else {
        // Order is currently unpaid / Pending
        if (isSuccess) {
          targetOrder.paymentStatus = "Paid";
          targetOrder.noonPaymentStatus = effectiveStatus || "CAPTURED";
          targetOrder.statusHistory.push({
            status: targetOrder.status,
            note: `Noon Webhook payment confirmed (${orderId || eventId}) - Status: ${effectiveStatus}`,
          });

          // Decrement stock atomically
          try {
            await checkAndDecrementStock(targetOrder.products, null);
          } catch (err) {
            console.warn("[NoonWebhook] Inventory update note:", err.message);
          }

          // Clear cart if user logged in
          if (targetOrder.user) {
            await removePurchasedFromCart(targetOrder.user, targetOrder.products, null).catch(
              () => { }
            );
          }

          // Email confirmation
          emailOrderConfirmed({
            to: targetOrder.address?.email,
            order: targetOrder,
            user: { name: targetOrder.address?.fullName, email: targetOrder.address?.email },
          }).catch(() => { });

          broadcastOrderCreated(targetOrder);
          await targetOrder.save();
        } else if (isRefund) {
          targetOrder.paymentStatus = "Refunded";
          targetOrder.status = "Cancelled";
          targetOrder.noonPaymentStatus = effectiveStatus || "REFUNDED";
          targetOrder.statusHistory.push({
            status: "Cancelled",
            note: `Noon Webhook payment refunded (${orderId || eventId})`,
          });
          await targetOrder.save();
        } else if (isFailed || isCancelled) {
          targetOrder.paymentStatus = isCancelled ? "Cancelled" : "Failed";
          targetOrder.status = "Cancelled";
          targetOrder.noonPaymentStatus = effectiveStatus || (isCancelled ? "CANCELLED" : "FAILED");
          targetOrder.statusHistory.push({
            status: "Cancelled",
            note: `Noon Webhook payment ${effectiveStatus || "failed"} (${orderId || eventId})`,
          });
          await targetOrder.save();
        } else {
          // Non-final pending state: record gateway status without failing order
          targetOrder.noonPaymentStatus = effectiveStatus || targetOrder.noonPaymentStatus;
          await targetOrder.save();
        }
      }

      eventRecord.status = "PROCESSED";
      eventRecord.processedAt = new Date();
      await eventRecord.save();

      console.log(
        `[NoonWebhook] Successfully processed event ${eventId} for Order ${targetOrder.orderNumber || targetOrder._id} (final paymentStatus: ${targetOrder.paymentStatus})`
      );
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully for Order",
        eventId,
        orderId: targetOrder._id,
        paymentStatus: targetOrder.paymentStatus,
      });
    }

    // 7. Handle Service Booking with Anti-Downgrade Protection
    if (targetBooking) {
      eventRecord.targetType = "BOOKING";
      eventRecord.targetId = targetBooking._id;

      const wasAlreadyPaid = targetBooking.paymentStatus === "paid";
      const wasAlreadyRefunded = targetBooking.paymentStatus === "refunded";

      if (orderId && !targetBooking.noonOrderId) {
        targetBooking.noonOrderId = orderId;
      }

      if (wasAlreadyRefunded) {
        // Terminal state: never modify refunded bookings
        console.log(
          `[NoonWebhook] Booking ${targetBooking.bookingNumber || targetBooking._id} is already refunded; ignoring event ${eventId}.`
        );
      } else if (wasAlreadyPaid) {
        // Already Paid: only a valid REFUND/REVERSAL can transition status
        if (isRefund) {
          targetBooking.paymentStatus = "refunded";
          targetBooking.status = "cancelled";
          targetBooking.noonPaymentStatus = effectiveStatus || "REFUNDED";
          targetBooking.cancellationReason = `Refunded via Noon Payments (${orderId || eventId})`;
          await targetBooking.save();
        } else {
          // Prevent accidental downgrade from delayed FAILED / CANCELLED / PENDING notification
          console.log(
            `[NoonWebhook] Booking ${targetBooking.bookingNumber || targetBooking._id} is already paid; ignoring delayed "${effectiveStatus}" notification to prevent downgrade.`
          );
        }
      } else {
        // Booking is currently unpaid / pending
        if (isSuccess) {
          targetBooking.paymentStatus = "paid";
          targetBooking.status = "confirmed";
          targetBooking.noonPaymentStatus = effectiveStatus || "CAPTURED";
          await targetBooking.save();

          const populatedBooking = await Booking.findById(targetBooking._id)
            .populate("assignedStaff", "name email phone profileImage")
            .lean();

          notifyBookingConfirmed(populatedBooking).catch(() => { });
          broadcastBookingCreated(populatedBooking);
        } else if (isRefund) {
          targetBooking.paymentStatus = "refunded";
          targetBooking.status = "cancelled";
          targetBooking.noonPaymentStatus = effectiveStatus || "REFUNDED";
          targetBooking.cancellationReason = `Refunded via Noon Payments (${orderId || eventId})`;
          await targetBooking.save();
        } else if (isFailed || isCancelled) {
          targetBooking.paymentStatus = isCancelled ? "cancelled" : "failed";
          targetBooking.status = "cancelled";
          targetBooking.noonPaymentStatus = effectiveStatus || (isCancelled ? "CANCELLED" : "FAILED");
          await targetBooking.save();
        } else {
          // Non-final pending state: record gateway status without failing booking
          targetBooking.noonPaymentStatus = effectiveStatus || targetBooking.noonPaymentStatus;
          await targetBooking.save();
        }
      }

      eventRecord.status = "PROCESSED";
      eventRecord.processedAt = new Date();
      await eventRecord.save();

      console.log(
        `[NoonWebhook] Successfully processed event ${eventId} for Booking ${targetBooking.bookingNumber || targetBooking._id} (final paymentStatus: ${targetBooking.paymentStatus})`
      );
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully for Booking",
        eventId,
        bookingId: targetBooking._id,
        paymentStatus: targetBooking.paymentStatus,
      });
    }

    // 8. Target Not Found (Unknown Noon Order)
    console.warn(
      `[NoonWebhook] No matching Order or Booking found for Noon orderId: "${orderId}", ref: "${merchantOrderRef}"`
    );
    eventRecord.status = "IGNORED";
    eventRecord.errorMessage = "No matching Order or Booking found in database";
    eventRecord.processedAt = new Date();
    await eventRecord.save();

    // Return 200 OK as per best practice so gateway does not endlessly retry delivery
    return res.status(200).json({
      success: true,
      message: "Webhook acknowledged; no matching local record found",
      eventId,
    });
  } catch (error) {
    console.error(`[NoonWebhook] Processing error for event ${eventId}:`, error);
    if (eventRecord) {
      eventRecord.status = "FAILED";
      eventRecord.errorMessage = error.message || "Unknown error";
      await eventRecord.save().catch(() => { });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while processing webhook",
    });
  }
};


