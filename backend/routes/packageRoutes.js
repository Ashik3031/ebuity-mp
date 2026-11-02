import express from "express";
import { getPublicPackages, getPackageBySlug } from "../controllers/packageController.js";

const router = express.Router();

router.get("/", getPublicPackages);
router.get("/:slug", getPackageBySlug);

export default router;

