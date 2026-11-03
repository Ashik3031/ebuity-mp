"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceApi } from "../../lib/api-client";
import { Service } from "../../types/service";
import {
  Zap,
  Clock,
  ArrowRight,
  UserCheck,
  Calendar,
  ChevronRight,
} from "lucide-react";

export const TodaysExclusiveDeals: React.FC = () => {
  const [deals, setDeals] = useState<Service[]>([]);
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

  // Fetch today's exclusive deals
  useEffect(() => {
    let isMounted = true;

    async function loadExclusiveDeals() {
      try {
        setLoading(true);
        // Try dedicated deals endpoint first, or fallback to filter
        const res = await serviceApi.getExclusiveDeals().catch(() => null);
        if (isMounted && res && res.services && res.services.length > 0) {
          setDeals(res.services);
        } else {
          // If no deals found, query with exclusiveDeals flag
          const fallbackRes = await serviceApi
            .getAll({ exclusiveDeals: true, limit: 6 })
            .catch(() => null);
          if (isMounted && fallbackRes?.services && fallbackRes.services.length > 0) {
            setDeals(fallbackRes.services);
          } else {
            // Optional fallback: if admin hasn't flagged any deal yet, fetch top 3 featured services to show as deals preview
            const generalRes = await serviceApi.getAll({ limit: 3 }).catch(() => null);
            if (isMounted && generalRes?.services && generalRes.services.length > 0) {
              // Mark them as deals for preview
              const sampleDeals = generalRes.services.slice(0, 3).map((srv, idx) => ({
                ...srv,
                isExclusiveDeal: true,
                dealPrice: Math.round(srv.price * (idx === 0 ? 0.7 : idx === 1 ? 0.75 : 0.8)),
                dealDiscountPercentage: idx === 0 ? 30 : idx === 1 ? 25 : 20,
                dealBadge: "Today's Exclusive",
              }));
              setDeals(sampleDeals);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load exclusive deals:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadExclusiveDeals();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && deals.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-[#FDF7F3] via-[#FAF4EF] to-[#FBF4EF]">
      {/* ------------------------------------------------------------------ */}
      {/* BACKGROUND: soft organic blush shapes + floating petals (same family as the hero) */}
      {/* ------------------------------------------------------------------ */}

      {/* Large pale blush shape bleeding off the top-right */}
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

      {/* Soft blush glow bottom-left */}
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#F7D4D7]/40 blur-3xl pointer-events-none" />

      {/* Petals (desktop only, kept to the edges so they never touch the cards' text) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none select-none">
        <div className="absolute right-[7%] top-[9%] animate-petal-1">
          <svg viewBox="0 0 36 44" fill="none" className="w-9 xl:w-11 h-auto drop-shadow-sm" style={{ transform: "rotate(-24deg)" }}>
            <path d="M15 2C26 6 34 17 33 30C32 40 19 44 11 41C3 38 -1 26 1 16C3 6 9 0 15 2Z" fill="url(#dealsPetalA)" />
            <defs>
              <linearGradient id="dealsPetalA" x1="5" y1="5" x2="32" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE8F99" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute left-[3%] bottom-[8%] animate-petal-3 blur-[0.5px]">
          <svg viewBox="0 0 34 38" fill="none" className="w-9 xl:w-12 h-auto" style={{ transform: "rotate(20deg)" }}>
            <path d="M12 2C22 5 30 14 29 24C28 32 17 36 9 33C2 30 -1 22 1 13C3 4 7 0 12 2Z" fill="url(#dealsPetalB)" />
            <defs>
              <linearGradient id="dealsPetalB" x1="4" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE959D" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="space-y-5 max-w-2xl">
            {/* Eyebrow with delicate accent line (same as hero) */}
            {/* <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-[#746D69]">
                <Zap className="w-3.5 h-3.5 fill-[#C8505F] text-[#C8505F]" />
                Limited daily at-home availability
              </span>
              <span className="hidden sm:inline-block w-12 h-[1px] bg-[#E8D8C8]"></span>
            </div> */}

            <h2 className="font-display text-4xl sm:text-4xl lg:text-[3rem] uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
              Today Exclusive Deals
            </h2>

            <p className="text-sm sm:text-base text-[#746D69] leading-relaxed max-w-xl">
              Don’t miss out! Explore our exclusive deals for today.
            </p>
          </div>

          {/* Countdown widget */}
          <div className="flex flex-col items-start lg:items-end gap-3 bg-white/70 backdrop-blur-md px-5 py-4 rounded-[28px] border border-[#E8D8C8]/70 shadow-[0_12px_40px_rgba(200,80,95,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#746D69]">
              <Clock className="w-4 h-4 text-[#C8505F]" />
              <span>Deals end tonight</span>
            </div>
            <div className="flex items-center gap-2 text-[#292525]">
              <div className="flex flex-col items-center">
                <span className="min-w-[2.75rem] text-center font-serif text-2xl sm:text-3xl bg-[#F5DAD6] text-[#C8505F] px-2.5 py-1.5 rounded-2xl">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-medium text-[#746D69] mt-1">Hours</span>
              </div>
              <span className="font-serif text-xl text-[#C8505F]/50 mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="min-w-[2.75rem] text-center font-serif text-2xl sm:text-3xl bg-[#F5DAD6] text-[#C8505F] px-2.5 py-1.5 rounded-2xl">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-medium text-[#746D69] mt-1">Mins</span>
              </div>
              <span className="font-serif text-xl text-[#C8505F]/50 mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="min-w-[2.75rem] text-center font-serif text-2xl sm:text-3xl bg-[#C8505F] text-white px-2.5 py-1.5 rounded-2xl shadow-md shadow-[#C8505F]/20">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-medium text-[#746D69] mt-1">Secs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {deals.map((deal) => {
            const hasImgError = imgErrors[deal._id];
            const primaryImage =
              deal.images?.[0] ||
              "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80";

            const catName =
              typeof deal.category === "object" && deal.category !== null
                ? deal.category.name
                : "At-Home Ceremony";

            const originalPrice = deal.price || 350;
            const dealPrice = deal.dealPrice != null ? deal.dealPrice : Math.round(originalPrice * 0.75);
            const savings = Math.max(0, originalPrice - dealPrice);
            const discountPct =
              deal.dealDiscountPercentage != null
                ? deal.dealDiscountPercentage
                : Math.round((savings / originalPrice) * 100);

            const serviceLink = `/services/${encodeURIComponent(deal.slug || deal._id)}`;
            const bookLink = `/book?service=${encodeURIComponent(deal.slug || deal._id)}`;

            return (
              <div
                key={deal._id}
                className="group relative flex flex-col bg-white/90 backdrop-blur-sm rounded-[28px] border border-[#E8D8C8]/70 overflow-hidden shadow-[0_12px_40px_rgba(200,80,95,0.06)] hover:shadow-[0_20px_50px_rgba(200,80,95,0.14)] hover:border-[#C8505F]/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Image Section */}
                <Link
                  href={serviceLink}
                  className="relative block aspect-[16/10] w-full overflow-hidden bg-[#FAF4EF]"
                >
                  <Image
                    src={
                      hasImgError
                        ? "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                        : primaryImage
                    }
                    alt={deal.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [deal._id]: true }))
                    }
                  />

                  {/* Soft rose fade at the bottom of the photo */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#C8505F]/10 to-transparent pointer-events-none" />

                  {/* Left pills */}
                  <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5 z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-[#292525] border border-[#E8D8C8] shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-[#C8505F]" />
                      <span>{deal.durationMinutes || deal.duration || 60} mins</span>
                    </div>

                    {deal.womenOnly && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5DAD6] text-[#C8505F] border border-[#C8505F]/20 shadow-sm">
                        <UserCheck className="w-3 h-3" />
                        <span>Ladies only</span>
                      </div>
                    )}
                  </div>

                  {/* Right badges */}
                  <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1.5 z-10">
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#C8505F] text-white shadow-md shadow-[#C8505F]/25">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>{deal.dealBadge || "Today's Deal"}</span>
                    </div>

                    {discountPct > 0 && (
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#C8505F] border border-[#F5DAD6] shadow-sm">
                        {discountPct}% off
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C8505F]">
                      {catName}
                    </span>

                    <Link href={serviceLink} className="block group/title focus:outline-none">
                      <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#292525] group-hover/title:text-[#C8505F] transition-colors line-clamp-1">
                        {deal.name}
                      </h3>
                    </Link>

                    {deal.dealDescription ? (
                      <p className="text-xs sm:text-[13px] text-[#746D69] line-clamp-2 leading-relaxed">
                        {deal.dealDescription}
                      </p>
                    ) : deal.shortDescription ? (
                      <p className="text-xs sm:text-[13px] text-[#746D69] line-clamp-2 leading-relaxed">
                        {deal.shortDescription}
                      </p>
                    ) : null}
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
                          {dealPrice}
                        </span>
                        <span className="text-xs text-[#746D69]/60 line-through">
                          AED {originalPrice}
                        </span>
                      </div>
                    </div>

                    {savings > 0 && (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-[#C8505F] border border-[#F5DAD6] shrink-0">
                        Save AED {savings}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center gap-2.5">
                    <Link
                      href={bookLink}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#C8505F] hover:bg-[#B34351] text-white text-sm font-semibold tracking-wide shadow-md shadow-[#C8505F]/20 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Claim deal &amp; book</span>
                    </Link>

                    <Link
                      href={serviceLink}
                      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full bg-[#F5DAD6] text-[#C8505F] hover:bg-[#C8505F] hover:text-white transition-colors"
                      title="View service details"
                      aria-label="View service details"
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
            href="/services"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-[#E8D8C8] text-[#292525] text-sm font-semibold hover:border-[#C8505F] hover:text-[#C8505F] transition-all shadow-sm hover:shadow-md"
          >
            <span>Explore all at-home services</span>
            <ChevronRight className="w-4 h-4 text-[#C8505F]" />
          </Link>
        </div>
      </div>
    </section>
  );
};