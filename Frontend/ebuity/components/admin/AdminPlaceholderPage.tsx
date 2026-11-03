import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowLeft, Sparkles, Clock, ExternalLink } from "lucide-react";

interface AdminPlaceholderPageProps {
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  upcomingFeatures: string[];
  relatedAction?: {
    label: string;
    href: string;
  };
}

export function AdminPlaceholderPage({
  title,
  category,
  description,
  icon: Icon,
  upcomingFeatures,
  relatedAction,
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D8C8]/50">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#746D69] mb-1">
            <Link href="/admin" className="hover:text-[#CF565D] transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#292525] font-semibold">{category}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#292525]">
            {title}
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>

          {relatedAction && (
            <Link
              href={relatedAction.href}
              className="px-4 py-2 rounded-xl bg-[#292525] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 hover:bg-[#1a1717] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
              <span>{relatedAction.label}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-[#E8D8C8]/70 shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-8 sm:p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FCF4F2] border border-[#F5DAD6] flex items-center justify-center text-[#CF565D] mb-5 shadow-xs">
          <Icon className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-[#CF565D] bg-[#FCF4F2] px-3 py-1 rounded-full border border-[#F5DAD6] mb-3">
          Foundation Module
        </span>

        <h2 className="text-xl font-bold text-[#292525] mb-2">
          {title} Management Module
        </h2>

        <p className="text-xs text-[#746D69] max-w-md mx-auto leading-relaxed mb-8">
          The administrative navigation and routing foundation is ready. This management module will be activated in its dedicated implementation phase.
        </p>

        {/* Planned Features List */}
        <div className="w-full text-left bg-[#FAF7F2] rounded-2xl p-5 border border-[#E8D8C8]/70 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#CF565D]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#292525]">
              Upcoming Scope & Features
            </h3>
          </div>
          <ul className="space-y-2">
            {upcomingFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#746D69]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CF565D] mt-1.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="text-xs font-semibold text-[#CF565D] hover:underline"
          >
            ← Return to Dashboard Overview
          </Link>
          <span className="text-[#E8D8C8]">·</span>
          <Link
            href="/admin/staff"
            className="text-xs font-semibold text-[#292525] hover:underline inline-flex items-center gap-1"
          >
            View Active Staff Management (Level 5)
            <ExternalLink className="w-3 h-3 text-[#CF565D]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
