import express from "express";
//import userAuth from "../middlewares/userAuth.js";
import { createOffer, listOffers, updateOffer, deleteOffer, getOffer } from "../controllers/offerController.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

router.get("/",      adminAuth, listOffers);
router.get("/:id",   adminAuth, getOffer);
router.post("/",      adminAuth, createOffer);
router.put("/:id",    adminAuth, updateOffer);
router.delete("/:id",  adminAuth, deleteOffer);

export default router;
