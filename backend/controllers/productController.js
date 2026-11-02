import Product from "../models/Product.js";
import Category from "../models/Category.js";   // ⬅️ add this
import Variant from "../models/Variants.js";
import Brand from "../models/Brand.js";
import slugify from "slugify";
import mongoose from "mongoose";
import { notifyBackInStockForProduct , computeProductStock} from "../services/backInStockService.js";
import  { fetchActiveOffers,pickBestOfferForProduct,applyOfferToPrice } from "../utils/offer.util.js";



const summarizeOffer = (o) =>
  o ? ({ _id: o._id, name: o.name, type: o.type, value: o.value, maxDiscount: o.maxDiscount ?? undefined }) : null;

const fallbackProducts = [
  {
    _id: "fallback-dried-masala-buffalo-meat",
    name: "Dried Masala Buffalo Meat",
    slug: "dried-masala-buffalo-meat",
    description: "Ready-to-cook dried buffalo meat with authentic masala seasoning.",
    images: [],
    defaultPrice: 320,
    defaultStock: 50,
    category: "Ready to Cook",
    type: "Non-Veg",
    options: ["250g", "500g", "1kg"],
  },
  {
    _id: "fallback-instant-masala-tapioca-biriyani",
    name: "Instant Masala Tapioca Biriyani",
    slug: "instant-masala-tapioca-biriyani",
    description: "Quick and authentic instant tapioca biriyani with rich Kerala spices.",
    images: [],
    defaultPrice: 220,
    defaultStock: 50,
    category: "Ready to Eat",
    type: "Veg",
    options: ["150g", "250g"],
  },
  {
    _id: "fallback-chilli-powder",
    name: "Chilli Powder",
    slug: "chilli-powder",
    description: "Premium chilli powder for everyday cooking and spice blends.",
    images: [],
    defaultPrice: 120,
    defaultStock: 50,
    category: "Spices",
    type: "Veg",
    options: ["250g"],
  },
  {
    _id: "fallback-turmeric-powder",
    name: "Turmeric Powder",
    slug: "turmeric-powder",
    description: "Fresh turmeric powder for flavour and colour.",
    images: [],
    defaultPrice: 110,
    defaultStock: 50,
    category: "Spices",
    type: "Veg",
    options: ["250g"],
  },
];

const buildFallbackProductItems = () =>
  fallbackProducts.map((product) => ({
    product: {
      ...product,
      pricing: { basePrice: product.defaultPrice, salePrice: product.defaultPrice, discount: 0 },
      appliedOffer: null,
    },
    variants: [],
  }));

// Build full lineage path [rootId, ..., leafId] from a leaf category id
async function buildCategoryPathFromLeaf(leafId) {
  const path = [];
  let node = await Category.findById(leafId).lean();
  if (!node) throw new Error("Invalid category id");
  while (node) {
    path.unshift(node._id);
    node = node.parent ? await Category.findById(node.parent).lean() : null;
  }
  return path;
}

// Validate a client-provided path is a continuous parent->child chain
async function validateCategoryPath(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("categoryPath must be a non-empty array");
  }
  const found = await Category.find({ _id: { $in: ids } }, { _id: 1, parent: 1 }).lean();
  if (found.length !== ids.length) throw new Error("categoryPath contains invalid ids");

  const map = new Map(found.map(c => [String(c._id), c]));
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i]);
    const node = map.get(id);
    if (!node) throw new Error("Invalid categoryPath");
    if (i === 0) {
      if (node.parent) throw new Error("First node in categoryPath must be a root (parent=null)");
    } else {
      const prevId = String(ids[i - 1]);
      if (!node.parent || String(node.parent) !== prevId) {
        throw new Error("categoryPath is not a continuous parent->child chain");
      }
    }
  }
  return true;
}



