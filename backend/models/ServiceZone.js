import mongoose from "mongoose";

const serviceZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service zone name is required"],
      trim: true,
      maxlength: [150, "Zone name cannot exceed 150 characters"],
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
    },
    city: {
      type: String,
      default: "Dubai",
      trim: true,
      index: true,
    },
    supportedAreas: {
      type: [String],
      default: [],
    },
    postalIdentifiers: {
      type: [String],
      default: [],
    },
    boundaryCoordinates: [
      {
        lat: { type: Number },
        lng: { type: Number },
        label: { type: String, default: "" },
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

serviceZoneSchema.index({ displayOrder: 1, isActive: 1 });

export default mongoose.models.ServiceZone ||
  mongoose.model("ServiceZone", serviceZoneSchema);
