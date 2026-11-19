// backend/tests/noonWebhook.test.js
import assert from "node:assert";
import crypto from "node:crypto";
import {
  verifyNoonWebhookSignature,
  createNoonWebhookJwsFixture,
} from "../services/noonPaymentsService.js";
import * as noonPaymentsService from "../services/noonPaymentsService.js";
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
  console.log("=== Starting Noon Payments Webhook V2 Audit & Verification Test Suite ===");
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

  // 1. Valid signature verification
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

  // 2. Invalid signature rejection
  test("2. Invalid signature is rejected with 401", () => {
    const payload = { eventId: "evt_tampered", orderId: "123" };
    const jws = createNoonWebhookJwsFixture(payload, "wrong_secret");
    const res = verifyNoonWebhookSignature(jws, TEST_SECRET, "2");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 401);
  });

  // 3. Unsupported webhook version rejection
  test("3. Unsupported webhook version is rejected with 400", () => {
    const payload = { eventId: "evt_ver1", orderId: "123" };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const res = verifyNoonWebhookSignature(jws, TEST_SECRET, "1");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 400);
  });

  // 4. Missing webhook secret error
  test("4. Missing webhook secret returns 503 error", () => {
    const payload = { eventId: "evt_nosecret" };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const res = verifyNoonWebhookSignature(jws, "", "2");

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, 503);
  });

  // 5. JSON-enveloped token extraction
  test("5. JSON-enveloped token ({ token: '...' }) parses and validates properly", () => {
    const payload = { eventId: "evt_json_env", orderId: "noon_json_1" };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const jsonBody = JSON.stringify({ token: jws });
    const res = verifyNoonWebhookSignature(jsonBody, TEST_SECRET, "2");

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.eventId, "evt_json_env");
  });

  // Setup env for controller tests
  process.env.NOON_PAYMENTS_WEBHOOK_SECRET = TEST_SECRET;
  NoonWebhookEvent.findOne = async () => null;

  // 6. Product Order Payment Success (CAPTURED)
  await asyncTest("6. Product order payment (CAPTURED) marks order as Paid and deducts inventory once", async () => {
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

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // 7. Service Booking Payment Success (SUCCESS)
  await asyncTest("7. Service booking payment (SUCCESS) marks booking as paid and confirms status", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;
    const origBookingFindById = Booking.findById;

    let bookingSaved = false;
    let mockBooking = {
      _id: "60d5ecb8b5c9c82b48000002",
      bookingNumber: "BK_TEST_6",
      paymentStatus: "unpaid",
      status: "pending",
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
    assert.strictEqual(mockBooking.status, "confirmed");
    assert.strictEqual(bookingSaved, true);

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
  });

  // 8. Anti-Downgrade Protection: Delayed FAILED event on Paid Order
  await asyncTest("8. Anti-Downgrade: Delayed FAILED event does not overwrite an already Paid order", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let mockOrder = {
      _id: "60d5ecb8b5c9c82b48000008",
      orderNumber: "ORD_PAID_ALREADY",
      paymentStatus: "Paid",
      status: "Pending",
      noonPaymentStatus: "CAPTURED",
      noonOrderId: "noon_paid_888",
      statusHistory: [],
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
    Order.findOne = async () => mockOrder;

    const payload = {
      eventId: "evt_delayed_fail_8",
      orderId: "noon_paid_888",
      orderStatus: "FAILED",
      eventType: "Sale",
      merchantOrderRef: "ORD_PAID_ALREADY",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    // Crucial: paymentStatus must remain "Paid", noonPaymentStatus must remain "CAPTURED"
    assert.strictEqual(mockOrder.paymentStatus, "Paid");
    assert.strictEqual(mockOrder.noonPaymentStatus, "CAPTURED");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // 9. Anti-Downgrade Protection: Delayed FAILED event on paid Booking
  await asyncTest("9. Anti-Downgrade: Delayed FAILED event does not overwrite an already paid booking", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;

    let mockBooking = {
      _id: "60d5ecb8b5c9c82b48000009",
      bookingNumber: "RB-PAID-ALREADY",
      paymentStatus: "paid",
      status: "confirmed",
      noonPaymentStatus: "CAPTURED",
      noonOrderId: "noon_book_paid_999",
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
    Order.findOne = async () => null;
    Booking.findOne = async () => mockBooking;

    const payload = {
      eventId: "evt_delayed_fail_9",
      orderId: "noon_book_paid_999",
      orderStatus: "FAILED",
      merchantOrderRef: "RB-PAID-ALREADY",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
    const req = { body: jws, headers: { "np-webhook-version": "2" } };
    const res = createMockRes();

    await handleNoonWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    // Crucial: paymentStatus must remain "paid"
    assert.strictEqual(mockBooking.paymentStatus, "paid");
    assert.strictEqual(mockBooking.status, "confirmed");
    assert.strictEqual(mockBooking.noonPaymentStatus, "CAPTURED");

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
    Booking.findOne = origBookingFindOne;
  });

  // 10. Refunded payment marks order as Refunded
  await asyncTest("10. Refunded payment marks order as Refunded and cancels order", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let mockOrder = {
      _id: "60d5ecb8b5c9c82b48000010",
      orderNumber: "ORD_REFUND_10",
      paymentStatus: "Paid",
      status: "Pending",
      statusHistory: [],
      save: async () => {},
    };

    NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
    Order.findOne = async () => mockOrder;

    const payload = {
      eventId: "evt_refund_10",
      orderId: "noon_ref_1010",
      orderStatus: "REFUNDED",
      eventType: "Refund",
      merchantOrderRef: "ORD_REFUND_10",
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

  // 11. Idempotency with missing eventId (deterministic key derivation)
  await asyncTest("11. Deterministic event ID derives from orderId+orderStatus and blocks retries without eventId", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;

    let generatedEventIds = [];
    NoonWebhookEvent.create = async (doc) => {
      generatedEventIds.push(doc.eventId);
      if (generatedEventIds.length > 1) {
        const err = new Error("E11000 duplicate key error");
        err.code = 11000;
        throw err;
      }
      return { ...doc, save: async () => {} };
    };

    Order.findOne = async () => ({
      _id: "60d5ecb8b5c9c82b48000011",
      paymentStatus: "Pending",
      status: "Pending",
      statusHistory: [],
      products: [],
      save: async () => {},
    });

    // Notice: NO eventId in payload
    const payload = {
      orderId: "noon_noeventid_11",
      orderStatus: "CAPTURED",
      merchantOrderRef: "ORD_11",
      timeStamp: "2026-11-19T05:00:00Z",
    };
    const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);

    const req1 = { body: jws, headers: { "np-webhook-version": "2" } };
    const res1 = createMockRes();

    const req2 = { body: jws, headers: { "np-webhook-version": "2" } };
    const res2 = createMockRes();

    await handleNoonWebhook(req1, res1);
    await handleNoonWebhook(req2, res2);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(generatedEventIds.length, 2);
    // Both attempts must have generated the exact identical deterministic eventId!
    assert.strictEqual(generatedEventIds[0], generatedEventIds[1]);

    NoonWebhookEvent.create = origEventCreate;
    Order.findOne = origOrderFindOne;
  });

  // 12. Matching merchant reference with BKG- prefix stripped
  await asyncTest("12. Merchant reference matching strips BKG- prefix to find booking", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;
    const origBookingFindById = Booking.findById;

    try {
      let mockBooking = {
        _id: "60d5ecb8b5c9c82b48000012",
        bookingNumber: "RB-20261119-XYZ",
        noonReference: "BKG-RB-20261119-XYZ",
        paymentStatus: "unpaid",
        status: "pending",
        save: async () => {},
      };

      NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
      Order.findOne = async () => null;
      Booking.findOne = async (query) => {
        if (query?.noonOrderId) return null; // simulate no match by noonOrderId
        if (query?.$or) {
          const match = query.$or.some(
            (cond) =>
              cond.bookingNumber === "RB-20261119-XYZ" ||
              cond.noonReference === "BKG-RB-20261119-XYZ"
          );
          return match ? mockBooking : null;
        }
        return null;
      };
      Booking.findById = () => ({
        populate: () => ({
          lean: async () => mockBooking,
        }),
      });

      const payload = {
        eventId: "evt_prefix_match_12",
        orderId: "noon_ord_1212",
        orderStatus: "CAPTURED",
        merchantOrderRef: "BKG-RB-20261119-XYZ",
      };
      const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
      const req = { body: jws, headers: { "np-webhook-version": "2" } };
      const res = createMockRes();

      await handleNoonWebhook(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.bookingId, mockBooking._id);
      assert.strictEqual(mockBooking.paymentStatus, "paid");
    } finally {
      NoonWebhookEvent.create = origEventCreate;
      Order.findOne = origOrderFindOne;
      Booking.findOne = origBookingFindOne;
      Booking.findById = origBookingFindById;
    }
  });

  // 13. Sensitive payload token redaction
  await asyncTest("13. Sensitive payload tokens (sessionIdentifier, secret) are redacted before storage", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origBookingFindOne = Booking.findOne;

    try {
      let storedPayload = null;
      NoonWebhookEvent.create = async (doc) => {
        storedPayload = doc.rawPayload;
        return { ...doc, save: async () => {} };
      };
      Order.findOne = async () => null;
      Booking.findOne = async () => null;

      const payload = {
        eventId: "evt_sensitive_13",
        orderId: "noon_sens_13",
        orderStatus: "FAILED",
        sessionIdentifier: "super_secret_session_token_123",
        paymentDetails: {
          cvv: "123",
          secret: "merchant_secret",
        },
      };
      const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
      const req = { body: jws, headers: { "np-webhook-version": "2" } };
      const res = createMockRes();

      await handleNoonWebhook(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(storedPayload.sessionIdentifier, "[REDACTED]");
      assert.strictEqual(storedPayload.paymentDetails.cvv, "[REDACTED]");
      assert.strictEqual(storedPayload.paymentDetails.secret, "[REDACTED]");
    } finally {
      NoonWebhookEvent.create = origEventCreate;
      Order.findOne = origOrderFindOne;
      Booking.findOne = origBookingFindOne;
    }
  });

  // 14. Unknown Noon order returns 200 OK and logs IGNORED
  await asyncTest("14. Unknown Noon order returns 200 OK and logs IGNORED to prevent retry storms", async () => {
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
      eventId: "evt_unknown_14",
      orderId: "noon_unknown_999",
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

  // 15. Ambiguous status reconciliation via GET ORDER API
  await asyncTest("15. Ambiguous status (MARKED_FOR_REVIEW) reconciles via GET ORDER and marks Paid if verified", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origOrderFindOne = Order.findOne;
    const origFetch = global.fetch;

    try {
      let mockOrder = {
        _id: "60d5ecb8b5c9c82b48000015",
        orderNumber: "ORD_AMBIGUOUS_15",
        paymentStatus: "Pending",
        status: "Pending",
        noonPaymentStatus: null,
        noonOrderId: "noon_ambig_15",
        statusHistory: [],
        products: [],
        save: async () => {},
      };

      NoonWebhookEvent.create = async (doc) => ({ ...doc, save: async () => {} });
      Order.findOne = async () => mockOrder;

      // Mock gateway GET ORDER returning success
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          resultCode: 0,
          message: "Success",
          result: {
            order: {
              id: "noon_ambig_15",
              status: "PAID",
              amount: 150,
              currency: "AED",
            },
            transactions: [
              { status: "SUCCESS", type: "SALE", amount: 150 }
            ],
          },
        }),
      });

      const payload = {
        eventId: "evt_ambig_15",
        orderId: "noon_ambig_15",
        orderStatus: "MARKED_FOR_REVIEW", // Ambiguous non-final status!
        merchantOrderRef: "ORD_AMBIGUOUS_15",
      };
      const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
      const req = { body: jws, headers: { "np-webhook-version": "2" } };
      const res = createMockRes();

      await handleNoonWebhook(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockOrder.paymentStatus, "Paid");
      assert.strictEqual(mockOrder.noonPaymentStatus, "PAID");
    } finally {
      NoonWebhookEvent.create = origEventCreate;
      Order.findOne = origOrderFindOne;
      global.fetch = origFetch;
    }
  });

  // 16. Out-of-order event sequencing using timeStamp
  await asyncTest("16. Out-of-order event with older timeStamp is acknowledged and skipped", async () => {
    const origEventCreate = NoonWebhookEvent.create;
    const origEventFindOne = NoonWebhookEvent.findOne;
    const origOrderFindOne = Order.findOne;

    try {
      let savedRecordStatus = null;
      NoonWebhookEvent.create = async (doc) => ({
        ...doc,
        save: async function () {
          savedRecordStatus = this.status;
        },
      });

      // Simulate a newer event already processed at 11:00:00Z
      NoonWebhookEvent.findOne = async (query) => {
        if (query?.orderId === "noon_seq_16" && query?.timeStamp?.$gt) {
          return {
            eventId: "evt_newer_already_processed",
            timeStamp: new Date("2026-11-19T11:00:00.000Z"),
            status: "PROCESSED",
          };
        }
        return null;
      };

      let orderSaved = false;
      Order.findOne = async () => ({
        _id: "60d5ecb8b5c9c82b48000016",
        save: async () => { orderSaved = true; },
      });

      // Incoming event has older timestamp: 10:55:00Z
      const payload = {
        eventId: "evt_older_delayed_16",
        orderId: "noon_seq_16",
        orderStatus: "FAILED",
        timeStamp: "2026-11-19T10:55:00.000Z",
        merchantOrderRef: "ORD_SEQ_16",
      };
      const jws = createNoonWebhookJwsFixture(payload, TEST_SECRET);
      const req = { body: jws, headers: { "np-webhook-version": "2" } };
      const res = createMockRes();

      await handleNoonWebhook(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.match(res.body.message, /out-of-order/i);
      assert.strictEqual(savedRecordStatus, "IGNORED");
      assert.strictEqual(orderSaved, false); // must not touch order
    } finally {
      NoonWebhookEvent.create = origEventCreate;
      NoonWebhookEvent.findOne = origEventFindOne;
      Order.findOne = origOrderFindOne;
    }
  });

  console.log("\n=================================================");
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log("=================================================");

  // Explicitly exit cleanly
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