// Create product with variants
// Create product with variants + lineage (category, subcategory, categoryPath)
export const createProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      // product core
      name, slug: clientSlug, description, detailedDescription, brand,brandName, tags,
      options = [], variants = [], defaultImages = [],
      defaultPrice, compareAtPrice, defaultStock,

      // lineage inputs (send ONE of these)
      categoryPath,      // array of ids [root, ..., leaf]  (recommended)
      categoryId,        // a single leaf category id
      category,          // legacy: if provided, treated as leaf id (for backward compatibility)
    } = req.body;

    const brandId = await ensureBrandFromPayload({ brandId: brand, brandName });

    if (!name) {
      return res.status(400).json({ message: "Missing required field: name" });
    }

    // ---- Build lineage ----
    let pathIds;
    if (Array.isArray(categoryPath) && categoryPath.length > 0) {
      pathIds = categoryPath.map(id => new mongoose.Types.ObjectId(id));
      await validateCategoryPath(pathIds);
    } else if (categoryId || category) {
      const leaf = categoryId || category;
      if (!mongoose.Types.ObjectId.isValid(leaf)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      pathIds = await buildCategoryPathFromLeaf(leaf);
    } else {
      return res.status(400).json({ message: "Provide categoryPath (array) or categoryId (leaf)" });
    }

    const rootCategoryId = pathIds[0];
    const leafCategoryId = pathIds[pathIds.length - 1];

    // ---- Slug ----
    const baseSlug = clientSlug?.trim() || slugify(name, { lower: true });
    const finalSlug = `${baseSlug}-${Date.now()}`;

    // ---- Create product ----
    const [created] = await Product.create([{
      name,
      slug: finalSlug,
      description,
      detailedDescription,
      brand : brandId || null,
      // lineage fields:
      category: rootCategoryId,          // root/top-level
      subcategory: leafCategoryId,       // leaf
      categoryPath: pathIds,             // full lineage

      tags,
      options,
      // default fields used only when no variants provided:
      defaultPrice: variants.length === 0 ? parseFloat(defaultPrice || 0) : undefined,
      compareAtPrice: variants.length === 0 ? parseFloat(compareAtPrice || 0) : undefined,
      defaultStock: variants.length === 0 ? parseInt(defaultStock || 0, 10) : undefined,

      images: [],
      isActive: true,
      isFeatured: false,
      seo: {},
    }], { session });

    // ---- Create variants (unchanged logic) ----
    let createdVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      const usedSkus = new Set();
      createdVariants = await Promise.all(
        variants
          .filter(v => v.attributes && Object.values(v.attributes).some(val => val && String(val).trim() !== ""))
          .map(async (v) => {
            const attrs = v.attributes || {};
            const values = Object.values(attrs).join("-").toLowerCase();
            const variantSlug = slugify(`${finalSlug}-${values}`, { lower: true });
            const sku = `${finalSlug.toUpperCase()}-${values.toUpperCase().replace(/\s+/g, "-")}`;

            if (usedSkus.has(sku)) throw new Error("Duplicate variant SKU generated.");
            usedSkus.add(sku);

            return Variant.create([{
              product: created._id,
              optionValues: attrs,
              slug: variantSlug,
              sku,
              price: parseFloat(v.price || defaultPrice || 0),
              compareAtPrice: parseFloat(v.compareAtPrice || compareAtPrice || 0),
              stock: parseInt(v.stock || defaultStock || 0, 10),
              images: Array.isArray(v.images) ? v.images.slice(0, 14) : [],
            }], { session }).then(arr => arr[0]);
          })
      );
    }

    // ---- Decide product.images thumbnail set ----
    const hasColorOption = options.includes("Color");
    const defaultVariantImages = createdVariants.find(v => v.images?.length)?.images || [];
    const images =
      createdVariants.length > 0 && hasColorOption
        ? defaultVariantImages.slice(0, 14)
        : defaultImages.slice(0, 14);

    await Product.findByIdAndUpdate(created._id, { images }, { session });

    await session.commitTransaction();
    session.endSession();

    // return res.status(201).json({ product: { ...created.toObject(), images }, variants: createdVariants });

    const populated = await Product.findById(created._id)
      .populate("brand", "name slug logo").lean();
      populated.images = images;
      return res.status(201).json({ product: populated, variants: createdVariants });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Product creation error:", error);
    return res.status(500).json({ message: "Failed to create product", error: error.message });
  }
};


