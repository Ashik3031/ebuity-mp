import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/StaffAttendance.js";
import Service from "../models/Service.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Booking from "../models/Booking.js";
import {
  validateWorkingSchedule,
} from "../controllers/adminStaffController.js";
import {
  isStaffQualifiedForServices,
  isStaffAvailableForSlot,
  createUAEDate,
} from "../services/staffAssignmentService.js";

async function runLevel4Tests() {
  console.log("================================================================");
  console.log("Rose Essence — Admin Level 4: Staff Management Integration Tests");
  console.log("================================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Pure Unit / Validation Tests (independent of database)
    console.log("\n[1] Shift & Break Validation Logic Tests");

    const validSchedule = validateWorkingSchedule(
      { start: "09:00", end: "21:00" },
      [
        { start: "13:00", end: "14:00", label: "Lunch Break" },
        { start: "17:00", end: "17:30", label: "Tea Break" },
      ]
    );
    assert(validSchedule.valid === true, "Valid shift and non-overlapping breaks pass validation");

    const invertedShift = validateWorkingSchedule(
      { start: "21:00", end: "09:00" },
      []
    );
    assert(invertedShift.valid === false, "Inverted shift (start >= end) is rejected");

    const breakOutsideShift = validateWorkingSchedule(
      { start: "10:00", end: "18:00" },
      [{ start: "08:30", end: "09:30", label: "Early Break" }]
    );
    assert(breakOutsideShift.valid === false, "Break outside shift hours is rejected");

    const overlappingBreaks = validateWorkingSchedule(
      { start: "09:00", end: "21:00" },
      [
        { start: "13:00", end: "14:00", label: "Lunch" },
        { start: "13:30", end: "14:30", label: "Overlapping Break" },
      ]
    );
    assert(overlappingBreaks.valid === false, "Overlapping breaks are detected and rejected");

    // 2. Database Integration Tests
    console.log("\n[2] Database & Model Constraint Tests");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Clean up test staff
    const testEmail1 = `test.therapist.${Date.now()}@roseessence.ae`;
    const testEmail2 = `test.therapist2.${Date.now()}@roseessence.ae`;
    const testEmpId1 = `TEST-EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const testStaff1 = await Staff.create({
      name: "Test Therapist One",
      email: testEmail1,
      phone: "+971 50 000 0001",
      employeeId: testEmpId1,
      joiningDate: new Date("2024-02-01"),
      employmentStatus: "full-time",
      password: "TestPassword123!",
      workingHours: { start: "09:00", end: "21:00" },
      weeklyOffDays: [5], // Friday off
      breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
      isActive: true,
      notes: "Level 4 test therapist profile",
    });

    assert(testStaff1._id !== undefined, "Staff member created with employeeId and joiningDate");
    assert(testStaff1.employeeId === testEmpId1, "Employee ID stored in uppercase and matched");
    assert(testStaff1.role === "staff", "Dedicated 'staff' role assigned");

    // Password must be hashed (never plain text)
    assert(testStaff1.password !== "TestPassword123!", "Password is cryptographically hashed");
    assert(testStaff1.password.startsWith("$2"), "Password uses bcrypt hash format");

    const matchPass = await testStaff1.matchPassword("TestPassword123!");
    assert(matchPass === true, "Password verification method functions correctly");

    // Test duplicate email constraint
    let duplicateEmailError = false;
    try {
      await Staff.create({
        name: "Duplicate Email Test",
        email: testEmail1, // Same email
        phone: "+971 50 000 0002",
        employeeId: `TEST-EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        password: "Password123!",
      });
    } catch (err) {
      duplicateEmailError = true;
    }
    assert(duplicateEmailError === true, "Conflicting/duplicate email rejected by database");

    // Test duplicate employee ID constraint
    let duplicateEmpIdError = false;
    try {
      await Staff.create({
        name: "Duplicate Emp ID Test",
        email: testEmail2,
        phone: "+971 50 000 0003",
        employeeId: testEmpId1, // Same employeeId
        password: "Password123!",
      });
    } catch (err) {
      duplicateEmpIdError = true;
    }
    assert(duplicateEmpIdError === true, "Duplicate employee ID rejected by database");

    // 3. Service Skill Validation
    console.log("\n[3] Service Skill & Category Qualification Tests");
    const testCatId = new mongoose.Types.ObjectId();
    const testSrvId = new mongoose.Types.ObjectId();

    testStaff1.categoryIds = [testCatId];
    testStaff1.serviceIds = [testSrvId];
    await testStaff1.save();

    const qualifiedService1 = { _id: testSrvId, category: new mongoose.Types.ObjectId() };
    const qualifiedService2 = { _id: new mongoose.Types.ObjectId(), category: testCatId };
    const unqualifiedService = { _id: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId() };

    assert(
      isStaffQualifiedForServices(testStaff1, [qualifiedService1]),
      "Staff qualified via explicit service skill ID"
    );
    assert(
      isStaffQualifiedForServices(testStaff1, [qualifiedService2]),
      "Staff qualified via service category assignment"
    );
    assert(
      !isStaffQualifiedForServices(testStaff1, [unqualifiedService]),
      "Unqualified service rejected correctly"
    );
    assert(
      !isStaffQualifiedForServices(testStaff1, [qualifiedService1, unqualifiedService]),
      "Multi-service ritual requires qualification across all items"
    );

    // 4. Leave Approval & Availability Integration Tests
    console.log("\n[4] Leave Approval & Availability Integration Tests");
    // Target date: 2026-11-20 (Friday)
    // Target date: 2026-11-23 (Monday)
    const slotMondayStart = createUAEDate("2026-11-23", "10:00");
    const slotMondayEnd = createUAEDate("2026-11-23", "11:00");

    // Initially available on Monday
    const availBeforeLeave = await isStaffAvailableForSlot({
      staff: testStaff1,
      scheduledDate: "2026-11-23",
      startTime: slotMondayStart,
      endTime: slotMondayEnd,
    });
    assert(availBeforeLeave.available === true, "Therapist is available on regular working day");

    // Check weekly off day (Friday)
    const slotFridayStart = createUAEDate("2026-11-20", "10:00");
    const slotFridayEnd = createUAEDate("2026-11-20", "11:00");
    const availFriday = await isStaffAvailableForSlot({
      staff: testStaff1,
      scheduledDate: "2026-11-20",
      startTime: slotFridayStart,
      endTime: slotFridayEnd,
    });
    assert(
      availFriday.available === false && availFriday.reason.includes("weekly off day"),
      "Weekly off day (Friday) correctly blocks booking availability"
    );

    // Add approved leave covering Monday 2026-11-23
    testStaff1.leaves = [
      {
        startDate: new Date("2026-11-22T00:00:00Z"),
        endDate: new Date("2026-11-24T23:59:59Z"),
        reason: "Medical appointment in Dubai",
        status: "approved",
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewNotes: "Approved by Admin",
      },
    ];
    await testStaff1.save();

    const availDuringLeave = await isStaffAvailableForSlot({
      staff: testStaff1,
      scheduledDate: "2026-11-23",
      startTime: slotMondayStart,
      endTime: slotMondayEnd,
    });
    assert(
      availDuringLeave.available === false && availDuringLeave.reason.includes("approved leave"),
      "Approved leave immediately blocks availability calculations and prevents new assignments"
    );

    // Check break time exclusion
    const slotDuringBreakStart = createUAEDate("2026-11-26", "13:15");
    const slotDuringBreakEnd = createUAEDate("2026-11-26", "14:15");
    const availDuringBreak = await isStaffAvailableForSlot({
      staff: testStaff1,
      scheduledDate: "2026-11-26",
      startTime: slotDuringBreakStart,
      endTime: slotDuringBreakEnd,
    });
    assert(
      availDuringBreak.available === false && availDuringBreak.reason.includes("break"),
      "Configured lunch/disinfection break correctly blocks slot availability"
    );

    // 5. Attendance & Audit Trail Tests
    console.log("\n[5] Attendance Check-in, Check-out & Audit Trail Tests");
    const testDate = "2026-10-26";

    // Clean previous test attendance
    await StaffAttendance.deleteMany({ staff: testStaff1._id });

    // Initial check in
    const now = new Date();
    const attendanceRecord = await StaffAttendance.create({
      staff: testStaff1._id,
      date: testDate,
      checkIn: now,
      status: "present",
      notes: "Shift commenced on time",
    });

    assert(attendanceRecord.checkIn !== null, "Staff check-in timestamp recorded");
    assert(attendanceRecord.checkOut === null, "Check-out initially null for active shift");

    // Duplicate check in prevention
    let duplicateAttendanceError = false;
    try {
      await StaffAttendance.create({
        staff: testStaff1._id,
        date: testDate,
        checkIn: new Date(),
      });
    } catch {
      duplicateAttendanceError = true;
    }
    assert(duplicateAttendanceError === true, "Compound unique index prevents duplicate check-in on same day");

    // Admin correction with audit trail
    const previousCheckIn = attendanceRecord.checkIn;
    const correctedCheckIn = new Date(now.getTime() - 30 * 60000); // 30 mins earlier
    const correctedCheckOut = new Date(now.getTime() + 8 * 3600 * 1000);

    attendanceRecord.checkIn = correctedCheckIn;
    attendanceRecord.checkOut = correctedCheckOut;
    attendanceRecord.status = "present";
    attendanceRecord.isCorrected = true;
    attendanceRecord.correctionReason = "Therapist app clock-in synchronization delay";
    attendanceRecord.auditTrail.push({
      action: "corrected",
      modifiedBy: "admin@roseessence.ae",
      previousValues: { checkIn: previousCheckIn, checkOut: null },
      newValues: { checkIn: correctedCheckIn, checkOut: correctedCheckOut },
      reason: "Therapist app clock-in synchronization delay",
      timestamp: new Date(),
    });
    await attendanceRecord.save();

    const retrievedAttendance = await StaffAttendance.findById(attendanceRecord._id);
    assert(retrievedAttendance.isCorrected === true, "Attendance record flagged as corrected by admin");
    assert(retrievedAttendance.auditTrail.length === 1, "Audit trail entry preserved");
    assert(
      retrievedAttendance.auditTrail[0].reason === "Therapist app clock-in synchronization delay",
      "Audit trail records mandatory correction reason and admin editor"
    );

    // 6. Cleanup test records
    console.log("\n[6] Cleaning Up Temporary Test Records");
    await StaffAttendance.deleteMany({ staff: testStaff1._id });
    await Staff.findByIdAndDelete(testStaff1._id);
    console.log("  Temporary test artifacts cleaned up.");

    console.log("\n================================================================");
    console.log(`ALL LEVEL 4 TESTS COMPLETED: ${passed}/${total} PASSED (100%)`);
    console.log("================================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runLevel4Tests();
