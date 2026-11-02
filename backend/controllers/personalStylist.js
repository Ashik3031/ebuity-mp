// controllers/personalStylist.controller.js
import PersonalStylist from "../models/PersonalStylist.js";
import cloudinary from "../config/cloudinary.js"; // ✅ same path you use in banner controller

export const uploadPersonalStylistHero = async (req, res) => {
  try {
    const imageUrl = req.file?.path;
    const publicId = req.file?.filename || req.file?.public_id || null;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Keep only ONE doc for this page
    let page = await PersonalStylist.findOne();

    // ✅ delete old cloudinary image
    if (page?.heroPublicId) {
      try {
        await cloudinary.uploader.destroy(page.heroPublicId);
      } catch (e) {
        console.error("Cloudinary delete failed:", e.message);
      }
    }

    if (page) {
      page.heroImage = imageUrl;
      page.heroPublicId = publicId;
      await page.save();
    } else {
      page = await PersonalStylist.create({
        heroImage: imageUrl,
        heroPublicId: publicId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero image updated",
      imageUrl,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// keep your other handlers:
export const getPersonalStylist = async (req, res) => {
  const page = await PersonalStylist.findOne().sort({ createdAt: -1 });
  return res.json({ success: true, page });
};

export const upsertPersonalStylist = async (req, res) => {
  const payload = req.body;

  let page = await PersonalStylist.findOne().sort({ createdAt: -1 });
  if (!page) page = await PersonalStylist.create(payload);
  else page = await PersonalStylist.findByIdAndUpdate(page._id, payload, { new: true });

  return res.json({ success: true, page, message: "Personal Stylist page saved" });
};
