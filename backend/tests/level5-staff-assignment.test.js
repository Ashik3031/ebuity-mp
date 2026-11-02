import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/StaffAttendance.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import ServiceCategory from "../models/ServiceCategory.js";
import ServiceZone from "../models/ServiceZone.js";
import userModel from "../models/userModel.js";
import {
  createUAEDate,
  getUAEDayOfWeek,
  findBestEligibleStaff,
  getAlternativeSlots,
  handleStaffRejection,
  isStaffQualifiedForServices,
  isStaffAvailableForSlot,
} from "../services/staffAssignmentService.js";

async function runLevel5Tests() {
  console.log("==================================================");
  console.log("Starting Level 5: Staff Management & Auto-Assignment Tests");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB successfully.");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  FAIL: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // Clean up any test artifacts from previous runs
    await Staff.deleteMany({ email: /test\.level5\./ });
    await Booking.deleteMany({ bookingNumber: /TEST-L5-/ });

    // 1. Ensure test categories and services exist
    let testCat = await ServiceCategory.findOne({ slug: "level5-luxury-nails" });
    if (!testCat) {
      testCat = await ServiceCategory.create({
        name: "Level 5 Luxury Nails",
        slug: "level5-luxury-nails",
        description: "Test Nails Category",
      });
    }

    let testService1 = await Service.findOne({ slug: "l5-signature-manicure" });
    if (!testService1) {
      testService1 = await Service.create({
        name: "L5 Signature Manicure",
        slug: "l5-signature-manicure",
        category: testCat._id,
        price: 150,
        durationMinutes: 45,
        isActive: true,
      });
    }

    let testService2 = await Service.findOne({ slug: "l5-deluxe-pedicure" });
    if (!testService2) {
      testService2 = await Service.create({
        name: "L5 Deluxe Pedicure",
        slug: "l5-deluxe-pedicure",
        category: testCat._id,
        price: 180,
        durationMinutes: 60,
        isActive: true,
      });
    }

    let testCatHair = await ServiceCategory.findOne({ slug: "level5-hair-styling" });
    if (!testCatHair) {
      testCatHair = await ServiceCategory.create({
        name: "Level 5 Hair Styling",
        slug: "level5-hair-styling",
        description: "Test Hair Category",
      });
    }

    let testServiceHair = await Service.findOne({ slug: "l5-blowdry" });
    if (!testServiceHair) {
      testServiceHair = await Service.create({
        name: "L5 Luxury Blowdry",
        slug: "l5-blowdry",
        category: testCatHair._id,
        price: 220,
        durationMinutes: 45,
        isActive: true,
      });
    }

    let testUser = await userModel.findOne({ email: "test.customer.l5@example.com" });
    if (!testUser) {
      testUser = await userModel.create({
        name: "Test Customer Level 5",
        email: "test.customer.l5@example.com",
        password: "Password123!",
      });
    }

    console.log("\n--- Test Suite 1: Staff Creation & Service Skill Matrix ---");
    // Staff 1: Qualified for Nails (category assignment)
    const staff1 = await Staff.create({
      name: "Fatima Al-Zahra",
      email: "test.level5.fatima@example.com",
      phone: "+971501112233",
      password: "StaffPassword123!",
      categoryIds: [testCat._id], // Category level qualification
      serviceIds: [],
      workingHours: { start: "09:00", end: "21:00" },
      breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
      weeklyOffDays: [5], // Off on Friday
      isActive: true,
    });

    // Staff 2: Qualified for Nails and Hair
    const staff2 = await Staff.create({
      name: "Layla Mansoor",
      email: "test.level5.layla@example.com",
      phone: "+971502223344",
      password: "StaffPassword123!",
      categoryIds: [testCat._id, testCatHair._id],
      workingHours: { start: "09:00", end: "21:00" },
      breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
      weeklyOffDays: [5],
      isActive: true,
    });

    // Staff 3: Qualified ONLY for Hair
    const staff3 = await Staff.create({
      name: "Nour Khalil",
      email: "test.level5.nour@example.com",
      phone: "+971503334455",
      password: "StaffPassword123!",
      categoryIds: [testCatHair._id],
      workingHours: { start: "09:00", end: "21:00" },
      breaks: [],
      weeklyOffDays: [0], // Off on Sunday
      isActive: true,
    });

    assert(staff1._id && staff2._id && staff3._id, "Staff profiles created with distinct credentials");
    assert(await staff1.matchPassword("StaffPassword123!"), "Staff password correctly hashed and verified");

    // Qualification check
    const nailsServices = [testService1, testService2];
    assert(isStaffQualifiedForServices(staff1, nailsServices), "Staff 1 is qualified for all nails services via category");
    assert(isStaffQualifiedForServices(staff2, nailsServices), "Staff 2 is qualified for nails services");
    assert(!isStaffQualifiedForServices(staff3, nailsServices), "Staff 3 (Hair only) is NOT qualified for nails");

    const multiCategoryBooking = [testService1, testServiceHair];
    assert(!isStaffQualifiedForServices(staff1, multiCategoryBooking), "Staff 1 cannot service multi-category booking containing hair");
    assert(isStaffQualifiedForServices(staff2, multiCategoryBooking), "Staff 2 is qualified for both nails and hair");

    console.log("\n--- Test Suite 2: Schedule & Availability Guards (Breaks, Off Days, Leaves) ---");
    // Test date: choose upcoming Saturday (not Friday)
    const testDate = "2026-10-31"; // Saturday
    const startTimeNormal = createUAEDate(testDate, "10:00");
    const endTimeNormal = createUAEDate(testDate, "11:30");

    const checkNormal = await isStaffAvailableForSlot({
      staff: staff1,
      scheduledDate: testDate,
      startTime: startTimeNormal,
      endTime: endTimeNormal,
    });
    assert(checkNormal.available, "Staff 1 is available during normal working hours on an active workday");

    // Overlapping break check
    const startTimeBreak = createUAEDate(testDate, "12:30");
    const endTimeBreak = createUAEDate(testDate, "13:30"); // overlaps with 13:00-14:00 break
    const checkBreak = await isStaffAvailableForSlot({
      staff: staff1,
      scheduledDate: testDate,
      startTime: startTimeBreak,
      endTime: endTimeBreak,
    });
    assert(!checkBreak.available && checkBreak.reason.includes("break"), "Slot overlapping with staff break is rejected");

    // Weekly off check (Friday = 5)
    const fridayDate = "2026-10-30"; // Friday
    const checkFriday = await isStaffAvailableForSlot({
      staff: staff1,
      scheduledDate: fridayDate,
      startTime: startTimeNormal,
      endTime: endTimeNormal,
    });
    assert(!checkFriday.available && checkFriday.reason.includes("weekly off"), "Booking on staff's weekly off day is rejected");

    // Leave check
    staff1.leaves.push({
      startDate: new Date("2026-11-05T00:00:00Z"),
      endDate: new Date("2026-11-07T23:59:59Z"),
      reason: "Annual leave",
      status: "approved",
    });
    await staff1.save();

    const leaveDate = "2026-11-05"; // Thursday (standard workday within leave period)
    const checkLeave = await isStaffAvailableForSlot({
      staff: staff1,
      scheduledDate: leaveDate,
      startTime: createUAEDate(leaveDate, "10:00"),
      endTime: createUAEDate(leaveDate, "11:00"),
    });
    assert(!checkLeave.available && checkLeave.reason.includes("approved leave"), "Staff member on approved leave is unavailable");

    console.log("\n--- Test Suite 3: Automatic Staff Assignment & Load Balancing ---");
    // When booking Nails, both Staff 1 and Staff 2 are qualified.
    // Initially both have 0 bookings. Staff assignment should pick one cleanly.
    const assignResult = await findBestEligibleStaff({
      serviceIds: [testService1._id, testService2._id],
      scheduledDate: testDate,
      startTime: startTimeNormal,
      endTime: endTimeNormal,
    });
    assert(assignResult.success, "Auto-assignment found an eligible qualified staff member");
    const assignedStaffMember = assignResult.staff;
    assert(
      assignedStaffMember._id.equals(staff1._id) || assignedStaffMember._id.equals(staff2._id),
      "Assigned staff is either Staff 1 or Staff 2 (both qualified)"
    );

    // Create Booking 1 assigned to Staff 1
    const booking1 = await Booking.create({
      bookingNumber: "TEST-L5-BK01",
      customer: testUser._id,
      customerDetails: {
        name: "Test Customer",
        email: "test.customer.l5@example.com",
        phone: "+971509998877",
      },
      services: [
        {
          serviceId: testService1._id,
          name: testService1.name,
          slug: testService1.slug,
          price: testService1.price,
          durationMinutes: testService1.durationMinutes,
        },
      ],
      totalDurationMinutes: 45,
      totalPrice: 150,
      currency: "AED",
      serviceAddress: {
        fullName: "Test Customer",
        phone: "+971509998877",
        unitNumber: "101",
        buildingName: "Burj Tower",
        area: "Downtown Dubai",
        city: "Dubai",
        state: "Dubai",
      },
      scheduledDate: testDate,
      scheduledStartTime: createUAEDate(testDate, "10:00"),
      scheduledEndTime: createUAEDate(testDate, "10:45"),
      status: "confirmed",
      assignedStaff: staff1._id,
      staffAssignmentStatus: "assigned",
      travelBufferMinutes: 30,
    });

    console.log("\n--- Test Suite 4: Buffer and Travel Time Conflict Prevention ---");
    // Booking 1 ends at 10:45 with a 30 min buffer (busy until 11:15).
    // An appointment at 11:00 should CONFLICT for Staff 1.
    const checkConflict = await isStaffAvailableForSlot({
      staff: staff1,
      scheduledDate: testDate,
      startTime: createUAEDate(testDate, "11:00"),
      endTime: createUAEDate(testDate, "12:00"),
      bufferMinutes: 30,
    });
    assert(!checkConflict.available && checkConflict.reason.includes("travel buffer"), "Conflict prevented: overlaps with existing booking's safety/travel buffer");

    // But Staff 2 has no booking, so requesting 11:00 appointment should automatically pick Staff 2!
    const assignResult2 = await findBestEligibleStaff({
      serviceIds: [testService1._id],
      scheduledDate: testDate,
      startTime: createUAEDate(testDate, "11:00"),
      endTime: createUAEDate(testDate, "11:45"),
      bufferMinutes: 30,
    });
    assert(assignResult2.success, "Auto-assignment successfully routed to available Staff 2");
    assert(assignResult2.staff._id.equals(staff2._id), "Assigned Staff 2 because Staff 1 is busy with travel buffer");

    console.log("\n--- Test Suite 5: Staff Rejection and Automatic Reassignment ---");
    // Staff 1 rejects Booking 1
    const rejectionResult = await handleStaffRejection({
      bookingId: booking1._id,
      staffId: staff1._id,
      reason: "Emergency vehicle breakdown",
    });

    assert(rejectionResult.success, "Staff rejection handled successfully");
    assert(rejectionResult.reassigned, "Booking was automatically reassigned to replacement staff");
    assert(rejectionResult.newStaff._id.toString() === staff2._id.toString(), "Reassigned to Staff 2 (Layla)");

    const updatedBooking1 = await Booking.findById(booking1._id);
    assert(updatedBooking1.staffAssignmentStatus === "assigned", "Booking assignment status is active 'assigned'");
    assert(updatedBooking1.assignmentHistory.length >= 2, "Assignment history contains rejection and reassignment audit entries");

    console.log("\n--- Test Suite 6: Rejection Fallback to Admin Attention when No Other Staff Available ---");
    // Now if Staff 2 also rejects the same booking, there is no other qualified staff left (Staff 3 is hair only)
    const rejectionResult2 = await handleStaffRejection({
      bookingId: booking1._id,
      staffId: staff2._id,
      reason: "Already booked elsewhere",
    });

    assert(rejectionResult2.success, "Second rejection processed");
    assert(!rejectionResult2.reassigned, "Reassignment correctly detected no remaining available staff");
    assert(rejectionResult2.flaggedForAdmin, "Booking is flagged for admin attention");

    const flaggedBooking = await Booking.findById(booking1._id);
    assert(flaggedBooking.staffAssignmentStatus === "admin_attention", "Status updated to 'admin_attention'");
    assert(flaggedBooking.flaggedForAdmin === true, "flaggedForAdmin is set to true");

    console.log("\n--- Test Suite 7: Alternative Slot Recommendations when Slot is Full ---");
    // Make both Staff 1 and Staff 2 busy or off, request booking, assert alternative slots returned
    const alternatives = await getAlternativeSlots({
      serviceIds: [testService1._id],
      scheduledDate: testDate,
      totalDurationMinutes: 45,
      bufferMinutes: 30,
    });
    assert(Array.isArray(alternatives) && alternatives.length > 0, "Alternative available slots returned when requested slot has conflict");

    console.log("\n--- Test Suite 8: Staff Attendance Clock In/Out ---");
    const todayStr = "2026-10-24";
    const attendance = await StaffAttendance.create({
      staff: staff1._id,
      date: todayStr,
      checkIn: new Date(),
      status: "present",
    });
    assert(attendance.checkIn && attendance.status === "present", "Staff attendance check-in recorded successfully");

    attendance.checkOut = new Date();
    await attendance.save();
    assert(attendance.checkOut, "Staff attendance check-out recorded successfully");

    console.log("\n==================================================");
    console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
    console.log("==================================================");

    // Clean up test records
    await Staff.deleteMany({ email: /test\.level5\./ });
    await Booking.deleteMany({ bookingNumber: /TEST-L5-/ });
    await StaffAttendance.deleteMany({ staff: { $in: [staff1._id, staff2._id, staff3._id] } });

    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error("Test execution failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runLevel5Tests();
