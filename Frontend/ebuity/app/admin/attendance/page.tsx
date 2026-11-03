"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminStaffApi } from "../../../lib/api-client";
import { StaffAttendance, StaffProfile } from "../../../types/staff";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Clock,
  Calendar,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Edit2,
  History,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  LogIn,
  LogOut,
  Info,
} from "lucide-react";

export default function AdminAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Alert message
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Correction Modal State
  const [correctingRecord, setCorrectingRecord] =
    useState<StaffAttendance | null>(null);
  const [correctionCheckIn, setCorrectionCheckIn] = useState("");
  const [correctionCheckOut, setCorrectionCheckOut] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState("present");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Audit Trail Viewer Modal
  const [viewingAuditRecord, setViewingAuditRecord] =
    useState<StaffAttendance | null>(null);

  // Manual Attendance Entry Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState("");
  const [manualDate, setManualDate] = useState(selectedDate);
  const [manualCheckInTime, setManualCheckInTime] = useState("09:00");
  const [manualCheckOutTime, setManualCheckOutTime] = useState("18:00");
  const [manualStatus, setManualStatus] = useState("present");
  const [manualReason, setManualReason] = useState(
    "Staff forgot to check in via mobile portal"
  );
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Load Attendance Records
  const loadAttendance = useCallback(
    async (targetDate = selectedDate, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [attRes, staffRes] = await Promise.all([
          adminStaffApi.getAttendance({ date: targetDate }),
          adminStaffApi.getAllStaff({ limit: 100 }),
        ]);

        if (attRes.success && Array.isArray(attRes.records)) {
          setRecords(attRes.records);
        }
        if (staffRes.success && Array.isArray(staffRes.staff)) {
          setStaffList(staffRes.staff);
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load attendance records.",
        });
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate, loadAttendance]);

  // Open Correction Modal
  const handleOpenCorrection = (record: StaffAttendance) => {
    setCorrectingRecord(record);
    setCorrectionError(null);

    // Format ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatLocal = (d?: string) => {
      if (!d) return "";
      const date = new Date(d);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    };

    setCorrectionCheckIn(formatLocal(record.checkIn));
    setCorrectionCheckOut(formatLocal(record.checkOut));
    setCorrectionStatus(record.status || "present");
    setCorrectionNotes(record.notes || "");
    setCorrectionReason("");
  };

  // Submit Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord || !correctingRecord._id) return;

    if (!correctionReason.trim()) {
      setCorrectionError("A specific reason is mandatory for the audit trail.");
      return;
    }

    if (correctionCheckIn && correctionCheckOut) {
      if (new Date(correctionCheckOut) < new Date(correctionCheckIn)) {
        setCorrectionError("Check-out timestamp cannot be earlier than check-in.");
        return;
      }
    }

    setCorrectionSubmitting(true);
    setCorrectionError(null);

    try {
      const res = await adminStaffApi.correctAttendance(correctingRecord._id, {
        checkIn: correctionCheckIn ? new Date(correctionCheckIn).toISOString() : null,
        checkOut: correctionCheckOut ? new Date(correctionCheckOut).toISOString() : null,
        status: correctionStatus,
        notes: correctionNotes.trim(),
        reason: correctionReason.trim(),
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: "Attendance record successfully corrected and logged in the audit trail.",
        });
        setCorrectingRecord(null);
        loadAttendance(selectedDate);
      }
    } catch (err: unknown) {
      setCorrectionError(
        err instanceof Error ? err.message : "Failed to correct attendance."
      );
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  // Submit Manual Record
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStaffId || !manualDate) {
      setMessage({ type: "error", text: "Please select a therapist and date." });
      return;
    }

    const cIn = manualCheckInTime
      ? new Date(`${manualDate}T${manualCheckInTime}:00+04:00`).toISOString()
      : undefined;
    const cOut = manualCheckOutTime
      ? new Date(`${manualDate}T${manualCheckOutTime}:00+04:00`).toISOString()
      : undefined;

    setManualSubmitting(true);
    try {
      const res = await adminStaffApi.manualAttendance({
        staffId: manualStaffId,
        date: manualDate,
        checkIn: cIn,
        checkOut: cOut,
        status: manualStatus,
        reason: manualReason.trim() || "Manual record by administrator",
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: "Manual attendance record successfully added with audit trail.",
        });
        setIsManualModalOpen(false);
        loadAttendance(selectedDate);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record manual attendance.",
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const staffObj = typeof r.staff === "object" ? r.staff : null;
    const staffName = staffObj?.name || "";
    const staffEmail = staffObj?.email || "";
    const empId = staffObj?.employeeId || "";

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        staffName.toLowerCase().includes(q) ||
        staffEmail.toLowerCase().includes(q) ||
        empId.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Calculate metrics
  const presentCount = records.filter(
    (r) => r.status === "present" || r.status === "half_day"
  ).length;
  const currentlyClockedIn = records.filter((r) => r.checkIn && !r.checkOut).length;
  const completedShifts = records.filter((r) => r.checkIn && r.checkOut).length;
  const correctedCount = records.filter((r) => r.isCorrected).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#CF565D]/10 text-[#CF565D]">
              Admin Level 4
            </span>
            <span className="text-xs text-[#746D69] font-medium">• Clock-in Audit & Oversight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-1">
            Attendance Log & Audit Trail
          </h1>
          <p className="text-sm text-[#746D69] mt-0.5">
            Monitor real-time therapist check-in/out timestamps and review/correct records with a complete audit history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAttendance(selectedDate, true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2] hover:text-[#292525] transition-colors"
            title="Refresh Attendance Log"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setManualDate(selectedDate);
              setIsManualModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-sm hover:bg-[#b8454c] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manual Attendance Entry
          </button>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Present Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 mt-2">
            {presentCount}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Therapists active</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              On Active Shift
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-blue-700 mt-2">
            {currentlyClockedIn}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Checked in, not checked out</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Completed Shifts
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#292525]">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {completedShifts}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Clocked out for day</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Admin Corrections
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-purple-700 mt-2">
            {correctedCount}
          </p>
          <span className="text-[11px] text-purple-600 mt-1 block">Logged in audit trail</span>
        </div>
      </div>

      {/* Date Bar & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const cur = new Date(selectedDate);
              cur.setDate(cur.getDate() - 1);
              setSelectedDate(cur.toISOString().split("T")[0]);
            }}
            className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
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
            onClick={() => {
              const cur = new Date(selectedDate);
              cur.setDate(cur.getDate() + 1);
              setSelectedDate(cur.toISOString().split("T")[0]);
            }}
            className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-white"
          >
            Today
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-[#746D69] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search therapist or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525]"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="half_day">Half Day</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#746D69]">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Loading daily attendance records...
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Clock className="w-10 h-10 text-[#746D69]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Attendance Records for this Date
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto mt-1 mb-4">
              Therapists clock in via their staff portal upon commencing shifts. You can also manually add a record.
            </p>
            <button
              onClick={() => {
                setManualDate(selectedDate);
                setIsManualModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c]"
            >
              Add Attendance Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D8C8]/60 bg-[#FAF7F2]/50 text-[11px] uppercase font-bold text-[#746D69] tracking-wider">
                  <th className="py-4 px-6">Therapist</th>
                  <th className="py-4 px-4">Check-In</th>
                  <th className="py-4 px-4">Check-Out</th>
                  <th className="py-4 px-4">Duration</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Audit Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/40 text-xs">
                {filteredRecords.map((r) => {
                  const staffObj = typeof r.staff === "object" ? r.staff : null;
                  const cIn = r.checkIn ? new Date(r.checkIn) : null;
                  const cOut = r.checkOut ? new Date(r.checkOut) : null;

                  let durationStr = "—";
                  if (cIn && cOut) {
                    const diffMs = cOut.getTime() - cIn.getTime();
                    const diffHours = (diffMs / (1000 * 3600)).toFixed(1);
                    durationStr = `${diffHours} hrs`;
                  } else if (cIn && !cOut) {
                    durationStr = "In Progress";
                  }

                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-[#FAF7F2]/40 transition-colors"
                    >
                      {/* Therapist Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center font-serif font-bold text-[#CF565D] overflow-hidden shrink-0">
                            {staffObj?.profileImage ? (
                              <img
                                src={staffObj.profileImage}
                                alt={staffObj.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (staffObj?.name || "T").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-serif font-bold text-[#292525] block">
                              {staffObj?.name || "Staff Member"}
                            </span>
                            <span className="text-[10px] font-mono text-[#746D69]">
                              {staffObj?.employeeId || "RE-STAFF"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-4 px-4 font-mono">
                        {cIn ? (
                          <span className="text-[#292525] font-semibold">
                            {cIn.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-[#746D69] italic">Not clocked in</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-4 px-4 font-mono">
                        {cOut ? (
                          <span className="text-[#292525] font-semibold">
                            {cOut.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-blue-600 font-medium italic">
                            On Shift
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 text-[#746D69] font-medium">
                        {durationStr}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === "present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : r.status === "half_day"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {r.status?.replace("_", " ")}
                        </span>
                      </td>

                      {/* Audit Status */}
                      <td className="py-4 px-4">
                        {r.isCorrected ? (
                          <button
                            onClick={() => setViewingAuditRecord(r)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold hover:bg-purple-100 transition-colors"
                          >
                            <History className="w-3 h-3" />
                            Corrected ({r.auditTrail?.length || 1})
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#746D69]/60">
                            Original
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white hover:border-[#CF565D] transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#CF565D]" />
                            Review & Correct
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: REVIEW & CORRECT ATTENDANCE RECORD
         ======================================================== */}
      {correctingRecord && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider">
                  Audit-Tracked Correction
                </span>
                <h3 className="text-lg font-serif font-bold text-[#292525] mt-0.5">
                  Review & Correct Attendance Record
                </h3>
                <span className="text-xs text-[#746D69]">
                  Therapist:{" "}
                  {typeof correctingRecord.staff === "object"
                    ? correctingRecord.staff.name
                    : "Staff"}{" "}
                  • Date: {correctingRecord.date}
                </span>
              </div>
              <button
                onClick={() => setCorrectingRecord(null)}
                className="p-1.5 rounded-xl text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {correctionError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Check-In Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    value={correctionCheckIn}
                    onChange={(e) => setCorrectionCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Check-Out Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    value={correctionCheckOut}
                    onChange={(e) => setCorrectionCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Attendance Status
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day Shift</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Mandatory Correction Reason (Required for Audit Trail) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corrected therapist clock-out timestamp due to phone battery death"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Additional context..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8D8C8]/60">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="px-4 py-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#CF565D] text-white font-semibold shadow-md hover:bg-[#b8454c] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {correctionSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save Correction & Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIEW AUDIT TRAIL
         ======================================================== */}
      {viewingAuditRecord && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#292525]">
                    Attendance Audit History
                  </h3>
                  <span className="text-xs text-[#746D69]">
                    Date: {viewingAuditRecord.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingAuditRecord(null)}
                className="p-1.5 rounded-xl text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {(viewingAuditRecord.auditTrail || []).map((trail, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#CF565D] uppercase tracking-wider text-[10px]">
                      {trail.action || "Correction"}
                    </span>
                    <span className="text-[11px] text-[#746D69]">
                      {new Date(trail.timestamp).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <p className="text-[#292525]">
                    <strong>Reason:</strong> {trail.reason}
                  </p>
                  <span className="text-[11px] text-[#746D69] block">
                    Modified By: <strong>{trail.modifiedBy}</strong>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingAuditRecord(null)}
                className="px-4 py-2 rounded-2xl bg-[#292525] text-white text-xs font-semibold hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MANUAL ATTENDANCE RECORD
         ======================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider">
                  Admin Manual Entry
                </span>
                <h3 className="text-base font-serif font-bold text-[#292525] mt-0.5">
                  Record Staff Attendance
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Select Therapist *
                </label>
                <select
                  required
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium"
                >
                  <option value="">-- Choose Therapist --</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.employeeId || s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Attendance Date *
                </label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Clock-In Time
                  </label>
                  <input
                    type="time"
                    value={manualCheckInTime}
                    onChange={(e) => setManualCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Clock-Out Time
                  </label>
                  <input
                    type="time"
                    value={manualCheckOutTime}
                    onChange={(e) => setManualCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Status
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs"
                >
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Reason for Manual Entry *
                </label>
                <input
                  type="text"
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8D8C8]/60">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#CF565D] text-white font-semibold shadow-md hover:bg-[#b8454c] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {manualSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Log Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
