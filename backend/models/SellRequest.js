import mongoose from "mongoose";

const sellRequestSchema = new mongoose.Schema(
  {
    // ✅ seller info (needed for email)
    sellerName: { type: String, default: "" },
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String, default: "" },

    // product info
    // product info (GENERAL)
category: { type: String, required: true },     // e.g. Watch, Shoes, Jewelry...
brand: { type: String, default: "" },           // brand optional now
productName: { type: String, required: true },  // e.g. "Sneakers", "Bracelet"
model: { type: String, default: "" },           // optional now
size: { type: String, default: "" },
condition: { type: String, default: "" },
age: { type: String, default: "" },
heardAbout: { type: String, default: "" },


    images: { type: [String], default: [] }, // cloudinary URLs
    publicIds: { type: [String], default: [] }, // cloudinary public ids

    // ✅ admin message used in email for approve/reject
    adminMessage: { type: String, default: "" },

    status: {
      type: String,
      enum: ["new", "reviewed", "approved", "rejected"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellRequest", sellRequestSchema);
