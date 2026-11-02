import express from "express";
import { getPublicSettings, updateSettings } from "../controllers/settingController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js"; // your admin guard

const router = express.Router();

router.get("/public", getPublicSettings);
router.put("/", adminAuth, updateSettings);

export default router;
