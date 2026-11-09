import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/mongodb-connection.config.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";
import ServiceZone from "../models/ServiceZone.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

/* ------------------------------------------------------------------ */
/* IMAGES                                                              */
/* U()  -> images.unsplash.com/photo-<id>   (IDs already used in your file)
/* UP() -> unsplash.com/photos/<slug-id>/download  (new picks: henna)   */
/* Add both hosts to next.config.js images.remotePatterns              */
/* ------------------------------------------------------------------ */
const U = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
const UP = (id, w = 1200) =>
  `https://unsplash.com/photos/${id}/download?force=true&w=${w}`;

const IMG = {
  hair: [U("1560066984-138dadb4c035"), U("1562322140-8baeececf3df"), U("1527799820374-dcf8d9d4a388"), U("1522337360788-8b13dee7a37e")],
  mani: [U("1632345031435-8727f6897d53"), U("1604654894610-df63bc536371"), U("1519014816548-bf5fe059798b")],
  polish: [U("1604654894610-df63bc536371"), U("1519014816548-bf5fe059798b"), U("1632345031435-8727f6897d53")],
  pedi: [U("1519415510236-718bdfcd89c8"), U("1516975080664-ed2fc6a32937"), U("1599305445671-ac291c95aaa9")],
  facial: [U("1570172619644-dfd03ed5d881"), U("1512290900672-1f5be634358a"), U("1508214751196-bcfd4ca60f91")],
  wax: [U("1560750588-73207b1ef5b8"), U("1515377905703-c4788e51af15"), U("1540555700478-4be289fbecef")],
  thread: [U("1512290900672-1f5be634358a"), U("1508214751196-bcfd4ca60f91"), U("1570172619644-dfd03ed5d881")],
  massage: [U("1544161515-4ab6ce6db874"), U("1519823551278-64ac92734fb1"), U("1600334089648-b0d9d3028eb2")],
  combo: [U("1632345031435-8727f6897d53"), U("1519415510236-718bdfcd89c8"), U("1604654894610-df63bc536371"), U("1516975080664-ed2fc6a32937")],
  henna: [UP("hqyBHpLzENo"), UP("o82pO3KIl2E")],
};
const counters = {};
const pick = (key) => {
  const arr = IMG[key];
  const i = counters[key] || 0;
  counters[key] = i + 1;
  return arr[i % arr.length];
};

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ------------------------------------------------------------------ */
/* CATEGORIES (9)                                                      */
/* ------------------------------------------------------------------ */
const cat = (name, description, image, order) => ({
  name, slug: slugify(name), description, image, sortOrder: order, displayOrder: order, active: true, isActive: true,
});

const serviceCategoriesData = [
  cat("Hair Styling", "Professional blowouts, waves, curls, and hair straightening services", IMG.hair[0], 1),
  cat("Manicure", "Luxury manicures, gel polish, cut & file, and hand beauty care", IMG.mani[0], 2),
  cat("Pedicure", "Revitalizing foot spa, gel pedicure, cut & file, and foot pampering", IMG.pedi[0], 3),
  cat("Facial", "Rejuvenating facials, deep cleansing, hydra treatments, and glowing therapies", IMG.facial[0], 4),
  cat("Waxing", "Full body waxing, Brazilian waxing, smooth hair removal, and precision threading", IMG.wax[0], 5),
  cat("Women Salon Services", "In-home relaxation head, foot, palm and shoulder massages", IMG.massage[0], 6),
  cat("Nail Polish", "Express color changes, gel polish and French polish finishes", IMG.polish[0], 7),
  cat("Combo Deals", "Mani-pedi combo packages - select multiple services and save", IMG.combo[0], 8),
  cat("Henna", "Cone henna designs for fingers, palms, hands, arms and feet", IMG.henna[0], 9),
];

/* ------------------------------------------------------------------ */
/* SERVICES                                                            */
/* s(category, name, priceAED, minutes, imageKey, shortDescription,    */
/*   benefits[], priceFromList = true)                                 */
/* priceFromList=false -> item is in your list but has NO price/time   */
/*   there, so the value below is a PLACEHOLDER. Confirm it.           */
/* ------------------------------------------------------------------ */
const s = (category, name, price, mins, img, shortDescription, benefits, confirmed = true) => ({
  category, name, price, mins, img, shortDescription, benefits, confirmed,
});

