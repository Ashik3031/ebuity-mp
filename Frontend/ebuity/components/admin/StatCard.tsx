import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendType = "up",
  subtitle,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(207,86,93,0.08)] transition-all duration-200 flex flex-col justify-between ${
        onClick ? "cursor-pointer hover:border-[#CF565D]/40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#746D69] dark:text-[#A89F9A] tracking-wide uppercase">
          {title}
        </span>
        <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 flex items-center justify-center text-[#292525] dark:text-[#FAF7F2]">
          <Icon className="w-4 h-4 text-[#292525] dark:text-[#FAF7F2]" />
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-[#292525] dark:text-[#FAF7F2] tracking-tight mb-1">
          {value}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {trend && (
            <span
              className={`text-xs font-medium inline-flex items-center gap-0.5 ${
                trendType === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trendType === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[#746D69] dark:text-[#A89F9A]"
              }`}
            >
              {trendType === "up" && "↑"}
              {trendType === "down" && "↓"}
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-[#746D69]/80 dark:text-[#A89F9A]/80 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
