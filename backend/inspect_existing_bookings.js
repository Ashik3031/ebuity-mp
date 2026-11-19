import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Booking from "./models/Booking.js";
import Staff from "./models/Staff.js";

async function run() {
  await connectDB();

  const bookings = await Booking.find({
    scheduledDate: { $in: ["2026-11-19", "2026-11-20", "2026-11-21"] },
  }).lean();

  console.log(`Found ${bookings.length} bookings:`);
  for (const b of bookings) {
    const staff = b.assignedStaff ? await Staff.findById(b.assignedStaff).lean() : null;
    console.log({
      bookingNumber: b.bookingNumber,
      date: b.scheduledDate,
      time: b.scheduledTime,
      startTime: b.scheduledStartTime,
      endTime: b.scheduledEndTime,
      status: b.status,
      assignedStaff: staff ? staff.name : "None",
      customer: b.customerDetails?.name,
      createdAt: b.createdAt,
    });
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
