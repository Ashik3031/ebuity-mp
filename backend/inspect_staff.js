import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/mongodb-connection.config.js";
import Staff from "./models/Staff.js";
import ServiceCategory from "./models/ServiceCategory.js";

async function run() {
  await connectDB();

  const categories = await ServiceCategory.find().lean();
  const catMap = {};
  categories.forEach((c) => {
    catMap[c._id.toString()] = c.name;
  });

  const staff = await Staff.find().lean();
  staff.forEach((st) => {
    console.log(`\n================ ${st.name} ===============`);
    console.log(`Active: ${st.isActive}`);
    console.log(`Hours: ${JSON.stringify(st.workingHours)}`);
    console.log(`Weekly Off Days: ${JSON.stringify(st.weeklyOffDays)} (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)`);
    console.log(`Category IDs: ${st.categoryIds?.map((id) => catMap[id.toString()] || id).join(", ")}`);
    console.log(`Service count: ${st.serviceIds?.length}`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
