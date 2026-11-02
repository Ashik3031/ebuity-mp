import express from "express";
import {
  adminListOrders,
  adminGetOrder,
  adminUpdateStatus,
  adminUpdateTracking,
  adminUpdatePayment,
} from "../controllers/adminOrderController.js";

// replace with your real admin auth middleware
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

router.get("/", adminAuth, adminListOrders);
router.get("/:orderId", adminAuth, adminGetOrder);
router.patch("/:orderId/status", adminAuth, adminUpdateStatus);
router.patch("/:orderId/tracking", adminAuth, adminUpdateTracking);
router.patch("/:orderId/payment", adminAuth, adminUpdatePayment);

export default router;
