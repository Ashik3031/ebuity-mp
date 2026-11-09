import React from "react";
import { DashboardBookingTrend } from "../../lib/api-client";

interface BookingTrendChartProps {
  data: DashboardBookingTrend[];
  title?: string;
  subtitle?: string;
  currentRange?: "7d" | "30d" | "6m";
  onRangeChange?: (range: "7d" | "30d" | "6m") => void;
}

export function BookingTrendChart({
  data,
  title = "Booking & Service Trends",
  subtitle = "Treatment volume and scheduled services across the UAE",
  currentRange = "6m",
  onRangeChange,
}: BookingTrendChartProps) {
  // Fallback months if data is empty
  const defaultMonths: DashboardBookingTrend[] = [
    { month: "May", completed: 0, other: 0, total: 0 },
    { month: "Jun", completed: 0, other: 0, total: 0 },
    { month: "Jul", completed: 0, other: 0, total: 0 },
    { month: "Aug", completed: 0, other: 0, total: 0 },
    { month: "Sep", completed: 0, other: 0, total: 0 },
    { month: "Oct", completed: 0, other: 8, total: 8 },
  ];

  const chartData = data && data.length > 0 ? data : defaultMonths;
  const maxVal = Math.max(...chartData.map((d) => Math.max(d.completed, d.other, 1)), 10);

  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between min-w-0 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2] truncate">{title}</h3>
          <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5 line-clamp-1">{subtitle}</p>
        </div>

        {/* Range Selector & Legend */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {onRangeChange && (
            <div className="flex items-center bg-[#FAF7F2] dark:bg-[#282323] p-0.5 rounded-lg border border-[#F5DAD6] dark:border-white/10">
              {(["7d", "30d", "6m"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRangeChange(r)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${currentRange === r
                      ? "bg-[#CF565D] text-white shadow-xs"
                      : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                    }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#CF565D]" />
              <span className="text-[#292525] dark:text-[#FAF7F2] font-medium text-[10px]">Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#292525] dark:bg-stone-500" />
              <span className="text-[#746D69] dark:text-[#A89F9A] text-[10px]">Scheduled</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Area */}
      <div className="w-full flex-1 flex flex-col justify-end pt-4 pb-1 min-w-0">
        <div className="h-44 w-full flex items-end justify-between gap-1 sm:gap-2 px-1 border-b border-[#E8D8C8]/50 dark:border-white/10 pb-2">
          {chartData.map((item, idx) => {
            const completedHeight = Math.max(8, (item.completed / maxVal) * 130);
            const otherHeight = Math.max(8, (item.other / maxVal) * 130);

            return (
              <div
                key={idx}
                className="relative flex-1 min-w-0 flex flex-col items-center justify-end h-full group cursor-pointer"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] bg-[#292525] dark:bg-[#322c2c] text-white px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-20">
                  {item.completed} completed · {item.other} scheduled
                </div>

                {/* Bars column */}
                <div className="flex items-end gap-1 w-full justify-center">
                  {/* Completed services Bar (Coral) */}
                  <div
                    style={{ height: `${completedHeight}px` }}
                    className="w-2.5 sm:w-3.5 rounded-t-sm bg-[#CF565D] hover:bg-[#B9474E] transition-all relative overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,white_25%,white_50%,transparent_50%,transparent_75%,white_75%)] bg-[length:6px_6px]" />
                  </div>

                  {/* Scheduled/Other Bar */}
                  <div
                    style={{ height: `${otherHeight}px` }}
                    className="w-2.5 sm:w-3.5 rounded-t-sm bg-[#292525] dark:bg-stone-500 hover:opacity-80 transition-all"
                  />
                </div>

                {/* Month label */}
                <span className="text-[11px] font-medium text-[#746D69] dark:text-[#A89F9A] mt-2 group-hover:text-[#CF565D] transition-colors truncate">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>

        {/* Chart Subtext / Metric */}
        <div className="flex items-center justify-between text-[11px] text-[#746D69] dark:text-[#A89F9A] pt-3">
          <span className="truncate">Live operational metrics</span>
          <span className="font-semibold text-[#292525] dark:text-[#FAF7F2] shrink-0">UAE Standard Time</span>
        </div>
      </div>
    </div>
  );
}
