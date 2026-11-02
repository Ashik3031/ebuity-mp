import Service from "../models/Service.js";
import ServiceCategory from "../models/ServiceCategory.js";
import slugify from "slugify";
import mongoose from "mongoose";

// ==========================================
// Public: Get all active services
// ==========================================
export const getPublicServices = async (req, res) => {
  try {
    const {
      category,
      search,
      featured,
      exclusiveDeals,
      page = 1,
      limit = 20,
      sortBy = "displayOrder",
      sortOrder = "asc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // First ensure we only query services under active categories
    const activeCategories = await ServiceCategory.find({ isActive: true }).select("_id slug");
    const activeCategoryIds = activeCategories.map((c) => c._id);

    const filter = {
      isActive: true,
      category: { $in: activeCategoryIds },
    };

    // Filter by specific category (ID or slug)
    if (category && category !== "All" && category !== "all") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const foundCategory = activeCategories.find(
          (c) => c.slug === category.toLowerCase()
        );
        if (foundCategory) {
          filter.category = foundCategory._id;
        } else {
          // If specified category doesn't match any active category, return empty list
          return res.status(200).json({
            success: true,
            total: 0,
            page: pageNum,
            limit: limitNum,
            totalPages: 0,
            services: [],
          });
        }
      }
    }

    // Filter by search keyword
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      filter.$or = [
        { name: regex },
        { shortDescription: regex },
        { fullDescription: regex },
        { benefits: regex },
      ];
    }

    // Filter by featured
    if (featured === "true" || featured === true) {
      filter.isFeatured = true;
    }

    // Filter by exclusive deals
    if (exclusiveDeals === "true" || exclusiveDeals === true) {
      filter.isExclusiveDeal = true;
    }

    // Sorting allowlist
    const sortFieldMap = {
      displayOrder: "displayOrder",
      price: "price",
      duration: "duration",
      createdAt: "createdAt",
      name: "name",
    };

    const sortField = sortFieldMap[sortBy] || "displayOrder";
    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortObj = { [sortField]: sortDirection };

    const total = await Service.countDocuments(filter);

    const services = await Service.find(filter)
      .populate("category", "_id name slug image")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
      error: error.message,
    });
  }
};

// ==========================================
// Public: Get today's exclusive deals
// ==========================================
export const getExclusiveDeals = async (req, res) => {
  try {
    const activeCategories = await ServiceCategory.find({ isActive: true }).select("_id");
    const activeCategoryIds = activeCategories.map((c) => c._id);

    const filter = {
      isActive: true,
      category: { $in: activeCategoryIds },
      isExclusiveDeal: true,
    };

    const services = await Service.find(filter)
      .populate("category", "_id name slug image")
      .sort({ displayOrder: 1, updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve today's exclusive deals",
      error: error.message,
    });
  }
};

