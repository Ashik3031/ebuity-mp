import mongoose from "mongoose";
import slugify from "slugify";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      maxlength: [200, "Package name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    tagline: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    inclusions: {
      type: [String],
      default: [],
    },
    originalPrice: {
      type: Number,
      required: [true, "Original total price is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Package special price is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "AED",
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    durationMinutes: {
      type: Number,
      default: 90,
      min: 15,
    },
    badge: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      enum: ["Bridal & Events", "Spa & Wellness", "Grooming & Nails", "Seasonal Offers", "General"],
      default: "General",
    },
    images: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    validUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

packageSchema.index({ isActive: 1, displayOrder: 1, createdAt: -1 });

// Automatically compute discount percentage if not provided
packageSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + "-" + Date.now().toString(36);
  }
  if (this.originalPrice && this.price && (!this.discountPercentage || this.discountPercentage === 0)) {
    if (this.originalPrice > this.price) {
      this.discountPercentage = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
  }
  next();
});

export default mongoose.models.Package || mongoose.model("Package", packageSchema);

