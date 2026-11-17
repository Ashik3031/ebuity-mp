import assert from "node:assert";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { createUAEDate } from "../services/staffAssignmentService.js";

console.log("==================================================");
console.log("Testing scheduledStartTime and scheduledEndTime Calculation & Validation");
console.log("==================================================");

// 1. Time formats normalization test
const timeCases = [
  { raw: "9:30 AM", expectedHours: "09:30" },
  { raw: "09:30 AM", expectedHours: "09:30" },
  { raw: "9:30", expectedHours: "09:30" },
  { raw: "09:30", expectedHours: "09:30" },
  { raw: "9:30 PM", expectedHours: "21:30" },
  { raw: "12:00 PM", expectedHours: "12:00" },
  { raw: "12:00 AM", expectedHours: "00:00" },
];

function normalizeTime(rawTime) {
  let scheduledTime = (rawTime || "").trim();
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
  return scheduledTime;
}

for (const tc of timeCases) {
  const norm = normalizeTime(tc.raw);
  assert.strictEqual(norm, tc.expectedHours, `Normalization failed for ${tc.raw}`);
  console.log(`  PASS: Time "${tc.raw}" normalized to "${norm}"`);
}

// 2. Blow Dry with Curls: November 18, 2026 at 9:30 AM, duration 60 mins
const scheduledDate = "2026-11-18";
const rawScheduledTime = "9:30 AM";
const durationMinutes = 60;

const normalizedTime = normalizeTime(rawScheduledTime);
const scheduledStartTime = createUAEDate(scheduledDate, normalizedTime);
const scheduledEndTime = new Date(scheduledStartTime.getTime() + durationMinutes * 60000);

assert.ok(!Number.isNaN(scheduledStartTime.getTime()), "scheduledStartTime must be a valid Date");
assert.ok(!Number.isNaN(scheduledEndTime.getTime()), "scheduledEndTime must be a valid Date");

// November 18, 2026 at 09:30 GST (UTC+4) is 05:30 UTC
assert.strictEqual(
  scheduledStartTime.toISOString(),
  "2026-11-18T05:30:00.000Z",
  "scheduledStartTime ISO must match 05:30 UTC"
);

// ScheduledEndTime = 09:30 GST + 60 mins = 10:30 GST (06:30 UTC)
assert.strictEqual(
  scheduledEndTime.toISOString(),
  "2026-11-18T06:30:00.000Z",
  "scheduledEndTime ISO must match 06:30 UTC"
);

console.log(`  PASS: 9:30 AM UAE starts at ${scheduledStartTime.toISOString()} (09:30 GST)`);
console.log(`  PASS: 60-min service ends at ${scheduledEndTime.toISOString()} (10:30 GST)`);

// 3. Mongoose Model Validation (Dry validation without DB connection)
const mockBooking = new Booking({
  bookingNumber: "RB-20261118-TEST",
  customer: new mongoose.Types.ObjectId(),
  customerDetails: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+971501234567",
  },
  services: [
    {
      serviceId: new mongoose.Types.ObjectId(),
      name: "Blow Dry with Curls",
      slug: "blow-dry-with-curls",
      price: 150,
      durationMinutes: 60,
      currency: "AED",
    },
  ],
  totalDurationMinutes: 60,
  totalPrice: 150,
  currency: "AED",
  serviceAddress: {
    label: "Home",
    fullName: "Jane Doe",
    phone: "+971501234567",
    email: "jane@example.com",
    unitNumber: "101",
    buildingName: "Marina Tower",
    area: "Dubai Marina",
    city: "Dubai",
  },
  scheduledDate,
  scheduledTime: normalizedTime,
  scheduledStartTime,
  scheduledEndTime,
  status: "confirmed",
  paymentMethod: "noon",
  paymentStatus: "pending",
});

const validationError = mockBooking.validateSync();
assert.strictEqual(validationError, undefined, `Booking validation failed: ${validationError?.message}`);
console.log("  PASS: Mongoose Booking model schema validation passed with valid scheduledEndTime!");

// 4. Verify that Invalid Date would fail Mongoose validation
const invalidBooking = new Booking({
  ...mockBooking.toObject(),
  _id: new mongoose.Types.ObjectId(),
  bookingNumber: "RB-20261118-INV",
  scheduledEndTime: new Date(NaN),
});
const invalidErr = invalidBooking.validateSync();
assert.ok(invalidErr, "Mongoose must catch Invalid Date for scheduledEndTime");
assert.ok(
  invalidErr.errors["scheduledEndTime"],
  "Mongoose error must be at path scheduledEndTime"
);
console.log(`  PASS: Mongoose properly rejects invalid date with error: ${invalidErr.errors["scheduledEndTime"].message}`);

// 5. Test createUAEDate resilience with (dateStr, hour, min) arguments
const startFromNumbers = createUAEDate("2026-11-18", 9, 30);
assert.strictEqual(
  startFromNumbers.toISOString(),
  "2026-11-18T05:30:00.000Z",
  "createUAEDate with numeric hour and minute must produce valid ISO"
);
console.log("  PASS: createUAEDate(dateStr, 9, 30) safely produces valid date");

console.log("==================================================");
console.log("ALL BOOKING SCHEDULED END TIME TESTS PASSED!");
console.log("==================================================");
