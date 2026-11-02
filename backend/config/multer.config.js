import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import  cloudinary  from "./cloudinary.js"; 

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banners", // You can change folder name
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage: storage, limits: {
    files: 14,                 // cap total files per request
    fileSize: 50 * 1024 * 1024 // 10 MB each (adjust as needed)
  }});

export default upload;
