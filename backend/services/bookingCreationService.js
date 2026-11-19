import mongoose from "mongoose";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import Service from "../models/Service.js";
import { createUAEDate } from "./staffAssignmentService.js";

/**
 * Normalizes email format.
 */
export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

/**
 * Validates email format.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates and extracts required phone string.
 */
export function normalizePhone(phone) {
  return (phone || "").trim();
}

/**
 * Unifies customer and service delivery address resolution for both
 * guest customers and authenticated customers.
 *
 * Guarantees that:
 * - customerDetails.name, customerDetails.email, customerDetails.phone are non-empty and valid.
 * - serviceAddress contains all required fields (unitNumber, buildingName, area, city, phone, fullName).
 * - addressId is correctly looked up on authenticated user profiles.
 * - Guest customers are properly tracked with isGuestBooking: true.
 *
 * @param {Object} params
 * @param {Object|null} params.user - Authenticated user from userAuth / optionalUserAuth
 * @param {Object|null} params.address - Raw address payload from client
 * @param {string|null} params.addressId - Selected saved address ID from client
 * @param {boolean} [params.saveAddressToProfile=false] - Whether to save new address to profile
 * @returns {Promise<{
 *   customerId: mongoose.Types.ObjectId,
 *   customerDetails: { name: string, email: string, phone: string },
 *   serviceAddress: Object,
 *   isGuestBooking: boolean
 * }>}
 */
