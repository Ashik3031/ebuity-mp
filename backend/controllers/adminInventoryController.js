import mongoose from "mongoose";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import Category from "../models/Category.js";
import BackInStockSubscription from "../models/BackInStockSubscription.js";
import StockMovement from "../models/StockMovement.js";
import {
  computeProductStock,
  notifyBackInStockForProduct,
} from "../services/backInStockService.js";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * GET /api/admin/inventory/summary
 * Provides executive inventory KPIs and health status
 */
export const getInventorySummary = async (req, res) => {
  try {
    const [products, variants, activeSubsCount, recentMovements] = await Promise.all([
      Product.find({}).select("_id name defaultPrice price defaultStock stock sku category isActive").lean(),
      Variant.find({}).select("_id product price stock sku isActive").lean(),
      BackInStockSubscription.countDocuments({ active: true }),
      StockMovement.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("product", "name images")
        .populate("variant", "sku")
        .lean(),
    ]);

    let totalUnits = 0;
    let totalValuation = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let inStockCount = 0;

    // Set of products that have active variants
    const productVariantMap = new Map();
    for (const v of variants) {
      const pid = v.product.toString();
      if (!productVariantMap.has(pid)) productVariantMap.set(pid, []);
      productVariantMap.get(pid).push(v);
    }

    for (const p of products) {
      const pVariants = productVariantMap.get(p._id.toString()) || [];
      let itemStock = 0;
      let itemPrice = Number(p.defaultPrice || p.price || 0);

      if (pVariants.length > 0) {
        for (const v of pVariants) {
          const vStock = Number(v.stock || 0);
          const vPrice = Number(v.price || itemPrice);
          totalUnits += vStock;
          totalValuation += vStock * vPrice;
          itemStock += vStock;
        }
      } else {
        itemStock = Number(p.defaultStock ?? p.stock ?? 0);
        totalUnits += itemStock;
        totalValuation += itemStock * itemPrice;
      }

      if (itemStock <= 0) {
        outOfStockCount++;
      } else if (itemStock <= DEFAULT_LOW_STOCK_THRESHOLD) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    res.json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalVariants: variants.length,
        totalSkus: products.length + variants.length,
        totalUnits,
        totalValuation: Math.round(totalValuation * 100) / 100,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        waitlistSubscribersCount: activeSubsCount,
      },
      recentMovements,
    });
  } catch (err) {
    console.error("getInventorySummary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/inventory/products
 * Detailed product inventory table with search, status filters, and variant info
 */
export const getInventoryProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      status = "all", // all, in_stock, low_stock, out_stock
      category,
      q,
      sort = "stock_asc",
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const filter = {};
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    if (q?.trim()) {
      filter.$or = [
        { name: new RegExp(q.trim(), "i") },
        { sku: new RegExp(q.trim(), "i") },
      ];
    }

    // Fetch all products matching basic filter
    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate("brand", "name")
      .lean();

    const productIds = products.map((p) => p._id);

    // Fetch variants and waitlist counts in parallel
    const [allVariants, waitlistCounts] = await Promise.all([
      Variant.find({ product: { $in: productIds } }).lean(),
      BackInStockSubscription.aggregate([
        { $match: { product: { $in: productIds }, active: true } },
        { $group: { _id: "$product", count: { $sum: 1 } } },
      ]),
    ]);

    const waitlistMap = new Map(
      waitlistCounts.map((w) => [w._id.toString(), w.count])
    );

    const variantMap = new Map();
    for (const v of allVariants) {
      const pid = v.product.toString();
      if (!variantMap.has(pid)) variantMap.set(pid, []);
      variantMap.get(pid).push(v);
    }

    // Decorate products with computed stock and status
    const decorated = products.map((p) => {
      const pVars = variantMap.get(p._id.toString()) || [];
      const hasVariants = pVars.length > 0;
      let totalStock = 0;

      if (hasVariants) {
        totalStock = pVars.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
        totalStock = Number(p.defaultStock ?? p.stock ?? 0);
      }

      let stockStatus = "in_stock";
      if (totalStock <= 0) {
        stockStatus = "out_stock";
      } else if (totalStock <= DEFAULT_LOW_STOCK_THRESHOLD) {
        stockStatus = "low_stock";
      }

      return {
        ...p,
        stock: totalStock,
        hasVariants,
        variants: pVars,
        stockStatus,
        waitlistCount: waitlistMap.get(p._id.toString()) || 0,
      };
    });

    // Apply stock status filter
    let filtered = decorated;
    if (status === "in_stock") {
      filtered = decorated.filter((d) => d.stockStatus === "in_stock");
    } else if (status === "low_stock") {
      filtered = decorated.filter((d) => d.stockStatus === "low_stock");
    } else if (status === "out_stock") {
      filtered = decorated.filter((d) => d.stockStatus === "out_stock");
    }

    // Sort
    if (sort === "stock_asc") {
      filtered.sort((a, b) => a.stock - b.stock);
    } else if (sort === "stock_desc") {
      filtered.sort((a, b) => b.stock - a.stock);
    } else if (sort === "name_asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "price_desc") {
      filtered.sort(
        (a, b) =>
          Number(b.defaultPrice || b.price || 0) -
          Number(a.defaultPrice || a.price || 0)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      items: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("getInventoryProducts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/inventory/adjust
 * Adjust stock for a product or variant (add, subtract, set) with audit logging
 */
export const adjustStock = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      productId,
      variantId,
      mode = "add", // "add" | "subtract" | "set"
      quantity,
      type = "manual_adjustment", // "manual_adjustment", "inbound_receive", "damaged_loss"
      reason,
      referenceId,
    } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Valid productId is required" });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: "Quantity must be a non-negative number" });
    }

    const admin = req.admin || {};
    let updatedProduct;
    let updatedVariant = null;
    let prevStock = 0;
    let newStock = 0;
    let change = 0;

    await session.withTransaction(async () => {
      if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
        const v = await Variant.findById(variantId).session(session);
        if (!v) throw new Error("Variant not found");

        prevStock = Number(v.stock || 0);

        if (mode === "set") {
          newStock = qty;
          change = newStock - prevStock;
        } else if (mode === "subtract") {
          newStock = Math.max(0, prevStock - qty);
          change = -(prevStock - newStock);
        } else {
          // add
          newStock = prevStock + qty;
          change = qty;
        }

        v.stock = newStock;
        await v.save({ session });
        updatedVariant = v;
        updatedProduct = await Product.findById(productId).session(session);
      } else {
        const p = await Product.findById(productId).session(session);
        if (!p) throw new Error("Product not found");

        prevStock = Number(p.defaultStock ?? p.stock ?? 0);

        if (mode === "set") {
          newStock = qty;
          change = newStock - prevStock;
        } else if (mode === "subtract") {
          newStock = Math.max(0, prevStock - qty);
          change = -(prevStock - newStock);
        } else {
          // add
          newStock = prevStock + qty;
          change = qty;
        }

        p.defaultStock = newStock;
        p.stock = newStock;
        await p.save({ session });
        updatedProduct = p;
      }

      // Record stock audit movement
      await StockMovement.create(
        [
          {
            product: productId,
            variant: variantId || null,
            type,
            previousStock: prevStock,
            change,
            newStock,
            reason: reason || `Manual stock update (${mode})`,
            referenceId: referenceId || null,
            performedBy: {
              id: admin._id ? admin._id.toString() : null,
              name: admin.name || "Admin",
              email: admin.email || null,
              role: admin.role || "admin",
            },
          },
        ],
        { session }
      );
    });

    session.endSession();

    // Trigger back-in-stock notification if product transitioned from 0 to > 0
    if (prevStock <= 0 && newStock > 0) {
      notifyBackInStockForProduct(productId).catch((e) =>
        console.error("notifyBackInStock error after adjust:", e)
      );
    }

    res.json({
      success: true,
      message: `Stock successfully adjusted (${change >= 0 ? "+" : ""}${change} units)`,
      previousStock: prevStock,
      newStock,
      product: updatedProduct,
      variant: updatedVariant,
    });
  } catch (err) {
    session.endSession();
    console.error("adjustStock error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/inventory/receive-batch
 * Batch receive stock from supplier / inbound shipment
 */
export const receiveBatch = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { batchNumber, supplier, items = [], note } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    const admin = req.admin || {};
    const results = [];
    const productsToNotify = new Set();

    await session.withTransaction(async () => {
      for (const item of items) {
        const { productId, variantId, quantity } = item;
        const qty = Number(quantity);
        if (!productId || qty <= 0) continue;

        let prevStock = 0;
        let newStock = 0;

        if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
          const v = await Variant.findById(variantId).session(session);
          if (v) {
            prevStock = Number(v.stock || 0);
            newStock = prevStock + qty;
            v.stock = newStock;
            await v.save({ session });
          }
        } else {
          const p = await Product.findById(productId).session(session);
          if (p) {
            prevStock = Number(p.defaultStock ?? p.stock ?? 0);
            newStock = prevStock + qty;
            p.defaultStock = newStock;
            p.stock = newStock;
            await p.save({ session });
          }
        }

        if (prevStock <= 0 && newStock > 0) {
          productsToNotify.add(productId);
        }

        await StockMovement.create(
          [
            {
              product: productId,
              variant: variantId || null,
              type: "inbound_receive",
              previousStock: prevStock,
              change: qty,
              newStock,
              reason: note || `Inbound Batch ${batchNumber || ""} from ${supplier || "Supplier"}`,
              referenceId: batchNumber || null,
              performedBy: {
                id: admin._id ? admin._id.toString() : null,
                name: admin.name || "Admin",
                email: admin.email || null,
                role: admin.role || "admin",
              },
            },
          ],
          { session }
        );

        results.push({ productId, variantId, received: qty, newStock });
      }
    });

    session.endSession();

    // Trigger back in stock for any newly available products
    for (const pid of productsToNotify) {
      notifyBackInStockForProduct(pid).catch((e) =>
        console.error("notifyBackInStock error after batch receive:", e)
      );
    }

    res.json({
      success: true,
      message: `Successfully received ${results.length} items into inventory`,
      results,
    });
  } catch (err) {
    session.endSession();
    console.error("receiveBatch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/inventory/movements
 * Returns stock movement audit history
 */
export const getStockMovements = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, productId } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const filter = {};
    if (type && type !== "all") {
      filter.type = type;
    }
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.product = productId;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("product", "name images defaultPrice sku")
        .populate("variant", "sku price")
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    res.json({
      success: true,
      movements,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("getStockMovements error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/inventory/waitlist
 * Back-in-stock subscriber waitlist
 */
export const getWaitlistSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 20, productId, active } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const filter = {};
    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.product = productId;
    }

    const [subscribers, total] = await Promise.all([
      BackInStockSubscription.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("product", "name images slug defaultStock")
        .populate("user", "name email")
        .lean(),
      BackInStockSubscription.countDocuments(filter),
    ]);

    res.json({
      success: true,
      subscribers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("getWaitlistSubscribers error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/inventory/waitlist/notify/:productId
 * Manually trigger back-in-stock email notifications
 */
export const triggerWaitlistNotify = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Valid productId required" });
    }

    const result = await notifyBackInStockForProduct(productId);
    res.json({
      success: true,
      message: `Notification run complete. Sent: ${result.sent}, Skipped: ${result.skipped || 0}`,
      result,
    });
  } catch (err) {
    console.error("triggerWaitlistNotify error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
