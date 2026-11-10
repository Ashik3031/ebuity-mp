"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useCart } from "../../lib/cart-context";
import { BrandLogo } from "./BrandLogo";
import {
  Search,
  User as UserIcon,
  ShoppingBag,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Calendar,
  ChevronRight,
  ArrowRight,
  Eye,
  Scissors,
  Sparkles,
  Flower2,
  Flame,
  Heart,
  Palette,
} from "lucide-react";
import { serviceCategoryApi, serviceApi } from "../../lib/api-client";

interface ServiceSubCategory {
  title: string;
  description: string;
  query: string;
  price?: number;
  duration?: number;
}

interface ServiceMenuCategory {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: ServiceSubCategory[];
}

const SERVICE_MENU_CATEGORIES: ServiceMenuCategory[] = [
  {
    id: "hair-styling",
    name: "Hair Styling",
    slug: "hair-styling",
    tagline: "Blow dry, curls & straightening",
    icon: Scissors,
    subcategories: [
      {
        title: "Blow Dry",
        description: "Classic voluminous blowout for an effortlessly polished, salon-fresh look",
        query: "blow dry",
      },
      {
        title: "Blow Dry with Curls",
        description: "Deluxe blow dry with elegant defined curls and lasting bounce",
        query: "curls",
      },
      {
        title: "Blowdry & Curls (Short & Medium)",
        description: "Signature blowout and curls tailored for short to medium length hair",
        query: "short and medium",
      },
      {
        title: "Blowdry & Curls (Long Hair)",
        description: "Full blowout and glamorous cascading curls with argan shine",
        query: "long hair",
      },
      {
        title: "Blowdry & Curls (Extra Long)",
        description: "Complete blowout with sculpted glossy curls for extra-long hair",
        query: "extra long",
      },
      {
        title: "Hair Straightening (Short & Medium)",
        description: "Smooth glass-like keratin straightening & humidity block",
        query: "straightening short",
      },
      {
        title: "Hair Straightening (Long Hair)",
        description: "Silky sleek straightening for long, dense hair with mirror finish",
        query: "straightening long",
      },
      {
        title: "Hair Straightening (Extra Long)",
        description: "Ultra-sleek straightening & cuticle sealing for extra-long hair",
        query: "straightening extra long",
      },
    ],
  },
  {
    id: "manicure",
    name: "Manicure",
    slug: "manicure",
    tagline: "Classic, gel & luxury nail care",
    icon: Sparkles,
    subcategories: [
      {
        title: "Classic Manicure",
        description: "Nail shaping, cuticle care, hydrating hand massage & fresh polish",
        query: "classic manicure",
      },
      {
        title: "Polish Manicure",
        description: "Premium manicure with deep cuticle hydration and dual-coat polish",
        query: "polish manicure",
      },
      {
        title: "Gel Polish Manicure",
        description: "UV/LED cured chip-free wear with mirror shine lasting 3 weeks",
        query: "gel manicure",
      },
      {
        title: "French Manicure",
        description: "Timeless sheer pink base with clean, crisp white smile tips",
        query: "french manicure",
      },
      {
        title: "Nail Art Manicure",
        description: "Custom designer accent nail art & chic bespoke minimalist patterns",
        query: "nail art",
      },
      {
        title: "Gel Polish with/without Removal",
        description: "Full manicure with gel polish, including gentle gel removal",
        query: "gel polish manicure",
      },
      {
        title: "Polish Free Manicure",
        description: "Natural grooming manicure with precision shaping & glassy buffing",
        query: "polish free manicure",
      },
      {
        title: "Polish Free Mani-Pedi Combo",
        description: "Hands & feet complete natural grooming with exfoliating scrub",
        query: "polish free mani-pedi",
      },
      {
        title: "Classic Polish Change (Hands)",
        description: "Quick 25-minute old polish removal and fresh seasonal coat",
        query: "polish change hands",
      },
      {
        title: "Gel French Polish Change (Hands)",
        description: "Express gel polish switch with French tip LED styling",
        query: "gel french hands",
      },
      {
        title: "Cut and File (Hands)",
        description: "Hygienic clipping, shaping & edge smoothing for neat nails",
        query: "cut and file hands",
      },
      {
        title: "Gel Polish Removal (Hands)",
        description: "Safe non-damaging gel removal with nourishing botanical oil",
        query: "gel removal hands",
      },
    ],
  },
  {
    id: "pedicure",
    name: "Pedicure",
    slug: "pedicure",
    tagline: "Foot spa, callus care & gel",
    icon: Flower2,
    subcategories: [
      {
        title: "Classic Pedicure",
        description: "Warm herbal foot soak, heel buffing, nail shaping & fresh polish",
        query: "classic pedicure",
      },
      {
        title: "Regular Pedicure",
        description: "Essential foot grooming: soak, trim, filing, light buff & polish",
        query: "regular pedicure",
      },
      {
        title: "Luxury Spa Pedicure",
        description: "Exfoliating sea salt scrub, cooling foot mask & calf massage",
        query: "spa pedicure",
      },
      {
        title: "Gel Pedicure",
        description: "Full pedicure finished with smudge-proof, chip-free gel polish",
        query: "gel pedicure",
      },
      {
        title: "French Pedicure",
        description: "Elegant French tips pedicure with cuticle balm and foot massage",
        query: "french pedicure",
      },
      {
        title: "Gel Pedicure with/without Removal",
        description: "Complete pedicure with gel polish, including gentle gel removal",
        query: "gel polish pedicure",
      },
      {
        title: "Polish Free Pedicure",
        description: "Natural restorative pedicure with deep heel smoothing & buffing",
        query: "polish free pedicure",
      },
      {
        title: "Classic Polish Change (Feet)",
        description: "Express toenail polish removal, light filing and a fresh coat",
        query: "polish change feet",
      },
      {
        title: "Gel French Polish Change (Feet)",
        description: "Express gel change for feet with French tips and LED cure",
        query: "gel french feet",
      },
      {
        title: "Cut and File (Feet)",
        description: "Hygienic toenail trimming, precision filing & edge softening",
        query: "cut and file feet",
      },
      {
        title: "Gel Polish Removal (Feet)",
        description: "Gentle gel polish removal without scraping the natural nail bed",
        query: "gel removal feet",
      },
    ],
  },
  {
    id: "facial",
    name: "Facial",
    slug: "facial",
    tagline: "Hydra, brightening & deep cleanse",
    icon: Eye,
    subcategories: [
      {
        title: "Herbal & Botanical Facial",
        description: "All-natural botanical facial with antioxidant herbs & floral extracts",
        query: "herbal facial",
      },
      {
        title: "Face Cleansing / Clean Up",
        description: "Express deep pore cleanse, light exfoliation, extraction & toner",
        query: "face cleansing",
      },
      {
        title: "Soothing Brightening & Glow",
        description: "Intensive radiance facial with vitamin C and soothing aloe vera",
        query: "brightening and glowing facial",
      },
      {
        title: "Hydra Facial Ritual",
        description: "Multi-step hydro-dermabrasion exfoliation & hyaluronic infusion",
        query: "hydra facial",
      },
      {
        title: "Brightening Complexion Facial",
        description: "Complexion-evening therapy for tired, sun-damaged or dull skin",
        query: "brightening facial",
      },
      {
        title: "Deep Cleaning Clay Facial",
        description: "Purifying steam, blackhead extraction & clarifying pore-refining mask",
        query: "deep cleaning facial",
      },
      {
        title: "Anti Aging Collagen Facial",
        description: "Firming collagen lifting massage to diminish fine lines & plump skin",
        query: "anti aging facial",
      },
      {
        title: "Gold Glow Radiance Ritual",
        description: "Revitalizing gold leaf antioxidant mask for special occasions & events",
        query: "glowing facial",
      },
    ],
  },
  {
    id: "waxing",
    name: "Waxing",
    slug: "waxing",
    tagline: "Full body, Brazilian & threading",
    icon: Flame,
    subcategories: [
      {
        title: "Full Body Waxing with Brazilian",
        description: "Head-to-toe smooth hair removal with gentle stripless hot wax",
        query: "full body waxing with brazilian",
      },
      {
        title: "Full Body Waxing (without Brazilian)",
        description: "Complete full body hair removal excluding the bikini area",
        query: "full body waxing without brazilian",
      },
      {
        title: "Brazilian Wax",
        description: "Discreet, hygienic Brazilian waxing with peelable hot wax",
        query: "brazilian wax",
      },
      {
        title: "Full Leg, Full Arm & Underarms",
        description: "Popular trio: full legs, full arms and soothing underarms waxing",
        query: "full leg full arm",
      },
      {
        title: "Full Arms with Underarms Waxing",
        description: "Silky arm hair removal from shoulders to fingertips with underarms",
        query: "full arms with underarms",
      },
      {
        title: "Full Leg Waxing",
        description: "Complete hair removal from upper thighs to toes, lasts 3-4 weeks",
        query: "full leg waxing",
      },
      {
        title: "Half Leg Waxing",
        description: "Fast session waxing from above the knees down to ankles",
        query: "half leg waxing",
      },
      {
        title: "Underarm Waxing",
        description: "Fast, gentle underarm waxing preventing dark razor shadow",
        query: "underarm waxing",
      },
      {
        title: "Stomach & Back Waxing",
        description: "Smooth hair removal across the abdomen and full back",
        query: "stomach waxing",
      },
      {
        title: "Upper Lip & Chin Waxing",
        description: "Delicate facial waxing with temperature-controlled wax",
        query: "upper lip waxing",
      },
      {
        title: "Eyebrows Threading",
        description: "Artistic brow contour shaping with sanitized organic cotton thread",
        query: "eyebrows threading",
      },
      {
        title: "Upper Lip Threading",
        description: "Gentle cotton thread hair removal safe for sensitive skin",
        query: "upper lip threading",
      },
      {
        title: "Chin & Jawline Threading",
        description: "Precision threading for stray hairs along chin and jawline",
        query: "chin threading",
      },
      {
        title: "Full Forehead & Hairline Threading",
        description: "Peach fuzz threading for a crisp hairline & smooth makeup base",
        query: "forehead threading",
      },
    ],
  },
  {
    id: "women-salon-services",
    name: "Women Salon Services",
    slug: "women-salon-services",
    tagline: "Head & shoulder tension massage",
    icon: Heart,
    subcategories: [
      {
        title: "Foot Relaxation Massage",
        description: "Aromatherapy herbal foot massage relieving tired feet & swelling",
        query: "foot massage",
      },
      {
        title: "Head Massage without Oil",
        description: "Dry scalp acupressure massage for stress, headache & desk fatigue",
        query: "head massage without oil",
      },
      {
        title: "Oil Massage Head & Scalp",
        description: "Warm botanical oil scalp massage to deeply nourish and relax",
        query: "oil massage head",
      },
      {
        title: "Palm & Hand Massage",
        description: "Soothing acupressure palm massage releasing wrist and finger tension",
        query: "palm massage",
      },
      {
        title: "Shoulder Tension Relief Massage",
        description: "Deep kneading massage for tired, stiff shoulder blades & traps",
        query: "shoulder massage",
      },
      {
        title: "Combined Head & Shoulder Ritual",
        description: "Restorative upper body massage combining scalp and shoulder work",
        query: "head and shoulder",
      },
      {
        title: "Neck & Back Deep Ease",
        description: "Targeted pressure massage dissolving knots and postural strain",
        query: "tension relief",
      },
    ],
  },
  {
    id: "nail-polish",
    name: "Nail Polish",
    slug: "nail-polish",
    tagline: "Normal, gel & French color",
    icon: Palette,
    subcategories: [
      {
        title: "Normal Nail Polish",
        description: "Classic high-pigment lacquer with protective mirror-shine topcoat",
        query: "normal nail polish",
      },
      {
        title: "Gel Nail Polish",
        description: "Durable chip-free LED gel color lasting up to 3 weeks",
        query: "gel nail polish",
      },
      {
        title: "French Nail Polish",
        description: "Timeless sheer base topped with crisp white French smile tips",
        query: "french nail polish",
      },
      {
        title: "Classic Polish Change (Hands)",
        description: "Express 25-minute color refresh and clean edge smoothing",
        query: "polish change hands",
      },
      {
        title: "Classic Polish Change (Feet)",
        description: "Express toenail polish removal, light filing and a fresh shade",
        query: "polish change feet",
      },
      {
        title: "Gel French Polish Change (Hands)",
        description: "Instant LED dry French tip styling for hand nails",
        query: "gel french hands",
      },
      {
        title: "Gel French Polish Change (Feet)",
        description: "Instant smudge-proof gel French polish for toenails in sandals",
        query: "gel french feet",
      },
      {
        title: "Polish Free Natural Buffing",
        description: "Gentle cut, file and glassy high-shine natural nail buff",
        query: "polish free",
      },
    ],
  },
  {
    id: "henna",
    name: "Henna",
    slug: "henna",
    tagline: "Cone henna designs for hands, arms & feet",
    icon: Flower2,
    subcategories: [
      {
        title: "Henna - Per Finger",
        description: "Delicate artistic design tailored for individual fingers",
        query: "Henna - Per Finger",
        price: 30,
        duration: 5,
      },
      {
        title: "Henna - Palm",
        description: "Traditional floral mandala motif across the inner palm",
        query: "Henna - Palm",
        price: 75,
        duration: 10,
      },
      {
        title: "Henna - Front Hand Till Wrist (Basic Design)",
        description: "Classic wrist-length graceful henna pattern on front hand",
        query: "Henna - Front Hand Till Wrist (Basic Design)",
        price: 99,
        duration: 15,
      },
      {
        title: "Henna - Front Hand Till Wrist (Heavy Design)",
        description: "Intricate bridal-style dense geometric & paisley detailing",
        query: "Henna - Front Hand Till Wrist (Heavy Design)",
        price: 179,
        duration: 25,
      },
      {
        title: "Henna - Both Front Hands Till Wrist (Basic Design)",
        description: "Coordinated matching henna motifs across both palms and wrists",
        query: "Henna - Both Front Hands Till Wrist (Basic Design)",
        price: 195,
        duration: 30,
      },
      {
        title: "Henna - Both Back Hands Till Wrist (Basic Design)",
        description: "Striking back-of-hand patterns extending to fingertips",
        query: "Henna - Both Back Hands Till Wrist (Basic Design)",
        price: 195,
        duration: 30,
      },
      {
        title: "Henna - Simple Feet Design Till Ankle (Both Legs)",
        description: "Elegant foot and ankle henna accents perfect for sandals",
        query: "Henna - Simple Feet Design Till Ankle (Both Legs)",
        price: 349,
        duration: 30,
      },
      {
        title: "Henna - Heavy Feet Design Till Ankle (Both Legs)",
        description: "Celebration-ready dense ornate artwork covering feet and ankles",
        query: "Henna - Heavy Feet Design Till Ankle (Both Legs)",
        price: 649,
        duration: 60,
      },
    ],
  },
];

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "hair-styling": Scissors,
  hair: Scissors,
  manicure: Sparkles,
  pedicure: Flower2,
  facial: Eye,
  waxing: Flame,
  "women-salon-services": Heart,
  massage: Heart,
  "nail-polish": Palette,
  nails: Palette,
  "combo-deals": Sparkles,
  henna: Flower2,
};

