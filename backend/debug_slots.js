import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Booking from "./models/Booking.js";
import Staff from "./models/Staff.js";
import Service from "./models/Service.js";
import AvailabilityConfig from "./models/AvailabilityConfig.js";
import { getAvailableSlots } from "./controllers/bookingController.js";

async function main() {
  await connectDB();

  console.log("--- 1. Availability Config ---");
  const config = await AvailabilityConfig.findOne({ key: "default_config" });
  console.log({
    workingHours: config?.workingHours,
    leadTimeHours: config?.leadTimeHours,
    bufferMinutes: config?.bufferMinutes,
    slotIntervalMinutes: config?.slotIntervalMinutes,
    maxAdvanceDays: config?.maxAdvanceDays,
    activeDaysOfWeek: config?.activeDaysOfWeek,
    breaks: config?.breaks,
  });

  console.log("\n--- 2. Bookings on 19, 20, 21 Nov 2026 ---");
  const bookings = await Booking.find({
    scheduledDate: { $in: ["2026-11-19", "2026-11-20", "2026-11-21"] },
  }).lean();

  bookings.forEach((b) => {
    console.log(
      `${b.scheduledDate} ${b.scheduledTime} (${b.bookingNumber}) - status: ${b.status}, staff: ${b.assignedStaff}, services: ${b.services.map((s) => s.name).join(", ")}`
    );
  });

  console.log("\n--- 3. Staff List & Qualifications ---");
  const staff = await Staff.find().lean();
  staff.forEach((st) => {
    console.log(
      `${st.name} (_id: ${st._id}) - active: ${st.isActive}, hours: ${JSON.stringify(st.workingHours)}, weeklyOff: ${JSON.stringify(st.weeklyOffDays)}, categories: ${st.categoryIds?.length}, services: ${st.serviceIds?.length}`
    );
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
