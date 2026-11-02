import Feature from "../models/Feature.js";

// PUBLIC: Get active features for frontend
export const getPublicFeatures = async (req, res) => {
  try {
    const features = await Feature.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: features });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN: Get all features
export const getAllFeaturesAdmin = async (req, res) => {
  try {
    const features = await Feature.find().sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: features });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN: Create feature
export const createFeature = async (req, res) => {
  try {
    const { title, description, icon, isActive, order } = req.body;

    const created = await Feature.create({
      title,
      description,
      icon,
      isActive: typeof isActive === "boolean" ? isActive : true,
      order: typeof order === "number" ? order : 0,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ADMIN: Update feature
export const updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Feature.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Feature not found" });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ADMIN: Delete feature
export const deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Feature.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Feature not found" });
    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
