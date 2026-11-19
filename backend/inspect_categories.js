import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import ServiceCategory from "./models/ServiceCategory.js";
import Service from "./models/Service.js";

async function run() {
  await connectDB();

  console.log("--- Service Categories ---");
  const cats = await ServiceCategory.find().lean();
  cats.forEach((c) => {
    console.log(`${c.name} (_id: ${c._id})`);
  });

  console.log("\n--- Sample Services with Categories ---");
  const services = await Service.find().populate("category").limit(10).lean();
  services.forEach((s) => {
    console.log(`${s.name} - category: ${s.category?.name} (${s.category?._id})`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
