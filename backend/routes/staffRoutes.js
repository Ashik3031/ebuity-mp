import express from "express";
import {
  loginStaff,
  logoutStaff,
  setupStaffPassword,
  getStaffProfile,
  getStaffDashboardSummary,
  getStaffBookings,
  getStaffBookingDetail,
  acceptAssignment,
  rejectAssignment,
  updateJobStatus,
  checkInAttendance,
  checkOutAttendance,
  getStaffAttendanceToday,
  getStaffAttendanceHistory,
  submitLeaveRequest,
  getStaffLeaves,
  updateStaffBreaks,
} from "../controllers/staffController.js";
import staffAuth from "../middlewares/staffAuth.js";

const router = express.Router();

// Public Staff Auth
router.post("/auth/login", loginStaff);
router.post("/auth/logout", logoutStaff);
router.post("/auth/setup-password", setupStaffPassword);

// Protected Staff Operations
router.use(staffAuth);

router.get("/profile", getStaffProfile);
router.get("/dashboard/summary", getStaffDashboardSummary);
router.get("/bookings", getStaffBookings);
router.get("/bookings/:id", getStaffBookingDetail);
router.post("/bookings/:id/accept", acceptAssignment);
router.post("/bookings/:id/reject", rejectAssignment);
router.post("/bookings/:id/status", updateJobStatus);

// Attendance Clocking
router.post("/attendance/check-in", checkInAttendance);
router.post("/attendance/check-out", checkOutAttendance);
router.get("/attendance/today", getStaffAttendanceToday);
router.get("/attendance/history", getStaffAttendanceHistory);

// Leave Requests
router.post("/leaves", submitLeaveRequest);
router.get("/leaves", getStaffLeaves);

// Break Time Management (Flexible Staff Choice)
router.put("/breaks", updateStaffBreaks);
router.patch("/breaks", updateStaffBreaks);

export default router;
