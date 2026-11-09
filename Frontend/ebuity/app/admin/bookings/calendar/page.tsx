"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  adminBookingApi,
  ApiError,
} from "../../../../lib/api-client";
import { Booking } from "../../../../types/booking";
import { formatBookingTime } from "../../../../lib/booking-utils";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { BookingDetailDrawer } from "../../../../components/admin/BookingDetailDrawer";
import { ReassignStaffModal } from "../../../../components/admin/ReassignStaffModal";
import { BookingStatusModal } from "../../../../components/admin/BookingStatusModal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  User,
  RotateCcw,
  RefreshCw,
  Table as TableIcon,
  Info,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../../lib/realtime-socket";

type CalendarViewMode = "month" | "week" | "day";

export default function BookingCalendarPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers
  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [reassignModalBooking, setReassignModalBooking] = useState<Booking | null>(null);
  const [statusModalBooking, setStatusModalBooking] = useState<Booking | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load Bookings across fleet
  const fetchAllBookings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      // Fetch up to 100 bookings to populate the calendar
      const res = await adminBookingApi.getAll({ limit: 100 });
      if (res.success && Array.isArray(res.bookings)) {
        setBookings(res.bookings);
      } else {
        setBookings([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load calendar bookings";
      if (!isSilent) setError(msg);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "admin",
  });

  useRealtimeEvent(
    "booking:updated",
    (data: any) => {
      const updated = data?.booking || data;
      if (updated?._id) {
        setBookings((prev) =>
          prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b))
        );
        setDrawerBooking((prev) => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
      }
      fetchAllBookings(true);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "booking:status_changed",
    (data: any) => {
      const updated = data?.booking || data;
      if (updated?._id) {
        setBookings((prev) =>
          prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b))
        );
        setDrawerBooking((prev) => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
      }
      fetchAllBookings(true);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "booking:created",
    (data: any) => {
      const newBooking = data?.booking || data;
      if (newBooking?._id) {
        setBookings((prev) => {
          if (prev.some((b) => b._id === newBooking._id)) return prev;
          return [newBooking, ...prev];
        });
      }
      fetchAllBookings(true);
    },
    { role: "admin" }
  );

  // Date Navigation
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper formatting
  const formatTime = (timeOrIso?: string, booking?: Partial<Booking>) => {
    return formatBookingTime(timeOrIso, booking);
  };

  // Status Color Mapper
  const getStatusStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "on_the_way" || s === "on-the-way" || s === "driving") {
      return "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400/40";
    }
    if (s === "arrived") {
      return "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100";
    }
    if (s === "in_progress" || s === "in-progress") {
      return "bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100 ring-1 ring-purple-400/40";
    }
    if (s === "accepted") {
      return "bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100";
    }
    if (s === "assigned") {
      return "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100";
    }
    if (s === "confirmed") {
      return "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100";
    }
    if (s === "pending") {
      return "bg-[#FCF4F2] text-[#CF565D] border-[#F5DAD6] hover:bg-[#F5DAD6]/50";
    }
    if (s === "completed") {
      return "bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200";
    }
    if (s === "cancelled") {
      return "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100";
    }
    return "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100";
  };

  // --- Compute Days for Month View ---
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ dayNum, dateStr, isCurrentMonth: false, raw: d });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ dayNum, dateStr, isCurrentMonth: true, raw: d });
    }

    // Next month padding (up to multiple of 7)
    const remainder = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainder; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ dayNum, dateStr, isCurrentMonth: false, raw: d });
    }

    return days;
  }, [currentDate]);

  // --- Compute Days for Week View ---
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay(); // 0: Sun
    start.setDate(start.getDate() - day); // Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      days.push({ dateStr, dayName, dayNum, raw: d });
    }
    return days;
  }, [currentDate]);

  // Map bookings by date string YYYY-MM-DD
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const d = b.scheduledDate;
      if (d) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(b);
      }
    });
    return map;
  }, [bookings]);

  // Header Title
  const headerDateLabel = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first?.raw.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${last?.raw.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    return currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [currentDate, viewMode, weekDays]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#746D69] mb-1">
            <Link href="/admin/bookings" className="hover:text-[#CF565D] transition-colors">
              Bookings
            </Link>
            <span>/</span>
            <span className="text-[#292525] font-medium">Calendar</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292525] flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-[#CF565D]" />
            Booking Calendar & Dispatch Schedule
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Visualize scheduled at-home services, therapist workloads, and appointment timings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch to Table */}
          <Link
            href="/admin/bookings"
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] text-xs font-semibold hover:border-[#CF565D]/40 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table View
          </Link>

          {/* View Mode Switcher */}
          <div className="bg-[#FAF7F2] p-1 rounded-2xl border border-[#E8D8C8] flex items-center">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${viewMode === mode
                    ? "bg-[#CF565D] text-white shadow-sm"
                    : "text-[#746D69] hover:text-[#292525]"
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Real-time Dispatch Live Badge (replaces manual refresh) */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white border border-[#E8D8C8] text-xs font-semibold shadow-sm"
            title={
              isRealtimeConnected
                ? "Live dispatch active: appointments and therapist statuses sync instantly"
                : "Connecting to real-time service..."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
            />
            <span className={isRealtimeConnected ? "text-emerald-700" : "text-amber-700"}>
              {isRealtimeConnected ? "Live Dispatch" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Date Navigator Bar */}
      <div className="bg-white rounded-3xl p-4 border border-[#E8D8C8]/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69] hover:text-[#292525] transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69] hover:text-[#292525] transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-[#FAF7F2] transition-colors"
          >
            Today
          </button>

          <h2 className="text-base font-serif font-bold text-[#292525] ml-2">
            {headerDateLabel}
          </h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-[#746D69]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Accepted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>On The Way</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Arrived</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CF565D]" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Safety Notice: Drag and Drop Guard */}
      <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center gap-2.5 text-xs text-[#746D69]">
        <Info className="w-4 h-4 text-[#CF565D] flex-shrink-0" />
        <span>
          <strong className="text-[#292525]">Fleet Protection Guard: </strong>
          Drag-and-drop rescheduling is restricted to preserve strict 30-minute travel buffers,
          sanitation intervals, and staff skill qualifications. Click any appointment to view details or reassign.
        </span>
      </div>

      {/* Calendar View Body */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-sm overflow-hidden p-4">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#CF565D] animate-spin mx-auto" />
            <p className="text-xs text-[#746D69]">Loading appointment schedule...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-[#292525]">Failed to Load Calendar</p>
            <p className="text-xs text-[#746D69]">{error}</p>
            <button
              onClick={() => fetchAllBookings()}
              className="mt-2 px-4 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : viewMode === "month" ? (
          /* ================= Month View ================= */
          <div className="space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#746D69] uppercase tracking-wider py-2 border-b border-[#FAF7F2]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((d, i) => {
                const dayBookings = bookingsByDate.get(d.dateStr) || [];
                const isToday = d.dateStr === todayStr;

                return (
                  <div
                    key={i}
                    className={`min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${d.isCurrentMonth
                        ? "bg-white border-[#E8D8C8]/50 hover:border-[#CF565D]/30"
                        : "bg-[#FAF7F2]/40 border-stone-100 opacity-60"
                      } ${isToday ? "ring-2 ring-[#CF565D] bg-[#F5DAD6]/10" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday
                            ? "bg-[#CF565D] text-white"
                            : d.isCurrentMonth
                              ? "text-[#292525]"
                              : "text-[#746D69]"
                          }`}
                      >
                        {d.dayNum}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-[10px] font-bold text-[#CF565D] bg-[#F5DAD6]/40 px-1.5 py-0.2 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Booking pills inside day */}
                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[75px]">
                      {dayBookings.slice(0, 3).map((bk) => {
                        const staffStatus = bk.staffAssignmentStatus;
                        const isLiveDispatch =
                          staffStatus &&
                          ["on_the_way", "arrived", "in_progress", "accepted"].includes(staffStatus) &&
                          bk.status !== "completed" &&
                          bk.status !== "cancelled";

                        const displayStatus = isLiveDispatch ? staffStatus : bk.status;
                        const labelMap: Record<string, string> = {
                          on_the_way: "Driving",
                          arrived: "Arrived",
                          in_progress: "In Progress",
                          accepted: "Accepted",
                        };

                        return (
                          <button
                            key={bk._id}
                            type="button"
                            onClick={() => setDrawerBooking(bk)}
                            className={`w-full text-left p-1.5 rounded-lg border text-[10px] font-medium transition-transform active:scale-[0.98] truncate block ${getStatusStyle(
                              displayStatus
                            )}`}
                            title={`${formatTime(bk.scheduledTime || bk.scheduledStartTime, bk)} - ${bk.customerDetails.name
                              } (${bk.status}${staffStatus ? ` | Staff: ${staffStatus.replace(/_/g, " ")}` : ""})`}
                          >
                            <span className="font-bold">{formatTime(bk.scheduledTime || bk.scheduledStartTime, bk)}</span> •{" "}
                            {bk.customerDetails.name.split(" ")[0]}
                            {isLiveDispatch && (
                              <span className="ml-1 text-[9px] font-bold uppercase tracking-wider opacity-90">
                                • {labelMap[staffStatus] || staffStatus}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {dayBookings.length > 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDate(d.raw);
                            setViewMode("day");
                          }}
                          className="text-[10px] font-semibold text-[#CF565D] hover:underline block text-center"
                        >
                          +{dayBookings.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "week" ? (
          /* ================= Week View ================= */
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((wd) => {
                const dayBookings = bookingsByDate.get(wd.dateStr) || [];
                const isToday = wd.dateStr === todayStr;

                return (
                  <div
                    key={wd.dateStr}
                    className={`rounded-2xl border flex flex-col min-h-[480px] overflow-hidden ${isToday
                        ? "border-[#CF565D] bg-[#F5DAD6]/10 shadow-sm"
                        : "border-[#E8D8C8]/60 bg-[#FAF7F2]/30"
                      }`}
                  >
                    {/* Day Column Header */}
                    <div
                      className={`p-3 text-center border-b ${isToday
                          ? "bg-[#CF565D] text-white"
                          : "bg-white border-[#E8D8C8]/60 text-[#292525]"
                        }`}
                    >
                      <p className="text-[10px] uppercase font-bold tracking-wider">
                        {wd.dayName}
                      </p>
                      <p className="text-lg font-serif font-bold mt-0.5">{wd.dayNum}</p>
                      <span className={`text-[10px] font-medium ${isToday ? "text-white/80" : "text-[#746D69]"}`}>
                        {dayBookings.length} bookings
                      </span>
                    </div>

                    {/* Bookings Stack in Week Day */}
                    <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                      {dayBookings.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-[#746D69]/60">
                          No appointments
                        </div>
                      ) : (
                        dayBookings.map((bk) => {
                          const staffStatus = bk.staffAssignmentStatus;
                          const isLiveDispatch =
                            staffStatus &&
                            ["on_the_way", "arrived", "in_progress", "accepted"].includes(staffStatus) &&
                            bk.status !== "completed" &&
                            bk.status !== "cancelled";

                          const displayStatus = isLiveDispatch ? staffStatus : bk.status;

                          return (
                            <div
                              key={bk._id}
                              onClick={() => setDrawerBooking(bk)}
                              className={`p-2.5 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${getStatusStyle(
                                displayStatus
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                                <span className="font-bold text-[11px] font-mono">
                                  {formatTime(bk.scheduledTime || bk.scheduledStartTime, bk)}
                                </span>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <StatusBadge status={bk.status} size="sm" />
                                  {isLiveDispatch && (
                                    <StatusBadge status={staffStatus} size="sm" />
                                  )}
                                </div>
                              </div>

                              <p className="font-bold text-xs truncate text-[#292525]">
                                {bk.customerDetails.name}
                              </p>

                              <p className="text-[10px] text-[#746D69] truncate mt-0.5">
                                {bk.services?.[0]?.name}
                                {bk.services.length > 1 && ` (+${bk.services.length - 1})`}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 text-[10px]">
                                <span className="truncate max-w-[100px] font-medium text-[#292525]">
                                  {bk.assignedStaff?.name || "Unassigned"}
                                </span>
                                <span className="font-bold">
                                  AED {Number(bk.totalPrice).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================= Day View ================= */
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#292525]">
                  Daily Appointment Timeline
                </h3>
                <p className="text-xs text-[#746D69]">
                  {headerDateLabel} •{" "}
                  {(bookingsByDate.get(currentDate.toISOString().split("T")[0]) || []).length}{" "}
                  scheduled appointments
                </p>
              </div>
            </div>

            {(() => {
              const dateStr = currentDate.toISOString().split("T")[0];
              const dayBookings = bookingsByDate.get(dateStr) || [];

              if (dayBookings.length === 0) {
                return (
                  <div className="py-16 text-center space-y-2 bg-[#FAF7F2]/50 rounded-2xl border border-[#E8D8C8]">
                    <Clock className="w-8 h-8 text-[#746D69] mx-auto opacity-50" />
                    <p className="text-sm font-bold text-[#292525]">No Appointments Scheduled</p>
                    <p className="text-xs text-[#746D69]">
                      There are no at-home beauty services booked on this date.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dayBookings.map((bk) => (
                    <div
                      key={bk._id}
                      className="p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm hover:border-[#CF565D]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-center p-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] min-w-[75px] flex-shrink-0">
                          <span className="text-xs font-bold text-[#CF565D] font-mono block">
                            {formatTime(bk.scheduledTime || bk.scheduledStartTime, bk)}
                          </span>
                          <span className="text-[10px] text-[#746D69]">
                            {bk.totalDurationMinutes} mins
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-[#746D69] bg-[#FAF7F2] px-2 py-0.5 rounded">
                              {bk.bookingNumber}
                            </span>
                            <StatusBadge status={bk.status} size="sm" />
                            {bk.staffAssignmentStatus &&
                              bk.staffAssignmentStatus !== "unassigned" &&
                              bk.status !== "completed" &&
                              bk.status !== "cancelled" && (
                                <StatusBadge status={bk.staffAssignmentStatus} size="sm" />
                              )}
                          </div>
                          <h4 className="text-sm font-bold text-[#292525]">
                            {bk.customerDetails.name}
                          </h4>
                          <p className="text-xs text-[#746D69]">
                            {bk.services?.map((s) => s.name).join(" • ")}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-[#746D69] pt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#CF565D]" />
                              {bk.serviceAddress?.area} ({bk.serviceAddress?.buildingName})
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-[#292525]">
                              Therapist: {bk.assignedStaff?.name || "Unassigned"}
                              {bk.staffAssignmentStatus && (
                                <span className="ml-1.5 font-normal text-[#746D69]">
                                  ({bk.staffAssignmentStatus.replace(/_/g, " ")})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#292525] block">
                            AED {Number(bk.totalPrice).toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDrawerBooking(bk)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-stone-50"
                        >
                          Details
                        </button>

                        {bk.status !== "cancelled" && bk.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => setReassignModalBooking(bk)}
                            className="px-3 py-1.5 rounded-xl border border-[#CF565D] text-[#CF565D] hover:bg-[#F5DAD6]/30 text-xs font-semibold"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Booking Details Drawer */}
      <BookingDetailDrawer
        booking={drawerBooking}
        onClose={() => setDrawerBooking(null)}
        onOpenReassign={(bk) => setReassignModalBooking(bk)}
        onOpenStatusModal={(bk) => setStatusModalBooking(bk)}
      />

      {/* Reassign Therapist Modal */}
      <ReassignStaffModal
        booking={reassignModalBooking}
        onClose={() => setReassignModalBooking(null)}
        onSuccess={(updated) => {
          setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
          if (drawerBooking?._id === updated._id) setDrawerBooking(updated);
          setReassignModalBooking(null);
          setNotification({
            type: "success",
            message: `Therapist reassigned for ${updated.bookingNumber}.`,
          });
          setTimeout(() => setNotification(null), 3500);
        }}
      />

      {/* Status Transition Modal */}
      <BookingStatusModal
        booking={statusModalBooking}
        onClose={() => setStatusModalBooking(null)}
        onSuccess={(updated) => {
          setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
          if (drawerBooking?._id === updated._id) setDrawerBooking(updated);
          setStatusModalBooking(null);
          setNotification({
            type: "success",
            message: `Status updated for ${updated.bookingNumber}.`,
          });
          setTimeout(() => setNotification(null), 3500);
        }}
      />
    </div>
  );
}
