import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: [180, "Service name cannot exceed 180 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: [true, "Service category is required"],
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    fullDescription: {
      type: String,
      trim: true,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Service price cannot be negative"],
    },
    duration: {
      type: Number,
      default: 30,
      min: [1, "Service duration must be at least 1 minute"],
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: [1, "Service duration must be at least 1 minute"],
    },
    currency: {
      type: String,
      default: "AED",
      trim: true,
    },
    serviceType: {
      type: String,
      default: "home",
      trim: true,
    },
    womenOnly: {
      type: Boolean,
      default: false,
    },
    preparationInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isExclusiveDeal: {
      type: Boolean,
      default: false,
      index: true,
    },
    dealPrice: {
      type: Number,
      default: null,
      min: [0, "Deal price cannot be negative"],
    },
    dealDiscountPercentage: {
      type: Number,
      default: null,
      min: [0, "Discount percentage cannot be negative"],
      max: [100, "Discount percentage cannot exceed 100%"],
    },
    dealBadge: {
      type: String,
      trim: true,
      default: "Today's Exclusive",
    },
    dealDescription: {
      type: String,
      trim: true,
      default: "",
    },
    dealEndsAt: {
      type: Date,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    includedSteps: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

serviceSchema.pre("validate", function (next) {
  // Sync duration & durationMinutes
  if (this.duration !== undefined) {
    this.durationMinutes = this.duration;
  } else if (this.durationMinutes !== undefined) {
    this.duration = this.durationMinutes;
  }

  // Sync isActive & active
  if (this.active !== undefined && this.isActive === undefined) {
    this.isActive = this.active;
  } else if (this.isActive !== undefined && this.active === undefined) {
    this.active = this.isActive;
  }

  // Calculate missing deal fields if deal is active
  if (this.isExclusiveDeal) {
    if (this.price && this.dealPrice != null && (this.dealDiscountPercentage == null || this.dealDiscountPercentage === 0)) {
      this.dealDiscountPercentage = Math.max(0, Math.min(100, Math.round(((this.price - this.dealPrice) / this.price) * 100)));
    } else if (this.price && this.dealDiscountPercentage != null && (this.dealPrice == null || this.dealPrice === 0)) {
      this.dealPrice = Math.max(0, Math.round(this.price * (1 - this.dealDiscountPercentage / 100)));
    }
  }

  next();
});

serviceSchema.index({ name: "text", shortDescription: "text", fullDescription: "text" });
serviceSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
serviceSchema.index({ isExclusiveDeal: 1, isActive: 1, displayOrder: 1 });

export default mongoose.models.Service ||
  mongoose.model("Service", serviceSchema);
