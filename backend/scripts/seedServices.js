import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/mongodb-connection.config.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import ServiceZone from "../models/ServiceZone.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

const serviceCategoriesData = [
  {
    name: "Face",
    slug: "face",
    description: "Facial and face grooming services",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    sortOrder: 1,
    displayOrder: 1,
    active: true,
    isActive: true,
  },
  {
    name: "Hair",
    slug: "hair",
    description: "Hair styling and care services",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
    sortOrder: 2,
    displayOrder: 2,
    active: true,
    isActive: true,
  },
  {
    name: "Nail",
    slug: "nail",
    description: "Manicure, pedicure and nail services",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80",
    sortOrder: 3,
    displayOrder: 3,
    active: true,
    isActive: true,
  },
  {
    name: "Massage",
    slug: "massage",
    description: "Massage and relaxation services",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
    sortOrder: 4,
    displayOrder: 4,
    active: true,
    isActive: true,
  },
];

const categoryImageMap = {
  Face: [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1512290900672-1f5be634358a?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85",
  ],
  Hair: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=85",
  ],
  Nail: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=85",
  ],
  Massage: [
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1200&q=85",
  ],
};

const servicesRawData = [
  {
    category: "Face",
    name: "3D Lash Extension – Volume",
    price: 300,
    durationMinutes: 45,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "3d-lash-extension-volume",
    shortDescription: "Ultra-lightweight multi-lash volume fan application creating an alluring, fluttery look with premium silk fibers.",
    fullDescription: "Our specialized lash artist arrives at your residence with sterile, hospital-grade tools and premium silk lash clusters. Each natural lash is delicately enhanced with 3 featherlight extensions for dramatic depth, curl, and volume without damaging your natural lash line.",
    benefits: ["Customized mapping to complement your eye shape", "Lightweight synthetic silk with zero eye-strain", "Water-resistant medical grade adhesive", "Complimentary aftercare lash brush"],
  },
  {
    category: "Face",
    name: "4D Lash Extension",
    price: 300,
    durationMinutes: 5,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "4d-lash-extension",
    shortDescription: "Maximum fullness and velvety density featuring quadruple-fan volume lash placement.",
    fullDescription: "For maximum glamour and volume. 4 ultra-fine lash extensions per natural lash provide luxurious multidimensional fullness. Ideal for special occasions, photo sessions, or those who adore full, dark, dramatic lashes.",
    benefits: ["Extreme volume and deep velvety black finish", "Seamless, clump-free isolation technique", "Hypoallergenic, formaldehyde-free adhesive"],
  },
  {
    category: "Face",
    name: "Upper Lip Threading",
    price: 25,
    durationMinutes: 15,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "upper-lip-threading",
    shortDescription: "Precise, hygienic upper lip hair removal using organic anti-bacterial cotton thread.",
    fullDescription: "A gentle and quick facial hair removal technique. Using 100% organic cotton thread, fine hairs are lifted directly from the root for smooth, hair-free skin lasting up to 3 to 4 weeks. Concludes with a soothing rosewater aloe vera cool compress.",
    benefits: ["No chemicals or hot wax irritation", "Gentle on sensitive skin barriers", "Long-lasting smoothness for up to 4 weeks"],
  },
  {
    category: "Face",
    name: "Eyebrow Threading",
    price: 60,
    durationMinutes: 20,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "eyebrow-threading",
    shortDescription: "Expert eyebrow sculpting and precise definition crafted to balance your natural facial symmetry.",
    fullDescription: "Achieve impeccably defined brows without harsh waxing chemicals. Our brow specialist analyzes your bone structure, marks your golden-ratio arch points, and removes unwanted hairs for razor-sharp, clean brow lines.",
    benefits: ["Pinpoint precision for arches and tails", "Clean skin surface for flawless makeup application", "Soothing organic rose hydrosol finish"],
  },
  {
    category: "Face",
    name: "Eyebrows Shaving",
    price: 50,
    durationMinutes: 15,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "eyebrows-shaving",
    shortDescription: "Pain-free eyebrow shaping and peach-fuzz dermaplaning using single-use sterilized precision blades.",
    fullDescription: "A completely painless brow contouring alternative. Using a brand-new, sterile single-use dermaplaning micro-blade, our aesthetician trims, grooms, and shapes your brows while gently buffing away dead skin and fine vellus hair.",
    benefits: ["100% painless grooming experience", "Removes dead stratum corneum cells", "Leaves skin silky smooth for immediate makeup"],
  },
  {
    category: "Hair",
    name: "Curly Or Wavy",
    price: 100,
    durationMinutes: 30,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "curly-or-wavy",
    shortDescription: "Professional salon hot-tool styling creating bouncy beach waves or romantic cascading curls.",
    fullDescription: "Our hairstylist brings professional tourmaline ionic styling wands and heat protection elixirs to your home. We craft bouncy, voluminous waves or polished romantic curls that hold their shape and shine all day and evening.",
    benefits: ["Zero-frizz tourmaline heat application", "Rose elixir heat protectant shield", "Long-lasting flexible hold without crunchiness"],
  },
  {
    category: "Hair",
    name: "Hair Extension Refill(Per Piece)",
    price: 20,
    durationMinutes: 30,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "hair-extension-refillper-piece",
    shortDescription: "Tape-in or micro-ring extension maintenance, repositioning, and secure re-bonding per piece.",
    fullDescription: "Maintain the seamless blend of your hair extensions. Your stylist inspects individual bonds, removes grown-out pieces with gentle organic solvent, applies fresh medical-grade tape or beads, and re-secures them close to the scalp.",
    benefits: ["Protects natural hair integrity", "Undetectable seamless repositioning", "Priced transparently per individual extension piece"],
  },
  {
    category: "Hair",
    name: "Hair Trim",
    price: 80,
    durationMinutes: 20,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "hair-trim",
    shortDescription: "Split-end dusting and perimeter haircut to maintain length, shape, and healthy hair density.",
    fullDescription: "Keep your locks healthy, vibrant, and split-end free. Your stylist cleanses perimeter lines, snips away damaged split ends with Japanese cobalt steel shears, and refreshes face-framing layers.",
    benefits: ["Prevents split ends from traveling up hair shaft", "Preserves length while revitalizing volume", "Clean, sanitary styling cape and tools"],
  },
  {
    category: "Hair",
    name: "Blow Dry",
    price: 150,
    durationMinutes: 40,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "blow-dry",
    shortDescription: "Signature salon blowout for sleek silkiness, bouncy volume, or smooth polished texture.",
    fullDescription: "The ultimate red-carpet blowout in the comfort of your room. Using ionic salon dryers and round ceramic boar-bristle brushes, we infuse body, shine, and silky movement into your hair.",
    benefits: ["Mirror-like shine and humidity resistance", "Customized volume at the crown", "Includes thermal shield and rose finishing serum"],
  },
  {
    category: "Hair",
    name: "Full Hair Color Long",
    price: 350,
    durationMinutes: 75,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "full-hair-color-long",
    shortDescription: "All-over rich hair color transformation from roots to tips formulated with nourishing botanicals.",
    fullDescription: "Full coverage permanent or semi-permanent hair color applied by an experienced colorist. Provides rich, dimensional pigmentation and 100% grey coverage while conditioning hair with botanical oils and keratin protection.",
    benefits: ["Complete root-to-tip uniform color saturation", "100% resistant grey hair coverage", "Ammonia-reduced formula gentle on scalp"],
  },
  {
    category: "Nail",
    name: "Hard Gel Overlay",
    price: 262.5,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "hard-gel-overlay",
    shortDescription: "Protective builder gel overlay strengthening natural nails with an unbreakable, glossy shield.",
    fullDescription: "Ideal for clients wanting strong, chip-resistant natural nails that grow without breaking. A crystal-clear or nude hard gel layer is cured under a portable LED lamp, creating a resilient architectural apex.",
    benefits: ["Shields weak, brittle nails from cracking", "Glass-like high gloss lasting 3 to 4 weeks", "Allows natural nails to reach desired length safely"],
  },
  {
    category: "Nail",
    name: "Ombre Nails",
    price: 63,
    durationMinutes: 45,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "ombre-nails",
    shortDescription: "Seamless gradient nail art blending soft rose blush, milky white, or custom tones.",
    fullDescription: "An elegant French ombre baby-boomer style or dual-tone gradient airbrushed across your manicured nails. Hand-finished with a protective diamond top coat.",
    benefits: ["Modern, chic bridal or everyday luxury look", "Seamless color transition without harsh lines", "UV cured for extended wear"],
  },
  {
    category: "Nail",
    name: "Classic Manicure",
    price: 70,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "classic-manicure",
    shortDescription: "Essential nail grooming, cuticle conditioning, hydrating hand massage, and breathable polish.",
    fullDescription: "A soothing hand ceremony. Features nail shaping, gentle cuticle pushback, rose sugar scrub exfoliation, a relaxing hand massage, and application of premium breathable lacquer.",
    benefits: ["Autoclaved single-use hygiene pouch", "Revitalizes dry cuticles and hand skin", "Wide selection of timeless nude and red lacquers"],
  },
  {
    category: "Nail",
    name: "Classic Pedicure",
    price: 80,
    durationMinutes: 75,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "classic-pedicure",
    shortDescription: "Warm foot soak, callus smoothing, nail clipping, cuticle care, and professional polish.",
    fullDescription: "Relax in your armchair while your nail technician sets up a hygienic portable foot basin with disposable liner. Includes nail trimming, callus filing, foot scrub, relaxing massage, and flawless polish.",
    benefits: ["Single-use hygienic basin liner guarantee", "Deep smoothing of dry heel calluses", "Relaxing foot and calf acupressure massage"],
  },
  {
    category: "Nail",
    name: "Gelish Manicure",
    price: 120,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "gelish-manicure",
    shortDescription: "Flawless gel polish manicure cured instantly under LED light, chip-free for up to 3 weeks.",
    fullDescription: "Full manicure grooming followed by base coat, two coats of high-pigment Gelish color, and a durable gloss top coat. Dries in 60 seconds with no smudge risk.",
    benefits: ["Zero drying wait time", "High-shine mirror reflection for 21 days", "Protects nails from daily chores and water"],
  },
  {
    category: "Massage",
    name: "Head, Neck & Shoulders Massage",
    price: 90,
    durationMinutes: 30,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "head-neck-&-shoulders-massage",
    shortDescription: "Focused acupressure and tension release for upper back, traps, neck, and scalp.",
    fullDescription: "Fast, effective relief from desk fatigue and computer posture strain. Your therapist targets the occipital ridge, trapezius, and shoulder blades with warm aromatic botanical oils.",
    benefits: ["Dissolves tension headaches and stiff neck", "Improves blood flow to the brain and scalp", "Can be performed seated or on portable table"],
  },
  {
    category: "Massage",
    name: "Full Body Massage Oil Massage",
    price: 200,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "full-body-massage-oil-massage",
    shortDescription: "Holistic full-body Swedish massage with warm organic rose-infused botanical oil.",
    fullDescription: "Our signature in-home full-body massage. Your therapist brings a heated orthopedic massage table and soft linens to your sanctuary. Flowing effleurage strokes and kneading soothe every major muscle group.",
    benefits: ["Deep nervous system calming", "Nourishes dry skin with pure botanical lipids", "Improves lymphatic fluid circulation"],
  },
  {
    category: "Massage",
    name: "Hot Stones Massage",
    price: 250,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "hot-stones-massage",
    shortDescription: "Therapeutic heated volcanic basalt stones melting deep muscle tightness and fatigue.",
    fullDescription: "Warm basalt river stones heated to an optimal 54°C are placed along spinal energy meridians and used to glide across tight muscle fibers. The penetrating heat melts away persistent tension effortlessly.",
    benefits: ["Thermal heat penetrates 3x deeper into muscle tissues", "Accelerates deep relaxation and sleep quality", "Eases joint stiffness and chronic aches"],
  },
  {
    category: "Massage",
    name: "Full Body Cupping Massage",
    price: 250,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "full-body-cupping-massage",
    shortDescription: "Ancient therapeutic suction cupping promoting deep myofascial release and detoxification.",
    fullDescription: "Negative pressure silicone and glass vacuum cups glide along fascia pathways to decompress tissue, draw stagnant toxins to the surface, and stimulate rapid cellular oxygenation.",
    benefits: ["Decompresses tight connective fascia tissue", "Flushes metabolic waste and lactic acid", "Deep athletic recovery and flexibility enhancement"],
  },
  {
    category: "Massage",
    name: "Deep Tissue Massage (Hard)",
    price: 300,
    durationMinutes: 60,
    currency: "AED",
    active: true,
    serviceType: "home",
    womenOnly: true,
    slug: "deep-tissue-massage-hard",
    shortDescription: "Firm, targeted neuromuscular pressure breaking down stubborn chronic adhesions and knots.",
    fullDescription: "Designed for those who crave intense, therapeutic pressure. Your certified therapist utilizes forearms, elbows, and focused thumb pressure along deep muscle bands to eliminate stubborn trigger points.",
    benefits: ["Breaks up chronic scar tissue and adhesions", "Restores joint mobility and postural alignment", "Ideal for athletes and severe tension sufferers"],
  },
];