export async function resolveCustomerAndServiceAddress({
  user,
  address,
  addressId,
  saveAddressToProfile = false,
}) {
  // ==========================================
  // CASE 1: AUTHENTICATED CUSTOMER
  // ==========================================
  if (user) {
    const userId = user._id || user.id;

    // Refresh user document from DB to access addresses subdocument collection
    const dbUser = await userModel.findById(userId);
    if (!dbUser) {
      const err = new Error("Authenticated customer account was not found.");
      err.statusCode = 404;
      throw err;
    }

    const customerEmail = normalizeEmail(dbUser.email || address?.email);
    if (!customerEmail || !isValidEmail(customerEmail)) {
      const err = new Error("A valid email address is required for your customer account.");
      err.statusCode = 400;
      throw err;
    }

    let serviceAddress = null;

    // 1A. Customer selected an existing saved address from profile
    if (addressId) {
      const saved =
        dbUser.addresses?.id(addressId) ||
        dbUser.addresses?.find((a) => String(a._id) === String(addressId));

      if (!saved) {
        const err = new Error("Selected saved address was not found in your profile.");
        err.statusCode = 404;
        throw err;
      }

      const addrPhone = normalizePhone(saved.phone || address?.phone || dbUser.phone);
      const addrName = (saved.fullName || address?.fullName || dbUser.name || "Valued Customer").trim();

      if (!addrPhone) {
        const err = new Error("A contact phone number is required for the service address.");
        err.statusCode = 400;
        throw err;
      }

      serviceAddress = {
        label: saved.label || "Home",
        fullName: addrName,
        phone: addrPhone,
        email: normalizeEmail(saved.email || customerEmail),
        unitNumber: (saved.unitNumber || "Residence").trim(),
        buildingName: (saved.buildingName || saved.area || "Residence").trim(),
        street: (saved.street || "").trim(),
        area: (saved.area || "Dubai").trim(),
        city: (saved.city || "Dubai").trim(),
        state: (saved.state || "Dubai").trim(),
        postalCode: (saved.postalCode || "").trim(),
        landmark: (saved.landmark || "").trim(),
        coordinates: saved.coordinates || { lat: null, lng: null },
        accessInstructions: (address?.accessInstructions || saved.accessInstructions || "").trim(),
      };
    }
    // 1B. Customer entered a new address during checkout
    else if (address) {
      const addrPhone = normalizePhone(address.phone || dbUser.phone);
      const addrName = (address.fullName || dbUser.name || "Valued Customer").trim();
      const addrUnit = (address.unitNumber || "").trim();
      const addrBuilding = (address.buildingName || "").trim();
      const addrArea = (address.area || "").trim();
      const addrCity = (address.city || "Dubai").trim();

      if (!addrPhone) {
        const err = new Error("A contact phone number is required for your appointment.");
        err.statusCode = 400;
        throw err;
      }

      if (!addrUnit || !addrBuilding || !addrArea) {
        const err = new Error(
          "Complete service address details (unit/villa number, building/community, and area) are required."
        );
        err.statusCode = 400;
        throw err;
      }

      serviceAddress = {
        label: (address.label || "Home").trim(),
        fullName: addrName,
        phone: addrPhone,
        email: customerEmail,
        unitNumber: addrUnit,
        buildingName: addrBuilding,
        street: (address.street || "").trim(),
        area: addrArea,
        city: addrCity,
        state: (address.state || "Dubai").trim(),
        postalCode: (address.postalCode || "").trim(),
        landmark: (address.landmark || "").trim(),
        coordinates: address.coordinates || { lat: null, lng: null },
        accessInstructions: (address.accessInstructions || "").trim(),
      };

      // Save to customer profile if requested
      if (saveAddressToProfile && Array.isArray(dbUser.addresses)) {
        try {
          dbUser.addresses.push({
            ...serviceAddress,
            isDefault: dbUser.addresses.length === 0,
          });
          await dbUser.save();
        } catch (saveErr) {
          console.warn("[resolveCustomerAndServiceAddress] Address profile save notice:", saveErr.message);
        }
      }

      // If user profile has no phone saved, update it with this phone
      if (!dbUser.phone && addrPhone) {
        try {
          dbUser.phone = addrPhone;
          await dbUser.save();
        } catch {
          // ignore
        }
      }
    } else {
      const err = new Error("Please select a saved address or provide a new service delivery address.");
      err.statusCode = 400;
      throw err;
    }

    const customerDetails = {
      name: (dbUser.name || serviceAddress.fullName || "Valued Customer").trim(),
      email: customerEmail,
      phone: serviceAddress.phone || normalizePhone(dbUser.phone),
    };

    return {
      customerId: dbUser._id,
      customerDetails,
      serviceAddress,
      isGuestBooking: false,
      guestClaimToken: null,
    };
  }

  // ==========================================
  // CASE 2: GUEST CUSTOMER
  // ==========================================
  if (!address || typeof address !== "object") {
    const err = new Error("Complete appointment details and service delivery address are required.");
    err.statusCode = 400;
    throw err;
  }

  const guestName = (address.fullName || "").trim();
  const guestEmail = normalizeEmail(address.email);
  const guestPhone = normalizePhone(address.phone);
  const guestUnit = (address.unitNumber || "").trim();
  const guestBuilding = (address.buildingName || "").trim();
  const guestArea = (address.area || "").trim();
  const guestCity = (address.city || "Dubai").trim();

  if (!guestName) {
    const err = new Error("Full name is required to book an appointment.");
    err.statusCode = 400;
    throw err;
  }

  if (!guestEmail || !isValidEmail(guestEmail)) {
    const err = new Error("A valid email address is required to receive your booking confirmation.");
    err.statusCode = 400;
    throw err;
  }

  if (!guestPhone) {
    const err = new Error("A contact phone number is required so our therapist can coordinate arrival.");
    err.statusCode = 400;
    throw err;
  }

  if (!guestUnit || !guestBuilding || !guestArea) {
    const err = new Error(
      "Complete delivery location details (apartment/villa number, building/community, and area) are required."
    );
    err.statusCode = 400;
    throw err;
  }

  // Find or create guest user record
  const phoneDigits = guestPhone.replace(/\D/g, "");
  const phoneCore = phoneDigits.length >= 9 ? phoneDigits.slice(-9) : phoneDigits;
  const userLookup = [{ email: guestEmail }];
  if (guestPhone) userLookup.push({ phone: guestPhone });
  if (phoneCore && phoneCore.length >= 7) userLookup.push({ phone: new RegExp(`${phoneCore}$`) });

  let guestUser = await userModel.findOne({ $or: userLookup });

  if (!guestUser) {
    let hashedPassword = "";
    try {
      const bcrypt = (await import("bcryptjs")).default;
      hashedPassword = await bcrypt.hash(`Guest#${Date.now()}`, 10);
    } catch {
      hashedPassword = "guest_no_password";
    }

    guestUser = await userModel.create({
      name: guestName,
      phone: guestPhone,
      email: guestEmail,
      password: hashedPassword,
      role: "user",
      isAccountVerified: false,
      isGuest: true,
    });
  }

  const serviceAddress = {
    label: (address.label || "Home").trim(),
    fullName: guestName,
    phone: guestPhone,
    email: guestEmail,
    unitNumber: guestUnit,
    buildingName: guestBuilding,
    street: (address.street || "").trim(),
    area: guestArea,
    city: guestCity,
    state: (address.state || "Dubai").trim(),
    postalCode: (address.postalCode || "").trim(),
    landmark: (address.landmark || "").trim(),
    coordinates: address.coordinates || { lat: null, lng: null },
    accessInstructions: (address.accessInstructions || "").trim(),
  };

  const customerDetails = {
    name: guestName,
    email: guestEmail,
    phone: guestPhone,
  };

  const guestClaimToken = crypto.randomBytes(32).toString("hex");

  return {
    customerId: guestUser._id,
    customerDetails,
    serviceAddress,
    isGuestBooking: true,
    guestClaimToken,
  };
}

