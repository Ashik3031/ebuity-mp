import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import upload from "../config/multer.config.js";
import {
  createSellRequest,
  listSellRequests,
  updateSellRequestStatus,
  deleteSellRequest,
  getSellRequestById,
} from "../controllers/sellRequestController.js";

const router = express.Router();

// ✅ Public: create sell request (frontend)
router.post("/", upload.array("images", 6), createSellRequest);

// ✅ Admin: list all
router.get("/", adminAuth, listSellRequests);

// ✅ Admin: get single
router.get("/:id", adminAuth, getSellRequestById);

// ✅ Admin: update status
router.patch("/:id/status", adminAuth, updateSellRequestStatus);

// ✅ Admin: delete
router.delete("/:id", adminAuth, deleteSellRequest);

export default router;
