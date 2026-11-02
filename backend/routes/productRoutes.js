import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getSearchSuggestions,
  getVariantsByProduct,
  upsertProductVariants,  // ⬅️ new
} from "../controllers/productController.js";

const router = express.Router();

// Create: keep your existing and add an alias (helps when clients POST /products)
router.post("/create", createProduct);
router.post("/", createProduct); // alias (optional but handy)

// Search & suggestions
router.get("/search", searchProducts);
router.get("/suggestions", getSearchSuggestions);

// Paginated list with filters/sort/search
router.get("/", getAllProducts);
router.get("/all", getAllProducts);
router.get("/by-category/:id", getProductById);

// Variants by product
router.get("/:id/variants", getVariantsByProduct);
router.put("/:id/variants", upsertProductVariants);  

// Single item
router.get("/:id", getProductById);

// Update & delete
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);



export default router;
