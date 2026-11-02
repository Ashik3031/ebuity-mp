import express from "express";
import {
  getPublicFeatures,
  getAllFeaturesAdmin,
  createFeature,
  updateFeature,
  deleteFeature,
} from "../controllers/featureController.js";

// If you already have admin middleware, plug it in.
// import { adminAuth } from "../middleware/adminAuth.js";

const router = express.Router();

// Public route for website
router.get("/public", getPublicFeatures);

// Admin routes (protect with middleware in real app)
// router.get("/admin", adminAuth, getAllFeaturesAdmin);
// router.post("/admin", adminAuth, createFeature);
// router.patch("/admin/:id", adminAuth, updateFeature);
// router.delete("/admin/:id", adminAuth, deleteFeature);

router.get("/admin", getAllFeaturesAdmin);
router.post("/admin", createFeature);
router.patch("/admin/:id", updateFeature);
router.delete("/admin/:id", deleteFeature);

export default router;
