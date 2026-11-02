import express from "express";
import {
  getPublicServiceCategories,
  getServiceCategoryBySlug,
  getAdminServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from "../controllers/serviceCategoryController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getPublicServiceCategories);
router.get("/:slug", getServiceCategoryBySlug);

// Admin-protected operations
router.post("/", adminAuth, createServiceCategory);
router.patch("/:id", adminAuth, updateServiceCategory);
router.put("/:id", adminAuth, updateServiceCategory);
router.delete("/:id", adminAuth, deleteServiceCategory);
router.get("/admin/all", adminAuth, getAdminServiceCategories);

export default router;
