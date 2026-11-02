import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/StaffAttendance.js";
import Booking from "../models/Booking.js";
import {
  handleStaffRejection,
  createUAEDate,
} from "../services/staffAssignmentService.js";
import { notifyJobStatusChange } from "../services/notificationService.js";
import { validateWorkingSchedule } from "./adminStaffController.js";
import {
  broadcastBookingUpdated,
  broadcastStaffUpdated,
} from "../services/realtimeService.js";

// Helper: Get UAE current date string YYYY-MM-DD
function getUAETodayDateStr() {
  const now = new Date();
  // UAE is UTC+4
  const uaeDate = new Date(now.getTime() + 4 * 3600 * 1000);
  return uaeDate.toISOString().split("T")[0];
}

// ==========================================
// 1. Staff Authentication
// ==========================================
export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase().trim() });
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await staff.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your staff account has been deactivated. Please contact your manager.",
      });
    }

    const token = jwt.sign(
      { id: staff._id, role: "staff", email: staff.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("staff_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${staff.name}!`,
      token,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        profileImage: staff.profileImage,
        role: staff.role,
        workingHours: staff.workingHours,
        breaks: staff.breaks,
        weeklyOffDays: staff.weeklyOffDays,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Staff login failed",
      error: error.message,
    });
  }
};

export const logoutStaff = async (req, res) => {
  try {
    res.clearCookie("staff_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

export const setupStaffPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Invitation token and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const staff = await Staff.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() },
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation link. Please request a new invitation from your administrator.",
      });
    }

    staff.password = newPassword; // Pre-save will hash
    staff.invitationToken = null;
    staff.invitationExpires = null;
    staff.invitationStatus = "accepted";
    staff.isActive = true;

    await staff.save();

    const authToken = jwt.sign(
      { id: staff._id, role: "staff", email: staff.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("staff_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Password configured successfully! Welcome to the Rose Essence Staff Portal.",
      token: authToken,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        employeeId: staff.employeeId,
        phone: staff.phone,
        profileImage: staff.profileImage,
        role: staff.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to setup password",
      error: error.message,
    });
  }
};

export const getStaffProfile = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff._id)
      .populate("categoryIds", "name slug")
      .populate("serviceIds", "name price durationMinutes slug")
      .select("-password");

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load staff profile",
      error: error.message,
    });
  }
};

// ==========================================
// 2. Staff Dashboard Summary
// ==========================================
export const getStaffDashboardSummary = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const todayStr = getUAETodayDateStr();
    const now = new Date();

    // Today's jobs
    const todayBookings = await Booking.find({
      assignedStaff: staffId,
      scheduledDate: todayStr,
      status: { $in: ["pending", "confirmed", "completed"] },
    }).sort({ scheduledStartTime: 1 });

    // Upcoming jobs (today or future dates)
    const upcomingCount = await Booking.countDocuments({
      assignedStaff: staffId,
      scheduledDate: { $gte: todayStr },
      status: { $in: ["pending", "confirmed"] },
      staffAssignmentStatus: { $nin: ["rejected", "cancelled"] },
    });

    // Completed count
    const completedCount = await Booking.countDocuments({
      assignedStaff: staffId,
      status: "completed",
    });

    // Today's attendance
    const attendanceToday = await StaffAttendance.findOne({
      staff: staffId,
      date: todayStr,
    });

    return res.status(200).json({
      success: true,
      summary: {
        todayDate: todayStr,
        todayJobsCount: todayBookings.length,
        upcomingJobsCount: upcomingCount,
        completedJobsCount: completedCount,
        attendanceToday: attendanceToday || null,
        todayBookings,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
      error: error.message,
    });
  }
};

// ==========================================
// 3. Staff Bookings List & Details
// ==========================================
export const getStaffBookings = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { filter = "all", status } = req.query;
    const todayStr = getUAETodayDateStr();

    const query = { assignedStaff: staffId };

    if (filter === "today") {
      query.scheduledDate = todayStr;
    } else if (filter === "upcoming") {
      query.scheduledDate = { $gte: todayStr };
      query.status = { $in: ["pending", "confirmed"] };
    } else if (filter === "completed") {
      query.status = "completed";
    }

    if (status && status !== "all") {
      query.staffAssignmentStatus = status;
    }

    const bookings = await Booking.find(query)
      .sort({ scheduledStartTime: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
      error: error.message,
    });
  }
};

