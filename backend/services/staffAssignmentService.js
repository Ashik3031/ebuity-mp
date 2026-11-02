import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import AvailabilityConfig from "../models/AvailabilityConfig.js";

// UAE Timezone offset is UTC+4 hours (240 minutes)
const UAE_OFFSET_HOURS = 4;
const DEFAULT_BUFFER_MINS = 30;

/**
 * Helper: Parse "HH:mm" to minutes from midnight
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Helper: Format minutes from midnight to "HH:mm"
 */
export function formatMinutesToTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Helper: Construct accurate UTC Date for a given UAE local date and time
 * UAE is GST (UTC+4) without Daylight Saving Time.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm
 * @returns {Date} Date object corresponding to that exact point in time
 */
export function createUAEDate(dateStr, timeStr = "00:00") {
  // ISO format with UAE explicit offset: 2026-10-25T14:30:00+04:00
  return new Date(`${dateStr}T${timeStr}:00+04:00`);
}

/**
 * Helper: Extract UAE local day-of-week (0=Sun, 1=Mon, ..., 6=Sat)
 */
export function getUAEDayOfWeek(dateStr) {
  const d = createUAEDate(dateStr, "12:00");
  return d.getUTCDay(); // At 12:00 UAE (+04:00), UTC is 08:00 of the same day
}

/**
 * Helper: Get fleet availability config
 */
async function getFleetConfig() {
  let config = await AvailabilityConfig.findOne({ key: "default_config" });
  if (!config) {
    config = {
      bufferMinutes: DEFAULT_BUFFER_MINS,
      workingHours: { start: "09:00", end: "21:00" },
      leadTimeHours: 2,
    };
  }
  return config;
}

/**
 * Check if a staff member is qualified for ALL requested services
 * (Staff can be qualified via category assignment or explicit service assignment)
 */
export function isStaffQualifiedForServices(staff, services) {
  if (!staff || !Array.isArray(services) || services.length === 0) return false;

  const staffCategorySet = new Set(
    (staff.categoryIds || []).map((id) => id.toString())
  );
  const staffServiceSet = new Set(
    (staff.serviceIds || []).map((id) => id.toString())
  );

  return services.every((srv) => {
    const srvId = srv._id ? srv._id.toString() : srv.toString();
    const catId = srv.category ? (srv.category._id || srv.category).toString() : null;

    const hasServiceSkill = staffServiceSet.has(srvId);
    const hasCategorySkill = catId && staffCategorySet.has(catId);

    return hasServiceSkill || hasCategorySkill;
  });
}

/**
 * Check whether a staff member is working and available at the given slot:
 * 1. Active status
 * 2. Weekly off day
 * 3. Holiday
 * 4. Approved leave
 * 5. Working hours
 * 6. Daily breaks
 * 7. Existing active bookings + safety/travel buffer
 */
