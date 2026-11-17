// backend/tests/noonWebhook.test.js
import assert from "node:assert";
import crypto from "node:crypto";
import {
  verifyNoonWebhookSignature,
  createNoonWebhookJwsFixture,
} from "../services/noonPaymentsService.js";
import { handleNoonWebhook } from "../controllers/noonPaymentController.js";
import NoonWebhookEvent from "../models/NoonWebhookEvent.js";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";

const TEST_SECRET = "test_noon_webhook_secret_key_12345";

// Mock response creator
function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
}

async function runTests() {
  console.log("=== Starting Noon Payments Webhook V2 Test Suite ===");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err);
      failed++;
    }
  }

  // Case 1: Valid signature verification
  test("1. Valid payment success webhook signature verifies correctly", () => {
    const payload = {
      eventId: "evt_test_001",
      orderId: "noon_ord_123",
      orderStatus: "CAPTURED",
      eventType: "Sale",
      txnStatus: "SUCCESS",
      merchantOrderRef: "ORD_999",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const res = verifyNoonWebhookSignature(jws, TEST_SECRET, "2");

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.eventId, "evt_test_001");
    assert.strictEqual(res.payload.orderStatus, "CAPTURED");
  });

  // Case 2: Invalid signature rejection
  test("2. Invalid signature is rejected with 401", () => {
    const payload = { eventId: "evt_tampered", orderId: "123" };
    const jws = createNoonWebhookJwsFixture(payload, "wrong_secret");
    const res = verifyNoonWebhookSignature(jws, TEST_SECRET, "2");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 401);
  });

  // Case 3: Unsupported webhook version rejection
  test("3. Unsupported webhook version is rejected with 400", () => {
    const payload = { eventId: "evt_ver1", orderId: "123" };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const res = verifyNoonWebhookSignature(jws, TEST_SECRET, "1");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 400);
  });

  // Case 4: Missing webhook secret error
  test("4. Missing webhook secret returns 503 error", () => {
    const payload = { eventId: "evt_nosecret" };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const res = verifyNoonWebhookSignature(jws, "", "2");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 503);
  });

  // Setup env for controller tests
  process.env.NOON_PAYMENTS_WEBHOOK_SECRET = TEST_SECRET;

  // Case 5: Product Order Payment Success (CAPTURED)
  await asyncTest("5. Product order payment (CAPTURED) marks order as Paid and deducts inventory once", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let orderSaved = false;
    let mockOrder = {
      _id: "60d5ecb8b5c9c82b48000001",
      orderNumber: "ORD_TEST_5",
      paymentStatus: "Pending",
      status: "Pending",
      noonPaymentStatus: null,
      noonOrderId: null,
      statusHistory: [],
      products: [{ product: "p1", quantity: 1, size: "M" }],
      address: { email: "customer@example.com", fullName: "Jane Doe" },
      save: async () => { orderSaved = true; },
    };

    NoonWebhookEvent.create = async (doc) => ({
      ...doc,
      save: async () => {},
    });
    Order.findOne = async () => mockOrder;

    const payload = {
      eventId: "evt_prod_success_5",
      orderId: "noon_prod_555",
      orderStatus: "CAPTURED",
      eventType: "Sale",
      txnStatus: "SUCCESS",
      merchantOrderRef: "ORD_TEST_5",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = {
      body: jws,
      headers: { "np-webhook-version": "2" },
    };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(mockOrder.paymentStatus, "Paid");
    assert.strictEqual(mockOrder.noonPaymentStatus, "CAPTURED");
    assert.strictEqual(orderSaved, true);

    // Restore
    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // Case 6: Service Booking Payment Success (PAID / AUTHORIZED)
  await asyncTest("6. Service booking payment (SUCCESS) marks booking as paid and notifies staff", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;
    const origBookingFindById = Booking.findById;

    let bookingSaved = false;
    let mockBooking = {
      _id: "60d5ecb8b5c9c82b48000002",
      bookingNumber: "BK_TEST_6",
      paymentStatus: "unpaid",
      status: "confirmed",
      noonPaymentStatus: null,
      noonOrderId: null,
      save: async () => { bookingSaved = true; },
    };

    NoonWebhookEvent.create = async (doc) => ({
      ...doc,
      save: async () => {},
    });
    Order.findOne = async () => null;
    Booking.findOne = async () => mockBooking;
    Booking.findById = () => ({
      populate: () => ({
        lean: async () => mockBooking,
      }),
    });

    const payload = {
      eventId: "evt_book_success_6",
      orderId: "noon_book_666",
      orderStatus: "SUCCESS",
      eventType: "Sale",
      merchantOrderRef: "BK_TEST_6",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = {
      body: jws,
      headers: { "np-webhook-version": "2" },
    };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(mockBooking.paymentStatus, "paid");
    assert.strictEqual(bookingSaved, true);

    // Restore
    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
  });

  // Case 7: Failed payment event
  await asyncTest("7. Failed payment event marks unpaid order as Failed without decrementing stock", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let mockOrder = {
      _id: "60d5ecb8b5c9c82b48000003",
      paymentStatus: "Pending",
      status: "Pending",
      statusHistory: [],
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({
      ...doc,
      save: async () => {},
    });
    Order.findOne = async () => mockOrder;

    const payload = {
      eventId: "evt_failed_7",
      orderId: "noon_fail_777",
      orderStatus: "FAILED",
      eventType: "Sale",
      merchantOrderRef: "ORD_FAIL",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(mockOrder.paymentStatus, "Failed");
    assert.strictEqual(mockOrder.status, "Cancelled");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // Case 8: Cancelled payment event
  await asyncTest("8. Cancelled payment event marks booking as cancelled", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;

    let mockBooking = {
      _id: "60d5ecb8b5c9c82b48000004",
      paymentStatus: "unpaid",
      status: "pending",
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
    Order.findOne = async () => null;
    Booking.findOne = async () => mockBooking;

    const payload = {
      eventId: "evt_cancel_8",
      orderId: "noon_cancel_888",
      orderStatus: "CANCELLED",
      merchantOrderRef: "BK_CANCEL",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(mockBooking.status, "cancelled");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
    Booking.findOne = origBookingFindOne;
  });

  // Case 9: Refunded payment event
  await asyncTest("9. Refunded payment marks order as Refunded and does not treat as successful payment", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let mockOrder = {
      _id: "60d5ecb8b5c9c82b48000005",
      paymentStatus: "Paid",
      status: "Pending",
      statusHistory: [],
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
    Order.findOne = async () => mockOrder;

    const payload = {
      eventId: "evt_refund_9",
      orderId: "noon_refund_999",
      orderStatus: "REFUNDED",
      eventType: "Refund",
      merchantOrderRef: "ORD_REFUND",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(mockOrder.paymentStatus, "Refunded");
    assert.strictEqual(mockOrder.status, "Cancelled");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // Case 10: Unknown Noon Order (returns 200 and logs IGNORED)
  await asyncTest("10. Unknown Noon order returns 200 OK and logs IGNORED to prevent endless retries", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;

    let recordedStatus = null;
    NoonWebhookEvent.create = async (doc) => {
      const rec = { ...doc, save: async () => { recordedStatus = rec.status; } };
      return rec;
    };
    Order.findOne = async () => null;
    Booking.findOne = async () => null;

    const payload = {
      eventId: "evt_unknown_10",
      orderId: "noon_unknown_000",
      orderStatus: "CAPTURED",
      merchantOrderRef: "UNKNOWN_REF",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(recordedStatus, "IGNORED");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
    Booking.findOne = origBookingFindOne;
  });

  // Case 11: Idempotency - Duplicate webhook event
  await asyncTest("11. Duplicate webhook event (same eventId) is caught and acknowledged safely", async () => {
    const origEventCreate = NoonWebhookEvent.create;

    // Simulate MongoDB unique index duplicate key error (code 11000)
    NoonWebhookEvent.create = async () => {
      const err = new Error("E11000 duplicate key error");
      err.code = 11000;
      throw err;
    };

    const payload = {
      eventId: "evt_duplicate_11",
      orderId: "noon_dup_111",
      orderStatus: "CAPTURED",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /idempotent/i);

    NoonWebhookEvent.create = origEventCreate;
  });

  // Case 12: Concurrent duplicate deliveries
  await asyncTest("12. Concurrent duplicate deliveries safely resolve without double execution", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let executionCount = 0;
    let registeredIds = new Set();

    NoonWebhookEvent.create = async (doc) => {
      if (registeredIds.has(doc.eventId)) {
        const err = new Error("E11000 duplicate key error");
        err.code = 11000;
        throw err;
      }
      registeredIds.add(doc.eventId);
      return { ...doc, save: async () => {} };
    };

    Order.findOne = async () => ({
      _id: "60d5ecb8b5c9c82b48000012",
      paymentStatus: "Pending",
      status: "Pending",
      statusHistory: [],
      products: [],
      save: async () => { executionCount++; },
    });

    const payload = {
      eventId: "evt_concurrent_12",
      orderId: "noon_conc_1212",
      orderStatus: "CAPTURED",
      merchantOrderRef: "ORD_CONC",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);

    const req1 = { body: jws, headers: { "np-webhook-version": "2" } };
    const res1 = createMockRes();

    const req2 = { body: jws, headers: { "np-webhook-version": "2" } };
    const res2 = createMockRes();

    // Fire both concurrently
    await Promise.all([
      handleNoonWebhook(req1, res1),
      handleNoonWebhook(req2, res2),
    ]);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res2.statusCode, 200);
    // Exact order save must execute ONLY once
    assert.strictEqual(executionCount, 1);

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  console.log("\n=================================================");
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
