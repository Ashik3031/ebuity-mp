import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import { getAvailableSlots } from "./controllers/bookingController.js";

async function run() {
  await connectDB();

  const dates = ["2026-11-19", "2026-11-20", "2026-11-21"];

  for (const date of dates) {
    console.log(`\n=================== DATE: ${date} (NO SERVICE IDS) ===================`);
    
    const req = {
      query: {
        date,
        duration: "60",
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

    console.log(`Total slots: ${resultJson.slots.length}`);
    const availableSlots = resultJson.slots.filter((s) => s.isAvailable);
    console.log(`Available slots (${availableSlots.length}):`, availableSlots.map((s) => s.time).join(", "));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
