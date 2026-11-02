// backend/utils/offer.util.js  (ESM)

import mongoose from "mongoose";
import Offer from "../models/Offer.js";

const toObjectIds = (ids = []) => {
  const uniq = [...new Set(ids.filter(Boolean).map(String))];
  return uniq
    .filter(s => mongoose.Types.ObjectId.isValid(s))
    .map(s => new mongoose.Types.ObjectId(s));
};

// Fetch active offers
export async function fetchActiveOffers({ productIds = [], categoryIds = [] } = {}) {
  const now = new Date();
  const timeWindow = {
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt:   { $exists: false } }, { endsAt: null },   { endsAt:   { $gt: now } }] },
    ],
  };

  const or = [{ "scope.kind": "all" }];
  if (productIds.length) or.push({ "scope.kind": "products", "scope.products": { $in: toObjectIds(productIds) } });
  if (categoryIds.length) or.push({ "scope.kind": "categories", "scope.categories": { $in: toObjectIds(categoryIds) } });

  const offers = await Offer.find({ active: true, ...timeWindow, $or: or }).lean();

  // exclusive → priority → type (percent first) → value
  offers.sort((a, b) => {
    if ((b.exclusive ? 1 : 0) !== (a.exclusive ? 1 : 0)) return (b.exclusive ? 1 : 0) - (a.exclusive ? 1 : 0);
    if ((b.priority ?? 0) !== (a.priority ?? 0)) return (b.priority ?? 0) - (a.priority ?? 0);
    const tb = b.type === "percent" ? 1 : 0;
    const ta = a.type === "percent" ? 1 : 0;
    if (tb !== ta) return tb - ta;
    return (b.value ?? 0) - (a.value ?? 0);
  });

  return offers;
}

// ✅ CLOSES PROPERLY NOW
export function matchOfferToProduct(offer, product) {
  const kind = offer?.scope?.kind;
  if (kind === "all") return true;

  if (kind === "products") {
    const ids = (offer.scope.products || []).map(String);
    return ids.includes(String(product._id));
  }

  if (kind === "categories") {
    const includeDesc = offer.scope.includeDescendants !== false;
    const offerCatIds = (offer.scope.categories || []).map(String);

    const path = (product.categoryPath || []).map(String);
    const leaf = String(
      product.subcategory || product.category || (product.categoryPath?.slice(-1)[0] ?? "")
    );

    if (includeDesc) {
      if (path.length) return offerCatIds.some(id => path.includes(id));
      return leaf && offerCatIds.includes(leaf); // fallback when path missing
    }
    return leaf && offerCatIds.includes(leaf);   // leaf-only
  }

  return false; // <-- important default
}

export function pickBestOfferForProduct(offers, product) {
  return offers.find(o => matchOfferToProduct(o, product)) || null;
}

export function applyOfferToPrice(basePrice, offer) {
  const p = Number(basePrice) || 0;
  if (!offer) return { salePrice: p, discount: 0 };

  let raw = 0;
  if (offer.type === "amount") {
    raw = Math.max(0, Number(offer.value) || 0);
  } else {
    const pct = Math.max(0, Math.min(100, Number(offer.value) || 0));
    raw = (p * pct) / 100;
    const hasCap = offer.maxDiscount !== null && offer.maxDiscount !== undefined;
    const cap = hasCap ? Number(offer.maxDiscount) : Infinity;
    raw = Math.min(raw, cap);
  }

  const discount = Math.min(raw, p);
  return { salePrice: Math.max(0, p - discount), discount };
}

export function decorateProductWithOffer(product, offers, { listPriceFrom = "first" } = {}) {
  const best = pickBestOfferForProduct(offers, product);
  const skipSaleItems = best && !best.applyToSaleItems;
  const clone = { ...product };

  if (Array.isArray(clone.variants) && clone.variants.length) {
    clone.variants = clone.variants.map(v => {
      const base = Number(v.price) || 0;
      const alreadyOnSale = v.compareAtPrice && Number(v.compareAtPrice) > base;
      if (skipSaleItems && alreadyOnSale) return { ...v, salePrice: base, discount: 0, appliedOffer: null };
      const { salePrice, discount } = applyOfferToPrice(base, best);
      return { ...v, salePrice, discount, appliedOffer: best ? { _id: best._id, name: best.name, type: best.type, value: best.value } : null };
    });

    const idx = listPriceFrom === "min"
      ? clone.variants.reduce((mi, v, i, a) => (Number(v.price) < Number(a[mi].price) ? i : mi), 0)
      : 0;

    const basePrice = Number(product.variants[idx].price) || 0;
    const salePrice = Number(clone.variants[idx].salePrice) || basePrice;
    clone.pricing = { basePrice, salePrice, discount: Math.max(0, basePrice - salePrice) };
    clone.activeOffer = best ? { _id: best._id, name: best.name, type: best.type, value: best.value } : null;
    return clone;
  }

  const base = Number(clone.price) || 0;
  const alreadyOnSale = clone.compareAtPrice && Number(clone.compareAtPrice) > base;
  if (skipSaleItems && alreadyOnSale) {
    clone.salePrice = base; clone.discount = 0; clone.appliedOffer = null;
    clone.pricing = { basePrice: base, salePrice: base, discount: 0 };
    clone.activeOffer = null;
    return clone;
  }

  const { salePrice, discount } = applyOfferToPrice(base, best);
  clone.salePrice = salePrice; clone.discount = discount;
  clone.appliedOffer = best ? { _id: best._id, name: best.name, type: best.type, value: best.value } : null;
  clone.pricing = { basePrice: base, salePrice, discount };
  clone.activeOffer = clone.appliedOffer;
  return clone;
}

export async function attachOfferPricingToProducts(products, { listPriceFrom = "first" } = {}) {
  const productIds = products.map(p => p._id);
  const categoryIds = Array.from(new Set(products.flatMap(p => {
    const path = p.categoryPath || [];
    const leaf = p.categoryId || p.category || p.subcategory;
    return [...path, leaf].filter(Boolean);
  })));
  const offers = await fetchActiveOffers({ productIds, categoryIds });
  return products.map(p => decorateProductWithOffer(p, offers, { listPriceFrom }));
}
