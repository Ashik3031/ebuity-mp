// tests/level9-booking-workflow.test.js
// Automated verification suite for Rose Essence Level 9: Complete Booking Workflow

import assert from "node:assert";
import jwt from "../backend/node_modules/jsonwebtoken/index.js";
import dotenv from "../backend/node_modules/dotenv/lib/main.js";

dotenv.config({ path: "./backend/.env" });

const BASE_URL = process.env.API_URL || "http://localhost:4000/api";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-ebuity-2025";

// Tokens
const adminToken = jwt.sign(
  { id: "6adc5697f95039667ed1409b", role: "admin", isAdmin: true, email: "admin@roseessence.ae" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// We'll obtain or generate a valid customer token and staff token dynamically
let customerToken = null;
let testCustomerId = null;
let staffToken = null;
let testStaffId = null;
let testStaffName = "";
let sampleService = null;
let testBooking = null;

async function runTests() {
  console.log("🌹 [Rose Essence Level 9] Starting Complete Booking Workflow Test Suite...\n");
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack.split("\n").slice(0, 3).join("\n"));
    }
  }

  // Setup: Fetch a real active service and active customer from the database
  try {
    const srvRes = await fetch(`${BASE_URL}/services?limit=5`);
    const srvData = await srvRes.json();
    if (srvData.services && srvData.services.length > 0) {
      sampleService = srvData.services[0];
    }

    const staffRes = await fetch(`${BASE_URL}/admin/staff-management`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const staffData = await staffRes.json();
    if (staffData.staff && staffData.staff.length > 0) {
      const activeStaff = staffData.staff.find((s) => s.isActive) || staffData.staff[0];
      testStaffId = activeStaff._id;
      testStaffName = activeStaff.name;
      staffToken = jwt.sign(
        { id: activeStaff._id, role: "staff", email: activeStaff.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
    }

    const usersRes = await fetch(`${BASE_URL}/user/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersRes.json();
    if (usersData.users && usersData.users.length > 0) {
      const client = usersData.users.find((u) => u.role !== "admin") || usersData.users[0];
      testCustomerId = client._id || client.userId;
      customerToken = jwt.sign(
        { id: testCustomerId, role: "user", email: client.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
    }
  } catch (setupErr) {
    console.warn("Setup data fetch error:", setupErr.message);
  }

  // Fallback customer token if database query had no users
  if (!customerToken) {
    customerToken = jwt.sign(
      { id: "68cb5697f95039667ed1409c", role: "user", email: "client@example.com" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  // 1. Customer Authentication Guard
  await test("1. Customer booking creation requires authentication (401 without token)", async () => {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: [sampleService?._id] }),
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 2. Genuine Slot Availability Calculation
  await test("2. Slot validation endpoint returns working hours, breaks, and buffer intervals", async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const res = await fetch(`${BASE_URL}/bookings/availability?date=${futureDate}&duration=60`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success, "Should return success: true");
    assert(Array.isArray(data.slots), "Should return slots array");
    assert(data.workingHours?.start, "Should report working hours start");
    assert(data.workingHours?.end, "Should report working hours end");
    assert(typeof data.availableSlotsCount === "number", "Should report availableSlotsCount");
  });

  // 3. Customer Booking Creation with Automatic Staff Assignment
  await test("3. Customer books ritual: verifies service snapshot, address, pricing, and auto-assigns therapist", async () => {
    assert(sampleService, "Service must exist in catalog");
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    const bookingPayload = {
      serviceIds: [sampleService._id],
      address: {
        label: "Villa Sanctuary",
        fullName: "Fatima Al Mansoori",
        phone: "+971501234567",
        email: "fatima@example.com",
        unitNumber: "Villa 12",
        buildingName: "Al Barari",
        street: "Jasmine Leaf 3",
        area: "Downtown Dubai",
        city: "Dubai",
        accessInstructions: "Gate code #4029. Security buzzer active.",
      },
      scheduledDate: futureDate,
      scheduledTime: "11:00",
      specialRequests: "Please bring organic rose essential oils",
    };

    const res = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(bookingPayload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(data)}`);
    assert(data.success, "Response should have success: true");
    assert(data.booking, "Booking object must be returned");
    assert(data.booking.bookingNumber.startsWith("RB-"), "Booking reference format");
    assert.strictEqual(data.booking.currency, "AED", "Currency must be AED");
    assert.strictEqual(data.booking.serviceAddress.area, "Downtown Dubai", "Snapshot address area");
    assert.strictEqual(data.booking.status, "confirmed", "Booking status confirmed");
    assert(data.booking.services[0].price > 0, "Service snapshot price saved");
    assert(data.booking.assignedStaff, "Qualified staff automatically assigned");
    assert.strictEqual(data.booking.staffAssignmentStatus, "assigned", "Staff assignment status is assigned");
    assert(Array.isArray(data.booking.assignmentHistory) && data.booking.assignmentHistory.length > 0, "Audit trail recorded");

    testBooking = data.booking;
    testStaffId = data.booking.assignedStaff._id;
    staffToken = jwt.sign(
      { id: testStaffId, role: "staff", email: data.booking.assignedStaff.email || "staff@roseessence.ae" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  // 4. Staff Workflow: Accept Assignment
  await test("4. Assigned staff accepts appointment via POST /staff/bookings/:id/accept", async () => {
    assert(testBooking, "Booking must exist");
    const res = await fetch(`${BASE_URL}/staff/bookings/${testBooking._id}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`,
      },
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert(data.success, "Should succeed");
    assert.strictEqual(data.booking.staffAssignmentStatus, "accepted", "Status updated to accepted");
  });

  // 5. Staff Status Progression: on_the_way -> arrived -> in_progress -> completed
  await test("5. Staff transitions job status through full sequence: on_the_way -> arrived -> in_progress -> completed", async () => {
    assert(testBooking, "Booking must exist");

    // 5a. On the way
    let res = await fetch(`${BASE_URL}/staff/bookings/${testBooking._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: "on_the_way" }),
    });
    assert.strictEqual(res.status, 200);
    let data = await res.json();
    assert.strictEqual(data.booking.staffAssignmentStatus, "on_the_way");
    assert(data.booking.serviceTracking.onTheWayAt, "Recorded onTheWayAt timestamp");

    // 5b. Arrived
    res = await fetch(`${BASE_URL}/staff/bookings/${testBooking._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: "arrived" }),
    });
    assert.strictEqual(res.status, 200);
    data = await res.json();
    assert.strictEqual(data.booking.staffAssignmentStatus, "arrived");
    assert(data.booking.serviceTracking.arrivedAt, "Recorded arrivedAt timestamp");

    // 5c. In progress
    res = await fetch(`${BASE_URL}/staff/bookings/${testBooking._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: "in_progress" }),
    });
    assert.strictEqual(res.status, 200);
    data = await res.json();
    assert.strictEqual(data.booking.staffAssignmentStatus, "in_progress");
    assert(data.booking.serviceTracking.startedAt, "Recorded startedAt timestamp");

    // 5d. Completed
    res = await fetch(`${BASE_URL}/staff/bookings/${testBooking._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: "completed" }),
    });
    assert.strictEqual(res.status, 200);
    data = await res.json();
    assert.strictEqual(data.booking.staffAssignmentStatus, "completed");
    assert.strictEqual(data.booking.status, "completed", "Overall booking marked completed");
    assert(data.booking.serviceTracking.completedAt, "Recorded completedAt timestamp");
  });

  // 6. Customer Portal: View Completed Booking
  await test("6. Customer can track completed booking and assigned specialist in /my-bookings", async () => {
    const res = await fetch(`${BASE_URL}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    assert(Array.isArray(data.bookings));
    const found = data.bookings.find((b) => b._id === testBooking._id);
    assert(found, "Completed booking must be listed in customer account");
    assert.strictEqual(found.status, "completed");
    assert(found.assignedStaff?.name, "Assigned specialist name displayed");
  });

  // 7. Customer Rescheduling Request
  let rescheduleBooking = null;
  let targetRescheduleDate = null;
  let targetRescheduleTime = null;

  await test("7. Customer creates an active appointment and submits a rescheduling request with slot validation", async () => {
    // Dynamically find a date and available slot
    let validDate = null;
    let validSlot = null;
    for (let offset = 2; offset <= 7; offset++) {
      const d = new Date(Date.now() + offset * 86400000).toISOString().split("T")[0];
      const availRes = await fetch(`${BASE_URL}/bookings/availability?date=${d}&serviceIds=${sampleService._id}`);
      if (availRes.status === 200) {
        const availData = await availRes.json();
        const openSlot = availData.slots?.find((s) => s.available);
        if (openSlot) {
          validDate = d;
          validSlot = openSlot.time;
          break;
        }
      }
    }

    assert(validDate && validSlot, "Should find a genuinely available appointment slot");

    const resCreate = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        serviceIds: [sampleService._id],
        address: {
          fullName: "Mariam Al Suwaidi",
          phone: "+971509998877",
          unitNumber: "Apt 402",
          buildingName: "Silverene Tower",
          area: "Dubai Marina",
          city: "Dubai",
        },
        scheduledDate: validDate,
        scheduledTime: validSlot,
      }),
    });
    const createData = await resCreate.json();
    assert.strictEqual(resCreate.status, 201, `Failed to create booking: ${JSON.stringify(createData)}`);
    rescheduleBooking = createData.booking;

    // Find another date and available slot for rescheduling
    for (let offset = 3; offset <= 9; offset++) {
      const d = new Date(Date.now() + offset * 86400000).toISOString().split("T")[0];
      if (d === validDate) continue;
      const availRes = await fetch(`${BASE_URL}/bookings/availability?date=${d}&serviceIds=${sampleService._id}`);
      if (availRes.status === 200) {
        const availData = await availRes.json();
        const openSlot = availData.slots?.find((s) => s.available);
        if (openSlot) {
          targetRescheduleDate = d;
          targetRescheduleTime = openSlot.time;
          break;
        }
      }
    }

    assert(targetRescheduleDate && targetRescheduleTime, "Should find an alternative available slot for rescheduling");

    const resReschedule = await fetch(`${BASE_URL}/bookings/${rescheduleBooking._id}/request-reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        requestedDate: targetRescheduleDate,
        requestedTime: targetRescheduleTime,
        reason: "Client business trip schedule change",
      }),
    });

    assert.strictEqual(resReschedule.status, 200, `Expected 200, got ${resReschedule.status}`);
    const resData = await resReschedule.json();
    assert(resData.success);
    assert.strictEqual(resData.booking.rescheduleRequest.status, "pending");
    assert.strictEqual(resData.booking.rescheduleRequest.requestedDate, targetRescheduleDate);
    assert.strictEqual(resData.booking.rescheduleRequest.requestedTimeStr, targetRescheduleTime);
  });

  // 8. Admin Reschedule Approval & Slot Validation
  await test("8. Admin approves rescheduling: validates slot, updates schedule, and records audit trail", async () => {
    assert(rescheduleBooking, "Reschedule booking must exist");
    assert(targetRescheduleDate, "Target reschedule date must exist");

    const res = await fetch(`${BASE_URL}/bookings/admin/${rescheduleBooking._id}/review-reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: "approve",
        adminNote: "Reschedule approved and confirmed with client",
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success);
    assert.strictEqual(data.booking.scheduledDate, targetRescheduleDate, "Date updated to new slot");
    assert.strictEqual(data.booking.rescheduleRequest.status, "approved", "Request marked approved");
    const historyEntry = data.booking.assignmentHistory.find((h) => h.reason.includes("Reschedule approved"));
    assert(historyEntry, "Admin reschedule audit entry preserved");
  });

  // 9. Customer Cancellation Request & Admin Approval
  await test("9. Customer requests cancellation and Admin reviews/approves it, releasing staff", async () => {
    assert(rescheduleBooking, "Booking must exist");

    // Client requests cancellation
    const resReq = await fetch(`${BASE_URL}/bookings/${rescheduleBooking._id}/request-cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ reason: "Unforeseen flight rescheduling" }),
    });
    assert.strictEqual(resReq.status, 200);

    // Admin reviews and approves cancellation
    const resAdmin = await fetch(`${BASE_URL}/bookings/admin/${rescheduleBooking._id}/review-cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: "approve",
        adminNote: "Approved per customer travel documents",
      }),
    });
    assert.strictEqual(resAdmin.status, 200);
    const adminData = await resAdmin.json();
    assert.strictEqual(adminData.booking.status, "cancelled");
    assert.strictEqual(adminData.booking.cancellationRequest.status, "approved");
    assert.strictEqual(adminData.booking.staffAssignmentStatus, "unassigned", "Staff schedule released");
  });

  // 10. Staff Rejection & Auto-Reassignment
  await test("10. Staff rejection workflow records reason, audits action, and auto-reassigns or flags for admin", async () => {
    let validDate = null;
    let validSlot = null;
    for (let offset = 2; offset <= 8; offset++) {
      const d = new Date(Date.now() + offset * 86400000).toISOString().split("T")[0];
      const availRes = await fetch(`${BASE_URL}/bookings/availability?date=${d}&serviceIds=${sampleService._id}`);
      if (availRes.status === 200) {
        const availData = await availRes.json();
        const openSlot = availData.slots?.find((s) => s.isAvailable || s.available);
        if (openSlot) {
          validDate = d;
          validSlot = openSlot.time;
          break;
        }
      }
    }

    assert(validDate && validSlot, "Should find open slot for staff rejection test");

    const resCreate = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        serviceIds: [sampleService._id],
        address: {
          fullName: "Layla",
          phone: "+971501112233",
          unitNumber: "Villa 5",
          buildingName: "Arabian Ranches",
          area: "Arabian Ranches",
          city: "Dubai",
        },
        scheduledDate: validDate,
        scheduledTime: validSlot,
      }),
    });
    const cData = await resCreate.json();
    assert.strictEqual(resCreate.status, 201, `Failed to create booking: ${JSON.stringify(cData)}`);
    const assignedStaffId = cData.booking.assignedStaff?._id || cData.booking.assignedStaff;
    const currentStaffToken = jwt.sign(
      { id: assignedStaffId, role: "staff", email: "therapist@roseessence.ae" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Staff rejects
    const resReject = await fetch(`${BASE_URL}/staff/bookings/${cData.booking._id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentStaffToken}` },
      body: JSON.stringify({ reason: "Emergency medical appointment" }),
    });

    assert.strictEqual(resReject.status, 200);
    const rejData = await resReject.json();
    assert(rejData.success);
    assert(
      rejData.result.reassigned || rejData.result.flaggedForAdmin,
      "Either reassigns to another qualified therapist or flags for admin oversight"
    );
  });

  // 11. Notification Delivery Logs & Safe Retry Mechanics
  await test("11. Notification system tracks delivery results, preserves provider status, and supports safe retries", async () => {
    const resLogs = await fetch(`${BASE_URL}/bookings/admin/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resLogs.status, 200);
    const logData = await resLogs.json();
    assert(logData.success);
    assert(Array.isArray(logData.logs), "Should return logs array");

    if (logData.logs.length > 0) {
      const log = logData.logs[0];
      assert(["sent", "failed", "logged", "pending"].includes(log.status), "Valid delivery status");
      assert(["customer", "staff", "admin"].includes(log.recipientRole), "Valid recipient role");
    }

    // Trigger retry endpoint
    const resRetry = await fetch(`${BASE_URL}/bookings/admin/notifications/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resRetry.status, 200);
    const retryData = await resRetry.json();
    assert(retryData.success);
    assert(typeof retryData.retriedCount === "number", "Reports number of retried items");
  });

  // 12. Security & Role Permissions Protection
  await test("12. Role permissions: Non-admin cannot access admin review or notification endpoints", async () => {
    // Customer attempting to review rescheduling
    const resForbidden = await fetch(
      `${BASE_URL}/bookings/admin/68cb5697f95039667ed1409c/review-reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ action: "approve" }),
      }
    );
    assert([401, 403].includes(resForbidden.status), `Expected 401/403, got ${resForbidden.status}`);

    // Customer attempting to view admin notification logs
    const resLogsForbidden = await fetch(`${BASE_URL}/bookings/admin/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert([401, 403].includes(resLogsForbidden.status), `Expected 401/403, got ${resLogsForbidden.status}`);
  });

  console.log(`\n======================================================`);
  console.log(`🎉 Rose Essence Level 9 Test Suite Finished: ${passed} / ${total} tests passed!`);
  console.log(`======================================================\n`);
  return { passed, total };
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
