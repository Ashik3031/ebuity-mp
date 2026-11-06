"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface ServiceSubCategory {
  title: string;
  description: string;
  query: string;
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
        title: "Blowdry & Curls (Short & Medium)",
        description: "Voluminous curls and signature blowouts with heat protection",
        query: "curls",
      },
      {
        title: "Blowdry & Curls (Long & Extra Long)",
        description: "Glamorous Hollywood waves & cascading curls with argan shine",
        query: "long",
      },
      {
        title: "Hair Straightening",
        description: "Smooth mirror-finish keratin straightening & humidity block",
        query: "straightening",
      },
      {
        title: "Blow Dry & Waves",
        description: "Effortless root lift, natural body & silky salon finish",
        query: "blow dry",
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
        title: "Classic & Polish Manicure",
        description: "Nail shaping, gentle cuticle care & high-shine lacquer",
        query: "manicure",
      },
      {
        title: "Gel Polish Manicure",
        description: "UV/LED cured chip-free wear with safe gentle removal",
        query: "gel",
      },
      {
        title: "French & Nail Art Manicure",
        description: "Clean French tips, chic minimalist designs & bespoke art",
        query: "french",
      },
      {
        title: "Polish Free & Cut / File",
        description: "Natural glassy nail buffing, clipping & gel removals",
        query: "cut and file",
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
        title: "Classic & Regular Pedicure",
        description: "Warm herbal foot soak, callus smoothing & fresh color",
        query: "pedicure",
      },
      {
        title: "Luxury Spa Pedicure",
        description: "Exfoliating sea salt scrub, cooling foot mask & massage",
        query: "spa",
      },
      {
        title: "Gel & French Pedicure",
        description: "Instant dry LED cure, no smudging or denting in sandals",
        query: "gel",
      },
      {
        title: "Polish Free Pedicure & Care",
        description: "Deep heel softening, toenail cut/file & gentle gel removal",
        query: "polish free",
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
        title: "Herbal & Soothing Facial",
        description: "Calming antioxidant botanical extracts for sensitive skin",
        query: "herbal",
      },
      {
        title: "Hydra & Deep Cleansing",
        description: "Hydro-dermabrasion exfoliation, extraction & deep hydration",
        query: "hydra",
      },
      {
        title: "Brightening & Glow Therapy",
        description: "Vitamin C radiance boost, gold mask & dark spot fading",
        query: "brightening",
      },
      {
        title: "Anti-Aging & Clean Up",
        description: "Firming collagen lifting & express pore purifying cleanse",
        query: "anti aging",
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
        title: "Full Body & Brazilian",
        description: "Silky head-to-toe hair removal with stripless hot wax",
        query: "full body",
      },
      {
        title: "Arms, Legs & Underarms",
        description: "Half & full legs, full arms & soothing underarm waxing",
        query: "waxing",
      },
      {
        title: "Facial & Targeted Waxing",
        description: "Upper lip, chin, stomach & back delicate waxing",
        query: "lip waxing",
      },
      {
        title: "Precision Threading",
        description: "Eyebrow shaping, upper lip, chin & forehead threading",
        query: "threading",
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
        title: "Indian Head Massage",
        description: "Warm botanical oil scalp massage for headache & stress relief",
        query: "head massage",
      },
      {
        title: "Shoulder Tension Relief",
        description: "Targeted kneading & acupressure for stiff shoulder blades",
        query: "shoulder",
      },
      {
        title: "Head & Shoulder Ritual",
        description: "Combined upper body massage for restorative relaxation",
        query: "head and shoulder",
      },
      {
        title: "Neck & Back Ease",
        description: "Deep restorative pressure for desk strain & muscle fatigue",
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
        description: "Vibrant high-pigment lacquer & mirror-shine protective topcoat",
        query: "normal",
      },
      {
        title: "Gel Nail Polish",
        description: "Durable chip-free LED gel color lasting up to 3 weeks",
        query: "gel",
      },
      {
        title: "French Nail Polish",
        description: "Timeless chic sheer base with crisp white smile tips",
        query: "french",
      },
      {
        title: "Polish Change (Hands & Feet)",
        description: "Express 25-minute color refresh & fresh seasonal shade",
        query: "polish change",
      },
    ],
  },
];

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

  const currentCategory =
    SERVICE_MENU_CATEGORIES.find((c) => c.id === activeCategory) ||
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
                            Service Rituals
                          </span>
                        </div>
                        <div className="space-y-1">
                          {SERVICE_MENU_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = activeCategory === cat.id;
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
                              {currentCategory.subcategories.length} Rituals
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

                        {/* Subcategories Grid - 2 columns, spacious horizontal width, compact vertical height */}
                        <div className="grid grid-cols-2 gap-2">
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
                                <div className="flex items-center gap-1">
                                  <span className="text-[13.5px] font-semibold text-[#292525] group-hover/sub:text-[#CF565D] transition-colors truncate">
                                    {sub.title}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-[#746D69] truncate mt-0.5 leading-snug">
                                  {sub.description}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-[#CF565D] mt-0.5 opacity-40 group-hover/sub:opacity-100 group-hover/sub:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                          ))}
                        </div>
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

          {/* Right: Actions (Search, Profile, Cart, Book Now, Mobile Toggle) */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">

            {/* Search Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                aria-label="Search services"
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 p-2 bg-white rounded-2xl shadow-xl border border-[#E8D8C8] z-50">
                  <div className="flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search facials, massages, manicure..."
                      className="w-full text-xs text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none bg-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs text-[#746D69] hover:text-[#292525] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account / Profile */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#CF565D] transition-colors text-xs font-medium text-[#292525] shadow-2xs"
                    title="Customer Account"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span className="hidden xl:inline max-w-[100px] truncate">
                      {user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="p-2 text-[#746D69] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                  aria-label="Client Sign In"
                >
                  <UserIcon className="w-5 h-5 stroke-[1.75]" />
                </Link>
              )}
            </div>

            {/* Cart Bag Icon with Badge */}
            <Link
              href="/cart"
              className="relative p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
              aria-label={`Shopping Cart, ${totals.count} items`}
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {totals.count > 0 && (
                <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#CF565D] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs animate-in zoom-in duration-150">
                  {totals.count > 99 ? "99+" : totals.count}
                </span>
              )}
            </Link>

            {/* Book Now Button (visible on tablet and desktop; mobile uses drawer CTA) */}
            <Link
              href="/book"
              onClick={() => {
                if (pathname === "/book") {
                  window.dispatchEvent(new CustomEvent("reset-booking-flow"));
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 sm:px-4 lg:px-5 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Now</span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#292525] hover:text-[#CF565D] rounded-lg focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[1.75]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[1.75]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer with Full Viewport Height and Independent Scroll */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-[#FAF7F2] border-t border-[#E8D8C8] px-4 sm:px-6 py-5 overflow-y-auto space-y-4 animate-in slide-in-from-top duration-200 z-50 shadow-xl pb-12">
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
                    Rituals
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#CF565D] transition-transform duration-200 ${mobileServicesOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {mobileServicesOpen && (
                <div className="pt-2 pb-1 space-y-3 animate-in slide-in-from-top-1 duration-150 pl-1">
                  {SERVICE_MENU_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="space-y-1.5 p-2.5 rounded-2xl bg-white/60 border border-[#E8D8C8]/50">
                      <Link
                        href={`/services?category=${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-[15px] font-bold text-[#292525] hover:text-[#CF565D] flex items-center justify-between"
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs text-[#CF565D] font-medium flex items-center gap-0.5">
                          <span>View All</span>
                          <span>&rarr;</span>
                        </span>
                      </Link>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {cat.subcategories.map((sub, idx) => (
                          <Link
                            key={idx}
                            href={`/services?category=${cat.slug}&query=${encodeURIComponent(sub.query)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-[12px] text-[#746D69] hover:text-[#CF565D] py-1.5 px-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8]/40 truncate block"
                          >
                            {sub.title}
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
