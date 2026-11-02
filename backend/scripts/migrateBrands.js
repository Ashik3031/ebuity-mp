import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import Brand from "../models/Brand.js";

// Resolve backend/.env no matter where you run from
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI;

  if (!uri || typeof uri !== "string") {
    console.error("❌ No Mongo connection string found in backend/.env (MONGODB_URI / MONGODB_URL / MONGO_URI)");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const productsCol = mongoose.connection.collection("products");

  // 1) Normalize empty strings → null (or unset)
  const emptyRes = await productsCol.updateMany(
    { brand: "" },
    { $unset: { brand: "" } } // or {$set: { brand: null }}
  );
  if (emptyRes.modifiedCount) {
    console.log(`🧹 Normalized ${emptyRes.modifiedCount} product(s) with brand=""`);
  }

  // 2) Find products whose brand is still a STRING (non-empty)
  // Use raw driver filter to avoid Mongoose casting
  const cursor = productsCol.find({
    $and: [
      { brand: { $type: "string" } },
      { brand: { $ne: "" } },
    ],
  });

  const cache = new Map(); // nameLower -> brandId
  let migrated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const name = (doc.brand || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    let brandId = cache.get(key);

    if (!brandId) {
      const slug = slugify(name, { lower: true, strict: true });
      let b = await Brand.findOne({ slug }).select("_id");
      if (!b) b = await Brand.create({ name, slug });
      brandId = b._id;
      cache.set(key, brandId);
    }

    await productsCol.updateOne(
      { _id: doc._id },
      { $set: { brand: new mongoose.Types.ObjectId(brandId) } }
    );
    migrated++;
  }

  console.log(`✅ Migration complete. Updated ${migrated} product(s).`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