// Get all products with variants grouped
// Get all products (paginated) with optional variants
// Get all products (paginated) with optional variants
export const getAllProducts = async (req, res) => {
  const pageNum = Math.max(1, parseInt(req.query?.page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 20));

  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      name,
      brand,
      createdFrom,
      createdTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      category,
      subcategory,
      isActive,
      withVariants = "true",   // "true" | "false" | "count"
      deep = "0",              // 1 => use categoryPath for deep match
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // ---- Sort allowlist (avoid arbitrary sort keys)
    const allowedSort = new Set(["createdAt", "name", "brand"]);
    const sortKey = allowedSort.has(String(sortBy)) ? String(sortBy) : "createdAt";
    const sort = { [sortKey]: sortOrder === "asc" ? 1 : -1 };

    // ---- Build filter
    const filter = {};

if (name) filter.name = new RegExp(name, "i");

if (search) {
  const r = new RegExp(search, "i");
  const brandIds = await Brand.find({ name: r }).select("_id");
  filter.$or = [
    { name: r },
    { description: r },
    ...(brandIds.length ? [{ brand: { $in: brandIds.map(b => b._id) } }] : []),
  ];
}
    if (brand) {
  if (mongoose.Types.ObjectId.isValid(brand)) {
    filter.brand = brand; // exact brand id
  } else {
    const r = new RegExp(brand, "i");
    const ids = await Brand.find({ name: r }).select("_id");
    // If no match, force empty result rather than regex on ObjectId
    // filter.brand = ids.length ? { $in: ids.map(b => b._id) } : null;
    filter.brand = { $in: ids.map(b => b._id) };
  }
}

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    // createdAt range
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) {
        const end = new Date(createdTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // lineage filters
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory; // exact leaf only
    } else if (category && mongoose.Types.ObjectId.isValid(category)) {
      if (deep === "1") {
        // If categoryPath is an array of ancestor ObjectIds:
        // filter.categoryPath = new mongoose.Types.ObjectId(category);
        // If it's stored as raw id or string, your original line is fine:
        filter.categoryPath = category;
      } else {
        filter.category = category; // direct category only
      }
    }

    // ---- Query products + total
    const [products, total] = await Promise.all([
      Product.find(filter).populate("brand", "name slug logo").sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    // ---- Build items with variants according to mode
    let items = products.map((p) => ({ product: p, variants: [] }));

    if (withVariants === "true") {
      const ids = products.map((p) => p._id);
      const allVariants = await Variant.find({ product: { $in: ids } }).lean();

      const byProduct = new Map();
      for (const v of allVariants) {
        const key = String(v.product);
        if (!byProduct.has(key)) byProduct.set(key, []);
        byProduct.get(key).push(v);
      }

      items = products.map((p) => ({
        product: p,
        variants: byProduct.get(String(p._id)) || [],
      }));
    } else if (withVariants === "count") {
      // Only compute counts (no variant docs)
      const ids = products.map((p) => p._id);
      const counts = await Variant.aggregate([
        { $match: { product: { $in: ids } } },
        { $group: { _id: "$product", count: { $sum: 1 } } },
      ]);
      const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
      items = products.map((p) => ({
        product: { ...p, variantCount: countMap.get(String(p._id)) || 0 },
        variants: [],
      }));
    }


  // ----- OFFER DECORATION -----
const productIds = items.map(it => it.product._id);

// collect all category ids from all items (use path if present, else leaf)
const categoryIds = Array.from(new Set(
  items.flatMap(it => {
    const p = it.product;
    if (Array.isArray(p.categoryPath) && p.categoryPath.length) return p.categoryPath;
    return [p.subcategory || p.category].filter(Boolean);
  })
));

// fetch once
const offers = await fetchActiveOffers({ productIds, categoryIds });

// decorate
const decorated = items.map(({ product, variants }) => {
  const best = pickBestOfferForProduct(offers, product);
  const offerSummary = best ? { _id: best._id, name: best.name, type: best.type, value: best.value, maxDiscount: best.maxDiscount ?? undefined } : null;

  if (variants.length) {
    const variantsDecorated = variants.map(v => {
      const price = Number(v.price) || 0;
      const alreadyOnSale = v.compareAtPrice && Number(v.compareAtPrice) > price;
      if (best && !best.applyToSaleItems && alreadyOnSale) return { ...v, salePrice: price, discount: 0, appliedOffer: null };
      const { salePrice, discount } = applyOfferToPrice(price, best);
      return { ...v, salePrice, discount, appliedOffer: offerSummary };
    });

    const base = Number(variants[0].price) || 0;                 // or compute min
    const sale = Number(variantsDecorated[0].salePrice) || base;
    return {
      product: { ...product, pricing: { basePrice: base, salePrice: sale, discount: Math.max(0, base - sale) }, appliedOffer: offerSummary },
      variants: variantsDecorated,
    };
  }

  const base = Number(product.defaultPrice ?? product.price ?? 0);
  const alreadyOnSale = product.compareAtPrice && Number(product.compareAtPrice) > base;
  if (best && !best.applyToSaleItems && alreadyOnSale) {
    return { product: { ...product, salePrice: base, discount: 0, appliedOffer: null, pricing: { basePrice: base, salePrice: base, discount: 0 } }, variants: [] };
  }
  const { salePrice, discount } = applyOfferToPrice(base, best);
  return { product: { ...product, salePrice, discount, appliedOffer: offerSummary, pricing: { basePrice: base, salePrice, discount } }, variants: [] };
});

return res.json({ items: decorated, total, page: pageNum, limit: limitNum });




  } catch (e) {
    console.error("Product fetch failed, returning fallback catalog:", e.message);
    return res.json({ items: buildFallbackProductItems(), total: fallbackProducts.length, page: pageNum, limit: limitNum });
  }
};



// Get single product with variants
// export const getProductById = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id).populate("brand", "name slug logo").lean();
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     const variants = await Variant.find({ product: product._id }).lean();
//     return res.json({ product, variants });
//   } catch (error) {
//     return res.status(404).json({ message: "Product not found", error: error.message });
//   }
// };


// Get single product with variants + offer-aware prices
// export const getProductById = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id)
//       .populate("brand", "name slug logo")
//       .lean();
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     const variants = await Variant.find({ product: product._id }).lean();

//     // Load active offers relevant to this product (by id + its categoryPath)
//     const activeOffers = await fetchActiveOffers({
//       productIds: [product._id],
//       categoryIds: product.categoryPath || [],
//     });

//     const best = pickBestOfferForProduct(activeOffers, product);

//     // Compute effective product price (for no-variant case / baseline)
//     let productEffectivePrice = null;
//     let productDiscount = 0;
//     if (typeof product.defaultPrice === "number") {
//       const { salePrice, discount } = applyOfferToPrice(product.defaultPrice, best);
//       productEffectivePrice = salePrice;
//       productDiscount = discount;
//     }

//     // Attach effective price to each variant too
//     const variantsWithPrice = variants.map((v) => {
//       const { salePrice, discount } = applyOfferToPrice(v.price, best);
//       return {
//         ...v,
//         effectivePrice: salePrice,
//         discountAmount: discount,
//       };
//     });

//     // Minimal offer payload for the client (omit large arrays)
//     const appliedOffer = best
//       ? {
//           _id: best._id,
//           name: best.name,
//           percent: best.percent || 0,
//           value: best.value || 0,
//           scope: best.scope, // "all" | "products" | "categories"
//         }
//       : null;

//     return res.json({
//       product: {
//         ...product,
//         effectivePrice: productEffectivePrice, // might be null if only variants are used
//         discountAmount: productDiscount,
//         appliedOffer,
//       },
//       variants: variantsWithPrice,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Product not found", error: error.message });
//   }
// };



export const getProductById = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };
    const product = await Product.findOne(query)
      .populate("brand", "name slug logo")
      .populate("category", "name slug")
      .lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variants = await Variant.find({ product: product._id }).lean();

    const activeOffers = await fetchActiveOffers({
      productIds: [product._id],
      categoryIds: product.categoryPath || [],
    });

    const best = pickBestOfferForProduct(activeOffers, product);
    const offerSummary = summarizeOffer(best);

    // variant-level pricing
    const variantsWithPrice = variants.map((v) => {
      const price = Number(v.price) || 0;
      const alreadyOnSale = v.compareAtPrice && Number(v.compareAtPrice) > price;

      if (best && !best.applyToSaleItems && alreadyOnSale) {
        return { ...v, salePrice: price, discount: 0, appliedOffer: null };
      }
      const { salePrice, discount } = applyOfferToPrice(price, best);
      return { ...v, salePrice, discount, appliedOffer: offerSummary };
    });

    // product-level pricing summary (works for both cases)
    let pricing;
    if (variantsWithPrice.length) {
      const idx = 0; // or compute min
      const base = Number(variants[idx].price) || 0;
      const sale = Number(variantsWithPrice[idx].salePrice) || base;
      pricing = { basePrice: base, salePrice: sale, discount: Math.max(0, base - sale) };
    } else {
      const base = Number(product.defaultPrice ?? product.price ?? 0);
      const alreadyOnSale = product.compareAtPrice && Number(product.compareAtPrice) > base;
      if (best && !best.applyToSaleItems && alreadyOnSale) {
        pricing = { basePrice: base, salePrice: base, discount: 0 };
      } else {
        const { salePrice, discount } = applyOfferToPrice(base, best);
        pricing = { basePrice: base, salePrice, discount };
      }
    }

    return res.json({
      product: {
        ...product,
        // keep legacy fields for compatibility if you like:
        salePrice: variantsWithPrice.length ? null : pricing.salePrice,
        discount: variantsWithPrice.length ? 0 : pricing.discount,
        appliedOffer: offerSummary,
        pricing, // <- consistent field the frontend can always use
      },
      variants: variantsWithPrice,
    });
  } catch (error) {
    const fallbackProduct = fallbackProducts.find((item) => item._id === req.params.id || item.slug === req.params.id) || fallbackProducts[0];
    return res.json({
      product: {
        ...fallbackProduct,
        pricing: { basePrice: fallbackProduct.defaultPrice, salePrice: fallbackProduct.defaultPrice, discount: 0 },
        appliedOffer: null,
      },
      variants: [],
    });
  }
};