const sampleZones = [
  {
    name: "Downtown & Central District",
    slug: "downtown-and-central-district",
    description: "Downtown Dubai, DIFC, Business Bay, City Walk, and Jumeirah.",
    supportedAreas: ["Downtown", "DIFC", "Business Bay", "City Walk", "Jumeirah 1-3"],
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Marina, JBR & Palm Jumeirah",
    slug: "marina-jbr-and-palm-jumeirah",
    description: "Dubai Marina, JBR, Palm Jumeirah, Bluewaters, and JLT.",
    supportedAreas: ["Dubai Marina", "JBR", "Palm Jumeirah", "Bluewaters", "JLT"],
    displayOrder: 2,
    isActive: true,
  },
  {
    name: "Emirates Living & Hills",
    slug: "emirates-living-and-hills",
    description: "Dubai Hills, Emirates Hills, The Springs, The Meadows, and Arabian Ranches.",
    supportedAreas: ["Dubai Hills Estate", "Emirates Hills", "The Meadows", "The Springs", "Arabian Ranches"],
    displayOrder: 3,
    isActive: true,
  },
];

const productCategoriesData = [
  {
    name: "Skincare",
    slug: "skincare",
    label: "Skincare",
    description: "Organic Rosa Damascena skincare rituals",
    position: 1,
    active: true,
  },
  {
    name: "Wellness",
    slug: "wellness",
    label: "Wellness",
    description: "Holistic at-home spa and relaxation accessories",
    position: 2,
    active: true,
  },
];

