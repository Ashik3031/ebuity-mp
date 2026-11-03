"use client";

import React from "react";
import { DashboardStatusDistribution } from "../../lib/api-client";
import { PieChart, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface BookingStatusDistributionWidgetProps {
  distribution?: DashboardStatusDistribution[];
  totalBookings?: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; bar: string; icon: any }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-[#CF565D]/10",
    text: "text-[#CF565D]",
    bar: "bg-[#CF565D]",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-600",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-stone-100",
    text: "text-stone-600",
    bar: "bg-stone-400",
    icon: XCircle,
  },
};

export function BookingStatusDistributionWidget({
  distribution = [],
  totalBookings = 0,
}: BookingStatusDistributionWidgetProps) {
  const displayItems =
    distribution.length > 0
      ? distribution
      : [
          { status: "confirmed", label: "Confirmed", count: 0, percentage: 0 },
          { status: "pending", label: "Pending", count: 0, percentage: 0 },
          { status: "completed", label: "Completed", count: 0, percentage: 0 },
          { status: "cancelled", label: "Cancelled", count: 0, percentage: 0 },
        ];

  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2]">Bookings by Status</h3>
            <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
              Breakdown across all treatment stages
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] text-[#CF565D] border border-[#F5DAD6] dark:border-white/10 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="h-3 w-full bg-[#FAF7F2] dark:bg-[#282323] rounded-full overflow-hidden flex mb-4 border border-[#F5DAD6]/60 dark:border-white/10">
          {displayItems.map((item) => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.confirmed;
            if (item.percentage === 0) return null;
            return (
              <div
                key={item.status}
                style={{ width: `${item.percentage}%` }}
                className={`${config.bar} transition-all duration-300`}
                title={`${item.label}: ${item.count} (${item.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Status Breakdown Rows */}
        <div className="space-y-2.5">
          {displayItems.map((item) => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.confirmed;
            const Icon = config.icon;

            return (
              <div
                key={item.status}
                className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2]/60 dark:bg-[#282323]/60 hover:bg-[#FAF7F2] dark:hover:bg-[#282323] transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-md ${config.bg} ${config.text} flex items-center justify-center`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-[#292525] dark:text-[#FAF7F2]">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-[#292525] dark:text-[#FAF7F2]">{item.count}</span>
                  <span className="text-[11px] text-[#746D69] dark:text-[#A89F9A] w-10 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 mt-3 border-t border-[#F5DAD6]/60 dark:border-white/10 flex items-center justify-between text-xs text-[#746D69] dark:text-[#A89F9A]">
        <span>Total Appointments: {totalBookings}</span>
        <Link
          href="/admin/bookings"
          className="text-[#CF565D] font-semibold hover:underline"
        >
          View Bookings →
        </Link>
      </div>
    </div>
  );
}
