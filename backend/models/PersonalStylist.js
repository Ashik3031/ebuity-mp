// models/PersonalStylist.js
import mongoose from "mongoose";

const personalStylistSchema = new mongoose.Schema(
  {
    heroImage: { type: String, default: "" },
    heroPublicId: { type: String, default: "" }, // ✅ important for delete old cloudinary image

    title1: { type: String, default: "PERSONAL" },
    title2: { type: String, default: "STYLIST" },

    pageTitle: { type: String, default: "Personal Stylist" },

    introHeading: { type: String, default: "Welcome ✨" },
    introParagraphs: { type: [String], default: [] },

    whyTitle1: { type: String, default: "WHY" },
    whyTitle2: { type: String, default: "CHOOSE US" },
    cards: [{ heading: String, text: String }],
  },
  { timestamps: true }
);

export default mongoose.model("PersonalStylist", personalStylistSchema);
