import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  approveStripeOrder,
  rejectStripeOrder,
} from "../controllers/adminStripeOrderController.js";

const router = express.Router();

router.post("/:orderId/approve", adminAuth, approveStripeOrder);
router.post("/:orderId/reject", adminAuth, rejectStripeOrder);

export default router;
