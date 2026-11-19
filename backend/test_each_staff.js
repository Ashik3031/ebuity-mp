import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Staff from "./models/Staff.js";
import Service from "./models/Service.js";
import { isStaffQualifiedForServices, isStaffAvailableForSlot, createUAEDate } from "./services/staffAssignmentService.js";

async function run() {
  await connectDB();

  const services = await Service.find().lean();
  const blowDry = services.find((s) => s.name === "Blow Dry");
  const manicure = services.find((s) => s.name === "Classic Manicure");
  const testServices = [blowDry];

  console.log("Testing service:", testServices.map((s) => s.name).join(", "));

  const staffList = await Staff.find({ isActive: true }).lean();

  const testSlots = [
    { date: "2026-11-20", time: "09:00" },
    { date: "2026-11-20", time: "10:00" },
    { date: "2026-11-21", time: "09:00" },
    { date: "2026-11-21", time: "10:00" },
  ];

  for (const { date, time } of testSlots) {
    console.log(`\n--- Slot: ${date} ${time} ---`);
    const slotStart = createUAEDate(date, time);
    const slotEnd = createUAEDate(date, `${parseInt(time) + 1}:00`);

    for (const staff of staffList) {
      const qualified = isStaffQualifiedForServices(staff, testServices);
      if (!qualified) {
        console.log(`  ${staff.name}: NOT QUALIFIED`);
        continue;
      }
      const avail = await isStaffAvailableForSlot({
        staff,
        scheduledDate: date,
        startTime: slotStart,
        endTime: slotEnd,
        bufferMinutes: 30,
      });
      console.log(`  ${staff.name}: qualified=true, available=${avail.available}, reason=${avail.reason || "OK"}`);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
