import express from "express";
import { activeOffers } from "../controllers/offerController.js";

const router = express.Router();
router.get("/active", activeOffers);
export default router;
