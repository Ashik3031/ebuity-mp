// controllers/cartController.js
import mongoose from 'mongoose';
import Cart from '../models/cartModel.js';
import Variant from '../models/Variants.js';
import Product from '../models/Product.js';

/**
 * Build a shaped cart payload that survives hard-deletes and inactive items.
 * - Keeps lines even if product/variant is deleted or inactive
 * - Adds { unavailable: true, reason: 'PRODUCT_DELETED' | 'VARIANT_DELETED' | 'PRODUCT_INACTIVE' | 'VARIANT_INACTIVE' }
 * - Returns unitPrice (variant.price or product.defaultPrice)
 * - Totals exclude unavailable lines
 */
function shapeCart(cart) {
  if (!cart) return { items: [], totals: { subtotal: 0, count: 0, unavailableCount: 0 } };

  const items = (cart.items || []).map((line) => {
    const p = line.product || null;   // may be null if hard-deleted / not populated
    const v = line.variant || null;   // may be null if hard-deleted, or null for simple products

    const productMissing = !p;
    const variantMissing = !!line.variant && !v;
    const productInactive = !!p && p.isActive === false;
    const variantInactive = !!v && v.isActive === false;

    const unavailable = productMissing || variantMissing || productInactive || variantInactive;

    let reason = null;
    if (productMissing) reason = 'PRODUCT_DELETED';
    else if (variantMissing) reason = 'VARIANT_DELETED';
    else if (productInactive) reason = 'PRODUCT_INACTIVE';
    else if (variantInactive) reason = 'VARIANT_INACTIVE';

    const unitPrice = v?.price ?? p?.defaultPrice ?? 0;

    return {
      productId: p?._id || line.product,                  // keep raw id if not populated
      variantId: v?._id || line.variant || null,
      quantity: line.quantity ?? 1,

      // minimal display info (so UI doesn't need to re-resolve from products slice)
      product: p ? { _id: p._id, name: p.name, images: p.images ?? [], slug: p.slug } : null,
      variant: v ? { _id: v._id, price: v.price } : null,

      unitPrice,
      lineTotal: unavailable ? 0 : unitPrice * (line.quantity ?? 0),
      unavailable,
      reason,
    };
  });

  const totals = items.reduce(
    (acc, i) => {
      if (!i.unavailable) {
        acc.subtotal += i.lineTotal;
        acc.count += i.quantity;
      } else {
        acc.unavailableCount += 1;
      }
      return acc;
    },
    { subtotal: 0, count: 0, unavailableCount: 0 }
  );

  return { items, totals };
}

/** Helper: populate cart consistently everywhere */
async function populateCart(cart) {
  if (!cart) return cart;
  await cart.populate([
    { path: 'items.product', select: 'name images defaultPrice defaultStock isActive slug' },
    { path: 'items.variant', select: 'price stock isActive product' },
  ]);
  return cart;
}

/** Helper: stock cap based on simple product or variant */
function getStockCap({ product, variant }) {
  if (variant) return typeof variant.stock === 'number' ? variant.stock : 0;
  return typeof product?.defaultStock === 'number' ? product.defaultStock : 0;
}