let cachedCategories: ServiceMenuCategory[] | null = null;
let categoriesFetchPromise: Promise<ServiceMenuCategory[]> | null = null;

async function fetchRealServiceCategories(): Promise<ServiceMenuCategory[]> {
  try {
    const [catsRes, servsRes] = await Promise.allSettled([
      serviceCategoryApi.getAll(),
      serviceApi.getAll({ limit: 300, sortBy: "displayOrder" }),
    ]);

    const categoriesData =
      catsRes.status === "fulfilled" && catsRes.value?.categories
        ? catsRes.value.categories
        : [];
    const servicesData =
      servsRes.status === "fulfilled" && servsRes.value?.services
        ? servsRes.value.services
        : [];

    if (!categoriesData.length) {
      return SERVICE_MENU_CATEGORIES;
    }

    const transformed: ServiceMenuCategory[] = categoriesData.map((cat) => {
      const matchedServices = servicesData.filter((s) => {
        const catObj = typeof s.category === "object" ? s.category : null;
        return (
          catObj?._id === cat._id ||
          catObj?.slug === cat.slug ||
          s.category === cat._id ||
          s.categorySlug === cat.slug ||
          (typeof s.category === "string" && s.category === cat.slug) ||
          s.categoryName?.toLowerCase() === cat.name.toLowerCase()
        );
      });

      const iconKey = (cat.slug || cat.name).toLowerCase().replace(/\s+/g, "-");
      const IconComponent = CATEGORY_ICON_MAP[iconKey] || Sparkles;

      const subcategories: ServiceSubCategory[] = matchedServices.map((srv) => ({
        title: srv.name,
        description:
          srv.shortDescription ||
          (srv.duration
            ? `${srv.duration} mins • AED ${srv.price}`
            : `AED ${srv.price}`),
        query: srv.name,
        price: srv.price,
        duration: srv.duration,
      }));

      return {
        id: cat.slug || cat._id,
        name: cat.name,
        slug: cat.slug,
        tagline: cat.description || `${subcategories.length} treatments available`,
        icon: IconComponent,
        subcategories,
      };
    });

    return transformed;
  } catch (err) {
    console.warn("Failed to fetch real categories for navbar:", err);
    return SERVICE_MENU_CATEGORIES;
  }
}

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totals } = useCart();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("hair-styling");
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [menuCategories, setMenuCategories] = useState<ServiceMenuCategory[]>(
    () => cachedCategories || SERVICE_MENU_CATEGORIES
  );
  const router = useRouter();

  // Load real service catalog data from backend API
  useEffect(() => {
    let isMounted = true;

    if (cachedCategories) {
      setMenuCategories(cachedCategories);
      return;
    }

    if (!categoriesFetchPromise) {
      categoriesFetchPromise = fetchRealServiceCategories().then((res) => {
        cachedCategories = res;
        return res;
      });
    }

    categoriesFetchPromise.then((res) => {
      if (isMounted && res && res.length > 0) {
        setMenuCategories(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/services?query=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const currentCategory =
    menuCategories.find((c) => c.id === activeCategory || c.slug === activeCategory) ||
    menuCategories[0] ||
    SERVICE_MENU_CATEGORIES[0];

  // Transparent navbar on hero section initial state; changes to glass blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled && !mobileMenuOpen;

  return (
    <header
      className={`${isHome ? "fixed top-0 left-0 right-0" : "sticky top-0"
        } z-50 w-full transition-all duration-300 ${isTransparent
          ? "bg-transparent border-b border-transparent shadow-none"
          : "bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8D8C8]/60 shadow-xs"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left: Brand Logo */}
          <div className="flex items-center">
            <BrandLogo />
          </div>

          {/* Center: Desktop Navigation with Services & Shop */}
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 font-serif font-medium text-sm lg:text-[16px] xl:text-[17px]"
            aria-label="Main Navigation"
          >
            {/* Prominently Highlighted Services Navigation with Subcategories on Hover */}
            <div
              className="relative"
              onMouseEnter={() => setServicesDropdownOpen(true)}
              onMouseLeave={() => setServicesDropdownOpen(false)}
            >
              <Link
                href="/services"
                className="flex items-center gap-1.5 py-1 text-[#CF565D] hover:text-[#b8454c] transition-colors focus:outline-none"
                aria-expanded={servicesDropdownOpen}
              >
                <span className="text-[16px] lg:text-[17px] font-medium tracking-tight">Our Services</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#CF565D] transition-transform duration-200 ${servicesDropdownOpen ? "rotate-180" : ""
                    }`}
                />
              </Link>

              {servicesDropdownOpen && (
                <div className="absolute top-full -left-8 w-[820px] pt-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-white rounded-3xl shadow-2xl border border-[#E8D8C8] overflow-hidden flex divide-x divide-[#E8D8C8]/60">
                    {/* Left Column: Categories */}
                    <div className="w-[240px] p-2.5 bg-[#FAF7F2]/60 flex flex-col justify-between shrink-0">
                      <div>
                        <div className="px-2.5 pt-0.5 pb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#746D69]/80">
                            Service Categories
                          </span>
                        </div>
                        <div className="space-y-1 max-h-[390px] overflow-y-auto [scrollbar-width:thin] pr-1">
                          {menuCategories.map((cat) => {
                            const Icon = cat.icon || Sparkles;
                            const isSelected = activeCategory === cat.id || activeCategory === cat.slug;
                            return (
                              <Link
                                key={cat.id}
                                href={`/services?category=${cat.slug}`}
                                onMouseEnter={() => setActiveCategory(cat.id)}
                                onClick={() => setServicesDropdownOpen(false)}
                                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all duration-150 ${isSelected
                                  ? "bg-white border border-[#E8D8C8] shadow-xs"
                                  : "hover:bg-white/70 border border-transparent"
                                  }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isSelected
                                      ? "bg-[#CF565D] text-white shadow-2xs"
                                      : "bg-white text-[#746D69] border border-[#E8D8C8]/60 group-hover:text-[#CF565D] group-hover:border-[#CF565D]/40"
                                      }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <span
                                      className={`block text-[14px] leading-tight transition-colors ${isSelected
                                        ? "font-bold text-[#CF565D]"
                                        : "font-semibold text-[#292525] group-hover:text-[#CF565D]"
                                        }`}
                                    >
                                      {cat.name}
                                    </span>
                                    <span className="block text-[11px] text-[#746D69] truncate mt-0.5">
                                      {cat.tagline}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight
                                  className={`w-3.5 h-3.5 shrink-0 transition-all ${isSelected
                                    ? "text-[#CF565D] translate-x-0 opacity-100"
                                    : "text-[#746D69]/40 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                                    }`}
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-1.5 px-1 border-t border-[#E8D8C8]/50 mt-1">
                        <Link
                          href="/services"
                          onClick={() => setServicesDropdownOpen(false)}
                          className="w-full py-1.5 px-2.5 text-[12px] font-semibold text-[#CF565D] hover:text-[#b8454c] hover:bg-white rounded-lg transition-colors flex items-center justify-between"
                        >
                          <span>All At-Home Ceremonies</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    </div>

                    {/* Right Column: Subcategories for Hovered Category */}
                    <div className="flex-1 p-3.5 sm:p-4 bg-white flex flex-col justify-between">
                      <div>
                        {/* Subcategory Header */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E8D8C8]/50">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[15px] font-bold text-[#292525]">
                              {currentCategory.name}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#CF565D] border border-[#E8D8C8]">
                              {currentCategory.subcategories.length} services
                            </span>
                            <span className="hidden sm:inline text-[11px] text-[#746D69]">
                              • Select a treatment to view details & pricing
                            </span>
                          </div>
                          <Link
                            href={`/services?category=${currentCategory.slug}`}
                            onClick={() => setServicesDropdownOpen(false)}
                            className="text-[12px] font-semibold text-[#CF565D] hover:text-[#b8454c] flex items-center gap-1 group/view transition-colors shrink-0"
                          >
                            <span>View All</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover/view:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                        {/* Subcategories Grid - 2 columns, fills available vertical space naturally */}
                        {currentCategory.subcategories.length === 0 ? (
                          <div className="py-12 text-center text-[#746D69] text-xs">
                            No treatments currently listed in this category.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1.5 [scrollbar-width:thin]">
                            {currentCategory.subcategories.map((sub, idx) => (
                              <Link
                                key={idx}
                                href={`/services?category=${currentCategory.slug}&query=${encodeURIComponent(
                                  sub.query
                                )}`}
                                onClick={() => setServicesDropdownOpen(false)}
                                className="group/sub p-2.5 rounded-xl bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] border border-[#E8D8C8]/50 hover:border-[#CF565D]/40 transition-all duration-150 flex items-start justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[13px] font-semibold text-[#292525] group-hover/sub:text-[#CF565D] transition-colors truncate">
                                      {sub.title}
                                    </span>
                                    {typeof sub.price === "number" && (
                                      <span className="text-[11px] font-bold text-[#CF565D] shrink-0">
                                        AED {sub.price}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#746D69] truncate mt-0.5 leading-snug">
                                    {sub.description}
                                  </p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-[#CF565D] mt-0.5 opacity-40 group-hover/sub:opacity-100 group-hover/sub:translate-x-0.5 transition-all shrink-0" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Banner */}
                      <div className="mt-2.5 pt-2 border-t border-[#E8D8C8]/50 flex items-center justify-between text-[11px] text-[#746D69]">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
                          <span>Hospital-grade sterilisation & certified aestheticians</span>
                        </div>
                        <Link
                          href="/book"
                          onClick={() => setServicesDropdownOpen(false)}
                          className="text-[#CF565D] font-semibold hover:underline"
                        >
                          Book Appointment &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Packages & Offers */}
            <Link
              href="/packages"
              className="relative py-1 text-[#746D69] hover:text-[#CF565D] transition-colors flex items-center gap-1.5"
            >
              <span>Packages & Offers</span>
            </Link>

            {/* Shop */}
            <Link
              href="/shop"
              className="relative py-1 text-[#746D69] hover:text-[#292525] transition-colors flex items-center gap-1.5"
            >
              <span>Shop </span>
            </Link>

            <Link
              href="/#about"
              className="py-1 text-[#746D69] hover:text-[#292525] transition-colors"
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="py-1 text-[#746D69] hover:text-[#292525] transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right: Actions (Mobile: Search -> /book, Book Now, Menu; Desktop: Search, Account, Cart, Book Now) */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 lg:gap-3.5 shrink-0">

            {/* Mobile-Only Search Icon -> Navigates directly to /book per Requirement 4 */}
            <Link
              href="/book"
              className="sm:hidden w-9 h-9 xs:w-10 xs:h-10 flex items-center justify-center text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60 active:scale-95 shrink-0"
              aria-label="Search and book treatments"
            >
              <Search className="w-5 h-5 stroke-[1.75]" />
            </Link>

            {/* Desktop/Tablet Search Toggle & Dropdown */}
            <div className="hidden sm:block relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 flex items-center justify-center text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60 active:scale-95"
                aria-label="Search treatments and services"
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 lg:w-96 p-2.5 bg-white rounded-2xl shadow-xl border border-[#E8D8C8] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]/70 focus-within:border-[#CF565D] focus-within:bg-white transition-all">
                    <Search className="w-4 h-4 text-[#CF565D] shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search facials, massages, manicure..."
                      className="w-full text-xs text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none bg-transparent py-1"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-[#746D69] hover:text-[#292525] p-1"
                        aria-label="Clear query"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-[#CF565D] text-white text-[11px] font-semibold hover:bg-[#b8454c] shrink-0"
                    >
                      Search
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Desktop/Tablet Account / Profile (Hidden on Mobile per Requirement 3; moved to Drawer) */}
            <div className="hidden sm:block relative">
              {isAuthenticated ? (
                <div className="flex items-center gap-1">
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#CF565D] transition-colors text-xs font-medium text-[#292525] shadow-2xs"
                    title="Customer Account"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span className="hidden xl:inline max-w-[90px] truncate">
                      {user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-9 h-9 flex items-center justify-center text-[#746D69] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="w-10 h-10 flex items-center justify-center text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60 active:scale-95"
                  aria-label="Client Sign In"
                >
                  <UserIcon className="w-5 h-5 stroke-[1.75]" />
                </Link>
              )}
            </div>

            {/* Desktop/Tablet Cart Bag Icon (Hidden on Mobile per Requirement 3; moved to Drawer) */}
            <Link
              href="/cart"
              className="hidden sm:flex relative w-10 h-10 items-center justify-center text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60 active:scale-95 shrink-0"
              aria-label={`Shopping Cart, ${totals.count} items`}
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {totals.count > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#CF565D] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs animate-in zoom-in duration-150">
                  {totals.count > 99 ? "99+" : totals.count}
                </span>
              )}
            </Link>

            {/* Prominent Book Now Button (Visible on ALL devices: Mobile, Tablet & Desktop) */}
            <Link
              href="/book"
              onClick={() => {
                if (pathname === "/book") {
                  window.dispatchEvent(new CustomEvent("reset-booking-flow"));
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 h-8 xs:h-9 sm:h-10 px-2.5 xs:px-3 sm:px-4 lg:px-5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-[11px] xs:text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 shrink-0"
            >
              <Calendar className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
              <span className="whitespace-nowrap">Book Now</span>
            </Link>

            {/* Mobile Hamburger Toggle (md:hidden) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 xs:w-10 xs:h-10 flex items-center justify-center text-[#292525] hover:text-[#CF565D] rounded-lg focus:outline-none shrink-0"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 xs:w-6 xs:h-6 stroke-[1.75]" />
              ) : (
                <Menu className="w-5 h-5 xs:w-6 xs:h-6 stroke-[1.75]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Full-Header Search Bar Overlay (Active on Mobile when search clicked) */}
      {searchOpen && (
        <div className="sm:hidden absolute inset-x-0 top-0 h-16 bg-white border-b border-[#E8D8C8] px-3.5 flex items-center gap-2.5 z-50 shadow-md animate-in slide-in-from-top duration-150">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8] px-3 py-1.5 focus-within:border-[#CF565D] focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-[#CF565D] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search treatments, rituals..."
              className="w-full text-base text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none bg-transparent"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-[#746D69]"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="w-9 h-9 flex items-center justify-center text-[#746D69] hover:text-[#292525] shrink-0"
            aria-label="Close search"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      )}

      {/* Mobile Drawer with Full Viewport Height, Safe Area and Search */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-[#FAF7F2] border-t border-[#E8D8C8] px-4 sm:px-6 py-5 overflow-y-auto space-y-4 animate-in slide-in-from-top duration-200 z-50 shadow-xl pb-[max(3rem,env(safe-area-inset-bottom))]">
          {/* Quick Account & Cart Row in Mobile Drawer */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-xs font-semibold text-[#292525] shadow-2xs hover:border-[#CF565D] transition-colors min-w-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 text-[#CF565D]">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="block text-[10px] uppercase font-bold text-[#746D69]/70 leading-none">Account</span>
                  <span className="block text-xs font-bold text-[#292525] truncate mt-0.5">{user?.name?.split(" ")[0] || "My Profile"}</span>
                </div>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-xs font-semibold text-[#292525] shadow-2xs hover:border-[#CF565D] transition-colors min-w-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 text-[#CF565D]">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="block text-[10px] uppercase font-bold text-[#746D69]/70 leading-none">Welcome</span>
                  <span className="block text-xs font-bold text-[#292525] truncate mt-0.5">Sign In / Profile</span>
                </div>
              </Link>
            )}

            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-xs font-semibold text-[#292525] shadow-2xs hover:border-[#CF565D] transition-colors min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 text-[#CF565D]">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="block text-[10px] uppercase font-bold text-[#746D69]/70 leading-none">Basket</span>
                  <span className="block text-xs font-bold text-[#292525] truncate mt-0.5">Shopping Cart</span>
                </div>
              </div>
              {totals.count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#CF565D] text-white text-[11px] font-bold shrink-0">
                  {totals.count}
                </span>
              )}
            </Link>
          </div>

          {/* Direct Search Bar Inside Mobile Drawer */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-[#E8D8C8] shadow-2xs">
            <Search className="w-4 h-4 text-[#CF565D] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search treatments or packages..."
              className="w-full text-sm text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none bg-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-[#746D69]"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-[#CF565D] text-white text-xs font-semibold shrink-0"
            >
              Search
            </button>
          </form>

          {/* Quick Book CTA Button in Mobile Drawer */}
          <Link
            href="/book"
            onClick={() => {
              setMobileMenuOpen(false);
              if (pathname === "/book") {
                window.dispatchEvent(new CustomEvent("reset-booking-flow"));
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Book an Appointment</span>
          </Link>

          <nav className="flex flex-col space-y-3">
            {/* Mobile Services Accordion */}
            <div className="border-b border-[#E8D8C8]/40 pb-2">
              <button
                type="button"
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                className="w-full text-base font-semibold text-[#CF565D] py-1 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Our Services</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                    services
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#CF565D] transition-transform duration-200 ${mobileServicesOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {mobileServicesOpen && (
                <div className="pt-2 pb-1 space-y-3 animate-in slide-in-from-top-1 duration-150 pl-1">
                  {menuCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1.5 p-2.5 rounded-2xl bg-white/60 border border-[#E8D8C8]/50">
                      <Link
                        href={`/services?category=${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-[15px] font-bold text-[#292525] hover:text-[#CF565D] flex items-center justify-between"
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs text-[#CF565D] font-medium flex items-center gap-0.5">
                          <span>View All ({cat.subcategories.length})</span>
                          <span>&rarr;</span>
                        </span>
                      </Link>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {cat.subcategories.slice(0, 8).map((sub, idx) => (
                          <Link
                            key={idx}
                            href={`/services?category=${cat.slug}&query=${encodeURIComponent(sub.query)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-[12px] text-[#746D69] hover:text-[#CF565D] py-1.5 px-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8]/40 truncate flex items-center justify-between"
                          >
                            <span className="truncate">{sub.title}</span>
                            {typeof sub.price === "number" && (
                              <span className="text-[11px] font-bold text-[#CF565D] shrink-0 ml-1.5">
                                AED {sub.price}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/services"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-xs font-bold text-[#CF565D] pt-1 text-center hover:underline"
                  >
                    View All Services & Ceremonies &rarr;
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/packages"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Packages & Offers</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                Offers
              </span>
            </Link>
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Shop Botanicals</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                Store
              </span>
            </Link>
            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Shopping Cart</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8D8C8]/60 text-[#292525]">
                {totals.count} items
              </span>
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40"
            >
              About Our Standards
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1"
            >
              Contact & Concierge
            </Link>
          </nav>

          <div className="pt-4 border-t border-[#E8D8C8] flex flex-col gap-3">

            {isAuthenticated ? (
              <div className="flex flex-col gap-2 w-full pt-1">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-[#292525] font-semibold hover:text-[#CF565D] py-1"
                >
                  My Account &rarr;
                </Link>
                <div className="flex items-center justify-between w-full pt-1 border-t border-[#FAF7F2]">
                  <span className="text-xs text-[#746D69]">
                    Signed in as {user?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-[#CF565D] font-semibold"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#292525] border border-[#E8D8C8] rounded-full bg-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#292525] border border-[#E8D8C8] rounded-full bg-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
