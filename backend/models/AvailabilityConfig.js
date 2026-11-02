import mongoose from "mongoose";

const availabilityConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default_config",
    },
    // Working hours for the mobile service fleet
    workingHours: {
      start: { type: String, default: "09:00" }, // 09:00 AM
      end: { type: String, default: "21:00" },   // 09:00 PM
    },
    // Interval between available slot start times (in minutes)
    slotIntervalMinutes: {
      type: Number,
      default: 30,
    },
    // Travel and sanitation buffer between appointments
    bufferMinutes: {
      type: Number,
      default: 30,
    },
    // Daily lunch/rest breaks (optional; staff take flexible breaks based on free time)
    breaks: {
      type: [
        {
          start: { type: String },
          end: { type: String },
          label: { type: String, default: "Break" },
        },
      ],
      default: [],
    },
    // Maximum simultaneous appointments across the fleet in parallel
    maxConcurrentBookings: {
      type: Number,
      default: 3,
    },
    // Minimum advance booking notice required (hours)
    leadTimeHours: {
      type: Number,
      default: 2,
    },
    // Maximum days in advance a client can book
    maxAdvanceDays: {
      type: Number,
      default: 30,
    },
    // Days off / holidays (YYYY-MM-DD)
    holidays: {
      type: [String],
      default: [],
    },
    // Days of week active (0: Sunday, 1: Monday, ... 6: Saturday)
    activeDaysOfWeek: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6], // All 7 days in Dubai
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AvailabilityConfig ||
  mongoose.model("AvailabilityConfig", availabilityConfigSchema);