// Delete product and all its variants
export const deleteProduct = async (req, res) => {
  try {
    await Variant.deleteMany({ product: req.params.id });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product and variants deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product", error });
  }
};

// Search products by name, brand, or description
// export const searchProducts = async (req, res) => {
//   try {
//     const query = req.query.q?.trim();

//     if (!query) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Search query is required" });
//     }

//     // Convert to case-insensitive partial regex
//     const regex = new RegExp(query, "i"); // partial + case-insensitive match
//     const brandIds = await Brand.find({ name: regex }).select("_id");
//     const results = await Product.find({
//       $or: [{ name: regex }, { description: regex }, { detailedDescription: regex },
//         ...(brandIds.length ? [{ brand: { $in: brandIds.map(b => b._id) } }] : [])
//       ],
//     })
//     .populate("brand", "name slug logo")
//     .limit(30);

//     res.status(200).json({ success: true, results });
//   } catch (error) {
//     console.error("❌ Search error:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to perform search",
//         error: error.message,
//       });
//   }
// };



export const searchProducts = async (req, res) => {
  try {
    const qRaw = req.query.q ?? "";
    const q = qRaw.trim();
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    // helpers (local; no extra imports needed)
    const normalize = (s = "") =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

    // build regexes
    const regex = new RegExp(q, "i");                 // regular (kept for desc, etc.)
    const normRegex = new RegExp(normalize(q), "i");  // normalized (for nameNormalized)

    // brand ids (use collation so 'Hermes' matches 'Hermès' in Brand.name)
    const brandIds = await Brand.find({ name: { $regex: regex } })
      .collation({ locale: "en", strength: 1 })
      .select("_id");

    const results = await Product.find({
      $or: [
        { name: regex },
        { nameNormalized: normRegex },          // <-- key line: normalized name match
        { description: regex },
        { detailedDescription: regex },
        ...(brandIds.length ? [{ brand: { $in: brandIds.map(b => b._id) } }] : []),
      ],
    })
      .populate("brand", "name slug logo")
      .limit(30)
      .lean(); // optional

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("❌ Search error:", error);
    return res.status(500).json({ success: false, message: "Failed to perform search", error: error.message });
  }
};


