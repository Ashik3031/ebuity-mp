// controllers/variantController.js
import Variant from '../models/Variants.js';
import { notifyBackInStockForProduct } from '../services/backInStockService.js';

/**
 * GET /api/variants/:id
 */
const getVariantById = async (req, res) => {
  try {
    const variant = await Variant.findById(req.params.id).populate('product');
    if (!variant) return res.status(404).json({ message: 'Variant not found' });
    res.json(variant);
  } catch (error) {
    res.status(404).json({ message: 'Variant not found', error: error.message });
  }
};

/**
 * PATCH /api/variants/:id
 * Allows updating stock/price/isActive/etc.
 * If stock transitions from <=0 to >0 OR isActive goes false->true, we notify.
 */
const updateVariant = async (req, res) => {
  try {
    const current = await Variant.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Variant not found' });

    const prevStock = Number(current.stock) || 0;
    const prevActive = current.isActive !== false;

    // apply patch
    if ('stock' in req.body) current.stock = parseInt(req.body.stock ?? 0, 10);
    if ('price' in req.body) current.price = parseFloat(req.body.price ?? current.price);
    if ('compareAtPrice' in req.body) current.compareAtPrice = parseFloat(req.body.compareAtPrice ?? current.compareAtPrice);
    if ('isActive' in req.body) current.isActive = !!req.body.isActive;
    if ('optionValues' in req.body && req.body.optionValues) current.optionValues = req.body.optionValues;
    if ('images' in req.body && Array.isArray(req.body.images)) current.images = req.body.images.slice(0, 4);

    await current.save();

    const newStock = Number(current.stock) || 0;
    const newActive = current.isActive !== false;

    // Trigger notify when coming back into availability
    const stockCameBack = prevStock <= 0 && newStock > 0;
    const reactivated = !prevActive && newActive === true;

    if (stockCameBack || reactivated) {
      // Fire and forget is fine; await for determinism/logging
      await notifyBackInStockForProduct(current.product);
    }

    res.json(current);
  } catch (error) {
    console.error('updateVariant error:', error);
    res.status(500).json({ message: 'Failed to update variant', error: error.message });
  }
};

/**
 * POST /api/variants/reduce-stock
 * Reduces stock (e.g., after order). No notify here.
 */
const reduceStock = async (req, res) => {
  const { variantId, quantity } = req.body;

  try {
    const variant = await Variant.findById(variantId);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    const qty = Math.max(1, Number(quantity) || 1);
    if (variant.stock < qty) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    variant.stock -= qty;
    await variant.save();

    res.status(200).json({
      message: 'Stock updated successfully',
      remainingStock: variant.stock,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error reducing stock', error: error.message });
  }
};

/**
 * DELETE /api/variants/:id
 */
const deleteVariant = async (req, res) => {
  try {
    await Variant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete variant', error: error.message });
  }
};

/**
 * GET /api/variants/by-product/:productId
 */



//new code - archana
const getVariantsByProduct = async (req, res) => {
  try {
    const variants = await Variant.find({ product: req.params.productId });
    return res.status(200).json(variants); // ✅ [] if none
  } catch (error) {
    return res.status(500).json({ message: "Error fetching variants", error: error.message });
  }
};




export default {
  getVariantById,
  updateVariant,
  deleteVariant,
  reduceStock,
  getVariantsByProduct,
};
