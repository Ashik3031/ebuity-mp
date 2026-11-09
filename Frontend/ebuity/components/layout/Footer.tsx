"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { ArrowRight } from "lucide-react";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer
      id="contact"
      className="relative z-20 w-full rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[64px] bg-[#FAF7F2] border-t border-[#E8D8C8] shadow-[0_-25px_60px_rgba(0,0,0,0.18)] -mt-10 sm:-mt-14 mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

          {/* Brand Info (2 cols) */}
          <div className="md:col-span-2 space-y-5">
            <BrandLogo />
            <p className="text-sm text-[#746D69] max-w-sm leading-relaxed font-normal">
              Rose Essence delivers luxury at-home salon, spa, and botanical facial services directly to your residence. Hand-harvested Damascus rose care administered by certified aestheticians.
            </p>

            <div className="flex items-center gap-3 pt-2 text-[#746D69]">
              <a
                href="#instagram"
                className="w-9 h-9 rounded-full bg-white border border-[#E8D8C8] flex items-center justify-center hover:text-[#CF565D] hover:border-[#CF565D] transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-[1.75]" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="#facebook"
                className="w-9 h-9 rounded-full bg-white border border-[#E8D8C8] flex items-center justify-center hover:text-[#CF565D] hover:border-[#CF565D] transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>
              <a
                href="#twitter"
                className="w-9 h-9 rounded-full bg-white border border-[#E8D8C8] flex items-center justify-center hover:text-[#CF565D] hover:border-[#CF565D] transition-colors"
                aria-label="Twitter / X"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-[#292525]">
              At-Home Services
            </h4>
            <ul className="space-y-2.5 text-sm text-[#746D69]">
              <li>
                <Link href="#services" className="hover:text-[#CF565D] transition-colors">
                  Damask Rose Facials
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-[#CF565D] transition-colors">
                  Aromatherapy Body Spa
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-[#CF565D] transition-colors">
                  Scalp Revival services
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-[#CF565D] transition-colors">
                  Petal Manicure & Pedicure
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-[#292525]">
              Service Info
            </h4>
            <ul className="space-y-2.5 text-sm text-[#746D69]">
              <li>
                <Link href="#how-it-works" className="hover:text-[#CF565D] transition-colors">
                  Booking Process
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-[#CF565D] transition-colors">
                  Hygiene & Standards
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#CF565D] transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-[#CF565D] transition-colors">
                  Concierge Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-[#292525]">
              Rose Essence Circle
            </h4>
            <p className="text-xs text-[#746D69] leading-relaxed">
              Join for private seasonal treatment releases, member appointment priority, and wellness advice.
            </p>
            {subscribed ? (
              <p className="text-xs font-medium text-green-700 bg-green-50 p-2.5 rounded-xl border border-green-200">
                ✓ Thank you for subscribing to our Circle.
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8D8C8] rounded-full text-xs text-[#292525] placeholder:text-[#746D69]/60 focus:border-[#CF565D] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 w-8 h-8 rounded-full bg-[#CF565D] text-white flex items-center justify-center hover:bg-[#B9474E] transition-colors shadow-2xs"
                    aria-label="Submit newsletter subscription"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-[#E8D8C8] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#746D69]">
          <p>© 2026 Rose Essence Luxury At-Home Services. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#privacy" className="hover:text-[#CF565D] transition-colors">
              Privacy Policy
            </Link>
            <Link href="#terms" className="hover:text-[#CF565D] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
