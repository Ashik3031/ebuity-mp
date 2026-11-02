// // backend/utils/pricing.util.js
// import Setting from "../models/Setting.js";
// import Product from "../models/Product.js";
// import Variant from "../models/Variants.js";

// /**
//  * Load store settings (shipping + tax). Creates defaults if none exist.
//  * Returns an object with:
//  * - shipping: { freeOver, methods[], defaultMethodCode }
//  * - tax: { rate (percent), displayMode: "tax_exclusive" }
//  */
// export async function getStoreSettings() {
//   let s = await Setting.findOne({});
//   if (!s) {
//     s = await Setting.create({
//       shipping: {
//         freeOver: 199,
//         defaultMethodCode: "standard",
//         methods: [
//           { code: "standard", label: "Standard", amount: 15, etaDaysMin: 2, etaDaysMax: 4, active: true },
//           { code: "express", label: "Express", amount: 35, etaDaysMin: 1, etaDaysMax: 2, active: true }
//         ]
//       },
//       tax: { rate: 5, displayMode: "tax_exclusive" }
//     });
//   }
//   return s.toObject();
// }

// /**
//  * Compute subtotal using authoritative server prices.
//  * products: [{ productId, variantId, quantity }]
//  */
// export async function computeServerSubtotal(products) {
//   let subtotal = 0;

//   for (const line of products) {
//     const qty = Math.max(1, Number(line.quantity) || 1);

//     if (line.variantId) {
//       const v = await Variant.findById(line.variantId).select("price product");
//       if (!v) throw new Error("Variant not found");
//       // (optional) ensure belongs to product
//       if (line.productId && String(v.product) !== String(line.productId)) {
//         throw new Error("Variant does not belong to product");
//       }
//       subtotal += (Number(v.price) || 0) * qty;
//     } else {
//       const p = await Product.findById(line.productId).select("defaultPrice");
//       if (!p) throw new Error("Product not found");
//       subtotal += (Number(p.defaultPrice) || 0) * qty;
//     }
//   }

//   return subtotal;
// }

// /**
//  * Build the pricing snapshot based on settings and subtotal.
//  * - Choose default shipping method
//  * - Apply freeOver threshold
//  * - Calculate tax (exclusive only)
//  */
// export function buildPricingSnapshot({ subtotal, settings }) {
//   const currency = "INR"; // optional, if you want to tag later

//   // shipping
//   const methods = Array.isArray(settings?.shipping?.methods) ? settings.shipping.methods : [];
//   const active = methods.filter(m => m.active !== false);
//   const defCode = settings?.shipping?.defaultMethodCode || "standard";
//   const chosen = active.find(m => m.code === defCode) || active[0] || null;

//   let shippingFee = chosen ? Number(chosen.amount) || 0 : 0;
//   const freeOver = Number(settings?.shipping?.freeOver) || 0;
//   if (freeOver > 0 && subtotal >= freeOver) {
//     shippingFee = 0;
//   }

//   // tax (exclusive only)
//   const taxRatePct = Number(settings?.tax?.rate) || 0; // % (e.g., 5)
//   const taxMode = "tax_exclusive";
//   const taxableBase = subtotal + shippingFee;
//   const taxAmount = (taxRatePct / 100) * taxableBase;

//   const grandTotal = subtotal + shippingFee + taxAmount;

//   return {
//     subtotal,
//     shippingFee,
//     shippingMethod: chosen ? { code: chosen.code, label: chosen.label } : undefined,
//     deliveryEta: chosen ? `${chosen.etaDaysMin}-${chosen.etaDaysMax} days` : undefined,
//     taxAmount,
//     taxRate: taxRatePct,
//     taxMode,
//     grandTotal
//   };
// }


// backend/utils/pricing.util.js
import Setting from "../models/Setting.js";
import Product from "../models/Product.js";
import Variant from "../models/Variants.js";
import {
  fetchActiveOffers,
  pickBestOfferForProduct,
  applyOfferToPrice,
} from "./offer.util.js";

/**
 * Load store settings (shipping + tax). Creates defaults if none exist.
 */
export async function getStoreSettings() {
  let s = await Setting.findOne({});
  if (!s) {
    s = await Setting.create({
      shipping: {
        freeOver: 199,
        defaultMethodCode: "standard",
        methods: [
          { code: "standard", label: "Standard", amount: 15, etaDaysMin: 2, etaDaysMax: 4, active: true },
          { code: "express", label: "Express", amount: 35, etaDaysMin: 1, etaDaysMax: 2, active: true }
        ]
      },
      tax: { rate: 5, displayMode: "tax_exclusive" }
    });
  }
  return s.toObject();
}

/**
 * Compute subtotal using authoritative server prices, applying active Offers.
 * products: [{ productId, variantId, quantity }]
 */
export async function computeServerSubtotal(products) {
  // collect product ids that appear in the cart
  const productIds = [];
  for (const line of products) if (line.productId) productIds.push(line.productId);

  // fetch the product docs we need once
  const prods = await Product.find({ _id: { $in: productIds } })
    .select("defaultPrice categoryPath")
    .lean();
  const pMap = new Map(prods.map(p => [String(p._id), p]));

  // prefetch active offers relevant to these products/categories
  const allCategoryIds = prods.flatMap(p => p.categoryPath || []);
  const activeOffers = await fetchActiveOffers({
    productIds,
    categoryIds: allCategoryIds,
  });

  let subtotal = 0;

  for (const line of products) {
    const qty = Math.max(1, Number(line.quantity) || 1);
    const pdoc = pMap.get(String(line.productId));
    if (!pdoc) throw new Error("Product not found");

    // choose best offer for this product
    const best = pickBestOfferForProduct(activeOffers, pdoc);

    if (line.variantId) {
      const v = await Variant.findById(line.variantId).select("price product");
      if (!v) throw new Error("Variant not found");
      if (String(v.product) !== String(line.productId)) {
        throw new Error("Variant does not belong to product");
      }
      const { salePrice } = applyOfferToPrice(v.price, best);
      subtotal += (Number(salePrice) || 0) * qty;
    } else {
      const { salePrice } = applyOfferToPrice(pdoc.defaultPrice, best);
      subtotal += (Number(salePrice) || 0) * qty;
    }
  }

  return subtotal;
}

/**
 * Build the pricing snapshot based on settings and subtotal.
 */
export function buildPricingSnapshot({ subtotal, settings }) {
  const methods = Array.isArray(settings?.shipping?.methods) ? settings.shipping.methods : [];
  const active = methods.filter(m => m.active !== false);
  const defCode = settings?.shipping?.defaultMethodCode || "standard";
  const chosen = active.find(m => m.code === defCode) || active[0] || null;

  let shippingFee = chosen ? Number(chosen.amount) || 0 : 0;
  const freeOver = Number(settings?.shipping?.freeOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) shippingFee = 0;

  const taxRatePct = Number(settings?.tax?.rate) || 0; // %
  const taxMode = "tax_exclusive";
  const taxableBase = subtotal + shippingFee;
  const taxAmount = (taxRatePct / 100) * taxableBase;

  const grandTotal = subtotal + shippingFee + taxAmount;

  return {
    subtotal,
    shippingFee,
    shippingMethod: chosen ? { code: chosen.code, label: chosen.label } : undefined,
    deliveryEta: chosen ? `${chosen.etaDaysMin}-${chosen.etaDaysMax} days` : undefined,
    taxAmount,
    taxRate: taxRatePct,
    taxMode,
    grandTotal
  };
}