const servicesRawData = [
  // ---------------- HAIR STYLING ----------------
  s("Hair Styling", "Blow Dry", 150, 45, "hair", "Classic voluminous blowout for an effortlessly polished, salon-fresh look.", ["Weightless root lift", "Velvety smooth texture"]),
  s("Hair Styling", "Blow Dry with Curls", 200, 60, "hair", "Deluxe blow dry with elegant defined curls and lasting bounce.", ["Defined curls with movement", "Long-lasting hold"]),
  s("Hair Styling", "Blowdry and Curls for Short and Medium Hair", 109, 65, "hair", "Signature blowout and curls tailored for short to medium length hair.", ["Long-lasting volume", "Heat protection serum"]),
  s("Hair Styling", "Blowdry and Curls for Long Hair", 129, 85, "hair", "Full blowout and glamorous curls for long hair.", ["Sculpted glossy curls", "Frizz-taming finish"]),
  s("Hair Styling", "Blowdry and Curls for Extra Long Hair", 149, 85, "hair", "Complete blowout and cascading curls for extra-long, thick hair.", ["Section-by-section styling", "Weightless shine hold"]),
  s("Hair Styling", "Hair Straightening (Short to Medium Hair)", 169, 65, "hair", "Smooth glass-like straightening for short to medium hair.", ["Pin-straight mirror finish", "Humidity-resistant shield"]),
  s("Hair Styling", "Hair Straightening for Long Hair", 189, 85, "hair", "Silky sleek straightening for long, dense hair.", ["Flawless cuticle sealing", "Anti-frizz finish"]),
  // WAS MISSING
  s("Hair Styling", "Hair Straightening for Extra Long Hair", 199, 85, "hair", "Ultra-sleek straightening for extra-long hair.", ["Even sleek finish", "Anti-frizz shine"]),

  // ---------------- MANICURE ----------------
  // NOTE: first list says Classic Manicure AED 100, detailed list says AED 110 (50 mins). Using 110.
  s("Manicure", "Classic Manicure", 110, 50, "mani", "Nail shaping, cuticle care, light hand massage and regular polish.", ["Nail shaping and cuticle care", "Hydrating hand massage"]),
  s("Manicure", "Polish Manicure", 200, 50, "mani", "Premium manicure with deep cuticle hydration and dual-coat polish.", ["Exfoliating hand scrub", "Long-wear high-shine lacquer"]),
  s("Manicure", "Gel Manicure", 180, 60, "mani", "Signature manicure finished with durable mirror-shine gel polish.", ["Zero dry time", "Scratch-resistant shine"], false),
  s("Manicure", "French Manicure", 150, 60, "mani", "Timeless manicure with sheer pink base and crisp white tips.", ["Clean elegant tips", "Precise smile lines"], false),
  s("Manicure", "Nail Art Manicure", 175, 65, "mani", "Artistic manicure with custom accent nail art.", ["Custom designs", "Protective topcoat"], false),
  s("Manicure", "Gel Polish Manicure with or without Removal", 199, 70, "mani", "Full manicure with gel polish, including gentle gel removal if needed.", ["Safe gel removal included", "Chip-free up to 3 weeks"]),
  s("Manicure", "Polish Free Manicure", 109, 50, "mani", "Natural grooming manicure with shaping, cuticle care and buffing.", ["Natural glassy buff", "Chemical-free glow"]),
  s("Manicure", "Polish Free Mani-Pedi", 229, 80, "combo", "Complete natural grooming for hands and feet with scrub and buffing.", ["Hands and feet in one visit", "Exfoliating scrubs"]),
  s("Manicure", "Classic Polish Change (Hands)", 59, 25, "mani", "Quick removal of old polish and a fresh classic coat.", ["Quick 25-minute refresh", "Fast-drying finish"]),
  s("Manicure", "Gel French Polish Change (Hand)", 99, 35, "mani", "Express gel polish switch with French tip styling.", ["Long-lasting gel", "Instant UV dry"]),
  s("Manicure", "Cut and File (Hands)", 65, 20, "mani", "Quick clipping, filing and edge smoothing for neat hands.", ["Quick grooming", "Prevents snagging"]),
  s("Manicure", "Gel Polish Removal (Hands)", 65, 25, "mani", "Safe, non-damaging gel polish removal with conditioning oil.", ["No drill damage", "Nourishing nail soak"]),

  // ---------------- PEDICURE ----------------
  s("Pedicure", "Classic Pedicure", 130, 60, "pedi", "Warm foot soak, heel buffing, toenail shaping, cuticle care and polish.", ["Soothing foot bath", "Callus buffing"]),
  s("Pedicure", "Regular Pedicure", 120, 50, "pedi", "Essential foot grooming: soak, trim, filing, light buff and polish.", ["Refreshed feet", "Neat cuticles"], false),
  s("Pedicure", "Spa Pedicure", 160, 75, "pedi", "Luxurious foot spa ritual with scrub, mask and massage.", ["Mineral foot soak", "Calf and foot massage"], false),
  s("Pedicure", "Gel Pedicure", 175, 70, "pedi", "Full pedicure finished with smudge-proof gel polish.", ["Zero drying wait", "High-gloss colour"], false),
  s("Pedicure", "French Pedicure", 150, 65, "pedi", "Elegant French tips pedicure with cuticle balm and foot massage.", ["Timeless French tips", "Foot hydration"], false),
  s("Pedicure", "Gel Polish Pedicure with or without Removal", 189, 80, "pedi", "Complete pedicure with gel polish, including gentle removal if needed.", ["Instant dry", "Gel removal included"]),
  s("Pedicure", "Polish Free Pedicure", 139, 60, "pedi", "Natural restorative pedicure with deep heel smoothing and buffing.", ["Callus softening", "Chemical-free shine"]),
  s("Pedicure", "Classic Polish Change (Feet)", 59, 25, "pedi", "Quick toenail polish removal, light filing and fresh coat.", ["Express service", "Fresh shade"]),
  s("Pedicure", "Gel French Polish Change (Feet)", 99, 35, "pedi", "Express gel change for feet with French tips and LED cure.", ["Instant cure", "Smudge-proof"]),
  s("Pedicure", "Cut and File (Feet)", 65, 20, "pedi", "Hygienic toenail trimming and precision filing.", ["Prevents ingrown nails", "Sanitized tools"]),
  s("Pedicure", "Gel Polish Removal (Feet)", 65, 25, "pedi", "Gentle gel polish removal without scraping the nail bed.", ["Protects natural nails", "Conditioning oil finish"]),

  // ---------------- FACIAL ----------------
  s("Facial", "Herbal Facial", 199, 65, "facial", "All-natural botanical facial with antioxidant herbs and floral extracts.", ["Calms sensitive skin", "Detoxifies pores"]),
  s("Facial", "Face Cleansing / Clean Up", 150, 35, "facial", "Express deep pore cleanse, light exfoliation and toner.", ["Removes oil and impurities", "Refreshed skin"]),
  s("Facial", "Soothing Brightening and Glowing Facial", 359, 65, "facial", "Intensive radiance facial with vitamin C and soothing aloe vera.", ["Fades dark spots", "Luminous glow"]),
  s("Facial", "Hydra Facial", 299, 60, "facial", "Multi-step hydrating facial with moisture, peptides and antioxidants.", ["Deep exfoliation", "Hyaluronic infusion"], false),
  s("Facial", "Brightening Facial", 249, 50, "facial", "Complexion-evening facial for dull or tired skin.", ["Evens skin tone", "Radiant finish"], false),
  s("Facial", "Brightening & Glowing Facial", 279, 60, "facial", "Brightening serums with firming facial massage.", ["Boosts circulation", "Dewy radiance"], false),
  s("Facial", "Deep Cleaning Facial", 220, 60, "facial", "Clarifying facial for congested skin and blackheads.", ["Steam and extraction", "Purifying clay mask"], false),
  s("Facial", "Anti Aging Facial", 320, 70, "facial", "Collagen-boosting facial to firm and diminish fine lines.", ["Peptide infusion", "Lifting massage"], false),

  // ---------------- WAXING & THREADING ----------------
  s("Waxing", "Full Body Waxing with Brazilian", 570, 140, "wax", "Full body hair removal including Brazilian, legs, arms and underarms.", ["Smooth from head to toe", "Gentle on sensitive zones"]),
  s("Waxing", "Full Body Waxing without Brazilian", 440, 110, "wax", "Full body waxing excluding the bikini area.", ["Thorough coverage", "Post-wax soothing lotion"]),
  s("Waxing", "Brazilian Wax", 180, 40, "wax", "Discreet, hygienic Brazilian waxing with gentle hot wax.", ["Peelable hot wax", "Long-lasting results"], false),
  s("Waxing", "Full Leg, Full Arm plus Underarms Waxing", 179, 65, "wax", "Popular trio: full legs, full arms and underarms.", ["Best value combo", "Fast and hygienic"]),
  s("Waxing", "Full Arms with Underarms Waxing", 110, 35, "wax", "Full arms and underarms hair removal.", ["Smooth soft arms", "Gentle underarm wax"]),
  s("Waxing", "Full Arm Waxing", 95, 30, "wax", "Hair removal from shoulders to fingertips.", ["Silky arms", "Quick service"], false),
  s("Waxing", "Full Leg Waxing", 139, 35, "wax", "Complete hair removal from upper thighs to toes.", ["No stubble", "Lasts 3-4 weeks"]),
  s("Waxing", "Half Leg Waxing", 99, 25, "wax", "Waxing from above the knees down to ankles.", ["Quick session", "Easy maintenance"]),
  s("Waxing", "Underarm Waxing", 79, 20, "wax", "Fast, gentle underarm waxing.", ["Prevents razor shadow", "Soft underarms"]),
  s("Waxing", "Stomach Waxing", 99, 25, "wax", "Smooth hair removal across the abdomen.", ["Even hairless skin", "Calming lotion"]),
  s("Waxing", "Back Waxing", 109, 35, "wax", "Full back hair removal from shoulders to waistline.", ["Clean smooth back", "Non-irritating wax"]),
  s("Waxing", "Upper Lip Waxing", 59, 25, "wax", "Delicate upper lip waxing with temperature-controlled wax.", ["Precise removal", "Cooling aloe gel"]),
  s("Waxing", "Lower Lip Waxing", 49, 15, "wax", "Targeted waxing for lower lip area.", ["Quick touch-up", "Gentle and hygienic"], false),
  s("Waxing", "Chin Waxing", 49, 15, "wax", "Clean removal of chin and jawline hairs.", ["Pulls from root", "Rosewater finish"], false),
  s("Waxing", "Eyebrows Threading", 79, 20, "thread", "Artistic brow shaping with organic cotton thread.", ["Precise brow contour", "Chemical-free"]),
  s("Waxing", "Upper Lip Threading", 79, 15, "thread", "Gentle cotton thread hair removal for the upper lip.", ["Quick and precise", "Safe for sensitive skin"]),
  s("Waxing", "Chin and Jawline Threading", 69, 15, "thread", "Threading for stray hairs along chin and jawline.", ["Defined jawline", "Zero chemical irritation"]),
  s("Waxing", "Chin Threading", 59, 15, "thread", "Fast precision threading for the chin area.", ["Removes stubborn hairs", "Single-use thread"], false),
  s("Waxing", "Lower Lips Threading", 59, 15, "thread", "Delicate threading for the lower lip area.", ["Smooth texture", "No waxing irritation"], false),
  s("Waxing", "Forehead Threading", 69, 20, "thread", "Hairline clean-up and forehead peach fuzz threading.", ["Crisp hairline", "Flawless makeup base"]),

  // ---------------- WOMEN SALON SERVICES (MASSAGES) ----------------
  // WAS MISSING: Foot Massage, Palm Massage, Head Massage without oil
  s("Women Salon Services", "Foot Massage", 79, 25, "massage", "Relaxing foot massage to relieve tired feet.", ["Eases foot fatigue", "Improves circulation"]),
  s("Women Salon Services", "Head Massage without Oil", 79, 25, "massage", "Dry head and scalp massage to release tension.", ["Relieves stress", "No oil, no mess"]),
  s("Women Salon Services", "Oil Massage Head and Scalp", 99, 25, "massage", "Warm oil head and scalp massage to nourish and relax.", ["Nourishes scalp", "Deep relaxation"]),
  s("Women Salon Services", "Palm Massage", 65, 20, "massage", "Soothing palm and hand massage.", ["Relieves hand tension", "Hydrating"]),
  s("Women Salon Services", "Shoulder Massage", 89, 30, "massage", "Kneading massage for tired, stiff shoulders.", ["Dissolves knots", "Rapid tension relief"], false),

  // ---------------- NAIL POLISH ----------------
  // (duplicate polish-change items removed - they already live under Manicure / Pedicure)
  s("Nail Polish", "Normal Nail Polish", 49, 20, "polish", "Classic polish with base coat, two colour coats and gloss topcoat.", ["Quick application", "Rich pigment"], false),
  s("Nail Polish", "Gel Nail Polish", 89, 30, "polish", "Long-lasting gel colour cured under LED light.", ["Instant curing", "Chip-free 2-3 weeks"], false),
  s("Nail Polish", "French Nail Polish", 99, 35, "polish", "Sheer base topped with crisp white French tips.", ["Timeless styling", "Clean smile lines"], false),

  // ---------------- COMBO DEALS (WAS MISSING) ----------------
  s("Combo Deals", "Classic Mani-Pedi Combo", 220, 95, "combo", "Classic manicure and classic pedicure together.", ["Save vs booking separately", "One visit"]),
  s("Combo Deals", "Classic Mani-Pedi and Foot Massage", 269, 115, "combo", "Classic mani-pedi with a relaxing foot massage.", ["Full pamper package", "Foot massage included"]),
  s("Combo Deals", "Gel Polish Mani-Pedi Combo", 289, 135, "combo", "Gel polish manicure and pedicure together.", ["Long-lasting colour", "Hands and feet"]),
  s("Combo Deals", "Gel Mani-Pedi and Foot Massage", 359, 155, "combo", "Gel mani-pedi with foot massage.", ["Premium package", "Foot massage included"]),
  s("Combo Deals", "Gel Mani and Classic Pedi", 239, 115, "combo", "Gel manicure paired with a classic pedicure.", ["Mix and match", "Great value"]),
  // NOTE: list also has "Polish free mani-pedi" at AED 229 / 80 mins under Nails and AED 199 / 75 mins under Combos. Both kept (different slugs).
  s("Combo Deals", "Polish Free Mani-Pedi Combo", 199, 75, "combo", "Natural polish-free manicure and pedicure combo.", ["Chemical-free", "Natural shine"]),

  // ---------------- HENNA (WAS MISSING) ----------------
  s("Henna", "Henna - Per Finger", 30, 5, "henna", "Cone henna design on a single finger.", ["Quick add-on", "Natural henna"]),
  s("Henna", "Henna - Palm", 75, 10, "henna", "Cone henna design on the palm.", ["Elegant palm design", "Natural henna"]),
  s("Henna", "Henna - Front Hand Till Wrist (Basic Design)", 99, 15, "henna", "Basic design on the front of the hand up to the wrist.", ["Simple and elegant", "Quick session"]),
  s("Henna", "Henna - Front Hand Till Wrist (Heavy Design)", 179, 25, "henna", "Heavy detailed design on the front of the hand up to the wrist.", ["Intricate detailing", "Occasion-ready"]),
  s("Henna", "Henna - Front Hand Till Mid-Arm", 209, 40, "henna", "Front hand design extending to mid-arm.", ["Extended design", "Bridal and festive"]),
  s("Henna", "Henna - Front Hand Till Elbow", 299, 60, "henna", "Front hand design extending to the elbow.", ["Full-length design", "Bridal and festive"]),
  s("Henna", "Henna - Back Hand Till Wrist (Basic Design)", 99, 15, "henna", "Basic design on the back of the hand up to the wrist.", ["Simple and elegant", "Quick session"]),
  s("Henna", "Henna - Back Hand Till Wrist (Heavy Design)", 179, 25, "henna", "Heavy detailed design on the back of the hand up to the wrist.", ["Intricate detailing", "Occasion-ready"]),
  s("Henna", "Henna - Back Hand Till Mid-Arm", 209, 40, "henna", "Back hand design extending to mid-arm.", ["Extended design", "Bridal and festive"]),
  s("Henna", "Henna - Back Hand Till Elbow", 299, 60, "henna", "Back hand design extending to the elbow.", ["Full-length design", "Bridal and festive"]),
  s("Henna", "Henna - Both Front Hands Till Wrist (Basic Design)", 195, 30, "henna", "Basic design on both front hands up to the wrist.", ["Both hands", "Simple and elegant"]),
  s("Henna", "Henna - Both Front Hands Till Wrist (Heavy Design)", 355, 50, "henna", "Heavy design on both front hands up to the wrist.", ["Both hands", "Intricate detailing"]),
  s("Henna", "Henna - Both Front Hands Till Mid-Arm", 415, 80, "henna", "Both front hands with design to mid-arm.", ["Both hands", "Bridal and festive"]),
  s("Henna", "Henna - Both Front Hands Till Elbow", 596, 120, "henna", "Both front hands with design to the elbow.", ["Both hands", "Full-length design"]),
  s("Henna", "Henna - Both Back Hands Till Wrist (Basic Design)", 195, 30, "henna", "Basic design on both back hands up to the wrist.", ["Both hands", "Simple and elegant"]),
  s("Henna", "Henna - Both Back Hands Till Wrist (Heavy Design)", 355, 50, "henna", "Heavy design on both back hands up to the wrist.", ["Both hands", "Intricate detailing"]),
  s("Henna", "Henna - Both Back Hands Till Mid-Arm", 415, 80, "henna", "Both back hands with design to mid-arm.", ["Both hands", "Bridal and festive"]),
  s("Henna", "Henna - Both Back Hands Till Elbow", 596, 120, "henna", "Both back hands with design to the elbow.", ["Both hands", "Full-length design"]),
  s("Henna", "Henna - Simple Feet Design Till Ankle (Both Legs)", 349, 30, "henna", "Simple henna design on both feet up to the ankle.", ["Both feet", "Clean elegant look"]),
  s("Henna", "Henna - Heavy Feet Design Till Ankle (Both Legs)", 649, 60, "henna", "Heavy detailed henna design on both feet up to the ankle.", ["Both feet", "Intricate detailing"]),
];

