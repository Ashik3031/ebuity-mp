import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import ServiceZone from "../models/ServiceZone.js";
import AvailabilityConfig from "../models/AvailabilityConfig.js";
import userModel from "../models/userModel.js";
import Staff from "../models/Staff.js";
import NotificationLog from "../models/NotificationLog.js";
import {
  createUAEDate,
  findBestEligibleStaff,
  getAlternativeSlots,
  isStaffAvailableForSlot,
  isStaffQualifiedForServices,
} from "../services/staffAssignmentService.js";
import {
  notifyBookingConfirmed,
  notifyCancellation,
  notifyRescheduleOutcome,
  retryFailedNotifications,
} from "../services/notificationService.js";
import {
  broadcastBookingCreated,
  broadcastBookingUpdated,
} from "../services/realtimeService.js";

// Helper: Get or initialize availability configuration
async function getEffectiveConfig() {
  let config = await AvailabilityConfig.findOne({ key: "default_config" });
  if (!config) {
    config = await AvailabilityConfig.create({
      key: "default_config",
      workingHours: { start: "09:00", end: "21:00" },
      slotIntervalMinutes: 30,
      bufferMinutes: 30,
      breaks: [],
      maxConcurrentBookings: 3,
      leadTimeHours: 2,
      maxAdvanceDays: 30,
      activeDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
    });
  }
  return config;
}

