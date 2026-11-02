import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import Order from "../models/Order.js";
import userModel from "../models/userModel.js";
import adminModel from "../models/adminModel.js";
import { buildPricingSnapshot } from "../utils/pricing.util.js";

const BASE_URL = "http://localhost:4000/api";

async function runEcommerceCheckoutTests() {
  console.log("================================================================");
  console.log("Rose Essence — E-commerce Checkout & Orders (Payment Gateway Deferred)");
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

  // Connect to DB for direct validation
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("  ✓ Connected to MongoDB Atlas");

  try {
    // -------------------------------------------------------------
    // Test 1: Verify Product Catalogue and Real DB Slug Retrieval
    // -------------------------------------------------------------
    console.log("\n[1] Testing Product Catalogue & Slug Resolution");
    const catalogRes = await fetch(`${BASE_URL}/products`);
    assert(catalogRes.ok, "GET /api/products returns 200 OK");
    const catalogData = await catalogRes.json();
    assert(catalogData.items && catalogData.items.length > 0, "Catalogue contains active products");

    const sampleProduct = catalogData.items[0].product;
    const sampleSlug = sampleProduct.slug;
    assert(!!sampleSlug, `Sample product has slug: ${sampleSlug}`);

    // Lookup by slug
    const slugRes = await fetch(`${BASE_URL}/products/${sampleSlug}`);
    assert(slugRes.ok, `GET /api/products/${sampleSlug} returns 200 OK`);
    const slugData = await slugRes.json();
    assert(
      slugData.product && slugData.product._id === sampleProduct._id,
      `Slug lookup returns correct DB product without CastError (Got "${slugData.product?.name}")`
    );
    assert(
      slugData.product?.slug === sampleSlug,
      "Retrieved product matches requested slug"
    );

    // Lookup by ObjectId
    const idRes = await fetch(`${BASE_URL}/products/${sampleProduct._id}`);
    assert(idRes.ok, `GET /api/products/${sampleProduct._id} returns 200 OK`);
    const idData = await idRes.json();
    assert(
      idData.product && idData.product._id === sampleProduct._id,
      "ObjectId lookup returns correct DB product"
    );

    // -------------------------------------------------------------
    // Test 2: Server-Side Pricing Snapshot & Business Rules
    // -------------------------------------------------------------
    console.log("\n[2] Testing Server-Side Pricing Engine (UAE VAT & Free Shipping)");
    const mockSettings = {
      shipping: {
        freeOver: 199,
        methods: [{ code: "standard", label: "Standard", amount: 15, etaDaysMin: 2, etaDaysMax: 4, active: true }],
        defaultMethodCode: "standard",
      },
      tax: { rate: 5 },
    };

    // Subtotal below 199 -> standard shipping 15 + 5% VAT
    const pricingUnder199 = buildPricingSnapshot({ subtotal: 100, settings: mockSettings });
    assert(pricingUnder199.subtotal === 100, "Subtotal correctly captured as 100");
    assert(pricingUnder199.shippingFee === 15, "Standard shipping fee of 15 applied for orders under 199");
    assert(pricingUnder199.taxAmount === 5.75, "5% VAT correctly calculated on 115 taxable base (5.75)");
    assert(pricingUnder199.grandTotal === 120.75, "Grand total correctly computed as 120.75");

    // Subtotal >= 199 -> free shipping
    const pricingOver199 = buildPricingSnapshot({ subtotal: 250, settings: mockSettings });
    assert(pricingOver199.shippingFee === 0, "Free shipping applied when subtotal >= 199");
    assert(pricingOver199.taxAmount === 12.5, "5% VAT on 250 taxable base is 12.5");
    assert(pricingOver199.grandTotal === 262.5, "Grand total is 262.5");

    // -------------------------------------------------------------
    // Test 3: Create Test Customer and Auth Token
    // -------------------------------------------------------------
    console.log("\n[3] Setting Up Test Customer and Customer Token");
    let testCustomer = await userModel.findOne({ email: "testcustomer_checkout@roseessence.ae" });
    if (!testCustomer) {
      testCustomer = await userModel.create({
        name: "Test Customer Checkout",
        email: "testcustomer_checkout@roseessence.ae",
        password: "hashedpassword123",
        role: "user",
        isAccountVerified: true,
        addresses: [
          {
            label: "Home",
            fullName: "Test Customer Checkout",
            phone: "+971501234567",
            addressType: "apartment",
            unitNumber: "101",
            buildingName: "Rose Tower",
            area: "Downtown Dubai",
            city: "Dubai",
            state: "Dubai",
            isDefault: true,
          },
        ],
      });
    }

    const customerToken = jwt.sign(
      { id: testCustomer._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // -------------------------------------------------------------
    // Test 4: Inventory Decrement & Order Creation (COD Deferred)
    // -------------------------------------------------------------
    console.log("\n[4] Testing Order Creation (COD Deferred Flow) & Atomic Stock Decrement");

    // Find a product with stock >= 5
    const dbProduct = await Product.findOne({ defaultStock: { $gte: 5 } });
    assert(!!dbProduct, `Found test product with stock: ${dbProduct?.name} (Stock: ${dbProduct?.defaultStock})`);

    const initialStock = dbProduct.defaultStock;
    const orderQuantity = 2;

    // Attempt to place order without codConfirmed -> must be rejected
    const unconfirmedRes = await fetch(`${BASE_URL}/order/place`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${customerToken}`,
      },
      body: JSON.stringify({
        products: [{ productId: dbProduct._id.toString(), quantity: orderQuantity }],
        address: testCustomer.addresses[0],
        paymentMethod: "COD",
        codConfirmed: false, // NOT confirmed
      }),
    });
    assert(!unconfirmedRes.ok && unconfirmedRes.status === 400, "Unconfirmed COD order is rejected with 400");

    // Place legitimate COD order with codConfirmed: true
    const placeRes = await fetch(`${BASE_URL}/order/place`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${customerToken}`,
      },
      body: JSON.stringify({
        products: [{ productId: dbProduct._id.toString(), quantity: orderQuantity }],
        address: testCustomer.addresses[0],
        paymentMethod: "COD",
        codConfirmed: true,
      }),
    });

    assert(placeRes.ok && placeRes.status === 201, "Legitimate COD order placed successfully with 201 Created");
    const placedOrder = await placeRes.json();

    assert(placedOrder._id, `Order created with ID: ${placedOrder._id}`);
    assert(placedOrder.paymentMethod === "COD", "Payment method is COD");
    assert(placedOrder.paymentStatus === "Pending", "Payment status is 'Pending' (NOT falsely marked as paid)");
    assert(placedOrder.status === "Pending", "Order status is 'Pending'");
    assert(placedOrder.cod?.confirmed === true, "COD confirmed flag is true");
    assert(placedOrder.pricing?.grandTotal > 0, `Server pricing calculated grand total: AED ${placedOrder.pricing?.grandTotal}`);

    // Verify atomic inventory decrement in database
    const reloadedProduct = await Product.findById(dbProduct._id);
    assert(
      reloadedProduct.defaultStock === initialStock - orderQuantity,
      `Stock decremented accurately from ${initialStock} to ${reloadedProduct.defaultStock}`
    );

    // -------------------------------------------------------------
    // Test 5: Customer Order Retrieval & Authorization Isolation
    // -------------------------------------------------------------
    console.log("\n[5] Testing Customer Order Retrieval & Authorization Guard");

    // Customer can fetch own order
    const getOrderRes = await fetch(`${BASE_URL}/order/${placedOrder._id}`, {
      headers: { Cookie: `token=${customerToken}` },
    });
    assert(getOrderRes.ok, "Customer can fetch their own order details");
    const fetchedOrder = await getOrderRes.json();
    assert(fetchedOrder._id === placedOrder._id, "Order ID matches placed order");

    // Customer can fetch list of own orders
    const getListRes = await fetch(`${BASE_URL}/order`, {
      headers: { Cookie: `token=${customerToken}` },
    });
    assert(getListRes.ok, "GET /api/order returns customer order list");
    const userOrders = await getListRes.json();
    assert(
      Array.isArray(userOrders) && userOrders.some((o) => o._id === placedOrder._id),
      "Placed order appears in customer's order history list"
    );

    // Another customer CANNOT access this order
    const anotherToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const unauthorizedRes = await fetch(`${BASE_URL}/order/${placedOrder._id}`, {
      headers: { Cookie: `token=${anotherToken}` },
    });
    assert(
      unauthorizedRes.status === 401,
      "Unauthorized customer is denied access with 401 Unauthorized"
    );

    // -------------------------------------------------------------
    // Test 6: Order Cancellation & Inventory Restock
    // -------------------------------------------------------------
    console.log("\n[6] Testing Customer Order Cancellation & Automatic Stock Restock");
    const cancelRes = await fetch(`${BASE_URL}/order/cancel/${placedOrder._id}`, {
      method: "PUT",
      headers: { Cookie: `token=${customerToken}` },
    });
    assert(cancelRes.ok, "Customer can cancel their pending order");
    const cancelData = await cancelRes.json();
    assert(cancelData.order?.status === "Cancelled", "Order status transitioned to 'Cancelled'");

    // Verify inventory restocked in DB
    const restockedProduct = await Product.findById(dbProduct._id);
    assert(
      restockedProduct.defaultStock === initialStock,
      `Inventory restocked accurately back to initial stock of ${initialStock}`
    );

    // Cannot cancel an already cancelled order
    const repeatCancelRes = await fetch(`${BASE_URL}/order/cancel/${placedOrder._id}`, {
      method: "PUT",
      headers: { Cookie: `token=${customerToken}` },
    });
    assert(
      repeatCancelRes.status === 409,
      "Repeat cancellation is rejected with 409 Conflict"
    );

    // -------------------------------------------------------------
    // Test 7: Admin Order Management (Status, Tracking, Payment)
    // -------------------------------------------------------------
    console.log("\n[7] Testing Admin Order Management (List, Status, Tracking, Payment)");

    // Place a fresh order to test admin lifecycle
    const adminTestOrderRes = await fetch(`${BASE_URL}/order/place`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${customerToken}`,
      },
      body: JSON.stringify({
        products: [{ productId: dbProduct._id.toString(), quantity: 1 }],
        address: testCustomer.addresses[0],
        paymentMethod: "COD",
        codConfirmed: true,
      }),
    });
    assert(adminTestOrderRes.ok, "Second order placed for admin test");
    const adminTestOrder = await adminTestOrderRes.json();

    // Find or create admin in database
    let testAdmin = await adminModel.findOne({ role: "admin" });
    if (!testAdmin) {
      testAdmin = await adminModel.create({
        name: "Admin E-commerce",
        email: "admin_checkout@roseessence.ae",
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

    // Admin lists orders
    const adminListRes = await fetch(`${BASE_URL}/admin/orders?limit=10`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Cookie: `admin_token=${adminToken}`,
      },
    });
    assert(adminListRes.ok, "Admin can list all orders via /api/admin/orders");
    const adminListData = await adminListRes.json();
    assert(
      Array.isArray(adminListData.orders) && adminListData.orders.some((o) => o._id === adminTestOrder._id),
      "New order is visible in Admin order list"
    );

    // Admin updates courier tracking (auto updates to Shipped if pending)
    const trackingRes = await fetch(`${BASE_URL}/admin/orders/${adminTestOrder._id}/tracking`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        Cookie: `admin_token=${adminToken}`,
      },
      body: JSON.stringify({
        carrier: "Aramex Express",
        trackingNumber: "AMX-982341",
        eta: new Date(Date.now() + 86400000 * 2).toISOString(),
      }),
    });
    assert(trackingRes.ok, "Admin can update courier tracking info");
    const trackingData = await trackingRes.json();
    assert(trackingData.order?.tracking?.carrier === "Aramex Express", "Carrier recorded as Aramex Express");
    assert(trackingData.order?.tracking?.trackingNumber === "AMX-982341", "Tracking number recorded");
    assert(trackingData.order?.status === "Shipped", "Order status automatically transitioned to 'Shipped'");

    // Admin updates status to Delivered
    // Note: For COD orders, delivering automatically marks paymentStatus as Paid
    const deliveredRes = await fetch(`${BASE_URL}/admin/orders/${adminTestOrder._id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        Cookie: `admin_token=${adminToken}`,
      },
      body: JSON.stringify({
        status: "Delivered",
        note: "Package handed to customer at residence",
      }),
    });
    assert(deliveredRes.ok, "Admin can update status to 'Delivered'");
    const deliveredData = await deliveredRes.json();
    assert(deliveredData.order?.status === "Delivered", "Status is 'Delivered'");
    assert(
      deliveredData.order?.paymentStatus === "Paid",
      "COD order payment status automatically marked as 'Paid' upon delivery"
    );

    // Clean up test orders
    await Order.deleteMany({ _id: { $in: [placedOrder._id, adminTestOrder._id] } });
    console.log("  ✓ Test orders cleaned up");

    console.log("\n================================================================");
    console.log(`ALL TESTS PASSED! (${passed}/${total} assertions)`);
    console.log("================================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

runEcommerceCheckoutTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
