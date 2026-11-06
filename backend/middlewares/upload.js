// middleware/upload.js
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Ensure local uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Check if valid Cloudinary credentials are provided in environment
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'undefined' &&
  process.env.CLOUDINARY_API_KEY !== 'undefined'
);

// Disk Storage Fallback
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawBase = path.basename(file.originalname, ext);
    const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanBase || 'image'}-${uniqueSuffix}${ext || '.jpg'}`);
  }
});

let storage;

if (hasCloudinary) {
  try {
    storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'rose_essence',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'avif', 'svg']
      }
    });
  } catch (err) {
    console.warn('CloudinaryStorage initialization failed, falling back to diskStorage:', err.message);
    storage = diskStorage;
  }
} else {
  // Use robust disk storage when Cloudinary credentials are not set
  storage = diskStorage;
}

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif|avif|svg/;
  const isImageMime = file.mimetype.startsWith('image/');
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isAllowedExt = allowedExtensions.test(ext);

  if (isImageMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF, AVIF, SVG) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit per image
  },
  fileFilter
});

export default upload;