// Helper: parse "HH:mm" to minutes from midnight
function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Helper: format minutes from midnight to "HH:mm"
function formatMinutesToTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Helper: Ensure booking has scheduledTime formatted in Dubai time (GST, UTC+4)
export function enrichBookingWithScheduledTime(bk) {
  if (!bk) return bk;
  let time = bk.scheduledTime;
  if (!time && bk.slotLockKey) {
    const parts = bk.slotLockKey.split("_");
    if (parts.length >= 2 && /^\d{1,2}:\d{2}$/.test(parts[1])) {
      time = parts[1];
    }
  }
  if (!time && bk.scheduledStartTime) {
    try {
      time = new Date(bk.scheduledStartTime).toLocaleTimeString("en-GB", {
        timeZone: "Asia/Dubai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      // ignore
    }
  }
  return {
    ...bk,
    scheduledTime: time || "",
  };
}

// Helper: validate if area belongs to an active service zone
export async function matchActiveServiceZone(areaName, cityName = "") {
  if (!areaName || !areaName.trim()) return null;
  const clean = areaName.trim().toLowerCase();
  const cleanCity = (cityName || "").trim().toLowerCase();

  const zones = await ServiceZone.find({ isActive: true }).lean();
  for (const zone of zones) {
    const zoneCity = (zone.city || "").trim().toLowerCase();

    // Check supportedAreas array (case-insensitive substring or exact match)
    if (Array.isArray(zone.supportedAreas)) {
      const match = zone.supportedAreas.some(
        (a) =>
          a.toLowerCase() === clean ||
          clean.includes(a.toLowerCase()) ||
          a.toLowerCase().includes(clean)
      );
      if (match) return zone;
    }

    // Check zone name
    if (
      zone.name.toLowerCase() === clean ||
      clean.includes(zone.name.toLowerCase()) ||
      zone.name.toLowerCase().includes(clean)
    ) {
      return zone;
    }

    // Check if zone city matches cleanCity
    if (cleanCity && zoneCity && cleanCity === zoneCity && zone.isActive) {
      return zone;
    }
  }
  return null;
}

// ==========================================
// 1. Validate Address Zone
// ==========================================
export const validateAddressZone = async (req, res) => {
  try {
    const { area, city, emirate, addressId } = req.body;

    let targetArea = area;
    let targetCity = city || emirate || "";

    if (!targetArea && addressId && req.user) {
      const user = await userModel.findById(req.user.id).select("addresses");
      const savedAddr = user?.addresses?.id(addressId);
      if (savedAddr) {
        targetArea = savedAddr.area;
        if (!targetCity) targetCity = savedAddr.city || savedAddr.state || "";
      }
    }

    if (!targetArea) {
      return res.status(400).json({
        success: false,
        message: "Area name or valid address ID is required",
      });
    }

    const matchedZone = await matchActiveServiceZone(targetArea, targetCity);

    if (matchedZone) {
      return res.status(200).json({
        success: true,
        isSupported: true,
        area: targetArea,
        city: targetCity || matchedZone.city || "Dubai",
        zone: {
          _id: matchedZone._id,
          name: matchedZone.name,
          slug: matchedZone.slug,
        },
      });
    }

    // UAE Emirate fallback support
    const validEmirates = [
      "dubai",
      "abu dhabi",
      "sharjah",
      "ajman",
      "ras al khaimah",
      "fujairah",
      "umm al quwain",
    ];
    if (targetCity && validEmirates.includes(targetCity.toLowerCase())) {
      return res.status(200).json({
        success: true,
        isSupported: true,
        area: targetArea,
        city: targetCity,
        zone: {
          _id: null,
          name: `${targetCity} - ${targetArea}`,
          slug: `${targetCity.toLowerCase().replace(/\s+/g, "-")}-${targetArea.toLowerCase().replace(/\s+/g, "-")}`,
        },
      });
    }

    const activeZones = await ServiceZone.find({ isActive: true })
      .select("name city supportedAreas")
      .lean();

    return res.status(200).json({
      success: true,
      isSupported: false,
      area: targetArea,
      message: `Sorry, we do not currently provide at-home services in "${targetArea}".`,
      supportedZones: activeZones.map((z) => ({
        name: z.name,
        city: z.city || "Dubai",
        areas: z.supportedAreas,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate service zone",
      error: error.message,
    });
  }
};

// ==========================================
// 2. Retrieve Available Dates and Time Slots
// ==========================================
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, duration, serviceIds } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter (YYYY-MM-DD) is required",
      });
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD",
      });
    }

    const config = await getEffectiveConfig();
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const now = new Date();

    // Check if date is in the past
    const todayStr = now.toISOString().split("T")[0];
    if (date < todayStr) {
      return res.status(200).json({
        success: true,
        date,
        totalDurationMinutes: 0,
        slots: [],
        message: "Cannot book dates in the past",
      });
    }

    // Check advance days limit
    const maxDate = new Date(now.getTime() + config.maxAdvanceDays * 86400000);
    if (targetDate > maxDate) {
      return res.status(200).json({
        success: true,
        date,
        totalDurationMinutes: 0,
        slots: [],
        message: `Bookings only open up to ${config.maxAdvanceDays} days in advance`,
      });
    }

    // Check holiday
    if (config.holidays && config.holidays.includes(date)) {
      return res.status(200).json({
        success: true,
        date,
        totalDurationMinutes: 0,
        slots: [],
        message: "No appointments available on this holiday",
      });
    }

    // Check active day of week
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    if (
      Array.isArray(config.activeDaysOfWeek) &&
      !config.activeDaysOfWeek.includes(dayOfWeek)
    ) {
      return res.status(200).json({
        success: true,
        date,
        totalDurationMinutes: 0,
        slots: [],
        message: "Service is closed on this day of the week",
      });
    }

    // Calculate total duration
    let totalDuration = parseInt(duration, 10);
    if (!totalDuration || isNaN(totalDuration) || totalDuration <= 0) {
      if (serviceIds) {
        const idList = String(serviceIds)
          .split(",")
          .map((id) => id.trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id));

        if (idList.length > 0) {
          const srvList = await Service.find({ _id: { $in: idList } }).select(
            "durationMinutes duration"
          );
          totalDuration = srvList.reduce(
            (sum, s) => sum + (s.durationMinutes || s.duration || 30),
            0
          );
        }
      }
    }
    if (!totalDuration || totalDuration <= 0) {
      totalDuration = 45; // Default standard session
    }

    const workStartMins = parseTimeToMinutes(config.workingHours.start || "09:00");
    const workEndMins = parseTimeToMinutes(config.workingHours.end || "21:00");
    const intervalMins = config.slotIntervalMinutes || 30;
    const bufferMins = config.bufferMinutes || 30;
    const leadTimeMs = (config.leadTimeHours || 2) * 3600 * 1000;
    const maxConcurrent = config.maxConcurrentBookings || 3;

    // Fetch existing active bookings for this date and adjacent borders
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const existingBookings = await Booking.find({
      status: { $in: ["pending", "confirmed"] },
      scheduledStartTime: { $lte: new Date(dayEnd.getTime() + bufferMins * 60000) },
      scheduledEndTime: { $gte: new Date(dayStart.getTime() - bufferMins * 60000) },
    })
      .select("scheduledStartTime scheduledEndTime status")
      .lean();

    // Level 5: Fetch qualified active staff if service IDs provided
    let qualifiedStaff = [];
    let hasStaffInSystem = false;
    if (serviceIds) {
      const idList = String(serviceIds)
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idList.length > 0) {
        const fullServices = await Service.find({ _id: { $in: idList } }).lean();
        const activeStaff = await Staff.find({ isActive: true });
        hasStaffInSystem = activeStaff.length > 0;
        qualifiedStaff = activeStaff.filter((st) =>
          isStaffQualifiedForServices(st, fullServices)
        );
      }
    }

    const slots = [];

    // Step through each slot in the working day
    for (
      let currentMin = workStartMins;
      currentMin + totalDuration <= workEndMins;
      currentMin += intervalMins
    ) {
      const slotStartTimeStr = formatMinutesToTime(currentMin);
      const slotEndTimeStr = formatMinutesToTime(currentMin + totalDuration);

      // Create Date objects in UAE time (+04:00)
      const slotStart = createUAEDate(date, slotStartTimeStr);
      const slotEnd = createUAEDate(date, slotEndTimeStr);

      let isAvailable = true;
      let reason = null;

      // 1. Advance lead-time check
      if (slotStart.getTime() - now.getTime() < leadTimeMs) {
        isAvailable = false;
        reason = "Advance booking notice required";
      }

      // 2. Break intervals check
      if (isAvailable && Array.isArray(config.breaks)) {
        for (const brk of config.breaks) {
          const brkStart = parseTimeToMinutes(brk.start);
          const brkEnd = parseTimeToMinutes(brk.end);
          const slotEndMin = currentMin + totalDuration;

          // Check overlap between [currentMin, slotEndMin] and [brkStart, brkEnd]
          if (currentMin < brkEnd && slotEndMin > brkStart) {
            isAvailable = false;
            reason = brk.label || "Daily rest & sanitation break";
            break;
          }
        }
      }

      // 3. Existing overlapping bookings count check (with buffer)
      if (isAvailable) {
        const slotStartBuffered = new Date(
          slotStart.getTime() - bufferMins * 60000
        );
        const slotEndBuffered = new Date(
          slotEnd.getTime() + bufferMins * 60000
        );

        let overlappingCount = 0;
        for (const bk of existingBookings) {
          const bkStart = new Date(bk.scheduledStartTime);
          const bkEnd = new Date(bk.scheduledEndTime);

          // Overlap condition
          if (bkStart < slotEndBuffered && bkEnd > slotStartBuffered) {
            overlappingCount++;
          }
        }

        if (overlappingCount >= maxConcurrent) {
          isAvailable = false;
          reason = "Fully booked";
        }
      }

      // 4. Staff-specific qualification and availability check (Level 5)
      if (isAvailable && hasStaffInSystem) {
        if (qualifiedStaff.length === 0) {
          isAvailable = false;
          reason = "No qualified staff available";
        } else {
          let hasFreeStaff = false;
          for (const st of qualifiedStaff) {
            const staffCheck = await isStaffAvailableForSlot({
              staff: st,
              scheduledDate: date,
              startTime: slotStart,
              endTime: slotEnd,
              bufferMinutes: bufferMins,
            });
            if (staffCheck.available) {
              hasFreeStaff = true;
              break;
            }
          }
          if (!hasFreeStaff) {
            isAvailable = false;
            reason = "No qualified staff available";
          }
        }
      }

      // Determine period of day
      let period = "morning";
      if (currentMin >= 12 * 60 && currentMin < 17 * 60) {
        period = "afternoon";
      } else if (currentMin >= 17 * 60) {
        period = "evening";
      }

      slots.push({
        time: slotStartTimeStr,
        endTime: slotEndTimeStr,
        startTime: slotStart.toISOString(),
        isAvailable,
        available: isAvailable,
        reason,
        period,
      });
    }

    return res.status(200).json({
      success: true,
      date,
      totalDurationMinutes: totalDuration,
      workingHours: config.workingHours,
      bufferMinutes: config.bufferMinutes || 30,
      leadTimeHours: config.leadTimeHours || 2,
      maxAdvanceDays: config.maxAdvanceDays || 30,
      isProvisional: !hasStaffInSystem,
      availabilityType: !hasStaffInSystem ? "provisional_business_slots" : "confirmed_staff_slots",
      statusNote: !hasStaffInSystem
        ? "Provisional business availability slots based on operating hours, buffer intervals, and booking horizon rules"
        : "Operational slots verified with assigned staff availability",
      slots,
      availableSlotsCount: slots.filter((s) => s.isAvailable).length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve available slots",
      error: error.message,
    });
  }
};

