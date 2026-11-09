"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { packageApi, Package, PackageCategory } from "../../lib/api-client";
import {
  Gift,
  Clock,
  ShieldCheck,
  Award,
  Check,
  Calendar,
  X,
  Loader2,
  Tag,
  Plus,
  ArrowRight,
  Flower2,
} from "lucide-react";

const CATEGORIES: (PackageCategory | "All")[] = [
  "All",
  "Bridal & Events",
  "Spa & Wellness",
  "Grooming & Nails",
  "Seasonal Offers",
];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80";
// Larger version of the same photo, used for the fixed (parallax) backgrounds
const FIXED_BG =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=80";

const FAQS = [
  {
    q: "What's included in a package?",
    a: "Every package lists its treatments and extras. Tap View Inclusions on any card to see exactly what you receive, the total time, and the price.",
  },
  {
    q: "Do I need to book in advance?",
    a: "Yes. Therapists travel to you, so we recommend booking at least a day ahead. Bridal and group bookings are best arranged a week or more in advance.",
  },
  {
    q: "Where do you provide the service?",
    a: "At your home or hotel suite, inside our active Dubai service zones. We confirm your area when you book.",
  },
  {
    q: "How is the package price calculated?",
    a: "Packages bundle several treatments at a lower price than booking them one by one. The saving is shown on each card.",
  },
  {
    q: "Can you arrange a group or bridal party?",
    a: "Yes. Our concierge coordinates multiple therapists for weddings, showers and private gatherings. Contact us and we'll design a custom package.",
  },
];

const fixedBg = (overlay: string): React.CSSProperties => ({
  backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${FIXED_BG})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
});

