// controllers/sellPage.controller.js
import SellPage from "../models/SellPage.js";
import cloudinary from "../config/cloudinary.js";

export const getSellPage = async (req, res) => {
  const page = await SellPage.findOne().sort({ createdAt: -1 });
  res.json({ success: true, page });
};

export const upsertSellPage = async (req, res) => {
  const payload = req.body;

  let page = await SellPage.findOne().sort({ createdAt: -1 });
  if (!page) page = await SellPage.create(payload);
  else page = await SellPage.findByIdAndUpdate(page._id, payload, { new: true });

  res.json({ success: true, message: "Sell page saved", page });
};

// upload hero image like banner
export const uploadSellHero = async (req, res) => {
  try {
    const imageUrl = req.file?.path;
    const publicId = req.file?.filename || req.file?.public_id || null;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    let page = await SellPage.findOne().sort({ createdAt: -1 });

    // delete old image
    if (page?.heroPublicId) {
      try {
        await cloudinary.uploader.destroy(page.heroPublicId);
      } catch (e) {
        console.error("Cloudinary delete failed:", e.message);
      }
    }

    if (!page) {
      page = await SellPage.create({
        heroImage: imageUrl,
        heroPublicId: publicId,
      });
    } else {
      page.heroImage = imageUrl;
      page.heroPublicId = publicId;
      await page.save();
    }

    res.json({ success: true, message: "Hero image updated", imageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
