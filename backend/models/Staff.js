import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const staffLeaveSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Staff email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    employeeId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    employmentStatus: {
      type: String,
      enum: ["active", "probation", "full-time", "part-time", "contract", "on-leave", "terminated"],
      default: "full-time",
    },
    invitationToken: {
      type: String,
      default: null,
    },
    invitationExpires: {
      type: Date,
      default: null,
    },
    invitationStatus: {
      type: String,
      enum: ["pending", "accepted"],
      default: "accepted",
    },
    phone: {
      type: String,
      required: [true, "Staff phone number is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required for staff portal access"],
    },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "staff",
      enum: ["staff"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Service categories the staff member is qualified for
    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],
    // Individual services the staff member is explicitly qualified for
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    // Standard working hours (Dubai local time HH:mm)
    workingHours: {
      start: {
        type: String,
        default: "09:00",
      },
      end: {
        type: String,
        default: "21:00",
      },
    },
    // Breaks during the day (optional - staff choose flexible break times based on their free time)
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
    // Weekly off days (0 = Sunday, 1 = Monday, ... 5 = Friday, 6 = Saturday)
    // By default in UAE/Dubai beauty service industry: Friday (5) or custom
    weeklyOffDays: {
      type: [Number],
      default: [5], // Friday default off
    },
    // Specific holidays/dates off in YYYY-MM-DD
    holidays: {
      type: [String],
      default: [],
    },
    // Temporary schedule exceptions (custom shift hours or extra off-days on specific dates)
    scheduleExceptions: [
      {
        date: { type: String, required: true }, // YYYY-MM-DD
        isOff: { type: Boolean, default: true },
        start: { type: String, default: "" },
        end: { type: String, default: "" },
        reason: { type: String, default: "", trim: true },
      },
    ],
    // Approved & pending leave requests
    leaves: [staffLeaveSchema],
    // Optional base service zone for travel considerations
    baseZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceZone",
      default: null,
    },
    baseZoneName: {
      type: String,
      default: "Dubai Central",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to verify password
staffSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Staff || mongoose.model("Staff", staffSchema);
