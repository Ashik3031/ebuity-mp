"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceApi, serviceCategoryApi } from "../../lib/api-client";
import { Service, ServiceCategory } from "../../types/service";
import { Clock, ArrowRight } from "lucide-react";

const MAX_ITEMS = 7;

// Fallback categories (used until the API responds / if it fails).
// Images are requested at 600px wide so they stay crisp on retina screens.
const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { _id: "c1", name: "Hair Styling", slug: "hair-styling", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=85", displayOrder: 1, isActive: true },
  { _id: "c2", name: "Manicure", slug: "manicure", image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=85", displayOrder: 2, isActive: true },
  { _id: "c3", name: "Pedicure", slug: "pedicure", image: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=85", displayOrder: 3, isActive: true },
  { _id: "c4", name: "Facial", slug: "facial", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=85", displayOrder: 4, isActive: true },
  { _id: "c5", name: "Waxing", slug: "waxing", image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=600&q=85", displayOrder: 5, isActive: true },
  { _id: "c6", name: "Women Salon Services", slug: "women-salon-services", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=85", displayOrder: 6, isActive: true },
  { _id: "c7", name: "Nail Polish", slug: "nail-polish", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=85", displayOrder: 7, isActive: true },
];

/**
 * Normalizes relative or absolute image URLs safely for Next.js <Image>
 */
function normalizeImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

/* ------------------------------------------------------------------ */
/* Shared image-led card                                               */
/* ------------------------------------------------------------------ */
interface CardProps {
  href: string;
  image?: string | null;
  alt: string;
  eyebrow?: string;
  title: string;
  priceLabel?: React.ReactNode;
  badge?: React.ReactNode;
  priority?: boolean;
}

const ServiceCard: React.FC<CardProps> = ({
  href,
  image,
  alt,
  eyebrow,
  title,
  priceLabel,
  badge,
  priority,
}) => {
  const [imgError, setImgError] = useState(false);
  const normalizedImage = normalizeImageUrl(image);

  return (
    <Link
      href={href}
      className="group relative shrink-0 snap-start w-[150px] sm:w-[170px] lg:w-auto aspect-[3/4] overflow-hidden rounded-2xl bg-[#EFE6DC] shadow-[0_4px_16px_rgba(120,70,60,0.08)] ring-1 ring-[#E8D8C8]/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(200,80,95,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CF565D]"
    >
      {/* Full-bleed photo or brand fallback */}
      {normalizedImage && !imgError ? (
        <Image
          src={normalizedImage}
          alt={alt}
          fill
          quality={90}
          priority={priority}
          sizes="(min-width: 1280px) 190px, (min-width: 1024px) 14vw, (min-width: 640px) 170px, 150px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F6E3E1] to-[#EFD3CF]">
          <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-sm border border-white/40">
            <Image
              src="/rose-essence-logo-square.jpg"
              alt={alt}
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

      {/* Top badge */}
      {badge && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#292525] backdrop-blur-sm">
          {badge}
        </span>
      )}

      {/* Text block (plain <p>/<span> so global heading styles can't blow up the size) */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        {eyebrow && (
          <span className="mb-0.5 block truncate text-[9.5px] font-semibold uppercase tracking-wider text-white/70">
            {eyebrow}
          </span>
        )}
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-white sm:text-[15px]">
          {title}
        </p>
        {priceLabel && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#CF565D] px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {priceLabel}
            </span>
            <ArrowRight className="ml-auto h-4 w-4 -translate-x-1 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </div>
        )}
      </div>
    </Link>
  );
};

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
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

        if (!isMounted) return;
        if (servRes.status === "fulfilled" && servRes.value?.services) {
          setServices(servRes.value.services);
        }
        if (
          catRes.status === "fulfilled" &&
          catRes.value?.categories &&
          catRes.value.categories.length > 0
        ) {
          setCategories(catRes.value.categories);
        }
      } catch (err) {
        console.warn("Could not load popular services data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayCategories = (categories.length > 0 ? categories : DEFAULT_CATEGORIES).slice(0, MAX_ITEMS);

  // Service count + starting price per category
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
      if (typeof s.category === "string" && s.category) {
        const sCatId = s.category.toLowerCase();
        if (catId && sCatId === catId.toLowerCase()) return true;
        if (catSlug && sCatId === catSlug) return true;
      }
      const sCatSlug = (s.categorySlug || "").toLowerCase();
      const sCatName = (s.categoryName || "").toLowerCase();
      return (catSlug && sCatSlug === catSlug) || (catName && sCatName === catName);
    });

    const prices = matched
      .map((s) => {
        if (s.isExclusiveDeal && s.dealPrice && Number(s.dealPrice) > 0) {
          return Number(s.dealPrice);
        }
        return Number(s.price);
      })
      .filter((p) => !isNaN(p) && p > 0);

    return {
      count: matched.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
    };
  };

  // Top treatments: featured first (one per category), then fill variety, then the rest
  const topFeaturedServices = useMemo(() => {
    if (services.length === 0) return [];

    const activeList = services.filter((s) => s.isActive !== false && s.active !== false);
    const selected: Service[] = [];
    const seenCategories = new Set<string>();

    const getCatKey = (s: Service) => {
      if (typeof s.category === "object" && s.category !== null) {
        return s.category.slug || s.category._id || s.category.name;
      }
      if (typeof s.category === "string" && s.category) {
        const matchedCat = categories.find((c) => c._id === s.category || c.slug === s.category);
        if (matchedCat) return matchedCat.slug || matchedCat._id;
        return s.category;
      }
      return s.categorySlug || s.categoryName || "general";
    };

    activeList.forEach((s) => {
      const key = getCatKey(s);
      if (s.isFeatured && key && !seenCategories.has(key) && selected.length < MAX_ITEMS) {
        seenCategories.add(key);
        selected.push(s);
      }
    });

    activeList.forEach((s) => {
      const key = getCatKey(s);
      if (key && !seenCategories.has(key) && selected.length < MAX_ITEMS) {
        seenCategories.add(key);
        selected.push(s);
      }
    });

    activeList.forEach((s) => {
      if (selected.length < MAX_ITEMS && !selected.some((item) => item._id === s._id)) {
        selected.push(s);
      }
    });

    return selected;
  }, [services, categories]);

  const tabClass = (active: boolean) =>
    `px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all ${active
      ? "bg-[#CF565D] text-white font-semibold shadow-sm"
      : "text-[#746D69] hover:text-[#292525]"
    }`;

  const rowClass =
    "flex lg:grid lg:grid-cols-7 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory";

  return (
    <section className="w-full bg-[#FAF7F2] py-8 sm:py-12 border-b border-[#E8D8C8]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#292525] tracking-tight">
              Popular Services
            </h2>
            <p className="text-xs sm:text-sm text-[#746D69] mt-1">
              Find your salon service by category or top-booked treatments
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center p-1 bg-white rounded-full border border-[#E8D8C8]/80 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("categories")}
                className={tabClass(viewMode === "categories")}
              >
                Categories ({displayCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("treatments")}
                className={tabClass(viewMode === "treatments")}
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

        {/* Categories */}
        {viewMode === "categories" && (
          <div className={rowClass}>
            {displayCategories.map((cat, i) => {
              const { count, minPrice } = getCategoryMetrics(cat);
              const targetSlug = cat.slug || cat._id;
              return (
                <ServiceCard
                  key={cat._id || cat.slug || `cat-${i}`}
                  href={`/services?category=${encodeURIComponent(targetSlug)}`}
                  image={cat.image}
                  alt={cat.name}
                  title={cat.name}
                  priority={i < 4}
                  badge={
                    loading ? (
                      <span className="inline-block h-2 w-10 animate-pulse rounded bg-gray-200" />
                    ) : count > 0 ? (
                      `${count} service${count > 1 ? "s" : ""}`
                    ) : (
                      "Explore"
                    )
                  }
                  priceLabel={
                    loading ? (
                      <span className="inline-block h-2.5 w-14 animate-pulse rounded bg-white/40" />
                    ) : minPrice ? (
                      `From AED ${minPrice}`
                    ) : (
                      "Available"
                    )
                  }
                />
              );
            })}
          </div>
        )}

        {/* Top treatments */}
        {viewMode === "treatments" && (
          <div className={rowClass}>
            {topFeaturedServices.map((srv, i) => {
              let catTitle = "Service";
              if (typeof srv.category === "object" && srv.category !== null && srv.category.name) {
                catTitle = srv.category.name;
              } else if (srv.categoryName) {
                catTitle = srv.categoryName;
              } else if (typeof srv.category === "string" && srv.category) {
                const found = categories.find((c) => c._id === srv.category || c.slug === srv.category);
                if (found?.name) catTitle = found.name;
              }

              const targetSlug = srv.slug || srv._id;
              const displayPrice =
                srv.isExclusiveDeal && srv.dealPrice && Number(srv.dealPrice) > 0
                  ? Number(srv.dealPrice)
                  : srv.price;

              return (
                <ServiceCard
                  key={srv._id || srv.slug || `srv-${i}`}
                  href={`/services/${encodeURIComponent(targetSlug)}`}
                  image={Array.isArray(srv.images) ? srv.images[0] : null}
                  alt={srv.name}
                  eyebrow={catTitle}
                  title={srv.name}
                  badge={
                    srv.durationMinutes || srv.duration ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {srv.durationMinutes || srv.duration}m
                      </span>
                    ) : undefined
                  }
                  priceLabel={displayPrice !== undefined ? `AED ${displayPrice}` : "Book Now"}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
