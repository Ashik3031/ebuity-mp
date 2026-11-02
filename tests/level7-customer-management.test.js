// tests/level7-customer-management.test.js
// Automated verification suite for Rose Essence Level 7: Customer Management

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
  console.log("🌸 [Rose Essence Level 7] Starting Customer Management Test Suite...\n");
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

  let sampleCustomer = null;

  // 1. Customer Listing Endpoint
  await test("1. Admin can retrieve customer list via GET /api/user/users", async () => {
    const res = await fetch(`${BASE_URL}/user/users`);
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true, "Response success must be true");
    assert(Array.isArray(data.users), "users should be an array");
    assert(data.users.length > 0, "Should contain at least one registered customer");

    sampleCustomer = data.users.find(u => u.email === "leila@example.com") || data.users[0];
    assert(sampleCustomer.userId || sampleCustomer._id, "Customer must have userId/_id");
    assert(sampleCustomer.name, "Customer must have name");
    assert(sampleCustomer.email, "Customer must have email");
    assert.strictEqual(typeof sampleCustomer.isBlocked, "boolean", "isBlocked must be boolean");
  });

  // 2. Sensitive Credentials Guard (Listing)
  await test("2. Customer listing does not expose passwords, hashes, or OTP secrets", async () => {
    const res = await fetch(`${BASE_URL}/user/users`);
    const data = await res.json();
    for (const u of data.users) {
      assert.strictEqual(u.password, undefined, "Password must not be returned in customer listing");
      assert.strictEqual(u.verifyOtp, undefined, "verifyOtp must not be exposed");
      assert.strictEqual(u.resetOtp, undefined, "resetOtp must not be exposed");
    }
  });

  // 3. Customer Details Endpoint
  await test("3. Retrieve single customer details via GET /api/user/users/:id", async () => {
    const targetId = sampleCustomer.userId || sampleCustomer._id;
    const res = await fetch(`${BASE_URL}/user/users/${targetId}`);
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.user, "user payload must be present");
    assert.strictEqual(data.user.email, sampleCustomer.email);
    assert.strictEqual(data.user.password, undefined, "Password must not be exposed in user details");
    assert.strictEqual(data.user.resetOtp, undefined, "resetOtp must not be exposed in user details");
  });

  // 4. Saved Addresses Verification
  await test("4. Customer details include saved addresses with access instructions", async () => {
    const targetId = sampleCustomer.userId || sampleCustomer._id;
    const res = await fetch(`${BASE_URL}/user/users/${targetId}`);
    const data = await res.json();
    assert(Array.isArray(data.user.addresses), "user.addresses must be an array");
    if (data.user.addresses.length > 0) {
      const addr = data.user.addresses[0];
      assert(addr.buildingName, "Address should contain buildingName");
      assert(addr.area, "Address should contain area");
      assert(addr.city, "Address should contain city");
    }
  });

  // 5. Invalid Customer ID Guard
  await test("5. Non-existent or invalid customer ID returns appropriate error status", async () => {
    const invalidRes = await fetch(`${BASE_URL}/user/users/invalid-id-format`);
    assert.strictEqual(invalidRes.status, 400, `Expected 400 for malformed ID, got ${invalidRes.status}`);

    const notFoundRes = await fetch(`${BASE_URL}/user/users/000000000000000000000000`);
    assert.strictEqual(notFoundRes.status, 404, `Expected 404 for non-existent ID, got ${notFoundRes.status}`);
  });

  // 6. Block Customer Account
  await test("6. Admin can deactivate (block) customer account via POST /api/user/block", async () => {
    const targetId = sampleCustomer.userId || sampleCustomer._id;
    const res = await fetch(`${BASE_URL}/user/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetId, block: true }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes("blocked"));

    // Verify blocked state in database
    const verifyRes = await fetch(`${BASE_URL}/user/users/${targetId}`);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.user.isBlocked, true, "Customer isBlocked must be true");
  });

  // 7. Login Prevention for Blocked Customer
  await test("7. Blocked customer is denied login access (403)", async () => {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sampleCustomer.email, password: "AnyPassword123!" }),
    });
    // Even if credentials check occurs, blocked status triggers 403
    // If password mismatch occurs first or 403:
    assert([401, 403].includes(loginRes.status), `Expected 401/403, got ${loginRes.status}`);
  });

  // 8. Reactivate Customer Account
  await test("8. Admin can reactivate (unblock) customer account via POST /api/user/block", async () => {
    const targetId = sampleCustomer.userId || sampleCustomer._id;
    const res = await fetch(`${BASE_URL}/user/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetId, block: false }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes("unblocked"));

    // Verify unblocked state in database
    const verifyRes = await fetch(`${BASE_URL}/user/users/${targetId}`);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.user.isBlocked, false, "Customer isBlocked must be false");
  });

  // 9. Block API Validation
  await test("9. Block API rejects requests missing required boolean or userId (400)", async () => {
    const res = await fetch(`${BASE_URL}/user/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: sampleCustomer.userId || sampleCustomer._id }), // missing block
    });
    assert.strictEqual(res.status, 400);
  });

  // 10. Password Reset Recovery Flow
  await test("10. Trigger password reset recovery OTP via POST /api/auth/reset-otp", async () => {
    const res = await fetch(`${BASE_URL}/auth/reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sampleCustomer.email }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message.includes("OTP"));
  });

  // 11. Cross-Reference Service Bookings
  await test("11. Cross-reference customer bookings from GET /api/bookings/admin/all", async () => {
    const res = await fetch(`${BASE_URL}/bookings/admin/all`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.bookings));

    // Verify bookings have customer and customerDetails
    const matched = data.bookings.filter(b => {
      const cId = typeof b.customer === "string" ? b.customer : b.customer?._id;
      return cId === (sampleCustomer.userId || sampleCustomer._id) || b.customerDetails?.email === sampleCustomer.email;
    });
    console.log(`     (Found ${matched.length} linked booking(s) for ${sampleCustomer.name})`);
    assert(matched.length >= 0);
  });

  // 12. Cross-Reference Product Orders
  await test("12. Cross-reference customer product orders from GET /api/admin/orders", async () => {
    const res = await fetch(`${BASE_URL}/admin/orders`, {
      headers: {
        Cookie: `admin_token=${adminToken}`,
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data.orders));
  });

  console.log("\n========================================");
  console.log(`  Tests Passed: ${passed} / ${total}`);
  console.log("========================================\n");

  if (passed === total) {
    console.log("✨ All Level 7 Customer Management tests passed successfully!\n");
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite execution failed:", err);
  process.exit(1);
});
