"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import { ShieldCheck, FileText, RotateCcw, CalendarX, ChevronRight, Sparkles } from "lucide-react";

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const POLICY_TABS = [
  {
    name: "Privacy Policy",
    href: "/privacy",
    icon: ShieldCheck,
  },
  {
    name: "Terms & Conditions",
    href: "/terms",
    icon: FileText,
  },
  {
    name: "Refund & Return Policy",
    href: "/refund-policy",
    icon: RotateCcw,
  },
  {
    name: "Cancellation & Delivery",
    href: "/cancellation-policy",
    icon: CalendarX,
  },
];

export const PolicyLayout: React.FC<PolicyLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans selection:bg-[#F5DAD6] selection:text-[#292525]">
      <Header />

      {/* Hero Header */}
      <section className="relative pt-28 pb-12 sm:pt-36 sm:pb-16 bg-gradient-to-b from-[#F3ECE4] to-[#FAF7F2] border-b border-[#E8D8C8]/80 overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#F5DAD6]/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#E8D8C8]/30 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 text-xs text-[#746D69]">
            <Link href="/" className="hover:text-[#CF565D] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#746D69]/60" />
            <span className="text-[#292525] font-medium">Legal & Compliance</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-[#E8D8C8] text-[11px] font-semibold uppercase tracking-wider text-[#CF565D] shadow-2xs">
            <Sparkles className="w-3 h-3" />
            <span>Dubai, UAE At-Home Beauty & Wellness</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#292525] tracking-tight">
            {title}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#746D69] leading-relaxed">
            {subtitle}
          </p>

          <div className="inline-block pt-1">
            <span className="text-xs text-[#746D69] bg-white/60 px-3 py-1 rounded-full border border-[#E8D8C8]">
              Last Updated: <strong className="text-[#292525]">{lastUpdated}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Policy Navigation Tabs */}
      <section className="sticky top-20 z-10 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8D8C8] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-3 no-scrollbar">
            {POLICY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                pathname === tab.href ||
                (tab.href === "/privacy" && pathname === "/privacy-policy") ||
                (tab.href === "/terms" && pathname === "/terms-and-conditions");

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#292525] text-white shadow-xs"
                      : "bg-white text-[#746D69] hover:text-[#292525] hover:bg-stone-50 border border-[#E8D8C8]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F5DAD6]" : "text-[#746D69]"}`} />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <article className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E8D8C8] shadow-sm divide-y divide-[#E8D8C8]/60 text-sm leading-relaxed text-[#4A4543]">
          {children}
        </article>

        {/* Support & Concierge Card */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#FAF7F2] to-[#F5DAD6]/30 border border-[#E8D8C8] text-center space-y-3">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#292525]">
            Have questions about our policies or your booking?
          </h3>
          <p className="text-xs sm:text-sm text-[#746D69] max-w-lg mx-auto">
            Our dedicated Dubai Concierge team is available to assist you with appointment coordination, service enquiries, and policy clarifications.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#CF565D] hover:bg-[#B9474E] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
            >
              Contact Concierge
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white hover:bg-stone-50 text-[#292525] border border-[#E8D8C8] text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Book Service
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
