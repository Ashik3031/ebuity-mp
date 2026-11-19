import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import { getAvailableSlots } from "./controllers/bookingController.js";
import Service from "./models/Service.js";

async function run() {
  await connectDB();

  const services = await Service.find().limit(2);
  const sampleServiceId = services[0]?._id?.toString();
  console.log("Sample service:", services[0]?.name, "ID:", sampleServiceId);

  const dates = ["2026-11-19", "2026-11-20", "2026-11-21"];

  for (const date of dates) {
    console.log(`\n=================== DATE: ${date} ===================`);
    
    // Simulate req, res
    const req = {
      query: {
        date,
        duration: "60",
        serviceIds: sampleServiceId,
      },
    };

    let resultJson = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resultJson = data;
        return this;
      },
    };

    await getAvailableSlots(req, res);

    if (!resultJson || !resultJson.slots) {
      console.log("No slots or error:", resultJson);
      continue;
    }

    console.log(`Total slots returned: ${resultJson.slots.length}`);
    const availableSlots = resultJson.slots.filter((s) => s.isAvailable);
    console.log(`Available slots (${availableSlots.length}):`, availableSlots.map((s) => s.time).join(", "));

    const morningSlots = resultJson.slots.filter((s) => s.period === "morning");
    console.log("Morning slots details:");
    morningSlots.forEach((s) => {
      console.log(`  ${s.time}: available=${s.isAvailable}, reason=${s.reason}`);
    });
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
