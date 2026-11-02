import express from "express";
import upload from "../config/multer.config.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  listAllCategoriesFlat,
  reorderCategories

} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/", upload.single("image"), createCategory);
router.get("/", getCategories);
router.post("/reorder", reorderCategories)

router.get("/flat", listAllCategoriesFlat);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);


export default router;
