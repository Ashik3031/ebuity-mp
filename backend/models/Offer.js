// models/Offer.js
import mongoose from "mongoose";

const OfferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,

  type: { type: String, enum: ["percent","amount"], default: "percent" },
  value: { type: Number, required: true },          // percent or amount
  maxDiscount: { type: Number },                    // optional cap (for percent)

  active: { type: Boolean, default: true },
  exclusive: { type: Boolean, default: false },     // blocks other offers
  priority: { type: Number, default: 100 },

  startsAt: { type: Date },
  endsAt:   { type: Date },

  scope: {
    kind: { type: String, enum: ["all","categories","products"], default: "all" },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    products:   [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    includeDescendants: { type: Boolean, default: true },
  },

  // optional flags
  applyToSaleItems: { type: Boolean, default: true },
}, { timestamps: true });

// keep your existing indexes
OfferSchema.index({ "scope.kind": 1, "scope.products": 1 });
OfferSchema.index({ "scope.kind": 1, "scope.categories": 1 });

OfferSchema.index({ active: 1, startsAt: 1, endsAt: 1, "scope.kind": 1 });
OfferSchema.index({ priority: -1 });


export default mongoose.models.Offer || mongoose.model("Offer", OfferSchema);