// ==========================================
// 3. Create Service Booking (Atomic Double-Booking Guard)
// ==========================================
export const createBooking = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication required to book a service",
      });
    }

    const {
      serviceIds,
      address,
      addressId,
      scheduledDate,
      scheduledTime, // e.g. "14:30"
      specialRequests,
      saveAddressToProfile,
    } = req.body;

    // 1. Validate service list
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one service to book",
      });
    }

    // Fetch services from DB
    const validIds = serviceIds
      .map((id) => (typeof id === "string" ? id.trim() : id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more service IDs are invalid",
      });
    }

    const services = await Service.find({
      _id: { $in: validIds },
      $or: [{ isActive: true }, { active: true }],
    }).lean();

    if (services.length !== validIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some selected services are no longer active or available",
      });
    }

    // Build service snapshots and totals
    let totalDurationMinutes = 0;
    let totalPrice = 0;

    const serviceSnapshots = services.map((srv) => {
      const dur = srv.durationMinutes || srv.duration || 30;
      // Use Today's Exclusive Deal price if active on this service
      const isDealActive = Boolean(
        srv.isExclusiveDeal &&
        srv.dealPrice !== null &&
        srv.dealPrice !== undefined &&
        Number(srv.dealPrice) >= 0
      );
      const prc = isDealActive ? Number(srv.dealPrice) : (Number(srv.price) || 0);
      totalDurationMinutes += dur;
      totalPrice += prc;

      return {
        serviceId: srv._id,
        name: srv.name,
        slug: srv.slug,
        price: prc,
        durationMinutes: dur,
        currency: srv.currency || "AED",
      };
    });

    // 2. Validate Address & Service Zone
    const user = await userModel.findById(customerId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let finalAddress = null;

    if (addressId) {
      const saved = user.addresses?.id(addressId);
      if (!saved) {
        return res.status(404).json({
          success: false,
          message: "Selected saved address not found",
        });
      }
      finalAddress = {
        label: saved.label || "Home",
        fullName: saved.fullName,
        phone: saved.phone,
        email: saved.email || user.email,
        unitNumber: saved.unitNumber,
        buildingName: saved.buildingName,
        street: saved.street || "",
        area: saved.area,
        city: saved.city || "Dubai",
        state: saved.state || "Dubai",
        postalCode: saved.postalCode || "",
        landmark: saved.landmark || "",
        coordinates: saved.coordinates || { lat: null, lng: null },
        accessInstructions:
          address?.accessInstructions || saved.accessInstructions || "",
      };
    } else if (address) {
      if (
        !address.fullName ||
        !address.phone ||
        !address.unitNumber ||
        !address.buildingName ||
        !address.area
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required address fields (fullName, phone, unitNumber, buildingName, area)",
        });
      }

      finalAddress = {
        label: address.label || "Home",
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        email: (address.email || user.email || "").trim(),
        unitNumber: address.unitNumber.trim(),
        buildingName: address.buildingName.trim(),
        street: address.street ? address.street.trim() : "",
        area: address.area.trim(),
        city: address.city ? address.city.trim() : "Dubai",
        state: address.state ? address.state.trim() : "Dubai",
        postalCode: address.postalCode ? address.postalCode.trim() : "",
        landmark: address.landmark ? address.landmark.trim() : "",
        coordinates:
          address.coordinates && typeof address.coordinates === "object"
            ? {
              lat: Number(address.coordinates.lat) || null,
              lng: Number(address.coordinates.lng) || null,
            }
            : { lat: null, lng: null },
        accessInstructions: address.accessInstructions
          ? address.accessInstructions.trim()
          : "",
      };

      // Optionally save to user's address book if requested
      if (saveAddressToProfile) {
        user.addresses.push({
          ...finalAddress,
          isDefault: user.addresses.length === 0,
        });
        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "A service delivery address is required",
      });
    }

    // Validate Zone
    const matchedZone = await matchActiveServiceZone(finalAddress.area);
    if (!matchedZone) {
      return res.status(400).json({
        success: false,
        message: `We currently do not offer services in "${finalAddress.area}". Please pick an address within our active Dubai zones.`,
      });
    }

    finalAddress.zoneId = matchedZone._id;
    finalAddress.zoneName = matchedZone.name;

    // 3. Validate Date & Time
    if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledDate (YYYY-MM-DD) is required",
      });
    }

    if (!scheduledTime || !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledTime (HH:mm) is required",
      });
    }

    const config = await getEffectiveConfig();
    const scheduledStartTime = createUAEDate(scheduledDate, scheduledTime);
    const scheduledEndTime = new Date(
      scheduledStartTime.getTime() + totalDurationMinutes * 60000
    );

    const now = new Date();
    const leadTimeMs = (config.leadTimeHours || 2) * 3600 * 1000;

    if (scheduledStartTime.getTime() - now.getTime() < leadTimeMs) {
      return res.status(400).json({
        success: false,
        message: `Appointments require at least ${config.leadTimeHours} hours advance notice.`,
      });
    }

    // 4. ATOMIC DOUBLE-BOOKING RECHECK & AUTOMATIC STAFF ASSIGNMENT (Level 5)
    // Buffer between services
    const bufferMins = config.bufferMinutes || 30;
    const startBuffered = new Date(
      scheduledStartTime.getTime() - bufferMins * 60000
    );
    const endBuffered = new Date(
      scheduledEndTime.getTime() + bufferMins * 60000
    );
    const maxConcurrent = config.maxConcurrentBookings || 3;

    // Query active overlapping bookings across fleet
    const overlappingCount = await Booking.countDocuments({
      status: { $in: ["pending", "confirmed"] },
      scheduledStartTime: { $lt: endBuffered },
      scheduledEndTime: { $gt: startBuffered },
    });

    if (overlappingCount >= maxConcurrent) {
      const alternativeSlots = await getAlternativeSlots({
        serviceIds: validIds,
        scheduledDate,
        totalDurationMinutes,
        bufferMinutes: bufferMins,
      });

      return res.status(409).json({
        success: false,
        conflict: true,
        message:
          "This appointment slot is at maximum capacity. Please select an alternate time.",
        alternativeSlots,
      });
    }

    // Level 5: Automatic Staff Assignment
    const activeStaffCount = await Staff.countDocuments({ isActive: true });
    let assignedStaff = null;
    let staffAssignmentStatus = "unassigned";
    const assignmentHistory = [];

    if (activeStaffCount > 0) {
      const assignmentResult = await findBestEligibleStaff({
        serviceIds: validIds,
        scheduledDate,
        startTime: scheduledStartTime,
        endTime: scheduledEndTime,
        bufferMinutes: bufferMins,
      });

      if (!assignmentResult.success || !assignmentResult.staff) {
        const alternativeSlots = await getAlternativeSlots({
          serviceIds: validIds,
          scheduledDate,
          totalDurationMinutes,
          bufferMinutes: bufferMins,
        });

        return res.status(409).json({
          success: false,
          conflict: true,
          message:
            assignmentResult.message ||
            "No qualified staff member is available for this slot. Please select an alternate time.",
          alternativeSlots,
        });
      }

      assignedStaff = assignmentResult.staff._id;
      staffAssignmentStatus = "assigned";
      assignmentHistory.push({
        staffId: assignmentResult.staff._id,
        staffName: assignmentResult.staff.name,
        action: "auto_assigned",
        reason: "Automatically assigned qualified staff member",
        performedBy: "system",
        timestamp: new Date(),
      });
    }

    // 5. Generate Unique Booking Reference Number
    const dateCode = scheduledDate.replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingNumber = `RB-${dateCode}-${randomSuffix}`;

    // 6. Create Booking Document
    const booking = await Booking.create({
      bookingNumber,
      customer: customerId,
      customerDetails: {
        name: user.name || finalAddress.fullName,
        email: user.email || finalAddress.email,
        phone: finalAddress.phone,
      },
      services: serviceSnapshots,
      totalDurationMinutes,
      totalPrice,
      currency: "AED",
      serviceAddress: finalAddress,
      scheduledDate,
      scheduledTime,
      scheduledStartTime,
      scheduledEndTime,
      status: "confirmed",
      specialRequests: specialRequests ? String(specialRequests).trim() : "",
      slotLockKey: `${scheduledDate}_${scheduledTime}_${assignedStaff || "unassigned"}`,
      assignedStaff,
      staffAssignmentStatus,
      assignmentHistory,
      travelBufferMinutes: bufferMins,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("assignedStaff", "name email phone profileImage")
      .lean();

    // Trigger asynchronous booking confirmation notifications (customer & assigned therapist)
    notifyBookingConfirmed(populatedBooking).catch((nErr) => {
      console.warn("[createBooking] Notification dispatch warning:", nErr.message);
    });

    const enriched = enrichBookingWithScheduledTime(populatedBooking);

    // Broadcast new booking in real time to Admin and assigned Staff!
    broadcastBookingCreated(enriched);

    return res.status(201).json({
      success: true,
      message: "At-home beauty appointment confirmed successfully!",
      booking: enriched,
    });
  } catch (error) {
    console.error("[createBooking] error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

// ==========================================
// 4. Customer: Get My Bookings
// ==========================================
export const getMyBookings = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { status } = req.query;
    const filter = { customer: customerId };
    if (status && ["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("assignedStaff", "name email phone profileImage")
      .sort({ scheduledStartTime: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookings.map(enrichBookingWithScheduledTime),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
      error: error.message,
    });
  }
};

// ==========================================
// 5. Get Booking Detail by ID or Number
// ==========================================
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;

    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.bookingNumber = id.toUpperCase();
    }

    const booking = await Booking.findOne(query)
      .populate("assignedStaff", "name email phone profileImage")
      .lean();
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Ensure customer owns booking or is admin
    const isOwner = String(booking.customer) === String(customerId);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access this booking",
      });
    }

    return res.status(200).json({
      success: true,
      booking: enrichBookingWithScheduledTime(booking),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve booking",
      error: error.message,
    });
  }
};

