import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  label: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  image: { type: String, default: null },
  position: { type: Number, default: 0, },
  description: { type: String, trim: true, default: "", maxlength: 2000 },
});

// Optional, but nice-to-have for faster menus and admin sorting
categorySchema.index({ parent: 1, position: 1 });
categorySchema.index({ label: 1 }); // if you’ll search by label


export default mongoose.models.Category || mongoose.model("Category", categorySchema);