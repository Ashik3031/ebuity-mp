import mongoose from "mongoose";
import crypto from "crypto";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/StaffAttendance.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import {
  findBestEligibleStaff,
  isStaffQualifiedForServices,
  isStaffAvailableForSlot,
  parseTimeToMinutes,
  createUAEDate,
} from "../services/staffAssignmentService.js";
import { broadcastBookingUpdated } from "../services/realtimeService.js";

// ==========================================
// Schedule & Break Validation Helper
// ==========================================
export function validateWorkingSchedule(workingHours, breaks) {
  if (workingHours) {
    const { start, end } = workingHours;
    if (!start || !end) {
      return { valid: false, message: "Shift start and end times are required." };
    }
    const startMins = parseTimeToMinutes(start);
    const endMins = parseTimeToMinutes(end);
    if (startMins >= endMins) {
      return {
        valid: false,
        message: `Invalid shift: start time (${start}) must be before end time (${end}).`,
      };
    }

    if (Array.isArray(breaks)) {
      // Sort breaks by start time
      const sortedBreaks = [...breaks].sort(
        (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
      );

      for (let i = 0; i < sortedBreaks.length; i++) {
        const brk = sortedBreaks[i];
        const bStart = parseTimeToMinutes(brk.start);
        const bEnd = parseTimeToMinutes(brk.end);

        if (bStart >= bEnd) {
          return {
            valid: false,
            message: `Invalid break "${brk.label || i + 1}": start (${brk.start}) must be before end (${brk.end}).`,
          };
        }

        if (bStart < startMins || bEnd > endMins) {
          return {
            valid: false,
            message: `Break "${brk.label || i + 1}" (${brk.start} - ${brk.end}) falls outside working hours (${start} - ${end}).`,
          };
        }

        // Check overlap with next break
        if (i < sortedBreaks.length - 1) {
          const nextBrk = sortedBreaks[i + 1];
          const nextStart = parseTimeToMinutes(nextBrk.start);
          if (bEnd > nextStart) {
            return {
              valid: false,
              message: `Overlapping breaks detected: "${brk.label || "Break"}" ends at ${brk.end} but "${nextBrk.label || "Break"}" starts at ${nextBrk.start}.`,
            };
          }
        }
      }
    }
  }

  return { valid: true };
}

// Helper: Auto-generate unique Employee ID
async function generateUniqueEmployeeId() {
  let unique = false;
  let candidate = "";
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    candidate = `RE-EMP-${randomNum}`;
    const exists = await Staff.findOne({ employeeId: candidate });
    if (!exists) unique = true;
  }
  return candidate;
}

// ==========================================
// 1. Staff Directory & CRUD
// ==========================================
export const getAllStaff = async (req, res) => {
  try {
    const {
      search,
      status,
      employmentStatus,
      categoryId,
      serviceId,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    if (employmentStatus && employmentStatus !== "all") {
      query.employmentStatus = employmentStatus;
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.categoryIds = categoryId;
    }
    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      query.serviceIds = serviceId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { employeeId: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Staff.countDocuments(query);
    const staffList = await Staff.find(query)
      .populate("categoryIds", "name slug")
      .populate("serviceIds", "name price durationMinutes slug")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      count: staffList.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      staff: staffList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load staff list",
      error: error.message,
    });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id)
      .populate("categoryIds", "name slug")
      .populate("serviceIds", "name price durationMinutes slug")
      .select("-password");

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    // Get stats
    const totalAssigned = await Booking.countDocuments({ assignedStaff: staff._id });
    const completed = await Booking.countDocuments({
      assignedStaff: staff._id,
      status: "completed",
    });

    return res.status(200).json({
      success: true,
      staff,
      stats: {
        totalAssigned,
        completed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff details",
      error: error.message,
    });
  }
};