export const getStaffBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;

    let query = { assignedStaff: staffId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.bookingNumber = id.toUpperCase();
    }

    const booking = await Booking.findOne(query).lean();
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Job assignment not found or you are not authorized to view it.",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve job details",
      error: error.message,
    });
  }
};

// ==========================================
// 4. Job Actions: Accept & Reject Assignments
// ==========================================
export const acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;

    const booking = await Booking.findOne({
      _id: id,
      assignedStaff: staffId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Assigned job not found.",
      });
    }

    if (booking.staffAssignmentStatus === "accepted") {
      return res.status(200).json({
        success: true,
        message: "Assignment is already accepted.",
        booking,
      });
    }

    booking.staffAssignmentStatus = "accepted";
    booking.assignmentHistory.push({
      staffId: req.staff._id,
      staffName: req.staff.name,
      action: "accepted",
      reason: "Staff confirmed acceptance of appointment",
      performedBy: `staff:${req.staff.name}`,
      timestamp: new Date(),
    });

    await booking.save();

    // Real-time broadcast to Admin & Staff
    broadcastBookingUpdated(booking, { action: "accepted", staffName: req.staff.name });

    return res.status(200).json({
      success: true,
      message: "Assignment accepted successfully!",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to accept assignment",
      error: error.message,
    });
  }
};

export const rejectAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A specific rejection reason is required.",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      assignedStaff: staffId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Assigned job not found.",
      });
    }

    // Trigger rejection workflow and auto-reassignment
    const result = await handleStaffRejection({
      bookingId: booking._id,
      staffId: req.staff._id,
      reason: reason.trim(),
    });

    // Real-time broadcast rejection to Admin & Staff
    broadcastBookingUpdated(booking, { action: "rejected", result });

    return res.status(200).json({
      success: true,
      message: result.reassigned
        ? `Assignment rejected. Booking was successfully auto-reassigned to ${result.newStaff.name}.`
        : "Assignment rejected. No replacement staff was available, so the booking has been flagged for admin attention.",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process rejection",
      error: error.message,
    });
  }
};

// ==========================================
// 5. Job Status Tracking: On The Way, Arrived, In Progress, Completed
// ==========================================
export const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id;
    const { status } = req.body;

    const validStatuses = ["on_the_way", "arrived", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'on_the_way', 'arrived', 'in_progress', or 'completed'.",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      assignedStaff: staffId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Assigned job not found.",
      });
    }

    booking.staffAssignmentStatus = status;

    if (!booking.serviceTracking) {
      booking.serviceTracking = {};
    }

    const now = new Date();
    if (status === "on_the_way") {
      booking.serviceTracking.onTheWayAt = now;
      booking.assignmentHistory.push({
        staffId: req.staff._id,
        staffName: req.staff.name,
        action: "status_update",
        reason: "Staff is on the way to client location",
        performedBy: `staff:${req.staff.name}`,
        timestamp: now,
      });
    } else if (status === "arrived") {
      booking.serviceTracking.arrivedAt = now;
      booking.assignmentHistory.push({
        staffId: req.staff._id,
        staffName: req.staff.name,
        action: "status_update",
        reason: "Staff arrived at client location",
        performedBy: `staff:${req.staff.name}`,
        timestamp: now,
      });
    } else if (status === "in_progress") {
      booking.serviceTracking.startedAt = now;
      booking.assignmentHistory.push({
        staffId: req.staff._id,
        staffName: req.staff.name,
        action: "status_update",
        reason: "Service execution started",
        performedBy: `staff:${req.staff.name}`,
        timestamp: now,
      });
    } else if (status === "completed") {
      booking.serviceTracking.completedAt = now;
      booking.status = "completed";
      booking.assignmentHistory.push({
        staffId: req.staff._id,
        staffName: req.staff.name,
        action: "status_update",
        reason: "Service completed successfully",
        performedBy: `staff:${req.staff.name}`,
        timestamp: now,
      });
    }

    await booking.save();

    // Trigger asynchronous customer notification (non-blocking)
    notifyJobStatusChange(booking, status, req.staff.name).catch((nErr) => {
      console.warn("[updateJobStatus] Notification dispatch warning:", nErr.message);
    });

    // Real-time broadcast to Admin and Staff
    broadcastBookingUpdated(booking, { newStatus: status, staffName: req.staff.name });

    return res.status(200).json({
      success: true,
      message: `Job status updated to '${status}'`,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update job status",
      error: error.message,
    });
  }
};