// ==========================================
// 6. Cancel Booking
// ==========================================
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;
    const { reason } = req.body;

    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.bookingNumber = id.toUpperCase();
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isOwner = String(booking.customer) === String(customerId);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot cancel this booking",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is already cancelled",
      });
    }

    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed service appointment",
      });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason ? String(reason).trim() : (isOwner ? "Cancelled by client" : "Cancelled by administrator");
    booking.cancellationRequest = {
      status: "approved",
      reason: booking.cancellationReason,
      requestedAt: booking.cancelledAt,
      reviewedAt: booking.cancelledAt,
      reviewedBy: isOwner ? "customer_direct" : "admin_direct",
      adminNote: "Direct cancellation applied",
    };
    booking.assignmentHistory.push({
      staffId: booking.assignedStaff,
      staffName: "",
      action: "status_update",
      reason: `Booking cancelled: ${booking.cancellationReason}`,
      performedBy: isOwner ? "customer" : "admin",
      timestamp: new Date(),
    });

    await booking.save();

    // Trigger cancellation notifications
    notifyCancellation(booking, booking.cancellationReason, isOwner ? "Client" : "Administrator").catch((nErr) => {
      console.warn("[cancelBooking] Notification dispatch warning:", nErr.message);
    });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

// ==========================================
// 7. Admin: Get All Bookings
// ==========================================
export const getAdminBookings = async (req, res) => {
  try {
    const { status, staffStatus, date, page = 1, limit = 20 } = req.query;
    const query = {};

    const validStaffStatuses = [
      "unassigned",
      "assigned",
      "accepted",
      "on_the_way",
      "arrived",
      "in_progress",
      "completed",
      "rejected",
      "admin_attention",
    ];

    if (status && status !== "all") {
      if (validStaffStatuses.includes(status)) {
        query.staffAssignmentStatus = status;
      } else {
        query.status = status;
      }
    }

    if (staffStatus && staffStatus !== "all") {
      query.staffAssignmentStatus = staffStatus;
    }

    if (date) query.scheduledDate = date;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate("assignedStaff", "name email phone profileImage")
      .sort({ scheduledStartTime: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      bookings: bookings.map(enrichBookingWithScheduledTime),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin bookings",
      error: error.message,
    });
  }
};

