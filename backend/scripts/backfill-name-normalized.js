// backend/scripts/backfill-name-normalized.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config(); // loads .env (expects MONGODB_URI)

// same normalizer used in your model hooks
const normalize = (s = "") =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DB_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected");

  const cursor = Product.find({}, { _id: 1, name: 1 }).lean().cursor();
  const ops = [];
  let count = 0;

  for await (const doc of cursor) {
    const nameNormalized = normalize(doc.name || "");
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { nameNormalized } },
      },
    });

    if (ops.length >= 1000) {
      await Product.bulkWrite(ops);
      count += ops.length;
      console.log(`Updated ${count} products...`);
      ops.length = 0;
    }
  }

  if (ops.length) {
    await Product.bulkWrite(ops);
    count += ops.length;
  }

  console.log(`🎉 Done. Total updated: ${count}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Backfill error:", err);
  process.exit(1);
});
