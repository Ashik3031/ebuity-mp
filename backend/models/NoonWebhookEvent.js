import mongoose from "mongoose";

const noonWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      default: "",
      index: true,
    },
    orderId: {
      type: String,
      default: "",
      index: true,
    },
    merchantOrderRef: {
      type: String,
      default: "",
      index: true,
    },
    orderStatus: {
      type: String,
      default: "",
    },
    txnStatus: {
      type: String,
      default: "",
    },
    targetType: {
      type: String,
      enum: ["ORDER", "BOOKING", "UNKNOWN"],
      default: "UNKNOWN",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "targetTypeModel",
    },
    status: {
      type: String,
      enum: ["PROCESSING", "PROCESSED", "IGNORED", "FAILED"],
      default: "PROCESSING",
      index: true,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire logs after 90 days to prevent collection growth
noonWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const NoonWebhookEvent =
  mongoose.models.NoonWebhookEvent ||
  mongoose.model("NoonWebhookEvent", noonWebhookEventSchema);

export default NoonWebhookEvent;
