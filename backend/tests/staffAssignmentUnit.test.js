import {
  parseTimeToMinutes,
  formatMinutesToTime,
  createUAEDate,
  getUAEDayOfWeek,
  isStaffQualifiedForServices,
  isStaffAvailableForSlot,
} from "../services/staffAssignmentService.js";
import mongoose from "mongoose";

async function runUnitTests() {
  console.log("==================================================");
  console.log("Level 5 Unit Tests: Staff Qualification & Scheduling Engine");
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

  // --- Test 1: Time parsing & formatting ---
  assert(parseTimeToMinutes("09:00") === 540, "09:00 is 540 minutes from midnight");
  assert(parseTimeToMinutes("14:30") === 870, "14:30 is 870 minutes from midnight");
  assert(formatMinutesToTime(540) === "09:00", "540 minutes formats to 09:00");
  assert(formatMinutesToTime(870) === "14:30", "870 minutes formats to 14:30");

  // --- Test 2: UAE Timezone Date Construction ---
  // UAE is UTC+4. At 14:00 UAE, UTC is 10:00.
  const uaeDate = createUAEDate("2026-10-25", "14:00");
  assert(uaeDate.getUTCHours() === 10, "UAE 14:00 corresponds to UTC 10:00 (UTC+4 offset)");
  assert(uaeDate.toISOString() === "2026-10-25T10:00:00.000Z", "UAE date ISO serialization is exact");

  // --- Test 3: Day of week in UAE ---
  // 2026-10-25 is Sunday (0), 2026-10-30 is Friday (5), 2026-10-31 is Saturday (6)
  assert(getUAEDayOfWeek("2026-10-25") === 0, "2026-10-25 is Sunday (Day 0)");
  assert(getUAEDayOfWeek("2026-10-30") === 5, "2026-10-30 is Friday (Day 5)");
  assert(getUAEDayOfWeek("2026-10-31") === 6, "2026-10-31 is Saturday (Day 6)");

  // --- Test 4: Multi-Service Qualification Matching ---
  const catNails = new mongoose.Types.ObjectId();
  const catHair = new mongoose.Types.ObjectId();
  const catFacial = new mongoose.Types.ObjectId();

  const serviceMani = { _id: new mongoose.Types.ObjectId(), category: catNails, name: "Manicure" };
  const servicePedi = { _id: new mongoose.Types.ObjectId(), category: catNails, name: "Pedicure" };
  const serviceBlowdry = { _id: new mongoose.Types.ObjectId(), category: catHair, name: "Blowdry" };
  const serviceSpecialFacial = { _id: new mongoose.Types.ObjectId(), category: catFacial, name: "Signature Glow" };

  // Staff A: Category qualification for Nails
  const staffNailsSpecialist = {
    _id: new mongoose.Types.ObjectId(),
    name: "Amina",
    categoryIds: [catNails],
    serviceIds: [],
    isActive: true,
  };

  // Staff B: Category qualification for Nails + Hair
  const staffMultiTalent = {
    _id: new mongoose.Types.ObjectId(),
    name: "Samira",
    categoryIds: [catNails, catHair],
    serviceIds: [],
    isActive: true,
  };

  // Staff C: Individual service qualification only (Special Facial only, not all facials)
  const staffFacialSpecialist = {
    _id: new mongoose.Types.ObjectId(),
    name: "Yasmin",
    categoryIds: [],
    serviceIds: [serviceSpecialFacial._id],
    isActive: true,
  };

  assert(
    isStaffQualifiedForServices(staffNailsSpecialist, [serviceMani, servicePedi]),
    "Staff with category qualification is qualified for all services in that category"
  );
  assert(
    !isStaffQualifiedForServices(staffNailsSpecialist, [serviceMani, serviceBlowdry]),
    "Single staff qualification rejects booking when employee lacks one of the required services"
  );
  assert(
    isStaffQualifiedForServices(staffMultiTalent, [serviceMani, servicePedi, serviceBlowdry]),
    "Multi-skilled staff is qualified for multi-service booking spanning Nails and Hair"
  );
  assert(
    isStaffQualifiedForServices(staffFacialSpecialist, [serviceSpecialFacial]),
    "Staff with specific service assignment is qualified for that individual service"
  );
  assert(
    !isStaffQualifiedForServices(staffFacialSpecialist, [{ _id: new mongoose.Types.ObjectId(), category: catFacial }]),
    "Individual service qualification does not grant whole category access"
  );

  // --- Test 5: Working Hours & Breaks ---
  const activeStaff = {
    _id: new mongoose.Types.ObjectId(),
    name: "Layla",
    isActive: true,
    weeklyOffDays: [5], // Friday off
    holidays: ["2026-12-25", "2026-01-01"],
    workingHours: { start: "09:00", end: "21:00" },
    breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
    leaves: [],
  };

  // 10:00 to 11:30 UAE
  const slotNormal = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-10-26", // Monday
    startTime: createUAEDate("2026-10-26", "10:00"),
    endTime: createUAEDate("2026-10-26", "11:30"),
  });
  assert(slotNormal.available, "Staff is available during normal working hours");

  // 13:30 to 14:30 UAE (overlaps break 13:00 - 14:00)
  const slotBreakOverlap = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "13:30"),
    endTime: createUAEDate("2026-10-26", "14:30"),
  });
  assert(!slotBreakOverlap.available && slotBreakOverlap.reason.includes("break"), "Slot overlapping break interval is blocked");

  // 08:00 to 09:30 UAE (starts before 09:00 working hour)
  const slotTooEarly = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "08:00"),
    endTime: createUAEDate("2026-10-26", "09:30"),
  });
  assert(!slotTooEarly.available && slotTooEarly.reason.includes("working hours"), "Slot outside working hours is blocked");

  // 20:30 to 21:30 UAE (ends after 21:00)
  const slotTooLate = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "20:30"),
    endTime: createUAEDate("2026-10-26", "21:30"),
  });
  assert(!slotTooLate.available && slotTooLate.reason.includes("working hours"), "Slot ending after working hours is blocked");

  // --- Test 6: Weekly Off Days and Holidays ---
  const slotFriday = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-10-30", // Friday (Day 5)
    startTime: createUAEDate("2026-10-30", "10:00"),
    endTime: createUAEDate("2026-10-30", "11:00"),
  });
  assert(!slotFriday.available && slotFriday.reason.includes("weekly off"), "Weekly off day is blocked");

  const slotHoliday = await isStaffAvailableForSlot({
    staff: activeStaff,
    scheduledDate: "2026-12-25",
    startTime: createUAEDate("2026-12-25", "10:00"),
    endTime: createUAEDate("2026-12-25", "11:00"),
  });
  assert(!slotHoliday.available && slotHoliday.reason.includes("holiday"), "Holiday is blocked");

  // --- Test 7: Approved Leave Blocking ---
  const staffWithLeave = {
    ...activeStaff,
    leaves: [
      {
        startDate: new Date("2026-11-01T00:00:00Z"),
        endDate: new Date("2026-11-03T23:59:59Z"),
        reason: "Medical leave",
        status: "approved",
      },
      {
        startDate: new Date("2026-11-10T00:00:00Z"),
        endDate: new Date("2026-11-12T23:59:59Z"),
        reason: "Vacation pending",
        status: "pending", // Pending leave should NOT block yet
      },
    ],
  };

  const slotOnApprovedLeave = await isStaffAvailableForSlot({
    staff: staffWithLeave,
    scheduledDate: "2026-11-02",
    startTime: createUAEDate("2026-11-02", "11:00"),
    endTime: createUAEDate("2026-11-02", "12:00"),
  });
  assert(!slotOnApprovedLeave.available && slotOnApprovedLeave.reason.includes("approved leave"), "Approved leave blocks bookings");

  const slotOnPendingLeave = await isStaffAvailableForSlot({
    staff: staffWithLeave,
    scheduledDate: "2026-11-11",
    startTime: createUAEDate("2026-11-11", "11:00"),
    endTime: createUAEDate("2026-11-11", "12:00"),
  });
  assert(slotOnPendingLeave.available, "Pending leave does not block staff until approved by admin");

  // --- Test 8: Deactivated Staff Guard ---
  const deactivatedStaff = {
    ...activeStaff,
    isActive: false,
  };
  const slotDeactivated = await isStaffAvailableForSlot({
    staff: deactivatedStaff,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "10:00"),
    endTime: createUAEDate("2026-10-26", "11:00"),
  });
  assert(!slotDeactivated.available && slotDeactivated.reason.includes("deactivated"), "Deactivated staff is not available");

  // --- Test 9: Existing Booking & Safety/Travel Buffer Overlap ---
  const staffWithExistingBooking = {
    ...activeStaff,
    existingBookings: [
      {
        bookingNumber: "TEST-BK-001",
        scheduledStartTime: createUAEDate("2026-10-26", "10:00"),
        scheduledEndTime: createUAEDate("2026-10-26", "11:00"),
      },
    ],
  };

  // 11:15 to 12:00: Within 30 min travel buffer (11:00 to 11:30)
  const slotDuringBuffer = await isStaffAvailableForSlot({
    staff: staffWithExistingBooking,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "11:15"),
    endTime: createUAEDate("2026-10-26", "12:15"),
    bufferMinutes: 30,
  });
  assert(!slotDuringBuffer.available && slotDuringBuffer.reason.includes("travel buffer"), "Existing booking's safety & travel buffer prevents overlapping assignment");

  // 11:35 to 12:35: Outside 30 min travel buffer (starts after 11:30)
  const slotAfterBuffer = await isStaffAvailableForSlot({
    staff: staffWithExistingBooking,
    scheduledDate: "2026-10-26",
    startTime: createUAEDate("2026-10-26", "11:35"),
    endTime: createUAEDate("2026-10-26", "12:35"),
    bufferMinutes: 30,
  });
  assert(slotAfterBuffer.available, "Slot after required travel buffer is successfully available");

  console.log("\n==================================================");
  console.log(`ALL LEVEL 5 UNIT TESTS PASSED (${passed}/${total})`);
  console.log("==================================================");
}

runUnitTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
