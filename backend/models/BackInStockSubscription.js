import mongoose from "mongoose";

const BackInStockSubscriptionSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email:   { type: String, required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },

    active:         { type: Boolean, default: true, index: true },
    unsubscribedAt: { type: Date },
    lastNotifiedAt: { type: Date },

    source: { type: String, enum: ["wishlist", "notify_button", "admin", "other"], default: "notify_button" },
    locale: String,
  },
  { timestamps: true }
);

// helpful compound index for fast lookups
BackInStockSubscriptionSchema.index({ product: 1, email: 1, active: 1 });

export default mongoose.models.BackInStockSubscription
  || mongoose.model("BackInStockSubscription", BackInStockSubscriptionSchema);