/** GET /api/cart */
// controllers/cartController.js  (your getCart)
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId })
      .populate([
        { path: 'items.product', select: 'name images defaultPrice defaultStock isActive slug' },
        { path: 'items.variant', select: 'price stock isActive product' }
      ]);

    if (!cart) return res.status(200).json({ items: [] });

    const shaped = {
      _id: cart._id,
      items: cart.items.map((line) => {
        const p = line.product;     // may be null
        const v = line.variant;     // may be null
        const productMissing = !p;
        const variantMissing = !!line.variant && !v;
        const productInactive = !!p && p.isActive === false;
        const variantInactive = !!v && v.isActive === false;

        const unavailable = productMissing || variantMissing || productInactive || variantInactive;

        const unitPrice = v?.price ?? p?.defaultPrice ?? 0;

        let reason = null;
        if (productMissing) reason = 'PRODUCT_DELETED';
        else if (variantMissing) reason = 'VARIANT_DELETED';
        else if (productInactive) reason = 'PRODUCT_INACTIVE';
        else if (variantInactive) reason = 'VARIANT_INACTIVE';

        return {
          lineId: line._id, // 👈 expose stable subdocument id
          productId: line.product?._id || line.product || null,
          variantId: line.variant?._id || line.variant || null,
          quantity: line.quantity,
          product: p ? { _id: p._id, name: p.name, images: p.images ?? [], defaultPrice: p.defaultPrice, slug: p.slug } : null,
          variant: v ? { _id: v._id, price: v.price } : null,
          unitPrice,
          lineTotal: unavailable ? 0 : unitPrice * line.quantity,
          unavailable,
          reason,
        };
      })
    };

    const totals = shaped.items.reduce(
      (acc, i) => {
        if (!i.unavailable) {
          acc.subtotal += i.lineTotal;
          acc.count += i.quantity;
        } else {
          acc.unavailableCount += 1;
        }
        return acc;
      },
      { subtotal: 0, count: 0, unavailableCount: 0 }
    );

    return res.status(200).json({ items: shaped.items, totals });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch cart', details: err.message });
  }
};


/** POST /api/cart/add */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const productId = (req.body.productId || '').trim();
    const variantId = (req.body.variantId || '').trim(); // may be ''
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid productId' });
    }

    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let variant = null;
    let lineVariantId = undefined;

    if (variantId) {
      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({ error: 'Invalid variantId' });
      }
      variant = await Variant.findById(variantId);
      if (!variant || variant.isActive === false) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      // ensure variant belongs to product
      if (String(variant.product) !== String(product._id)) {
        return res.status(400).json({ error: 'Variant does not belong to product' });
      }
      lineVariantId = variant._id;
    }

    const stockCap = getStockCap({ product, variant });
    if (stockCap < 1) {
      return res.status(400).json({ error: 'Out of stock' });
    }
    if (quantity > stockCap) {
      return res.status(400).json({ error: `Only ${stockCap} item(s) left in stock` });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const idx = cart.items.findIndex(
      (i) =>
        String(i.product) === String(productId) &&
        String(i.variant || '') === String(lineVariantId || '')
    );

    if (idx > -1) {
      const newQty = (cart.items[idx].quantity || 0) + quantity;
      if (newQty > stockCap) {
        return res.status(400).json({ error: `Only ${stockCap} item(s) left in stock` });
      }
      cart.items[idx].quantity = newQty;
    } else {
      cart.items.push({
        product: productId,
        variant: lineVariantId, // undefined for simple products
        quantity,
      });
    }

    await cart.save();
    await populateCart(cart);
    return res.status(200).json(shapeCart(cart));
  } catch (err) {
    console.error('addToCart error:', err);
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid id format', details: err.message });
    }
    return res.status(500).json({ error: 'Failed to add to cart.', details: err.message });
  }
};

//mergeCart
export const mergeCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!items.length) return res.json({ success: true });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = await Cart.create({ user: userId, items: [] });

    for (const it of items) {
      const pid = String(it.productId || "");
      const vid = it.variantId ? String(it.variantId) : null;
      const qty = Math.max(1, Number(it.quantity || 1));

      if (!pid) continue;

      const idx = cart.items.findIndex(
        (x) => String(x.product) === pid && String(x.variant || "") === String(vid || "")
      );

      if (idx >= 0) {
        cart.items[idx].quantity = (cart.items[idx].quantity || 0) + qty;
      } else {
        cart.items.push({
          product: pid,
          variant: vid,
          quantity: qty,
        });
      }
    }

    await cart.save();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


