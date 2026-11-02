// routes/personalStylist.routes.js
import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";

// ✅ Use the SAME upload middleware you use for banners
// (the one that sets req.file.path and req.file.filename for Cloudinary)
import upload from "../middlewares/upload.js";

import {
  getPersonalStylist,
  upsertPersonalStylist,
  uploadPersonalStylistHero,
} from "../controllers/personalStylist.js";

const router = express.Router();

// ✅ PUBLIC (frontend)
router.get("/", getPersonalStylist);

// ✅ ADMIN (save/update all page content)
router.put("/", adminAuth, upsertPersonalStylist);

// ✅ ADMIN (upload/replace hero image like banner)
router.post(
  "/hero-image",
  adminAuth,
  upload.single("image"),
  uploadPersonalStylistHero
);

export default router;
