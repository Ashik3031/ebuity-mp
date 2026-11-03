"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Booking, NotificationLogItem } from "../../types/booking";
import { formatBookingTime } from "../../lib/booking-utils";
import { StatusBadge } from "./StatusBadge";
import { adminBookingApi } from "../../lib/api-client";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  History,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Navigation,
  ExternalLink,
  Bell,
  RefreshCw,
  Loader2,
  Check,
} from "lucide-react";

interface BookingDetailDrawerProps {
  booking: Booking | null;
  onClose: () => void;
  onOpenReassign: (booking: Booking) => void;
  onOpenStatusModal: (booking: Booking) => void;
  onBookingUpdated?: (updated: Booking) => void;
}

export function BookingDetailDrawer({
  booking: initialBooking,
  onClose,
  onOpenReassign,
  onOpenStatusModal,
  onBookingUpdated,
}: BookingDetailDrawerProps) {
  const [booking, setBooking] = useState<Booking | null>(initialBooking);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "notifications">("details");

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Review Actions State
  const [adminNote, setAdminNote] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setBooking(initialBooking);
    setActionFeedback(null);
    setAdminNote("");
  }, [initialBooking]);

  // Load Notification logs when tab is clicked
  useEffect(() => {
    if (activeTab === "notifications" && booking?._id) {
      setLoadingNotifications(true);
      adminBookingApi
        .getNotifications({ bookingId: booking._id, limit: 20 })
        .then((res) => {
          if (res.success && res.logs) {
            setNotifications(res.logs);
          }
        })
        .catch((err) => console.warn("Failed to load notifications:", err))
        .finally(() => setLoadingNotifications(false));
    }
  }, [activeTab, booking?._id]);

  if (!booking) return null;

  // Format date and time
  const formatTime = (timeOrIso?: string) => {
    return formatBookingTime(timeOrIso, booking);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Review Cancellation Request
  const handleReviewCancellation = async (action: "approve" | "reject") => {
    try {
      setIsProcessingAction(true);
      setActionFeedback(null);
      const res = await adminBookingApi.reviewCancellation(booking._id, {
        action,
        adminNote: adminNote.trim(),
      });
      if (res.success && res.booking) {
        setBooking(res.booking);
        onBookingUpdated?.(res.booking);
        setActionFeedback({
          type: "success",
          message: res.message,
        });
        setAdminNote("");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setActionFeedback({
        type: "error",
        message: errObj.message || "Failed to review cancellation request.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Review Reschedule Request
  const handleReviewReschedule = async (action: "approve" | "reject") => {
    try {
      setIsProcessingAction(true);
      setActionFeedback(null);
      const res = await adminBookingApi.reviewReschedule(booking._id, {
        action,
        adminNote: adminNote.trim(),
      });
      if (res.success && res.booking) {
        setBooking(res.booking);
        onBookingUpdated?.(res.booking);
        setActionFeedback({
          type: "success",
          message: res.message,
        });
        setAdminNote("");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setActionFeedback({
        type: "error",
        message: errObj.message || "Failed to review reschedule request.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Retry Failed Notifications
  const handleRetryNotifications = async () => {
    try {
      setRetryingId("all");
      const res = await adminBookingApi.retryNotifications(booking._id);
      if (res.success) {
        setActionFeedback({
          type: "success",
          message: res.message,
        });
        // Reload notifications list
        const refreshed = await adminBookingApi.getNotifications({
          bookingId: booking._id,
        });
        if (refreshed.success && refreshed.logs) {
          setNotifications(refreshed.logs);
        }
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setActionFeedback({
        type: "error",
        message: errObj.message || "Failed to retry notification dispatch.",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const staff = booking.assignedStaff;
  const address = booking.serviceAddress;
  const isCancelled = booking.status === "cancelled";
  const isCompleted = booking.status === "completed";

  const hasPendingCancellation = booking.cancellationRequest?.status === "pending";
  const hasPendingReschedule = booking.rescheduleRequest?.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E8D8C8] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#FAF7F2] bg-[#FAF7F2]/40 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-[#CF565D] bg-[#F5DAD6]/60 px-2.5 py-0.5 rounded-full border border-[#F5DAD6]">
                {booking.bookingNumber}
              </span>
              <StatusBadge status={booking.status} size="sm" />
              {booking.staffAssignmentStatus && (
                <StatusBadge status={booking.staffAssignmentStatus} size="sm" />
              )}
              {hasPendingCancellation && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                  Cancellation Requested
                </span>
              )}
              {hasPendingReschedule && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  Reschedule Requested
                </span>
              )}
            </div>
            <h2 className="text-xl font-serif font-bold text-[#292525]">
              At-Home Ritual Reservation
            </h2>
            <p className="text-xs text-[#746D69] mt-0.5">
              Reserved for {booking.customerDetails.name} • {formatDate(booking.scheduledDate)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white border border-transparent hover:border-[#E8D8C8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#FAF7F2] px-6 bg-white">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "details"
                ? "border-[#CF565D] text-[#CF565D]"
                : "border-transparent text-[#746D69] hover:text-[#292525]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Reservation Details
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "border-[#CF565D] text-[#CF565D]"
                : "border-transparent text-[#746D69] hover:text-[#292525]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Log ({booking.assignmentHistory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "notifications"
                ? "border-[#CF565D] text-[#CF565D]"
                : "border-transparent text-[#746D69] hover:text-[#292525]"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </button>
        </div>

        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
              actionFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-rose-50 text-rose-800 border-b border-rose-200"
            }`}
          >
            <span>{actionFeedback.message}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-stone-400 hover:text-stone-700 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "details" ? (
            <>
              {/* Level 9: Pending Cancellation Request Action Banner */}
              {hasPendingCancellation && (
                <div className="p-5 rounded-3xl bg-rose-50/90 border border-rose-300 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Customer Requested Cancellation
                  </div>
                  <p className="text-xs text-rose-800">
                    <span className="font-semibold">Reason provided:</span> &ldquo;
                    {booking.cancellationRequest?.reason || "Client schedule conflict"}&rdquo;
                  </p>

                  <div className="pt-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Optional administrative review note"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs text-[#292525] focus:outline-none focus:border-rose-500"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleReviewCancellation("approve")}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve Cancellation
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleReviewCancellation("reject")}
                        className="px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        Decline Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Level 9: Pending Reschedule Request Action Banner */}
              {hasPendingReschedule && (
                <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-300 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    Customer Requested Reschedule
                  </div>
                  <div className="text-xs text-amber-900 space-y-1">
                    <p>
                      <span className="font-semibold">Requested Slot:</span>{" "}
                      <strong>{booking.rescheduleRequest?.requestedDate}</strong> at{" "}
                      <strong>{booking.rescheduleRequest?.requestedTimeStr || "Selected Time"}</strong>
                    </p>
                    {booking.rescheduleRequest?.reason && (
                      <p className="italic text-amber-800">
                        Reason: &ldquo;{booking.rescheduleRequest.reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Optional administrative review note"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-[#292525] focus:outline-none focus:border-amber-500"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleReviewReschedule("approve")}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Validate & Approve Reschedule
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleReviewReschedule("reject")}
                        className="px-4 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        Decline Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation Alert if Cancelled */}
              {isCancelled && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Appointment Cancelled
                  </div>
                  <p>
                    <span className="font-semibold">Reason:</span>{" "}
                    {booking.cancellationReason || "No cancellation reason provided."}
                  </p>
                  {booking.cancelledAt && (
                    <p className="text-[11px] text-rose-600">
                      Cancelled on: {new Date(booking.cancelledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Schedule & Timing Card */}
              <div className="p-5 rounded-3xl bg-[#FAF7F2]/60 border border-[#E8D8C8]/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#CF565D] uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  Scheduled Appointment Window
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-[#746D69] block">Date</span>
                    <span className="text-xs font-bold text-[#292525]">
                      {formatDate(booking.scheduledDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#746D69] block">Appointment Time</span>
                    <span className="text-xs font-bold text-[#292525]">
                      {formatTime(booking.scheduledTime || booking.scheduledStartTime)} – {formatTime(booking.scheduledEndTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#746D69] block">Duration & Buffer</span>
                    <span className="text-xs font-bold text-[#292525]">
                      {booking.totalDurationMinutes} mins (+{booking.travelBufferMinutes || 30}m buffer)
                    </span>
                  </div>
                </div>
              </div>

              {/* Client & Address Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Profile */}
                <div className="p-5 rounded-3xl bg-white border border-[#E8D8C8]/60 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#292525] uppercase tracking-wider">
                    <User className="w-4 h-4 text-[#CF565D]" />
                    Client Profile
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-[#292525] text-sm">
                      {booking.customerDetails.name}
                    </p>
                    <div className="flex items-center gap-2 text-[#746D69]">
                      <Phone className="w-3.5 h-3.5 text-[#CF565D]" />
                      <a
                        href={`tel:${booking.customerDetails.phone}`}
                        className="hover:text-[#CF565D] underline font-medium"
                      >
                        {booking.customerDetails.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-[#746D69]">
                      <Mail className="w-3.5 h-3.5 text-[#CF565D]" />
                      <a
                        href={`mailto:${booking.customerDetails.email}`}
                        className="hover:text-[#CF565D] underline truncate"
                      >
                        {booking.customerDetails.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Service Address */}
                <div className="p-5 rounded-3xl bg-white border border-[#E8D8C8]/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#292525] uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-[#CF565D]" />
                      Service Address
                    </div>
                    {address?.zoneName && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#CF565D] border border-[#F5DAD6] text-[10px] font-bold">
                        {address.zoneName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#746D69] leading-relaxed">
                    <p className="font-semibold text-[#292525]">
                      {address?.unitNumber}, {address?.buildingName}
                    </p>
                    <p>
                      {address?.street ? `${address.street}, ` : ""}
                      {address?.area}, {address?.city}
                    </p>
                    {address?.accessInstructions && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
                        <span className="font-bold">Access Notes: </span>
                        {address.accessInstructions}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Staff Member */}
              <div className="p-5 rounded-3xl bg-white border border-[#E8D8C8]/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#292525] uppercase tracking-wider">
                    <UserCheck className="w-4 h-4 text-[#CF565D]" />
                    Assigned Therapist
                  </div>
                  {!isCancelled && !isCompleted && (
                    <button
                      type="button"
                      onClick={() => onOpenReassign(booking)}
                      className="text-xs font-semibold text-[#CF565D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {staff ? "Reassign Staff" : "Assign Therapist"}
                    </button>
                  )}
                </div>

                {staff ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2]/50 border border-[#E8D8C8]">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-white border border-[#E8D8C8] flex-shrink-0">
                        {staff.profileImage ? (
                          <Image
                            src={staff.profileImage}
                            alt={staff.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-[#CF565D] text-xs">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#292525]">{staff.name}</p>
                        <p className="text-[11px] text-[#746D69]">{staff.phone}</p>
                        <p className="text-[10px] text-[#746D69]">{staff.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge
                        status={booking.staffAssignmentStatus || "assigned"}
                        size="sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold">No Therapist Assigned</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        This appointment is currently unassigned. Assign a qualified therapist to dispatch.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReassign(booking)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] shadow-sm transition-colors cursor-pointer"
                    >
                      Assign Now
                    </button>
                  </div>
                )}
              </div>

              {/* Services Booked */}
              <div className="p-5 rounded-3xl bg-white border border-[#E8D8C8]/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#292525] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#CF565D]" />
                    Services & Rituals Booked
                  </div>
                  <span className="text-xs font-bold text-[#292525]">
                    Total: AED {Number(booking.totalPrice).toFixed(2)}
                  </span>
                </div>

                <div className="divide-y divide-[#FAF7F2]">
                  {booking.services.map((svc, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#292525]">{svc.name}</p>
                        <p className="text-[11px] text-[#746D69]">
                          Duration: {svc.durationMinutes} minutes
                        </p>
                      </div>
                      <span className="font-semibold text-[#292525]">
                        AED {Number(svc.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div className="pt-3 border-t border-[#FAF7F2]">
                    <span className="text-[11px] font-bold text-[#746D69] uppercase tracking-wider block mb-1">
                      Client Special Requests
                    </span>
                    <p className="text-xs text-[#292525] bg-[#FAF7F2]/60 p-3 rounded-2xl border border-[#E8D8C8]/60 italic">
                      &quot;{booking.specialRequests}&quot;
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "history" ? (
            /* History & Activity Log */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#292525] uppercase tracking-wider">
                  Assignment Audit Trail & History
                </h3>
                <span className="text-[11px] text-[#746D69]">
                  {booking.assignmentHistory?.length || 0} events recorded
                </span>
              </div>

              {!booking.assignmentHistory || booking.assignmentHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#746D69] bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8]">
                  No historical activity recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8D8C8]">
                  {booking.assignmentHistory.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#CF565D] border-2 border-white ring-2 ring-[#F5DAD6]" />
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/70 shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#292525] capitalize">
                            {item.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-[#746D69]">
                            {new Date(item.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {item.staffName && (
                          <p className="text-[11px] text-[#CF565D] font-medium">
                            Therapist: {item.staffName}
                          </p>
                        )}
                        {item.reason && (
                          <p className="text-[11px] text-[#746D69] italic">
                            &quot;{item.reason}&quot;
                          </p>
                        )}
                        <p className="text-[10px] text-stone-400">
                          By: {item.performedBy || "System"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Level 9: Notifications Log Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#292525] uppercase tracking-wider">
                    Notification Delivery History
                  </h3>
                  <p className="text-[11px] text-[#746D69]">
                    Email and WhatsApp alerts dispatched for this appointment.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={retryingId !== null}
                  onClick={handleRetryNotifications}
                  className="px-3 py-1 rounded-xl border border-[#E8D8C8] hover:bg-[#FAF7F2] text-xs font-medium text-[#746D69] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${retryingId === "all" ? "animate-spin" : ""}`}
                  />
                  <span>Retry Failures</span>
                </button>
              </div>

              {loadingNotifications ? (
                <div className="py-12 text-center text-xs text-[#746D69]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#CF565D] mb-2" />
                  Loading delivery results...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#746D69] bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8]">
                  No notification logs found for this appointment.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => {
                    const isSuccess = n.status === "sent";
                    const isLogged = n.status === "logged";
                    const isFailed = n.status === "failed";

                    return (
                      <div
                        key={n._id}
                        className="p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-xs text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#292525] capitalize">
                            {n.eventType.replace(/_/g, " ")}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isSuccess
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : isLogged
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {n.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#746D69] space-y-0.5">
                          <p>
                            <span className="font-semibold text-[#292525]">To:</span>{" "}
                            {n.recipient} ({n.recipientRole} • {n.channel})
                          </p>
                          {n.subject && (
                            <p>
                              <span className="font-semibold text-[#292525]">Subject:</span>{" "}
                              {n.subject}
                            </p>
                          )}
                          {n.providerMessageId && (
                            <p className="font-mono text-[10px] text-stone-400">
                              Provider ID: {n.providerMessageId}
                            </p>
                          )}
                          {n.errorMessage && (
                            <p className="text-rose-600 font-medium">
                              Error: {n.errorMessage}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#FAF7F2] flex items-center justify-between text-[10px] text-[#746D69]">
                          <span>
                            {new Date(n.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {n.confirmedAt && (
                            <span className="text-emerald-700 font-medium">
                              Confirmed Delivered
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#FAF7F2] bg-[#FAF7F2]/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!isCancelled && !isCompleted && (
              <button
                type="button"
                onClick={() => onOpenReassign(booking)}
                className="px-4 py-2 rounded-xl border border-[#CF565D] text-[#CF565D] hover:bg-[#F5DAD6]/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reassign
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenStatusModal(booking)}
              className="px-5 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] shadow-sm transition-colors cursor-pointer"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
