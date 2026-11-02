import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js"; // adjust the path to your Order model

const computeProductRatingStats = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
        countsByStar: { $push: "$rating" },
      },
    },
    { $project: { _id: 0, avgRating: { $round: ["$avgRating", 1] }, reviewCount: 1, countsByStar: 1 } },
  ]);

  const counts = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  if (stats?.countsByStar) {
    stats.countsByStar.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
  }

  return {
    avgRating: stats?.avgRating || 0,
    reviewCount: stats?.reviewCount || 0,
    countsByStar: counts,
  };
};

const updateProductStats = async (productId) => {
  try {
    const s = await computeProductRatingStats(productId);
    await Product.findByIdAndUpdate(productId, {
      avgRating: s.avgRating,
      reviewCount: s.reviewCount,
    });
    return s;
  } catch {
    return null;
  }
};

// Verified purchase if an order contains this variant/product
const hasVerifiedPurchase = async (userId, productId, variantId) => {
  if (!userId) return false;

  if (variantId) {
    const exists = await Order.exists({
      user: userId,
      "items.variant": new mongoose.Types.ObjectId(variantId),
      status: { $nin: ["cancelled"] },
    });
    if (exists) return true;
  }

  const existsByProduct = await Order.exists({
    user: userId,
    "items.product": new mongoose.Types.ObjectId(productId),
    status: { $nin: ["cancelled"] },
  });
  return !!existsByProduct;
};

// GET /api/reviews/product/:productId?page=1&limit=10&sort=newest|highest|lowest
export const getByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const sortQ = (req.query.sort || "newest").toLowerCase();

    const sortMap = {
      newest:  { createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
      lowest:  { rating:  1, createdAt: -1 },
    };
    const sort = sortMap[sortQ] || sortMap.newest;

    const query = { product: productId };

    const [items, total, summary] = await Promise.all([
      Review.find(query)
        .populate({ path: "user", select: "name fullName email" })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
      computeProductRatingStats(productId),
    ]);

    res.json({
      items: items.map((r) => ({
        _id: r._id,
        user: { name: r.user?.name || r.user?.fullName || "Anonymous" },
        rating: r.rating,
        comment: r.comment,
        verified: r.verified,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      summary, // { avgRating, reviewCount, countsByStar }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews", error: String(err) });
  }
};

// POST /api/reviews   { productId, rating, comment, variantId? }
export const addOrUpdate = async (req, res) => {
  try {
    const userId = req.user?._id; // set by your auth middleware
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { productId, rating, comment, variantId } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ message: "productId and rating are required" });
    }

    const verified = await hasVerifiedPurchase(userId, productId, variantId);

    const review = await Review.findOneAndUpdate(
      { product: productId, user: userId },
      {
        $set: {
          rating: Number(rating),
          comment: (comment || "").trim(),
          verified,
          ...(variantId ? { variant: variantId } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const summary = await updateProductStats(productId);

    res.status(201).json({ ...review, summary });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit review", error: String(err) });
  }
};

// DELETE /api/reviews/:id
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Review.findById(id);
    if (!doc) return res.status(404).json({ message: "Review not found" });

    const isOwner = String(doc.user) === String(req.user?._id);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    await doc.deleteOne();
    await updateProductStats(doc.product);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete review", error: String(err) });
  }
};
