"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceApi, packageApi } from "../../lib/api-client";
import { Service } from "../../types/service";
import { Package } from "../../types/package";
import {
  Zap,
  Clock,
  ArrowRight,
  UserCheck,
  Calendar,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface OfferCardItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  savings: number;
  badge: string;
  image: string;
  bookLink: string;
  detailLink: string;
  womenOnly?: boolean;
}

export const TodaysExclusiveDeals: React.FC = () => {
  const [items, setItems] = useState<OfferCardItem[]>([]);
  const [isPackageMode, setIsPackageMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Live countdown timer until midnight GST (Asia/Dubai)
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateTimeUntilMidnight() {
      const now = new Date();
      // Calculate target midnight in Dubai (UTC+4)
      const dubaiNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Dubai" })
      );
      const dubaiMidnight = new Date(dubaiNow);
      dubaiMidnight.setHours(24, 0, 0, 0);

      const diffMs = dubaiMidnight.getTime() - dubaiNow.getTime();
      if (diffMs <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    }

    setTimeLeft(calculateTimeUntilMidnight());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch today's exclusive deals; if not present, fetch real packages & offers
  useEffect(() => {
    let isMounted = true;

    async function loadOffers() {
      try {
        setLoading(true);

        // 1. Try dedicated exclusive deals set by admin
        let realDeals: Service[] = [];
        const res = await serviceApi.getExclusiveDeals().catch(() => null);
        if (res && res.services && res.services.length > 0) {
          realDeals = res.services.filter((s) => s.isExclusiveDeal);
        }

        if (realDeals.length === 0) {
          const fallbackRes = await serviceApi
            .getAll({ exclusiveDeals: true, limit: 6 })
            .catch(() => null);
          if (fallbackRes?.services && fallbackRes.services.length > 0) {
            realDeals = fallbackRes.services.filter((s) => s.isExclusiveDeal);
          }
        }

        if (realDeals.length > 0) {
          if (!isMounted) return;
          const mappedDeals: OfferCardItem[] = realDeals.map((deal) => {
            const orig = deal.price || 350;
            const dealP = deal.dealPrice != null ? Number(deal.dealPrice) : orig;
            const sav = Math.max(0, orig - dealP);
            const disc =
              deal.dealDiscountPercentage != null
                ? deal.dealDiscountPercentage
                : orig > 0 && sav > 0
                  ? Math.round((sav / orig) * 100)
                  : 0;

            const cName =
              typeof deal.category === "object" && deal.category !== null
                ? deal.category.name
                : "At-Home Ceremony";

            return {
              id: deal._id,
              name: deal.name,
              slug: deal.slug || deal._id,
              category: cName,
              description:
                deal.dealDescription ||
                deal.shortDescription ||
                "Signature Damask rose formulated at-home therapy.",
              durationMinutes: deal.durationMinutes || deal.duration || 60,
              price: dealP,
              originalPrice: orig,
              discountPercentage: disc,
              savings: sav,
              badge: deal.dealBadge || "Today's Deal",
              image:
                deal.images?.[0] ||
                "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
              bookLink: `/book?service=${encodeURIComponent(deal.slug || deal._id)}`,
              detailLink: `/services/${encodeURIComponent(deal.slug || deal._id)}`,
              womenOnly: deal.womenOnly,
            };
          });

          setItems(mappedDeals);
          setIsPackageMode(false);
          return;
        }

        // 2. Fallback: If daily offer is not added by admin, fetch REAL packages & offers from DB
        const pkgRes = await packageApi.getAll().catch(() => null);
        if (pkgRes && pkgRes.packages && pkgRes.packages.length > 0) {
          if (!isMounted) return;
          const activePackages = pkgRes.packages.filter((p) => p.isActive !== false);

          const mappedPackages: OfferCardItem[] = activePackages.slice(0, 6).map((pkg) => {
            const orig = pkg.originalPrice || pkg.price;
            const sav = Math.max(0, orig - pkg.price);
            const disc =
              pkg.discountPercentage ||
              (orig > 0 && sav > 0 ? Math.round((sav / orig) * 100) : 0);

            return {
              id: pkg._id,
              name: pkg.name,
              slug: pkg.slug || pkg._id,
              category: String(pkg.category || "Ritual Package"),
              description:
                pkg.tagline ||
                pkg.description ||
                (pkg.inclusions && pkg.inclusions.length > 0
                  ? pkg.inclusions.slice(0, 2).join(" · ")
                  : "Handcrafted beauty ritual combination with complimentary sterilised tools."),
              durationMinutes: pkg.durationMinutes || 90,
              price: pkg.price,
              originalPrice: orig,
              discountPercentage: disc,
              savings: sav,
              badge: pkg.badge || "Special Package",
              image:
                pkg.images?.[0] ||
                "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
              bookLink: `/book?package=${encodeURIComponent(pkg.slug || pkg._id)}`,
              detailLink: "/packages",
              womenOnly: true,
            };
          });

          setItems(mappedPackages);
          setIsPackageMode(true);
        } else {
          if (isMounted) setItems([]);
        }
      } catch (err) {
        console.warn("Could not load exclusive deals or packages:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-[#FDF7F3] via-[#FAF4EF] to-[#FBF4EF]">
      {/* Background soft blush shapes */}
      <div className="absolute top-0 right-0 w-[60%] max-w-[900px] h-[75%] pointer-events-none select-none">
        <svg
          viewBox="0 0 900 700"
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="dealsEdgeSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <linearGradient id="dealsBlushGrad" x1="900" y1="0" x2="250" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F9D8DB" />
              <stop offset="55%" stopColor="#FBE3E2" />
              <stop offset="100%" stopColor="#FCEEEA" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M560,0 C480,110 330,170 250,300 C170,430 200,560 300,700 L900,700 L900,0 Z"
            fill="url(#dealsBlushGrad)"
            filter="url(#dealsEdgeSoft)"
          />
        </svg>
      </div>

      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#F7D4D7]/40 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#C8505F]">
              <Sparkles className="w-3.5 h-3.5" />
              {isPackageMode ? "Curated Packages & Bundles" : "Limited daily availability"}
            </span>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
              {isPackageMode ? "Today's Packages & Offers" : "Today Exclusive Deals"}
            </h2>

            <p className="text-sm sm:text-base text-[#746D69] leading-relaxed max-w-xl">
              {isPackageMode
                ? "Experience our signature ritual bundles and complete beauty care at preferred rates."
                : "Don’t miss out! Explore our exclusive deals and limited treatments for today."}
            </p>
          </div>

          {/* Countdown widget */}
          <div className="flex flex-col items-center sm:items-start lg:items-end gap-2.5 bg-white/70 backdrop-blur-md px-4 sm:px-5 py-3.5 sm:py-4 rounded-[24px] sm:rounded-[28px] border border-[#E8D8C8]/70 shadow-[0_12px_40px_rgba(200,80,95,0.08)] w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#746D69]">
              <Clock className="w-4 h-4 text-[#C8505F]" />
              <span>Offers end tonight</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#292525]">
              <div className="flex flex-col items-center">
                <span className="min-w-[2.25rem] sm:min-w-[2.75rem] text-center font-serif text-xl sm:text-3xl bg-[#F5DAD6] text-[#C8505F] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-[#746D69] mt-1">Hours</span>
              </div>
              <span className="font-serif text-lg sm:text-xl text-[#C8505F]/50 mb-3 sm:mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="min-w-[2.25rem] sm:min-w-[2.75rem] text-center font-serif text-xl sm:text-3xl bg-[#F5DAD6] text-[#C8505F] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-[#746D69] mt-1">Mins</span>
              </div>
              <span className="font-serif text-lg sm:text-xl text-[#C8505F]/50 mb-3 sm:mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="min-w-[2.25rem] sm:min-w-[2.75rem] text-center font-serif text-xl sm:text-3xl bg-[#C8505F] text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-md shadow-[#C8505F]/20">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-[#746D69] mt-1">Secs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deals/Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item) => {
            const hasImgError = imgErrors[item.id];
            const primaryImage =
              item.image ||
              "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col bg-white/90 backdrop-blur-sm rounded-[28px] border border-[#E8D8C8]/70 overflow-hidden shadow-[0_12px_40px_rgba(200,80,95,0.06)] hover:shadow-[0_20px_50px_rgba(200,80,95,0.14)] hover:border-[#C8505F]/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Image Section */}
                <Link
                  href={item.bookLink}
                  className="relative block aspect-[16/10] w-full overflow-hidden bg-[#FAF4EF]"
                >
                  <Image
                    src={
                      hasImgError
                        ? "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                        : primaryImage
                    }
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [item.id]: true }))
                    }
                  />

                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#C8505F]/10 to-transparent pointer-events-none" />

                  {/* Badges Overlay (Zero Collision Guaranteed on Mobile) */}
                  <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none z-10">
                    {/* Left pills */}
                    <div className="flex flex-wrap gap-1.5 max-w-[56%]">
                      <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-[#292525] border border-[#E8D8C8] shadow-sm">
                        <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#C8505F]" />
                        <span>{item.durationMinutes}m</span>
                      </div>

                      {item.womenOnly && (
                        <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#F5DAD6] text-[#C8505F] border border-[#C8505F]/20 shadow-sm">
                          <UserCheck className="w-3 h-3" />
                          <span>Ladies</span>
                        </div>
                      )}
                    </div>

                    {/* Right badges */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[42%]">
                      <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#C8505F] text-white shadow-md shadow-[#C8505F]/25 truncate">
                        <Zap className="w-3 h-3 fill-current shrink-0" />
                        <span className="truncate">{item.badge}</span>
                      </div>

                      {item.discountPercentage > 0 && (
                        <div className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white text-[#C8505F] border border-[#F5DAD6] shadow-sm">
                          {item.discountPercentage}% off
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C8505F]">
                      {item.category}
                    </span>

                    <Link href={item.bookLink} className="block group/title focus:outline-none">
                      <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#292525] group-hover/title:text-[#C8505F] transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </Link>

                    {item.description && (
                      <p className="text-xs sm:text-[13px] text-[#746D69] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing box */}
                  <div className="p-3.5 rounded-2xl bg-[#FDF3F1] border border-[#F5DAD6] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-[#746D69] block">
                        Today&apos;s price
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs font-semibold text-[#C8505F]">AED</span>
                        <span className="text-3xl font-serif font-medium text-[#C8505F] leading-none">
                          {item.price}
                        </span>
                        {item.originalPrice > item.price && (
                          <span className="text-xs text-[#746D69]/60 line-through">
                            AED {item.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.savings > 0 && (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-[#C8505F] border border-[#F5DAD6] shrink-0">
                        Save AED {item.savings}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center gap-2.5">
                    <Link
                      href={item.bookLink}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#C8505F] hover:bg-[#B34351] text-white text-sm font-semibold tracking-wide shadow-md shadow-[#C8505F]/20 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isPackageMode ? "Book package" : "Claim deal & book"}</span>
                    </Link>

                    <Link
                      href={item.detailLink}
                      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full bg-[#F5DAD6] text-[#C8505F] hover:bg-[#C8505F] hover:text-white transition-colors"
                      title={isPackageMode ? "View packages" : "View service details"}
                      aria-label={isPackageMode ? "View packages" : "View service details"}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Link
            href={isPackageMode ? "/packages" : "/services"}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-[#E8D8C8] text-[#292525] text-sm font-semibold hover:border-[#C8505F] hover:text-[#C8505F] transition-all shadow-sm hover:shadow-md"
          >
            <span>{isPackageMode ? "Explore all packages & offers" : "Explore all at-home services"}</span>
            <ChevronRight className="w-4 h-4 text-[#C8505F]" />
          </Link>
        </div>
      </div>
    </section>
  );
};