// ==========================================
// 8. Admin: Update Booking Status
// ==========================================
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = status;
    if (status === "cancelled") {
      booking.cancelledAt = new Date();
      if (cancellationReason) {
        booking.cancellationReason = cancellationReason.trim();
      }
    }

    await booking.save();

    // Broadcast booking update in real time
    broadcastBookingUpdated(booking);

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

// ==========================================
// 9. Admin: Get & Update Availability Config
// ==========================================
export const getAvailabilityConfig = async (req, res) => {
  try {
    const config = await getEffectiveConfig();
    return res.status(200).json({ success: true, config });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load availability config",
      error: error.message,
    });
  }
};

export const updateAvailabilityConfig = async (req, res) => {
  try {
    const updateData = req.body;
    const config = await AvailabilityConfig.findOneAndUpdate(
      { key: "default_config" },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Availability configuration updated successfully",
      config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update availability config",
      error: error.message,
    });
  }
};

// ==========================================
// 10. Level 9: Customer Reschedule Request
// ==========================================
export const requestReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;
    const { requestedDate, requestedTime, reason } = req.body;

    if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return res.status(400).json({
        success: false,
        message: "Valid requestedDate (YYYY-MM-DD) is required",
      });
    }

    if (!requestedTime || !/^\d{2}:\d{2}$/.test(requestedTime)) {
      return res.status(400).json({
        success: false,
        message: "Valid requestedTime (HH:mm) is required",
      });
    }

    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.bookingNumber = id.toUpperCase();
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isOwner = String(booking.customer) === String(customerId);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot reschedule this booking",
      });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule a ${booking.status} appointment`,
      });
    }

    // Validate date & slot
    const config = await getEffectiveConfig();
    const requestedStartTime = createUAEDate(requestedDate, requestedTime);
    const requestedEndTime = new Date(
      requestedStartTime.getTime() + booking.totalDurationMinutes * 60000
    );

    const now = new Date();
    const leadTimeMs = (config.leadTimeHours || 2) * 3600 * 1000;
    if (requestedStartTime.getTime() - now.getTime() < leadTimeMs) {
      return res.status(400).json({
        success: false,
        message: `Rescheduling requires at least ${config.leadTimeHours} hours advance notice.`,
      });
    }

    // Verify qualified staff availability for this slot
    const serviceIds = booking.services.map((s) => s.serviceId);
    const staffCheck = await findBestEligibleStaff({
      serviceIds,
      scheduledDate: requestedDate,
      startTime: requestedStartTime,
      endTime: requestedEndTime,
      bufferMinutes: booking.travelBufferMinutes || 30,
      excludeBookingId: booking._id,
    });

    if (!staffCheck.success || !staffCheck.staff) {
      const alternatives = await getAlternativeSlots({
        serviceIds,
        scheduledDate: requestedDate,
        totalDurationMinutes: booking.totalDurationMinutes,
        bufferMinutes: booking.travelBufferMinutes || 30,
      });

      return res.status(409).json({
        success: false,
        conflict: true,
        message: staffCheck.message || "No qualified therapist is available for the requested slot. Please choose an alternate time.",
        alternativeSlots: alternatives,
      });
    }

    // Set pending reschedule request
    booking.rescheduleRequest = {
      status: "pending",
      requestedDate,
      requestedStartTime,
      requestedEndTime,
      requestedTimeStr: requestedTime,
      reason: reason ? String(reason).trim() : "",
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: "",
      adminNote: "",
    };

    booking.assignmentHistory.push({
      staffId: booking.assignedStaff,
      staffName: "",
      action: "status_update",
      reason: `Client requested rescheduling to ${requestedDate} at ${requestedTime}${reason ? ` (${reason})` : ""}`,
      performedBy: isOwner ? "customer" : "admin",
      timestamp: new Date(),
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Reschedule request submitted successfully. Our concierge team is verifying therapist scheduling.",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit reschedule request",
      error: error.message,
    });
  }
};

// ==========================================
// 11. Level 9: Customer Cancellation Request (Policy-Aware)
// ==========================================
export const requestCancel = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.id;
    const { reason } = req.body;

    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.bookingNumber = id.toUpperCase();
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isOwner = String(booking.customer) === String(customerId);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot cancel this booking",
      });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${booking.status} appointment`,
      });
    }

    const now = new Date();
    const apptStart = new Date(booking.scheduledStartTime);
    const hoursUntilAppt = (apptStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Configurable cancellation policy:
    // If > 24 hours in advance: direct cancellation approved automatically
    // If <= 24 hours (late cancellation): submits cancellation request for admin review
    const cleanReason = reason ? String(reason).trim() : "Client requested cancellation";

    if (hoursUntilAppt > 24 || isAdmin) {
      booking.status = "cancelled";
      booking.cancelledAt = now;
      booking.cancellationReason = cleanReason;
      booking.cancellationRequest = {
        status: "approved",
        reason: cleanReason,
        requestedAt: now,
        reviewedAt: now,
        reviewedBy: isAdmin ? "admin" : "policy_auto_approval",
        adminNote: "Cancelled in advance per policy",
      };
      booking.assignmentHistory.push({
        staffId: booking.assignedStaff,
        staffName: "",
        action: "status_update",
        reason: `Appointment cancelled per advance notice policy: ${cleanReason}`,
        performedBy: isOwner ? "customer" : "admin",
        timestamp: now,
      });

      await booking.save();

      notifyCancellation(booking, cleanReason, isOwner ? "Client" : "Admin").catch(() => null);

      return res.status(200).json({
        success: true,
        immediateCancel: true,
        message: "Appointment cancelled successfully.",
        booking,
      });
    } else {
      // Late cancellation request requiring admin review
      booking.cancellationRequest = {
        status: "pending",
        reason: cleanReason,
        requestedAt: now,
        reviewedAt: null,
        reviewedBy: "",
        adminNote: "",
      };
      booking.assignmentHistory.push({
        staffId: booking.assignedStaff,
        staffName: "",
        action: "status_update",
        reason: `Late cancellation requested (${hoursUntilAppt.toFixed(1)}h before appointment): ${cleanReason}`,
        performedBy: isOwner ? "customer" : "admin",
        timestamp: now,
      });

      await booking.save();

      return res.status(200).json({
        success: true,
        immediateCancel: false,
        message: "Cancellation request received and submitted for administrative review due to our 24-hour appointment policy.",
        booking,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process cancellation request",
      error: error.message,
    });
  }
};

