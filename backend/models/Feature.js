import mongoose from "mongoose";

const FeatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // Store icon as a string name (matching lucide icon component name)
    // Example: "ShoppingBag", "BadgePercent", "Shield", "CreditCard"
    icon: { type: String, required: true },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Feature", FeatureSchema);
