// // controllers/wishlistController.js
// import mongoose from "mongoose";
// import Wishlist from "../models/Wishlist.js";
// import Product from "../models/Product.js";
// import Variant from "../models/Variants.js";
// import { computeProductStock } from "../services/backInStockService.js";

// /** Compute current stock for a product (variants sum if you use variants, else defaultStock) */
// async function computeStock(productId) {
//   // If you don't use variants stock, return product.defaultStock instead.
//   const total = await Variant.aggregate([
//     { $match: { product: new mongoose.Types.ObjectId(productId), isActive: { $ne: false } } },
//     { $group: { _id: "$product", stock: { $sum: { $ifNull: ["$stock", 0] } } } },
//   ]);
//   return total?.[0]?.stock ?? 0;
// }

// /** Build the shaped wishlist item the client will render */
// async function shapeWishlistItem(doc) {
//   const p = doc.product || null;                // may be null if hard-deleted
//   const productMissing = !p;
//   const productInactive = !!p && p.isActive === false;

//   let status = "ok";
//   let stock = 0;

//   if (productMissing || productInactive) {
//     status = "product_unavailable";
//   } else {
//     // compute stock
//     stock = await computeStock(p._id);
//     status = stock <= 0 ? "out_of_stock" : "ok";
//   }

//   return {
//     wishlistId: String(doc._id),
//     productId: String(p?._id || doc.product),   // keep raw id if product missing
//     status,                                     // 'ok' | 'out_of_stock' | 'product_unavailable'
//     stock,
//     product: p
//       ? { _id: p._id, name: p.name, images: p.images ?? [], isActive: p.isActive !== false }
//       : null,
//     createdAt: doc.createdAt,
//   };
// }

// /** POST /api/wishlist */
// export const addToWishlist = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.body;
//     if (!productId) return res.status(400).json({ message: "Product ID is required." });

//     const exists = await Wishlist.findOne({ user: userId, product: productId });
//     if (exists) return res.status(400).json({ message: "Product already in wishlist." });

//     const item = await Wishlist.create({ user: userId, product: productId });
//     const populated = await item.populate({ path: "product", select: "name images isActive" });
//     const shaped = await shapeWishlistItem(populated);
//     res.status(201).json({ item: shaped });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /** GET /api/wishlist */
// export const getwishlist = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const items = await Wishlist.find({ user: userId })
//       .populate({ path: "product", select: "name images defaultPrice isActive brand", populate: { path: "brand", select: "name slug logo" } })
//       .lean();

//     const results = await Promise.all(items.map(async (it) => {
//       const p = it.product;
//       if (!p) {
//         return { wishlistId: it._id, productId: it.product, status: "product_unavailable", stock: 0, product: null };
//       }
//       const { total } = await computeProductStock(p._id);
//       const status =
//         p.isActive === false ? "product_unavailable" :
//         total > 0 ? "ok" : "out_of_stock";
//       return {
//         wishlistId: it._id,
//         productId: p._id,
//         status,
//         stock: total,
//         product: p,
//       };
//     }));

//     res.json(results);
//   } catch (e) {
//     res.status(500).json({ message: "Failed to load wishlist", error: e.message });
//   }
// };


// /** DELETE /api/wishlist/:productId OR body { wishlistId } */
// export const removeFromWishlist = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.params;
//     const { wishlistId } = req.body || {};

//     let query = { user: userId };
//     if (wishlistId) query._id = wishlistId;
//     else query.product = productId;

//     const result = await Wishlist.findOneAndDelete(query);
//     if (!result) return res.status(404).json({ message: "Item not found in Wishlist." });

//     res.status(200).json({ message: "Removed from wishlist successfully." });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };




//new code for stock 
// controllers/wishlistController.js
import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import { computeProductStock } from "../services/backInStockService.js"; // still used by addToWishlist shaping

/** Build the shaped wishlist item the client will render (used on single add) */
async function shapeWishlistItem(doc) {
  const p = doc.product || null;                // may be null if hard-deleted
  const productMissing = !p;
  const productInactive = !!p && p.isActive === false;

  let status = "ok";
  let stock = 0;

  if (productMissing || productInactive) {
    status = "product_unavailable";
  } else {
    // Use the same service your GET uses so logic stays consistent
    const { total } = await computeProductStock(p._id);
    stock = total || 0;
    status = stock <= 0 ? "out_of_stock" : "ok";
  }

  return {
    wishlistId: String(doc._id),
    productId: String(p?._id || doc.product),   // keep raw id if product missing
    status,                                     // 'ok' | 'out_of_stock' | 'product_unavailable'
    stock,
    product: p
      ? { _id: p._id, name: p.name, images: p.images ?? [], isActive: p.isActive !== false, defaultPrice: p.defaultPrice }
      : null,
    createdAt: doc.createdAt,
  };
}

