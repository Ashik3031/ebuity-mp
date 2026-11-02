import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    section: {type: String, required: true, unique: true},
    publicId: { type: String, default: null },
    });

export default mongoose.models.banner || mongoose.model("banner", bannerSchema);