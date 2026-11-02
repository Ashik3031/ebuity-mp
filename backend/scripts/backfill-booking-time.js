import "dotenv/config";
import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const cursor = mongoose.connection.db.collection("bookings").find({});
  let updated = 0;
  while (await cursor.hasNext()) {
    const bk = await cursor.next();
    let time = bk.scheduledTime;
    if (!time && bk.slotLockKey) {
      const p = bk.slotLockKey.split("_");
      if (p.length >= 2 && /^\d{1,2}:\d{2}$/.test(p[1])) {
        time = p[1];
      }
    }
    if (!time && bk.scheduledStartTime) {
      try {
        time = new Date(bk.scheduledStartTime).toLocaleTimeString("en-GB", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      } catch (e) {}
    }
    if (time && bk.scheduledTime !== time) {
      await mongoose.connection.db
        .collection("bookings")
        .updateOne({ _id: bk._id }, { $set: { scheduledTime: time } });
      updated++;
    }
  }
  console.log("Successfully backfilled bookings:", updated);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
