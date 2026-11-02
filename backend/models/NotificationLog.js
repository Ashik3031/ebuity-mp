import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    recipientRole: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "booking_confirmed",
        "staff_assigned",
        "job_on_the_way",
        "job_arrived",
        "job_in_progress",
        "booking_completed",
        "staff_rejected",
        "reschedule_requested",
        "reschedule_approved",
        "reschedule_rejected",
        "cancellation_requested",
        "cancellation_approved",
        "cancellation_rejected",
        "admin_alert",
      ],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "logged"],
      default: "pending",
      index: true,
    },
    provider: {
      type: String,
      default: "smtp",
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    persistentFailure: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationLogSchema.index({ createdAt: -1 });

export default mongoose.models.NotificationLog ||
  mongoose.model("NotificationLog", notificationLogSchema);