/* ------------------------------------------------------------------ */
/* ZONES (unchanged)                                                   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* PRODUCTS (unchanged - not part of the price list)                   */
/* ------------------------------------------------------------------ */
const productCategoriesData = [
  { name: "Skincare", slug: "skincare", label: "Skincare", description: "Organic Rosa Damascena skincare services", position: 1, active: true },
  { name: "Wellness", slug: "wellness", label: "Wellness", description: "Holistic at-home spa and relaxation accessories", position: 2, active: true },
];

const p = (categoryName, name, price, size, stock, sku, description, image) => ({
  categoryName, name, brand: "Rose Essence", price, currency: "AED", description, size, stock, sku,
  active: true, slug: slugify(name), images: [image],
});
const PU = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const productsData = [
  p("Skincare", "Gentle Hydrating Facial Cleanser", 45, "150 ml", 50, "RE-SKIN-001", "Gentle daily cleanser for removing dirt, oil and makeup.", PU("1571781926291-c477ebfd024b")),
  p("Skincare", "Hyaluronic Acid Hydrating Serum", 75, "30 ml", 40, "RE-SKIN-002", "Lightweight hydrating serum for a plump, moisturised feel.", PU("1620916566398-39f1143ab7be")),
  p("Skincare", "Vitamin C Brightening Serum", 89, "30 ml", 35, "RE-SKIN-003", "Daily antioxidant serum to help improve the appearance of dull skin.", PU("1601049541289-9b1b7bbbfe19")),
  p("Skincare", "Daily Moisturising Cream", 59, "50 ml", 45, "RE-SKIN-004", "Everyday face moisturiser for soft, comfortable skin.", PU("1556228720-195a672e8a03")),
  p("Skincare", "Broad Spectrum SPF 50 Sunscreen", 65, "50 ml", 60, "RE-SKIN-005", "Daily sun protection for the face and neck. Follow label directions.", PU("1598440947619-2c35fc9aa908")),
  p("Skincare", "Nourishing Rose Face Mask", 39, "100 ml", 30, "RE-SKIN-006", "Wash-off face mask for a refreshed skincare routine.", PU("1608248597359-009187ec9c79")),
  p("Wellness", "Aromatherapy Essential Oil Blend", 55, "15 ml", 25, "RE-WELL-001", "Aromatic oil blend for use according to product label directions.", PU("1608248597359-009187ec9c79")),
  p("Wellness", "Relaxation Massage Oil", 69, "200 ml", 30, "RE-WELL-002", "Massage oil for body care and relaxation routines.", PU("1620916566398-39f1143ab7be")),
  p("Wellness", "Epsom Bath Salt", 35, "500 g", 40, "RE-WELL-003", "Bath salt for a relaxing bath routine.", PU("1519823551278-64ac92734fb1")),
  p("Wellness", "Silk Sleep Eye Mask", 49, "1 piece", 35, "RE-WELL-004", "Soft eye mask accessory for rest and travel.", PU("1590439471364-192aa70c0b53")),
  p("Wellness", "Jade Facial Roller", 42, "1 piece", 25, "RE-WELL-005", "Reusable facial massage tool for a skincare routine.", PU("1590439471364-192aa70c0b53")),
  p("Wellness", "Body Exfoliating Scrub", 52, "250 g", 30, "RE-WELL-006", "Body scrub for exfoliation; use as directed on the product label.", PU("1556228720-195a672e8a03")),
];

