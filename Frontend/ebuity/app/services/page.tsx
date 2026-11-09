"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { ServiceCard } from "../../components/services/ServiceCard";
import {
  serviceApi,
  serviceCategoryApi,
  serviceZoneApi,
} from "../../lib/api-client";
import { Service, ServiceCategory, ServiceZone } from "../../types/service";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Award,
  Flower2,
  Clock,
  MapPin,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Calendar,
  UserCheck,
  Zap,
} from "lucide-react";

function ServicesContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const queryParam = searchParams.get("query") || searchParams.get("search") || "";
  const areaParam = searchParams.get("area") || "";
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>(queryParam);
  const [selectedArea, setSelectedArea] = useState<string>(areaParam);
  const [sortBy, setSortBy] = useState<string>("displayOrder");

  // Keep selectedCategory, searchQuery, and selectedArea in sync if URL query parameter changes
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    const q = searchParams.get("query") || searchParams.get("search");
    if (typeof q === "string") {
      setSearchQuery(q);
    }
    const a = searchParams.get("area");
    if (typeof a === "string") {
      setSelectedArea(a);
    }
  }, [searchParams]);

  // Load Categories & Zones once
  useEffect(() => {
    let isMounted = true;

    async function loadMeta() {
      try {
        const [catRes, zoneRes] = await Promise.allSettled([
          serviceCategoryApi.getAll(),
          serviceZoneApi.getAll(),
        ]);

        if (isMounted) {
          if (catRes.status === "fulfilled" && catRes.value?.categories) {
            const fetchedCats = catRes.value.categories;
            setCategories(fetchedCats);
            if (!categoryParam && fetchedCats.length > 0) {
              setSelectedCategory((prev) => prev || fetchedCats[0].slug);
            }
          }
          if (zoneRes.status === "fulfilled" && zoneRes.value?.zones) {
            setZones(zoneRes.value.zones);
          }
        }
      } catch (err) {
        console.warn("Could not load categories or zones:", err);
      }
    }

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [categoryParam]);

  // Fetch Services from API whenever category or search changes
  useEffect(() => {
    let isMounted = true;

    async function loadServices() {
      try {
        setLoading(true);
        const isDeals = selectedCategory === "deals" || selectedCategory === "Deals";
        const res = await serviceApi.getAll({
          category: isDeals ? undefined : (selectedCategory || undefined),
          exclusiveDeals: isDeals ? true : undefined,
          search: searchQuery.trim() || undefined,
          sortBy,
          limit: 50,
        });

        if (isMounted && res?.services) {
          setServices(res.services);
        }
      } catch (err) {
        console.warn("Failed to load services:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadServices();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] w-full max-w-full overflow-x-hidden">
      <Header />

      <main className="flex-1 pb-24 w-full max-w-full min-w-0">


        {/* Filter & Search Bar */}
        <div
          id="catalogue"
          className="sticky top-16 sm:top-20 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8D8C8]/70 py-3 sm:py-4 shadow-2xs w-full max-w-full"
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
              {/* Category Pills (Face, Hair, Nail, Massage) */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] w-full min-w-0 pb-1 lg:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("deals")}
                  className={`whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none flex items-center gap-1.5 shrink-0 ${selectedCategory === "deals"
                    ? "bg-gradient-to-r from-amber-500 to-[#CF565D] text-white shadow-xs"
                    : "bg-white text-amber-900 border border-amber-300 hover:border-amber-400"
                    }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>Today's Deals</span>
                </button>

                {categories.map((cat) => {
                  const isActive =
                    selectedCategory.toLowerCase() === cat.slug.toLowerCase() ||
                    selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none shrink-0 ${isActive
                        ? "bg-[#CF565D] text-white shadow-xs"
                        : "bg-white text-[#292525] border border-[#E8D8C8] hover:border-[#CF565D]/40"
                        }`}
                    >
                      <span>{cat.name}</span>
                      {cat.serviceCount !== undefined && cat.serviceCount > 0 && (
                        <span className="ml-1.5 opacity-75">
                          ({cat.serviceCount})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search & Sort Controls (Clean stacking on mobile, aligned on desktop) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0 shrink-0">
                <div className="relative flex-1 sm:w-64 lg:w-72">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lashes, manicure, massage..."
                    className="w-full pl-9 pr-8 py-2.5 sm:py-2 text-sm sm:text-xs bg-white rounded-full border border-[#E8D8C8] text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D]"
                  />
                  <Search className="absolute left-3 top-3 sm:top-2.5 w-4 h-4 text-[#746D69]/60 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 sm:top-2.5 text-xs sm:text-[10px] text-[#746D69] hover:text-[#292525]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white px-3.5 py-2 sm:py-2 rounded-full border border-[#E8D8C8] shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#746D69]">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Sort:</span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs font-semibold text-[#292525] bg-transparent focus:outline-none cursor-pointer pr-1"
                    aria-label="Sort services"
                  >
                    <option value="displayOrder">Curated</option>
                    <option value="price">Price: Low to High</option>
                    <option value="duration">Duration: Short to Long</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid Section */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 min-w-0">
          {selectedCategory === "deals" && (
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#FAF7F2] to-rose-500/15 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-[#CF565D] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#292525]">
                    Today's Exclusive Limited Deals
                  </h3>
                  <p className="text-xs text-[#746D69] mt-0.5">
                    Special promotional daily rates for at-home services. Valid for appointments scheduled today across Dubai.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-100/80 px-3.5 py-1.5 rounded-full border border-amber-300 w-fit">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Expires at Midnight</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between pb-6 text-xs text-[#746D69] gap-3">
            <span>
              Showing{" "}
              <strong className="text-[#292525] font-semibold">
                {services.length}
              </strong>{" "}
              {services.length === 1 ? "service" : "services"}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {selectedArea && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#CF565D] font-medium text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#CF565D]" />
                  <span>Area: {selectedArea}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedArea("")}
                    className="ml-1 hover:text-[#292525] font-bold text-sm leading-none"
                    title="Clear area filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="px-3 py-1 rounded-full bg-white border border-[#E8D8C8]">
                  Filtered by &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
          </div>

          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl border border-[#E8D8C8]/60 p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-[4/3] w-full rounded-2xl bg-[#FAF7F2]" />
                  <div className="space-y-2">
                    <div className="h-4 bg-[#FAF7F2] rounded w-1/3" />
                    <div className="h-6 bg-[#FAF7F2] rounded w-3/4" />
                    <div className="h-3 bg-[#FAF7F2] rounded w-full" />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-6 bg-[#FAF7F2] rounded w-1/4" />
                    <div className="h-8 bg-[#FAF7F2] rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : services.length > 0 ? (
            /* Services Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {services.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="py-20 text-center max-w-md mx-auto space-y-4 bg-white rounded-3xl border border-[#E8D8C8] p-8 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                <Flower2 className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#292525]">
                No Services Found
              </h3>
              <p className="text-xs text-[#746D69] leading-relaxed">
                We couldn&apos;t find any beauty or spa services matching your
                current filter. Try resetting your search to explore all at-home
                experiences.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(categories[0]?.slug || "deals");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="mt-24 pt-20 pb-20 bg-white border-y border-[#E8D8C8]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                The At-Home Experience
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#292525]">
                How Your In-Home Service Works
              </h2>
              <p className="text-sm text-[#746D69]">
                Professional beauty and wellness treatments brought directly to
                your residence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
              {/* Step 1 */}
              <div className="relative p-6 rounded-3xl bg-[#FAF7F2] border border-[#E8D8C8]/70 space-y-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#CF565D] text-white font-serif text-lg font-semibold shadow-xs">
                  1
                </span>
                <h3 className="font-serif text-xl font-medium text-[#292525]">
                  Select Service & Desired Time
                </h3>
                <p className="text-xs text-[#746D69] leading-relaxed">
                  Choose from Face, Hair, Nail, or Massage services. Pick your
                  preferred appointment date and specify your location.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-3xl bg-[#FAF7F2] border border-[#E8D8C8]/70 space-y-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#CF565D] text-white font-serif text-lg font-semibold shadow-xs">
                  2
                </span>
                <h3 className="font-serif text-xl font-medium text-[#292525]">
                  Licensed Aesthetician Arrives
                </h3>
                <p className="text-xs text-[#746D69] leading-relaxed">
                  Your certified female professional arrives punctually with
                  autoclaved tools, fresh linens, and high-end salon products.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-3xl bg-[#FAF7F2] border border-[#E8D8C8]/70 space-y-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#CF565D] text-white font-serif text-lg font-semibold shadow-xs">
                  3
                </span>
                <h3 className="font-serif text-xl font-medium text-[#292525]">
                  Relax & Enjoy Flawless Results
                </h3>
                <p className="text-xs text-[#746D69] leading-relaxed">
                  Enjoy expert grooming and relaxation without the stress of
                  travel, salon waiting rooms, or city traffic.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Service Zones Section */}
        {zones.length > 0 && (
          <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#E8D8C8] shadow-2xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#E8D8C8]/60">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Coverage Area</span>
                  </span>
                  <h3 className="font-serif text-2xl font-medium text-[#292525]">
                    Supported Service Zones
                  </h3>
                </div>
                <p className="text-xs text-[#746D69] max-w-md">
                  We currently dispatch certified aestheticians across major
                  neighborhoods. You can verify your location during the booking
                  process.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {zones.map((zone) => (
                  <div
                    key={zone._id}
                    className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/60 space-y-2"
                  >
                    <h4 className="font-serif text-base font-semibold text-[#292525]">
                      {zone.name}
                    </h4>
                    <p className="text-xs text-[#746D69] leading-relaxed">
                      {zone.description}
                    </p>
                    {zone.supportedAreas?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {zone.supportedAreas.map((area, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E8D8C8] text-[#292525]"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <div className="w-8 h-8 border-2 border-[#CF565D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