// ==========================================
// 12. Level 9: Admin Review Cancellation Request
// ==========================================
export const reviewCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const now = new Date();
    const reviewer = req.user?.email || "Admin";

    if (action === "approve") {
      booking.status = "cancelled";
      booking.cancelledAt = now;
      booking.cancellationReason = booking.cancellationRequest?.reason || "Approved by administrator";
      booking.cancellationRequest = {
        ...(booking.cancellationRequest?.toObject?.() || booking.cancellationRequest || {}),
        status: "approved",
        reviewedAt: now,
        reviewedBy: reviewer,
        adminNote: adminNote ? String(adminNote).trim() : "Approved by administrator",
      };
      booking.staffAssignmentStatus = "unassigned";
      booking.assignmentHistory.push({
        staffId: booking.assignedStaff,
        staffName: "",
        action: "status_update",
        reason: `Cancellation request approved by admin. ${adminNote || ""}`.trim(),
        performedBy: `admin:${reviewer}`,
        timestamp: now,
      });

      await booking.save();

      notifyCancellation(booking, booking.cancellationReason, "Administrator").catch(() => null);

      // Broadcast cancellation approval in real time
      broadcastBookingUpdated(booking, { action: "cancellation_approved" });

      return res.status(200).json({
        success: true,
        message: "Cancellation request approved and appointment cancelled.",
        booking,
      });
    } else {
      booking.cancellationRequest = {
        ...(booking.cancellationRequest?.toObject?.() || booking.cancellationRequest || {}),
        status: "rejected",
        reviewedAt: now,
        reviewedBy: reviewer,
        adminNote: adminNote ? String(adminNote).trim() : "Cancellation request declined per policy",
      };
      booking.assignmentHistory.push({
        staffId: booking.assignedStaff,
        staffName: "",
        action: "status_update",
        reason: `Cancellation request rejected by admin: ${adminNote || "Declined per policy"}`.trim(),
        performedBy: `admin:${reviewer}`,
        timestamp: now,
      });

      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Cancellation request rejected. Appointment remains confirmed.",
        booking,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to review cancellation request",
      error: error.message,
    });
  }
};

