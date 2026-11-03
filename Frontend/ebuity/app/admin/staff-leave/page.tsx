"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminStaffApi } from "../../../lib/api-client";
import { StaffLeave } from "../../../types/staff";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Info,
  Calendar,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";

export default function AdminStaffLeavePage() {
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Alert message
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Review Modal State
  const [reviewingLeave, setReviewingLeave] = useState<StaffLeave | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">(
    "approved"
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load Leave Requests
  const loadLeaves = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await adminStaffApi.getLeaves(
          statusFilter !== "all" ? statusFilter : undefined
        );
        if (res.success && Array.isArray(res.leaves)) {
          setLeaves(res.leaves);
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load leave requests.",
        });
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "admin",
  });

  useRealtimeEvent(
    "staff:updated",
    () => {
      loadLeaves();
    },
    { role: "admin" }
  );

  // Handle Review Action (Approve / Reject)
  const handleOpenReview = (
    leave: StaffLeave,
    action: "approved" | "rejected"
  ) => {
    setReviewingLeave(leave);
    setReviewAction(action);
    setReviewNotes(
      action === "approved"
        ? "Leave approved. Therapist schedule marked off-duty."
        : "Operational requirements. Please contact manager."
    );
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLeave || !reviewingLeave._id) return;

    setReviewSubmitting(true);
    try {
      const res = await adminStaffApi.reviewLeave(reviewingLeave._id, {
        status: reviewAction,
        reviewNotes: reviewNotes.trim(),
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: `Leave request for ${reviewingLeave.staffName} has been ${reviewAction}. Availability engine updated.`,
        });
        setReviewingLeave(null);
        loadLeaves();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to review leave request.",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Filter leaves locally by therapist name or email
  const filteredLeaves = leaves.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.staffName && l.staffName.toLowerCase().includes(q)) ||
      (l.staffEmail && l.staffEmail.toLowerCase().includes(q)) ||
      (l.reason && l.reason.toLowerCase().includes(q))
    );
  });

  // Metric counts
  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const approvedCount = leaves.filter((l) => l.status === "approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#CF565D]/10 text-[#CF565D]">
              Admin Level 4
            </span>
            <span className="text-xs text-[#746D69] font-medium">• Availability Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-1">
            Staff Leave Management
          </h1>
          <p className="text-sm text-[#746D69] mt-0.5">
            Review and approve therapist vacation, medical leave, and personal time-off requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Live Badge (replaces manual refresh) */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold shadow-xs"
            title={
              isRealtimeConnected
                ? "Real-time leave updates active (Socket.IO)"
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
            href="/admin/staff-schedules"
            className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-[#CF565D]" />
            Working Schedules
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

      {/* Integration Notice */}
      <div className="p-4 rounded-2xl bg-[#F5DAD6]/30 border border-[#E8D8C8] text-xs text-[#292525] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#CF565D] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            Live Booking & Availability Synchronization
          </strong>
          <span className="text-[#746D69] leading-relaxed">
            Approved leaves automatically block therapist time slots across the entire customer booking catalogue. Staff on approved leave are excluded from assignment eligibility, preventing booking conflicts.
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Pending Approval
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-700 mt-2">
            {pendingCount}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Awaiting admin decision</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Approved Leaves
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 mt-2">
            {approvedCount}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Active / Scheduled vacation</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Rejected Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-rose-700 mt-2">
            {rejectedCount}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Declined with reasons</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8] w-full sm:w-auto">
          {[
            { id: "all", label: "All Requests" },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-white text-[#CF565D] shadow-sm"
                  : "text-[#746D69] hover:text-[#292525]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#746D69]">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Loading leave records...
            </p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-20 text-center px-4">
            <CalendarDays className="w-10 h-10 text-[#746D69]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Leave Requests Found
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto mt-1">
              There are no {statusFilter !== "all" ? statusFilter : ""} leave requests matching your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D8C8]/60 bg-[#FAF7F2]/50 text-[11px] uppercase font-bold text-[#746D69] tracking-wider">
                  <th className="py-4 px-6">Therapist</th>
                  <th className="py-4 px-4">Leave Duration</th>
                  <th className="py-4 px-4">Dates</th>
                  <th className="py-4 px-4">Staff Reason</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Review Details</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/40 text-xs">
                {filteredLeaves.map((l) => {
                  const s = new Date(l.startDate);
                  const e = new Date(l.endDate);
                  const diffDays = Math.ceil(
                    (e.getTime() - s.getTime()) / (1000 * 3600 * 24)
                  ) + 1;

                  return (
                    <tr
                      key={l._id}
                      className="hover:bg-[#FAF7F2]/40 transition-colors"
                    >
                      {/* Therapist Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center font-serif font-bold text-[#CF565D] overflow-hidden shrink-0">
                            {l.staffImage ? (
                              <img
                                src={l.staffImage}
                                alt={l.staffName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (l.staffName || "T").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-serif font-bold text-[#292525] block">
                              {l.staffName || "Staff Member"}
                            </span>
                            <span className="text-[11px] text-[#746D69] block">
                              {l.staffEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Days Count */}
                      <td className="py-4 px-4 font-medium">
                        <span className="px-2.5 py-1 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-bold text-[#292525]">
                          {diffDays} day{diffDays !== 1 ? "s" : ""}
                        </span>
                      </td>

                      {/* Date Range */}
                      <td className="py-4 px-4 text-[#292525] font-medium">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{s.toLocaleDateString("en-GB")}</span>
                          <span className="text-[#746D69]">→</span>
                          <span>{e.toLocaleDateString("en-GB")}</span>
                        </div>
                        <span className="text-[10px] text-[#746D69] block mt-0.5">
                          Requested on{" "}
                          {l.requestedAt
                            ? new Date(l.requestedAt).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4 text-[#746D69] max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">
                          {l.reason}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border ${
                            l.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : l.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {l.status === "approved" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {l.status === "rejected" && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {l.status === "pending" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {l.status}
                        </span>
                      </td>

                      {/* Review details */}
                      <td className="py-4 px-4 text-[11px] text-[#746D69]">
                        {l.reviewedAt ? (
                          <div>
                            <span className="block font-medium text-[#292525]">
                              {new Date(l.reviewedAt).toLocaleDateString("en-GB")}
                            </span>
                            {l.reviewNotes && (
                              <span className="italic line-clamp-1">
                                "{l.reviewNotes}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#746D69]/60 italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        {l.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenReview(l, "approved")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReview(l, "rejected")}
                              className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleOpenReview(
                                l,
                                l.status === "approved" ? "rejected" : "approved"
                              )
                            }
                            className="text-xs text-[#746D69] hover:text-[#CF565D] font-medium underline"
                          >
                            Change Status
                          </button>
                        )}
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
          MODAL: APPROVE / REJECT LEAVE REQUEST
         ======================================================== */}
      {reviewingLeave && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    reviewAction === "approved"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {reviewAction === "approved" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#292525]">
                    {reviewAction === "approved" ? "Approve Leave" : "Reject Leave"}
                  </h3>
                  <span className="text-xs text-[#746D69]">
                    Therapist: {reviewingLeave.staffName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReviewingLeave(null)}
                className="p-1.5 rounded-xl text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#746D69]">Requested Period:</span>
                <span className="font-bold text-[#292525] font-mono">
                  {new Date(reviewingLeave.startDate).toLocaleDateString("en-GB")} →{" "}
                  {new Date(reviewingLeave.endDate).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="text-[#746D69] pt-1">
                <strong>Reason:</strong> {reviewingLeave.reason}
              </div>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                  Optional Review Reason / Internal Note
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Approved. Annual vacation booked in UAE portal."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="px-4 py-2 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-5 py-2 rounded-2xl text-white text-xs font-semibold shadow-md flex items-center gap-1.5 ${
                    reviewAction === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm {reviewAction === "approved" ? "Approval" : "Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
