// import express from "express";
// import {
//   createProduct,
//   getAllProducts,
//   getProductById,
//   updateProduct,
//   deleteProduct,
//   searchProducts,
//   getSearchSuggestions,
//   getProductsByCategory, // ⬅️ add this import
// } from "../controllers/productController.js";

// const router = express.Router();

// // Create
// router.post("/create", createProduct);

// // Search & suggestions
// router.get("/search", searchProducts);
// router.get("/suggestions", getSearchSuggestions);

// // All products (supports ?category=ID&deep=1&subcategory=ID)
// router.get("/all", getAllProducts);

// // Deep by category (ensure this comes BEFORE "/:id")
// router.get("/by-category/:id", getProductsByCategory);

// // Single product
// router.get("/:id", getProductById);

// // Update / Delete
// router.put("/:id", updateProduct);
// router.delete("/:id", deleteProduct);

// export default router;