// ==========================================
// 13. Level 9: Admin Review Reschedule Request
// ==========================================
export const reviewReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote, staffId } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const now = new Date();
    const reviewer = req.user?.email || "Admin";

    if (action === "approve") {
      const reqDetails = booking.rescheduleRequest;
      if (!reqDetails || !reqDetails.requestedDate || !reqDetails.requestedStartTime) {
        return res.status(400).json({
          success: false,
          message: "No valid pending reschedule request found on this booking",
        });
      }

      const newDate = reqDetails.requestedDate;
      const newStart = new Date(reqDetails.requestedStartTime);
      const newEnd = new Date(reqDetails.requestedEndTime);

      // Validate that the slot is still in the future
      if (newStart.getTime() <= now.getTime()) {
        return res.status(400).json({
          success: false,
          message: "Cannot approve reschedule: The requested time slot has already passed.",
        });
      }

      const serviceIds = booking.services.map((s) => s.serviceId);
      let targetStaff = null;

      // If an explicit staff ID is selected by the admin
      if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
        const candidateStaff = await Staff.findById(staffId);
        if (!candidateStaff || !candidateStaff.isActive) {
          return res.status(400).json({
            success: false,
            message: "Selected therapist is inactive or does not exist",
          });
        }
        const fullServices = await Service.find({ _id: { $in: serviceIds } }).lean();
        if (!isStaffQualifiedForServices(candidateStaff, fullServices)) {
          return res.status(400).json({
            success: false,
            message: "Selected therapist is not qualified for all services in this booking",
          });
        }
        const checkAvail = await isStaffAvailableForSlot({
          staff: candidateStaff,
          scheduledDate: newDate,
          startTime: newStart,
          endTime: newEnd,
          bufferMinutes: booking.travelBufferMinutes || 30,
          excludeBookingId: booking._id,
        });
        if (!checkAvail.available) {
          return res.status(409).json({
            success: false,
            message: `Selected therapist is unavailable: ${checkAvail.reason}`,
          });
        }
        targetStaff = candidateStaff;
      } else {
        // Check if currently assigned staff is available at the new slot
        let currentStaffFree = false;
        if (booking.assignedStaff) {
          const currentStaff = await Staff.findById(booking.assignedStaff);
          if (currentStaff && currentStaff.isActive) {
            const checkCurrent = await isStaffAvailableForSlot({
              staff: currentStaff,
              scheduledDate: newDate,
              startTime: newStart,
              endTime: newEnd,
              bufferMinutes: booking.travelBufferMinutes || 30,
              excludeBookingId: booking._id,
            });
            if (checkCurrent.available) {
              currentStaffFree = true;
              targetStaff = currentStaff;
            }
          }
        }

        // If current staff not free, auto-find next eligible staff member
        if (!currentStaffFree) {
          const autoAssign = await findBestEligibleStaff({
            serviceIds,
            scheduledDate: newDate,
            startTime: newStart,
            endTime: newEnd,
            bufferMinutes: booking.travelBufferMinutes || 30,
            excludeBookingId: booking._id,
          });

          if (!autoAssign.success || !autoAssign.staff) {
            return res.status(409).json({
              success: false,
              message: "Cannot approve reschedule: No qualified therapist is available at the requested date and time slot.",
            });
          }
          targetStaff = autoAssign.staff;
        }
      }

      // Slot & staff verified! Update booking schedule
      const oldDate = booking.scheduledDate;
      const oldTime = new Date(booking.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      booking.scheduledDate = newDate;
      booking.scheduledStartTime = newStart;
      booking.scheduledEndTime = newEnd;
      booking.assignedStaff = targetStaff._id;
      booking.staffAssignmentStatus = "assigned";
      booking.flaggedForAdmin = false;

      booking.rescheduleRequest = {
        ...(booking.rescheduleRequest?.toObject?.() || booking.rescheduleRequest || {}),
        status: "approved",
        reviewedAt: now,
        reviewedBy: reviewer,
        adminNote: adminNote ? String(adminNote).trim() : `Rescheduled from ${oldDate} ${oldTime} to ${newDate}`,
      };

      booking.assignmentHistory.push({
        staffId: targetStaff._id,
        staffName: targetStaff.name,
        action: "status_update",
        reason: `Reschedule approved by admin to ${newDate}. Assigned specialist: ${targetStaff.name}. ${adminNote || ""}`.trim(),
        performedBy: `admin:${reviewer}`,
        timestamp: now,
      });

      await booking.save();

      notifyRescheduleOutcome(booking, true, adminNote).catch(() => null);

      const populated = await Booking.findById(booking._id)
        .populate("assignedStaff", "name email phone profileImage")
        .lean();

      // Broadcast reschedule approval in real time
      broadcastBookingUpdated(populated, { action: "reschedule_approved" });

      return res.status(200).json({
        success: true,
        message: "Reschedule request approved and appointment updated successfully.",
        booking: populated,
      });
    } else {
      // Reject reschedule request
      booking.rescheduleRequest = {
        ...(booking.rescheduleRequest?.toObject?.() || booking.rescheduleRequest || {}),
        status: "rejected",
        reviewedAt: now,
        reviewedBy: reviewer,
        adminNote: adminNote ? String(adminNote).trim() : "Reschedule request declined: Requested slot unavailable.",
      };

      booking.assignmentHistory.push({
        staffId: booking.assignedStaff,
        staffName: "",
        action: "status_update",
        reason: `Reschedule request rejected by admin: ${adminNote || "Slot unavailable"}`.trim(),
        performedBy: `admin:${reviewer}`,
        timestamp: now,
      });

      await booking.save();

      notifyRescheduleOutcome(booking, false, adminNote).catch(() => null);

      return res.status(200).json({
        success: true,
        message: "Reschedule request rejected. Original appointment remains active.",
        booking,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to review reschedule request",
      error: error.message,
    });
  }
};

