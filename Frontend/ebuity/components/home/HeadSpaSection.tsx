"use client";

import React from "react";
import Link from "next/link";
import { HeadSpaContactForm } from "./HeadSpaContactForm";
import { MessageCircle, Clock, Sparkles } from "lucide-react";

const BG_IMAGE_URL =
  "https://res.cloudinary.com/dugtxybef/image/upload/v1793276740/pexels-olly-3764570_pyvct0.jpg";

export const HeadSpaSection: React.FC = () => {
  return (
    <section className="relative w-full min-h-screen py-20 sm:py-28 lg:py-36 flex items-center overflow-hidden [clip-path:inset(0)]">
      {/* 
        Fixed background layer that stays fixed in place while page scrolls.
        [clip-path:inset(0)] on parent bounds the fixed layer exclusively to this section viewport.
        Works consistently across Desktop, Android, and iOS.
      */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center -z-10 pointer-events-none transform-gpu"
        style={{
          backgroundImage: `url('${BG_IMAGE_URL}')`,
          backgroundAttachment: "fixed",
        }}
        aria-hidden="true"
      />

      {/* Dark Ambient Vignette Overlay for pure white text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/75 sm:from-black/75 sm:via-black/55 sm:to-black/70 pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* Left Column: Pure white typography & concierge details */}
          <div className="lg:col-span-6 space-y-6" style={{ color: "#ffffff" }}>




            {/* Main Display Heading in pure white (inline style ensures no CSS override) */}
            <h2
              className="font-display uppercase tracking-tight text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.98] drop-shadow-lg"
              style={{ color: "#ffffff" }}
            >
              HAVE AN ENQUIRY?
              <br />
              CONNECT WITH US
            </h2>

            {/* Subtext description in pure white */}
            <p
              className="text-sm sm:text-base leading-relaxed max-w-lg font-sans drop-shadow-xs"
              style={{ color: "#ffffff", opacity: 0.95 }}
            >
              Whether you have questions regarding our at-home wellness ceremonies our dedicated
              concierge team is at your service.
            </p>

            {/* Quick contact pills */}
            {/* <div className="flex flex-wrap gap-4 pt-1">
              <a
                href="https://wa.me/971500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md text-xs font-semibold transition-all"
                style={{ color: "#ffffff" }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Concierge</span>
              </a>

              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-medium"
                style={{ color: "#ffffff", opacity: 0.9 }}
              >
                <Clock className="w-3.5 h-3.5 text-[#F5DAD6]" />
                <span>Daily: 9:00 AM – 10:00 PM</span>
              </div>
            </div> */}

            {/* Pill button */}
            <div className="pt-2">
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/80 text-sm font-medium tracking-wide hover:bg-white hover:text-[#292525] transition-all duration-300 w-fit"
                style={{ color: "#ffffff" }}
              >
                Discover Ceremonies
              </Link>
            </div>
          </div>

          {/* Right Column: Frosted Glass Card Contact Form */}
          <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:ml-auto">
            <HeadSpaContactForm />
          </div>

        </div>
      </div>
    </section>
  );
};
