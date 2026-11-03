"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Booking } from "../../types/booking";
import { getDubaiTime24H, formatBookingTime } from "../../lib/booking-utils";
import { adminBookingApi, ApiError } from "../../lib/api-client";
import {
  X,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

interface ReassignStaffModalProps {
  booking: Booking | null;
  onClose: () => void;
  onSuccess: (updatedBooking: Booking) => void;
}

export function ReassignStaffModal({
  booking,
  onClose,
  onSuccess,
}: ReassignStaffModalProps) {
  const [mode, setMode] = useState<"auto" | "manual">("manual");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [reason, setReason] = useState("Admin manual assignment override");
  const [eligibleStaff, setEligibleStaff] = useState<any[]>([]);
  const [excludedStaff, setExcludedStaff] = useState<any[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    const currentBooking = booking;

    let isMounted = true;
    async function fetchEligible() {
      try {
        setLoadingEligible(true);
        setError(null);

        // Derive time in HH:mm (Dubai local time)
        const startTimeStr = getDubaiTime24H(
          currentBooking.scheduledTime || currentBooking.scheduledStartTime,
          currentBooking
        );

        const serviceIds = currentBooking.services
          .map((s) => s.serviceId)
          .filter(Boolean)
          .join(",");

        const res = await adminBookingApi.getEligibleStaff({
          date: currentBooking.scheduledDate,
          startTime: startTimeStr,
          duration: currentBooking.totalDurationMinutes,
          serviceIds,
        });

        if (isMounted) {
          if (res.success) {
            const rawEligible = res.eligibleStaff || [];
            const rawExcluded = res.excludedStaff || [];
            setEligibleStaff(rawEligible);
            setExcludedStaff(rawExcluded);
            if (rawEligible.length > 0) {
              const firstStaff = (rawEligible[0] as any)?.staff || rawEligible[0];
              setSelectedStaffId(firstStaff?._id || "");
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof ApiError ? err.message : "Failed to load eligible therapists";
          setError(msg);
        }
      } finally {
        if (isMounted) setLoadingEligible(false);
      }
    }

    fetchEligible();
    return () => {
      isMounted = false;
    };
  }, [booking]);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "manual" && !selectedStaffId) {
      setError("Please select a qualified therapist.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload =
        mode === "manual"
          ? { staffId: selectedStaffId, reason: reason.trim() }
          : { reason: reason.trim() };

      const res = await adminBookingApi.reassign(booking._id, payload);
      if (res.success && res.booking) {
        onSuccess(res.booking);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to reassign therapist";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#292525]">
                Assign / Reassign Therapist
              </h3>
              <p className="text-[11px] text-[#746D69]">
                Booking: <span className="font-mono font-bold text-[#292525]">{booking.bookingNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Appointment Context Summary */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2]/60 border border-[#E8D8C8]/60 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#292525]">
            <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
            <span className="font-semibold">{booking.scheduledDate}</span>
          </div>
          <div className="flex items-center gap-2 text-[#292525]">
            <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
            <span className="font-semibold">
              {formatBookingTime(
                booking.scheduledTime || booking.scheduledStartTime,
                booking
              )}
            </span>
            <span className="text-[11px] text-[#746D69]">
              ({booking.totalDurationMinutes}m session)
            </span>
          </div>
          <div className="text-[11px] text-[#746D69]">
            Current: {booking.assignedStaff?.name || "Unassigned"}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-[#FAF7F2]/80 p-1 rounded-2xl border border-[#E8D8C8]">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === "manual"
                ? "bg-white text-[#292525] shadow-sm border border-[#E8D8C8]"
                : "text-[#746D69] hover:text-[#292525]"
            }`}
          >
            Select Specific Therapist
          </button>
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === "auto"
                ? "bg-white text-[#292525] shadow-sm border border-[#E8D8C8]"
                : "text-[#746D69] hover:text-[#292525]"
            }`}
          >
            Automatic Best Match
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {mode === "auto" ? (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-[#746D69] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#292525]">
                <Sparkles className="w-4 h-4 text-[#CF565D]" />
                Intelligent Fleet Dispatch
              </div>
              <p className="leading-relaxed">
                The Rose Essence assignment engine will verify all therapist schedules, working hours,
                travel buffers, and service qualifications to dispatch the optimal available therapist.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider">
                Qualified & Available Therapists
              </label>

              {loadingEligible ? (
                <div className="py-8 text-center text-xs text-[#746D69] space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#CF565D] mx-auto" />
                  <p>Checking therapist skills & schedule availability...</p>
                </div>
              ) : eligibleStaff.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    No Fully Qualified Therapists Available
                  </p>
                  <p className="text-[11px] text-amber-800">
                    No active therapists match all requested service skills and slot availability on this date.
                    You can inspect excluded therapists below or use automatic dispatch.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {eligibleStaff.map((item, idx) => {
                    const st = item.staff || item;
                    return (
                      <label
                        key={st._id || idx}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedStaffId === st._id
                            ? "bg-[#F5DAD6]/20 border-[#CF565D] ring-2 ring-[#CF565D]/10"
                            : "bg-white border-[#E8D8C8] hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="staffChoice"
                            value={st._id}
                            checked={selectedStaffId === st._id}
                            onChange={() => setSelectedStaffId(st._id)}
                            className="accent-[#CF565D]"
                          />
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                            {st.profileImage ? (
                              <Image
                                src={st.profileImage}
                                alt={st.name}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-[#CF565D] text-xs">
                                {st.name?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#292525]">{st.name}</p>
                            <p className="text-[10px] text-[#746D69]">{st.employeeId} • {st.phone}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            Qualified & Open
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Excluded Staff Collapsible Preview */}
              {excludedStaff.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider mb-1.5">
                    Unavailable / Excluded ({excludedStaff.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-[#746D69]">
                    {excludedStaff.map(({ staff, reason: exReason }, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-medium text-[#292525]">{staff.name}</span>
                        <span className="text-stone-500 italic">{exReason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
              Assignment Audit Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested senior aesthetician / scheduling conflict"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#FAF7F2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (mode === "manual" && !selectedStaffId)}
              className="px-5 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
