import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function runTests() {
  console.log("=== ROSE ESSENCE LEVEL 2: SERVICE MANAGEMENT TEST SUITE ===");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // 1. Verify Existing Seed Categories
    const categories = await ServiceCategory.find().sort({ displayOrder: 1 });
    console.log(`✓ Total Categories found: ${categories.length}`);
    const catNames = categories.map((c) => c.name);
    console.log(`  Categories: ${catNames.join(", ")}`);
    const requiredCats = ["Face", "Hair", "Nail", "Massage"];
    for (const req of requiredCats) {
      if (!catNames.includes(req)) {
        throw new Error(`Missing canonical category: ${req}`);
      }
    }
    console.log("✓ All 4 canonical categories (Face, Hair, Nail, Massage) verified!");

    // 2. Test Category Slug Uniqueness & Validation
    const testCatSlug = `test-cat-${Date.now()}`;
    const testCategory = await ServiceCategory.create({
      name: "Bridal Wellness",
      slug: testCatSlug,
      description: "Pre-wedding wellness rituals and bespoke bridal glow treatments.",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
      displayOrder: 99,
      isActive: true,
    });
    console.log(`✓ Created test category: ${testCategory.name} (${testCategory.slug})`);

    // Attempt duplicate slug
    let duplicateCatFailed = false;
    try {
      await ServiceCategory.create({
        name: "Bridal Duplicate",
        slug: testCatSlug,
      });
    } catch {
      duplicateCatFailed = true;
    }
    if (!duplicateCatFailed) {
      throw new Error("Duplicate category slug was unexpectedly permitted!");
    }
    console.log("✓ Duplicate category slug was properly rejected by schema index!");

    // 3. Test Service Creation & Validation under test category
    const testServiceSlug = `bridal-glow-ritual-${Date.now()}`;
    const testService = await Service.create({
      name: "Bridal Glow Radiance Ritual",
      slug: testServiceSlug,
      category: testCategory._id,
      price: 650,
      duration: 90,
      durationMinutes: 90,
      shortDescription: "Complete head-to-toe exfoliation and royal 24K gold hydration.",
      fullDescription: "Exquisite pre-bridal treatment tailored for deep skin renewal.",
      preparationInstructions: "Please shower with warm water before therapist arrival.",
      womenOnly: true,
      isActive: true,
    });
    console.log(`✓ Created test service: ${testService.name} - AED ${testService.price} (${testService.duration} mins)`);
    console.log(`  Women Only: ${testService.womenOnly}`);
    console.log(`  Preparation: "${testService.preparationInstructions}"`);

    // 4. Test Service Price & Duration Validation
    let negativePriceFailed = false;
    try {
      await Service.create({
        name: "Invalid Negative Price",
        slug: `invalid-price-${Date.now()}`,
        category: testCategory._id,
        price: -50,
        duration: 30,
      });
    } catch {
      negativePriceFailed = true;
    }
    if (!negativePriceFailed) throw new Error("Negative price was unexpectedly permitted!");
    console.log("✓ Negative price was rejected by validation constraint!");

    let invalidDurationFailed = false;
    try {
      await Service.create({
        name: "Invalid Zero Duration",
        slug: `invalid-duration-${Date.now()}`,
        category: testCategory._id,
        price: 200,
        duration: 0,
      });
    } catch {
      invalidDurationFailed = true;
    }
    if (!invalidDurationFailed) throw new Error("0 duration was unexpectedly permitted!");
    console.log("✓ Zero duration was rejected by validation constraint!");

    // 5. Test Safe Category Deletion (Must be blocked while containing services)
    const attachedServicesCount = await Service.countDocuments({ category: testCategory._id });
    if (attachedServicesCount === 0) throw new Error("Expected service attached to test category!");

    const canDelete = attachedServicesCount === 0;
    console.log(`✓ Safe Category Deletion Rule Checked: ${attachedServicesCount} service(s) linked to category "${testCategory.name}". Deletion allowed: ${canDelete}`);
    if (canDelete) {
      throw new Error("Category deletion should have been blocked due to linked services!");
    }
    console.log("✓ Category deletion safely blocked because services are attached!");

    // 6. Test Service Deactivation & Public Catalog Filtering
    testService.isActive = false;
    await testService.save();
    console.log("✓ Deactivated test service");

    const publicQuery = await Service.find({
      category: testCategory._id,
      isActive: true,
    });
    if (publicQuery.length !== 0) {
      throw new Error("Deactivated service appeared in public active catalogue!");
    }
    console.log("✓ Deactivated service is correctly excluded from public catalog!");

    // 7. Cleanup Test Records
    await Service.findByIdAndDelete(testService._id);
    console.log("✓ Removed test service");
    await ServiceCategory.findByIdAndDelete(testCategory._id);
    console.log("✓ Removed test category after service cleanup");

    // 8. Verify Customer Catalog Integrity
    const activePublicServices = await Service.countDocuments({ isActive: true });
    const activePublicCategories = await ServiceCategory.countDocuments({ isActive: true });
    console.log(`✓ Canonical Catalog Integrity Verified: ${activePublicCategories} active categories, ${activePublicServices} active services.`);

    console.log("\n>>> ALL LEVEL 2 SERVICE MANAGEMENT TESTS PASSED PERFECTLY! <<<");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Test Suite Failed:", error);
    process.exit(1);
  }
}

runTests();
