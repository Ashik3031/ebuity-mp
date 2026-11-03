"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  adminAvailabilityApi,
  AvailabilityConfig,
  AvailabilityResponse,
  TimeSlot,
} from "../../../lib/api-client";
import { format12Hour } from "../../../lib/booking-utils";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Info,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CalendarOff,
  MapPin,
  RefreshCw,
  Building,
} from "lucide-react";

// Generate next 14 calendar dates
function generateUpcomingDates(startDate: Date, count: number = 14) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNumber = d.getDate();
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    const dayOfWeek = d.getDay(); // 0: Sun ... 6: Sat
    dates.push({ dateStr, dayName, dayNumber, monthName, dayOfWeek, rawDate: d });
  }
  return dates;
}

export default function AdminCalendarPage() {
  const [currentStart, setCurrentStart] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedDuration, setSelectedDuration] = useState(60);

  const [config, setConfig] = useState<AvailabilityConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsData, setSlotsData] = useState<AvailabilityResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upcomingDays = useMemo(() => {
    return generateUpcomingDates(currentStart, 14);
  }, [currentStart]);

  // Load config
  const loadConfig = useCallback(async () => {
    try {
      const res = await adminAvailabilityApi.getConfig();
      if (res.success && res.config) {
        setConfig(res.config);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load availability config");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Load slots for selected date
  const loadSlots = useCallback(async (date: string, duration: number) => {
    setSlotsLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminAvailabilityApi.simulateSlots({
        date,
        duration,
      });
      setSlotsData(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate slots for selected date");
      setSlotsData(null);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDateStr) {
      loadSlots(selectedDateStr, selectedDuration);
    }
  }, [selectedDateStr, selectedDuration, loadSlots]);

  const handlePrevDays = () => {
    const prev = new Date(currentStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentStart(prev);
  };

  const handleNextDays = () => {
    const next = new Date(currentStart);
    next.setDate(next.getDate() + 7);
    setCurrentStart(next);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentStart(now);
    setSelectedDateStr(now.toISOString().split("T")[0]);
  };

  // Group slots
  const groupedSlots = useMemo(() => {
    if (!slotsData?.slots) return { morning: [], afternoon: [], evening: [] };
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slotsData.slots.forEach((s: TimeSlot) => {
      if (s.period === "morning") morning.push(s);
      else if (s.period === "afternoon") afternoon.push(s);
      else evening.push(s);
    });

    return { morning, afternoon, evening };
  }, [slotsData]);

  const isHoliday = config?.holidays?.includes(selectedDateStr);
  const selectedDayObj = upcomingDays.find((d) => d.dateStr === selectedDateStr);
  const isOperatingDay =
    selectedDayObj != null && config?.activeDaysOfWeek?.includes(selectedDayObj.dayOfWeek);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#746D69] mb-1">
            <Link href="/admin" className="hover:text-[#CF565D] transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span>Bookings</span>
            <span>/</span>
            <span className="text-[#292525]">Calendar Schedule</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292525] flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-[#CF565D]" />
            Calendar & Operational Slot Schedule
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            View booking slots, holiday closures, and fleet capacity day-by-day across the UAE service window.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToday}
            className="px-3 py-2 text-xs font-semibold text-[#746D69] bg-white border border-[#E8D8C8] rounded-xl hover:bg-[#FAF7F2] transition-all"
          >
            Today
          </button>
          <Link
            href="/admin/availability"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#CF565D] hover:bg-[#b8454b] rounded-xl shadow-sm transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            Edit Availability Rules
          </Link>
        </div>
      </div>

      {/* Provisional Slots Notice */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="text-amber-950 font-bold block mb-0.5">
            Provisional Business Availability Slots
          </strong>
          All slots generated below reflect fleet operating hours ({config?.workingHours?.start || "09:00"} –{" "}
          {config?.workingHours?.end || "21:00"}), travel & sanitation buffers ({config?.bufferMinutes || 30}m), and maximum concurrent appointment limits ({config?.maxConcurrentBookings || 3}). Staff assignments and therapist skills are dynamically paired when bookings are accepted.
        </div>
      </div>

      {/* Date Strip Navigator */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-serif font-bold text-[#292525]">
              Select Service Date
            </h2>
            <span className="text-xs text-[#746D69]">
              ({upcomingDays[0]?.monthName} {upcomingDays[0]?.dayNumber} –{" "}
              {upcomingDays[upcomingDays.length - 1]?.monthName}{" "}
              {upcomingDays[upcomingDays.length - 1]?.dayNumber})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevDays}
              className="p-1.5 rounded-lg border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69]"
              title="Previous 7 days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextDays}
              className="p-1.5 rounded-lg border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69]"
              title="Next 7 days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scrollable date pills */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 overflow-x-auto pb-1">
          {upcomingDays.map((d) => {
            const isSelected = d.dateStr === selectedDateStr;
            const isDayHoliday = config?.holidays?.includes(d.dateStr);
            const isDayActive = config?.activeDaysOfWeek?.includes(d.dayOfWeek);

            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDateStr(d.dateStr)}
                className={`py-2.5 px-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-w-[58px] ${
                  isSelected
                    ? "bg-[#CF565D] text-white border-[#CF565D] shadow-md"
                    : isDayHoliday
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : !isDayActive
                    ? "bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-[#FAF7F2] text-[#292525] border-[#E8D8C8] hover:bg-white hover:border-[#CF565D]"
                }`}
              >
                <span className={`text-[10px] uppercase font-mono ${isSelected ? "text-white/80" : "text-[#746D69]"}`}>
                  {d.dayName}
                </span>
                <span className="text-base font-bold my-0.5">{d.dayNumber}</span>
                <span className={`text-[9px] ${isSelected ? "text-white/90" : "text-[#746D69]"}`}>
                  {isDayHoliday ? "Closure" : !isDayActive ? "Off" : d.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Details & Slot Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Day Details & Duration Picker (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
            <h3 className="text-sm font-serif font-bold text-[#292525] mb-3">
              Selected Day Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8D8C8]">
                <span className="text-[#746D69]">Date:</span>
                <span className="font-mono font-bold text-[#292525]">{selectedDateStr}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E8D8C8]">
                <span className="text-[#746D69]">Operational Status:</span>
                {isHoliday ? (
                  <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    Holiday Closure
                  </span>
                ) : !isOperatingDay ? (
                  <span className="font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    Weekly Off Day
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Open & Operating
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E8D8C8]">
                <span className="text-[#746D69]">Fleet Hours:</span>
                <span className="font-mono text-[#292525]">
                  {config?.workingHours?.start || "09:00"} – {config?.workingHours?.end || "21:00"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E8D8C8]">
                <span className="text-[#746D69]">Buffer between Appointments:</span>
                <span className="font-semibold text-[#292525]">
                  {config?.bufferMinutes || 30} Minutes
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#746D69]">Fleet Parallel Capacity:</span>
                <span className="font-semibold text-[#292525]">
                  {config?.maxConcurrentBookings || 3} Appointments
                </span>
              </div>
            </div>

            {/* Test Duration Selector */}
            <div className="mt-5 pt-4 border-t border-[#E8D8C8]">
              <label className="text-xs font-semibold text-[#292525] block mb-2">
                Simulate Appointment Duration:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSelectedDuration(dur)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedDuration === dur
                        ? "bg-[#292525] text-white border-[#292525]"
                        : "bg-[#FAF7F2] text-[#746D69] border-[#E8D8C8] hover:bg-white"
                    }`}
                  >
                    {dur} Minutes
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8D8C8] text-xs text-[#746D69] space-y-2.5">
            <div className="font-semibold text-[#292525] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#CF565D]" /> Coverage & Logistics
            </div>
            <p>
              Looking to expand serviced communities or update dispatch boundary identifiers?
            </p>
            <Link
              href="/admin/service-zones"
              className="text-[#CF565D] font-semibold hover:underline block"
            >
              Manage Service Zones →
            </Link>
          </div>
        </div>

        {/* Right: Slot Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8] mb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-[#292525]">
                Bookable Slots Preview
              </h3>
              <p className="text-xs text-[#746D69] mt-0.5">
                {selectedDateStr} • {selectedDuration} min service session
              </p>
            </div>

            {slotsData && (
              <div className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                {slotsData.availableSlotsCount} of {slotsData.slots.length} Slots Available
              </div>
            )}
          </div>

          {slotsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-[#CF565D] animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#746D69]">Calculating available slots...</p>
            </div>
          ) : isHoliday ? (
            <div className="py-12 text-center">
              <CalendarOff className="w-10 h-10 text-red-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-red-700">Scheduled Holiday Closure</h4>
              <p className="text-xs text-[#746D69] mt-1 max-w-sm mx-auto">
                No slots generated. Rose Essence fleet is closed on this date.
              </p>
            </div>
          ) : !isOperatingDay ? (
            <div className="py-12 text-center">
              <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-[#292525]">Non-Operating Day</h4>
              <p className="text-xs text-[#746D69] mt-1 max-w-sm mx-auto">
                Fleet is not configured to operate on this day of the week.
              </p>
            </div>
          ) : slotsData?.slots.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#746D69]">
              {slotsData?.message || "No slots generated for this configuration."}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Morning */}
              {groupedSlots.morning.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-2.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Morning Sessions
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {groupedSlots.morning.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:shadow-sm"
                            : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || "Available"}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Open" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon */}
              {groupedSlots.afternoon.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-2.5">
                    <Sunset className="w-3.5 h-3.5 text-orange-500" /> Afternoon Sessions
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {groupedSlots.afternoon.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:shadow-sm"
                            : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || "Available"}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Open" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evening */}
              {groupedSlots.evening.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-2.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" /> Evening Sessions
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {groupedSlots.evening.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:shadow-sm"
                            : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || "Available"}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Open" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
