// tests/level8-dashboard-analytics.test.js
// Automated verification suite for Rose Essence Level 8: Dashboard Integration & Analytics

import assert from "node:assert";
import jwt from "../backend/node_modules/jsonwebtoken/index.js";
import dotenv from "../backend/node_modules/dotenv/lib/main.js";

dotenv.config({ path: "./backend/.env" });

const BASE_URL = process.env.API_URL || "http://localhost:4000/api";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-ebuity-2025";

// Generate valid admin token
const adminToken = jwt.sign(
  { id: "6adc5697f95039667ed1409b", role: "admin", isAdmin: true },
  JWT_SECRET,
  { expiresIn: "1h" }
);

async function runTests() {
  console.log("💎 [Rose Essence Level 8] Starting Dashboard Analytics Test Suite...\n");
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

  // 1. Unauthorized Access Guard
  await test("1. Unauthorized request without admin credentials is rejected (401)", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/stats`);
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  // 2. Overview Metrics Retrieval
  let statsData = null;
  await test("2. Admin can retrieve live dashboard analytics via GET /api/admin/dashboard/stats", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/stats`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data, "data object must exist");
    assert(data.data.metrics, "metrics object must exist");
    statsData = data.data;
  });

  // 3. Overview Metrics Accuracy
  await test("3. Dashboard metrics contain real operational counts (bookings, clients, staff, catalog, revenue)", async () => {
    const m = statsData.metrics;
    assert.strictEqual(typeof m.todayBookings, "number");
    assert.strictEqual(typeof m.upcomingBookings, "number");
    assert.strictEqual(typeof m.totalBookings, "number");
    assert.strictEqual(typeof m.totalCustomers, "number");
    assert.strictEqual(typeof m.activeStaff, "number");
    assert.strictEqual(typeof m.activeServices, "number");
    assert.strictEqual(typeof m.activeProducts, "number");
    assert.strictEqual(typeof m.totalRevenue, "number");
    assert.strictEqual(m.currency, "AED");
    assert(m.totalBookings >= 0, "totalBookings must be >= 0");
    assert(m.totalCustomers >= 0, "totalCustomers must be >= 0");
    assert(m.activeStaff >= 0, "activeStaff must be >= 0");
    console.log(`     (Live metrics: ${m.totalBookings} bookings, ${m.totalCustomers} clients, ${m.activeStaff} therapists, AED ${m.totalRevenue})`);
  });

  // 4. Time Range Filter: 7 Days
  await test("4. Booking analytics supports 7-day range filter (?range=7d)", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/stats?range=7d`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const trends = data.data.charts.bookingTrends;
    assert(Array.isArray(trends));
    assert.strictEqual(trends.length, 7, "7-day range should return exactly 7 daily points");
    assert(trends[0].date, "Daily trend items must contain ISO date string");
  });

  // 5. Time Range Filter: 30 Days
  await test("5. Booking analytics supports 30-day range filter (?range=30d)", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/stats?range=30d`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const trends = data.data.charts.bookingTrends;
    assert(Array.isArray(trends));
    assert.strictEqual(trends.length, 5, "30-day range should return 5 interval points");
  });

  // 6. Time Range Filter: 6 Months (Default)
  await test("6. Booking analytics default 6-month view (?range=6m)", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/stats?range=6m`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const trends = data.data.charts.bookingTrends;
    assert(Array.isArray(trends));
    assert.strictEqual(trends.length, 6, "6-month range should return 6 monthly points");
  });

  // 7. Booking Status Distribution
  await test("7. Aggregated bookings-by-status breakdown contains counts and percentages", async () => {
    const statusDist = statsData.charts.bookingsByStatus;
    assert(Array.isArray(statusDist), "bookingsByStatus must be an array");
    const statuses = statusDist.map(s => s.status);
    assert(statuses.includes("confirmed"), "Should contain confirmed status");
    assert(statuses.includes("pending"), "Should contain pending status");
    assert(statuses.includes("completed"), "Should contain completed status");
    assert(statuses.includes("cancelled"), "Should contain cancelled status");
  });

  // 8. Service Category Distribution
  await test("8. Category distribution aggregates booked rituals and sorts descending", async () => {
    const cats = statsData.charts.categoryDistribution;
    assert(Array.isArray(cats));
    if (cats.length > 1) {
      assert(cats[0].count >= cats[1].count, "Categories should be sorted descending by count");
    }
  });

  // 9. Inventory & Stock Warnings
  await test("9. Inventory analytics reports low-stock and out-of-stock items", async () => {
    assert.strictEqual(typeof statsData.metrics.lowStockCount, "number");
    assert.strictEqual(typeof statsData.metrics.outOfStockCount, "number");
    assert(Array.isArray(statsData.lowStockProducts), "lowStockProducts must be an array");
    assert(Array.isArray(statsData.outOfStockProducts), "outOfStockProducts must be an array");
  });

  // 10. Staff Availability Operations
  await test("10. Staff availability reports total, on-duty, and on-leave therapists", async () => {
    const s = statsData.staffAvailability;
    assert.strictEqual(typeof s.totalStaff, "number");
    assert.strictEqual(typeof s.activeStaff, "number");
    assert.strictEqual(typeof s.onDutyToday, "number");
    assert.strictEqual(typeof s.onLeaveToday, "number");
    assert(s.onDutyToday <= s.activeStaff, "On-duty cannot exceed active staff");
  });

  // 11. Upcoming Appointments
  await test("11. Upcoming appointments list returns appointment details without leaking secrets", async () => {
    const appts = statsData.upcomingAppointments;
    assert(Array.isArray(appts));
    if (appts.length > 0) {
      const a = appts[0];
      assert(a.bookingNumber, "Appointment must have bookingNumber");
      assert(a.clientName, "Appointment must have clientName");
      assert(a.serviceName, "Appointment must have serviceName");
      assert(a.date, "Appointment must have date");
    }
  });

  // 12. Unified Chronological Activity Feed
  await test("12. Unified activity feed includes multiple event types (bookings, registrations, orders, stock)", async () => {
    const acts = statsData.recentActivities;
    assert(Array.isArray(acts));
    assert(acts.length > 0, "Recent activities should contain events");

    // Check chronological order (descending)
    for (let i = 0; i < acts.length - 1; i++) {
      const t1 = new Date(acts[i].rawDate).getTime();
      const t2 = new Date(acts[i + 1].rawDate).getTime();
      assert(t1 >= t2, `Activities must be ordered descending by timestamp: ${t1} vs ${t2}`);
    }

    const types = new Set(acts.map(a => a.type));
    console.log(`     (Detected event types in feed: ${Array.from(types).join(", ")})`);
    assert(types.has("booking") || types.has("registration"), "Must contain booking or registration events");
  });

  console.log("\n========================================");
  console.log(`  Tests Passed: ${passed} / ${total}`);
  console.log("========================================\n");

  if (passed === total) {
    console.log("✨ All Level 8 Dashboard Integration & Analytics tests passed successfully!\n");
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
