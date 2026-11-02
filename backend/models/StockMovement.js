import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "inbound_receive",   // Supplier replenishment
        "manual_adjustment", // Cycle count or manual correction
        "order_sale",        // Deducted when order is placed
        "order_cancel",      // Restocked when order is cancelled
        "damaged_loss",      // Damaged / expired / write-off
      ],
      required: true,
      index: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    change: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    referenceId: {
      type: String,
      trim: true,
      default: null, // Order ID or Batch/PO number
    },
    performedBy: {
      id: { type: String, default: null },
      name: { type: String, default: "Admin / System" },
      email: { type: String, default: null },
      role: { type: String, default: "admin" },
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

export default mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema);