/* ------------------------------------------------------------------ */
async function seed() {
  console.log("🌱 Resetting and seeding Rose Essence service & product catalog...");

  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    console.log("🧹 Clearing old service records...");
    await Service.deleteMany({});
    await ServiceCategory.deleteMany({});

    console.log(`📁 Seeding ${serviceCategoriesData.length} service categories...`);
    const categoryMap = new Map();
    for (const catData of serviceCategoriesData) {
      const created = await ServiceCategory.create(catData);
      categoryMap.set(created.name, created._id);
      console.log(`  ✓ ${created.name} (${created.slug})`);
    }

    console.log(`💆 Seeding ${servicesRawData.length} services...`);
    let order = 1;
    const placeholders = [];
    for (const serv of servicesRawData) {
      const categoryId = categoryMap.get(serv.category);
      if (!categoryId) {
        console.warn(`  ⚠️ Category '${serv.category}' not found for '${serv.name}'`);
        continue;
      }

      await Service.create({
        name: serv.name,
        slug: slugify(serv.name),
        category: categoryId,
        price: serv.price,
        duration: serv.mins,
        durationMinutes: serv.mins,
        currency: "AED",
        active: true,
        isActive: true,
        serviceType: "home",
        womenOnly: true,
        shortDescription: serv.shortDescription,
        fullDescription: `${serv.shortDescription} Performed at your home by our trained professional using premium products.`,
        benefits: serv.benefits,
        images: [pick(serv.img)],
        displayOrder: order++,
        isFeatured: serv.price >= 150,
      });

      if (!serv.confirmed) placeholders.push(`${serv.category} > ${serv.name} (AED ${serv.price}, ${serv.mins} min)`);
      console.log(`  ✓ [${serv.category}] ${serv.name} | AED ${serv.price} | ${serv.mins} mins`);
    }

    console.log("📍 Seeding service zones...");
    for (const zoneData of sampleZones) {
      await ServiceZone.findOneAndUpdate(
        { slug: zoneData.slug },
        { $set: zoneData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ ${zoneData.name}`);
    }

    console.log("🛍️ Seeding product categories & products...");
    const prodCategoryMap = new Map();
    for (const pCat of productCategoriesData) {
      const created = await Category.findOneAndUpdate(
        { label: pCat.name },
        { $set: pCat },
        { upsert: true, new: true }
      );
      prodCategoryMap.set(pCat.name, created._id);
      console.log(`  ✓ ${pCat.name}`);
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
      console.log(`  ✓ ${prod.name} (AED ${prod.price}, ${prod.size})`);
    }

    console.log("🎉 Seeded successfully!");
    if (placeholders.length) {
      console.warn(`\n⚠️ ${placeholders.length} services have PLACEHOLDER price/time (not in your price list). Confirm these:`);
      placeholders.forEach((x) => console.warn("   - " + x));
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

seed();