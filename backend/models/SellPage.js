// models/SellPage.js
import mongoose from "mongoose";

const sellPageSchema = new mongoose.Schema(
  {
    heroImage: { type: String, default: "" },
    heroPublicId: { type: String, default: "" }, // for replacing & deleting old cloudinary image

    description: { type: String, default: "" }, // simple long text
    // OR if you want paragraphs:
    // paragraphs: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("SellPage", sellPageSchema);
