import mongoose from "mongoose";
import slugify from "slugify";


const brandSchema = new mongoose.Schema({
    name: { type: String, required: true , trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    logo : String,
    description: String,
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

brandSchema.index({ name: '1' });
brandSchema.index({ slug: '1' }, { unique: true });

// --- Ensure slug is always set/normalized ---
brandSchema.pre("validate", function(next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  } else if (this.slug) {
    // normalize any provided slug
    this.slug = slugify(this.slug, { lower: true, strict: true });
  }
  next();
});

// (Optional) Static helper to find-or-create by name
brandSchema.statics.ensureByName = async function(name) {
  const slug = slugify(name, { lower: true, strict: true });
  let brand = await this.findOne({ slug }).select("_id");
  if (!brand) brand = await this.create({ name: name.trim(), slug });
  return brand;
};

export default mongoose.models.Brand || mongoose.model("Brand", brandSchema);