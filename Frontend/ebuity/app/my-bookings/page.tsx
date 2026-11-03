"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useAuth } from "../../lib/auth-context";
import { bookingApi } from "../../lib/api-client";
import { Booking, TimeSlot } from "../../types/booking";
import { formatBookingTime, format12Hour } from "../../lib/booking-utils";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Navigation,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function MyBookingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Cancellation State
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Rescheduling Modal State
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      setLoading(true);
      bookingApi
        .getMyBookings()
        .then((res) => {
          if (isMounted && res.bookings) {
            setBookings(res.bookings);
          }
        })
        .catch((err) => {
          console.error("Failed to load customer bookings:", err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (!authLoading) {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading]);

  // Handle Cancellation Request / Direct Cancel
  const handleCancelBooking = async () => {
    if (!cancellingBookingId) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      setCancelMessage(null);
      const res = await bookingApi.requestCancel(cancellingBookingId, {
        reason: cancelReason.trim(),
      });
      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === res.booking._id ? res.booking : b))
        );
        setCancelMessage(res.message);
        setTimeout(() => {
          setCancellingBookingId(null);
          setCancelReason("");
          setCancelMessage(null);
        }, 1500);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setCancelError(errObj.message || "Failed to process cancellation.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Open Reschedule Modal & Fetch Genuine Slots
  const handleOpenReschedule = async (b: Booking) => {
    setReschedulingBooking(b);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const initialDate = b.scheduledDate >= tomorrow ? b.scheduledDate : tomorrow;
    setRescheduleDate(initialDate);
    setRescheduleTime("");
    setRescheduleReason("");
    setRescheduleError(null);
    setRescheduleSuccess(null);
    await fetchSlotsForDate(initialDate, b);
  };

  const fetchSlotsForDate = async (targetDate: string, targetBooking: Booking) => {
    try {
      setLoadingSlots(true);
      setRescheduleError(null);
      const srvIds = targetBooking.services.map((s) => s.serviceId);
      const res = await bookingApi.getAvailability({
        date: targetDate,
        duration: targetBooking.totalDurationMinutes,
        serviceIds: srvIds,
      });

      if (res.success && Array.isArray(res.slots)) {
        setAvailableSlots(res.slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setRescheduleError(errObj.message || "Failed to load slots for this date");
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = async (newDate: string) => {
    setRescheduleDate(newDate);
    setRescheduleTime("");
    if (reschedulingBooking) {
      await fetchSlotsForDate(newDate, reschedulingBooking);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!reschedulingBooking || !rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select a date and an available time slot.");
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      setRescheduleError(null);
      const res = await bookingApi.requestReschedule(reschedulingBooking._id, {
        requestedDate: rescheduleDate,
        requestedTime: rescheduleTime,
        reason: rescheduleReason.trim(),
      });

      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === res.booking._id ? res.booking : b))
        );
        setRescheduleSuccess(res.message);
        setTimeout(() => {
          setReschedulingBooking(null);
          setRescheduleSuccess(null);
        }, 1500);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setRescheduleError(errObj.message || "Failed to submit reschedule request.");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === "all") return true;
    return b.status === activeFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Header />

      <main className="flex-1 pb-24">
        {/* Banner */}
        <section className="bg-gradient-to-b from-[#F5DAD6]/25 to-[#FAF7F2] border-b border-[#E8D8C8]/60 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                  Client Sanctuary
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#292525] mt-1">
                  My Service Appointments
                </h1>
              </div>

              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Book New Ritual</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Unauthenticated View */}
          {!isAuthenticated && !authLoading && (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl border border-[#E8D8C8] p-8 space-y-4 shadow-sm">
              <h2 className="font-serif text-2xl font-medium text-[#292525]">
                Sign In to View Your Appointments
              </h2>
              <p className="text-xs text-[#746D69] leading-relaxed">
                Log into your Rose Essence account to manage upcoming home appointments, view therapist details, or reschedule.
              </p>
              <div className="pt-2">
                <Link
                  href="/login?redirect=/my-bookings"
                  className="inline-flex px-8 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Authenticated View */}
          {isAuthenticated && (
            <div className="space-y-6">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8D8C8]/60">
                {[
                  { key: "all", label: "All Appointments" },
                  { key: "confirmed", label: "Confirmed" },
                  { key: "completed", label: "Completed" },
                  { key: "cancelled", label: "Cancelled" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                      activeFilter === tab.key
                        ? "bg-[#CF565D] text-white shadow-xs"
                        : "bg-white text-[#746D69] border border-[#E8D8C8] hover:border-[#CF565D]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Bookings List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="p-6 rounded-3xl bg-white border border-[#E8D8C8] animate-pulse space-y-3"
                    >
                      <div className="h-5 bg-[#E8D8C8]/50 rounded w-1/3" />
                      <div className="h-4 bg-[#FAF7F2] rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-[#E8D8C8] p-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-[#292525]">
                    No Appointments Found
                  </h3>
                  <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                    {activeFilter === "all"
                      ? "You haven't scheduled any in-home rituals yet. Transform your home into a sanctuary today."
                      : `No ${activeFilter} appointments match your filter.`}
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/book"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md"
                    >
                      <span>Book At-Home Ritual</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredBookings.map((b) => {
                    const statusColor =
                      b.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : b.status === "completed"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : b.status === "cancelled"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200";

                    const startTime = formatBookingTime(
                      b.scheduledTime || b.scheduledStartTime,
                      b
                    );
                    const endTime = formatBookingTime(b.scheduledEndTime, b);

                    const canCancel =
                      b.status === "confirmed" || b.status === "pending";

                    const staffStatus = b.staffAssignmentStatus;

                    return (
                      <div
                        key={b._id}
                        className="bg-white rounded-3xl border border-[#E8D8C8] p-6 sm:p-7 shadow-xs hover:border-[#CF565D]/60 transition-all space-y-5"
                      >
                        {/* Top: Ref & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#FAF7F2]">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#746D69] block">
                              Booking Reference
                            </span>
                            <span className="font-mono font-bold text-base text-[#292525]">
                              {b.bookingNumber}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Live Service Progress Badge */}
                            {staffStatus === "on_the_way" && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                                <Navigation className="w-3.5 h-3.5 text-amber-600" />
                                Specialist On The Way
                              </span>
                            )}
                            {staffStatus === "arrived" && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-300 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                                Specialist Arrived
                              </span>
                            )}
                            {staffStatus === "in_progress" && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                Ritual In Progress
                              </span>
                            )}

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusColor}`}
                            >
                              {b.status}
                            </span>
                          </div>
                        </div>

                        {/* Request Outcome Notices */}
                        {b.rescheduleRequest && b.rescheduleRequest.status !== "none" && (
                          <div
                            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                              b.rescheduleRequest.status === "pending"
                                ? "bg-amber-50 border border-amber-200 text-amber-900"
                                : b.rescheduleRequest.status === "approved"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                                : "bg-rose-50 border border-rose-200 text-rose-900"
                            }`}
                          >
                            <RotateCcw className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold">
                                {b.rescheduleRequest.status === "pending" && (
                                  <>
                                    Reschedule Requested for {b.rescheduleRequest.requestedDate} ({format12Hour(b.rescheduleRequest.requestedTimeStr) || formatBookingTime(b.rescheduleRequest.requestedStartTime) || "Custom Slot"}) — Pending Concierge Review
                                  </>
                                )}
                                {b.rescheduleRequest.status === "approved" && (
                                  <>Reschedule Confirmed & Updated by Concierge</>
                                )}
                                {b.rescheduleRequest.status === "rejected" && (
                                  <>Reschedule Request Declined</>
                                )}
                              </p>
                              {b.rescheduleRequest.adminNote && (
                                <p className="text-[11px] mt-0.5 opacity-90">
                                  Note: {b.rescheduleRequest.adminNote}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {b.cancellationRequest && b.cancellationRequest.status === "pending" && (
                          <div className="p-3.5 rounded-2xl text-xs bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                            <div>
                              <p className="font-semibold">
                                Cancellation Request Under Administrative Review
                              </p>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Your late cancellation request has been submitted to management per our 24-hour policy. Reason: &ldquo;{b.cancellationRequest.reason}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {b.cancellationRequest && b.cancellationRequest.status === "rejected" && (
                          <div className="p-3.5 rounded-2xl text-xs bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
                            <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                            <div>
                              <p className="font-semibold">
                                Cancellation Request Declined by Management
                              </p>
                              {b.cancellationRequest.adminNote && (
                                <p className="text-[11px] text-rose-800 mt-0.5">
                                  Policy note: {b.cancellationRequest.adminNote}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Mid: Services and Address */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                          {/* Services List */}
                          <div className="lg:col-span-7 space-y-2">
                            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#CF565D] block">
                              Treatments ({b.services.length})
                            </span>
                            <div className="space-y-2">
                              {b.services.map((srv, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2]/60 border border-[#E8D8C8]/40"
                                >
                                  <div>
                                    <p className="font-medium text-[#292525]">
                                      {srv.name}
                                    </p>
                                    <p className="text-[11px] text-[#746D69]">
                                      {srv.durationMinutes} mins
                                    </p>
                                  </div>
                                  <span className="font-serif font-semibold text-[#292525]">
                                    {srv.currency || "AED"} {srv.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Logistics / Date / Location */}
                          <div className="lg:col-span-5 space-y-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/60">
                            <div className="flex items-start gap-2.5">
                              <Calendar className="w-4 h-4 text-[#CF565D] mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold text-[#292525] block">
                                  {b.scheduledDate}
                                </span>
                                <span className="text-[#746D69]">
                                  {startTime} – {endTime} ({b.totalDurationMinutes} mins session)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <MapPin className="w-4 h-4 text-[#CF565D] mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold text-[#292525] block">
                                  {b.serviceAddress.unitNumber}, {b.serviceAddress.buildingName}
                                </span>
                                <span className="text-[#746D69]">
                                  {b.serviceAddress.area}, {b.serviceAddress.city}
                                </span>
                                {b.serviceAddress.accessInstructions && (
                                  <p className="text-[11px] text-[#CF565D] mt-0.5 italic">
                                    Notes: {b.serviceAddress.accessInstructions}
                                  </p>
                                )}
                              </div>
                            </div>

                            {b.assignedStaff && (
                              <div className="flex items-center gap-2 pt-2 border-t border-[#E8D8C8]/60 text-xs">
                                <span className="text-[11px] text-[#746D69]">Assigned Specialist:</span>
                                <span className="font-semibold text-[#CF565D] flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
                                  {b.assignedStaff.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Summary Bar & Actions */}
                        <div className="pt-4 border-t border-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#746D69] block">
                              Total Investment
                            </span>
                            <span className="font-serif text-2xl font-bold text-[#292525]">
                              {b.currency || "AED"} {b.totalPrice.toFixed(2)}
                            </span>
                          </div>

                          {canCancel && (
                            <div className="flex items-center gap-2.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleOpenReschedule(b)}
                                className="px-4 py-2 rounded-full border border-[#CF565D] text-[#CF565D] hover:bg-[#F5DAD6]/30 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reschedule</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingBookingId(b._id);
                                  setCancelReason("");
                                  setCancelError(null);
                                }}
                                className="px-4 py-2 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Cancel Appointment
                              </button>
                            </div>
                          )}

                          {b.status === "cancelled" && b.cancellationReason && (
                            <span className="text-xs text-rose-700 italic">
                              Reason: {b.cancellationReason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cancellation Confirmation Modal */}
          {cancellingBookingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl border border-[#E8D8C8] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-medium text-[#292525]">
                    Cancel Appointment
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCancellingBookingId(null)}
                    className="text-[#746D69] hover:text-[#292525]"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-[#746D69] leading-relaxed">
                  Per our service policy, cancellations made more than 24 hours in advance are released immediately. Same-day or late cancellations require management review.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Reason for Cancellation
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Schedule conflict, feeling unwell"
                    className="w-full px-4 py-2 bg-white border border-[#E8D8C8] rounded-xl text-xs text-[#292525] focus:border-[#CF565D] focus:outline-none"
                  />
                </div>

                {cancelError && (
                  <p className="text-xs text-red-600 font-medium">
                    {cancelError}
                  </p>
                )}

                {cancelMessage && (
                  <p className="text-xs text-emerald-600 font-medium">
                    {cancelMessage}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setCancellingBookingId(null)}
                    className="px-5 py-2.5 rounded-full border border-[#E8D8C8] text-xs font-medium text-[#746D69] hover:bg-[#FAF7F2]"
                  >
                    Keep Appointment
                  </button>

                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleCancelBooking}
                    className="px-5 py-2.5 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      "Confirm Cancellation"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reschedule Modal */}
          {reschedulingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl border border-[#E8D8C8] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
                  <div>
                    <h3 className="font-serif text-xl font-medium text-[#292525]">
                      Reschedule Ritual
                    </h3>
                    <p className="text-xs text-[#746D69] mt-0.5">
                      Select a new date and verified available time slot.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReschedulingBooking(null)}
                    className="text-[#746D69] hover:text-[#292525]"
                  >
                    ✕
                  </button>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Select New Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={rescheduleDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-xs text-[#292525] focus:border-[#CF565D] focus:outline-none"
                  />
                </div>

                {/* Slot Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Select Available Time Slot
                  </label>

                  {loadingSlots ? (
                    <div className="p-8 text-center text-xs text-[#746D69] bg-[#FAF7F2] rounded-2xl flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#CF565D]" />
                      <span>Checking verified therapist availability...</span>
                    </div>
                  ) : availableSlots.filter((s) => s.isAvailable).length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#746D69] bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8]">
                      No available slots on this date. Please pick another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableSlots
                        .filter((s) => s.isAvailable)
                        .map((slot) => {
                          const isSelected = rescheduleTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setRescheduleTime(slot.time)}
                              className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all text-center border ${
                                isSelected
                                  ? "bg-[#CF565D] text-white border-[#CF565D] shadow-xs"
                                  : "bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] text-[#292525] border-[#E8D8C8]"
                              }`}
                            >
                              {format12Hour(slot.time)}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Reason for Rescheduling (Optional)
                  </label>
                  <input
                    type="text"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Schedule adjustment, travel delay"
                    className="w-full px-4 py-2 bg-white border border-[#E8D8C8] rounded-xl text-xs text-[#292525] focus:border-[#CF565D] focus:outline-none"
                  />
                </div>

                {rescheduleError && (
                  <p className="text-xs text-rose-600 font-medium">
                    {rescheduleError}
                  </p>
                )}

                {rescheduleSuccess && (
                  <p className="text-xs text-emerald-600 font-medium">
                    {rescheduleSuccess}
                  </p>
                )}

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#FAF7F2]">
                  <button
                    type="button"
                    disabled={isSubmittingReschedule}
                    onClick={() => setReschedulingBooking(null)}
                    className="px-5 py-2.5 rounded-full border border-[#E8D8C8] text-xs font-medium text-[#746D69] hover:bg-[#FAF7F2]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingReschedule || !rescheduleTime}
                    onClick={handleSubmitReschedule}
                    className="px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-medium hover:bg-[#b8454c] shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingReschedule ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Request Reschedule"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
