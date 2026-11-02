import ServiceZone from "../models/ServiceZone.js";
import Booking from "../models/Booking.js";
import slugify from "slugify";
import mongoose from "mongoose";

// ==========================================
// Public: Get all active service zones
// ==========================================
export const getPublicServiceZones = async (req, res) => {
  try {
    const zones = await ServiceZone.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: zones.length,
      zones,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load service zones",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: List all service zones with booking counts
// ==========================================
export const getAdminServiceZones = async (req, res) => {
  try {
    const zones = await ServiceZone.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // Attach real booking counts to each zone
    const zonesWithBookings = await Promise.all(
      zones.map(async (zone) => {
        const bookingCount = await Booking.countDocuments({
          $or: [
            { "serviceAddress.zoneId": zone._id },
            { "serviceAddress.zoneName": zone.name },
          ],
        }).catch(() => 0);
        return {
          ...zone,
          bookingCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: zonesWithBookings.length,
      zones: zonesWithBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve service zones",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Create service zone
// ==========================================
export const createServiceZone = async (req, res) => {
  try {
    const {
      name,
      slug: customSlug,
      city,
      description,
      supportedAreas,
      postalIdentifiers,
      boundaryCoordinates,
      isActive,
      displayOrder,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Zone name is required" });
    }

    const generatedSlug = (
      customSlug || slugify(name, { lower: true, strict: true })
    ).trim();

    const existing = await ServiceZone.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Service zone with slug '${generatedSlug}' already exists`,
      });
    }

    const zone = await ServiceZone.create({
      name: name.trim(),
      slug: generatedSlug,
      city: city ? city.trim() : "Dubai",
      description: description || "",
      supportedAreas: Array.isArray(supportedAreas) ? supportedAreas : [],
      postalIdentifiers: Array.isArray(postalIdentifiers) ? postalIdentifiers : [],
      boundaryCoordinates: Array.isArray(boundaryCoordinates) ? boundaryCoordinates : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: parseInt(displayOrder, 10) || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Service zone created successfully",
      zone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create service zone",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Update service zone
// ==========================================
export const updateServiceZone = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid zone ID" });
    }

    const zone = await ServiceZone.findById(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Service zone not found" });
    }

    const {
      name,
      slug: customSlug,
      city,
      description,
      supportedAreas,
      postalIdentifiers,
      boundaryCoordinates,
      isActive,
      displayOrder,
    } = req.body;

    if (name) zone.name = name.trim();
    if (city !== undefined) zone.city = city.trim();
    if (description !== undefined) zone.description = description.trim();
    if (supportedAreas !== undefined) {
      zone.supportedAreas = Array.isArray(supportedAreas) ? supportedAreas : [];
    }
    if (postalIdentifiers !== undefined) {
      zone.postalIdentifiers = Array.isArray(postalIdentifiers) ? postalIdentifiers : [];
    }
    if (boundaryCoordinates !== undefined) {
      zone.boundaryCoordinates = Array.isArray(boundaryCoordinates) ? boundaryCoordinates : [];
    }
    if (isActive !== undefined) zone.isActive = Boolean(isActive);
    if (displayOrder !== undefined) zone.displayOrder = parseInt(displayOrder, 10) || 0;

    if (customSlug || (name && name.trim() !== zone.name)) {
      const newSlug = (
        customSlug || slugify(name || zone.name, { lower: true, strict: true })
      ).trim();

      if (newSlug !== zone.slug) {
        const slugExists = await ServiceZone.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: `Slug '${newSlug}' is already in use by another zone`,
          });
        }
        zone.slug = newSlug;
      }
    }

    await zone.save();

    return res.status(200).json({
      success: true,
      message: "Service zone updated successfully",
      zone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service zone",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Delete service zone (with booking protection)
// ==========================================
export const deleteServiceZone = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid zone ID" });
    }

    const zone = await ServiceZone.findById(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Service zone not found" });
    }

    // Check if any bookings depend on this zone
    const bookingCount = await Booking.countDocuments({
      $or: [
        { "serviceAddress.zoneId": id },
        { "serviceAddress.zoneName": zone.name },
      ],
    });

    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        canDelete: false,
        message: `Cannot delete service zone "${zone.name}" because ${bookingCount} existing booking(s) depend on it. Please deactivate the zone instead to preserve historical records.`,
        bookingCount,
      });
    }

    await ServiceZone.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Service zone deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service zone",
      error: error.message,
    });
  }
};
