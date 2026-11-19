import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Staff from "./models/Staff.js";

async function run() {
  await connectDB();

  const staff = await Staff.find().lean();
  staff.forEach((s) => {
    console.log(JSON.stringify(s, null, 2));
  });

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
