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
      scheduledDate,
      scheduledTime: rawScheduledTime,
      specialRequests,
      sessionIdentifier,
    } = req.body;

    let customerId = req.user?.id || req.user?._id;
    let user = req.user;

    if (!sessionIdentifier) {
      return res.status(400).json({
        success: false,
        message: "Payment sessionIdentifier is required.",
      });
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one treatment service.",
      });
    }

    if (!scheduledDate || !rawScheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date and time are required.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled appointment date format. Expected YYYY-MM-DD.",
      });
    }

    // Normalize scheduledTime to "HH:mm"
    let scheduledTime = (rawScheduledTime || "").trim();
    if (/AM|PM/i.test(scheduledTime)) {
      const match = scheduledTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h === 12) h = 0;
        if (match[3].toUpperCase() === "PM") h += 12;
        scheduledTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    } else {
      const match = scheduledTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        scheduledTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    if (!/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled appointment time format. Expected HH:mm.",
      });
    }

    // Guest booking auto-resolution
    if (!customerId) {
      const guestPhone = (address?.phone || "").trim();
      const guestName = (address?.fullName || "Guest Customer").trim();
      const sanitizedPhone = guestPhone.replace(/[^0-9]/g, "");
      const guestEmail = (address?.email || `${sanitizedPhone || Date.now()}@guest.ebuity.com`).trim();

      if (!guestPhone) {
        return res.status(400).json({
          success: false,
          message: "A contact phone number is required to book a service",
        });
      }

      let existingUser = await userModel.findOne({
        $or: [{ phone: guestPhone }, { email: guestEmail }],
      });

      if (!existingUser) {
        const bcrypt = (await import("bcryptjs")).default;
        const hashedPassword = await bcrypt.hash(`Guest#${Date.now()}`, 10);
        existingUser = await userModel.create({
          name: guestName,
          phone: guestPhone,
          email: guestEmail,
          password: hashedPassword,
          role: "user",
          isAccountVerified: false,
        });
      }

      user = existingUser;
      customerId = existingUser._id;
    }

    // Fetch and validate services
    const validIds = serviceIds
      .map((id) => (typeof id === "string" ? id.trim() : id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const services = await Service.find({
      _id: { $in: validIds },
      $or: [{ isActive: true }, { active: true }],
    }).lean();

    if (services.length !== validIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected services are no longer active",
      });
    }

    let totalDurationMinutes = 0;
    let totalPrice = 0;

    const serviceSnapshots = services.map((srv) => {
      const dur = srv.durationMinutes || srv.duration || 30;
      const isDealActive = Boolean(
        srv.isExclusiveDeal &&
        srv.dealPrice !== null &&
        srv.dealPrice !== undefined &&
        Number(srv.dealPrice) >= 0
      );
      const prc = isDealActive ? Number(srv.dealPrice) : (Number(srv.price) || 0);
      totalDurationMinutes += dur;
      totalPrice += prc;

      return {
        serviceId: srv._id,
        name: srv.name,
        slug: srv.slug,
        price: prc,
        durationMinutes: dur,
        currency: "AED",
      };
    });

    const scheduledStartTime = createUAEDate(scheduledDate, scheduledTime);
    const scheduledEndTime = new Date(
      scheduledStartTime.getTime() + totalDurationMinutes * 60000
    );

    // Validate date objects before proceeding
    if (!scheduledStartTime || Number.isNaN(scheduledStartTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled appointment start time.",
      });
    }

    if (
      !scheduledEndTime ||
      Number.isNaN(scheduledEndTime.getTime()) ||
      totalDurationMinutes <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled appointment end time or service duration.",
      });
    }

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

    const dateCode = scheduledDate.replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingNumber = `RB-${dateCode}-${randomSuffix}`;
    const merchantReference = `BKG-${bookingNumber}`;

    const booking = await Booking.create({
      bookingNumber,
      customer: customerId,
      customerDetails: {
        name: user.name || address?.fullName,
        email: user.email || address?.email,
        phone: address?.phone,
      },
      services: serviceSnapshots,
      totalDurationMinutes,
      totalPrice,
      currency: "AED",
      serviceAddress: address,
      scheduledDate,
      scheduledTime,
      scheduledStartTime,
      scheduledEndTime,
      status: "confirmed",
      paymentMethod: "noon",
      paymentStatus: "pending",
      noonReference: merchantReference,
      specialRequests: specialRequests ? String(specialRequests).trim() : "",
      slotLockKey: `${scheduledDate}_${scheduledTime}_${assignedStaff || "unassigned"}`,
      assignedStaff,
      staffAssignmentStatus,
      assignmentHistory,
      travelBufferMinutes: bufferMins,
    });

    // Initiate payment with Noon Payments
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");
    const returnUrl = `${clientUrl}/payment/noon-return?type=booking&bookingId=${booking._id}`;

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
        booking: populatedBooking,
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
    });
  } catch (error) {
    console.error("[NoonPaymentController] initiateBookingPayment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process booking payment",
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
        order.noonPaymentStatus = verification.status;

        if (verification.isPaid) {
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
        } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
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
        booking.noonPaymentStatus = verification.status;

        if (verification.isPaid) {
          booking.paymentStatus = "paid";
          if (!wasAlreadyPaid) {
            const populatedBooking = await Booking.findById(booking._id)
              .populate("assignedStaff", "name email phone profileImage")
              .lean();

            notifyBookingConfirmed(populatedBooking).catch(() => { });
            broadcastBookingCreated(populatedBooking);
          }
        } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
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
 */
export const handleNoonWebhook = async (req, res) => {
  const versionHeader = req.headers["np-webhook-version"] || req.headers["webhook-version"];
  const rawBody = req.body;

  // 1. Signature Verification
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
  const eventId = String(
    payload.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );
  const eventType = String(payload.eventType || payload.type || "");
  const orderId = String(payload.orderId || payload.order?.id || "");
  const merchantOrderRef = String(
    payload.merchantOrderRef ||
    payload.merchantReference ||
    payload.orderReference ||
    payload.order?.reference ||
    ""
  );
  const orderStatus = String(payload.orderStatus || payload.order?.status || "").toUpperCase();
  const txnStatus = String(payload.txnStatus || "").toUpperCase();

  // 2. Persistent Idempotency Check & Atomic Registration
  let eventRecord;
  try {
    eventRecord = await NoonWebhookEvent.create({
      eventId,
      eventType,
      orderId,
      merchantOrderRef,
      orderStatus,
      txnStatus,
      status: "PROCESSING",
      rawPayload: payload,
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
    // 3. Locate Target Entity (Product Order or Service Booking)
    let targetOrder = null;
    let targetBooking = null;

    // Search by noonOrderId if available
    if (orderId) {
      targetOrder = await Order.findOne({ noonOrderId: orderId });
      if (!targetOrder) {
        targetBooking = await Booking.findOne({ noonOrderId: orderId });
      }
    }

    // Search by merchant reference if not yet matched
    if (!targetOrder && !targetBooking && merchantOrderRef) {
      const isObjectId = mongoose.Types.ObjectId.isValid(merchantOrderRef);

      // Check Order
      targetOrder = await Order.findOne({
        $or: [
          { orderNumber: merchantOrderRef },
          { noonReference: merchantOrderRef },
          ...(isObjectId ? [{ _id: merchantOrderRef }] : []),
        ],
      });

      // Check Booking
      if (!targetOrder) {
        targetBooking = await Booking.findOne({
          $or: [
            { bookingNumber: merchantOrderRef },
            { noonReference: merchantOrderRef },
            ...(isObjectId ? [{ _id: merchantOrderRef }] : []),
          ],
        });
      }
    }

    // Determine normalized status
    const isSuccess =
      ["CAPTURED", "PAID", "SUCCESS", "AUTHORIZED"].includes(orderStatus) ||
      txnStatus === "SUCCESS";
    const isRefund =
      ["REFUNDED", "REVERSED"].includes(orderStatus) ||
      ["REFUND", "REVERSE"].includes(eventType.toUpperCase());
    const isFailed =
      ["FAILED", "REJECTED"].includes(orderStatus) || txnStatus === "FAILED";
    const isCancelled =
      ["CANCELLED", "CANCELED"].includes(orderStatus) || txnStatus === "CANCELLED";

    // 4. Handle Product Order
    if (targetOrder) {
      eventRecord.targetType = "ORDER";
      eventRecord.targetId = targetOrder._id;

      const wasAlreadyPaid = targetOrder.paymentStatus === "Paid";
      targetOrder.noonPaymentStatus = orderStatus || targetOrder.noonPaymentStatus;
      if (orderId && !targetOrder.noonOrderId) {
        targetOrder.noonOrderId = orderId;
      }

      if (isSuccess) {
        if (!wasAlreadyPaid) {
          targetOrder.paymentStatus = "Paid";
          targetOrder.statusHistory.push({
            status: targetOrder.status,
            note: `Noon Webhook V2 payment confirmed (${orderId || eventId}) - Status: ${orderStatus}`,
          });

          // Decrement stock
          try {
            await checkAndDecrementStock(targetOrder.products, null);
          } catch (err) {
            console.warn("[NoonWebhook] Inventory update note:", err.message);
          }

          // Clear cart
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
        }
      } else if (isRefund) {
        targetOrder.paymentStatus = "Refunded";
        targetOrder.status = "Cancelled";
        targetOrder.statusHistory.push({
          status: "Cancelled",
          note: `Noon Webhook V2 payment refunded/reversed (${orderId || eventId})`,
        });
      } else if (isFailed || isCancelled) {
        if (!wasAlreadyPaid) {
          targetOrder.paymentStatus = isCancelled ? "Cancelled" : "Failed";
          targetOrder.status = "Cancelled";
          targetOrder.statusHistory.push({
            status: "Cancelled",
            note: `Noon Webhook V2 payment ${orderStatus || "failed"} (${orderId || eventId})`,
          });
        }
      }

      await targetOrder.save();
      eventRecord.status = "PROCESSED";
      eventRecord.processedAt = new Date();
      await eventRecord.save();

      console.log(
        `[NoonWebhook] Successfully processed event ${eventId} for Order ${targetOrder.orderNumber || targetOrder._id}`
      );
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully for Order",
        eventId,
        orderId: targetOrder._id,
      });
    }

    // 5. Handle Service Booking
    if (targetBooking) {
      eventRecord.targetType = "BOOKING";
      eventRecord.targetId = targetBooking._id;

      const wasAlreadyPaid = targetBooking.paymentStatus === "paid";
      targetBooking.noonPaymentStatus = orderStatus || targetBooking.noonPaymentStatus;
      if (orderId && !targetBooking.noonOrderId) {
        targetBooking.noonOrderId = orderId;
      }

      if (isSuccess) {
        if (!wasAlreadyPaid) {
          targetBooking.paymentStatus = "paid";
          await targetBooking.save();

          const populatedBooking = await Booking.findById(targetBooking._id)
            .populate("assignedStaff", "name email phone profileImage")
            .lean();

          notifyBookingConfirmed(populatedBooking).catch(() => { });
          broadcastBookingCreated(populatedBooking);
        } else {
          await targetBooking.save();
        }
      } else if (isRefund) {
        targetBooking.paymentStatus = "refunded";
        targetBooking.status = "cancelled";
        targetBooking.cancellationReason = `Refunded via Noon Payments (${orderId || eventId})`;
        await targetBooking.save();
      } else if (isFailed || isCancelled) {
        if (!wasAlreadyPaid) {
          targetBooking.paymentStatus = isCancelled ? "cancelled" : "failed";
          targetBooking.status = "cancelled";
          await targetBooking.save();
        }
      } else {
        await targetBooking.save();
      }

      eventRecord.status = "PROCESSED";
      eventRecord.processedAt = new Date();
      await eventRecord.save();

      console.log(
        `[NoonWebhook] Successfully processed event ${eventId} for Booking ${targetBooking.bookingNumber || targetBooking._id}`
      );
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully for Booking",
        eventId,
        bookingId: targetBooking._id,
      });
    }

    // 6. Target Not Found (Unknown Noon Order)
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
    eventRecord.status = "FAILED";
    eventRecord.errorMessage = error.message || "Unknown error";
    await eventRecord.save().catch(() => { });

    return res.status(500).json({
      success: false,
      message: "Internal server error while processing webhook",
    });
  }
};


