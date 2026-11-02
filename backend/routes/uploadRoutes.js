// routes/uploadRoutes.js
import express from 'express';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/images', upload.array('images', 14), (req, res) => {
  const urls = req.files.map(file => file.path);
  res.json({ urls });
});

export default router;
