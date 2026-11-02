// backend/utils/stock.util.js
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import StockMovement from "../models/StockMovement.js";

/**
 * Decrement stock for each cart line.
 * - If variantId exists -> decrement Variant.stock
 * - else -> decrement Product.defaultStock
 *
 * When `session` is provided, operations are inside the Mongo transaction.
 * When `session` is NOT provided, this function will roll back already-decremented
 * lines if a later line fails.
 */
export async function checkAndDecrementStock(lines, session) {
  const decremented = []; // for manual rollback when no session

  try {
    for (const line of lines) {
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) {
        const err = new Error("Invalid quantity");
        err.status = 400;
        throw err;
      }

      if (line.variantId) {
        // Variant flow
        const updated = await Variant.findOneAndUpdate(
          { _id: line.variantId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true, session }
        );
        if (!updated) {
          const err = new Error("Insufficient stock for variant");
          err.status = 409;
          err.line = line;
          throw err;
        }

        try {
          await StockMovement.create(
            [
              {
                product: line.productId,
                variant: line.variantId,
                type: "order_sale",
                previousStock: updated.stock + qty,
                change: -qty,
                newStock: updated.stock,
                reason: "Customer Order Purchase",
                performedBy: { name: "System (Order Sale)" },
              },
            ],
            session ? { session } : {}
          );
        } catch {
          // ignore non-fatal audit log error
        }

        if (!session) decremented.push({ type: "variant", id: line.variantId, qty });
      } else {
        // Product fallback flow
        const updated = await Product.findOneAndUpdate(
          { _id: line.productId, defaultStock: { $gte: qty } },
          { $inc: { defaultStock: -qty } },
          { new: true, session }
        );
        if (!updated) {
          const err = new Error("Insufficient stock for product");
          err.status = 409;
          err.line = line;
          throw err;
        }

        try {
          await StockMovement.create(
            [
              {
                product: line.productId,
                type: "order_sale",
                previousStock: (updated.defaultStock ?? 0) + qty,
                change: -qty,
                newStock: updated.defaultStock ?? 0,
                reason: "Customer Order Purchase",
                performedBy: { name: "System (Order Sale)" },
              },
            ],
            session ? { session } : {}
          );
        } catch {
          // ignore non-fatal audit log error
        }

        if (!session) decremented.push({ type: "product", id: line.productId, qty });
      }
    }
  } catch (err) {
    // Manual rollback only if we are NOT in a transaction
    if (!session && decremented.length) {
      await Promise.all(
        decremented.map((d) =>
          d.type === "variant"
            ? Variant.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } })
            : Product.findByIdAndUpdate(d.id, { $inc: { defaultStock: d.qty } })
        )
      );
    }
    throw err;
  }
}

/** Add stock back for each line (used when cancelling a Pending order). */
export async function restock(lines, session) {
  await Promise.all(
    lines.map(async (line) => {
      const qty = Number(line.quantity) || 0;
      if (!qty) return null;

      if (line.variantId) {
        const updated = await Variant.findByIdAndUpdate(
          line.variantId,
          { $inc: { stock: qty } },
          { new: true, session }
        );
        if (updated) {
          try {
            await StockMovement.create(
              [
                {
                  product: line.productId,
                  variant: line.variantId,
                  type: "order_cancel",
                  previousStock: updated.stock - qty,
                  change: qty,
                  newStock: updated.stock,
                  reason: "Cancelled Order Restock",
                  performedBy: { name: "System (Order Cancel)" },
                },
              ],
              session ? { session } : {}
            );
          } catch {}
        }
        return updated;
      } else {
        const updated = await Product.findByIdAndUpdate(
          line.productId,
          { $inc: { defaultStock: qty } },
          { new: true, session }
        );
        if (updated) {
          try {
            await StockMovement.create(
              [
                {
                  product: line.productId,
                  type: "order_cancel",
                  previousStock: (updated.defaultStock ?? 0) - qty,
                  change: qty,
                  newStock: updated.defaultStock ?? 0,
                  reason: "Cancelled Order Restock",
                  performedBy: { name: "System (Order Cancel)" },
                },
              ],
              session ? { session } : {}
            );
          } catch {}
        }
        return updated;
      }
    })
  );
}

