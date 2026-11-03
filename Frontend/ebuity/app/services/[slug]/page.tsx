"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { ServiceCard } from "../../../components/services/ServiceCard";
import { serviceApi } from "../../../lib/api-client";
import { Service } from "../../../types/service";
import {
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  Flower2,
  Calendar,
  CheckCircle2,
  X,
  AlertCircle,
  Mail,
  UserCheck,
  Loader2,
  Zap,
} from "lucide-react";

function ServiceDetailContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [service, setService] = useState<Service | null>(null);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function fetchService() {
      try {
        setLoading(true);
        setError(null);

        const res = await serviceApi.getBySlug(slug);

        if (isMounted && res?.service) {
          setService(res.service);
          if (res.relatedServices) {
            setRelatedServices(res.relatedServices);
          }
        } else if (isMounted) {
          setError("Service not found");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load service");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchService();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const categoryName =
    typeof service?.category === "object"
      ? service.category.name
      : "At-Home Ceremony";

  const images = service?.images?.length
    ? service.images
    : [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
    ];

  const currentImage = images[activeImageIndex] || images[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Header />

      <main className="flex-1 pb-24">
        {/* Breadcrumb Bar */}
        <div className="bg-[#FAF7F2] border-b border-[#E8D8C8]/60 py-3.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-[#746D69]">
              <Link href="/" className="hover:text-[#CF565D] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <Link
                href="/services"
                className="hover:text-[#CF565D] transition-colors"
              >
                Services
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span className="font-semibold text-[#292525] truncate max-w-[200px] sm:max-w-none">
                {service ? service.name : "Ceremony Details"}
              </span>
            </nav>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 animate-pulse">
              <div className="aspect-[4/3] rounded-3xl bg-[#E8D8C8]/40" />
              <div className="space-y-6">
                <div className="h-4 bg-[#E8D8C8]/40 rounded w-1/4" />
                <div className="h-10 bg-[#E8D8C8]/40 rounded w-3/4" />
                <div className="h-6 bg-[#E8D8C8]/40 rounded w-1/3" />
                <div className="h-24 bg-[#E8D8C8]/40 rounded w-full" />
                <div className="h-12 bg-[#E8D8C8]/40 rounded-full w-full" />
              </div>
            </div>
          ) : error || !service ? (
            /* Error / Not Found */
            <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl border border-[#E8D8C8] p-10 shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-[#CF565D]">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-[#292525]">
                Ceremony Not Found
              </h2>
              <p className="text-sm text-[#746D69]">
                The at-home ritual you requested might be unavailable or
                inactive in our current schedule.
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
              >
                Return to All Services
              </Link>
            </div>
          ) : (
            /* Service Details Grid */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              {/* Left Column: Image Gallery (col 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8D8C8] shadow-md">
                  <Image
                    src={currentImage}
                    alt={service.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover object-center transition-all duration-500 ease-out"
                  />

                  {/* Botanical Quality Pill */}
                  <div className="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-medium text-[#292525] border border-[#E8D8C8] shadow-2xs flex items-center gap-1.5">
                    <Flower2 className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span>Pure Damascena Organic Botanicals</span>
                  </div>
                </div>

                {/* Thumbnails if multiple images exist */}
                {images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${idx === activeImageIndex
                            ? "border-[#CF565D] ring-2 ring-[#CF565D]/20 shadow-xs"
                            : "border-[#E8D8C8] opacity-75 hover:opacity-100"
                          }`}
                      >
                        <Image
                          src={imgUrl}
                          alt={`${service.name} preview ${idx + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover object-center"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Included Steps / Ritual Journey (if available) */}
                {service.includedSteps && service.includedSteps.length > 0 && (
                  <div className="pt-8 border-t border-[#E8D8C8]/60 space-y-4">
                    <h3 className="font-serif text-2xl font-medium text-[#292525]">
                      The Ritual Journey
                    </h3>
                    <div className="space-y-3">
                      {service.includedSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#E8D8C8]/60"
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5DAD6] text-[#CF565D] text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292525]">
                              {step.title}
                            </h4>
                            <p className="text-xs text-[#746D69] leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Pricing & Booking Action (col 5) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                {/* Header Information */}
                <div className="space-y-2 border-b border-[#E8D8C8]/60 pb-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                      {categoryName}
                    </span>

                    <div className="flex items-center gap-2">
                      {service.womenOnly && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5DAD6] text-[#CF565D] border border-[#CF565D]/20">
                          <UserCheck className="w-3 h-3" />
                          <span>Ladies Only</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#E8D8C8] text-[#292525]">
                        <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                        <span>{service.durationMinutes ?? service.duration ?? 30} mins</span>
                      </span>
                    </div>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#292525] leading-tight">
                    {service.name}
                  </h1>

                  {/* Exclusive Deal Banner */}
                  {service.isExclusiveDeal && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#FAF7F2] to-rose-500/15 border border-amber-300 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-bold text-amber-900">
                          {service.dealBadge || "Today's Exclusive Deal"}
                        </span>
                        {service.dealDiscountPercentage && (
                          <span className="text-[10px] font-extrabold bg-[#CF565D] text-white px-2 py-0.5 rounded-full">
                            {service.dealDiscountPercentage}% OFF
                          </span>
                        )}
                      </div>
                      {service.dealDescription && (
                        <p className="text-[11px] text-[#746D69] mt-1 font-medium">
                          {service.dealDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pricing Box */}
                  <div className="pt-4 flex items-baseline justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#746D69]/70 tracking-wider">
                        {service.isExclusiveDeal ? "Today's Exclusive Fee" : "Session Fee (All-Inclusive)"}
                      </span>
                      <div className="flex items-baseline gap-2">
                        {service.isExclusiveDeal && service.dealPrice != null ? (
                          <>
                            <span className="text-sm font-semibold text-[#CF565D]">
                              {service.currency || "AED"}
                            </span>
                            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#CF565D]">
                              {service.dealPrice}
                            </span>
                            <span className="text-sm text-[#746D69]/60 line-through">
                              AED {service.price}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-[#CF565D]">
                              {service.currency || "AED"}
                            </span>
                            <span className="font-serif text-3xl sm:text-4xl font-semibold text-[#292525]">
                              {service.price}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-emerald-700 font-semibold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                      In-Home Service
                    </span>
                  </div>
                </div>

                {/* Descriptions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                    About This Ceremony
                  </h3>
                  <p className="text-sm text-[#746D69] leading-relaxed">
                    {service.fullDescription || service.shortDescription}
                  </p>
                </div>

                {/* Key Benefits */}
                {service.benefits && service.benefits.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                      Key Benefits & Results
                    </h3>
                    <ul className="space-y-2">
                      {service.benefits.map((b, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs text-[#746D69]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#CF565D] flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Primary Booking CTA */}
                <div className="pt-4 space-y-3">
                  <Link
                    href={`/book?service=${encodeURIComponent(service.slug)}`}
                    className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md active:scale-98"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {service.isExclusiveDeal ? "Claim Today's Deal" : "Book This Service"} &bull;{" "}
                      {service.currency || "AED"}{" "}
                      {service.isExclusiveDeal && service.dealPrice != null ? service.dealPrice : service.price}
                    </span>
                  </Link>

                  <p className="text-[11px] text-center text-[#746D69]">
                    Select time slot, verify your Dubai service zone, and confirm your private home appointment.
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E8D8C8]/60">
                  <div className="p-3 rounded-2xl bg-white border border-[#E8D8C8]/60 space-y-1">
                    <ShieldCheck className="w-4 h-4 text-[#CF565D]" />
                    <span className="block text-[11px] font-bold text-[#292525]">
                      Sterile Equipment
                    </span>
                    <span className="block text-[10px] text-[#746D69]">
                      Single-use & autoclaved
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#E8D8C8]/60 space-y-1">
                    <Award className="w-4 h-4 text-[#CF565D]" />
                    <span className="block text-[11px] font-bold text-[#292525]">
                      Licensed Staff
                    </span>
                    <span className="block text-[10px] text-[#746D69]">
                      Certified aestheticians
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Services in Category */}
          {relatedServices.length > 0 && (
            <section className="mt-20 pt-16 border-t border-[#E8D8C8]">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                    Complementary Rituals
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#292525] mt-1">
                    More in {categoryName}
                  </h2>
                </div>
                <Link
                  href="/services"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#CF565D] hover:text-[#b8454c]"
                >
                  <span>All Services</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {relatedServices.map((rel) => (
                  <ServiceCard key={rel._id} service={rel} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Booking State Explanatory Modal (Compliant with Scope Level 3 instructions) */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8] p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setBookingModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#746D69] hover:text-[#292525] rounded-full hover:bg-neutral-100"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#CF565D]">
                Level 3: Discovery Phase Complete
              </span>
              <h3 className="font-serif text-2xl font-medium text-[#292525]">
                Ready to Experience &quot;{service?.name}&quot;?
              </h3>
              <p className="text-xs text-[#746D69] leading-relaxed">
                Service catalog and discovery endpoints are active! The interactive
                booking calendar, aesthetician territory dispatch, and time-slot
                reservations will be enabled in <strong>Level 4</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/60 space-y-1.5 text-xs text-[#292525]">
              <div className="flex items-center gap-2 font-semibold">
                <Mail className="w-4 h-4 text-[#CF565D]" />
                <span>Concierge Inquiries:</span>
              </div>
              <p className="text-[#746D69]">
                For advance booking requests, contact our concierge desk at{" "}
                <a
                  href="mailto:concierge@roseessence.com"
                  className="font-semibold text-[#CF565D] underline"
                >
                  concierge@roseessence.com
                </a>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBookingModalOpen(false)}
              className="w-full py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
            >
              Continue Exploring Ceremonies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CF565D]" />
        </div>
      }
    >
      <ServiceDetailContent />
    </Suspense>
  );
}