export const createStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      employeeId,
      joiningDate,
      employmentStatus,
      password,
      profileImage,
      categoryIds,
      serviceIds,
      workingHours,
      breaks,
      weeklyOffDays,
      holidays,
      scheduleExceptions,
      baseZone,
      notes,
      sendInvitation = false,
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone number are required.",
      });
    }

    // Check duplicate email
    const existingEmail = await Staff.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `A staff profile with email "${email.trim()}" already exists.`,
      });
    }

    // Check duplicate employee ID or auto-generate
    let finalEmpId = (employeeId || "").trim().toUpperCase();
    if (finalEmpId) {
      const existingEmpId = await Staff.findOne({ employeeId: finalEmpId });
      if (existingEmpId) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${finalEmpId}" is already assigned to another staff member.`,
        });
      }
    } else {
      finalEmpId = await generateUniqueEmployeeId();
    }

    // Validate shift and break integrity
    const scheduleVal = validateWorkingSchedule(workingHours, breaks);
    if (!scheduleVal.valid) {
      return res.status(400).json({
        success: false,
        message: scheduleVal.message,
      });
    }

    // Prepare password or secure invitation token
    let finalPassword = password;
    let invitationToken = null;
    let invitationExpires = null;
    let invitationStatus = "accepted";

    if (!finalPassword || sendInvitation) {
      invitationToken = crypto.randomBytes(32).toString("hex");
      invitationExpires = new Date(Date.now() + 48 * 3600 * 1000); // 48h validity
      invitationStatus = "pending";
      // Use temporary random password if none provided
      finalPassword = finalPassword || crypto.randomBytes(16).toString("hex") + "A1!";
    }

    const staff = new Staff({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      employeeId: finalEmpId,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentStatus: employmentStatus || "full-time",
      password: finalPassword, // Pre-save hook will hash this
      profileImage: profileImage || "",
      categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
      serviceIds: Array.isArray(serviceIds) ? serviceIds : [],
      workingHours: workingHours || { start: "09:00", end: "21:00" },
      breaks: Array.isArray(breaks) ? breaks : [],
      weeklyOffDays: Array.isArray(weeklyOffDays) ? weeklyOffDays : [5],
      holidays: Array.isArray(holidays) ? holidays : [],
      scheduleExceptions: Array.isArray(scheduleExceptions) ? scheduleExceptions : [],
      baseZone: baseZone || null,
      notes: notes || "",
      isActive: true,
      invitationToken,
      invitationExpires,
      invitationStatus,
    });

    await staff.save();

    const result = await Staff.findById(staff._id)
      .populate("categoryIds", "name")
      .populate("serviceIds", "name")
      .select("-password");

    const invitationUrl = invitationToken
      ? `/staff/setup-password?token=${invitationToken}`
      : null;

    return res.status(201).json({
      success: true,
      message: `Staff profile for ${result.name} (${result.employeeId}) created successfully!`,
      staff: result,
      invitationUrl,
      invitationToken,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `Duplicate conflict: A staff member already exists with that ${field}.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create staff profile",
      error: error.message,
    });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      employeeId,
      joiningDate,
      employmentStatus,
      password,
      profileImage,
      categoryIds,
      serviceIds,
      workingHours,
      breaks,
      weeklyOffDays,
      holidays,
      scheduleExceptions,
      baseZone,
      notes,
      isActive,
    } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    // Check email uniqueness if changing
    if (email && email.toLowerCase().trim() !== staff.email) {
      const conflict = await Staff.findOne({
        _id: { $ne: staff._id },
        email: email.toLowerCase().trim(),
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Email "${email.trim()}" is already used by another staff member.`,
        });
      }
      staff.email = email.toLowerCase().trim();
    }

    // Check employeeId uniqueness if changing
    if (employeeId && employeeId.trim().toUpperCase() !== staff.employeeId) {
      const normalized = employeeId.trim().toUpperCase();
      const conflict = await Staff.findOne({
        _id: { $ne: staff._id },
        employeeId: normalized,
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${normalized}" is already in use by another staff member.`,
        });
      }
      staff.employeeId = normalized;
    }

    // Validate schedule if either workingHours or breaks are changing
    if (workingHours || breaks) {
      const hoursToValidate = workingHours || staff.workingHours;
      const breaksToValidate = breaks || staff.breaks;
      const val = validateWorkingSchedule(hoursToValidate, breaksToValidate);
      if (!val.valid) {
        return res.status(400).json({
          success: false,
          message: val.message,
        });
      }
    }

    if (name) staff.name = name.trim();
    if (phone) staff.phone = phone.trim();
    if (joiningDate) staff.joiningDate = new Date(joiningDate);
    if (employmentStatus) staff.employmentStatus = employmentStatus;
    if (password && password.trim()) {
      staff.password = password.trim(); // Will be hashed by pre-save
    }
    if (profileImage !== undefined) staff.profileImage = profileImage;
    if (Array.isArray(categoryIds)) staff.categoryIds = categoryIds;
    if (Array.isArray(serviceIds)) staff.serviceIds = serviceIds;
    if (workingHours) staff.workingHours = workingHours;
    if (Array.isArray(breaks)) staff.breaks = breaks;
    if (Array.isArray(weeklyOffDays)) staff.weeklyOffDays = weeklyOffDays;
    if (Array.isArray(holidays)) staff.holidays = holidays;
    if (Array.isArray(scheduleExceptions)) staff.scheduleExceptions = scheduleExceptions;
    if (baseZone !== undefined) staff.baseZone = baseZone || null;
    if (notes !== undefined) staff.notes = notes;
    if (isActive !== undefined) staff.isActive = Boolean(isActive);

    await staff.save();

    const updated = await Staff.findById(staff._id)
      .populate("categoryIds", "name slug")
      .populate("serviceIds", "name price durationMinutes slug")
      .select("-password");

    return res.status(200).json({
      success: true,
      message: "Staff profile updated successfully!",
      staff: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `Duplicate conflict on ${field}. Another profile already uses this value.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update staff profile",
      error: error.message,
    });
  }
};

export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    staff.isActive = isActive !== undefined ? Boolean(isActive) : !staff.isActive;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: `Staff member ${staff.name} has been ${staff.isActive ? "activated" : "deactivated"} successfully.`,
      staff: {
        _id: staff._id,
        name: staff.name,
        employeeId: staff.employeeId,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle staff status",
      error: error.message,
    });
  }
};

// ==========================================
// 1b. Staff Account Invitation & Security
// ==========================================
export const inviteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const invitationToken = crypto.randomBytes(32).toString("hex");
    staff.invitationToken = invitationToken;
    staff.invitationExpires = new Date(Date.now() + 48 * 3600 * 1000);
    staff.invitationStatus = "pending";
    await staff.save();

    const invitationUrl = `/staff/setup-password?token=${invitationToken}`;

    return res.status(200).json({
      success: true,
      message: `Invitation generated for ${staff.name}`,
      invitationUrl,
      invitationToken,
      expiresAt: staff.invitationExpires,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate staff invitation",
      error: error.message,
    });
  }
};

// ==========================================
// 1c. Working Schedules Configuration
// ==========================================
export const updateStaffSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      workingHours,
      breaks,
      weeklyOffDays,
      holidays,
      scheduleExceptions,
    } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const hoursToValidate = workingHours || staff.workingHours;
    const breaksToValidate = breaks !== undefined ? breaks : staff.breaks;

    const val = validateWorkingSchedule(hoursToValidate, breaksToValidate);
    if (!val.valid) {
      return res.status(400).json({
        success: false,
        message: val.message,
      });
    }

    if (workingHours) staff.workingHours = workingHours;
    if (Array.isArray(breaks)) staff.breaks = breaks;
    if (Array.isArray(weeklyOffDays)) staff.weeklyOffDays = weeklyOffDays;
    if (Array.isArray(holidays)) staff.holidays = holidays;
    if (Array.isArray(scheduleExceptions)) staff.scheduleExceptions = scheduleExceptions;

    await staff.save();

    return res.status(200).json({
      success: true,
      message: `Schedule configuration for ${staff.name} updated successfully!`,
      schedule: {
        workingHours: staff.workingHours,
        breaks: staff.breaks,
        weeklyOffDays: staff.weeklyOffDays,
        holidays: staff.holidays,
        scheduleExceptions: staff.scheduleExceptions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update staff schedule",
      error: error.message,
    });
  }
};

// ==========================================
// 2. Leave Management & Approvals
// ==========================================
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const staffMembers = await Staff.find({ "leaves.0": { $exists: true } })
      .select("_id name email phone profileImage leaves")
      .lean();

    const allLeaves = [];
    for (const member of staffMembers) {
      for (const leave of member.leaves || []) {
        if (!status || status === "all" || leave.status === status) {
          allLeaves.push({
            ...leave,
            staffId: member._id,
            staffName: member.name,
            staffEmail: member.email,
            staffPhone: member.phone,
            staffImage: member.profileImage,
          });
        }
      }
    }

    allLeaves.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return res.status(200).json({
      success: true,
      count: allLeaves.length,
      leaves: allLeaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve leave requests",
      error: error.message,
    });
  }
};

export const reviewLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, reviewNotes } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved' or 'rejected'.",
      });
    }

    const staff = await Staff.findOne({ "leaves._id": leaveId });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Leave request not found." });
    }

    const targetLeave = staff.leaves.id(leaveId);
    if (!targetLeave) {
      return res.status(404).json({ success: false, message: "Leave request not found." });
    }

    targetLeave.status = status;
    targetLeave.reviewedAt = new Date();
    targetLeave.reviewedBy = req.admin?._id || null;
    targetLeave.reviewNotes = reviewNotes || "";

    await staff.save();

    return res.status(200).json({
      success: true,
      message: `Leave request has been ${status}.`,
      leave: targetLeave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to review leave request",
      error: error.message,
    });
  }
};

// ==========================================
// 3. Staff Schedules Overview
// ==========================================
export const getStaffSchedules = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const staffList = await Staff.find({ isActive: true })
      .populate("categoryIds", "name")
      .populate("serviceIds", "name")
      .select("-password")
      .lean();

    const bookings = await Booking.find({
      scheduledDate: targetDate,
      status: { $in: ["pending", "confirmed", "completed"] },
    })
      .select(
        "bookingNumber customerDetails services totalDurationMinutes scheduledStartTime scheduledEndTime status staffAssignmentStatus assignedStaff serviceAddress"
      )
      .lean();

    const attendanceRecords = await StaffAttendance.find({ date: targetDate }).lean();
    const attendanceMap = new Map();
    attendanceRecords.forEach((a) => attendanceMap.set(a.staff.toString(), a));

    const bookingMap = new Map();
    bookings.forEach((bk) => {
      if (bk.assignedStaff) {
        const sid = bk.assignedStaff.toString();
        if (!bookingMap.has(sid)) bookingMap.set(sid, []);
        bookingMap.get(sid).push(bk);
      }
    });

    const schedules = staffList.map((st) => {
      const stId = st._id.toString();
      const staffBookings = bookingMap.get(stId) || [];
      const attendance = attendanceMap.get(stId) || null;

      // Check if on leave
      const isOnLeave = (st.leaves || []).some((l) => {
        if (l.status !== "approved") return false;
        const s = new Date(l.startDate).toISOString().split("T")[0];
        const e = new Date(l.endDate).toISOString().split("T")[0];
        return targetDate >= s && targetDate <= e;
      });

      return {
        staff: st,
        workingHours: st.workingHours,
        breaks: st.breaks,
        weeklyOffDays: st.weeklyOffDays,
        isOnLeave,
        attendance,
        bookingsCount: staffBookings.length,
        bookings: staffBookings,
      };
    });

    return res.status(200).json({
      success: true,
      date: targetDate,
      schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules",
      error: error.message,
    });
  }
};

// ==========================================
// 4. Assignments & Reassignment Oversight
// ==========================================
export const getStaffAssignments = async (req, res) => {
  try {
    const { status, flagged, date } = req.query;
    const query = {};

    if (flagged === "true") query.flaggedForAdmin = true;
    if (status && status !== "all") query.staffAssignmentStatus = status;
    if (date) query.scheduledDate = date;

    const bookings = await Booking.find(query)
      .populate("assignedStaff", "name email phone profileImage")
      .populate("customer", "name email phone")
      .sort({ scheduledStartTime: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignments",
      error: error.message,
    });
  }
};

export const reassignBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { staffId, reason = "Admin manual reassignment" } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    let newStaff = null;

    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
      // Manual Reassignment to specific staff
      newStaff = await Staff.findById(staffId);
      if (!newStaff) {
        return res.status(404).json({ success: false, message: "Selected staff member not found" });
      }

      // Check qualifications
      const serviceIds = booking.services.map((s) => s.serviceId);
      const fullServices = await Service.find({ _id: { $in: serviceIds } }).lean();
      const isQualified = isStaffQualifiedForServices(newStaff, fullServices);

      if (!isQualified) {
        return res.status(400).json({
          success: false,
          message: `Staff member ${newStaff.name} is not qualified for all services in this booking.`,
        });
      }

      // Check availability warning
      const availCheck = await isStaffAvailableForSlot({
        staff: newStaff,
        scheduledDate: booking.scheduledDate,
        startTime: booking.scheduledStartTime,
        endTime: booking.scheduledEndTime,
        bufferMinutes: booking.travelBufferMinutes || 30,
        excludeBookingId: booking._id,
      });

      if (!availCheck.available) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: `Staff schedule conflict: ${availCheck.reason}`,
        });
      }
    } else {
      // Auto-reassign to next best eligible staff
      const serviceIds = booking.services.map((s) => s.serviceId);
      const autoResult = await findBestEligibleStaff({
        serviceIds,
        scheduledDate: booking.scheduledDate,
        startTime: booking.scheduledStartTime,
        endTime: booking.scheduledEndTime,
        bufferMinutes: booking.travelBufferMinutes || 30,
        excludeBookingId: booking._id,
      });

      if (!autoResult.success || !autoResult.staff) {
        return res.status(409).json({
          success: false,
          message: autoResult.message || "No eligible staff available for automatic reassignment.",
        });
      }
      newStaff = autoResult.staff;
    }

    const previousStaffId = booking.assignedStaff;
    booking.assignedStaff = newStaff._id;
    booking.staffAssignmentStatus = "assigned";
    booking.flaggedForAdmin = false;

    booking.assignmentHistory.push({
      staffId: newStaff._id,
      staffName: newStaff.name,
      action: "reassigned",
      reason: `${reason} (Previous staff: ${previousStaffId || "none"})`,
      performedBy: `admin:${req.admin?.email || "Admin"}`,
      timestamp: new Date(),
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate("assignedStaff", "name email phone profileImage")
      .lean();

    // Broadcast reassignment to Admin and affected Staff in real time
    broadcastBookingUpdated(populated, { action: "reassigned" });

    return res.status(200).json({
      success: true,
      message: `Booking successfully reassigned to ${newStaff.name}!`,
      booking: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reassign booking",
      error: error.message,
    });
  }
};

// ==========================================
// 5. Attendance Oversight
// ==========================================
export const getAllStaffAttendance = async (req, res) => {
  try {
    const { date, staffId } = req.query;
    const query = {};

    if (date) query.date = date;
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) query.staff = staffId;

    const records = await StaffAttendance.find(query)
      .populate("staff", "name email phone profileImage")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance records",
      error: error.message,
    });
  }
};

export const correctAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status, notes, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A mandatory correction reason is required for the audit trail.",
      });
    }

    const attendance = await StaffAttendance.findById(id).populate(
      "staff",
      "name email employeeId"
    );
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const prevValues = {
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      notes: attendance.notes,
    };

    const newCheckIn = checkIn !== undefined ? (checkIn ? new Date(checkIn) : null) : attendance.checkIn;
    const newCheckOut = checkOut !== undefined ? (checkOut ? new Date(checkOut) : null) : attendance.checkOut;

    if (newCheckIn && newCheckOut && newCheckOut < newCheckIn) {
      return res.status(400).json({
        success: false,
        message: "Invalid timestamps: check-out time cannot be earlier than check-in time.",
      });
    }

    attendance.checkIn = newCheckIn;
    attendance.checkOut = newCheckOut;
    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;

    attendance.isCorrected = true;
    attendance.correctionReason = reason.trim();
    attendance.correctedBy = req.admin?._id || null;

    if (!Array.isArray(attendance.auditTrail)) {
      attendance.auditTrail = [];
    }

    attendance.auditTrail.push({
      action: "corrected",
      modifiedBy: req.admin?.email || "Admin",
      adminId: req.admin?._id || null,
      previousValues: prevValues,
      newValues: {
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        notes: attendance.notes,
      },
      reason: reason.trim(),
      timestamp: new Date(),
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Attendance record successfully updated and logged in the audit trail.",
      record: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to correct attendance record",
      error: error.message,
    });
  }
};

export const manualAttendanceRecord = async (req, res) => {
  try {
    const {
      staffId,
      date,
      checkIn,
      checkOut,
      status = "present",
      notes = "",
      reason = "Manual record created by administrator",
    } = req.body;

    if (!staffId || !date) {
      return res.status(400).json({
        success: false,
        message: "Staff member ID and date (YYYY-MM-DD) are required.",
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    // Check if attendance already exists for this staff on this date
    const existing = await StaffAttendance.findOne({ staff: staffId, date });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An attendance record already exists for ${staff.name} on ${date}. Please edit the existing record.`,
      });
    }

    const cIn = checkIn ? new Date(checkIn) : null;
    const cOut = checkOut ? new Date(checkOut) : null;

    if (cIn && cOut && cOut < cIn) {
      return res.status(400).json({
        success: false,
        message: "Check-out time cannot be earlier than check-in time.",
      });
    }

    const newRecord = new StaffAttendance({
      staff: staffId,
      date,
      checkIn: cIn,
      checkOut: cOut,
      status,
      notes,
      isCorrected: true,
      correctionReason: reason,
      correctedBy: req.admin?._id || null,
      auditTrail: [
        {
          action: "manual_create",
          modifiedBy: req.admin?.email || "Admin",
          adminId: req.admin?._id || null,
          previousValues: null,
          newValues: { checkIn: cIn, checkOut: cOut, status, notes },
          reason,
          timestamp: new Date(),
        },
      ],
    });

    await newRecord.save();

    const populated = await StaffAttendance.findById(newRecord._id).populate(
      "staff",
      "name email employeeId profileImage"
    );

    return res.status(201).json({
      success: true,
      message: `Attendance record successfully logged for ${staff.name}.`,
      record: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create attendance record",
      error: error.message,
    });
  }
};

