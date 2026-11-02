import Package from "../models/Package.js";
import Service from "../models/Service.js";
import slugify from "slugify";

// Helper to seed initial curated packages if database has none
const INITIAL_PACKAGES = [
  {
    name: "Bridal Radiance Glow Ritual",
    tagline: "The quintessential pre-wedding ceremony for head-to-toe illumination",
    description: "Indulge in a comprehensive bridal ceremony administered by two licensed specialists in the comfort of your sanctuary. Features deep botanical facial glow, full hair blowout & styling, plus luxury gelish manicure and pedicure with rose paraffin hydration.",
    inclusions: [
      "Customized Rose & Peptide Facial Glow",
      "Blow Dry & Ceramic Wand Finishing",
      "Signature Manicure with Gelish Finish",
      "Deluxe Pedicure with Callus Treatment",
      "Complimentary Take-Home Rose Elixir Mist",
    ],
    originalPrice: 850,
    price: 599,
    discountPercentage: 30,
    durationMinutes: 180,
    badge: "Bridal Exclusive",
    category: "Bridal & Events",
    isFeatured: true,
    displayOrder: 1,
    images: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  {
    name: "Damascus Rose Full Body Escape",
    tagline: "Therapeutic hot stones, lymphatic cupping & soothing aromatherapy",
    description: "Surrender tension with our signature restorative body ritual. Your therapist combines heated volcanic river basalt stones along spinal energy meridians, followed by negative-pressure silicone cupping and warm organic Rosa Damascena essential oils.",
    inclusions: [
      "Heated Volcanic Basalt Stone Massage (60 min)",
      "Full Body Silicone Cupping Therapy (30 min)",
      "Organic Rose Sugar Body Polish",
      "Scalp & Temple Acupressure Release",
    ],
    originalPrice: 620,
    price: 435,
    discountPercentage: 30,
    durationMinutes: 120,
    badge: "Most Popular",
    category: "Spa & Wellness",
    isFeatured: true,
    displayOrder: 2,
    images: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  {
    name: "Royal Hand & Foot Ceremony Duo",
    tagline: "Level 5 luxury manicure and deluxe pedicure pampering",
    description: "Pristine hygiene with medical-grade autoclave pouches unwrapped in your presence. Soothing rose petal foot bath, organic cuticle therapy, diamond top coat overlay, and relaxing reflexology hand & foot massage.",
    inclusions: [
      "Level 5 Signature Manicure",
      "Level 5 Deluxe Pedicure",
      "Dead Sea Salt & Rose Exfoliation",
      "Intensive Paraffin Bootie Wrap",
    ],
    originalPrice: 380,
    price: 279,
    discountPercentage: 27,
    durationMinutes: 90,
    badge: "Best Value",
    category: "Grooming & Nails",
    isFeatured: false,
    displayOrder: 3,
    images: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=85",
    ],
  },
  {
    name: "Lashes, Brows & Facial Glow",
    tagline: "Effortless elegance with featherlight 3D lash fans and facial framing",
    description: "Wake up with perfectly framed eyes. Includes 3D silk volume eyelash extensions, precise upper lip and eyebrow threading, finished with cooling jade roller drainage and hydration mist.",
    inclusions: [
      "3D Silk Lash Volume Fan Application",
      "Upper Lip & Eyebrow Organic Threading",
      "Cooling Rose Quartz Roller Treatment",
      "Eyebrow Nourishing Botanical Serum",
    ],
    originalPrice: 420,
    price: 315,
    discountPercentage: 25,
    durationMinutes: 75,
    badge: "Limited Offer",
    category: "Seasonal Offers",
    isFeatured: false,
    displayOrder: 4,
    images: [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1512290900672-1f5be634358a?auto=format&fit=crop&w=1200&q=85",
    ],
  },
];

// ==========================================
// Public: Get all active packages
// ==========================================
export const getPublicPackages = async (req, res) => {
  try {
    let packages = await Package.find({ isActive: true })
      .populate("services", "name slug price duration durationMinutes category images")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // Auto-seed if database has 0 packages
    if (packages.length === 0) {
      console.log("🌸 Seeding initial Rose Essence Packages...");
      const allServices = await Service.find({ isActive: true }).select("_id name").lean();
      for (const p of INITIAL_PACKAGES) {
        const slug = slugify(p.name, { lower: true, strict: true });
        // Link relevant services by keyword if found
        const matchedServiceIds = allServices
          .filter((s) => {
            const sn = s.name.toLowerCase();
            return p.inclusions.some((inc) => sn.includes(inc.toLowerCase().slice(0, 8)));
          })
          .map((s) => s._id);

        await Package.findOneAndUpdate(
          { slug },
          { ...p, slug, services: matchedServiceIds.length > 0 ? matchedServiceIds : [] },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      packages = await Package.find({ isActive: true })
        .populate("services", "name slug price duration durationMinutes category images")
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load packages",
      error: error.message,
    });
  }
};

// ==========================================
// Public: Get package by slug
// ==========================================
export const getPackageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const pkg = await Package.findOne({ slug, isActive: true })
      .populate("services", "name slug price duration durationMinutes category images shortDescription")
      .lean();

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      package: pkg,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load package details",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Get all packages (active & inactive)
// ==========================================
export const getAdminPackages = async (req, res) => {
  try {
    const { search, category, active } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { tagline: { $regex: search, $options: "i" } },
        { badge: { $regex: search, $options: "i" } },
      ];
    }
    if (category && category !== "All") {
      filter.category = category;
    }
    if (typeof active !== "undefined" && active !== "") {
      filter.isActive = active === "true";
    }

    const packages = await Package.find(filter)
      .populate("services", "name slug price duration durationMinutes category images")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin packages",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Create package
// ==========================================
export const createPackage = async (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      services,
      inclusions,
      originalPrice,
      price,
      currency,
      durationMinutes,
      badge,
      category,
      images,
      isFeatured,
      isActive,
      displayOrder,
      validUntil,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Package name is required" });
    }
    if (originalPrice === undefined || price === undefined) {
      return res.status(400).json({ success: false, message: "Original price and special price are required" });
    }

    let slug = slugify(name, { lower: true, strict: true });
    // Guarantee uniqueness
    const existing = await Package.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const numOriginal = Number(originalPrice) || 0;
    const numPrice = Number(price) || 0;
    const discountPercentage =
      numOriginal > numPrice
        ? Math.round(((numOriginal - numPrice) / numOriginal) * 100)
        : 0;

    const newPackage = await Package.create({
      name: name.trim(),
      slug,
      tagline: tagline || "",
      description: description || "",
      services: Array.isArray(services) ? services : [],
      inclusions: Array.isArray(inclusions)
        ? inclusions.filter((i) => typeof i === "string" && i.trim())
        : [],
      originalPrice: numOriginal,
      price: numPrice,
      currency: currency || "AED",
      discountPercentage,
      durationMinutes: Number(durationMinutes) || 90,
      badge: badge ? badge.trim() : "",
      category: category || "General",
      images: Array.isArray(images) && images.length > 0 ? images : [
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85"
      ],
      isFeatured: Boolean(isFeatured),
      isActive: isActive !== false,
      displayOrder: Number(displayOrder) || 0,
      validUntil: validUntil ? new Date(validUntil) : null,
    });

    const populated = await Package.findById(newPackage._id)
      .populate("services", "name slug price duration durationMinutes category images")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create package",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Update package
// ==========================================
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    if (payload.originalPrice !== undefined && payload.price !== undefined) {
      const orig = Number(payload.originalPrice) || 0;
      const pr = Number(payload.price) || 0;
      if (orig > pr) {
        payload.discountPercentage = Math.round(((orig - pr) / orig) * 100);
      }
    }

    if (payload.name) {
      payload.name = payload.name.trim();
    }

    const updated = await Package.findByIdAndUpdate(id, { $set: payload }, { new: true })
      .populate("services", "name slug price duration durationMinutes category images")
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
      package: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update package",
      error: error.message,
    });
  }
};

// ==========================================
// Admin: Delete package
// ==========================================
export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Package.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete package",
      error: error.message,
    });
  }
};

