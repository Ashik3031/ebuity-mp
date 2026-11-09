// tests/level5-product-management.test.js
// Automated verification suite for Rose Essence Level 5: Product & Category Management

import assert from "node:assert";

const BASE_URL = process.env.API_URL || "http://localhost:4000/api";

let createdCategoryId = null;
let createdChildCategoryId = null;
let createdProductId = null;
const uniqueSuffix = Date.now();

async function runTests() {
  console.log("🌸 [Rose Essence Level 5] Starting Product & Category Management Test Suite...\n");
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

  // 1. Categories Flat Listing
  await test("1. Flat categories endpoint returns items with pathLabel", async () => {
    const res = await fetch(`${BASE_URL}/category/flat`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.items), "data.items should be an array");
    assert(data.items.length > 0, "Should have at least 1 category");
    const first = data.items[0];
    assert(first._id, "Item must have _id");
    assert(first.label, "Item must have label");
    assert(first.pathLabel, "Item must have pathLabel");
  });

  // 2. Categories Tree Listing
  await test("2. Nested categories tree returns array with children structure", async () => {
    const res = await fetch(`${BASE_URL}/category`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data), "Tree should be an array of root categories");
    const roots = data.filter((c) => !c.parent);
    assert(roots.length > 0, "Should have root categories");
  });

  // 3. Create Root Category
  await test("3. Create new root category via POST /category", async () => {
    const formData = new FormData();
    formData.append("label", `Bath services ${uniqueSuffix}`);
    formData.append("description", "Exquisite botanical bath elixirs and salts.");

    const res = await fetch(`${BASE_URL}/category`, {
      method: "POST",
      body: formData,
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data._id, "Created category must have _id");
    assert.strictEqual(data.label, `Bath services ${uniqueSuffix}`);
    createdCategoryId = data._id;
  });

  // 4. Create Child Category
  await test("4. Create child subcategory under new root category", async () => {
    const formData = new FormData();
    formData.append("label", `Mineral Soaks ${uniqueSuffix}`);
    formData.append("parent", createdCategoryId);
    formData.append("description", "Hand-harvested magnesium and dead sea mineral crystals.");

    const res = await fetch(`${BASE_URL}/category`, {
      method: "POST",
      body: formData,
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.parent, createdCategoryId);
    createdChildCategoryId = data._id;
  });

  // 5. Update Category
  await test("5. Update category details via PUT /category/:id", async () => {
    const formData = new FormData();
    formData.append("label", `Bath services Luxury ${uniqueSuffix}`);
    formData.append("description", "Updated description for luxury aromatherapy soaking.");

    const res = await fetch(`${BASE_URL}/category/${createdCategoryId}`, {
      method: "PUT",
      body: formData,
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.label, `Bath services Luxury ${uniqueSuffix}`);
  });

  // 6. Delete Category Guard: Fails when child exists
  await test("6. Category deletion guard prevents deleting parent with child categories", async () => {
    const res = await fetch(`${BASE_URL}/category/${createdCategoryId}`, {
      method: "DELETE",
    });
    assert.strictEqual(res.status, 400, "Should return 400 when category has children");
    const data = await res.json();
    assert(
      data.message?.toLowerCase().includes("child"),
      `Message should mention children: ${data.message}`
    );
  });

  // 7. Create Product with Category Lineage
  await test("7. Create boutique product with category, SKU, stock, and pricing", async () => {
    const payload = {
      name: `Damascus Rose Bath Nectar ${uniqueSuffix}`,
      sku: `RE-BN-${uniqueSuffix.toString().slice(-4)}`,
      brandName: "Rose Essence",
      categoryId: createdChildCategoryId,
      defaultPrice: 165.0,
      compareAtPrice: 195.0,
      defaultStock: 18,
      size: "300 ml",
      description: "Infused with cold-pressed rose hip seed and pure Rosa Damascena absolute.",
      detailedDescription: "Pour 2-3 capfuls into running bathwater. Immerse for 20 minutes.",
      tags: ["rose", "bath", "organic", "nectar"],
      images: [
        "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=600&q=80",
      ],
      isActive: true,
    };

    const res = await fetch(`${BASE_URL}/products/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.product?._id, "Response should have product._id");
    assert.strictEqual(data.product.name, payload.name);
    assert.strictEqual(data.product.defaultPrice, 165);
    createdProductId = data.product._id;
  });

  // 8. Get Product By ID
  await test("8. Retrieve product details by ID", async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.product._id, createdProductId);
    assert.strictEqual(data.product.defaultPrice, 165);
    assert.strictEqual(data.product.defaultStock, 18);
  });

  // 9. Update Product Pricing, Stock & Content
  await test("9. Update product via PUT /products/:id", async () => {
    const updatePayload = {
      name: `Damascus Rose Bath Nectar Signature ${uniqueSuffix}`,
      defaultPrice: 175.0,
      defaultStock: 25,
      description: "Updated silky bath nectar enriched with evening primrose.",
      isActive: true,
    };

    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const updated = await res.json();
    assert.strictEqual(updated.name, updatePayload.name);
    assert.strictEqual(updated.defaultPrice, 175);
    assert.strictEqual(updated.defaultStock, 25);
  });

  // 10. Toggle Product Status (Deactivate)
  await test("10. Deactivate product (isActive = false)", async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.isActive, false);
  });

  // 11. Customer Storefront Filter: Inactive product does not appear when isActive=true
  await test("11. Storefront query (isActive=true) excludes inactive product", async () => {
    const res = await fetch(`${BASE_URL}/products/all?isActive=true&limit=100`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const found = data.items.some((it) => it.product._id === createdProductId);
    assert.strictEqual(found, false, "Inactive product should not appear on storefront");
  });

  // 12. Reactivate Product
  await test("12. Reactivate product (isActive = true) for customer catalog", async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.isActive, true);
  });

  // 13. Search Products by Name/Query
  await test("13. Search products by query term", async () => {
    const res = await fetch(`${BASE_URL}/products/all?search=${encodeURIComponent(uniqueSuffix)}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.items.length > 0, "Search should return created product");
    assert.strictEqual(data.items[0].product._id, createdProductId);
  });

  // 14. Pagination Support
  await test("14. Product listing respects page and limit pagination parameters", async () => {
    const res = await fetch(`${BASE_URL}/products/all?page=1&limit=2`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.page, 1);
    assert.strictEqual(data.limit, 2);
    assert(data.items.length <= 2, "Items length should be <= limit");
    assert(typeof data.total === "number", "Should include total count");
  });

  // 15. Delete Product
  await test("15. Delete product via DELETE /products/:id", async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: "DELETE",
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.message.includes("deleted"), "Should confirm deletion");
  });

  // 16. Cleanup Created Child Category
  await test("16. Delete child category", async () => {
    const res = await fetch(`${BASE_URL}/category/${createdChildCategoryId}`, {
      method: "DELETE",
    });
    assert.strictEqual(res.status, 200);
  });

  // 17. Cleanup Created Root Category (Now safe without children)
  await test("17. Delete root category after child was deleted", async () => {
    const res = await fetch(`${BASE_URL}/category/${createdCategoryId}`, {
      method: "DELETE",
    });
    assert.strictEqual(res.status, 200);
  });

  console.log(`\n========================================`);
  console.log(`  Tests Passed: ${passed} / ${total}`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log("✨ All Level 5 Product Management tests passed successfully!");
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