const productsData = [
  {
    categoryName: "Skincare",
    name: "Gentle Hydrating Facial Cleanser",
    brand: "Rose Essence",
    price: 45,
    currency: "AED",
    description: "Gentle daily cleanser for removing dirt, oil and makeup.",
    size: "150 ml",
    stock: 50,
    sku: "RE-SKIN-001",
    active: true,
    slug: "gentle-hydrating-facial-cleanser",
    images: ["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Skincare",
    name: "Hyaluronic Acid Hydrating Serum",
    brand: "Rose Essence",
    price: 75,
    currency: "AED",
    description: "Lightweight hydrating serum for a plump, moisturised feel.",
    size: "30 ml",
    stock: 40,
    sku: "RE-SKIN-002",
    active: true,
    slug: "hyaluronic-acid-hydrating-serum",
    images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Skincare",
    name: "Vitamin C Brightening Serum",
    brand: "Rose Essence",
    price: 89,
    currency: "AED",
    description: "Daily antioxidant serum to help improve the appearance of dull skin.",
    size: "30 ml",
    stock: 35,
    sku: "RE-SKIN-003",
    active: true,
    slug: "vitamin-c-brightening-serum",
    images: ["https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Skincare",
    name: "Daily Moisturising Cream",
    brand: "Rose Essence",
    price: 59,
    currency: "AED",
    description: "Everyday face moisturiser for soft, comfortable skin.",
    size: "50 ml",
    stock: 45,
    sku: "RE-SKIN-004",
    active: true,
    slug: "daily-moisturising-cream",
    images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Skincare",
    name: "Broad Spectrum SPF 50 Sunscreen",
    brand: "Rose Essence",
    price: 65,
    currency: "AED",
    description: "Daily sun protection for the face and neck. Follow label directions.",
    size: "50 ml",
    stock: 60,
    sku: "RE-SKIN-005",
    active: true,
    slug: "broad-spectrum-spf-50-sunscreen",
    images: ["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Skincare",
    name: "Nourishing Rose Face Mask",
    brand: "Rose Essence",
    price: 39,
    currency: "AED",
    description: "Wash-off face mask for a refreshed skincare routine.",
    size: "100 ml",
    stock: 30,
    sku: "RE-SKIN-006",
    active: true,
    slug: "nourishing-rose-face-mask",
    images: ["https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Aromatherapy Essential Oil Blend",
    brand: "Rose Essence",
    price: 55,
    currency: "AED",
    description: "Aromatic oil blend for use according to product label directions.",
    size: "15 ml",
    stock: 25,
    sku: "RE-WELL-001",
    active: true,
    slug: "aromatherapy-essential-oil-blend",
    images: ["https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Relaxation Massage Oil",
    brand: "Rose Essence",
    price: 69,
    currency: "AED",
    description: "Massage oil for body care and relaxation routines.",
    size: "200 ml",
    stock: 30,
    sku: "RE-WELL-002",
    active: true,
    slug: "relaxation-massage-oil",
    images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Epsom Bath Salt",
    brand: "Rose Essence",
    price: 35,
    currency: "AED",
    description: "Bath salt for a relaxing bath routine.",
    size: "500 g",
    stock: 40,
    sku: "RE-WELL-003",
    active: true,
    slug: "epsom-bath-salt",
    images: ["https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Silk Sleep Eye Mask",
    brand: "Rose Essence",
    price: 49,
    currency: "AED",
    description: "Soft eye mask accessory for rest and travel.",
    size: "1 piece",
    stock: 35,
    sku: "RE-WELL-004",
    active: true,
    slug: "silk-sleep-eye-mask",
    images: ["https://images.unsplash.com/photo-1590439471364-192aa70c0b53?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Jade Facial Roller",
    brand: "Rose Essence",
    price: 42,
    currency: "AED",
    description: "Reusable facial massage tool for a skincare routine.",
    size: "1 piece",
    stock: 25,
    sku: "RE-WELL-005",
    active: true,
    slug: "jade-facial-roller",
    images: ["https://images.unsplash.com/photo-1590439471364-192aa70c0b53?auto=format&fit=crop&w=800&q=80"],
  },
  {
    categoryName: "Wellness",
    name: "Body Exfoliating Scrub",
    brand: "Rose Essence",
    price: 52,
    currency: "AED",
    description: "Body scrub for exfoliation; use as directed on the product label.",
    size: "250 g",
    stock: 30,
    sku: "RE-WELL-006",
    active: true,
    slug: "body-exfoliating-scrub",
    images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80"],
  },
];

async function seed() {
  console.log("🌱 Resetting and Seeding Rose Essence Real Service & Product Catalog...");

  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // 1. Remove old service and service category records completely as requested
    console.log("🧹 Clearing old service records...");
    await Service.deleteMany({});
    await ServiceCategory.deleteMany({});

    // 2. Insert the 4 Service Categories
    console.log("📁 Seeding 4 Service Categories (Face, Hair, Nail, Massage)...");
    const categoryMap = new Map();
    for (const catData of serviceCategoriesData) {
      const cat = await ServiceCategory.create(catData);
      categoryMap.set(cat.name, cat._id);
      categoryMap.set(cat.slug, cat._id);
      console.log(`  ✓ Created Category: ${cat.name} (slug: ${cat.slug})`);
    }

    // 3. Insert the 20 Services
    console.log("💆 Seeding 20 Services with time, currency (AED), womenOnly, and serviceType...");
    let servOrder = 1;
    for (const serv of servicesRawData) {
      const categoryId = categoryMap.get(serv.category);
      if (!categoryId) {
        console.warn(`  ⚠️ Category '${serv.category}' not found!`);
        continue;
      }

      const categoryImages = categoryImageMap[serv.category] || [];
      const imageIndex = (servOrder - 1) % categoryImages.length;
      const images = [categoryImages[imageIndex]];

      const created = await Service.create({
        name: serv.name,
        slug: serv.slug,
        category: categoryId,
        price: serv.price,
        duration: serv.durationMinutes,
        durationMinutes: serv.durationMinutes,
        currency: serv.currency || "AED",
        active: serv.active,
        isActive: serv.active,
        serviceType: serv.serviceType || "home",
        womenOnly: Boolean(serv.womenOnly),
        shortDescription: serv.shortDescription,
        fullDescription: serv.fullDescription,
        benefits: serv.benefits || [],
        images,
        displayOrder: servOrder++,
        isFeatured: serv.price >= 200,
      });

      console.log(
        `  ✓ [${serv.category}] ${created.name} | AED ${created.price} | ${created.durationMinutes} mins | ${created.womenOnly ? "Women Only" : "All"}`
      );
    }

    // 4. Update / Upsert Service Zones
    console.log("📍 Seeding Service Zones...");
    for (const zoneData of sampleZones) {
      await ServiceZone.findOneAndUpdate(
        { slug: zoneData.slug },
        { $set: zoneData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Seeded Service Zone: ${zoneData.name}`);
    }

    // 5. Seed Real Product Categories and 12 Products
    console.log("🛍️ Seeding Product Categories & 12 Real Products...");
    const prodCategoryMap = new Map();
    for (const pCat of productCategoriesData) {
      const created = await Category.findOneAndUpdate(
        { label: pCat.name },
        { $set: pCat },
        { upsert: true, new: true }
      );
      prodCategoryMap.set(pCat.name, created._id);
      console.log(`  ✓ Seeded Product Category: ${pCat.name}`);
    }

    for (const prod of productsData) {
      const catId = prodCategoryMap.get(prod.categoryName);
      await Product.findOneAndUpdate(
        { slug: prod.slug },
        {
          $set: {
            name: prod.name,
            slug: prod.slug,
            description: prod.description,
            brandName: prod.brand,
            defaultPrice: prod.price,
            price: prod.price,
            currency: prod.currency,
            size: prod.size,
            sku: prod.sku,
            defaultStock: prod.stock,
            stock: prod.stock,
            category: catId,
            isActive: prod.active,
            active: prod.active,
            images: prod.images,
          },
        },
        { upsert: true, new: true }
      );
      console.log(`  ✓ Seeded Product: ${prod.name} (AED ${prod.price}, ${prod.size})`);
    }

    console.log("🎉 Complete Rose Essence Service & Product Database seeded successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

seed();
