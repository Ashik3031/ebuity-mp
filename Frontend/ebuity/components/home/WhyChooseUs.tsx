"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Flower, Sparkles, HeartHandshake, ShieldCheck } from "lucide-react";

// Background image for the section. Replace this URL (or a local /public path) with your own image later.
const BG_IMAGE =
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1920&q=80";

const points = [
  {
    title: "100% Certified & Verified Therapists",
    description:
      "Every aesthetician passes rigorous background screenings, trade certification verifications, and practical skill evaluations before visiting your home.",
    icon: ShieldCheck,
  },
  {
    title: "Hospital-Grade Sanitization Standards",
    description:
      "We enforce single-use disposables, autoclaved instruments unwrapped in your presence, and sanitizing floor mats for pristine hygiene.",
    icon: Sparkles,
  },
  {
    title: "Hand-Harvested Damascus Rose Formulations",
    description:
      "All treatments feature authentic Damascus rose distillates, cold-pressed seed oils, and certified organic antioxidants with zero synthetic fillers.",
    icon: Flower,
  },
  {
    title: "Transparent Pricing & Guaranteed Punctuality",
    description:
      "No hidden travel charges or surprise fees. Punctual specialist arrival with complete setup, letting you unwind with complete peace of mind.",
    icon: HeartHandshake,
  },
];

// Stack geometry (px): where the first card sticks, and how far each following card sits lower
const STICKY_BASE = 112;
const STICKY_STEP = 20;
// How much earlier cards shrink for each card stacked on top of them
const SHRINK_PER_CARD = 0.04;

export const WhyChooseUs: React.FC = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scale earlier cards down a little as newer ones slide over them
  useEffect(() => {
    let raf = 0;

    const update = () => {
      const progress = points.map((_, i) => {
        const el = cardRefs.current[i];
        if (!el) return 0;
        const stuckTop = STICKY_BASE + i * STICKY_STEP;
        const dist = el.getBoundingClientRect().top - stuckTop;
        const t = 1 - Math.min(Math.max(dist / el.offsetHeight, 0), 1);
        return i === 0 ? 0 : t;
      });

      points.forEach((_, i) => {
        const inner = innerRefs.current[i];
        if (!inner) return;
        let covered = 0;
        for (let j = i + 1; j < points.length; j++) covered += progress[j];
        const scale = 1 - SHRINK_PER_CARD * covered;
        inner.style.transform = `scale(${scale})`;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="about" className="relative py-20 lg:py-28 bg-[#FAF4EF]">
      {/* Background image with a cream/blush wash so text stays readable (swap BG_IMAGE above) */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <Image
          src={BG_IMAGE}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDF7F3] via-[#FBE9E7]/80 to-[#FDF7F3]" />
        {/* Soft blush glows, same family as the other sections */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#F7D4D7]/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#F7D4D7]/50 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="hidden sm:inline-block w-12 h-[1px] bg-[#E8D8C8]"></span>
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-[#746D69]">
              Our Service Promise
            </span>
            <span className="hidden sm:inline-block w-12 h-[1px] bg-[#E8D8C8]"></span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.6rem] uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
            Why Discerning Clients Choose{" "}
            <span className="italic font-normal text-[#C8505F]">Rose Essence</span>
          </h2>
          <p className="text-sm sm:text-base text-[#746D69] leading-relaxed font-normal">
            Bridging the luxury of premier botanical spas with the unmatched privacy and comfort of your personal sanctuary.
          </p>
        </div>

        {/* Scroll stack: each card sticks, the next one slides over it */}
        <div className="relative max-w-4xl mx-auto pb-10">
          {points.map((pt, i) => {
            const Icon = pt.icon;
            return (
              <div
                key={pt.title}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="sticky mb-8 sm:mb-14 last:mb-0"
                style={{ top: STICKY_BASE + i * STICKY_STEP, zIndex: i + 1 }}
              >
                <div
                  ref={(el) => {
                    innerRefs.current[i] = el;
                  }}
                  className="origin-top will-change-transform flex flex-col sm:flex-row overflow-hidden rounded-[32px] bg-white/95 backdrop-blur-md border border-[#E8D8C8]/70 shadow-[0_18px_50px_rgba(200,80,95,0.12)]"
                >
                  {/* Icon panel */}
                  <div className="relative sm:w-[34%] shrink-0 flex items-center justify-center py-8 sm:py-0 bg-gradient-to-br from-[#FBE3E2] via-[#F9D6D9] to-[#F6CBD0] overflow-hidden">
                    <span className="absolute -bottom-6 -left-2 font-serif text-[7rem] sm:text-[9rem] leading-none text-white/40 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/90 text-[#C8505F] flex items-center justify-center shadow-lg shadow-[#C8505F]/15">
                      <Icon className="w-9 h-9 sm:w-10 sm:h-10 stroke-[1.5]" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-7 sm:p-10 flex flex-col justify-center">
                    <h3 className="font-serif text-2xl sm:text-[1.75rem] font-medium text-[#292525] leading-snug mb-3">
                      {pt.title}
                    </h3>
                    <p className="text-sm sm:text-[15px] text-[#746D69] leading-relaxed font-normal">
                      {pt.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};