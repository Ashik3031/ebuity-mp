// routes/uploadRoutes.js
import express from 'express';
import upload from '../middlewares/upload.js';

const router = express.Router();

/**
 * POST /api/upload/images
 * Handles multiple or single image uploads. Accepts field names 'images', 'image', or any field.
 */
router.post('/images', (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('File upload error in /api/upload/images:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided for upload'
      });
    }

    const urls = req.files.map((file) => {
      // 1. Cloudinary full URL
      if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path;
      }
      if (file.secure_url) {
        return file.secure_url;
      }
      // 2. Local disk storage relative URL
      return `/uploads/${file.filename}`;
    });

    return res.status(200).json({
      success: true,
      urls,
      url: urls[0] || ''
    });
  });
});

/**
 * POST /api/upload/image
 * Handles single image upload. Accepts field names 'image', 'file', or 'images'.
 */
router.post('/image', (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('File upload error in /api/upload/image:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed'
      });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided for upload'
      });
    }

    const file = files[0];
    let url = `/uploads/${file.filename}`;
    if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
      url = file.path;
    } else if (file.secure_url) {
      url = file.secure_url;
    }

    return res.status(200).json({
      success: true,
      url,
      urls: [url]
    });
  });
});

export default router;
