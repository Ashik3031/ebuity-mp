"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceCategoryApi, serviceApi } from "../../lib/api-client";
import { ServiceCategory, Service } from "../../types/service";
import {
  Clock,
  ArrowRight,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const ServiceCategories: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [catRes, srvRes] = await Promise.allSettled([
          serviceCategoryApi.getAll(),
          serviceApi.getAll({ limit: 6 }),
        ]);

        if (isMounted) {
          if (catRes.status === "fulfilled" && catRes.value?.categories) {
            setCategories(catRes.value.categories);
          }
          if (srvRes.status === "fulfilled" && srvRes.value?.services) {
            setServices(srvRes.value.services);
          }
        }
      } catch (err) {
        console.error("Failed to load service categories or services:", err);
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

  const filteredServices =
    activeCategorySlug === "all"
      ? services
      : services.filter((s) => {
        const catSlug =
          typeof s.category === "object" ? s.category?.slug : s.categorySlug;
        const catName =
          typeof s.category === "object"
            ? s.category?.name
            : s.categoryName || s.category;
        return (
          catSlug?.toLowerCase() === activeCategorySlug.toLowerCase() ||
          catName?.toLowerCase() === activeCategorySlug.toLowerCase()
        );
      });

  // ---- Category carousel: arrows + auto-rotate (pauses on hover / touch, respects reduced motion) ----
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el || el.children.length === 0) return;
    const first = el.children[0] as HTMLElement;
    const second = el.children[1] as HTMLElement | undefined;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    const max = el.scrollWidth - el.clientWidth;

    if (dir === 1 && el.scrollLeft >= max - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir === -1 && el.scrollLeft <= 4) {
      el.scrollTo({ left: max, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!pausedRef.current) scrollByCard(1);
    }, 3500);
    return () => clearInterval(id);
  }, [scrollByCard]);

  return (
    <section
      id="services"
      className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-[#FBF4EF] via-[#FAF4EF] to-[#FDF7F3]"
    >
      {/* Background: soft blush glows + petal, same family as the hero and deals sections */}
      <div className="absolute top-0 left-0 w-[45%] max-w-[700px] h-[55%] pointer-events-none select-none">
        <svg
          viewBox="0 0 700 520"
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="catsEdgeSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <linearGradient id="catsBlushGrad" x1="0" y1="0" x2="650" y2="520" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F9D8DB" />
              <stop offset="55%" stopColor="#FBE3E2" />
              <stop offset="100%" stopColor="#FCEEEA" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L140,0 C230,90 400,130 470,250 C540,370 470,460 360,520 L0,520 Z"
            fill="url(#catsBlushGrad)"
            filter="url(#catsEdgeSoft)"
          />
        </svg>
      </div>
      <div className="absolute -bottom-28 -right-24 w-96 h-96 rounded-full bg-[#F7D4D7]/40 blur-3xl pointer-events-none" />

      <div className="hidden lg:block absolute inset-0 pointer-events-none select-none">
        <div className="absolute right-[5%] top-[7%] animate-petal-2">
          <svg viewBox="0 0 34 38" fill="none" className="w-9 xl:w-11 h-auto drop-shadow-sm" style={{ transform: "rotate(24deg)" }}>
            <path d="M12 2C22 5 30 14 29 24C28 32 17 36 9 33C2 30 -1 22 1 13C3 4 7 0 12 2Z" fill="url(#catsPetalA)" />
            <defs>
              <linearGradient id="catsPetalA" x1="4" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE959D" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div className="space-y-3">
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-normal text-[#292525] tracking-tight leading-[1.08]">
              Bespoke{" "}
              <span className="italic font-normal text-[#C8505F]">In-Home Treatments</span>
            </h2>
          </div>
        </div>

        {/* Category carousel: tall photo cards, big uppercase serif titles, auto-rotating */}
        <div className="mb-16">
          <div
            ref={scrollerRef}
            onMouseEnter={() => (pausedRef.current = true)}
            onMouseLeave={() => (pausedRef.current = false)}
            onTouchStart={() => (pausedRef.current = true)}
            onTouchEnd={() => (pausedRef.current = false)}
            onFocus={() => (pausedRef.current = true)}
            onBlur={() => (pausedRef.current = false)}
            className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              // let the row bleed off the right edge of the screen like the reference
              marginRight: "calc(-1 * max(2rem, (100vw - 80rem) / 2 + 2rem))",
              paddingRight: "2rem",
            }}
          >
            {(categories.length > 0
              ? categories
              : [
                {
                  _id: "c1",
                  name: "Hair Styling",
                  slug: "hair-styling",
                  description: "Professional blowouts, waves, curls, and straightening",
                  displayOrder: 1,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c2",
                  name: "Manicure",
                  slug: "manicure",
                  description: "Luxury manicures, gel polish, cut & file, and hand care",
                  displayOrder: 2,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c3",
                  name: "Pedicure",
                  slug: "pedicure",
                  description: "Revitalizing foot spa, gel pedicure, and callus care",
                  displayOrder: 3,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c4",
                  name: "Facial",
                  slug: "facial",
                  description: "Rejuvenating botanicals, deep cleansing, and hydra glow",
                  displayOrder: 4,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c5",
                  name: "Waxing",
                  slug: "waxing",
                  description: "Full body, Brazilian, and precision threading",
                  displayOrder: 5,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c6",
                  name: "Women Salon Services",
                  slug: "women-salon-services",
                  description: "Relaxing Indian head and shoulder tension relief",
                  displayOrder: 6,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
                },
                {
                  _id: "c7",
                  name: "Nail Polish",
                  slug: "nail-polish",
                  description: "Express color changes, gel polish, and French tips",
                  displayOrder: 7,
                  isActive: true,
                  image:
                    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
                },
              ]
            ).map((cat) => (
              <Link
                key={cat.slug}
                href={`/services?category=${cat.slug}`}
                aria-label={`${cat.name}: ${cat.description || ""}`}
                className="group relative shrink-0 snap-start w-[72vw] sm:w-[300px] lg:w-[340px] aspect-[7/10] rounded-[28px] overflow-hidden bg-gradient-to-br from-[#FBE3E2] to-[#F5DAD6] shadow-[0_12px_40px_rgba(200,80,95,0.10)] hover:shadow-[0_22px_55px_rgba(200,80,95,0.20)] transition-shadow duration-300"
              >
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 72vw, 340px"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#C8505F]/70 font-serif text-6xl">
                    {cat.name[0]}
                  </div>
                )}

                {/* Dark-rose fade so the white title always reads, deeper on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3A1519]/65 via-[#3A1519]/10 to-transparent" />
                <div className="absolute inset-0 bg-[#C8505F]/0 group-hover:bg-[#C8505F]/15 transition-colors duration-500" />

                <h3
                  className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 font-serif uppercase font-normal text-white text-[2.6rem] sm:text-5xl leading-[0.92] tracking-tight drop-shadow-sm"
                  style={{ color: "#FFFFFF" }}
                >
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>

          {/* Controls: Explore button left, arrows right */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href="/services"
              className="inline-flex items-center px-7 py-3 rounded-full border border-[#C8505F] text-[#C8505F] text-sm font-medium hover:bg-[#C8505F] hover:text-white transition-colors duration-200"
            >
              Explore Our Services
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Previous category"
                className="w-11 h-11 rounded-full border border-[#C8505F] text-[#C8505F] flex items-center justify-center hover:bg-[#C8505F] hover:text-white transition-colors duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Next category"
                className="w-11 h-11 rounded-full border border-[#C8505F] text-[#C8505F] flex items-center justify-center hover:bg-[#C8505F] hover:text-white transition-colors duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Service Cards Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pt-8 border-t border-[#E8D8C8]/70">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-[#C8505F]">
              Popular Rituals
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#292525] mt-1.5">
              Client Favorite Home Services
            </h3>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["all", "face", "hair", "nail", "massage"].map((catSlug) => (
              <button
                key={catSlug}
                type="button"
                onClick={() => setActiveCategorySlug(catSlug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${activeCategorySlug === catSlug
                  ? "bg-[#C8505F] text-white shadow-md shadow-[#C8505F]/20"
                  : "bg-white/80 text-[#746D69] border border-[#E8D8C8] hover:border-[#C8505F] hover:text-[#C8505F]"
                  }`}
              >
                {catSlug === "all" ? "All Rituals" : catSlug}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] w-full rounded-[28px] bg-[#F5DAD6]/40" />
                <div className="pt-5 space-y-3">
                  <div className="h-3 w-1/4 rounded-full bg-[#E8D8C8]/50" />
                  <div className="h-6 w-2/3 rounded-full bg-[#E8D8C8]/40" />
                  <div className="h-4 w-5/6 rounded-full bg-[#E8D8C8]/30" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {(filteredServices.length > 0 ? filteredServices : services.slice(0, 6)).map((srv) => (
              <article key={srv._id || srv.slug} className="group relative">
                {/* Photo */}
                <div className="relative aspect-[4/5] w-full rounded-[28px] overflow-hidden bg-gradient-to-br from-[#FBE3E2] to-[#F5DAD6]">
                  {srv.images?.[0] ? (
                    <Image
                      src={srv.images[0]}
                      alt={srv.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C8505F]/60 font-display text-7xl">
                      {srv.name?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-[#292525]">
                    <Clock className="w-3.5 h-3.5 text-[#C8505F]" />
                    <span>{srv.durationMinutes || srv.duration} mins</span>
                  </div>
                </div>

                {/* Details: plain text on the page, no inner boxes */}
                <div className="pt-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8505F]">
                    {typeof srv.category === "object"
                      ? srv.category?.name
                      : srv.categoryName || srv.category}
                  </span>

                  <h4 className="mt-1.5 font-serif text-2xl font-medium text-[#292525] leading-snug line-clamp-1 group-hover:text-[#C8505F] transition-colors">
                    {/* Stretched link: the whole card is clickable */}
                    <Link
                      href={`/services/${srv.slug}`}
                      className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#C8505F] focus-visible:after:rounded-[28px]"
                    >
                      {srv.name}
                    </Link>
                  </h4>

                  <p className="mt-2 text-sm text-[#746D69] line-clamp-2 leading-relaxed">
                    {srv.shortDescription ||
                      srv.description ||
                      "At-home treatment delivered with sterilized equipment and gentle botanical care."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#746D69]">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C8505F]" />
                      <span>At-Home</span>
                    </span>
                    {(srv.womenOnly ?? true) && (
                      <span className="inline-flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-[#C8505F]" />
                        <span>Ladies Only</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#E8D8C8] flex items-end justify-between gap-3">
                    <div>
                      <span className="block text-[11px] text-[#746D69]">Price</span>
                      <span className="font-serif text-2xl font-medium text-[#292525] leading-tight">
                        {srv.currency || "AED"} {srv.price}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-3 text-sm font-medium text-[#C8505F]">
                      <span className="underline-offset-4 group-hover:underline">View Details</span>
                      <span className="w-9 h-9 rounded-full border border-[#C8505F]/40 flex items-center justify-center group-hover:bg-[#C8505F] group-hover:text-white group-hover:border-[#C8505F] transition-colors duration-200">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom CTA to full services catalog */}
        <div className="mt-14 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C8505F] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#B34351] transition-all shadow-md shadow-[#C8505F]/20 hover:shadow-lg active:scale-[0.98]"
          >
            <span>Explore All 20 Services & Categories</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};