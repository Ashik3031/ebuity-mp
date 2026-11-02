import express from "express";
import userAuth from "../middlewares/userAuth.js";
import optionalAuth from "../middlewares/optionalAuth.js";

import {
  placeOrder,
  getUserOrders,
  cancelOrder,
  getOrderById,
} from "../controllers/orderController.js";
import { downloadInvoice } from "../controllers/invoice.controller.js";

const router = express.Router();

router.post("/place", optionalAuth, placeOrder);

// logged-in only
router.get("/", userAuth, getUserOrders);
router.put("/cancel/:orderId", userAuth, cancelOrder);

// ✅ guest OR logged-in
router.get("/:orderId", optionalAuth, getOrderById);

// (optional) if you want guest invoice too
router.get("/:orderId/invoice.pdf", optionalAuth, downloadInvoice);

export default router;