// ==========================================
// 6. Booking & Availability Integration Helper
// ==========================================
export const getEligibleStaff = async (req, res) => {
  try {
    const { date, startTime, duration = 60, serviceIds } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date (YYYY-MM-DD) is required.",
      });
    }

    const targetTimeStr = startTime || "10:00";
    const durMins = parseInt(duration, 10) || 60;

    const slotStart = createUAEDate(date, targetTimeStr);
    const slotEnd = new Date(slotStart.getTime() + durMins * 60000);

    const srvIdList = serviceIds
      ? String(serviceIds)
          .split(",")
          .map((s) => s.trim())
          .filter((s) => mongoose.Types.ObjectId.isValid(s))
      : [];

    let fullServices = [];
    if (srvIdList.length > 0) {
      fullServices = await Service.find({ _id: { $in: srvIdList } }).lean();
    }

    const allStaff = await Staff.find({ isActive: true })
      .populate("categoryIds", "name")
      .populate("serviceIds", "name")
      .select("-password")
      .lean();

    const eligible = [];
    const excluded = [];

    for (const st of allStaff) {
      // 1. Skill check
      if (fullServices.length > 0) {
        const isQualified = isStaffQualifiedForServices(st, fullServices);
        if (!isQualified) {
          excluded.push({
            staff: st,
            reason: "Not qualified for all requested services",
          });
          continue;
        }
      }

      // 2. Availability check
      const availCheck = await isStaffAvailableForSlot({
        staff: st,
        scheduledDate: date,
        startTime: slotStart,
        endTime: slotEnd,
        bufferMinutes: 30,
      });

      if (availCheck.available) {
        eligible.push(st);
      } else {
        excluded.push({
          staff: st,
          reason: availCheck.reason,
        });
      }
    }

    return res.status(200).json({
      success: true,
      date,
      startTime: targetTimeStr,
      durationMinutes: durMins,
      eligibleStaffCount: eligible.length,
      eligibleStaff: eligible,
      excludedStaffCount: excluded.length,
      excludedStaff: excluded,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate staff eligibility",
      error: error.message,
    });
  }
};
