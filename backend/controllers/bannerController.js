// orginal code- lufna

// import Banner from "../models/Banner.js";

// export const uploadBanner = async (req, res) => {
//   try {
//     const section = req.params.section;
//     const imageUrl = req.file?.path; // cloudinary URL

//     if (!section)
//       return res
//         .status(400)
//         .json({ success: false, message: "Section is required" });

//     if (!imageUrl) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No image uploaded" });
//     }

//     let banner = await Banner.findOne({ section });

//     if (banner) {
//       banner.imageUrl = imageUrl;
//       await banner.save();
//     } else {
//       await Banner.create({ section, imageUrl }); 
//     }

//     res
//       .status(200)
//       .json({ success: true, message: "Banner updated", imageUrl });
//   } catch (err) {
  
//   res.status(500).json({ success: false, message: err.message });
// }
// };

// export const getBanner = async (req, res) => {
//   try {
//     const section = req.params.section;
//     const banner = await Banner.findOne({ section });

//     if (!banner) {
//       return res.status(404).json({ success: false, message: "Banner not found" });
//     }

//     res.status(200).json(banner);
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

import Banner from "../models/Banner.js";
import { v2 as cloudinary } from "cloudinary";

// CREATE / UPDATE (Replace image)  -> works for hero, promo, banner-1, etc.
export const uploadBanner = async (req, res) => {
  try {
    const section = req.params.section;
    const imageUrl = req.file?.path;
    const publicId = req.file?.filename || req.file?.public_id || null;

    if (!section) {
      return res.status(400).json({ success: false, message: "Section is required" });
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    let banner = await Banner.findOne({ section });

    // ✅ delete old cloudinary asset if you have publicId saved
    if (banner?.publicId) {
      try {
        await cloudinary.uploader.destroy(banner.publicId);
      } catch (e) {
        console.error("Cloudinary delete failed:", e.message);
      }
    }

    if (banner) {
      banner.imageUrl = imageUrl;
      banner.publicId = publicId;
      await banner.save();
    } else {
      await Banner.create({ section, imageUrl, publicId });
    }

    res.status(200).json({ success: true, message: "Banner updated", imageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET one (hero / promo / etc.)
export const getBanner = async (req, res) => {
  try {
    const section = req.params.section;
    const banner = await Banner.findOne({ section });

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json(banner);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ LIST ALL (for admin manager page)
export const getAllBanners = async (req, res) => {
  try {
    const items = await Banner.find().sort({ section: 1 }).lean();
    res.status(200).json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ DELETE by section (hero, promo, banner-1, etc.)
export const deleteBannerBySection = async (req, res) => {
  try {
    const { section } = req.params;

    const banner = await Banner.findOne({ section });
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // ✅ delete from cloudinary if publicId exists
    if (banner.publicId) {
      try {
        await cloudinary.uploader.destroy(banner.publicId);
      } catch (e) {
        console.error("Cloudinary delete failed:", e.message);
      }
    }

    await Banner.deleteOne({ section });

    res.status(200).json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
