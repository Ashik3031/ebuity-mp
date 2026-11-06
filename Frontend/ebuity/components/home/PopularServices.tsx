"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceApi, serviceCategoryApi } from "../../lib/api-client";
import { Service, ServiceCategory } from "../../types/service";
import {
  Sparkles,
  Scissors,
  Flower2,
  Eye,
  Flame,
  Heart,
  Palette,
  Clock,
  ArrowRight,
} from "lucide-react";

// Curated icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "hair-styling": Scissors,
  manicure: Sparkles,
  pedicure: Flower2,
  facial: Eye,
  waxing: Flame,
  "women-salon-services": Heart,
  "nail-polish": Palette,
};

// Safe fallback categories matching our real catalog in case of network latency
const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    _id: "c1",
    name: "Hair Styling",
    slug: "hair-styling",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
    displayOrder: 1,
    isActive: true,
  },
  {
    _id: "c2",
    name: "Manicure",
    slug: "manicure",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
    displayOrder: 2,
    isActive: true,
  },
  {
    _id: "c3",
    name: "Pedicure",
    slug: "pedicure",
    image: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80",
    displayOrder: 3,
    isActive: true,
  },
  {
    _id: "c4",
    name: "Facial",
    slug: "facial",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    displayOrder: 4,
    isActive: true,
  },
  {
    _id: "c5",
    name: "Waxing",
    slug: "waxing",
    image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80",
    displayOrder: 5,
    isActive: true,
  },
  {
    _id: "c6",
    name: "Women Salon Services",
    slug: "women-salon-services",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
    displayOrder: 6,
    isActive: true,
  },
  {
    _id: "c7",
    name: "Nail Polish",
    slug: "nail-polish",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    displayOrder: 7,
    isActive: true,
  },
];

