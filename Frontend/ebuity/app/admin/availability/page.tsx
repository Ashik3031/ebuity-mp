"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  adminAvailabilityApi,
  AvailabilityConfig,
  AvailabilityBreak,
  TimeSlot,
  AvailabilityResponse,
} from "../../../lib/api-client";
import { format12Hour } from "../../../lib/booking-utils";
import {
  Clock,
  Calendar,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Coffee,
  CalendarOff,
  Sliders,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  X,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { index: 0, label: "Sunday", short: "Sun" },
  { index: 1, label: "Monday", short: "Mon" },
  { index: 2, label: "Tuesday", short: "Tue" },
  { index: 3, label: "Wednesday", short: "Wed" },
  { index: 4, label: "Thursday", short: "Thu" },
  { index: 5, label: "Friday", short: "Fri" },
  { index: 6, label: "Saturday", short: "Sat" },
];

const SLOT_INTERVAL_OPTIONS = [15, 30, 45, 60];
const BUFFER_OPTIONS = [15, 30, 45, 60];
const LEAD_TIME_OPTIONS = [1, 2, 3, 4, 6, 12, 24];
const HORIZON_OPTIONS = [7, 14, 21, 30];

// Format UAE today date as YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminAvailabilityPage() {
  const [config, setConfig] = useState<AvailabilityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Notification message
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // New break and holiday input draft
  const [newBreak, setNewBreak] = useState<AvailabilityBreak>({
    start: "13:00",
    end: "14:00",
    label: "Lunch & Sanitation Break",
  });
  const [newHolidayDate, setNewHolidayDate] = useState("");

  // Live Simulator state
  const [simDate, setSimDate] = useState(getTodayString());
  const [simDuration, setSimDuration] = useState(60);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<AvailabilityResponse | null>(null);

  // Load current configuration
  const loadConfig = useCallback(async () => {
    try {
      const res = await adminAvailabilityApi.getConfig();
      if (res.success && res.config) {
        setConfig(res.config);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load availability settings.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Run slot simulation
  const runSimulation = useCallback(
    async (date: string, duration: number) => {
      setSimLoading(true);
      try {
        const res = await adminAvailabilityApi.simulateSlots({
          date,
          duration,
        });
        setSimResult(res);
      } catch (err: unknown) {
        setSimResult(null);
      } finally {
        setSimLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!loading && config) {
      runSimulation(simDate, simDuration);
    }
  }, [loading, config, simDate, simDuration, runSimulation]);

  // Handle Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setMessage(null);
    loadConfig();
    runSimulation(simDate, simDuration);
  };

  // Day toggle handler
  const handleToggleDay = (dayIdx: number) => {
    if (!config) return;
    const current = config.activeDaysOfWeek || [];
    const next = current.includes(dayIdx)
      ? current.filter((d) => d !== dayIdx)
      : [...current, dayIdx].sort((a, b) => a - b);

    setConfig({ ...config, activeDaysOfWeek: next });
  };

  // Add break handler
  const handleAddBreak = () => {
    if (!config) return;
    if (!newBreak.start || !newBreak.end) {
      setMessage({ type: "error", text: "Please enter break start and end times." });
      return;
    }
    const updatedBreaks = [...(config.breaks || []), { ...newBreak }];
    setConfig({ ...config, breaks: updatedBreaks });
    setNewBreak({
      start: "15:00",
      end: "15:30",
      label: "Afternoon Rest Period",
    });
  };

  // Remove break handler
  const handleRemoveBreak = (index: number) => {
    if (!config) return;
    const updated = (config.breaks || []).filter((_, i) => i !== index);
    setConfig({ ...config, breaks: updated });
  };

  // Add holiday handler
  const handleAddHoliday = () => {
    if (!config || !newHolidayDate) return;
    if (config.holidays?.includes(newHolidayDate)) {
      setMessage({ type: "error", text: "This date is already marked as a holiday closure." });
      return;
    }
    const updated = [...(config.holidays || []), newHolidayDate].sort();
    setConfig({ ...config, holidays: updated });
    setNewHolidayDate("");
  };

  // Remove holiday handler
  const handleRemoveHoliday = (dateStr: string) => {
    if (!config) return;
    const updated = (config.holidays || []).filter((d) => d !== dateStr);
    setConfig({ ...config, holidays: updated });
  };

  // Save Config handler
  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);

    // Validate times
    if (config.workingHours.start >= config.workingHours.end) {
      setMessage({
        type: "error",
        text: "Working hours start time must be earlier than the end time.",
      });
      setSaving(false);
      return;
    }

    try {
      const res = await adminAvailabilityApi.updateConfig({
        workingHours: config.workingHours,
        slotIntervalMinutes: Number(config.slotIntervalMinutes),
        bufferMinutes: Number(config.bufferMinutes),
        breaks: config.breaks,
        maxConcurrentBookings: Number(config.maxConcurrentBookings),
        leadTimeHours: Number(config.leadTimeHours),
        maxAdvanceDays: Number(config.maxAdvanceDays),
        holidays: config.holidays,
        activeDaysOfWeek: config.activeDaysOfWeek,
        isActive: config.isActive,
      });

      if (res.success) {
        setConfig(res.config);
        setMessage({
          type: "success",
          text: "Availability and operating settings saved successfully.",
        });
        runSimulation(simDate, simDuration);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save availability settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group slots by period
  const groupedSlots = useMemo(() => {
    if (!simResult?.slots) return { morning: [], afternoon: [], evening: [] };
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    simResult.slots.forEach((s: TimeSlot) => {
      if (s.period === "morning") morning.push(s);
      else if (s.period === "afternoon") afternoon.push(s);
      else evening.push(s);
    });

    return { morning, afternoon, evening };
  }, [simResult]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-[#E8D8C8] text-center max-w-7xl mx-auto">
        <Loader2 className="w-8 h-8 text-[#CF565D] animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#746D69] uppercase tracking-wider">
          Loading Operating Hours & Availability Engine...
        </p>
      </div>
    );
  }

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
            <span className="text-[#292525]">Availability & Hours</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292525] flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#CF565D]" />
            Operating Hours & Availability Rules
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Configure working shifts, safety buffers, advance notice limits, breaks, and preview bookable slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#746D69] bg-white border border-[#E8D8C8] rounded-xl hover:bg-[#FAF7F2] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#CF565D]" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#CF565D] hover:bg-[#b8454b] rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Availability Rules
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
          )}
          <div className="flex-1 text-xs font-medium">{message.text}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Left, Live Simulator Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: AVAILABILITY RULES FORM (7 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Operating Days & Working Hours */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
            <h2 className="text-sm font-serif font-bold text-[#292525] flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-[#CF565D]" />
              Working Days & Daily Hours (UAE Time)
            </h2>
            <p className="text-xs text-[#746D69] mb-4">
              Select the active operating days and standard shift hours for Rose Essence mobile concierge.
            </p>

            {/* Operating Days Pills */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#292525] block mb-2">
                Active Days of Week
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isActive = config?.activeDaysOfWeek?.includes(day.index);
                  return (
                    <button
                      key={day.index}
                      type="button"
                      onClick={() => handleToggleDay(day.index)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#CF565D] text-white border-[#CF565D] shadow-sm"
                          : "bg-[#FAF7F2] text-[#746D69] border-[#E8D8C8] hover:bg-white"
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-mono">{day.short}</span>
                      <span className="text-[11px] font-bold mt-0.5 block">
                        {isActive ? "On" : "Off"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Working Hours Start & End */}
            <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-[#E8D8C8]">
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Fleet Service Starts
                </label>
                <input
                  type="time"
                  value={config?.workingHours?.start || "09:00"}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      workingHours: {
                        ...config.workingHours,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Fleet Service Ends
                </label>
                <input
                  type="time"
                  value={config?.workingHours?.end || "21:00"}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      workingHours: {
                        ...config.workingHours,
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Slots, Buffers & Advance Horizon */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
            <h2 className="text-sm font-serif font-bold text-[#292525] flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-[#CF565D]" />
              Slot Intervals, Buffers & Horizon
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot Interval */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Slot Start Interval
                </label>
                <select
                  value={config?.slotIntervalMinutes || 30}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      slotIntervalMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                >
                  {SLOT_INTERVAL_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      Every {mins} Minutes
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#746D69] mt-1">
                  Time gap between each generated potential slot start.
                </p>
              </div>

              {/* Travel & Sanitation Buffer */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Safety & Travel Buffer
                </label>
                <select
                  value={config?.bufferMinutes || 30}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      bufferMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                >
                  {BUFFER_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins} Minutes buffer
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#746D69] mt-1">
                  Enforces transit, room prep, and equipment sanitization time.
                </p>
              </div>

              {/* Lead Time (Advance Notice) */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Minimum Advance Notice
                </label>
                <select
                  value={config?.leadTimeHours || 2}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      leadTimeHours: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                >
                  {LEAD_TIME_OPTIONS.map((hrs) => (
                    <option key={hrs} value={hrs}>
                      {hrs} {hrs === 1 ? "Hour" : "Hours"} notice required
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#746D69] mt-1">
                  Prevents same-day bookings scheduled within this threshold.
                </p>
              </div>

              {/* Booking Window Horizon */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Booking Window Horizon
                </label>
                <select
                  value={config?.maxAdvanceDays || 30}
                  onChange={(e) =>
                    config &&
                    setConfig({
                      ...config,
                      maxAdvanceDays: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                >
                  {HORIZON_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      Up to {days} Days in advance
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#746D69] mt-1">
                  Maximum forward calendar reach for client scheduling (max 30 days).
                </p>
              </div>

              {/* Simultaneous Appointments Capacity */}
              <div className="sm:col-span-2 pt-2 border-t border-[#E8D8C8]">
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Maximum Concurrent Appointments (Fleet Capacity)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={config?.maxConcurrentBookings || 3}
                    onChange={(e) =>
                      config &&
                      setConfig({
                        ...config,
                        maxConcurrentBookings: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-24 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                  />
                  <span className="text-xs text-[#746D69]">
                    Maximum parallel bookings permitted before a slot is marked fully booked.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Breaks and Rest Periods */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
            <h2 className="text-sm font-serif font-bold text-[#292525] flex items-center gap-2 mb-2">
              <Coffee className="w-4 h-4 text-[#CF565D]" />
              Therapist Breaks & Disinfection Periods
            </h2>
            <p className="text-xs text-[#746D69] mb-4">
              Slots starting or overlapping with these intervals will be blocked across the fleet.
            </p>

            {/* Existing Breaks List */}
            <div className="space-y-2 mb-4">
              {(config?.breaks || []).length === 0 ? (
                <p className="text-xs italic text-[#746D69] py-2">
                  No breaks currently defined.
                </p>
              ) : (
                config?.breaks?.map((brk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-[#F5DAD6] text-[#CF565D] flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#292525]">
                          {brk.label || "Break Period"}
                        </span>
                        <span className="text-xs font-mono text-[#746D69] ml-2">
                          {brk.start} — {brk.end}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBreak(idx)}
                      className="p-1 text-[#746D69] hover:text-red-600 rounded-lg hover:bg-white"
                      title="Remove break"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Break Input Form */}
            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8] space-y-2.5">
              <span className="text-[11px] font-semibold text-[#292525] block">
                Add New Break Interval:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="time"
                  value={newBreak.start}
                  onChange={(e) =>
                    setNewBreak((p) => ({ ...p, start: e.target.value }))
                  }
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E8D8C8] rounded-lg text-[#292525]"
                />
                <input
                  type="time"
                  value={newBreak.end}
                  onChange={(e) =>
                    setNewBreak((p) => ({ ...p, end: e.target.value }))
                  }
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E8D8C8] rounded-lg text-[#292525]"
                />
                <input
                  type="text"
                  value={newBreak.label}
                  onChange={(e) =>
                    setNewBreak((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="e.g. Afternoon Rest"
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#E8D8C8] rounded-lg text-[#292525]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddBreak}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#CF565D] bg-white border border-[#CF565D]/30 rounded-lg hover:bg-[#F5DAD6]/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Break
              </button>
            </div>
          </div>

          {/* Card 4: Holidays and Business Closures */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm">
            <h2 className="text-sm font-serif font-bold text-[#292525] flex items-center gap-2 mb-2">
              <CalendarOff className="w-4 h-4 text-[#CF565D]" />
              Public Holidays & Scheduled Closures
            </h2>
            <p className="text-xs text-[#746D69] mb-4">
              All bookings will be suspended on these dates (e.g. UAE National Day, Eid holidays).
            </p>

            {/* List of holidays */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(config?.holidays || []).length === 0 ? (
                <p className="text-xs italic text-[#746D69]">No holiday closures scheduled.</p>
              ) : (
                config?.holidays?.map((hDate) => (
                  <span
                    key={hDate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-mono text-[#292525]"
                  >
                    <Calendar className="w-3 h-3 text-[#CF565D]" />
                    {hDate}
                    <button
                      onClick={() => handleRemoveHoliday(hDate)}
                      className="hover:text-red-600 p-0.5 rounded"
                      title="Remove closure"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Holiday */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
              />
              <button
                type="button"
                onClick={handleAddHoliday}
                disabled={!newHolidayDate}
                className="px-3 py-2 text-xs font-semibold text-white bg-[#292525] hover:bg-black rounded-xl disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Closure Date
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: LIVE REAL-TIME SLOT SIMULATOR (5 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF565D] bg-[#F5DAD6] px-2 py-0.5 rounded-full">
                  Live Engine
                </span>
                <h2 className="text-base font-serif font-bold text-[#292525] mt-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#CF565D]" />
                  Slot Generation Simulator
                </h2>
              </div>
              {simLoading && <Loader2 className="w-4 h-4 text-[#CF565D] animate-spin" />}
            </div>

            {/* Provisional Badge Note */}
            <div className="mt-3.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                  Provisional Business Availability Slots
                </strong>
                <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                  Slots are generated using operational hours, travel buffers ({config?.bufferMinutes}m), and fleet capacity. Staff management automatically matches eligible therapists to confirmed bookings.
                </span>
              </div>
            </div>

            {/* Simulator Controls */}
            <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]">
              <div>
                <label className="text-[11px] font-semibold text-[#292525] block mb-1">
                  Simulation Date
                </label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E8D8C8] rounded-lg text-[#292525]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#292525] block mb-1">
                  Service Duration
                </label>
                <select
                  value={simDuration}
                  onChange={(e) => setSimDuration(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E8D8C8] rounded-lg text-[#292525]"
                >
                  <option value={30}>30 min (Express)</option>
                  <option value={60}>60 min (Standard)</option>
                  <option value={90}>90 min (Deluxe)</option>
                  <option value={120}>120 min (Ritual Combo)</option>
                </select>
              </div>
            </div>

            {/* Simulator Results Summary */}
            {simResult && (
              <div className="mt-3.5 flex items-center justify-between text-xs py-2 px-3 bg-white rounded-xl border border-[#E8D8C8]">
                <span className="text-[#746D69]">Available / Total:</span>
                <span className="font-bold text-[#292525]">
                  <span className="text-emerald-600">{simResult.availableSlotsCount} bookable</span>{" "}
                  / {simResult.slots.length} generated
                </span>
              </div>
            )}

            {/* Slots List by Period */}
            <div className="mt-4 space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
              {simResult?.message && !simResult.slots.length && (
                <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8] text-center text-xs text-[#746D69]">
                  {simResult.message}
                </div>
              )}

              {/* Morning Slots */}
              {groupedSlots.morning.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#746D69] tracking-wider mb-2">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Morning
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {groupedSlots.morning.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || (slot.isAvailable ? "Available" : "Unavailable")}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Available" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon Slots */}
              {groupedSlots.afternoon.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#746D69] tracking-wider mb-2">
                    <Sunset className="w-3.5 h-3.5 text-orange-500" /> Afternoon
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {groupedSlots.afternoon.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || (slot.isAvailable ? "Available" : "Unavailable")}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Available" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evening Slots */}
              {groupedSlots.evening.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[#746D69] tracking-wider mb-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" /> Evening
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {groupedSlots.evening.map((slot, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-center border text-xs font-mono transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200 opacity-60"
                        }`}
                        title={slot.reason || (slot.isAvailable ? "Available" : "Unavailable")}
                      >
                        <div className="font-bold">{format12Hour(slot.time)}</div>
                        <div className="text-[9px] mt-0.5 truncate">
                          {slot.isAvailable ? "Available" : slot.reason || "Blocked"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Links Footer */}
            <div className="mt-5 pt-3 border-t border-[#E8D8C8] flex items-center justify-between text-xs">
              <Link
                href="/admin/service-zones"
                className="text-[#746D69] hover:text-[#CF565D] flex items-center gap-1"
              >
                Service Zones <ChevronRight className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/calendar"
                className="text-[#CF565D] font-semibold hover:underline flex items-center gap-1"
              >
                Calendar View <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
