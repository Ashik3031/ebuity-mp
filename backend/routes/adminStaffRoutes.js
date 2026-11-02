import express from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  inviteStaff,
  updateStaffSchedule,
  getAllLeaveRequests,
  reviewLeaveRequest,
  getStaffSchedules,
  getStaffAssignments,
  reassignBooking,
  getAllStaffAttendance,
  correctAttendanceRecord,
  manualAttendanceRecord,
  getEligibleStaff,
} from "../controllers/adminStaffController.js";

const router = express.Router();

// Require admin authorization on all admin staff management routes
router.use(adminAuth);

// Booking & Availability Integration Helper
router.get("/eligible-staff", getEligibleStaff);

// Leave Requests Oversight (place before /:id)
router.get("/leaves", getAllLeaveRequests);
router.patch("/leaves/:leaveId", reviewLeaveRequest);

// Schedules and Assignments Oversight (place before /:id)
router.get("/schedules", getStaffSchedules);
router.get("/assignments", getStaffAssignments);
router.post("/assignments/:bookingId/reassign", reassignBooking);

// Attendance Oversight (place before /:id)
router.get("/attendance", getAllStaffAttendance);
router.put("/attendance/:id", correctAttendanceRecord);
router.post("/attendance/manual", manualAttendanceRecord);
router.post("/attendance", manualAttendanceRecord);

// Staff Directory CRUD
router.get("/", getAllStaff);
router.post("/", createStaff);
router.get("/:id", getStaffById);
router.put("/:id", updateStaff);
router.patch("/:id/status", toggleStaffStatus);
router.post("/:id/invite", inviteStaff);
router.put("/:id/schedule", updateStaffSchedule);

export default router;
