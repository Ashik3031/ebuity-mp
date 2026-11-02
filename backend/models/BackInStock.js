// models/BackInStock.js
import mongoose from "mongoose";

const backInStockSchema = new mongoose.Schema(
  {
   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },                                    
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
);

// Unique (user, product) OR (email, product)
backInStockSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.models.BackInStock ||
  mongoose.model("BackInStock", backInStockSchema);