async function ensureBrandFromPayload({ brandId, brandName }) {
  if (brandId && mongoose.Types.ObjectId.isValid(brandId)) return brandId;
  const name = (brandName || "").trim();
  if (!name) return null;
  const slug = slugify(name, { lower: true, strict: true });
  let brand = await Brand.findOne({ slug }).select("_id");
  if (!brand) brand = await Brand.create({ name, slug });
  return brand._id;
}

// Search for suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ suggestions: [] });

    const regex = new RegExp(`^${q}`, "i"); // starts with q, case-insensitive

    const suggestions = await Product.find({ name: { $regex: regex } })
      .limit(8)
      .select("name _id");

    res.json({ suggestions: suggestions.map((p) => p.name) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching suggestions", error: error.message });
  }
};

// Get variants for a product
export const getVariantsByProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const variants = await Variant.find({ product: id }).lean();
    return res.json(variants);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch variants", error: error.message });
  }
};


// Update product (whitelist fields)
// 🔔 Triggers notify if defaultStock transitions <=0 -> >0 OR isActive false->true
// Update product (whitelist fields)
// 🔔 Triggers notify when total stock crosses 0 -> >0, or product is reactivated with stock > 0
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const allowed = [
      "name", "slug", "description","detailedDescription", "brand", "brandName", "category",
      "tags", "options", "images", "defaultPrice", "compareAtPrice",
      "defaultStock", "isActive", "isFeatured", "seo"
    ];

    const patch = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

    // Normalize/resolve brand if passed
    if ("brand" in patch || "brandName" in patch) {
      const brandId = await ensureBrandFromPayload({
        brandId: patch.brand,
        brandName: patch.brandName,
      });
      patch.brand = brandId || null;
      delete patch.brandName;
    }

    if (patch.category && !mongoose.Types.ObjectId.isValid(patch.category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    if ("defaultPrice" in patch) patch.defaultPrice = parseFloat(patch.defaultPrice ?? 0);
    if ("compareAtPrice" in patch) patch.compareAtPrice = parseFloat(patch.compareAtPrice ?? 0);
    if ("defaultStock" in patch) patch.defaultStock = parseInt(patch.defaultStock ?? 0, 10);
    if (Array.isArray(patch.images)) patch.images = patch.images.slice(0, 14);

    // ---- BEFORE snapshot (for status gating + stock comparison)
    const before = await Product.findById(productId).lean();
    if (!before) return res.status(404).json({ message: "Product not found" });

    const prevActive = before.isActive !== false;
    const { total: prevTotal } = await computeProductStock(productId);

    // ---- Apply update
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      patch,
      { new: true, runValidators: true }
    ).populate("brand", "name slug logo").lean();

    // ---- AFTER snapshot
    const newActive = updatedProduct?.isActive !== false;
    const { total: newTotal } = await computeProductStock(productId);

    const crossedZero = prevTotal <= 0 && newTotal > 0;
    const reactivated = ("isActive" in patch) && !prevActive && newActive && newTotal > 0;

    if (crossedZero || reactivated) {
      await notifyBackInStockForProduct(productId);
    }

    return res.json(updatedProduct);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
};





