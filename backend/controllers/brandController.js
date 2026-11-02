import Brand from '../models/Brand.js';
import slugify from 'slugify';

export const listBrands = async (_req, res) => {
  const brands = await Brand.find({ isActive: true })
    .sort({ name: 1 })
    .select("name slug logo");
  // return either plain array:
  res.json(brands);
  // or (if you prefer a wrapper): res.json({ success: true, brands });
};

export const createBrand = async (req, res) => {
    try {
        const name = (req.body?.name || "").trim();
        if (!name) return res.status(400).json({ error: "Brand Name is required" });

        const slug = slugify(name, { lower: true, strict: true });
        const existing = await Brand.findOne({ slug });
        if (existing) return res.status(200).json({ ok: true, brand: existing });
        let brand = await Brand.findOne({ slug });
        if (!brand) brand = await Brand.create({ name, slug, logo: req.body.logo, description: req.body.description });
        res.status(201).json(brand);
    } catch (err) {
        res.status(500).json({ error: err.message });   
    }
    };

    export const getBrand = async (req, res) => {
        const brand = await Brand.findOne({ slug: req.params.slug });
        if (!brand) return res.status(404).json({ error: "Brand not found" });
        res.json(brand);
    }

    export const updateBrand = async (req, res) => {
        try {
    const updates = { ...req.body };
    if (updates.name) updates.slug = slugify(updates.name, { lower: true, strict: true });
    const brand = await Brand.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteBrand = async (req, res) => {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: "Brand deleted" });
};