import mongoose from "mongoose";

const bookingServiceItemSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "AED",
    },
  },
  { _id: false }
);

const bookingAddressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "Home" }, // Home, Villa, Hotel, etc.
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    unitNumber: { type: String, required: true, trim: true }, // Flat, Villa, Suite #
    buildingName: { type: String, required: true, trim: true }, // Tower / Community
    street: { type: String, trim: true, default: "" },
    area: { type: String, required: true, trim: true }, // Downtown, Marina, etc.
    city: { type: String, required: true, trim: true, default: "Dubai" },
    state: { type: String, trim: true, default: "Dubai" },
    postalCode: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    // Coordinates for navigation
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Special access instructions (e.g., Gate code, building security buzzer, visitor parking)
    accessInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    // Zone link
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceZone",
      default: null,
    },
    zoneName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerDetails: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },
    services: {
      type: [bookingServiceItemSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        "At least one service must be selected",
      ],
      required: true,
    },
    totalDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "AED",
      required: true,
    },
    serviceAddress: {
      type: bookingAddressSchema,
      required: true,
    },
    scheduledDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    scheduledTime: {
      type: String, // HH:mm in Dubai local time (e.g. "14:30")
      default: "",
      trim: true,
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "confirmed",
      index: true,
    },
    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    specialRequests: {
      type: String,
      trim: true,
      default: "",
    },
    // Locking key for concurrency protection
    slotLockKey: {
      type: String,
      default: null,
      index: true,
    },
    // Level 5 & 9: Staff Management & Automatic Assignment Fields
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },
    staffAssignmentStatus: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "accepted",
        "rejected",
        "on_the_way",
        "arrived",
        "in_progress",
        "completed",
        "admin_attention",
      ],
      default: "unassigned",
      index: true,
    },
    assignmentHistory: [
      {
        staffId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
        },
        staffName: { type: String, default: "" },
        action: {
          type: String,
          enum: [
            "auto_assigned",
            "manually_assigned",
            "accepted",
            "rejected",
            "reassigned",
            "flagged_admin",
            "status_update",
          ],
          required: true,
        },
        reason: { type: String, default: "" },
        performedBy: { type: String, default: "system" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    staffRejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    flaggedForAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    travelBufferMinutes: {
      type: Number,
      default: 30,
    },
    serviceTracking: {
      onTheWayAt: { type: Date, default: null },
      arrivedAt: { type: Date, default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
    },
    // Level 9: Customer Cancellation & Rescheduling Request Workflow
    cancellationRequest: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      reason: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: "" },
      adminNote: { type: String, default: "" },
    },
    rescheduleRequest: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      requestedDate: { type: String, default: "" }, // YYYY-MM-DD
      requestedStartTime: { type: Date, default: null },
      requestedEndTime: { type: Date, default: null },
      requestedTimeStr: { type: String, default: "" }, // HH:mm
      reason: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: "" },
      adminNote: { type: String, default: "" },
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find overlapping active bookings
bookingSchema.index({
  status: 1,
  scheduledStartTime: 1,
  scheduledEndTime: 1,
});

bookingSchema.index({
  customer: 1,
  createdAt: -1,
});

bookingSchema.index({
  scheduledDate: 1,
  status: 1,
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
