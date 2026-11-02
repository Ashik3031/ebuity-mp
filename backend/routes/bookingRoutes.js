import express from "express";
import {
  getAvailableSlots,
  validateAddressZone,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  requestReschedule,
  requestCancel,
  getAdminBookings,
  updateBookingStatus,
  getAvailabilityConfig,
  updateAvailabilityConfig,
  reviewCancellation,
  reviewReschedule,
  validateRescheduleSlot,
  getNotificationLogs,
  retryNotificationAction,
} from "../controllers/bookingController.js";
import userAuth from "../middlewares/userAuth.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router = express.Router();

// Public routes for slot exploration and zone validation
router.get("/availability", getAvailableSlots);
router.post("/validate-zone", validateAddressZone);

// Customer-protected booking routes
router.post("/", userAuth, createBooking);
router.get("/my-bookings", userAuth, getMyBookings);
router.get("/:id", userAuth, getBookingById);
router.patch("/:id/cancel", userAuth, cancelBooking);
router.post("/:id/request-reschedule", userAuth, requestReschedule);
router.post("/:id/request-cancel", userAuth, requestCancel);

// Admin operations & oversight
router.get("/admin/notifications", adminAuth, getNotificationLogs);
router.post("/admin/notifications/retry", adminAuth, retryNotificationAction);
router.get("/admin/all", adminAuth, getAdminBookings);
router.patch("/admin/:id/status", adminAuth, updateBookingStatus);
router.post("/admin/:id/review-cancellation", adminAuth, reviewCancellation);
router.post("/admin/:id/review-reschedule", adminAuth, reviewReschedule);
router.post("/admin/:id/validate-reschedule-slot", adminAuth, validateRescheduleSlot);
router.get("/admin/config", adminAuth, getAvailabilityConfig);
router.put("/admin/config", adminAuth, updateAvailabilityConfig);

export default router;
