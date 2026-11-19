import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Staff from "./models/Staff.js";
import Booking from "./models/Booking.js";
import ServiceCategory from "./models/ServiceCategory.js";

async function run() {
  await connectDB();

  console.log("--- 1. Fetching current valid ServiceCategories ---");
  const categories = await ServiceCategory.find().lean();
  const allCategoryIds = categories.map((c) => c._id);
  console.log("Categories found:", categories.map((c) => c.name).join(", "));

  console.log("\n--- 2. Updating Staff Profiles ---");
  // 1. Fatima Al-Mansoor: Off on Tuesday [2], working hours 09:00 - 21:00, all categories
  await Staff.updateOne(
    { name: /Fatima Al-Mansoor/i },
    {
      $set: {
        categoryIds: allCategoryIds,
        weeklyOffDays: [2],
        workingHours: { start: "09:00", end: "21:00" },
      },
    }
  );
  console.log("Updated Fatima Al-Mansoor (weeklyOff: Tuesday [2], hours: 09:00 - 21:00, categories: all)");

  // 2. Layla Zahran: Off on Sunday [0], working hours 09:00 - 21:00, all categories
  await Staff.updateOne(
    { name: /Layla Zahran/i },
    {
      $set: {
        categoryIds: allCategoryIds,
        weeklyOffDays: [0],
        workingHours: { start: "09:00", end: "21:00" },
      },
    }
  );
  console.log("Updated Layla Zahran (weeklyOff: Sunday [0], hours: 09:00 - 21:00, categories: all)");

  // 3. Sarah Jenkins: Off on Monday [1], working hours 09:00 - 21:00, all categories
  await Staff.updateOne(
    { name: /Sarah Jenkins/i },
    {
      $set: {
        categoryIds: allCategoryIds,
        weeklyOffDays: [1],
        workingHours: { start: "09:00", end: "21:00" },
      },
    }
  );
  console.log("Updated Sarah Jenkins (weeklyOff: Monday [1], hours: 09:00 - 21:00, categories: all)");

  // 4. Ashik: Off on Wednesday [3], working hours 09:00 - 21:00, all categories
  await Staff.updateOne(
    { name: /^Ashik$/i },
    {
      $set: {
        categoryIds: allCategoryIds,
        weeklyOffDays: [3],
        workingHours: { start: "09:00", end: "21:00" },
      },
    }
  );
  console.log("Updated Ashik (weeklyOff: Wednesday [3], hours: 09:00 - 21:00, categories: all)");

  // 5. laya: Off on Friday [5], working hours 09:00 - 21:00, all categories
  await Staff.updateOne(
    { name: /^laya$/i },
    {
      $set: {
        categoryIds: allCategoryIds,
        weeklyOffDays: [5],
        workingHours: { start: "09:00", end: "21:00" },
      },
    }
  );
  console.log("Updated laya (weeklyOff: Friday [5], hours: 09:00 - 21:00, categories: all)");

  console.log("\n--- 3. Clearing/Cancelling Prior Test Bookings on 19, 20, 21 Nov 2026 ---");
  const cancelResult = await Booking.updateMany(
    {
      scheduledDate: { $in: ["2026-11-19", "2026-11-20", "2026-11-21"] },
      status: { $in: ["pending", "confirmed"] },
    },
    {
      $set: {
        status: "cancelled",
        cancellationReason: "Resetting test slots for user availability testing",
      },
    }
  );
  console.log(`Cancelled ${cancelResult.modifiedCount} test bookings.`);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
