import express from "express";
import userAuth from "../middlewares/userAuth.js";
import { subscribeNotify } from "../controllers/notify.controller.js";

const router = express.Router();

// POST /api/notify/subscribe
router.post("/subscribe", userAuth, subscribeNotify);

export default router;
