import express from "express";
import {
  getPublicServices,
  getPublicServiceBySlug,
  getExclusiveDeals,
  getAdminServices,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getPublicServices);
router.get("/deals", getExclusiveDeals);
router.get("/exclusive-deals", getExclusiveDeals);
router.get("/:slug", getPublicServiceBySlug);

// Admin-protected operations
router.post("/", adminAuth, createService);
router.patch("/:id", adminAuth, updateService);
router.put("/:id", adminAuth, updateService);
router.delete("/:id", adminAuth, deleteService);
router.get("/admin/all", adminAuth, getAdminServices);

export default router;