export async function isStaffAvailableForSlot({
  staff,
  scheduledDate, // YYYY-MM-DD
  startTime,     // Date (UTC)
  endTime,       // Date (UTC)
  bufferMinutes = DEFAULT_BUFFER_MINS,
  excludeBookingId = null,
}) {
  if (!staff.isActive) {
    return { available: false, reason: "Staff member is deactivated" };
  }

  // 1. Holiday check
  if (Array.isArray(staff.holidays) && staff.holidays.includes(scheduledDate)) {
    return { available: false, reason: "Staff member is on holiday" };
  }

  // 1b. Temporary schedule exception check
  let effectiveWorkingHours = staff.workingHours || { start: "09:00", end: "21:00" };
  if (Array.isArray(staff.scheduleExceptions)) {
    const exc = staff.scheduleExceptions.find((e) => e.date === scheduledDate);
    if (exc) {
      if (exc.isOff) {
        return {
          available: false,
          reason: `Schedule exception: ${exc.reason || "Scheduled day off"}`,
        };
      }
      if (exc.start && exc.end) {
        effectiveWorkingHours = { start: exc.start, end: exc.end };
      }
    }
  }

  // 2. Weekly off day check
  const dayOfWeek = getUAEDayOfWeek(scheduledDate);
  if (Array.isArray(staff.weeklyOffDays) && staff.weeklyOffDays.includes(dayOfWeek)) {
    return { available: false, reason: "Scheduled on staff member's weekly off day" };
  }

  // 3. Approved leave check
  if (Array.isArray(staff.leaves)) {
    const hasApprovedLeave = staff.leaves.some((leave) => {
      if (leave.status !== "approved") return false;
      const lStart = new Date(leave.startDate);
      const lEnd = new Date(leave.endDate);
      // Overlaps if leave start is before booking end and leave end is after booking start
      return lStart <= endTime && lEnd >= startTime;
    });

    if (hasApprovedLeave) {
      return { available: false, reason: "Staff member is on approved leave" };
    }
  }

  // 4. Working hours check in UAE time
  const startMins = startTime.getUTCHours() * 60 + startTime.getUTCMinutes() + UAE_OFFSET_HOURS * 60;
  const normalizedStartMins = (startMins % 1440);
  const endMins = endTime.getUTCHours() * 60 + endTime.getUTCMinutes() + UAE_OFFSET_HOURS * 60;
  const normalizedEndMins = (endMins % 1440);

  const workStartMins = parseTimeToMinutes(effectiveWorkingHours?.start || "09:00");
  const workEndMins = parseTimeToMinutes(effectiveWorkingHours?.end || "21:00");

  if (normalizedStartMins < workStartMins || normalizedEndMins > workEndMins) {
    return {
      available: false,
      reason: `Outside staff working hours (${effectiveWorkingHours?.start || "09:00"} - ${effectiveWorkingHours?.end || "21:00"})`,
    };
  }

  // 5. Breaks check
  if (Array.isArray(staff.breaks)) {
    for (const brk of staff.breaks) {
      const brkStart = parseTimeToMinutes(brk.start);
      const brkEnd = parseTimeToMinutes(brk.end);
      if (normalizedStartMins < brkEnd && normalizedEndMins > brkStart) {
        return {
          available: false,
          reason: `Overlaps with break (${brk.label || "Rest break"}: ${brk.start} - ${brk.end})`,
        };
      }
    }
  }

  // 6. Overlapping existing bookings check (with safety / travel buffer)
  const bufferMs = bufferMinutes * 60 * 1000;
  const bookingStartBuffered = new Date(startTime.getTime() - bufferMs);
  const bookingEndBuffered = new Date(endTime.getTime() + bufferMs);

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const bookingQuery = {
      assignedStaff: staff._id,
      status: { $in: ["pending", "confirmed"] },
      staffAssignmentStatus: { $nin: ["rejected", "cancelled"] },
      scheduledStartTime: { $lt: bookingEndBuffered },
      scheduledEndTime: { $gt: bookingStartBuffered },
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const conflictingBooking = await Booking.findOne(bookingQuery).lean();
    if (conflictingBooking) {
      return {
        available: false,
        reason: `Staff member has another appointment (${conflictingBooking.bookingNumber}) with required travel buffer`,
      };
    }
  } else if (Array.isArray(staff.existingBookings)) {
    // In-memory existing bookings support
    for (const bk of staff.existingBookings) {
      if (excludeBookingId && String(bk._id) === String(excludeBookingId)) continue;
      const bkStart = new Date(bk.scheduledStartTime);
      const bkEnd = new Date(bk.scheduledEndTime);
      if (bkStart < bookingEndBuffered && bkEnd > bookingStartBuffered) {
        return {
          available: false,
          reason: `Staff member has another appointment (${bk.bookingNumber || "Booked"}) with required travel buffer`,
        };
      }
    }
  }

  return { available: true };
}

/**
 * Automatic Staff Assignment Engine
 * Finds the best active, qualified, and available staff member for a booking.
 * Excludes any staff specified in `excludeStaffIds` (e.g. staff who already rejected this booking).
 */
