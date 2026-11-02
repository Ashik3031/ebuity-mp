import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getAdminServiceCategories,
} from "../controllers/serviceCategoryController.js";
import {
  createService,
  updateService,
  deleteService,
  getAdminServices,
} from "../controllers/serviceController.js";
import {
  createServiceZone,
  updateServiceZone,
  deleteServiceZone,
  getAdminServiceZones,
} from "../controllers/serviceZoneController.js";
import {
  getAdminPackages,
  createPackage,
  updatePackage,
  deletePackage,
} from "../controllers/packageController.js";

const router = express.Router();

// Enforce admin authorization on all routes
router.use(adminAuth);

// --- Packages Admin ---
router.get("/packages", getAdminPackages);
router.post("/packages", createPackage);
router.patch("/packages/:id", updatePackage);
router.put("/packages/:id", updatePackage);
router.delete("/packages/:id", deletePackage);

// --- Service Categories Admin ---
router.get("/service-categories", getAdminServiceCategories);
router.post("/service-categories", createServiceCategory);
router.patch("/service-categories/:id", updateServiceCategory);
router.put("/service-categories/:id", updateServiceCategory);
router.delete("/service-categories/:id", deleteServiceCategory);

// --- Services Admin ---
router.get("/services", getAdminServices);
router.post("/services", createService);
router.patch("/services/:id", updateService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

// --- Service Zones Admin ---
router.get("/service-zones", getAdminServiceZones);
router.post("/service-zones", createServiceZone);
router.patch("/service-zones/:id", updateServiceZone);
router.put("/service-zones/:id", updateServiceZone);
router.delete("/service-zones/:id", deleteServiceZone);

export default router;
