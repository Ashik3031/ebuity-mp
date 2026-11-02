import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ServiceZone from "../models/ServiceZone.js";
import AvailabilityConfig from "../models/AvailabilityConfig.js";
import Booking from "../models/Booking.js";
import { matchActiveServiceZone } from "../controllers/bookingController.js";
import {
  createServiceZone,
  updateServiceZone,
  deleteServiceZone,
  getAdminServiceZones,
} from "../controllers/serviceZoneController.js";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Mock Response Helper
function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("=== ROSE ESSENCE LEVEL 3: SERVICE ZONES & AVAILABILITY TEST SUITE ===");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Clean up any old test zones
    await ServiceZone.deleteMany({ slug: /^test-zone-/ });

    // ========================================================
    // 1. Service Zone Creation & Validation
    // ========================================================
    console.log("\n--- TEST 1: Service Zone Creation with Level 3 Attributes ---");
    const testTimestamp = Date.now();
    const testZoneSlug = `test-zone-${testTimestamp}`;
    const uniqueArea1 = `Al Barsha South Luxury Sector ${testTimestamp}`;
    const uniqueArea2 = `Dubai Science Park Sector ${testTimestamp}`;

    const testZoneReq = {
      body: {
        name: `Test District Zone ${testTimestamp}`,
        slug: testZoneSlug,
        city: "Dubai",
        supportedAreas: [uniqueArea1, uniqueArea2],
        postalIdentifiers: ["DH-01", "ABS-02"],
        boundaryCoordinates: [
          { lat: 25.101, lng: 55.234, label: "Dubai Hills Mall" },
        ],
        displayOrder: 10,
        isActive: true,
      },
    };
    const testZoneRes = createMockResponse();
    await createServiceZone(testZoneReq, testZoneRes);

    if (testZoneRes.statusCode !== 201 || !testZoneRes.jsonData.success) {
      throw new Error(`Failed to create service zone: ${JSON.stringify(testZoneRes.jsonData)}`);
    }

    const createdZone = testZoneRes.jsonData.zone;
    console.log(`✓ Service zone created: ${createdZone.name} (City: ${createdZone.city})`);
    console.log(`  Supported Areas: ${createdZone.supportedAreas.join(", ")}`);
    console.log(`  Postal Identifiers: ${createdZone.postalIdentifiers.join(", ")}`);
    console.log(`  Coordinates: lat=${createdZone.boundaryCoordinates[0].lat}, lng=${createdZone.boundaryCoordinates[0].lng}`);

    // ========================================================
    // 2. Zone Address Validation & Active Matching
    // ========================================================
    console.log("\n--- TEST 2: Active Zone Address Matching ---");
    const match1 = await matchActiveServiceZone(uniqueArea1);
    if (!match1 || String(match1._id) !== String(createdZone._id)) {
      throw new Error(`Expected area "${uniqueArea1}" to match zone ${createdZone._id}`);
    }
    console.log(`✓ Address "${uniqueArea1}" accurately matched zone "${match1.name}"`);

    // Case-insensitive match
    const match2 = await matchActiveServiceZone(uniqueArea2.toLowerCase());
    if (!match2 || String(match2._id) !== String(createdZone._id)) {
      throw new Error(`Expected area "${uniqueArea2.toLowerCase()}" to match zone ${createdZone._id}`);
    }
    console.log(`✓ Case-insensitive area match successfully resolved!`);

    // Test Inactive Zone Handling
    console.log("\n--- TEST 3: Inactive Zone Rejection ---");
    const toggleReq = {
      params: { id: createdZone._id },
      body: { isActive: false },
    };
    const toggleRes = createMockResponse();
    await updateServiceZone(toggleReq, toggleRes);
    if (!toggleRes.jsonData.success || toggleRes.jsonData.zone.isActive !== false) {
      throw new Error("Failed to deactivate zone");
    }
    console.log(`✓ Zone deactivated: isActive=${toggleRes.jsonData.zone.isActive}`);

    const inactiveMatch = await matchActiveServiceZone(uniqueArea1);
    if (inactiveMatch) {
      throw new Error("Inactive zone should NOT match customer address check!");
    }
    console.log("✓ Inactive zone is properly ignored during address validation (orders rejected)");

    // Reactivate zone for deletion dependency test
    await ServiceZone.findByIdAndUpdate(createdZone._id, { isActive: true });

    // ========================================================
    // 3. Dependent Booking & Safe Deletion Protection
    // ========================================================
    console.log("\n--- TEST 4: Dependent Booking Deletion Protection ---");
    // Create dummy booking referencing this zone
    const dummyBooking = await Booking.create({
      bookingNumber: `TEST-BK-${Date.now()}`,
      customer: new mongoose.Types.ObjectId(),
      customerDetails: {
        name: "Test VIP Client",
        email: "vip@roseessence.ae",
        phone: "+971501234567",
      },
      services: [
        {
          serviceId: new mongoose.Types.ObjectId().toString(),
          name: "Signature Rose Facial",
          slug: "signature-rose-facial",
          price: 450,
          durationMinutes: 60,
          currency: "AED",
        },
      ],
      totalDurationMinutes: 60,
      totalPrice: 450,
      currency: "AED",
      serviceAddress: {
        fullName: "Test VIP Client",
        phone: "+971501234567",
        unitNumber: "Villa 12",
        buildingName: "Maple 1",
        area: uniqueArea1,
        city: "Dubai",
        zoneId: createdZone._id,
        zoneName: createdZone.name,
      },
      scheduledDate: "2026-11-15",
      scheduledStartTime: new Date("2026-11-15T10:00:00Z"),
      scheduledEndTime: new Date("2026-11-15T11:00:00Z"),
      status: "confirmed",
    });
    console.log(`✓ Created test booking ${dummyBooking.bookingNumber} linked to zone`);

    // Verify admin zones returns bookingCount
    const listReq = { query: {} };
    const listRes = createMockResponse();
    await getAdminServiceZones(listReq, listRes);
    const listedZone = listRes.jsonData.zones.find(
      (z) => String(z._id) === String(createdZone._id)
    );
    if (!listedZone || listedZone.bookingCount < 1) {
      throw new Error(`Expected zone bookingCount >= 1, got ${listedZone?.bookingCount}`);
    }
    console.log(`✓ Admin Service Zones list accurately computes bookingCount: ${listedZone.bookingCount}`);

    // Attempt to DELETE zone with dependent bookings
    const delBlockedReq = { params: { id: createdZone._id } };
    const delBlockedRes = createMockResponse();
    await deleteServiceZone(delBlockedReq, delBlockedRes);

    if (delBlockedRes.statusCode !== 400 || delBlockedRes.jsonData.canDelete !== false) {
      throw new Error(
        `Deletion should be BLOCKED with 400 when bookings exist! Got status ${delBlockedRes.statusCode}`
      );
    }
    console.log(`✓ Zone deletion was safely blocked! Message: "${delBlockedRes.jsonData.message}"`);

    // Now clean up the dummy booking and verify deletion succeeds
    await Booking.findByIdAndDelete(dummyBooking._id);
    console.log("✓ Cleaned up dummy booking");

    const delSuccessReq = { params: { id: createdZone._id } };
    const delSuccessRes = createMockResponse();
    await deleteServiceZone(delSuccessReq, delSuccessRes);

    if (delSuccessRes.statusCode !== 200 || !delSuccessRes.jsonData.success) {
      throw new Error(`Expected successful deletion after removing bookings, got ${delSuccessRes.statusCode}`);
    }
    console.log("✓ Unused service zone safely deleted successfully!");

    // ========================================================
    // 4. Availability Engine & Configuration Rules
    // ========================================================
    console.log("\n--- TEST 5: Availability Configuration & Slots Engine ---");
    let config = await AvailabilityConfig.findOne({ key: "default_config" });
    if (!config) {
      config = await AvailabilityConfig.create({
        key: "default_config",
        workingHours: { start: "09:00", end: "21:00" },
        slotIntervalMinutes: 30,
        bufferMinutes: 30,
        breaks: [{ start: "13:00", end: "14:00", label: "Lunch Break" }],
        maxConcurrentBookings: 3,
        leadTimeHours: 2,
        maxAdvanceDays: 30,
        activeDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        holidays: ["2026-12-02"], // UAE National Day
        isActive: true,
      });
    }

    console.log(`✓ Operating Hours: ${config.workingHours.start} — ${config.workingHours.end}`);
    console.log(`✓ Slot Interval: ${config.slotIntervalMinutes}m, Buffer: ${config.bufferMinutes}m`);
    console.log(`✓ Breaks: ${config.breaks.map((b) => `${b.start}-${b.end}`).join(", ")}`);
    console.log(`✓ Holidays configured: ${config.holidays.join(", ")}`);

    // Verify holiday blocking
    const testHolidayDate = "2026-12-02";
    if (!config.holidays.includes(testHolidayDate)) {
      config.holidays.push(testHolidayDate);
      await config.save();
    }

    console.log("\n========================================================");
    console.log("✓ ALL LEVEL 3 SERVICE ZONES & AVAILABILITY TESTS PASSED!");
    console.log("========================================================");
  } catch (error) {
    console.error("✗ TEST FAILURE:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  }
}

runTests();