/** POST /api/cart/remove */
export const removeFromCart = async (req, res) => {
  const userId = req.user._id;
  const { lineId, productId, variantId } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found.' });

    let changed = false;

    if (lineId && mongoose.Types.ObjectId.isValid(lineId)) {
      const sub = cart.items.id(lineId);
      if (sub) {
        sub.deleteOne(); // remove that subdocument
        changed = true;
      }
    } else if (productId) {
      // legacy fallback if you still want it
      const before = cart.items.length;
      cart.items = cart.items.filter(
        (i) =>
          !(
            String(i.product) === String(productId) &&
            String(i.variant || '') === String(variantId || '')
          )
      );
      changed = cart.items.length !== before;
    }

    if (!changed) {
      // nothing matched — return 404 for clarity
      return res.status(404).json({ error: 'Cart line not found.' });
    }

    await cart.save();
    await cart.populate([{ path: 'items.product' }, { path: 'items.variant' }]);

    // Optional: re-shape identically to getCart
    const shaped = {
      items: cart.items.map((line) => ({
        lineId: line._id,
        productId: line.product?._id || line.product || null,
        variantId: line.variant?._id || line.variant || null,
        quantity: line.quantity,
        product: line.product ? { _id: line.product._id, name: line.product.name, images: line.product.images ?? [], slug: line.product.slug } : null,
        variant: line.variant ? { _id: line.variant._id, price: line.variant.price } : null,
        unitPrice: (line.variant?.price ?? line.product?.defaultPrice ?? 0),
        unavailable:
          !line.product || (!!line.product && line.product.isActive === false) ||
          (!!line.variant && (!line.variant || line.variant.isActive === false)),
        reason: !line.product
          ? 'PRODUCT_DELETED'
          : (!!line.variant && !line.variant)
            ? 'VARIANT_DELETED'
            : (!!line.product && line.product.isActive === false)
              ? 'PRODUCT_INACTIVE'
              : (!!line.variant && line.variant.isActive === false)
                ? 'VARIANT_INACTIVE'
                : null,
      })),
    };

    return res.status(200).json(shaped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove from cart', details: err.message });
  }
};
/** DELETE /api/cart/clear */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    // Return empty shaped cart for consistency
    return res.status(200).json({ items: [], totals: { subtotal: 0, count: 0, unavailableCount: 0 } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear cart', details: err.message });
  }
};

/**
 * PATCH /api/cart/update
 * Set an exact quantity for a line (productId + variantId).
 * - If qty === 0 → remove line
 * - If product/variant is unavailable (deleted/inactive) → reject with 409 ('unavailable')
 * - If qty > stockCap → 400 with message
 * Returns full shaped cart on success.
 */
export const setCartQuantity = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { productId, variantId, quantity } = req.body;
    const qty = Math.max(0, Number(quantity) || 0);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found.' });

    const idx = cart.items.findIndex(
      (i) =>
        String(i.product) === String(productId) &&
        String(i.variant || '') === String(variantId || '')
    );
    if (idx === -1) return res.status(404).json({ error: 'Cart line not found.' });

    // Load current product/variant to validate availability & stock
    const product = await Product.findById(productId);
    const variant = variantId ? await Variant.findById(variantId) : null;

    const productMissing = !product;
    const variantMissing = !!variantId && !variant;
    const productInactive = !!product && product.isActive === false;
    const variantInactive = !!variant && variant.isActive === false;

    // If this line is now unavailable, we keep it in the DB for UX, but we don't allow qty changes.
    if (productMissing || variantMissing || productInactive || variantInactive) {
      await populateCart(cart); // return current state with 'unavailable' flags
      return res.status(409).json({
        error: 'unavailable',
        reason: productMissing
          ? 'PRODUCT_DELETED'
          : variantMissing
            ? 'VARIANT_DELETED'
            : productInactive
              ? 'PRODUCT_INACTIVE'
              : 'VARIANT_INACTIVE',
        cart: shapeCart(cart),
      });
    }

    // Stock cap validation
    const stockCap = getStockCap({ product, variant });
    if (qty > stockCap) {
      return res.status(400).json({ error: `Only ${stockCap} item(s) left in stock` });
    }

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = qty;
    }

    await cart.save();
    await populateCart(cart);
    return res.status(200).json(shapeCart(cart));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update quantity', details: err.message });
  }
};