function PackagesContent() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPackageForModal, setSelectedPackageForModal] =
    useState<Package | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchPackages() {
      try {
        setLoading(true);
        setError(null);
        const res = await packageApi.getAll();
        if (isMounted && res.success) setPackages(res.packages || []);
      } catch (err: any) {
        if (isMounted) setError(err?.message || "Failed to load packages");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close modal on Escape + lock page scroll while open
  useEffect(() => {
    if (!selectedPackageForModal) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setSelectedPackageForModal(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selectedPackageForModal]);

  const filteredPackages = useMemo(() => {
    if (selectedCategory === "All") return packages;
    return packages.filter((pkg) => pkg.category === selectedCategory);
  }, [packages, selectedCategory]);

  const hasFeatured = filteredPackages.length >= 3;
  const featured = hasFeatured ? filteredPackages[0] : null;
  const gridPackages = hasFeatured ? filteredPackages.slice(1) : filteredPackages;

  const imgOf = (pkg: Package) =>
    pkg.images && pkg.images.length > 0 ? pkg.images[0] : DEFAULT_IMAGE;
  const nameOf = (s: any) => (typeof s === "string" ? s : s.name);

  const PriceBlock = ({ pkg, light = false }: { pkg: Package; light?: boolean }) => (
    <div className="flex items-baseline gap-2">
      <span className={`font-serif font-semibold text-2xl ${light ? "text-white" : "text-[#CF565D]"}`}>
        AED {pkg.price}
      </span>
      {pkg.originalPrice > pkg.price && (
        <span className={`text-xs line-through ${light ? "text-white/70" : "text-[#746D69]"}`}>
          AED {pkg.originalPrice}
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans selection:bg-[#F5DAD6] selection:text-[#CF565D]">
      <Header />

      <main className="flex-1">
        {/* ================= HERO (fixed background) ================= */}
        <section
          className="relative lg:bg-fixed text-white"
          style={fixedBg("rgba(41,37,37,0.55)")}
        >
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FAF7F2] to-transparent pointer-events-none" aria-hidden="true" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-44 md:pt-36 md:pb-56 text-center">
            <p className="inline-flex items-center gap-2 text-sm text-[#F5DAD6]">
              <Gift className="w-4 h-4" />
              Curated experiences and exclusive offers
            </p>

            <h1 className="font-display uppercase font-normal tracking-tight text-4xl sm:text-6xl lg:text-8xl leading-[0.92] max-w-5xl mx-auto mt-6 !text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]">
              Signature Ceremony{" "}
              <span className="italic text-[#F5DAD6]">Packages</span>
            </h1>

            <p className="font-serif text-lg sm:text-xl text-white/85 max-w-2xl mx-auto mt-8 leading-relaxed">
              Treatments paired by our master aestheticians for a complete
              head-to-toe ritual, delivered to your doorstep.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#packages"
                className="h-12 px-8 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-medium inline-flex items-center gap-2 transition active:scale-95"
              >
                Explore packages <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/#contact"
                className="h-12 px-8 rounded-full border border-white/50 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center transition"
              >
                Talk to concierge
              </Link>
            </div>
          </div>
        </section>

        {/* ================= TRUST STRIP (overlaps hero) ================= */}
        <section className="relative z-10 -mt-20 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-px bg-[#E8D8C8] rounded-3xl overflow-hidden shadow-xl border border-[#E8D8C8]">
            {[
              { Icon: ShieldCheck, t: "Sanitised setup", d: "Single-use toolkits at every visit" },
              { Icon: Award, t: "Certified therapists", d: "Licensed and vetted across Dubai" },
              { Icon: Tag, t: "Save up to 30%", d: "Bundled pricing on every package" },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="bg-white p-6 flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-[#F5DAD6]/60 text-[#CF565D] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-serif text-lg text-[#292525] leading-tight">{t}</p>
                  <p className="text-xs text-[#746D69] mt-0.5">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= FILTER ================= */}
        <section id="packages" className="mt-16 sticky top-20 z-20 bg-[#FAF7F2]/85 backdrop-blur-md border-y border-[#E8D8C8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar md:justify-center">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={isActive}
                    className={`h-11 px-6 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer ${isActive
                      ? "bg-[#292525] text-white"
                      : "bg-white text-[#746D69] hover:text-[#292525] border border-[#E8D8C8] hover:border-[#CF565D]"
                      }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= PACKAGES ================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-10 h-10 text-[#CF565D] animate-spin mx-auto mb-4" />
              <p className="font-serif text-lg text-[#746D69]">Preparing signature services and offers…</p>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto text-center bg-white rounded-3xl border border-[#E8D8C8] p-10 shadow-sm">
              <p className="text-red-600 font-medium text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="h-11 px-6 rounded-full bg-[#CF565D] text-white text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="max-w-lg mx-auto text-center bg-white rounded-3xl border border-[#E8D8C8] p-10 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4 text-[#CF565D]">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl text-[#292525]">No packages in this category yet</h3>
              <p className="text-sm text-[#746D69] mt-2 mb-6">
                Try another category or browse our single-service menu.
              </p>
              <button
                onClick={() => setSelectedCategory("All")}
                className="h-11 px-6 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] hover:text-[#CF565D] text-sm font-medium"
              >
                View all packages
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Featured package: large editorial split */}
              {featured && (
                <article className="group grid lg:grid-cols-2 bg-white rounded-[2rem] border border-[#E8D8C8] overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-500">
                  <div className="relative min-h-[320px] lg:min-h-[520px] overflow-hidden">
                    <img
                      src={imgOf(featured)}
                      alt={featured.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[900ms] ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-5 left-5 flex flex-wrap gap-2">
                      <span className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-white/95 text-[#292525]">
                        {featured.category}
                      </span>
                      {featured.badge && (
                        <span className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-[#CF565D] text-white">
                          {featured.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 sm:p-8 lg:p-12 flex flex-col justify-center gap-5 sm:gap-6">
                    <p className="text-sm text-[#CF565D] font-medium">Featured package</p>
                    <div>
                      <h2 className="font-display uppercase text-2xl sm:text-4xl lg:text-5xl leading-[1.02] sm:leading-[0.98] text-[#292525]">
                        {featured.name}
                      </h2>
                      {featured.tagline && (
                        <p className="font-serif italic text-base sm:text-lg text-[#CF565D] mt-2 sm:mt-3">“{featured.tagline}”</p>
                      )}
                    </div>
                    {featured.description && (
                      <p className="text-[#746D69] text-sm leading-relaxed line-clamp-4">{featured.description}</p>
                    )}

                    {featured.inclusions && featured.inclusions.length > 0 && (
                      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                        {featured.inclusions.slice(0, 6).map((inc, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[#292525]">
                            <Check className="w-4 h-4 text-[#CF565D] shrink-0 mt-0.5" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="pt-6 border-t border-[#E8D8C8] flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                      <div>
                        <p className="text-xs text-[#746D69] flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                          {featured.durationMinutes} minute ceremony
                        </p>
                        <div className="flex items-center gap-3">
                          <PriceBlock pkg={featured} />
                          {featured.discountPercentage > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F5DAD6] text-[#CF565D]">
                              Save {featured.discountPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col xs:flex-row gap-2.5">
                        <button
                          onClick={() => setSelectedPackageForModal(featured)}
                          className="h-12 px-6 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-sm font-medium text-[#292525] transition"
                        >
                          View inclusions
                        </button>
                        <Link
                          href={`/book?package=${encodeURIComponent(featured.slug)}`}
                          className="h-12 px-7 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition active:scale-95"
                        >
                          <Calendar className="w-4 h-4" /> Book now
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* Portrait image-led cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gridPackages.map((pkg) => (
                  <article
                    key={pkg._id}
                    className="group flex flex-col bg-white rounded-[2rem] border border-[#E8D8C8] overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF7F2]">
                      <img
                        src={imgOf(pkg)}
                        alt={pkg.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[900ms] ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/95 text-[#292525]">
                            {pkg.category}
                          </span>
                          {pkg.badge && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#CF565D] text-white">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        {pkg.discountPercentage > 0 && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#F5DAD6] text-[#CF565D] shrink-0">
                            −{pkg.discountPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="flex items-center gap-1.5 text-xs text-white/85 mb-2">
                          <Clock className="w-3.5 h-3.5 text-[#F5DAD6]" />
                          {pkg.durationMinutes} minutes
                        </p>
                        <h3 className="font-display uppercase text-2xl leading-[1.02] !text-white">{pkg.name}</h3>
                        {pkg.tagline && (
                          <p className="font-serif italic text-sm text-[#F5DAD6] mt-1.5 line-clamp-1">
                            “{pkg.tagline}”
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-5">
                      {pkg.description && (
                        <p className="text-sm text-[#746D69] leading-relaxed line-clamp-2">{pkg.description}</p>
                      )}

                      {pkg.services && pkg.services.length > 0 ? (
                        <ul className="space-y-2">
                          {pkg.services.slice(0, 4).map((s: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2.5 text-sm text-[#292525]">
                              <Flower2 className="w-3.5 h-3.5 text-[#CF565D] shrink-0" />
                              <span>{nameOf(s)}</span>
                            </li>
                          ))}
                          {pkg.services.length > 4 && (
                            <li className="text-xs text-[#746D69] pl-6">+{pkg.services.length - 4} more</li>
                          )}
                        </ul>
                      ) : (
                        pkg.inclusions &&
                        pkg.inclusions.length > 0 && (
                          <ul className="space-y-2">
                            {pkg.inclusions.slice(0, 3).map((inc, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-[#292525]">
                                <Check className="w-4 h-4 text-[#CF565D] shrink-0 mt-0.5" />
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      )}

                      <div className="mt-auto pt-5 border-t border-[#E8D8C8]/70 space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-[#746D69]">Package price</p>
                            <PriceBlock pkg={pkg} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedPackageForModal(pkg)}
                            className="h-11 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-sm font-medium text-[#292525] transition"
                          >
                            View inclusions
                          </button>
                          <Link
                            href={`/book?package=${encodeURIComponent(pkg.slug)}`}
                            className="h-11 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-medium inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                          >
                            <Calendar className="w-4 h-4" /> Book now
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ================= CONCIERGE BAND (second fixed background) ================= */}
        <section
          className="relative lg:bg-fixed text-white"
          style={fixedBg("rgba(41,37,37,0.62)")}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
            <p className="text-sm text-[#F5DAD6]">Concierge bespoke packages</p>
            <h2 className="font-display uppercase text-3xl sm:text-5xl lg:text-6xl leading-[0.98] mt-4 !text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]">
              Planning a bridal party or private gathering?
            </h2>
            <p className="font-serif text-lg text-white/85 mt-6 max-w-2xl mx-auto leading-relaxed">
              We coordinate multi-therapist visits for weddings, showers and VIP events across Dubai, and design the package around you.
            </p>
            <Link
              href="/#contact"
              className="mt-10 h-12 px-9 rounded-full bg-white text-[#292525] hover:bg-[#F5DAD6] text-sm font-medium inline-flex items-center gap-2 transition active:scale-95"
            >
              Contact concierge <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <h2 className="font-display uppercase text-3xl sm:text-4xl text-center text-[#292525]">
            Good to know
          </h2>
          <div className="mt-10 divide-y divide-[#E8D8C8] border-y border-[#E8D8C8]">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-serif text-lg text-[#292525]">{f.q}</span>
                  <span className="w-9 h-9 rounded-full border border-[#E8D8C8] text-[#CF565D] flex items-center justify-center shrink-0 group-open:rotate-45 group-open:bg-[#CF565D] group-open:border-[#CF565D] group-open:text-white transition">
                    <Plus className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-sm text-[#746D69] leading-relaxed mt-3 pr-12">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ================= DETAIL MODAL ================= */}
      {selectedPackageForModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPackageForModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedPackageForModal.name}
        >
          <div
            className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#E8D8C8] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52 sm:h-60 shrink-0 bg-[#FAF7F2]">
              <img
                src={imgOf(selectedPackageForModal)}
                alt={selectedPackageForModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedPackageForModal(null)}
                aria-label="Close"
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black text-white rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-5 left-6 right-6 text-white">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/95 text-[#292525]">
                  {selectedPackageForModal.category}
                </span>
                <h3 className="font-display uppercase text-2xl sm:text-3xl mt-2 leading-tight !text-white">
                  {selectedPackageForModal.name}
                </h3>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
              {selectedPackageForModal.tagline && (
                <p className="font-serif italic text-lg text-[#CF565D]">“{selectedPackageForModal.tagline}”</p>
              )}
              <p className="text-sm text-[#746D69] leading-relaxed">{selectedPackageForModal.description}</p>

              {selectedPackageForModal.services && selectedPackageForModal.services.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-serif text-lg text-[#292525]">Treatments</h4>
                  <ul className="flex flex-wrap gap-2">
                    {selectedPackageForModal.services.map((s: any, i: number) => (
                      <li key={i} className="px-3.5 py-1.5 rounded-full bg-[#F5DAD6]/50 text-sm text-[#292525]">
                        {nameOf(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPackageForModal.inclusions && selectedPackageForModal.inclusions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-serif text-lg text-[#292525]">What's included</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedPackageForModal.inclusions.map((inc, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/60 text-sm text-[#292525]"
                      >
                        <Check className="w-4 h-4 text-[#CF565D] shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/60">
                <div>
                  <span className="text-xs text-[#746D69] block">Total time</span>
                  <span className="font-medium text-[#292525]">{selectedPackageForModal.durationMinutes} minutes</span>
                </div>
                <div>
                  <span className="text-xs text-[#746D69] block">Location</span>
                  <span className="font-medium text-[#292525]">Your home or hotel suite</span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-[#FAF7F2] border-t border-[#E8D8C8] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div>
                <span className="text-xs text-[#746D69]">Total price</span>
                <PriceBlock pkg={selectedPackageForModal} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPackageForModal(null)}
                  className="h-11 px-5 text-sm font-medium text-[#746D69] hover:text-[#292525] bg-white rounded-full border border-[#E8D8C8] transition"
                >
                  Close
                </button>
                <Link
                  href={`/book?package=${encodeURIComponent(selectedPackageForModal.slug)}`}
                  className="h-11 px-6 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-medium inline-flex items-center transition active:scale-95"
                >
                  Book package
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#CF565D] animate-spin" />
        </div>
      }
    >
      <PackagesContent />
    </Suspense>
  );
}