//** POST /api/wishlist/merge */
// POST /api/wishlist/merge
export const mergeWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const raw = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!raw.length) return res.json({ success: true, merged: 0 });

    // ✅ Normalize: accept ["pid1","pid2"] OR [{productId:"pid"}]
    const productIds = raw
      .map((it) => (typeof it === "string" ? it : it?.productId))
      .filter(Boolean)
      .map(String)
      .filter((pid) => mongoose.Types.ObjectId.isValid(pid)); // ✅ prevent cast errors

    if (!productIds.length) return res.json({ success: true, merged: 0 });

    // ✅ De-duplicate
    const uniqueIds = [...new Set(productIds)];

    // ✅ Upsert each (no duplicates)
    let merged = 0;
    for (const pid of uniqueIds) {
      const result = await Wishlist.updateOne(
        { user: userId, product: pid },
        { $setOnInsert: { user: userId, product: pid } },
        { upsert: true }
      );

      // merged if inserted
      if (result.upsertedCount > 0) merged++;
    }

    return res.json({ success: true, merged });
  } catch (e) {
    console.error("wishlist merge error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};


/** POST /api/wishlist */
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    const exists = await Wishlist.findOne({ user: userId, product: productId });
    if (exists) return res.status(400).json({ message: "Product already in wishlist." });

    const item = await Wishlist.create({ user: userId, product: productId });
    const populated = await item.populate({ path: "product", select: "name images isActive defaultPrice" });
    const shaped = await shapeWishlistItem(populated);
    res.status(201).json({ item: shaped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/wishlist
 * - Batched stock computation for all products in wishlist (fast)
 * - Adds no-cache headers so the client always sees fresh stock
 */
export const getwishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await Wishlist.find({ user: userId })
      .populate({
        path: "product",
        select: "name images defaultPrice defaultStock isActive brand",
        populate: { path: "brand", select: "name slug logo" },
      })
      .lean();

    // Collect all productIds that still exist & are active
    const productsAlive = items
      .filter((it) => it.product && it.product.isActive !== false)
      .map((it) => it.product._id);

    // Aggregate variant stock once for all those ids
    const totals = await Variant.aggregate([
      { $match: { product: { $in: productsAlive }, isActive: { $ne: false } } },
      { $group: { _id: "$product", stock: { $sum: { $ifNull: ["$stock", 0] } } } },
    ]);

    const totalsMap = new Map(totals.map((t) => [String(t._id), Number(t.stock) || 0]));

    // Shape output: if no variant rows, fall back to defaultStock
    const results = items.map((it) => {
      const p = it.product;
      if (!p) {
        return {
          wishlistId: it._id,
          productId: it.product,
          status: "product_unavailable",
          stock: 0,
          product: null,
        };
      }
      if (p.isActive === false) {
        return {
          wishlistId: it._id,
          productId: p._id,
          status: "product_unavailable",
          stock: 0,
          product: p,
        };
      }

      const key = String(p._id);
      const variantSum = totalsMap.get(key);
      const stock = typeof variantSum === "number" ? variantSum : (Number(p.defaultStock) || 0);
      const status = stock > 0 ? "ok" : "out_of_stock";

      return {
        wishlistId: it._id,
        productId: p._id,
        status,
        stock,
        product: p,
      };
    });

    // --- Prevent caching so every GET returns new stock values ---
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    res.json(results);
  } catch (e) {
    res.status(500).json({ message: "Failed to load wishlist", error: e.message });
  }
};

/** DELETE /api/wishlist/:productId OR body { wishlistId } */
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const { wishlistId } = req.body || {};

    const query = { user: userId, ...(wishlistId ? { _id: wishlistId } : { product: productId }) };
    const result = await Wishlist.findOneAndDelete(query);
    if (!result) return res.status(404).json({ message: "Item not found in Wishlist." });

    res.status(200).json({ message: "Removed from wishlist successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
