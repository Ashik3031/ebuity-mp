import userAuth from '../middlewares/userAuth.js';
import { Router } from "express";
import { getByProduct, addOrUpdate, remove } from "../controllers/reviewController.js";

const router = Router();

router.get("/product/:productId", getByProduct);
router.post("/", userAuth, addOrUpdate);
router.delete("/:id", userAuth, remove);

export default router;
