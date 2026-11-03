import React from "react";
import { DashboardCategoryDistribution } from "../../lib/api-client";
import { Sparkles } from "lucide-react";

interface CategoryDistributionChartProps {
  data: DashboardCategoryDistribution[];
}

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const fallbackCategories: DashboardCategoryDistribution[] = [
    { category: "Facials & Peels", count: 24 },
    { category: "Hammam & Body", count: 18 },
    { category: "Massage & Wellness", count: 15 },
    { category: "Nail Care", count: 12 },
    { category: "Hair Rituals", count: 8 },
  ];

  const categories = data && data.length > 0 ? data : fallbackCategories;
  const total = categories.reduce((acc, curr) => acc + curr.count, 0) || 1;

  const colorPalette = [
    "bg-[#CF565D]",
    "bg-[#292525]",
    "bg-[#E8D8C8]",
    "bg-[#F5DAD6]",
    "bg-stone-400",
  ];

  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#292525] dark:text-[#FAF7F2]">Service Distribution</h3>
          <p className="text-xs text-[#746D69] dark:text-[#A89F9A]">Breakdown by service ritual category</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[#FCF4F2] dark:bg-[#CF565D]/20 text-[#CF565D] flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Progress segmented bar */}
      <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-[#282323] flex overflow-hidden my-3 p-0.5">
        {categories.map((cat, idx) => {
          const pct = (cat.count / total) * 100;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%` }}
              title={`${cat.category}: ${cat.count} (${Math.round(pct)}%)`}
              className={`h-full first:rounded-l-full last:rounded-r-full ${
                colorPalette[idx % colorPalette.length]
              } transition-all duration-300`}
            />
          );
        })}
      </div>

      {/* Category breakdown list */}
      <div className="space-y-2 mt-2">
        {categories.slice(0, 5).map((cat, idx) => {
          const pct = Math.round((cat.count / total) * 100);
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    colorPalette[idx % colorPalette.length]
                  }`}
                />
                <span className="text-[#292525] dark:text-[#FAF7F2] font-medium">{cat.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#746D69] dark:text-[#A89F9A]">{cat.count} bookings</span>
                <span className="font-semibold text-[#292525] dark:text-[#FAF7F2] w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
