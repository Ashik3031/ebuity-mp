import express from "express";
import { uploadBanner, getBanner, getAllBanners, deleteBannerBySection } from "../controllers/bannerController.js";
import upload from "../config/multer.config.js"; // for image upload

const bannerRouter = express.Router();
bannerRouter.get("/", getAllBanners); 
bannerRouter.post("/:section", upload.single("image"), uploadBanner);
bannerRouter.get("/:section", getBanner);
bannerRouter.delete("/:section", deleteBannerBySection); 

export default bannerRouter;
