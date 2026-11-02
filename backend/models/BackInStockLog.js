import mongoose from "mongoose";

const BackInStockLogSchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "BackInStockSubscription" },
    product:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variant:      { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
    email:        { type: String, required: true },

    status:  { type: String, enum: ["sent", "skipped", "failed"], default: "sent" },
    providerId: String,
    error:      String,

    stockAtSend: Number,
  },
  { timestamps: true }
);

export default mongoose.models.BackInStockLog
  || mongoose.model("BackInStockLog", BackInStockLogSchema);
 