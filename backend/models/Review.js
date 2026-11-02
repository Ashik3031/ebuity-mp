import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" }, // optional
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating:  { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
    verified:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per product per user (remove if you want multiple reviews)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
