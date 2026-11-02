import mongoose from "mongoose";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import BackInStockSubscription from "../models/BackInStockSubscription.js";
import BackInStockLog from "../models/BackInStockLog.js";
import { emailBackInStock } from "./email.service.js";

const { APP_URL } = process.env; // e.g. https://your-frontend.com

/** Compute total available stock for a product (sum of active variant stock;
 *  if no variants exist, fallback to product.defaultStock). */
export async function computeProductStock(productId) {
  const pid = new mongoose.Types.ObjectId(productId);

  // check if variants exist for this product
  const variantCount = await Variant.countDocuments({ product: pid });
  if (variantCount > 0) {
    const agg = await Variant.aggregate([
      { $match: { product: pid, isActive: { $ne: false } } },
      { $group: { _id: "$product", total: { $sum: { $ifNull: ["$stock", 0] } } } },
    ]);
    return { total: agg?.[0]?.total ?? 0, hasVariants: true };
  }

  // fallback to product.defaultStock
  const p = await Product.findById(pid).select("defaultStock").lean();
  return { total: Number(p?.defaultStock || 0), hasVariants: false };
}

/** Create/reactivate a subscription (idempotent on product+email). */
export async function subscribeBackInStock({ userId, email, productId, variantId = null, source = "notify_button", locale }) {
  if (!email) throw new Error("Email required");
  if (!productId) throw new Error("productId required");

  const existing = await BackInStockSubscription.findOne({ product: productId, email }).lean();
  if (existing && existing.active) {
    return { subscription: existing, created: false, reactivated: false };
  }

  if (existing && !existing.active) {
    const sub = await BackInStockSubscription.findByIdAndUpdate(
      existing._id,
      { active: true, unsubscribedAt: null, variant: variantId || existing.variant, source, locale },
      { new: true }
    );
    return { subscription: sub, created: false, reactivated: true };
  }

  const sub = await BackInStockSubscription.create({
    user: userId || undefined,
    email,
    product: productId,
    variant: variantId || undefined,
    source,
    locale,
    active: true,
  });
  return { subscription: sub.toObject(), created: true, reactivated: false };
}

/** Build a minimal product snapshot for email content/links. */
async function getProductSnapshot(productId) {
  const p = await Product.findById(productId).select("_id name slug images").lean();
  if (!p) return null;
  // Build a product URL that matches your frontend:
  // You currently use /product/:id
  const url = APP_URL ? `${APP_URL}/product/${p._id}` : `/product/${p._id}`;
  return { id: String(p._id), name: p.name || "Product", url, image: p.images?.[0] };
}

/** Notify all active subscribers if stock > 0. After send, auto-deactivate the subscription (one-shot). */
export async function notifyBackInStockForProduct(productId) {
  const { total } = await computeProductStock(productId);
  if (total <= 0) return { sent: 0, skipped: 0, reason: "no_stock" };

  const product = await getProductSnapshot(productId);
  if (!product) return { sent: 0, skipped: 0, reason: "product_missing" };

  const subs = await BackInStockSubscription.find({ product: productId, active: true }).lean();
  if (!subs.length) return { sent: 0, skipped: 0, reason: "no_subscribers" };

  let sent = 0, skipped = 0;

  for (const s of subs) {
    try {
      const resp = await emailBackInStock({
        to: s.email,
        user: s.user ? { _id: s.user } : null,
        product,
      });

      await BackInStockLog.create({
        subscription: s._id,
        product: productId,
        variant: s.variant || undefined,
        email: s.email,
        status: "sent",
        providerId: resp?.messageId || undefined,
        stockAtSend: total,
      });

      // one-shot: deactivate after sending
      await BackInStockSubscription.findByIdAndUpdate(s._id, {
        active: false,
        lastNotifiedAt: new Date(),
      });

      sent += 1;
    } catch (err) {
      await BackInStockLog.create({
        subscription: s._id,
        product: productId,
        variant: s.variant || undefined,
        email: s.email,
        status: "failed",
        error: err?.message || String(err),
        stockAtSend: total,
      });
      skipped += 1;
    }
  }

  return { sent, skipped, reason: null };
}
