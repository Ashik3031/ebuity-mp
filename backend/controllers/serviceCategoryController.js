import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import slugify from "slugify";
import mongoose from "mongoose";

// ==========================================
// Public: Get all active service categories
// ==========================================
export const getPublicServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Optionally attach active service count for discovery UI
    const categoryIds = categories.map((c) => c._id);
    const serviceCounts = await Service.aggregate([
      { $match: { category: { $in: categoryIds }, isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((sc) => [String(sc._id), sc.count])
    );

    const result = categories.map((cat) => ({
      ...cat,
      serviceCount: countMap.get(String(cat._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      categories: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve service categories",
      error: error.message,
    });
  }
};

// ==========================================
// Public / Shared: Get single category by slug or ID
// ==========================================
export const getServiceCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { $or: [{ _id: slug }, { slug: slug.toLowerCase() }] }
      : { slug: slug.toLowerCase() };

    const category = await ServiceCategory.findOne(query).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching service category",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: List all service categories (including inactive)
// ==========================================
export const getAdminServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin service categories",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Create service category
// ==========================================
export const createServiceCategory = async (req, res) => {
  try {
    const { name, description, image, isActive, displayOrder, slug: customSlug } =
      req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const generatedSlug = (
      customSlug || slugify(name, { lower: true, strict: true })
    ).trim();

    // Check duplicate slug
    const existing = await ServiceCategory.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Service category with slug '${generatedSlug}' already exists`,
      });
    }

    const category = await ServiceCategory.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description || "",
      image: image || (req.file ? req.file.path : null),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: parseInt(displayOrder, 10) || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Service category created successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create service category",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Update service category
// ==========================================
export const updateServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    const { name, slug: customSlug, description, image, isActive, displayOrder } =
      req.body;

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (image !== undefined) category.image = image;
    if (req.file) category.image = req.file.path;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    if (displayOrder !== undefined) category.displayOrder = parseInt(displayOrder, 10) || 0;

    if (customSlug || (name && name.trim() !== category.name)) {
      const newSlug = (
        customSlug || slugify(name || category.name, { lower: true, strict: true })
      ).trim();

      if (newSlug !== category.slug) {
        const slugExists = await ServiceCategory.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: `Slug '${newSlug}' is already in use by another category`,
          });
        }
        category.slug = newSlug;
      }
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Service category updated successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service category",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Delete service category (Safe deletion)
// ==========================================
export const deleteServiceCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Service category not found",
      });
    }

    // Check if services reference this category
    const serviceCount = await Service.countDocuments({ category: id });
    if (serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service category because it contains ${serviceCount} service(s). Please reassign or delete these services first.`,
        serviceCount,
      });
    }

    await ServiceCategory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Service category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service category",
      error: error.message,
    });
  }
};