/**
 * Validates selected service IDs and computes pricing and duration snapshots.
 */
export async function validateBookingServices(serviceIds) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    const err = new Error("Please select at least one treatment service.");
    err.statusCode = 400;
    throw err;
  }

  const validIds = serviceIds
    .map((id) => (typeof id === "string" ? id.trim() : id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length !== serviceIds.length) {
    const err = new Error("One or more selected service IDs are invalid.");
    err.statusCode = 400;
    throw err;
  }

  const services = await Service.find({
    _id: { $in: validIds },
    $or: [{ isActive: true }, { active: true }],
  }).lean();

  if (services.length !== validIds.length) {
    const err = new Error("One or more selected services are no longer active or available.");
    err.statusCode = 400;
    throw err;
  }

  let totalDurationMinutes = 0;
  let totalPrice = 0;

  const serviceSnapshots = services.map((srv) => {
    const dur = srv.durationMinutes || srv.duration || 30;
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

  return {
    validIds,
    services,
    serviceSnapshots,
    totalDurationMinutes,
    totalPrice,
  };
}

/**
 * Normalizes appointment date and time and constructs exact start and end Date objects in UAE timezone.
 */
export function validateBookingSchedule({ scheduledDate, rawScheduledTime, totalDurationMinutes }) {
  if (!scheduledDate || !rawScheduledTime) {
    const err = new Error("Scheduled appointment date and time are required.");
    err.statusCode = 400;
    throw err;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    const err = new Error("Invalid appointment date format. Expected YYYY-MM-DD.");
    err.statusCode = 400;
    throw err;
  }

  let scheduledTime = String(rawScheduledTime).trim();
  if (/AM|PM/i.test(scheduledTime)) {
    const match = scheduledTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h === 12) h = 0;
      if (match[3].toUpperCase() === "PM") h += 12;
      scheduledTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  } else {
    const match = scheduledTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      scheduledTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  if (!/^\d{2}:\d{2}$/.test(scheduledTime)) {
    const err = new Error("Invalid appointment time format. Expected HH:mm.");
    err.statusCode = 400;
    throw err;
  }

  const scheduledStartTime = createUAEDate(scheduledDate, scheduledTime);
  const scheduledEndTime = new Date(
    scheduledStartTime.getTime() + totalDurationMinutes * 60000
  );

  if (!scheduledStartTime || Number.isNaN(scheduledStartTime.getTime())) {
    const err = new Error("Invalid scheduled appointment start time.");
    err.statusCode = 400;
    throw err;
  }

  if (!scheduledEndTime || Number.isNaN(scheduledEndTime.getTime()) || totalDurationMinutes <= 0) {
    const err = new Error("Invalid scheduled appointment end time or duration.");
    err.statusCode = 400;
    throw err;
  }

  return {
    scheduledTime,
    scheduledStartTime,
    scheduledEndTime,
  };
}

/**
 * Generates an immutable, unique Rose Essence booking reference number (e.g. RB-20261119-ABCD).
 */
export function generateUniqueBookingNumber(scheduledDate) {
  const dateCode = String(scheduledDate || "").replace(/-/g, "") || "DATE";
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RB-${dateCode}-${randomSuffix}`;
}
