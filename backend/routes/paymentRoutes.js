import express from "express";
import {
  createPaymentIntent,
  verifyPayment,
  capturePayment,
  cancelPayment,
} from "../controllers/paymentController.js";
import {
  getNoonConfigStatus,
  createSessionHandler,
  initiateProductOrder,
  initiateBookingPayment,
  verifyPaymentHandler,
  handleNoonWebhook,
} from "../controllers/noonPaymentController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import optionalAuth from "../middlewares/optionalAuth.js";

const router = express.Router();

// Existing Razorpay / Generic payment endpoints
router.post("/create-order", optionalAuth, createPaymentIntent);
router.post("/verify", optionalAuth, verifyPayment);

// admin actions (protect these with admin auth middleware!)
router.post("/capture", adminAuth, capturePayment);
router.post("/cancel", adminAuth, cancelPayment);

// ========================================================
// Noon Payments JavaScript SDK & Gateway API Endpoints
// Official docs: https://docs.noonpayments.com/sdk/reference/js
// ========================================================
router.get("/noon/config-status", getNoonConfigStatus);
router.post("/noon/create-session", optionalAuth, createSessionHandler);
router.post("/noon/initiate-product-order", optionalAuth, initiateProductOrder);
router.post("/noon/initiate-booking-payment", optionalAuth, initiateBookingPayment);
router.post("/noon/verify", optionalAuth, verifyPaymentHandler);
router.get("/noon/verify", optionalAuth, verifyPaymentHandler);
router.post("/noon/webhook", handleNoonWebhook);

export default router;