// ==========================================
// 14. Level 9: Validate Reschedule Slot Ahead of Approval
// ==========================================
export const validateRescheduleSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedDate, requestedTime } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!requestedDate || !requestedTime) {
      return res.status(400).json({
        success: false,
        message: "requestedDate and requestedTime are required",
      });
    }

    const config = await getEffectiveConfig();
    const scheduledStartTime = createUAEDate(requestedDate, requestedTime);
    const scheduledEndTime = new Date(
      scheduledStartTime.getTime() + booking.totalDurationMinutes * 60000
    );

    const now = new Date();
    if (scheduledStartTime.getTime() <= now.getTime()) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        reason: "Proposed slot is in the past",
      });
    }

    const serviceIds = booking.services.map((s) => s.serviceId);
    const staffResult = await findBestEligibleStaff({
      serviceIds,
      scheduledDate: requestedDate,
      startTime: scheduledStartTime,
      endTime: scheduledEndTime,
      bufferMinutes: booking.travelBufferMinutes || 30,
      excludeBookingId: booking._id,
    });

    return res.status(200).json({
      success: true,
      isAvailable: staffResult.success && !!staffResult.staff,
      candidateCount: staffResult.candidateCount || 0,
      suggestedStaff: staffResult.staff
        ? {
          _id: staffResult.staff._id,
          name: staffResult.staff.name,
          email: staffResult.staff.email,
        }
        : null,
      message: staffResult.message || (staffResult.success ? "Slot is available" : "Slot is unavailable"),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate reschedule slot",
      error: error.message,
    });
  }
};

// ==========================================
// 15. Level 9: Admin Notification Delivery Oversight & Retries
// ==========================================
export const getNotificationLogs = async (req, res) => {
  try {
    const { bookingId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (bookingId) query.bookingId = bookingId;
    if (status && status !== "all") query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await NotificationLog.countDocuments(query);
    const logs = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notification logs",
      error: error.message,
    });
  }
};

export const retryNotificationAction = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const result = await retryFailedNotifications(bookingId);
    return res.status(200).json({
      success: true,
      message: `Retried ${result.retried} failed notifications.`,
      retriedCount: result.retried,
      logs: result.logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retry notifications",
      error: error.message,
    });
  }
};
