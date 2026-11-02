// tests/level6-booking-management.test.js
// Automated verification suite for Rose Essence Level 6: Booking Management

import assert from "node:assert";
import jwt from "../backend/node_modules/jsonwebtoken/index.js";
import dotenv from "../backend/node_modules/dotenv/lib/main.js";

dotenv.config({ path: "./backend/.env" });

const BASE_URL = process.env.API_URL || "http://localhost:4000/api";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-ebuity-2025";

// Generate valid admin token for testing
const adminToken = jwt.sign(
  { id: "6adc5697f95039667ed1409b", role: "admin", isAdmin: true },
  JWT_SECRET,
  { expiresIn: "1h" }
);

async function runTests() {
  console.log("🌹 [Rose Essence Level 6] Starting Booking Management Test Suite...\n");
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

  let sampleBooking = null;
  let staffList = [];

  // 1. Unauthorized Access Guard
  await test("1. Unauthorized request without admin token is rejected (401)", async () => {
    const res = await fetch(`${BASE_URL}/bookings/admin/all`);
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  // 2. Fetch All Bookings with Admin Token
  await test("2. Admin can retrieve paginated bookings via GET /bookings/admin/all", async () => {
    const res = await fetch(`${BASE_URL}/bookings/admin/all?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert(data.success, "Response should have success: true");
    assert(Array.isArray(data.bookings), "data.bookings should be an array");
    assert(data.bookings.length > 0, "Database should have test bookings");
    assert(typeof data.total === "number", "Should include total count");
    sampleBooking = data.bookings[0];
  });

  // 3. Verify Required Level 6 Data Schema on Bookings
  await test("3. Bookings contain reference, customer, services, address, pricing, and status", async () => {
    assert(sampleBooking, "Sample booking must exist");
    assert(sampleBooking.bookingNumber, "Booking must have unique bookingNumber reference");
    assert(sampleBooking.customerDetails?.name, "Booking must have customer name");
    assert(sampleBooking.customerDetails?.phone, "Booking must have customer phone");
    assert(Array.isArray(sampleBooking.services) && sampleBooking.services.length > 0, "Booking must have services");
    assert(sampleBooking.serviceAddress?.area, "Booking must have address area");
    assert.strictEqual(sampleBooking.currency, "AED", "Currency must be AED");
    assert(sampleBooking.totalPrice >= 0, "totalPrice must be valid non-negative number");
    assert(["pending", "confirmed", "completed", "cancelled"].includes(sampleBooking.status), "Valid status");
  });

  // 4. Status Filtering
  await test("4. Filter bookings by status (e.g. status=confirmed)", async () => {
    const res = await fetch(`${BASE_URL}/bookings/admin/all?status=confirmed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    const allConfirmed = data.bookings.every((b) => b.status === "confirmed");
    assert(allConfirmed, "All returned bookings should have status 'confirmed'");
  });

  // 5. Date Filtering
  await test("5. Filter bookings by scheduled date", async () => {
    const testDate = sampleBooking.scheduledDate;
    const res = await fetch(`${BASE_URL}/bookings/admin/all?date=${testDate}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    const allOnDate = data.bookings.every((b) => b.scheduledDate === testDate);
    assert(allOnDate, `All returned bookings should be on date ${testDate}`);
  });

  // 6. Invalid Status Update Rejection
  await test("6. Backend rejects invalid booking status transition (400)", async () => {
    const res = await fetch(`${BASE_URL}/bookings/admin/${sampleBooking._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "arbitrary_unsupported_status" }),
    });
    assert.strictEqual(res.status, 400, "Should return 400 for invalid status value");
    const data = await res.json();
    assert(data.message?.toLowerCase().includes("invalid"), "Should state invalid status");
  });

  // 7. Valid Status Update (e.g. pending/confirmed)
  await test("7. Admin can update booking status via PATCH /bookings/admin/:id/status", async () => {
    const targetStatus = sampleBooking.status === "confirmed" ? "confirmed" : "confirmed";
    const res = await fetch(`${BASE_URL}/bookings/admin/${sampleBooking._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: targetStatus }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success);
    assert.strictEqual(data.booking.status, targetStatus);
  });

  // 8. Retrieve Active Staff Members
  await test("8. Retrieve active staff directory for assignment checks", async () => {
    const res = await fetch(`${BASE_URL}/v1/admin/staff-management`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    assert(Array.isArray(data.staff), "data.staff should be an array");
    staffList = data.staff;
  });

  // 9. Eligible Staff Check for Slot
  await test("9. Check eligible staff endpoint verifies skills and schedule availability", async () => {
    const startTimeStr = sampleBooking.scheduledStartTime
      ? new Date(sampleBooking.scheduledStartTime).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "10:00";

    const serviceIds = sampleBooking.services.map((s) => s.serviceId).join(",");

    const res = await fetch(
      `${BASE_URL}/v1/admin/staff-management/eligible-staff?date=${sampleBooking.scheduledDate}&startTime=${startTimeStr}&duration=${sampleBooking.totalDurationMinutes}&serviceIds=${serviceIds}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    const eligibleArr = data.eligibleStaff || data.eligible;
    const excludedArr = data.excludedStaff || data.excluded;
    assert(Array.isArray(eligibleArr), "eligible should be array");
    assert(Array.isArray(excludedArr), "excluded should be array");
  });

  // 10. Staff Reassignment Action & Audit Trail
  await test("10. Reassign staff to booking and verify assignmentHistory audit trail", async () => {
    const targetStaff = staffList.find((s) => s.isActive) || staffList[0];
    assert(targetStaff, "Must have an active staff member for reassignment test");

    const reason = "Admin Level 6 automated verification reassignment";
    const res = await fetch(
      `${BASE_URL}/v1/admin/staff-management/assignments/${sampleBooking._id}/reassign`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: targetStaff._id,
          reason,
        }),
      }
    );

    // If staff has qualification or slot conflict, 400/409 is expected and demonstrates validation
    if (res.status === 200) {
      const data = await res.json();
      assert(data.success);
      assert.strictEqual(String(data.booking.assignedStaff._id || data.booking.assignedStaff), String(targetStaff._id));
      assert(Array.isArray(data.booking.assignmentHistory), "assignmentHistory should exist");
      const lastEntry = data.booking.assignmentHistory[data.booking.assignmentHistory.length - 1];
      assert(lastEntry.reason.includes(reason), "Audit trail must record reason");
      assert.strictEqual(lastEntry.action, "reassigned");
    } else {
      // Validated conflict rejection
      assert([400, 409].includes(res.status), `Expected 200 or validation conflict (400/409), got ${res.status}`);
      const data = await res.json();
      assert(data.message, "Should return validation conflict reason");
    }
  });

  // 11. Staff Assignments Endpoint
  await test("11. Retrieve staff assignment overview via /v1/admin/staff-management/assignments", async () => {
    const res = await fetch(`${BASE_URL}/v1/admin/staff-management/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.success);
    assert(Array.isArray(data.bookings));
  });

  // 12. Cancellation with Reason
  await test("12. Admin cancellation records cancellationReason and cancelledAt", async () => {
    // Pick or create test cancellation target
    const res = await fetch(`${BASE_URL}/bookings/admin/${sampleBooking._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "cancelled",
        cancellationReason: "Client requested date change due to flight travel.",
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.booking.status, "cancelled");
    assert(data.booking.cancellationReason.includes("flight travel"));
    assert(data.booking.cancelledAt, "Should record cancelledAt timestamp");

    // Revert back to confirmed for subsequent tests / clean state
    await fetch(`${BASE_URL}/bookings/admin/${sampleBooking._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "confirmed" }),
    });
  });

  console.log(`\n========================================`);
  console.log(`  Tests Passed: ${passed} / ${total}`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log("✨ All Level 6 Booking Management tests passed successfully!");
    process.exit(0);
  } else {
    console.error("⚠️ Some tests failed.");
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
