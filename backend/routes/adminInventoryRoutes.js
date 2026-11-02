import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getInventorySummary,
  getInventoryProducts,
  adjustStock,
  receiveBatch,
  getStockMovements,
  getWaitlistSubscribers,
  triggerWaitlistNotify,
} from "../controllers/adminInventoryController.js";

const router = express.Router();

// Executive Inventory Metrics & Status
router.get("/summary", adminAuth, getInventorySummary);

// Inventory Table with stock status filters, search, pagination
router.get("/products", adminAuth, getInventoryProducts);

// Single Product / Variant stock adjustment with audit log
router.post("/adjust", adminAuth, adjustStock);

// Inbound Supplier Shipment / Batch receiving
router.post("/receive-batch", adminAuth, receiveBatch);

// Stock Movement Audit Log History
router.get("/movements", adminAuth, getStockMovements);

// Back-in-Stock subscriber waitlists
router.get("/waitlist", adminAuth, getWaitlistSubscribers);
router.post("/waitlist/notify/:productId", adminAuth, triggerWaitlistNotify);

export default router;