// ==========================================
// 6. Attendance Clock In & Clock Out
// ==========================================
export const checkInAttendance = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const todayStr = getUAETodayDateStr();
    const now = new Date();

    let attendance = await StaffAttendance.findOne({
      staff: staffId,
      date: todayStr,
    });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: `Already checked in today at ${new Date(attendance.checkIn).toLocaleTimeString("en-GB")}`,
        attendance,
      });
    }

    if (!attendance) {
      attendance = new StaffAttendance({
        staff: staffId,
        date: todayStr,
        checkIn: now,
        status: "present",
      });
    } else {
      attendance.checkIn = now;
      attendance.status = "present";
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString("en-GB")}`,
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to record check-in",
      error: error.message,
    });
  }
};

export const checkOutAttendance = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const todayStr = getUAETodayDateStr();
    const now = new Date();

    const attendance = await StaffAttendance.findOne({
      staff: staffId,
      date: todayStr,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: "You must check in first before checking out.",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: `Already checked out today at ${new Date(attendance.checkOut).toLocaleTimeString("en-GB")}`,
        attendance,
      });
    }

    attendance.checkOut = now;
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Checked out successfully at ${now.toLocaleTimeString("en-GB")}`,
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to record check-out",
      error: error.message,
    });
  }
};

export const getStaffAttendanceToday = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const todayStr = getUAETodayDateStr();
    const attendance = await StaffAttendance.findOne({
      staff: staffId,
      date: todayStr,
    });

    return res.status(200).json({
      success: true,
      attendance: attendance || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance",
      error: error.message,
    });
  }
};

export const getStaffAttendanceHistory = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { limit = 30 } = req.query;

    const records = await StaffAttendance.find({ staff: staffId })
      .sort({ date: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.status(200).json({
      success: true,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance history",
      error: error.message,
    });
  }
};

// ==========================================
// 7. Staff Leave Requests
// ==========================================
export const submitLeaveRequest = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff._id);
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Start date, end date, and reason are required.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range specified for leave request.",
      });
    }

    staff.leaves.push({
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      status: "pending",
      requestedAt: new Date(),
    });

    await staff.save();

    return res.status(201).json({
      success: true,
      message: "Leave request submitted for admin approval.",
      leaves: staff.leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit leave request",
      error: error.message,
    });
  }
};

export const getStaffLeaves = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff._id).select("leaves");
    return res.status(200).json({
      success: true,
      leaves: staff.leaves || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve leaves",
      error: error.message,
    });
  }
};

// ==========================================
// 8. Staff Break Management (Flexible Choice)
// ==========================================
export const updateStaffBreaks = async (req, res) => {
  try {
    const { breaks } = req.body;
    if (!Array.isArray(breaks)) {
      return res.status(400).json({
        success: false,
        message: "Breaks must be an array of break objects, or an empty array for flexible breaks.",
      });
    }

    const staff = await Staff.findById(req.staff._id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    // If breaks are specified, validate against staff working hours
    if (breaks.length > 0) {
      const val = validateWorkingSchedule(staff.workingHours, breaks);
      if (!val.valid) {
        return res.status(400).json({
          success: false,
          message: val.message,
        });
      }
    }

    staff.breaks = breaks.map((b) => ({
      start: b.start,
      end: b.end,
      label: b.label || "Break",
    }));

    await staff.save();

    return res.status(200).json({
      success: true,
      message:
        breaks.length === 0
          ? "Breaks cleared! You now have flexible breaks based on your free time."
          : "Break time updated successfully based on your free time choice.",
      breaks: staff.breaks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update break time",
      error: error.message,
    });
  }
};
