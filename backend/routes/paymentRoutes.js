import express from "express";
import {
  createPaymentIntent,
  verifyPayment,
  capturePayment,
  cancelPayment,
} from "../controllers/paymentController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import optionalAuth from "../middlewares/optionalAuth.js";

const router = express.Router();

router.post("/create-order", optionalAuth, createPaymentIntent);
router.post("/verify", optionalAuth, verifyPayment);

// admin actions (protect these with admin auth middleware!)
router.post("/capture", adminAuth, capturePayment);
router.post("/cancel", adminAuth, cancelPayment);

export default router;
