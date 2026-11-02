import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameNormalized: { type: String, index: true }, // <-- ADD THIS

  slug: { type: String, required: true, unique: true, trim: true },
  description: String,
  detailedDescription: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand'},

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categoryPath: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],

  tags: [String],
  options: [String],
  images: [String],
  defaultPrice: Number,
  price: Number,
  compareAtPrice: Number,
  defaultStock: Number,
  stock: Number,
  size: String,
  sku: String,
  currency: { type: String, default: "AED" },
  brandName: { type: String, default: "Rose Essence" },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  avgRating:   { type: Number, default: 0 },
reviewCount: { type: Number, default: 0 },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

// ---- Accent/case normalizer & hooks (ADD THIS BLOCK BEFORE INDEXES) ----
const normalize = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // strip accents
    .toLowerCase()
    .trim();

// Ensure nameNormalized is set on create/save
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.nameNormalized = normalize(this.name || "");
  }
  next();
});

// Ensure nameNormalized is set on findOneAndUpdate / update
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  if (update.name || (update.$set && update.$set.name)) {
    const newName =
      (update.$set && update.$set.name) || update.name || "";
    if (!update.$set) update.$set = {};
    update.$set.nameNormalized = normalize(newName);
  }
  next();
});


// indexes — keep these, and remove any field-level index flags
productSchema.index({ name: 'text', brand: 'text', description: 'text', detailedDescription: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ categoryPath: 1 });
productSchema.index({ createdAt: -1 });


export default mongoose.models.Product || mongoose.model('Product', productSchema);
