"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown, Sparkles, BadgeCheck, Home } from "lucide-react";
import { serviceApi, serviceCategoryApi, serviceZoneApi } from "../../lib/api-client";

// Clean initial fallbacks to prevent layout shift before database fetch resolves
const DEFAULT_AREAS = [
  "Downtown Dubai",
  "Dubai Marina",
  "Palm Jumeirah",
  "Business Bay",
  "DIFC",
  "Jumeirah",
  "Dubai Hills Estate",
  "Arabian Ranches",
];

const DEFAULT_POPULAR_SERVICES = [
  "Face",
  "Hair",
  "Nail",
  "Massage",
  "Facial",
  "Manicure",
];

const DEFAULT_SERVICE_SUGGESTIONS = [
  "Face",
  "Hair",
  "Nail",
  "Massage",
  "Facial",
  "HydraFacial Glow",
  "Full Hair Color",
  "Classic Manicure",
  "Hard Gel Overlay",
  "Hot Stones Massage",
  "Cupping Massage",
];

function titleCase(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export const Hero: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");

  // Live database data states
  const [areas, setAreas] = useState<string[]>(DEFAULT_AREAS);
  const [popularServices, setPopularServices] = useState<string[]>(DEFAULT_POPULAR_SERVICES);
  const [serviceSuggestions, setServiceSuggestions] = useState<string[]>(DEFAULT_SERVICE_SUGGESTIONS);

  // Fetch real data from MongoDB via backend API
  useEffect(() => {
    let isMounted = true;

    async function fetchRealData() {
      try {
        const [zonesRes, servicesRes, categoriesRes] = await Promise.allSettled([
          serviceZoneApi.getAll(),
          serviceApi.getAll({ limit: 50 }),
          serviceCategoryApi.getAll(),
        ]);

        if (!isMounted) return;

        // 1. Service Zones & Areas from real DB
        const areaSet = new Set<string>();
        if (zonesRes.status === "fulfilled" && zonesRes.value?.zones) {
          zonesRes.value.zones.forEach((zone) => {
            if (zone.isActive !== false) {
              if (zone.name && zone.name.trim()) {
                areaSet.add(titleCase(zone.name));
              }
              if (Array.isArray(zone.supportedAreas)) {
                zone.supportedAreas.forEach((subArea) => {
                  if (typeof subArea === "string" && subArea.trim()) {
                    areaSet.add(titleCase(subArea));
                  }
                });
              }
            }
          });
        }

        const sortedAreas = Array.from(areaSet).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        );
        if (sortedAreas.length > 0) {
          setAreas(sortedAreas);
        }

        // 2. Services & Categories from real DB
        const suggestionsSet = new Set<string>();
        const dynamicPopular: string[] = [];

        // Real active categories
        if (categoriesRes.status === "fulfilled" && categoriesRes.value?.categories) {
          categoriesRes.value.categories.forEach((cat) => {
            if (cat.isActive !== false && cat.name?.trim()) {
              const name = cat.name.trim();
              suggestionsSet.add(name);
              if (dynamicPopular.length < 4 && !dynamicPopular.includes(name)) {
                dynamicPopular.push(name);
              }
            }
          });
        }

        // Real active services
        if (servicesRes.status === "fulfilled" && servicesRes.value?.services) {
          const activeServices = servicesRes.value.services.filter(
            (s) => s.isActive !== false && s.active !== false
          );

          // Add all active service names to datalist suggestions
          activeServices.forEach((s) => {
            if (s.name?.trim()) {
              suggestionsSet.add(s.name.trim());
            }
          });

          // Add featured/top services to popular quick-picks
          activeServices.forEach((s) => {
            const name = s.name?.trim();
            if (name && s.isFeatured && dynamicPopular.length < 6 && !dynamicPopular.includes(name)) {
              dynamicPopular.push(name);
            }
          });

          // If still under 6 popular items, add other active services
          activeServices.forEach((s) => {
            const name = s.name?.trim();
            if (name && dynamicPopular.length < 6 && !dynamicPopular.includes(name)) {
              dynamicPopular.push(name);
            }
          });
        }

        if (suggestionsSet.size > 0) {
          setServiceSuggestions(Array.from(suggestionsSet));
        }

        if (dynamicPopular.length > 0) {
          setPopularServices(dynamicPopular);
        }
      } catch (err) {
        console.warn("Could not load real hero search data from backend:", err);
      }
    }

    fetchRealData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Form submission handler routing to /services with query & area params
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (area && area !== "All Areas" && area !== "All Dubai Areas") {
      params.set("area", area.trim());
    }
    const qs = params.toString();
    router.push(qs ? `/services?${qs}` : "/services");
  };

  // Chip click: search that service straight away, keeping the selected area
  const handleQuickSearch = (service: string) => {
    const params = new URLSearchParams();
    params.set("query", service);
    if (area && area !== "All Areas" && area !== "All Dubai Areas") {
      params.set("area", area.trim());
    }
    router.push(`/services?${params.toString()}`);
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FDF7F3] via-[#FAF4EF] to-[#FBF4EF] min-h-screen pt-20 flex items-center">
      {/* ------------------------------------------------------------------ */}
      {/* 1. BACKGROUND LAYERS                                                */}
      {/* ------------------------------------------------------------------ */}

      {/* Layer 1 + 2: Backdrop traced from the reference (1672x941 coordinate space, anchored bottom-right like the model) */}
      <div className="absolute inset-0 pointer-events-none select-none -z-0">
        <svg
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMaxYMax slice"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="heroEdgeSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="heroEdgeSofter" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            {/* pale wash: top-right fading toward the lower left */}
            <linearGradient id="heroPaleGrad" x1="1500" y1="0" x2="850" y2="941" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FCEBE8" />
              <stop offset="55%" stopColor="#FBE1DF" />
              <stop offset="100%" stopColor="#F8D3D4" />
            </linearGradient>
            {/* deeper pink pooling around the rose */}
            <linearGradient id="heroRoseGlowGrad" x1="900" y1="330" x2="900" y2="941" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8D6D8" stopOpacity="0" />
              <stop offset="45%" stopColor="#F7CED1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F4C2C7" stopOpacity="0.95" />
            </linearGradient>
            {/* right-hand deeper shape */}
            <linearGradient id="heroRightGrad" x1="1672" y1="145" x2="1380" y2="941" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FAD9DB" />
              <stop offset="100%" stopColor="#F6CACE" />
            </linearGradient>
          </defs>

          {/* A. Large pale organic shape: starts at the top (~78% across), sweeps down-left, bulges behind the rose, returns to the bottom */}
          <path
            d="M1310,0 C1200,90 1060,170 960,300 C880,400 800,500 797,650 C795,760 850,850 910,941 L1672,941 L1672,0 Z"
            fill="url(#heroPaleGrad)"
            filter="url(#heroEdgeSoft)"
          />

          {/* B. Deeper pink glow around the rose (feathered edge) */}
          <path
            d="M1010,340 C910,440 805,530 802,660 C800,765 850,855 912,941 L1300,941 L1300,340 Z"
            fill="url(#heroRoseGlowGrad)"
            filter="url(#heroEdgeSofter)"
          />

          {/* C. Deeper pink shape on the right edge, framing her hair and shoulder */}
          <path
            d="M1672,145 C1585,140 1495,190 1468,285 C1442,385 1405,500 1385,640 C1372,725 1345,820 1300,941 L1672,941 Z"
            fill="url(#heroRightGrad)"
          />
        </svg>
      </div>

      {/* Layer 3: Soft cream wave at the bottom-right, in front of the model (same coordinate space as the backdrop) */}
      <div className="absolute inset-0 pointer-events-none z-20 select-none">
        <svg
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMaxYMax slice"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1090,941 C1240,925 1400,862 1672,828 L1672,941 Z"
            fill="#FDF8F4"
          />
        </svg>
      </div>

      {/* Layer 4: Blurred out-of-focus Rose in the bottom-left corner (depth of field, as in Image 2) */}
      <div className="absolute -bottom-8 -left-8 sm:-bottom-12 sm:-left-12 w-44 h-44 sm:w-64 sm:h-64 pointer-events-none z-30 select-none blur-[5px] sm:blur-[6px] opacity-80 mix-blend-multiply">
        <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
          {/* Outer Petals */}
          <ellipse cx="120" cy="120" rx="95" ry="75" transform="rotate(-28 120 120)" fill="url(#blurryRoseGrad1)" />
          <ellipse cx="120" cy="120" rx="88" ry="68" transform="rotate(32 120 120)" fill="url(#blurryRoseGrad2)" />
          {/* Inner Petals */}
          <ellipse cx="120" cy="120" rx="68" ry="52" transform="rotate(78 120 120)" fill="url(#blurryRoseGrad1)" />
          <ellipse cx="120" cy="120" rx="52" ry="42" transform="rotate(-62 120 120)" fill="url(#blurryRoseGrad3)" />
          {/* Rose Core */}
          <circle cx="120" cy="120" r="28" fill="#C8505F" opacity="0.85" />
          <defs>
            <radialGradient id="blurryRoseGrad1" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#C8505F" />
              <stop offset="70%" stopColor="#E5858F" />
              <stop offset="100%" stopColor="#F9D5D8" />
            </radialGradient>
            <radialGradient id="blurryRoseGrad2" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#B84554" />
              <stop offset="60%" stopColor="#DE7B86" />
              <stop offset="100%" stopColor="#FAD8DB" />
            </radialGradient>
            <radialGradient id="blurryRoseGrad3" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#A83A48" />
              <stop offset="80%" stopColor="#CF565D" />
              <stop offset="100%" stopColor="#FCE8E6" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Floating petals — positioned like Image 1 (percentages of the hero section) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none select-none z-20">
        {/* Petal 1: left of the face, upper */}
        <div className="absolute left-[51.5%] top-[29%] animate-petal-1">
          <svg viewBox="0 0 36 44" fill="none" className="w-9 xl:w-12 h-auto drop-shadow-sm" style={{ transform: "rotate(-28deg)" }}>
            <path d="M15 2C26 6 34 17 33 30C32 40 19 44 11 41C3 38 -1 26 1 16C3 6 9 0 15 2Z" fill="url(#petalGrad1)" />
            <defs>
              <linearGradient id="petalGrad1" x1="5" y1="5" x2="32" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE8F99" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Petal 2: far right, upper */}
        <div className="absolute left-[93%] top-[31%] animate-petal-3 blur-[0.5px]">
          <svg viewBox="0 0 32 38" fill="none" className="w-10 xl:w-14 h-auto" style={{ transform: "rotate(-30deg)" }}>
            <path d="M11 2C20 5 28 13 27 23C26 31 16 35 9 32C2 29 -1 21 1 13C3 4 6 0 11 2Z" fill="url(#petalGrad3)" />
            <defs>
              <linearGradient id="petalGrad3" x1="2" y1="2" x2="26" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.7" stopColor="#EC8A93" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Petal 3: lower left, beside the rose */}
        <div className="absolute left-[49%] top-[72%] animate-petal-2">
          <svg viewBox="0 0 42 46" fill="none" className="w-11 xl:w-16 h-auto drop-shadow-md" style={{ transform: "rotate(18deg)" }}>
            <path d="M19 3C33 7 41 19 39 33C37 44 25 47 13 43C3 39 -2 28 1 16C4 5 10 0 19 3Z" fill="url(#petalGrad2)" />
            <defs>
              <linearGradient id="petalGrad2" x1="0" y1="0" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDF0EF" />
                <stop offset="0.55" stopColor="#EF8E97" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Petal 4: lower right, near the shoulder */}
        <div className="absolute left-[88%] top-[76%] animate-petal-4">
          <svg viewBox="0 0 34 38" fill="none" className="w-11 xl:w-16 h-auto" style={{ transform: "rotate(22deg)" }}>
            <path d="M12 2C22 5 30 14 29 24C28 32 17 36 9 33C2 30 -1 22 1 13C3 4 7 0 12 2Z" fill="url(#petalGrad4)" />
            <defs>
              <linearGradient id="petalGrad4" x1="4" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE959D" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MAIN TWO-COLUMN CONTENT GRID (MATCHING NAVBAR PADDING) */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-20 py-10 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[calc(100vh-5rem)]">

          {/* LEFT COLUMN: ~50% (Eyebrow, Clean H1 on 2 lines, Premium Search Form) */}
          <div className="lg:col-span-6 xl:col-span-6 z-20 flex flex-col justify-center space-y-6 lg:space-y-7 pr-0 lg:pr-4">

            {/* Small Eyebrow Label with delicate accent line */}


            {/* Main H1: "Discover Your" and "Natural Glow" sitting on two clean lines */}
            <h1 className="font-display text-4xl sm:text-3xl lg:text-[3rem] xl:text-[3.5rem] uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
              Discover Your <br />
              <span className="italic font-normal text-[#C8505F]">Natural Glow</span>
            </h1>

            {/* Booking block: heading + search bar + quick picks */}
            <div className="w-full max-w-[620px] pt-1 sm:pt-2 space-y-4">
              <div className="space-y-1.5">
                <h2 className="font-serif text-xl sm:text-2xl lg:text-[1.65rem] text-[#292525] font-medium leading-snug">
                  Book beauty &amp; wellness at home
                </h2>
                <p className="text-sm text-[#746D69] leading-relaxed max-w-[480px]">
                  Choose a service and your area. A verified professional from our team comes to your door.
                </p>
              </div>

              {/* Search bar: two labelled fields + button in one card */}
              <form
                onSubmit={handleSearch}
                className="w-full rounded-3xl p-2 bg-white/90 backdrop-blur-md border border-[#E8D8C8]/70 shadow-[0_16px_44px_rgba(200,80,95,0.10)] flex flex-col xl:flex-row xl:items-stretch gap-1.5"
              >
                {/* Service field */}
                <label className="flex flex-1 items-center gap-3 rounded-2xl px-3.5 py-2.5 cursor-text hover:bg-[#FDF3F1] focus-within:bg-[#FDF3F1] transition-colors">
                  <span className="w-10 h-10 rounded-full bg-[#F5DAD6] text-[#C8505F] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 stroke-[2]" />
                  </span>
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#746D69]">Service</span>
                    <input
                      type="text"
                      list="service-suggestions"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Facial, massage, manicure…"
                      className="w-full bg-transparent text-sm text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none"
                    />
                  </span>
                  <datalist id="service-suggestions">
                    {serviceSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>

                <div className="hidden xl:block w-px bg-[#E8D8C8] my-3" />

                {/* Area field */}
                <label className="relative flex flex-1 items-center gap-3 rounded-2xl px-3.5 py-2.5 cursor-pointer hover:bg-[#FDF3F1] focus-within:bg-[#FDF3F1] transition-colors">
                  <span className="w-10 h-10 rounded-full bg-[#F5DAD6] text-[#C8505F] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 stroke-[2]" />
                  </span>
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#746D69]">Your area</span>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#292525] pr-6 focus:outline-none cursor-pointer appearance-none truncate"
                    >
                      <option value="">Select area</option>
                      <option value="All Areas">All Areas</option>
                      {areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#746D69] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#C8505F] hover:bg-[#B34351] text-white text-sm font-semibold tracking-wide shadow-md shadow-[#C8505F]/25 transition-all duration-200 shrink-0 hover:shadow-lg active:scale-[0.98]"
                >
                  <Search className="w-4 h-4 stroke-[2.2]" />
                  <span>Search</span>
                </button>
              </form>

              {/* Quick picks */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#746D69] mr-1">Popular:</span>
                {popularServices.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => handleQuickSearch(service)}
                    className="px-3.5 py-1.5 rounded-full bg-white/70 border border-[#E8D8C8] text-xs font-medium text-[#292525] hover:border-[#C8505F] hover:text-[#C8505F] hover:bg-white transition-colors"
                  >
                    {service}
                  </button>
                ))}
              </div>

              {/* Trust points */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-[#746D69]">
                <span className="inline-flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#C8505F]" />
                  We come to your home
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#C8505F]" />
                  Verified, trained professionals
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ~50% (Woman holding rose, bleeding off bottom-right edge) */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-end justify-center lg:justify-end h-full min-h-[460px] sm:min-h-[560px] lg:min-h-[calc(100vh-5rem)]">

            {/* ------------------------------------------------------------- */}
            {/* WOMAN HOLDING PINK ROSE: TRANSPARENT CUTOUT, FILLING HEIGHT   */}
            {/* ------------------------------------------------------------- */}
            <div className="relative z-10 w-full flex items-end justify-center lg:justify-end h-full">
              <Image
                src="/dreamy-rose-beauty.png"
                alt="Rose Essence model with pink rose"
                width={800}
                height={1100}
                priority
                className="w-auto h-[460px] sm:h-[560px] lg:h-[96%] xl:h-[100%] max-h-[920px] object-contain object-bottom lg:object-right-bottom select-none pointer-events-none translate-x-0 lg:translate-x-6 xl:translate-x-12"
              />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};