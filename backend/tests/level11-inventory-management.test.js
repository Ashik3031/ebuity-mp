import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import StockMovement from "../models/StockMovement.js";
import BackInStockSubscription from "../models/BackInStockSubscription.js";
import adminModel from "../models/adminModel.js";

const BASE_URL = "http://localhost:4000/api";

async function runInventoryTests() {
  console.log("================================================================");
  console.log("Rose Essence — Inventory & Stock Control Management Integration Tests");
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

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("  ✓ Connected to MongoDB Atlas");

  try {
    // -------------------------------------------------------------
    // Setup Admin Auth Token
    // -------------------------------------------------------------
    console.log("\n[1] Setting Up Admin Authentication");
    let testAdmin = await adminModel.findOne({ role: "admin" });
    if (!testAdmin) {
      testAdmin = await adminModel.create({
        name: "Inventory Manager",
        email: "inventory_manager@roseessence.ae",
        password: "hashedadminpassword",
        isAdmin: true,
        role: "admin",
      });
    }

    const adminToken = jwt.sign(
      { id: testAdmin._id, role: "admin", email: testAdmin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      Cookie: `admin_token=${adminToken}`,
    };

    // -------------------------------------------------------------
    // Test 1: Inventory Summary KPIs
    // -------------------------------------------------------------
    console.log("\n[2] Testing Executive Inventory Summary & Health Status");
    const summaryRes = await fetch(`${BASE_URL}/admin/inventory/summary`, {
      headers: authHeaders,
    });
    assert(summaryRes.ok, "GET /api/admin/inventory/summary returns 200 OK");
    const summaryData = await summaryRes.json();
    assert(summaryData.success === true, "Summary response success is true");
    assert(typeof summaryData.summary.totalUnits === "number", "Total units on hand calculated");
    assert(typeof summaryData.summary.totalValuation === "number", "Total inventory retail valuation calculated");
    assert(typeof summaryData.summary.lowStockCount === "number", "Low stock items counted");
    assert(typeof summaryData.summary.outOfStockCount === "number", "Out of stock items counted");
    assert(Array.isArray(summaryData.recentMovements), "Recent stock movements returned");

    console.log(`     Total Units: ${summaryData.summary.totalUnits}, Valuation: AED ${summaryData.summary.totalValuation}`);

    // -------------------------------------------------------------
    // Test 2: Inventory Catalog Listing, Filters & Search
    // -------------------------------------------------------------
    console.log("\n[3] Testing Inventory Products Table with Filters & Search");
    const listRes = await fetch(`${BASE_URL}/admin/inventory/products?limit=10`, {
      headers: authHeaders,
    });
    assert(listRes.ok, "GET /api/admin/inventory/products returns 200 OK");
    const listData = await listRes.json();
    assert(listData.success === true, "Products list returns success");
    assert(Array.isArray(listData.items) && listData.items.length > 0, "Inventory products list is populated");

    const firstProduct = listData.items[0];
    assert(typeof firstProduct.stock === "number", `Product stock level populated: ${firstProduct.stock}`);
    assert(["in_stock", "low_stock", "out_stock"].includes(firstProduct.stockStatus), `Stock status valid: ${firstProduct.stockStatus}`);

    // Search filter test
    const searchRes = await fetch(
      `${BASE_URL}/admin/inventory/products?q=${encodeURIComponent(firstProduct.name.slice(0, 5))}`,
      { headers: authHeaders }
    );
    assert(searchRes.ok, "Search query returns 200 OK");
    const searchData = await searchRes.json();
    assert(
      searchData.items.some((p) => p._id === firstProduct._id),
      "Search returns matching product"
    );

    // -------------------------------------------------------------
    // Test 3: Stock Adjustments (Add, Subtract, Set) & Audit Log
    // -------------------------------------------------------------
    console.log("\n[4] Testing Stock Adjustments with Movement Audit Trail");

    const targetProduct = await Product.findOne({ defaultStock: { $gte: 10 } });
    assert(!!targetProduct, `Target product selected: ${targetProduct.name} (Current: ${targetProduct.defaultStock})`);

    const initialStock = targetProduct.defaultStock;

    // A) Add Stock
    const addRes = await fetch(`${BASE_URL}/admin/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        productId: targetProduct._id.toString(),
        mode: "add",
        quantity: 15,
        reason: "Test Inbound Delivery",
        referenceId: "PO-TEST-001",
      }),
    });
    assert(addRes.ok, "POST /api/admin/inventory/adjust (mode: add) returns 200 OK");
    const addData = await addRes.json();
    assert(addData.newStock === initialStock + 15, `Stock incremented from ${initialStock} to ${addData.newStock}`);

    // B) Verify Movement Log
    const movementCheck = await StockMovement.findOne({
      product: targetProduct._id,
      reason: "Test Inbound Delivery",
    });
    assert(!!movementCheck, "StockMovement audit log created in database");
    assert(movementCheck.change === 15, "Movement change recorded as +15");
    assert(movementCheck.previousStock === initialStock, "Movement previousStock recorded");
    assert(movementCheck.newStock === initialStock + 15, "Movement newStock recorded");

    // C) Subtract Stock
    const subRes = await fetch(`${BASE_URL}/admin/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        productId: targetProduct._id.toString(),
        mode: "subtract",
        quantity: 5,
        reason: "Test Damaged Goods Write-off",
      }),
    });
    assert(subRes.ok, "POST /api/admin/inventory/adjust (mode: subtract) returns 200 OK");
    const subData = await subRes.json();
    assert(subData.newStock === initialStock + 10, `Stock decremented from ${initialStock + 15} to ${subData.newStock}`);

    // D) Direct Set Stock
    const setRes = await fetch(`${BASE_URL}/admin/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        productId: targetProduct._id.toString(),
        mode: "set",
        quantity: initialStock, // Reset to original
        reason: "Test Reset Cycle Count",
      }),
    });
    assert(setRes.ok, "POST /api/admin/inventory/adjust (mode: set) returns 200 OK");
    const setData = await setRes.json();
    assert(setData.newStock === initialStock, `Stock successfully reset to ${initialStock}`);

    // -------------------------------------------------------------
    // Test 4: Inbound Supplier Batch Receiving
    // -------------------------------------------------------------
    console.log("\n[5] Testing Supplier Batch Replenishment");
    const batchRes = await fetch(`${BASE_URL}/admin/inventory/receive-batch`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        batchNumber: "BATCH-TEST-2026",
        supplier: "Rose Essence Grasse Lab",
        note: "Automated replenishment batch test",
        items: [
          { productId: targetProduct._id.toString(), quantity: 10 },
        ],
      }),
    });
    assert(batchRes.ok, "POST /api/admin/inventory/receive-batch returns 200 OK");
    const batchData = await batchRes.json();
    assert(batchData.success === true, "Batch receiving success is true");
    assert(batchData.results.length === 1, "Batch items processed count is 1");

    // Verify product stock updated by batch
    const afterBatchProduct = await Product.findById(targetProduct._id);
    assert(
      afterBatchProduct.defaultStock === initialStock + 10,
      `Batch received accurately: ${afterBatchProduct.defaultStock}`
    );

    // Reset stock back to initial
    await Product.findByIdAndUpdate(targetProduct._id, { defaultStock: initialStock });

    // -------------------------------------------------------------
    // Test 5: Stock Movement Audit History Querying
    // -------------------------------------------------------------
    console.log("\n[6] Testing Stock Movement Audit Log History Retrieval");
    const movementsRes = await fetch(`${BASE_URL}/admin/inventory/movements?limit=10`, {
      headers: authHeaders,
    });
    assert(movementsRes.ok, "GET /api/admin/inventory/movements returns 200 OK");
    const movementsData = await movementsRes.json();
    assert(Array.isArray(movementsData.movements), "Movements array returned");
    assert(movementsData.total > 0, `Total logged movements: ${movementsData.total}`);

    // -------------------------------------------------------------
    // Test 6: Back-in-Stock Waitlist Management
    // -------------------------------------------------------------
    console.log("\n[7] Testing Back-in-Stock Customer Waitlist");

    // Create a test subscription
    const testSub = await BackInStockSubscription.create({
      email: "waiting_customer@example.com",
      product: targetProduct._id,
      source: "notify_button",
      active: true,
    });

    const waitlistRes = await fetch(
      `${BASE_URL}/admin/inventory/waitlist?productId=${targetProduct._id.toString()}`,
      { headers: authHeaders }
    );
    assert(waitlistRes.ok, "GET /api/admin/inventory/waitlist returns 200 OK");
    const waitlistData = await waitlistRes.json();
    assert(
      waitlistData.subscribers.some((s) => s.email === "waiting_customer@example.com"),
      "Subscribed customer appears on back-in-stock waitlist"
    );

    // Trigger manual notification run
    const notifyRes = await fetch(
      `${BASE_URL}/admin/inventory/waitlist/notify/${targetProduct._id.toString()}`,
      {
        method: "POST",
        headers: authHeaders,
      }
    );
    assert(notifyRes.ok, "POST /api/admin/inventory/waitlist/notify/:id returns 200 OK");
    const notifyData = await notifyRes.json();
    assert(notifyData.success === true, "Notification dispatch triggered successfully");

    // Clean up test subscription and test movements
    await BackInStockSubscription.deleteOne({ _id: testSub._id });
    await StockMovement.deleteMany({ referenceId: { $in: ["PO-TEST-001", "BATCH-TEST-2026"] } });
    console.log("  ✓ Test artifacts cleaned up");

    console.log("\n================================================================");
    console.log(`ALL INVENTORY TESTS PASSED! (${passed}/${total} assertions)`);
    console.log("================================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

runInventoryTests().catch((err) => {
  console.error("Inventory test execution failed:", err);
  process.exit(1);
});
