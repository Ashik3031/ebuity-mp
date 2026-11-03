"use client";

import React, { useState } from "react";
import { Booking } from "../../types/booking";
import { adminBookingApi, ApiError } from "../../lib/api-client";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface BookingStatusModalProps {
  booking: Booking | null;
  onClose: () => void;
  onSuccess: (updatedBooking: Booking) => void;
}

export function BookingStatusModal({
  booking,
  onClose,
  onSuccess,
}: BookingStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    "pending" | "confirmed" | "completed" | "cancelled"
  >(booking?.status || "confirmed");
  const [cancellationReason, setCancellationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!booking) return null;

  const currentStatus = booking.status;
  const isFinal = currentStatus === "completed" || currentStatus === "cancelled";

  // Calculate permitted transitions
  const permittedOptions: Array<{
    value: "pending" | "confirmed" | "completed" | "cancelled";
    label: string;
    description: string;
  }> = [];

  if (currentStatus === "pending") {
    permittedOptions.push(
      {
        value: "confirmed",
        label: "Confirm Appointment",
        description: "Verify dispatch and lock appointment on fleet schedule.",
      },
      {
        value: "cancelled",
        label: "Cancel Booking",
        description: "Release reserved therapist slot and mark appointment cancelled.",
      }
    );
  } else if (currentStatus === "confirmed") {
    permittedOptions.push(
      {
        value: "completed",
        label: "Mark Service Completed",
        description: "Confirm ritual services were delivered and settle appointment.",
      },
      {
        value: "cancelled",
        label: "Cancel Booking",
        description: "Client or operational cancellation with documented reason.",
      }
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }

    if (selectedStatus === "cancelled" && !cancellationReason.trim()) {
      setError("Please provide a cancellation reason for the audit trail.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await adminBookingApi.updateStatus(booking._id, {
        status: selectedStatus,
        cancellationReason: cancellationReason.trim() || undefined,
      });

      if (res.success && res.booking) {
        onSuccess(res.booking);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to update booking status";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
          <div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              Update Booking Status
            </h3>
            <p className="text-[11px] text-[#746D69]">
              Booking: <span className="font-mono font-bold text-[#292525]">{booking.bookingNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isFinal ? (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-[#746D69] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#292525]">
              <ShieldCheck className="w-4 h-4 text-[#CF565D]" />
              Terminal Status
            </div>
            <p>
              This appointment is currently marked as <span className="font-bold text-[#292525] capitalize">{currentStatus}</span>.
              According to Rose Essence business rules, terminal status appointments cannot be transitioned.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-xs font-semibold text-[#292525]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider">
                Select Permitted Status Transition
              </label>

              <div className="space-y-2">
                {permittedOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedStatus === opt.value
                        ? "bg-[#F5DAD6]/20 border-[#CF565D] ring-2 ring-[#CF565D]/10"
                        : "bg-white border-[#E8D8C8] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="bookingStatus"
                        value={opt.value}
                        checked={selectedStatus === opt.value}
                        onChange={() => setSelectedStatus(opt.value)}
                        className="mt-0.5 accent-[#CF565D]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#292525]">{opt.label}</p>
                        <p className="text-[11px] text-[#746D69] mt-0.5">{opt.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedStatus === "cancelled" && (
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Client requested schedule change, emergency cancellation..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] resize-none"
                />
              </div>
            )}

            {/* Warning banner */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Status updates will update the customer&apos;s reservation status and staff dispatch tracking in real time.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#FAF7F2]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Status Update
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