export async function findBestEligibleStaff({
  serviceIds,
  scheduledDate,
  startTime,
  endTime,
  excludeStaffIds = [],
  bufferMinutes = DEFAULT_BUFFER_MINS,
  excludeBookingId = null,
}) {
  // 1. Fetch full service details to check category and id qualifications
  const fullServices = await Service.find({ _id: { $in: serviceIds } }).lean();
  if (fullServices.length === 0) {
    return { error: "No valid services specified for assignment" };
  }

  // 2. Fetch all active staff
  const staffQuery = { isActive: true };
  if (excludeStaffIds && excludeStaffIds.length > 0) {
    staffQuery._id = { $nin: excludeStaffIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const allActiveStaff = await Staff.find(staffQuery);

  // 3. Filter for qualified staff (must be qualified for ALL services in the booking)
  const qualifiedStaff = allActiveStaff.filter((st) =>
    isStaffQualifiedForServices(st, fullServices)
  );

  if (qualifiedStaff.length === 0) {
    return {
      success: false,
      noQualifiedStaff: true,
      message: "No active staff member is qualified for all selected services.",
      candidateCount: 0,
    };
  }

  // 4. Check schedule, leave, breaks, and existing bookings for each qualified staff
  const eligibleCandidates = [];

  for (const st of qualifiedStaff) {
    const check = await isStaffAvailableForSlot({
      staff: st,
      scheduledDate,
      startTime,
      endTime,
      bufferMinutes,
      excludeBookingId,
    });

    if (check.available) {
      eligibleCandidates.push(st);
    }
  }

  if (eligibleCandidates.length === 0) {
    return {
      success: false,
      noStaffAvailable: true,
      message: "All qualified staff members are currently occupied, on leave, or off-duty for this time slot.",
      candidateCount: qualifiedStaff.length,
    };
  }

  // 5. Select best candidate using fair load-balancing (least appointments on scheduled date)
  const candidateIds = eligibleCandidates.map((c) => c._id);
  const dayStart = createUAEDate(scheduledDate, "00:00");
  const dayEnd = createUAEDate(scheduledDate, "23:59");

  const appointmentCounts = await Booking.aggregate([
    {
      $match: {
        assignedStaff: { $in: candidateIds },
        scheduledStartTime: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ["pending", "confirmed"] },
      },
    },
    {
      $group: {
        _id: "$assignedStaff",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map();
  appointmentCounts.forEach((ac) => countMap.set(ac._id.toString(), ac.count));

  // Sort candidates by count ascending (least busy first)
  eligibleCandidates.sort((a, b) => {
    const countA = countMap.get(a._id.toString()) || 0;
    const countB = countMap.get(b._id.toString()) || 0;
    return countA - countB;
  });

  const selectedStaff = eligibleCandidates[0];

  return {
    success: true,
    staff: selectedStaff,
    candidateCount: eligibleCandidates.length,
  };
}

/**
 * Generate alternative available slots on a given date for the requested services
 * when the desired slot is unavailable.
 */
export async function getAlternativeSlots({
  serviceIds,
  scheduledDate,
  totalDurationMinutes,
  bufferMinutes = DEFAULT_BUFFER_MINS,
}) {
  const config = await getFleetConfig();
  const workStart = parseTimeToMinutes(config.workingHours?.start || "09:00");
  const workEnd = parseTimeToMinutes(config.workingHours?.end || "21:00");
  const interval = config.slotIntervalMinutes || 30;

  const fullServices = await Service.find({ _id: { $in: serviceIds } }).lean();
  const allActiveStaff = await Staff.find({ isActive: true });
  const qualifiedStaff = allActiveStaff.filter((st) =>
    isStaffQualifiedForServices(st, fullServices)
  );

  if (qualifiedStaff.length === 0) {
    return [];
  }

  const alternatives = [];
  const now = new Date();
  const leadTimeMs = (config.leadTimeHours || 2) * 3600 * 1000;

  for (
    let curMin = workStart;
    curMin + totalDurationMinutes <= workEnd;
    curMin += interval
  ) {
    const timeStr = formatMinutesToTime(curMin);
    const endTimeStr = formatMinutesToTime(curMin + totalDurationMinutes);
    const slotStart = createUAEDate(scheduledDate, timeStr);
    const slotEnd = createUAEDate(scheduledDate, endTimeStr);

    if (slotStart.getTime() - now.getTime() < leadTimeMs) {
      continue;
    }

    // Check if at least one qualified staff is free
    let hasAvailableStaff = false;
    for (const st of qualifiedStaff) {
      const check = await isStaffAvailableForSlot({
        staff: st,
        scheduledDate,
        startTime: slotStart,
        endTime: slotEnd,
        bufferMinutes,
      });
      if (check.available) {
        hasAvailableStaff = true;
        break;
      }
    }

    if (hasAvailableStaff) {
      alternatives.push({
        time: timeStr,
        endTime: endTimeStr,
        startTime: slotStart.toISOString(),
      });
    }

    if (alternatives.length >= 6) break; // Return top 6 alternative slots
  }

  return alternatives;
}

/**
 * Reassignment Workflow when staff rejects a booking:
 * 1. Log rejection in booking history.
 * 2. Attempt to find another qualified active staff member.
 * 3. If found: reassign and set status to 'assigned'.
 * 4. If none found: mark as 'admin_attention' and flag for admin.
 */
export async function handleStaffRejection({
  bookingId,
  staffId,
  reason = "Unavailable / Emergency",
}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  const staff = await Staff.findById(staffId);
  const staffName = staff ? staff.name : "Staff";

  // Record rejection in history
  booking.assignmentHistory.push({
    staffId,
    staffName,
    action: "rejected",
    reason,
    performedBy: `staff:${staffName}`,
    timestamp: new Date(),
  });
  booking.staffRejectionReason = reason;

  // Collect all staff who have already rejected this booking to prevent assigning back to them
  const rejectedStaffIds = [staffId.toString()];
  booking.assignmentHistory.forEach((h) => {
    if (h.action === "rejected" && h.staffId) {
      rejectedStaffIds.push(h.staffId.toString());
    }
  });

  const serviceIds = booking.services.map((s) => s.serviceId);

  // Attempt reassignment
  const reassignmentResult = await findBestEligibleStaff({
    serviceIds,
    scheduledDate: booking.scheduledDate,
    startTime: booking.scheduledStartTime,
    endTime: booking.scheduledEndTime,
    excludeStaffIds: rejectedStaffIds,
    bufferMinutes: booking.travelBufferMinutes || DEFAULT_BUFFER_MINS,
    excludeBookingId: booking._id,
  });

  if (reassignmentResult.success && reassignmentResult.staff) {
    const newStaff = reassignmentResult.staff;
    booking.assignedStaff = newStaff._id;
    booking.staffAssignmentStatus = "assigned";
    booking.flaggedForAdmin = false;

    booking.assignmentHistory.push({
      staffId: newStaff._id,
      staffName: newStaff.name,
      action: "reassigned",
      reason: `Auto-reassigned to ${newStaff.name} after rejection by ${staffName} (${reason})`,
      performedBy: "system",
      timestamp: new Date(),
    });

    await booking.save();

    return {
      success: true,
      reassigned: true,
      newStaff: {
        _id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
      },
      booking,
    };
  } else {
    // Reassignment failed: Flag for admin action
    booking.assignedStaff = null;
    booking.staffAssignmentStatus = "admin_attention";
    booking.flaggedForAdmin = true;

    booking.assignmentHistory.push({
      staffId: null,
      staffName: "",
      action: "flagged_admin",
      reason: `Reassignment failed after rejection by ${staffName}: ${reassignmentResult.message || "No alternative qualified staff available"}`,
      performedBy: "system",
      timestamp: new Date(),
    });

    await booking.save();

    return {
      success: true,
      reassigned: false,
      flaggedForAdmin: true,
      message: "No other staff available. Booking has been flagged for admin attention.",
      booking,
    };
  }
}
