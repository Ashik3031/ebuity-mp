import express from "express";
import {
  getPublicServiceZones,
  getAdminServiceZones,
  createServiceZone,
  updateServiceZone,
  deleteServiceZone,
} from "../controllers/serviceZoneController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getPublicServiceZones);

// Admin-protected operations
router.post("/", adminAuth, createServiceZone);
router.patch("/:id", adminAuth, updateServiceZone);
router.put("/:id", adminAuth, updateServiceZone);
router.delete("/:id", adminAuth, deleteServiceZone);
router.get("/admin/all", adminAuth, getAdminServiceZones);

export default router;
