import React from "react";
import { UpcomingAppointment } from "../../lib/api-client";
import { StatusBadge } from "./StatusBadge";
import { Calendar, Clock, MapPin, User, ChevronRight } from "lucide-react";
import Link from "next/link";

interface UpcomingAppointmentsWidgetProps {
  appointments: UpcomingAppointment[];
}

export function UpcomingAppointmentsWidget({
  appointments,
}: UpcomingAppointmentsWidgetProps) {
  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2]">Upcoming services</h3>
            <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
              Next scheduled at-home treatments
            </p>
          </div>
          <Link
            href="/admin/calendar"
            className="text-xs font-semibold text-[#CF565D] hover:underline inline-flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {(!appointments || appointments.length === 0) ? (
            <div className="text-center py-6 text-[#746D69] dark:text-[#A89F9A] text-xs">
              <Calendar className="w-6 h-6 mx-auto mb-1.5 text-[#CF565D]/60" />
              No upcoming appointments today.
            </div>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 hover:border-[#CF565D]/40 transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-[#292525] dark:text-[#FAF7F2] line-clamp-1">
                    {apt.serviceName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={apt.status} size="sm" />
                    {apt.staffAssignmentStatus &&
                      apt.staffAssignmentStatus !== "unassigned" &&
                      apt.status !== "completed" &&
                      apt.status !== "cancelled" && (
                        <StatusBadge status={apt.staffAssignmentStatus} size="sm" />
                      )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#746D69] dark:text-[#A89F9A]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#CF565D]" />
                    <span className="text-[#292525] dark:text-[#FAF7F2] font-medium">{apt.clientName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#746D69] dark:text-[#A89F9A]" />
                    <span>{apt.time}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#746D69] dark:text-[#A89F9A] pt-1 border-t border-[#E8D8C8]/40 dark:border-white/10">
                  <span className="flex items-center gap-1 truncate max-w-[160px]">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    {apt.location}
                  </span>
                  <span className="font-medium text-[#292525] dark:text-[#FAF7F2]">
                    Therapist: {apt.staff}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-[#E8D8C8]/40 dark:border-white/10 flex items-center justify-between text-[11px] text-[#746D69] dark:text-[#A89F9A]">
        <span>Auto-dispatch system active</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">● Operational</span>
      </div>
    </div>
  );
}
