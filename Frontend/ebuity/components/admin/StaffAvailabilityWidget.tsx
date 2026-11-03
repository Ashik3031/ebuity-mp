import React from "react";
import { StaffAvailabilitySummary } from "../../lib/api-client";
import { Users, UserCheck, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StaffAvailabilityWidgetProps {
  summary: StaffAvailabilitySummary;
}

export function StaffAvailabilityWidget({ summary }: StaffAvailabilityWidgetProps) {
  const total = summary.totalStaff || 1;
  const onDuty = summary.onDutyToday || 0;
  const onDutyPct = Math.round((onDuty / total) * 100);

  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2]">Staff Availability</h3>
            <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
              Daily therapist roster & field capacity
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 flex items-center justify-center text-[#292525] dark:text-[#FAF7F2]">
            <Users className="w-4 h-4 text-[#CF565D]" />
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#292525] dark:text-[#FAF7F2]">
              {onDuty} Therapists on duty
            </span>
            <span className="text-[#746D69] dark:text-[#A89F9A]">Total active: {summary.activeStaff}</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, Math.max(8, onDutyPct))}%` }}
              className="h-full rounded-full bg-gradient-to-r from-[#CF565D] to-[#B9474E] transition-all duration-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#746D69] dark:text-[#A89F9A] mt-1.5">
            <span>{onDutyPct}% Capacity utilized</span>
            <span>{summary.onLeaveToday} on approved leave</span>
          </div>
        </div>

        {/* Quick status pills */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">{onDuty}</div>
              <div className="text-[10px] text-[#746D69] dark:text-[#A89F9A]">Available Now</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FCF4F2] dark:bg-[#CF565D]/20 text-[#CF565D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">
                {summary.activeStaff}
              </div>
              <div className="text-[10px] text-[#746D69] dark:text-[#A89F9A]">Certified Staff</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E8D8C8]/40 dark:border-white/10 flex items-center justify-between">
        <Link
          href="/admin/staff"
          className="text-xs font-semibold text-[#CF565D] hover:underline inline-flex items-center gap-1"
        >
          Manage Schedules & Leave
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
