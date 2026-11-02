import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service category name is required"],
      trim: true,
      maxlength: [120, "Category name cannot exceed 120 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    image: {
      type: String,
      default: null,
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
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceCategorySchema.pre("validate", function (next) {
  if (this.sortOrder !== undefined && this.displayOrder === 0) {
    this.displayOrder = this.sortOrder;
  } else if (this.displayOrder !== undefined && this.sortOrder === 0) {
    this.sortOrder = this.displayOrder;
  }
  if (this.active !== undefined && this.isActive === undefined) {
    this.isActive = this.active;
  } else if (this.isActive !== undefined && this.active === undefined) {
    this.active = this.isActive;
  }
  next();
});

serviceCategorySchema.index({ displayOrder: 1, isActive: 1 });
serviceCategorySchema.index({ sortOrder: 1, active: 1 });

export default mongoose.models.ServiceCategory ||
  mongoose.model("ServiceCategory", serviceCategorySchema);