export const PopularServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"categories" | "treatments">("categories");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [servRes, catRes] = await Promise.allSettled([
          serviceApi.getAll({ limit: 100 }),
          serviceCategoryApi.getAll(),
        ]);

        if (isMounted) {
          if (servRes.status === "fulfilled" && servRes.value?.services) {
            setServices(servRes.value.services);
          }
          if (catRes.status === "fulfilled" && catRes.value?.categories && catRes.value.categories.length > 0) {
            setCategories(catRes.value.categories);
          }
        }
      } catch (err) {
        console.warn("Could not load popular services data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Compute live database metrics per category (count of services and starting price)
  const getCategoryMetrics = (cat: ServiceCategory) => {
    const catId = String(cat._id || "");
    const catSlug = (cat.slug || "").toLowerCase();
    const catName = (cat.name || "").toLowerCase();

    const matched = services.filter((s) => {
      if (!s) return false;
      if (typeof s.category === "object" && s.category !== null) {
        const sCatId = String(s.category._id || "");
        const sCatSlug = (s.category.slug || "").toLowerCase();
        const sCatName = (s.category.name || "").toLowerCase();
        if (catId && sCatId === catId) return true;
        if (catSlug && sCatSlug === catSlug) return true;
        if (catName && sCatName === catName) return true;
      }
      const sCatSlug = (s.categorySlug || "").toLowerCase();
      const sCatName = (s.categoryName || "").toLowerCase();
      return (catSlug && sCatSlug === catSlug) || (catName && sCatName === catName);
    });

    const count = matched.length;
    const prices = matched
      .map((s) => Number(s.price))
      .filter((p) => !isNaN(p) && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    return { count, minPrice, matched };
  };

  // Top featured treatments dynamically picked from live database
  const topFeaturedServices = useMemo(() => {
    if (services.length === 0) return [];

    const activeList = services.filter((s) => s.isActive !== false && s.active !== false);
    const selected: Service[] = [];
    const seenCategories = new Set<string>();

    // First pick featured services across distinct categories
    activeList.forEach((s) => {
      const catSlug = typeof s.category === "object" ? s.category?.slug : s.categorySlug;
      if (s.isFeatured && catSlug && !seenCategories.has(catSlug) && selected.length < 7) {
        seenCategories.add(catSlug);
        selected.push(s);
      }
    });

    // Then fill in any remaining categories to show full variety
    activeList.forEach((s) => {
      const catSlug = typeof s.category === "object" ? s.category?.slug : s.categorySlug;
      if (catSlug && !seenCategories.has(catSlug) && selected.length < 7) {
        seenCategories.add(catSlug);
        selected.push(s);
      }
    });

    // If still under 7, add other active services
    activeList.forEach((s) => {
      if (selected.length < 7 && !selected.some((item) => item._id === s._id)) {
        selected.push(s);
      }
    });

    return selected;
  }, [services]);

  return (
    <section className="w-full bg-[#FAF7F2] py-8 sm:py-12 border-b border-[#E8D8C8]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Real Data Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-medium text-[#292525] tracking-tight">
              Popular Services
            </h2>
            <p className="text-xs sm:text-sm text-[#746D69] mt-1 font-normal">
              Find your salon ritual by category or top-booked treatments
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Switcher: Categories vs Top Treatments */}
            <div className="inline-flex items-center p-1 bg-white rounded-full border border-[#E8D8C8]/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("categories")}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === "categories"
                  ? "bg-[#CF565D] text-white shadow-2xs font-semibold"
                  : "text-[#746D69] hover:text-[#292525]"
                  }`}
              >
                Categories ({displayCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("treatments")}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === "treatments"
                  ? "bg-[#CF565D] text-white shadow-2xs font-semibold"
                  : "text-[#746D69] hover:text-[#292525]"
                  }`}
              >
                Top Treatments ({topFeaturedServices.length})
              </button>
            </div>

            <Link
              href="/services"
              className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-[#CF565D] hover:text-[#b8454c] transition-colors pl-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. VIEW MODE: CATEGORIES (Real Data from MongoDB) */}
        {viewMode === "categories" && (
          <div className="flex lg:grid lg:grid-cols-7 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 scrollbar-none snap-x snap-mandatory">
            {displayCategories.map((cat) => {
              const { count, minPrice } = getCategoryMetrics(cat);
              const Icon = CATEGORY_ICONS[cat.slug] || Sparkles;

              return (
                <Link
                  key={cat._id || cat.slug}
                  href={`/services?category=${encodeURIComponent(cat.slug)}`}
                  className="group shrink-0 w-[130px] sm:w-[150px] lg:w-auto snap-start bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-[#E8D8C8]/70 shadow-[0_4px_16px_rgba(200,80,95,0.04)] hover:shadow-[0_12px_28px_rgba(200,80,95,0.12)] hover:border-[#CF565D]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer min-h-[160px] sm:min-h-[178px]"
                >
                  {/* Real Photo Thumbnail */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8D8C8]/60 shadow-2xs group-hover:scale-105 transition-transform duration-300 shrink-0">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 70px, 85px"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    )}
                  </div>

                  {/* Real Title & Live Database Metrics */}
                  <div className="w-full mt-2.5 space-y-0.5">
                    <h3 className="font-serif font-medium text-sm sm:text-[14.5px] text-[#292525] group-hover:text-[#CF565D] transition-colors truncate">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#CF565D] truncate">
                      {loading ? (
                        <span className="inline-block w-12 h-2.5 bg-gray-100 rounded animate-pulse" />
                      ) : minPrice ? (
                        `From AED ${minPrice}`
                      ) : (
                        "Available"
                      )}
                    </p>
                    <p className="text-[10px] text-[#746D69]/75 font-normal truncate">
                      {loading ? (
                        <span className="inline-block w-8 h-2 bg-gray-100 rounded animate-pulse" />
                      ) : count > 0 ? (
                        `${count} ritual${count > 1 ? "s" : ""}`
                      ) : (
                        "Explore"
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 2. VIEW MODE: TOP TREATMENTS (Real Services from MongoDB) */}
        {viewMode === "treatments" && (
          <div className="flex lg:grid lg:grid-cols-7 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 scrollbar-none snap-x snap-mandatory">
            {topFeaturedServices.map((srv) => {
              const catTitle =
                typeof srv.category === "object" && srv.category !== null
                  ? srv.category.name
                  : srv.categoryName || "Ritual";
              const photo = srv.images?.[0] || "";

              return (
                <Link
                  key={srv._id || srv.slug}
                  href={`/services/${encodeURIComponent(srv.slug)}`}
                  className="group shrink-0 w-[130px] sm:w-[150px] lg:w-auto snap-start bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-[#E8D8C8]/70 shadow-[0_4px_16px_rgba(200,80,95,0.04)] hover:shadow-[0_12px_28px_rgba(200,80,95,0.12)] hover:border-[#CF565D]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer min-h-[160px] sm:min-h-[178px]"
                >
                  {/* Real Service Photo */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8D8C8]/60 shadow-2xs group-hover:scale-105 transition-transform duration-300 shrink-0">
                    {photo ? (
                      <Image
                        src={photo}
                        alt={srv.name}
                        fill
                        sizes="(max-width: 640px) 70px, 85px"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    )}
                  </div>

                  {/* Real Treatment Details */}
                  <div className="w-full mt-2.5 space-y-0.5">
                    <span className="block text-[9.5px] uppercase tracking-wider font-semibold text-[#746D69]/70 truncate">
                      {catTitle}
                    </span>
                    <h5 className="font-serif text-xs sm:text-[5px] text-[#292525] group-hover:text-[#CF565D] transition-colors truncate">
                      {srv.name}
                    </h5>
                    <div className="flex items-center justify-center gap-1.5 pt-0.5">
                      <span className="text-[11.5px] font-bold text-[#CF565D]">
                        AED {srv.price}
                      </span>
                      {srv.durationMinutes && (
                        <span className="text-[10px] text-[#746D69]/70 flex items-center gap-0.5">
                          • {srv.durationMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
