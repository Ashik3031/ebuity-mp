// services/inventory.js
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";

/**
 * items: [{ productId, variantId?: string|null, quantity: number }]
 * Must be called INSIDE a session/transaction.
 * Throws { status: 409, message, details } on insufficient stock.
 */
export async function checkAndDecrementStock(items, session) {
  for (const line of items) {
    const { productId, variantId, quantity } = line;

    if (!quantity || quantity <= 0) {
      const err = new Error("Invalid quantity");
      err.status = 400;
      throw err;
    }

    if (variantId) {
      const res = await Variant.updateOne(
        { _id: variantId, product: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { session }
      );
      if (res.modifiedCount !== 1) {
        const v = await Variant.findById(variantId).select("stock").session(session);
        const err = new Error(`Insufficient stock for this variant. Only ${v?.stock ?? 0} left.`);
        err.status = 409;
        err.details = { productId, variantId, left: v?.stock ?? 0 };
        throw err;
      }
    } else {
      // NOTE: your Product uses defaultStock (not stock)
      const res = await Product.updateOne(
        { _id: productId, defaultStock: { $gte: quantity } },
        { $inc: { defaultStock: -quantity } },
        { session }
      );
      if (res.modifiedCount !== 1) {
        const p = await Product.findById(productId).select("defaultStock").session(session);
        const err = new Error(`Insufficient stock. Only ${p?.defaultStock ?? 0} left.`);
        err.status = 409;
        err.details = { productId, left: p?.defaultStock ?? 0 };
        throw err;
      }
    }
  }
}
