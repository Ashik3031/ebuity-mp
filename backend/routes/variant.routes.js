// import express from 'express';
// import variantController from '../controllers/variantController.js';

// const router = express.Router();

// router.get('/:id', variantController.getVariantById);
// router.put('/:id', variantController.updateVariant);
// router.get('/by-product/:productId', variantController.getVariantsByProduct);
// router.post('/reduce-stock', variantController.reduceStock); // Endpoint to reduce stock
// router.delete('/:id', variantController.deleteVariant);

// export default router; 


import express from "express";
import variantController from "../controllers/variantController.js";

const router = express.Router();

// ✅ put specific routes FIRST
router.get("/by-product/:productId", variantController.getVariantsByProduct);
router.post("/reduce-stock", variantController.reduceStock);

// ✅ then generic param routes
router.get("/:id", variantController.getVariantById);
router.patch("/:id", variantController.updateVariant); // better than put since controller is PATCH-style
router.delete("/:id", variantController.deleteVariant);

export default router;