// ==========================================
// Public: Get single service by slug or ID
// ==========================================
export const getPublicServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { $or: [{ _id: slug }, { slug: slug.toLowerCase() }] }
      : { slug: slug.toLowerCase() };

    const service = await Service.findOne(query)
      .populate("category", "_id name slug description image isActive")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if category is active
    if (!service.isActive || (service.category && !service.category.isActive)) {
      return res.status(404).json({
        success: false,
        message: "This service is currently unavailable",
      });
    }

    // Fetch up to 3 related active services in the same category
    const relatedServices = await Service.find({
      category: service.category._id,
      _id: { $ne: service._id },
      isActive: true,
    })
      .populate("category", "_id name slug")
      .limit(3)
      .lean();

    return res.status(200).json({
      success: true,
      service,
      relatedServices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service details",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: List all services
// ==========================================
export const getAdminServices = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, search, exclusiveDeals } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (category) filter.category = category;
    if (search && search.trim()) {
      filter.name = new RegExp(search.trim(), "i");
    }
    if (exclusiveDeals === "true" || exclusiveDeals === true) {
      filter.isExclusiveDeal = true;
    }

    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .populate("category", "_id name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin services",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Create service
// ==========================================
export const createService = async (req, res) => {
  try {
    const {
      name,
      slug: customSlug,
      category,
      shortDescription,
      fullDescription,
      images,
      price,
      duration,
      durationMinutes,
      womenOnly,
      preparationInstructions,
      isActive,
      isFeatured,
      isExclusiveDeal,
      dealPrice,
      dealDiscountPercentage,
      dealBadge,
      dealDescription,
      dealEndsAt,
      displayOrder,
      benefits,
      includedSteps,
    } = req.body;

    // Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Service name is required" });
    }

    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Valid category ID is required" });
    }

    const categoryDoc = await ServiceCategory.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: "Referenced service category does not exist" });
    }

    if (price === undefined || price === null || isNaN(price) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "A valid non-negative price is required" });
    }

    const finalDuration = parseInt(duration || durationMinutes, 10);
    if (!finalDuration || isNaN(finalDuration) || finalDuration < 5) {
      return res.status(400).json({ success: false, message: "Duration must be at least 5 minutes" });
    }

    const generatedSlug = (
      customSlug || slugify(name, { lower: true, strict: true })
    ).trim();

    const existingSlug = await Service.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: `Service with slug '${generatedSlug}' already exists`,
      });
    }

    // Process images (either array of strings or uploaded via req.files)
    let parsedImages = Array.isArray(images) ? images : [];
    if (req.files && Array.isArray(req.files)) {
      parsedImages = parsedImages.concat(req.files.map((f) => f.path));
    } else if (req.file) {
      parsedImages.push(req.file.path);
    }

    const service = await Service.create({
      name: name.trim(),
      slug: generatedSlug,
      category,
      shortDescription: shortDescription || "",
      fullDescription: fullDescription || "",
      images: parsedImages,
      price: Number(price),
      duration: finalDuration,
      durationMinutes: finalDuration,
      womenOnly: Boolean(womenOnly),
      preparationInstructions: preparationInstructions ? preparationInstructions.trim() : "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: Boolean(isFeatured),
      isExclusiveDeal: Boolean(isExclusiveDeal),
      dealPrice: dealPrice !== undefined && dealPrice !== null && dealPrice !== "" ? Number(dealPrice) : null,
      dealDiscountPercentage: dealDiscountPercentage !== undefined && dealDiscountPercentage !== null && dealDiscountPercentage !== "" ? Number(dealDiscountPercentage) : null,
      dealBadge: dealBadge && dealBadge.trim() ? dealBadge.trim() : "Today's Exclusive",
      dealDescription: dealDescription ? dealDescription.trim() : "",
      dealEndsAt: dealEndsAt ? new Date(dealEndsAt) : null,
      displayOrder: parseInt(displayOrder, 10) || 0,
      benefits: Array.isArray(benefits) ? benefits : [],
      includedSteps: Array.isArray(includedSteps) ? includedSteps : [],
    });

    const populated = await service.populate("category", "_id name slug image");

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      service: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create service",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Update service
// ==========================================
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID" });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const {
      name,
      slug: customSlug,
      category,
      shortDescription,
      fullDescription,
      images,
      price,
      duration,
      durationMinutes,
      womenOnly,
      preparationInstructions,
      isActive,
      isFeatured,
      isExclusiveDeal,
      dealPrice,
      dealDiscountPercentage,
      dealBadge,
      dealDescription,
      dealEndsAt,
      displayOrder,
      benefits,
      includedSteps,
    } = req.body;

    if (name) service.name = name.trim();

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID" });
      }
      const categoryDoc = await ServiceCategory.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({ success: false, message: "Referenced category not found" });
      }
      service.category = category;
    }

    if (shortDescription !== undefined) service.shortDescription = shortDescription.trim();
    if (fullDescription !== undefined) service.fullDescription = fullDescription.trim();
    if (price !== undefined) {
      if (isNaN(price) || Number(price) < 0) {
        return res.status(400).json({ success: false, message: "Price cannot be negative" });
      }
      service.price = Number(price);
    }
    const finalDuration = duration !== undefined ? duration : durationMinutes;
    if (finalDuration !== undefined) {
      if (isNaN(finalDuration) || Number(finalDuration) < 5) {
        return res.status(400).json({ success: false, message: "Duration must be at least 5 minutes" });
      }
      service.duration = parseInt(finalDuration, 10);
      service.durationMinutes = parseInt(finalDuration, 10);
    }
    if (womenOnly !== undefined) service.womenOnly = Boolean(womenOnly);
    if (preparationInstructions !== undefined) {
      service.preparationInstructions = preparationInstructions.trim();
    }
    if (isActive !== undefined) service.isActive = Boolean(isActive);
    if (isFeatured !== undefined) service.isFeatured = Boolean(isFeatured);
    if (isExclusiveDeal !== undefined) service.isExclusiveDeal = Boolean(isExclusiveDeal);
    if (dealPrice !== undefined) {
      service.dealPrice = dealPrice !== null && dealPrice !== "" ? Number(dealPrice) : null;
    }
    if (dealDiscountPercentage !== undefined) {
      service.dealDiscountPercentage = dealDiscountPercentage !== null && dealDiscountPercentage !== "" ? Number(dealDiscountPercentage) : null;
    }
    if (dealBadge !== undefined) service.dealBadge = dealBadge.trim();
    if (dealDescription !== undefined) service.dealDescription = dealDescription.trim();
    if (dealEndsAt !== undefined) {
      service.dealEndsAt = dealEndsAt ? new Date(dealEndsAt) : null;
    }
    if (displayOrder !== undefined) service.displayOrder = parseInt(displayOrder, 10) || 0;
    if (benefits !== undefined) service.benefits = Array.isArray(benefits) ? benefits : [];
    if (includedSteps !== undefined) service.includedSteps = Array.isArray(includedSteps) ? includedSteps : [];
    if (images !== undefined) service.images = Array.isArray(images) ? images : [];

    if (customSlug || (name && name.trim() !== service.name)) {
      const newSlug = (
        customSlug || slugify(name || service.name, { lower: true, strict: true })
      ).trim();

      if (newSlug !== service.slug) {
        const slugExists = await Service.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: `Slug '${newSlug}' is already in use by another service`,
          });
        }
        service.slug = newSlug;
      }
    }

    await service.save();
    const updated = await service.populate("category", "_id name slug image");

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Delete service
// ==========================================
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID" });
    }

    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