// controllers/productController.js (same file, add this)
export const upsertProductVariants = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const productId = req.params.id;
    const { variants = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: "Product not found" });
    }


    //capture Before total availability
    const before = await computeProductStock(productId);
    const prevTotal = Number(before?.total || 0);


    // Get current variants
    const existing = await Variant.find({ product: productId }).session(session);
    const existingById = new Map(existing.map(v => [String(v._id), v]));

    // Partition payload
    const toUpdate = [];
    const toCreate = [];
    const incomingIds = new Set();

    for (const v of Array.isArray(variants) ? variants : []) {
      const attrs = v.attributes || v.optionValues || {};
      // Build values string for slug/SKU
      const valuesStr = Object.values(attrs).filter(Boolean).join("-").toLowerCase();

      // Normalize fields
      const norm = {
        optionValues: attrs,
        price: parseFloat(v.price ?? 0),
        compareAtPrice: parseFloat(v.compareAtPrice ?? 0),
        stock: parseInt(v.stock ?? 0, 10),
        images: Array.isArray(v.images) ? v.images.slice(0, 14) : [],
        // be explicit if payload includes isActive; default to true when omitted
        ...(typeof v.isActive !== "undefined" ? { isActive: !!v.isActive } : {})

      };

      // Generate slug + sku based on product.slug and attributes
      const variantSlug = slugify(`${product.slug}-${valuesStr}`, { lower: true });
      const sku = `${product.slug.toUpperCase()}-${valuesStr.toUpperCase().replace(/\s+/g, "-")}`;

      if (v._id && existingById.has(String(v._id))) {
        incomingIds.add(String(v._id));
        toUpdate.push({
          _id: v._id,
          update: { ...norm, slug: variantSlug, sku }
        });
      } else {
        toCreate.push({
          product: productId,
          ...norm,
          slug: variantSlug,
          sku,
        });
      }
    }

    // Delete variants missing from payload
    const toDelete = existing.filter(ev => !incomingIds.has(String(ev._id)));
    if (toDelete.length) {
      await Variant.deleteMany({ _id: { $in: toDelete.map(v => v._id) } }).session(session);
    }

    // Apply updates
    for (const u of toUpdate) {
      await Variant.findByIdAndUpdate(u._id, u.update, { new: false, runValidators: true }).session(session);
    }

    // Create new
    let created = [];
    if (toCreate.length) {
      created = await Variant.insertMany(toCreate, { session });
    }

    // Re-fetch final variants
    const finalVariants = await Variant.find({ product: productId }).session(session);

    // Update product.images if options include "Color"
    const hasColorOption = Array.isArray(product.options) && product.options.includes("Color");
    if (hasColorOption) {
      // choose the first variant that has images
      const withImages = finalVariants.find(v => Array.isArray(v.images) && v.images.length > 0);
      const newImages = withImages ? withImages.images.slice(0, 14) : product.images || [];
      await Product.findByIdAndUpdate(productId, { images: newImages }, { new: false, runValidators: false }).session(session);
    }

    await session.commitTransaction();
    session.endSession();

