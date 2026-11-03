"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  adminBookingApi,
  adminStaffApi,
  ApiError,
} from "../../../lib/api-client";
import { Booking } from "../../../types/booking";
import { StaffProfile } from "../../../types/staff";
import { formatBookingTime } from "../../../lib/booking-utils";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import { BookingDetailDrawer } from "../../../components/admin/BookingDetailDrawer";
import { ReassignStaffModal } from "../../../components/admin/ReassignStaffModal";
import { BookingStatusModal } from "../../../components/admin/BookingStatusModal";
import {
  CalendarDays,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  UserCheck,
  CreditCard,
  DollarSign,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";

export default function AdminBookingsPage() {
  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Staff List for Filter
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // Modals & Drawers
  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [reassignModalBooking, setReassignModalBooking] = useState<Booking | null>(null);
  const [statusModalBooking, setStatusModalBooking] = useState<Booking | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load Staff for Filter Dropdown
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await adminStaffApi.getAllStaff({ limit: 100 });
        if (res.success && res.staff) {
          setStaffList(res.staff);
        }
      } catch (err) {
        console.warn("Staff list fetch error:", err);
      }
    }
    loadStaff();
  }, []);

  // Fetch Bookings
  const fetchBookings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const params: {
        status?: string;
        date?: string;
        page: number;
        limit: number;
      } = {
        page: currentPage,
        limit: pageSize,
      };

      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      if (selectedDate.trim()) {
        params.date = selectedDate.trim();
      }

      const res = await adminBookingApi.getAll(params);

      if (res.success && Array.isArray(res.bookings)) {
        setBookings(res.bookings);
        setTotalCount(res.total ?? res.bookings.length);
        setTotalPages(res.totalPages ?? ((Math.ceil((res.total || 0) / pageSize)) || 1));
      } else {
        setBookings([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load bookings";
      if (!isSilent) setError(msg);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [currentPage, selectedStatus, selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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
      fetchBookings(true);
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
      fetchBookings(true);
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
      fetchBookings(true);
    },
    { role: "admin" }
  );

  // Client-side search and staff filter
  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((b) => {
        const num = b.bookingNumber?.toLowerCase() || "";
        const clientName = b.customerDetails?.name?.toLowerCase() || "";
        const clientEmail = b.customerDetails?.email?.toLowerCase() || "";
        const clientPhone = b.customerDetails?.phone?.toLowerCase() || "";
        const area = b.serviceAddress?.area?.toLowerCase() || "";
        const bldg = b.serviceAddress?.buildingName?.toLowerCase() || "";
        const staffName = b.assignedStaff?.name?.toLowerCase() || "";
        return (
          num.includes(q) ||
          clientName.includes(q) ||
          clientEmail.includes(q) ||
          clientPhone.includes(q) ||
          area.includes(q) ||
          bldg.includes(q) ||
          staffName.includes(q)
        );
      });
    }

    if (selectedStaffFilter !== "all") {
      if (selectedStaffFilter === "unassigned") {
        list = list.filter((b) => !b.assignedStaff);
      } else {
        list = list.filter(
          (b) =>
            b.assignedStaff &&
            (b.assignedStaff._id === selectedStaffFilter ||
              (b.assignedStaff as any) === selectedStaffFilter)
        );
      }
    }

    if (selectedStatus === "requests") {
      list = list.filter(
        (b) =>
          b.cancellationRequest?.status === "pending" ||
          b.rescheduleRequest?.status === "pending"
      );
    } else if (
      [
        "on_the_way",
        "arrived",
        "in_progress",
        "accepted",
        "assigned",
        "unassigned",
      ].includes(selectedStatus)
    ) {
      list = list.filter((b) => (b.staffAssignmentStatus || "unassigned") === selectedStatus);
    }

    return list;
  }, [bookings, search, selectedStaffFilter, selectedStatus]);

  // KPI Calculations
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = bookings.filter(
    (b) => b.status === "pending" || !b.assignedStaff || b.flaggedForAdmin
  ).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings.reduce(
    (acc, b) => (b.status !== "cancelled" ? acc + (Number(b.totalPrice) || 0) : acc),
    0
  );

  // Handlers for modal actions
  const handleReassignSuccess = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    if (drawerBooking?._id === updated._id) setDrawerBooking(updated);
    setReassignModalBooking(null);
    setNotification({
      type: "success",
      message: `Therapist successfully assigned to ${updated.bookingNumber}.`,
    });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleStatusUpdateSuccess = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    if (drawerBooking?._id === updated._id) setDrawerBooking(updated);
    setStatusModalBooking(null);
    setNotification({
      type: "success",
      message: `Status for ${updated.bookingNumber} updated to "${updated.status}".`,
    });
    setTimeout(() => setNotification(null), 3500);
  };

  const formatTime = (timeOrIso?: string, booking?: Partial<Booking>) => {
    return formatBookingTime(timeOrIso, booking);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#292525]">
              Appointments & Reservations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D] text-xs font-bold tracking-wider uppercase">
              Level 9
            </span>
          </div>
          <p className="text-xs text-[#746D69] mt-0.5">
            Oversee at-home beauty rituals, therapist dispatch statuses, and client schedules across the UAE.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/bookings/calendar"
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-[#292525] text-xs font-semibold hover:border-[#CF565D]/40 transition-colors shadow-sm flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-[#CF565D]" />
            Calendar View
          </Link>

          {/* Real-time Live Badge (replaces manual refresh) */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E8D8C8] text-xs font-semibold shadow-sm"
            title={
              isRealtimeConnected
                ? "Real-time sync active (Socket.IO): updates reflect without refreshing"
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
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D] flex-shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Total Bookings
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {totalCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Confirmed
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {confirmedCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Pending / Unassigned
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {pendingCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-700 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#CF565D]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Completed
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {completedCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-3.5 col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center text-[#CF565D] flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Revenue Volume
            </p>
            <p className="text-lg font-serif font-bold text-[#292525] mt-0.5">
              AED {totalRevenue.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-[#E8D8C8]/60 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#746D69]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference #, customer name, phone, or community/area..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/10 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] font-medium focus:outline-none focus:border-[#CF565D]"
          />

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] font-medium focus:outline-none focus:border-[#CF565D] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="requests">Pending Client Requests</option>
            <optgroup label="Booking Status">
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </optgroup>
            <optgroup label="Therapist Live Progress">
              <option value="on_the_way">🚗 On The Way</option>
              <option value="arrived">📍 Arrived</option>
              <option value="in_progress">✨ In Progress</option>
              <option value="accepted">✓ Accepted</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">⚠️ Unassigned</option>
            </optgroup>
          </select>

          {/* Staff Filter */}
          <select
            value={selectedStaffFilter}
            onChange={(e) => setSelectedStaffFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] font-medium focus:outline-none focus:border-[#CF565D] cursor-pointer max-w-[160px] truncate"
          >
            <option value="all">All Therapists</option>
            <option value="unassigned">⚠️ Unassigned Only</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Bookings Table Container */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-stone-100 rounded" />
                  <div className="h-3 w-1/3 bg-stone-100 rounded" />
                </div>
                <div className="h-4 w-20 bg-stone-100 rounded" />
                <div className="h-6 w-20 bg-stone-100 rounded-full" />
                <div className="h-8 w-24 bg-stone-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              Error Loading Bookings
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => fetchBookings()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-[#F5DAD6]/50 border border-[#F5DAD6] text-[#CF565D] flex items-center justify-center mx-auto">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Bookings Found
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">
              {search || selectedDate || selectedStatus !== "all" || selectedStaffFilter !== "all"
                ? "No appointments match your active filter criteria. Try resetting search or status filters."
                : "No customer service reservations recorded in the system yet."}
            </p>
            {(search || selectedDate || selectedStatus !== "all" || selectedStaffFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedDate("");
                  setSelectedStatus("all");
                  setSelectedStaffFilter("all");
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-stone-50 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#FAF7F2] bg-[#FAF7F2]/60 text-[11px] font-bold text-[#746D69] uppercase tracking-wider">
                  <th className="py-4 px-5">Booking Ref</th>
                  <th className="py-4 px-4">Client</th>
                  <th className="py-4 px-4">Services</th>
                  <th className="py-4 px-4">Date & Time</th>
                  <th className="py-4 px-4">Address & Zone</th>
                  <th className="py-4 px-4">Therapist</th>
                  <th className="py-4 px-4">Total (AED)</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2] text-xs">
                {filteredBookings.map((bk) => {
                  const staff = bk.assignedStaff;
                  const isUnassigned = !staff;
                  const serviceSummary =
                    bk.services && bk.services.length > 0
                      ? bk.services.map((s) => s.name).join(", ")
                      : "Ritual Session";

                  return (
                    <tr
                      key={bk._id}
                      className="hover:bg-[#FAF7F2]/40 transition-colors group"
                    >
                      {/* Booking Number */}
                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => setDrawerBooking(bk)}
                          className="text-left group/btn"
                        >
                          <span className="font-mono font-bold text-[#CF565D] group-hover/btn:underline block">
                            {bk.bookingNumber}
                          </span>
                          <span className="text-[10px] text-[#746D69]">
                            {new Date(bk.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-[#292525] truncate max-w-[150px]">
                            {bk.customerDetails.name}
                          </p>
                          <p className="text-[11px] text-[#746D69] truncate max-w-[150px]">
                            {bk.customerDetails.phone}
                          </p>
                        </div>
                      </td>

                      {/* Services */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[180px]">
                          <p className="font-medium text-[#292525] truncate" title={serviceSummary}>
                            {serviceSummary}
                          </p>
                          <span className="text-[10px] text-[#746D69] font-mono">
                            {bk.services?.length} service(s) • {bk.totalDurationMinutes}m
                          </span>
                        </div>
                      </td>

                      {/* Scheduled Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#292525]">
                            {bk.scheduledDate}
                          </span>
                          <span className="text-[11px] text-[#746D69] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#CF565D]" />
                            {formatTime(bk.scheduledTime || bk.scheduledStartTime, bk)}
                          </span>
                        </div>
                      </td>

                      {/* Address & Zone */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[150px]">
                          <p className="text-[#292525] truncate font-medium">
                            {bk.serviceAddress?.area || "Dubai"}
                          </p>
                          <p className="text-[10px] text-[#746D69] truncate">
                            {bk.serviceAddress?.buildingName || bk.serviceAddress?.city}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Therapist */}
                      <td className="py-3.5 px-4">
                        {staff ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-stone-100 flex-shrink-0">
                              {staff.profileImage ? (
                                <Image
                                  src={staff.profileImage}
                                  alt={staff.name}
                                  fill
                                  sizes="28px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-[#CF565D] text-[10px]">
                                  {staff.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="font-medium text-[#292525] truncate max-w-[110px]">
                              {staff.name}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReassignModalBooking(bk)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Unassigned
                          </button>
                        )}
                      </td>

                      {/* Price in AED */}
                      <td className="py-3.5 px-4 font-bold text-[#292525]">
                        AED {Number(bk.totalPrice).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={bk.status} size="sm" />
                            {bk.staffAssignmentStatus &&
                              bk.staffAssignmentStatus !== "unassigned" &&
                              bk.status !== "completed" &&
                              bk.status !== "cancelled" && (
                                <StatusBadge
                                  status={bk.staffAssignmentStatus}
                                  size="sm"
                                />
                              )}
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Payment Confirmed
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDrawerBooking(bk)}
                            title="View appointment details"
                            className="p-1.5 rounded-xl border border-transparent hover:border-[#E8D8C8] hover:bg-white text-[#746D69] hover:text-[#292525] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {bk.status !== "cancelled" && bk.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() => setReassignModalBooking(bk)}
                              title="Reassign therapist"
                              className="p-1.5 rounded-xl border border-transparent hover:border-[#E8D8C8] hover:bg-white text-[#746D69] hover:text-[#CF565D] transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setStatusModalBooking(bk)}
                            title="Update status"
                            className="p-1.5 rounded-xl border border-transparent hover:border-[#E8D8C8] hover:bg-white text-[#746D69] hover:text-[#292525] transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
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

        {/* Pagination Bar */}
        {!loading && bookings.length > 0 && (
          <div className="p-4 border-t border-[#FAF7F2] bg-[#FAF7F2]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#746D69]">
            <p>
              Showing{" "}
              <span className="font-semibold text-[#292525]">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#292525]">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-[#292525]">{totalCount}</span>{" "}
              appointments
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-[#E8D8C8] bg-white text-[#292525] hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2 text-[#292525]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl border border-[#E8D8C8] bg-white text-[#292525] hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Drawer */}
      <BookingDetailDrawer
        booking={drawerBooking}
        onClose={() => setDrawerBooking(null)}
        onOpenReassign={(bk) => setReassignModalBooking(bk)}
        onOpenStatusModal={(bk) => setStatusModalBooking(bk)}
        onBookingUpdated={(updated) => {
          setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
          setDrawerBooking(updated);
        }}
      />

      {/* Reassign Therapist Modal */}
      <ReassignStaffModal
        booking={reassignModalBooking}
        onClose={() => setReassignModalBooking(null)}
        onSuccess={handleReassignSuccess}
      />

      {/* Status Transition Modal */}
      <BookingStatusModal
        booking={statusModalBooking}
        onClose={() => setStatusModalBooking(null)}
        onSuccess={handleStatusUpdateSuccess}
      />
    </div>
  );
}
