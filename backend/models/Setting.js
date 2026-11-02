// backend/models/Setting.js
import mongoose from "mongoose";

const ShippingMethodSchema = new mongoose.Schema({
  code: { type: String, required: true },
  label: { type: String, required: true },
  amount: { type: Number, required: true },
  etaDaysMin: { type: Number, required: true },
  etaDaysMax: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, { _id:false });

const SettingSchema = new mongoose.Schema({
  shipping: {
    freeOver: { type: Number, default: 0 },
    methods: { type: [ShippingMethodSchema], default: [] },
    defaultMethodCode: { type: String, default: "standard" }
  },
  tax: {
    rate: { type: Number, default: 0 }, // store percent (e.g., 5)
    displayMode: { type: String, enum: ["tax_exclusive"], default: "tax_exclusive" }
  }
}, { timestamps: true });

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