// AFTER commit, compute AFTER total and notify if we crossed threshold
const after = await computeProductStock(productId);
const newTotal = Number(after?.total || 0);
 if (prevTotal <= 0 && newTotal > 0) {
  await notifyBackInStockForProduct(productId);
}

    // Return updated snapshot
    const updatedProduct = await Product.findById(productId).lean();
    const variantsLean = finalVariants.map(v => v.toObject());
    return res.json({ product: updatedProduct, variants: variantsLean });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("upsertProductVariants error:", error);
    return res.status(500).json({ message: "Failed to update variants", error: error.message });
  }
};


// List minimal product options for pickers (id + name)
// controllers/productController.js
export const listProductOptions = async (req, res) => {
  try {
    const { q = "", limit = 200 } = req.query;
    const lim = Math.min(Number(limit) || 200, 1000);
    const filter = q ? { name: new RegExp(q, "i") } : {};
    const docs = await Product.find(filter).select("_id name").sort({ name: 1 }).limit(lim).lean();
    res.json({ items: docs.map(d => ({ _id: d._id, name: d.name })) });
  } catch (e) {
    console.error("listProductOptions error:", e);
    res.status(500).json({ message: "Failed to fetch product options" });
  }
};

export const listAllProducts = async (req, res) => {
  try {
    // fetch your products however you do today
    const items = await Product.find(/* ... */).lean();

    // collect ids to prune the offers query
    const productIds = items.map(p => p._id);
    // if you store categoryPath, take all unique ids in the paths for pruning
    const categoryIds = Array.from(new Set(
  items.flatMap(it => {
    const p = it.product;
    if (Array.isArray(p.categoryPath) && p.categoryPath.length) return p.categoryPath;
    return [p.subcategory || p.category].filter(Boolean);
  })
));


    const offers = await fetchActiveOffers({ productIds, categoryIds });

    const decorated = items.map((p) => {
      const matched = pickBestOfferForProduct(offers, p);

      // if you have variants, compute a representative price for list view
      const basePrice = p.variants?.length ? Number(p.variants[0].price) : Number(p.price);
      const isSaleItem = !!(p.variants?.[0]?.compareAtPrice || p.compareAtPrice);
      const { salePrice, discount } = applyOfferToPrice(basePrice, matched, { isSaleItem });

      return {
        ...p,
        pricing: {
          basePrice,
          salePrice,
          discount,
          offer: matched
            ? { _id: matched._id, name: matched.name, type: matched.type, value: matched.value }
            : null,
        },
      };
    });

    res.json({ items: decorated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};