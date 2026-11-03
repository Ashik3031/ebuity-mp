import React from "react";
import { LucideIcon, Sparkles } from "lucide-react";

interface HeroStatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  badge?: string;
  subtitle?: string;
}

export function HeroStatCard({
  title,
  value,
  icon: Icon = Sparkles,
  trend = "↑ Active Today",
  badge = "Live UAE",
  subtitle = "Beauty & wellness reservations",
}: HeroStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#CF565D] via-[#CF565D] to-[#B9474E] p-4 sm:p-5 text-white shadow-[0_8px_24px_rgba(207,86,93,0.28)] dark:shadow-[0_8px_24px_rgba(207,86,93,0.2)] border border-transparent dark:border-white/10 flex flex-col justify-between">
      {/* Subtle organic watermark highlight */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
          {title}
        </span>
        <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-extrabold tracking-tight text-white mb-1">
          {value}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
          <span className="text-xs font-medium text-white/95 inline-flex items-center gap-1">
            {trend}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
            {badge}
          </span>
        </div>
      </div>
    </div>
  );
}
