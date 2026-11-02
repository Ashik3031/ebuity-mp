// routes/sellPage.routes.js
import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import upload from "../config/multer.config.js";
import { getSellPage, upsertSellPage, uploadSellHero } from "../controllers/sellPageController.js";

const router = express.Router();

router.get("/", getSellPage);                 // public
router.put("/", adminAuth, upsertSellPage);   // admin save content
router.post("/hero-image", adminAuth, upload.single("image"), uploadSellHero); // admin upload hero

export default router;
