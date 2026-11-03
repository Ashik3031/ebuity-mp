"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminStaffApi } from "../../../lib/api-client";
import { StaffScheduleItem, StaffProfile, StaffBreak, StaffScheduleException } from "../../../types/staff";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Clock,
  Calendar,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  Edit2,
  X,
  Sun,
  Coffee,
  Check,
  Building,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";

const DAYS_OF_WEEK = [
  { index: 0, label: "Sunday", short: "Sun" },
  { index: 1, label: "Monday", short: "Mon" },
  { index: 2, label: "Tuesday", short: "Tue" },
  { index: 3, label: "Wednesday", short: "Wed" },
  { index: 4, label: "Thursday", short: "Thu" },
  { index: 5, label: "Friday", short: "Fri (UAE Off)" },
  { index: 6, label: "Saturday", short: "Sat" },
];

export default function AdminStaffSchedulesPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [schedules, setSchedules] = useState<StaffScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Alert message
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Configure Schedule Modal
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Schedule Form State
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("21:00");
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([5]); // Friday default
  const [breaks, setBreaks] = useState<StaffBreak[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [scheduleExceptions, setScheduleExceptions] = useState<StaffScheduleException[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState("");
  const [newExceptionIsOff, setNewExceptionIsOff] = useState(true);
  const [newExceptionStart, setNewExceptionStart] = useState("10:00");
  const [newExceptionEnd, setNewExceptionEnd] = useState("16:00");
  const [newExceptionReason, setNewExceptionReason] = useState("");

  // Load schedules for selected date
  const loadSchedules = useCallback(
    async (targetDate = selectedDate, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await adminStaffApi.getSchedules(targetDate);
        if (res.success && Array.isArray(res.schedules)) {
          setSchedules(res.schedules);
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load schedules.",
        });
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    loadSchedules(selectedDate);
  }, [selectedDate, loadSchedules]);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "admin",
  });

  useRealtimeEvent(
    "staff:updated",
    () => {
      loadSchedules(selectedDate);
    },
    { role: "admin" }
  );

  // Open Schedule Edit Modal
  const handleOpenEdit = (staff: StaffProfile) => {
    setEditingStaff(staff);
    setValidationError(null);
    setShiftStart(staff.workingHours?.start || "09:00");
    setShiftEnd(staff.workingHours?.end || "21:00");
    setWeeklyOffDays(staff.weeklyOffDays || [5]);
    setBreaks(
      Array.isArray(staff.breaks)
        ? [...staff.breaks]
        : []
    );
    setHolidays(Array.isArray(staff.holidays) ? [...staff.holidays] : []);
    setScheduleExceptions(
      Array.isArray(staff.scheduleExceptions) ? [...staff.scheduleExceptions] : []
    );
  };

  // Real-time schedule validation
  const validateScheduleForm = (): string | null => {
    if (!shiftStart || !shiftEnd) return "Shift start and end times are required.";
    const [sH, sM] = shiftStart.split(":").map(Number);
    const [eH, eM] = shiftEnd.split(":").map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    if (startMins >= endMins) {
      return `Shift start time (${shiftStart}) must be strictly earlier than shift end time (${shiftEnd}).`;
    }

    // Validate breaks
    const sortedBreaks = [...breaks].sort((a, b) => {
      const [ah, am] = a.start.split(":").map(Number);
      const [bh, bm] = b.start.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });

    for (let i = 0; i < sortedBreaks.length; i++) {
      const brk = sortedBreaks[i];
      const [bsh, bsm] = brk.start.split(":").map(Number);
      const [beh, bem] = brk.end.split(":").map(Number);
      const bStartMins = bsh * 60 + bsm;
      const bEndMins = beh * 60 + bem;

      if (bStartMins >= bEndMins) {
        return `Break "${brk.label || i + 1}": start (${brk.start}) must be before end (${brk.end}).`;
      }
      if (bStartMins < startMins || bEndMins > endMins) {
        return `Break "${brk.label || i + 1}" (${brk.start} - ${brk.end}) falls outside working hours (${shiftStart} - ${shiftEnd}).`;
      }
      if (i < sortedBreaks.length - 1) {
        const next = sortedBreaks[i + 1];
        const [nsh, nsm] = next.start.split(":").map(Number);
        const nextStartMins = nsh * 60 + nsm;
        if (bEndMins > nextStartMins) {
          return `Break "${brk.label || "Break"}" overlaps with "${next.label || "Break"}".`;
        }
      }
    }

    return null;
  };

  // Submit Schedule Update
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const error = validateScheduleForm();
    if (error) {
      setValidationError(error);
      return;
    }

    setScheduleSubmitting(true);
    setValidationError(null);

    try {
      const res = await adminStaffApi.updateSchedule(editingStaff._id, {
        workingHours: { start: shiftStart, end: shiftEnd },
        breaks,
        weeklyOffDays,
        holidays,
        scheduleExceptions,
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: `Working schedule updated successfully for ${editingStaff.name}.`,
        });
        setEditingStaff(null);
        loadSchedules(selectedDate);
      }
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : "Failed to update schedule."
      );
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Add / Remove Breaks in Modal
  const handleAddBreak = () => {
    setBreaks([
      ...breaks,
      { start: "14:00", end: "15:00", label: "Rest Break" },
    ]);
  };

  const handleRemoveBreak = (idx: number) => {
    setBreaks(breaks.filter((_, i) => i !== idx));
  };

  // Add / Remove Holidays
  const handleAddHoliday = () => {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    setHolidays([...holidays, newHoliday]);
    setNewHoliday("");
  };

  const handleRemoveHoliday = (dateStr: string) => {
    setHolidays(holidays.filter((d) => d !== dateStr));
  };

  // Add / Remove Exception
  const handleAddException = () => {
    if (!newExceptionDate) return;
    setScheduleExceptions([
      ...scheduleExceptions,
      {
        date: newExceptionDate,
        isOff: newExceptionIsOff,
        start: newExceptionIsOff ? "" : newExceptionStart,
        end: newExceptionIsOff ? "" : newExceptionEnd,
        reason: newExceptionReason.trim() || (newExceptionIsOff ? "Temporary day off" : "Modified shift"),
      },
    ]);
    setNewExceptionDate("");
    setNewExceptionReason("");
  };

  const handleRemoveException = (idx: number) => {
    setScheduleExceptions(scheduleExceptions.filter((_, i) => i !== idx));
  };

  // Date navigations
  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Filtered schedules by therapist name
  const filteredSchedules = schedules.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.staff.name.toLowerCase().includes(q) ||
      s.staff.email.toLowerCase().includes(q) ||
      (s.staff.employeeId && s.staff.employeeId.toLowerCase().includes(q))
    );
  });

  // Calculate day summary metrics
  const targetDayOfWeek = new Date(`${selectedDate}T12:00:00Z`).getDay();
  const onDutyCount = schedules.filter((s) => {
    if (s.isOnLeave) return false;
    if (s.weeklyOffDays.includes(targetDayOfWeek)) return false;
    if (s.staff.holidays?.includes(selectedDate)) return false;
    const exc = s.staff.scheduleExceptions?.find((e) => e.date === selectedDate);
    if (exc && exc.isOff) return false;
    return true;
  }).length;

  const onLeaveCount = schedules.filter((s) => s.isOnLeave).length;
  const offDutyCount = schedules.length - onDutyCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#CF565D]/10 text-[#CF565D]">
              Admin Level 4
            </span>
            <span className="text-xs text-[#746D69] font-medium">• UAE GST (UTC+4)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-1">
            Working Schedules & Timetable
          </h1>
          <p className="text-sm text-[#746D69] mt-0.5">
            Configure shift start and end times, daily rest breaks, weekly off days, and temporary schedule exceptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Live Badge (replaces manual refresh) */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold shadow-xs"
            title={
              isRealtimeConnected
                ? "Real-time timetable sync active (Socket.IO)"
                : "Connecting to real-time service..."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={isRealtimeConnected ? "text-emerald-700" : "text-amber-700"}>
              {isRealtimeConnected ? "Live" : "Connecting..."}
            </span>
          </div>

          <Link
            href="/admin/staff"
            className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-[#CF565D]" />
            Staff Directory
          </Link>

          <Link
            href="/admin/staff-leave"
            className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <CalendarDays className="w-4 h-4 text-[#CF565D]" />
            Leave Requests
          </Link>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Active Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#292525]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {schedules.length}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Certified Therapists</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              On Duty Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 mt-2">
            {onDutyCount}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Active on shift</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Off Duty / Rest
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {offDutyCount}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Scheduled off day</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Approved Leave
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-700 mt-2">
            {onLeaveCount}
          </p>
          <span className="text-[11px] text-amber-600 mt-1 block">Vacation / Sick leave</span>
        </div>
      </div>

      {/* Date Bar & Controls */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold text-[#292525] focus:outline-none focus:border-[#CF565D]"
          />

          <button
            onClick={handleNextDay}
            className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-white transition-colors"
          >
            Today
          </button>

          <span className="text-xs font-medium text-[#746D69] hidden sm:inline ml-2">
            {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search therapist by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D] placeholder:text-[#746D69]/60 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Timetable / Schedules List */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#746D69]">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Evaluating therapist availability...
            </p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Clock className="w-10 h-10 text-[#746D69]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Schedule Data Available
            </h3>
            <p className="text-xs text-[#746D69] mt-1">
              No staff members found matching your search.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8D8C8]/40">
            {filteredSchedules.map((item) => {
              const staff = item.staff;
              const isWeeklyOff = item.weeklyOffDays.includes(targetDayOfWeek);
              const isHoliday = staff.holidays?.includes(selectedDate);
              const exception = staff.scheduleExceptions?.find(
                (e) => e.date === selectedDate
              );
              const isExceptionOff = exception && exception.isOff;

              const isWorkingToday =
                !item.isOnLeave && !isWeeklyOff && !isHoliday && !isExceptionOff;

              const shift =
                exception && exception.start && exception.end
                  ? { start: exception.start, end: exception.end }
                  : item.workingHours;

              return (
                <div
                  key={staff._id}
                  className="p-5 sm:p-6 hover:bg-[#FAF7F2]/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Staff Identity & Status Badge */}
                  <div className="flex items-start sm:items-center gap-4 min-w-[260px]">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center font-serif font-bold text-[#CF565D] overflow-hidden shrink-0">
                      {staff.profileImage ? (
                        <img
                          src={staff.profileImage}
                          alt={staff.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        staff.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-[#292525] text-sm">
                          {staff.name}
                        </h4>
                        <span className="font-mono text-[10px] bg-[#FAF7F2] border border-[#E8D8C8] px-1.5 py-0.5 rounded text-[#746D69]">
                          {staff.employeeId || "RE-STAFF"}
                        </span>
                      </div>
                      <span className="text-xs text-[#746D69] block">
                        {staff.email}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {item.isOnLeave ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            On Approved Leave
                          </span>
                        ) : isExceptionOff ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Day Off (Exception: {exception?.reason || "Special"})
                          </span>
                        ) : isHoliday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Holiday Off
                          </span>
                        ) : isWeeklyOff ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Weekly Day Off
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            On Duty ({shift.start} - {shift.end})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Shift & Timetable Visual */}
                  <div className="flex-1 max-w-xl">
                    <div className="flex items-center justify-between text-xs text-[#746D69] mb-1.5">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                        Shift: {shift.start} – {shift.end} GST
                      </span>
                      <span className="text-[11px]">
                        Breaks:{" "}
                        {item.breaks?.map((b) => `${b.start}-${b.end}`).join(", ") ||
                          "None"}
                      </span>
                    </div>

                    {/* Progress / Shift bar visualization */}
                    <div className="w-full h-3 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] relative overflow-hidden">
                      {isWorkingToday ? (
                        <div className="h-full bg-emerald-400/80 rounded-full w-full relative">
                          {/* Break notches */}
                          {item.breaks?.map((b, bIdx) => {
                            const [sh, sm] = shift.start.split(":").map(Number);
                            const [eh, em] = shift.end.split(":").map(Number);
                            const totalShift = eh * 60 + em - (sh * 60 + sm);

                            const [bsh, bsm] = b.start.split(":").map(Number);
                            const [beh, bem] = b.end.split(":").map(Number);
                            const breakStartRel = bsh * 60 + bsm - (sh * 60 + sm);
                            const breakDur = beh * 60 + bem - (bsh * 60 + bsm);

                            if (totalShift > 0 && breakStartRel >= 0) {
                              const leftPct = (breakStartRel / totalShift) * 100;
                              const widthPct = (breakDur / totalShift) * 100;
                              return (
                                <div
                                  key={bIdx}
                                  title={`${b.label}: ${b.start}-${b.end}`}
                                  style={{
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                  }}
                                  className="absolute top-0 bottom-0 bg-amber-400"
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      ) : (
                        <div className="h-full bg-rose-200/60 rounded-full w-full" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#746D69] mt-1 font-mono">
                      <span>{shift.start}</span>
                      <span className="text-[10px] italic">
                        {isWorkingToday
                          ? `${item.bookingsCount} booking(s) scheduled today`
                          : "Unavailable for assignments"}
                      </span>
                      <span>{shift.end}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      className="px-3.5 py-2 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white hover:border-[#CF565D] transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#CF565D]" />
                      Configure Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: CONFIGURE STAFF WORKING SCHEDULE
         ======================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8D8C8]/60 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider">
                  Schedule Configuration • UAE GST
                </span>
                <h2 className="text-xl font-serif font-bold text-[#292525] mt-0.5">
                  Configure Working Hours for {editingStaff.name}
                </h2>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-6">
              {/* Validation Alert */}
              {validationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Working Shift Hours */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] space-y-3">
                <span className="text-xs font-semibold text-[#292525] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#CF565D]" />
                  Standard Daily Shift Hours (Dubai Time)
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#746D69] mb-1">
                      Shift Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold text-[#292525]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#746D69] mb-1">
                      Shift End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold text-[#292525]"
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Off Days */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-2 flex items-center justify-between">
                  <span>Weekly Regular Off Days</span>
                  <span className="text-[11px] text-[#746D69]">
                    Select recurring rest days
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isOff = weeklyOffDays.includes(day.index);
                    return (
                      <label
                        key={day.index}
                        className={`p-2.5 rounded-2xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                          isOff
                            ? "border-[#CF565D] bg-[#F5DAD6]/40 text-[#292525] font-bold"
                            : "border-[#E8D8C8] bg-[#FAF7F2] text-[#746D69] hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isOff}
                          onChange={() => {
                            const next = isOff
                              ? weeklyOffDays.filter((i) => i !== day.index)
                              : [...weeklyOffDays, day.index];
                            setWeeklyOffDays(next);
                          }}
                          className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                        />
                        <span>{day.short}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Daily Breaks Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-[#292525]">
                      Daily Breaks & Rest Windows (Optional)
                    </label>
                    <span className="text-[11px] text-[#746D69]">
                      Breaks are flexible by default (chosen by staff based on free time). You can optionally configure reserved rest windows here.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBreak}
                    className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#CF565D] bg-[#FAF7F2] hover:bg-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Break
                  </button>
                </div>

                {breaks.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-center">
                    <p className="text-xs font-medium text-[#292525]">
                      Flexible Breaks (Staff Choice)
                    </p>
                    <p className="text-[11px] text-[#746D69] mt-0.5">
                      No fixed break window configured. Staff take breaks during their free time between bookings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                  {breaks.map((brk, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] flex flex-col sm:flex-row items-center gap-3"
                    >
                      <input
                        type="text"
                        placeholder="Break label (e.g. Lunch & Sanitization)"
                        value={brk.label || ""}
                        onChange={(e) => {
                          const updated = [...breaks];
                          updated[idx].label = e.target.value;
                          setBreaks(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs text-[#292525]"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={brk.start}
                          onChange={(e) => {
                            const updated = [...breaks];
                            updated[idx].start = e.target.value;
                            setBreaks(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold text-[#292525]"
                        />
                        <span className="text-xs text-[#746D69]">to</span>
                        <input
                          type="time"
                          value={brk.end}
                          onChange={(e) => {
                            const updated = [...breaks];
                            updated[idx].end = e.target.value;
                            setBreaks(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold text-[#292525]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBreak(idx)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              {/* Temporary Schedule Exceptions */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#292525]">
                    Temporary Schedule Exceptions & Custom Dates
                  </label>
                  <span className="text-[11px] text-[#746D69]">
                    Set specific dates where therapist is off-duty or works customized hours
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={newExceptionDate}
                      onChange={(e) => setNewExceptionDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-medium"
                    />
                    <select
                      value={newExceptionIsOff ? "off" : "custom"}
                      onChange={(e) => setNewExceptionIsOff(e.target.value === "off")}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-medium"
                    >
                      <option value="off">Off Duty (Full Day)</option>
                      <option value="custom">Custom Shift Hours</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Reason (e.g. Eid Extra Rest)"
                      value={newExceptionReason}
                      onChange={(e) => setNewExceptionReason(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-medium"
                    />
                  </div>

                  {!newExceptionIsOff && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#746D69]">Custom Hours:</span>
                      <input
                        type="time"
                        value={newExceptionStart}
                        onChange={(e) => setNewExceptionStart(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold"
                      />
                      <span className="text-xs text-[#746D69]">to</span>
                      <input
                        type="time"
                        value={newExceptionEnd}
                        onChange={(e) => setNewExceptionEnd(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-[#E8D8C8] text-xs font-bold"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!newExceptionDate}
                    onClick={handleAddException}
                    className="px-3 py-1.5 rounded-xl bg-[#292525] text-white text-xs font-semibold disabled:opacity-40"
                  >
                    Add Schedule Exception
                  </button>
                </div>

                {scheduleExceptions.length > 0 && (
                  <div className="space-y-1.5">
                    {scheduleExceptions.map((exc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-[#E8D8C8] bg-white flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-[#292525] font-mono mr-2">
                            {exc.date}
                          </strong>
                          <span className="text-[#746D69]">
                            {exc.isOff
                              ? `Off-duty (${exc.reason})`
                              : `Custom shift: ${exc.start} - ${exc.end} (${exc.reason})`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveException(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-md hover:bg-[#b8454c] disabled:opacity-50 flex items-center gap-2"
                >
                  {scheduleSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save Schedule Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
