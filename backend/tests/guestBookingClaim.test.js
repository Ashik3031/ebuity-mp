import {
  extractPhoneDigits,
  canUserAccessBooking,
  claimGuestBookings,
} from "../services/bookingClaimService.js";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import userModel from "../models/userModel.js";
import Order from "../models/Order.js";

async function runGuestClaimTests() {
  console.log("==================================================");
  console.log("Guest Booking Claiming & Account Upgrade Unit Tests");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // --- Test 1: UAE Phone Number Normalization ---
  assert(extractPhoneDigits("+971 50 123 4567") === "501234567", "Normalizes +971 50 123 4567 to 501234567");
  assert(extractPhoneDigits("0501234567") === "501234567", "Normalizes 0501234567 to 501234567");
  assert(extractPhoneDigits("971501234567") === "501234567", "Normalizes 971501234567 to 501234567");
  assert(extractPhoneDigits("501234567") === "501234567", "Leaves 9-digit 501234567 intact");
  assert(extractPhoneDigits("+971 55 987 6543") === "559876543", "Normalizes +971 55 987 6543 to 559876543");
  assert(extractPhoneDigits("") === "", "Handles empty phone");
  assert(extractPhoneDigits(null) === "", "Handles null phone");

  // --- Test 2: Access Check: Direct Owner ---
  const userA = { _id: new mongoose.Types.ObjectId(), email: "sarah@example.com", phone: "+971501234567", role: "user", isAccountVerified: true };
  const bookingA = {
    customer: userA._id,
    customerDetails: { email: "sarah@example.com", phone: "+971501234567" },
  };
  assert(canUserAccessBooking(userA, bookingA) === true, "Direct owner has access to booking");

  // --- Test 3: Access Check: Admin Access ---
  const adminUser = { _id: new mongoose.Types.ObjectId(), email: "admin@ebuity.com", role: "admin" };
  assert(canUserAccessBooking(adminUser, bookingA) === true, "Admin has access to any booking");

  // --- Test 4: Access Check: Guest Booking matching by verified email ---
  const guestBookingByEmail = {
    customer: new mongoose.Types.ObjectId(), // old guest user ID
    isGuestBooking: true,
    customerDetails: { email: "sarah@example.com", phone: "+971509999999" },
  };
  assert(canUserAccessBooking(userA, guestBookingByEmail) === true, "Verified user can access unassociated guest booking matching their email");

  // --- Test 5: Access Check: Unverified User Denied Access ---
  const unverifiedSarah = { ...userA, isAccountVerified: false };
  assert(canUserAccessBooking(unverifiedSarah, guestBookingByEmail) === false, "Unverified user is denied access even if email matches");

  // --- Test 6: Access Check: Unrelated User is Denied ---
  const stranger = { _id: new mongoose.Types.ObjectId(), email: "stranger@example.com", phone: "+971560000000", role: "user", isAccountVerified: true };
  assert(canUserAccessBooking(stranger, guestBookingByEmail) === false, "Unrelated user is denied access to someone else's booking");

  // --- Test 7: Mock Execution of claimGuestBookings ---
  // Mock Booking.updateMany and userModel.find
  const originalBookingUpdateMany = Booking.updateMany;
  const originalUserFind = userModel.find;
  const originalOrderUpdateMany = Order.updateMany;

  let capturedBookingFilter = null;
  let capturedBookingUpdate = null;

  Booking.updateMany = async (filter, update) => {
    capturedBookingFilter = filter;
    capturedBookingUpdate = update;
    return { modifiedCount: 2 };
  };

  userModel.find = () => ({
    select: () => ({
      lean: async () => [{ _id: new mongoose.Types.ObjectId() }],
    }),
  });

  Order.updateMany = async () => ({ modifiedCount: 1 });

  const claimResult = await claimGuestBookings(userA);
  assert(claimResult.associatedBookings === 2, "claimGuestBookings reports 2 associated bookings");
  assert(claimResult.associatedOrders === 1, "claimGuestBookings reports 1 associated order");
  assert(capturedBookingFilter !== null, "Booking.updateMany filter was constructed");
  assert(capturedBookingUpdate.$set.customer.equals(userA._id), "Booking.updateMany updates customer to userA._id");
  assert(capturedBookingUpdate.$set.associatedWithUser.equals(userA._id), "Booking.updateMany sets associatedWithUser to userA._id");
  assert(capturedBookingUpdate.$set["customerDetails.email"] === "sarah@example.com", "Updates placeholder guest email to real user email");

  // Restore mocks
  Booking.updateMany = originalBookingUpdateMany;
  userModel.find = originalUserFind;
  Order.updateMany = originalOrderUpdateMany;

  console.log("==================================================");
  console.log(`Summary: All ${passed}/${total} unit assertions PASSED!`);
  console.log("==================================================");
}

runGuestClaimTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
