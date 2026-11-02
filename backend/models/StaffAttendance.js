import mongoose from "mongoose";

const staffAttendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["present", "half_day", "absent", "on_leave"],
      default: "present",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    isCorrected: {
      type: Boolean,
      default: false,
    },
    correctionReason: {
      type: String,
      default: "",
      trim: true,
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    auditTrail: [
      {
        action: {
          type: String,
          default: "corrected",
        },
        modifiedBy: {
          type: String,
          default: "admin",
        },
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          default: null,
        },
        previousValues: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        newValues: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        reason: {
          type: String,
          default: "",
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index so a staff member has at most one attendance record per day
staffAttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

export default mongoose.models.StaffAttendance ||
  mongoose.model("StaffAttendance", staffAttendanceSchema);
