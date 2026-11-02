import express from "express";
import {  listBrands, createBrand, deleteBrand, getBrand, updateBrand } from "../controllers/brandController.js";

const router = express.Router();

router.get("/", listBrands);
router.post("/", createBrand);
router.get("/:id", getBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;