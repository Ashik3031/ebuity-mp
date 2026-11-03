"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { staffApi } from "../../../lib/api-client";
import {
  StaffProfile,
  StaffDashboardSummary,
  StaffLeave,
  StaffAttendance,
} from "../../../types/staff";
import { Booking } from "../../../types/booking";
import { format12Hour } from "../../../lib/booking-utils";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  CheckCheck,
  LogIn,
  LogOut,
  CalendarDays,
  FileText,
  Loader2,
  Sparkles,
  RefreshCw,
  Navigation,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Coffee,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  X,
  Bell,
} from "lucide-react";
import { useDashboardNotifications } from "../../../lib/browser-notifications";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";

export default function StaffDashboardPage() {
  const router = useRouter();

  // State
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [summary, setSummary] = useState<StaffDashboardSummary | null>(null);
  const [activeTab, setActiveTab] = useState<
    "today" | "upcoming" | "breaks" | "attendance" | "leaves"
  >("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Rejection modal
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Leave modal / form
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leavesList, setLeavesList] = useState<StaffLeave[]>([]);

  // Attendance history
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>(
    []
  );

  // Break choice state (Flexible by choice)
  const [breakStart, setBreakStart] = useState("14:00");
  const [breakEnd, setBreakEnd] = useState("15:00");
  const [breakLabel, setBreakLabel] = useState("Rest Break");
  const [breakSubmitting, setBreakSubmitting] = useState(false);
  const [breakError, setBreakError] = useState<string | null>(null);

  // Upcoming jobs state (synchronized across dashboard)
  const [upcomingJobs, setUpcomingJobs] = useState<Booking[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const loadUpcoming = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const res = await staffApi.getBookings({ filter: "upcoming" });
      if (res.success && res.bookings) {
        setUpcomingJobs(res.bookings);
      }
    } catch (err) {
      console.error("Error loading upcoming jobs:", err);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  // Load Dashboard Data
  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const [profRes, sumRes, upRes] = await Promise.all([
          staffApi.getProfile(),
          staffApi.getDashboardSummary(),
          staffApi.getBookings({ filter: "upcoming" }),
        ]);

        if (profRes.success && profRes.staff) {
          setProfile(profRes.staff);
          if (profRes.staff.breaks && profRes.staff.breaks.length > 0) {
            setBreakStart(profRes.staff.breaks[0].start || "14:00");
            setBreakEnd(profRes.staff.breaks[0].end || "15:00");
            setBreakLabel(profRes.staff.breaks[0].label || "Rest Break");
          }
        }
        if (sumRes.success && sumRes.summary) {
          setSummary(sumRes.summary);
        }
        if (upRes.success && upRes.bookings) {
          setUpcomingJobs(upRes.bookings);
        }
      } catch (err: unknown) {
        console.error("Staff dashboard fetch error:", err);
        // If unauthorized, redirect to staff login
        router.push("/staff/login");
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // In-place booking patch helper (0ms flicker-free update)
  const patchBookingInState = useCallback((updated: Partial<Booking> & { _id: string }) => {
    if (!updated?._id) return;
    setSummary((prev) => {
      if (!prev) return prev;
      const exists = prev.todayBookings.some((b) => b._id === updated._id);
      if (!exists && updated.status !== "cancelled") {
        return {
          ...prev,
          todayBookings: [updated as Booking, ...prev.todayBookings],
        };
      }
      return {
        ...prev,
        todayBookings: prev.todayBookings.map((b) =>
          b._id === updated._id ? { ...b, ...updated } : b
        ),
      };
    });

    setUpcomingJobs((prev) => {
      const exists = prev.some((b) => b._id === updated._id);
      if (!exists && updated.status !== "cancelled") {
        return [updated as Booking, ...prev];
      }
      return prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b));
    });
  }, []);

  // Real-time browser notifications for staff
  const {
    notifications: staffNotifications,
    unreadCount: staffUnreadCount,
    activeToast: staffActiveToast,
    permission: browserPerm,
    requestPermission: requestBrowserPerm,
    dismissToast: dismissStaffToast,
  } = useDashboardNotifications("staff", profile?._id);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "staff",
    staffId: profile?._id,
  });

  useRealtimeEvent(
    "booking:assigned",
    (data: any) => {
      const b = data?.booking || data;
      if (b?._id) {
        patchBookingInState(b);
      }
      loadUpcoming();
      loadDashboard();
    },
    { role: "staff", staffId: profile?._id }
  );

  useRealtimeEvent(
    "booking:updated",
    (data: any) => {
      const b = data?.booking || data;
      if (b?._id) {
        patchBookingInState(b);
      }
    },
    { role: "staff", staffId: profile?._id }
  );

  useRealtimeEvent(
    "booking:status_changed",
    (data: any) => {
      const b = data?.booking || data;
      if (b?._id) {
        patchBookingInState(b);
      }
    },
    { role: "staff", staffId: profile?._id }
  );

  useRealtimeEvent(
    "booking:created",
    (data: any) => {
      const b = data?.booking || data;
      if (b?._id) {
        patchBookingInState(b);
      }
    },
    { role: "staff", staffId: profile?._id }
  );

  useRealtimeEvent(
    "staff:updated",
    () => {
      loadDashboard();
    },
    { role: "staff", staffId: profile?._id }
  );

  // Load leaves when leaves tab opens
  const loadLeaves = useCallback(async () => {
    try {
      const res = await staffApi.getLeaves();
      if (res.success && res.leaves) {
        setLeavesList(res.leaves);
      }
    } catch (err) {
      console.error("Error loading leaves:", err);
    }
  }, []);

  // Load attendance records
  const loadAttendance = useCallback(async () => {
    try {
      const res = await staffApi.getAttendanceHistory(30);
      if (res.success && res.records) {
        setAttendanceRecords(res.records);
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
    }
  }, []);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === "upcoming") {
      loadUpcoming();
    }
    if (activeTab === "leaves") {
      loadLeaves();
    }
    if (activeTab === "attendance") {
      loadAttendance();
    }
  }, [activeTab, loadUpcoming, loadLeaves, loadAttendance]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await staffApi.logout();
      router.push("/staff/login");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/staff/login");
    }
  };

  // Clock In
  const handleClockIn = async () => {
    setActionLoading("clock-in");
    setMessage(null);
    try {
      const res = await staffApi.checkIn();
      if (res.success) {
        setMessage({
          type: "success",
          text: "Checked in successfully! You are now on duty for Dubai at-home assignments.",
        });
        await loadDashboard();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to clock in.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    setActionLoading("clock-out");
    setMessage(null);
    try {
      const res = await staffApi.checkOut();
      if (res.success) {
        setMessage({
          type: "success",
          text: "Checked out successfully. Have a wonderful rest!",
        });
        await loadDashboard();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to clock out.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Accept Appointment
  const handleAcceptJob = async (bookingId: string) => {
    setActionLoading(bookingId);
    setMessage(null);
    try {
      const res = await staffApi.acceptAssignment(bookingId);
      if (res.success) {
        setMessage({
          type: "success",
          text: "Appointment accepted and confirmed on your schedule!",
        });

        // 1. Immediately reflect in today's bookings
        setSummary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            todayBookings: prev.todayBookings.map((b) =>
              b._id === bookingId
                ? res.booking
                  ? { ...b, ...res.booking }
                  : { ...b, staffAssignmentStatus: "accepted" }
                : b
            ),
          };
        });

        // 2. Immediately reflect in upcoming jobs
        setUpcomingJobs((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? res.booking
                ? { ...b, ...res.booking }
                : { ...b, staffAssignmentStatus: "accepted" }
              : b
          )
        );
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to accept job.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Appointment Modal Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking || !rejectReason.trim()) return;

    setRejectSubmitting(true);
    const rejectedId = rejectingBooking._id;
    try {
      const res = await staffApi.rejectAssignment(
        rejectedId,
        rejectReason.trim()
      );
      if (res.success) {
        setMessage({
          type: "success",
          text: "Appointment declined. Automatic reassignment triggered.",
        });
        setRejectingBooking(null);
        setRejectReason("");

        // 1. Immediately remove from local lists
        setSummary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            todayBookings: prev.todayBookings.filter((b) => b._id !== rejectedId),
          };
        });
        setUpcomingJobs((prev) => prev.filter((b) => b._id !== rejectedId));
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reject job.",
      });
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Status Updates (on the way, arrived, in progress, completed)
  const handleStatusUpdate = async (
    bookingId: string,
    status: "on_the_way" | "arrived" | "in_progress" | "completed"
  ) => {
    setActionLoading(`${bookingId}-${status}`);
    setMessage(null);
    try {
      const res = await staffApi.updateJobStatus(bookingId, status);
      if (res.success) {
        const labels: Record<string, string> = {
          on_the_way: "Status updated: You are on the way to the client!",
          arrived: "Status updated: You have arrived on location!",
          in_progress: "Status updated: At-home service has begun!",
          completed: "Congratulations! Ritual marked as completed.",
        };
        setMessage({
          type: "success",
          text: labels[status] || "Status updated successfully.",
        });

        // 1. Immediately reflect status update in today's bookings
        setSummary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            todayBookings: prev.todayBookings.map((b) =>
              b._id === bookingId
                ? res.booking
                  ? { ...b, ...res.booking }
                  : {
                      ...b,
                      staffAssignmentStatus: status,
                      status: status === "completed" ? "completed" : b.status,
                    }
                : b
            ),
            completedJobsCount:
              status === "completed"
                ? prev.completedJobsCount + 1
                : prev.completedJobsCount,
          };
        });

        // 2. Immediately reflect status update in upcoming jobs
        setUpcomingJobs((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? res.booking
                ? { ...b, ...res.booking }
                : {
                    ...b,
                    staffAssignmentStatus: status,
                    status: status === "completed" ? "completed" : b.status,
                  }
              : b
          )
        );
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update status.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) return;

    setLeaveSubmitting(true);
    setMessage(null);
    try {
      const res = await staffApi.submitLeave({
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason.trim(),
      });
      if (res.success) {
        setMessage({
          type: "success",
          text: "Leave request submitted to administration for approval.",
        });
        setLeaveStartDate("");
        setLeaveEndDate("");
        setLeaveReason("");
        await loadLeaves();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit leave.",
      });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Save chosen break time (Staff Choice)
  const handleSaveBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    setBreakError(null);

    if (!breakStart || !breakEnd) {
      setBreakError("Please specify both start and end times for your break.");
      return;
    }

    const [sH, sM] = breakStart.split(":").map(Number);
    const [eH, eM] = breakEnd.split(":").map(Number);
    if (sH * 60 + sM >= eH * 60 + eM) {
      setBreakError("Break start time must be before end time.");
      return;
    }

    setBreakSubmitting(true);
    try {
      const res = await staffApi.updateBreaks([
        {
          start: breakStart,
          end: breakEnd,
          label: breakLabel.trim() || "Rest Break",
        },
      ]);

      if (res.success) {
        setMessage({
          type: "success",
          text: "Break time updated successfully based on your choice!",
        });
        setProfile((prev) => (prev ? { ...prev, breaks: res.breaks } : null));
      }
    } catch (err: unknown) {
      setBreakError(
        err instanceof Error ? err.message : "Failed to update break time."
      );
    } finally {
      setBreakSubmitting(false);
    }
  };

  // Clear break to stay completely flexible
  const handleClearBreak = async () => {
    setBreakSubmitting(true);
    setBreakError(null);
    try {
      const res = await staffApi.updateBreaks([]);
      if (res.success) {
        setMessage({
          type: "success",
          text: "Break removed! You now have full flexible break time based on your free time.",
        });
        setProfile((prev) => (prev ? { ...prev, breaks: [] } : null));
      }
    } catch (err: unknown) {
      setBreakError(
        err instanceof Error ? err.message : "Failed to clear break."
      );
    } finally {
      setBreakSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#CF565D] animate-spin mb-3" />
        <p className="text-[#746D69] font-serif text-sm tracking-wide">
          Loading Rose Essence Specialist Portal...
        </p>
      </div>
    );
  }

  const attendance = summary?.attendanceToday;
  const isCheckedIn = Boolean(attendance?.checkIn && !attendance?.checkOut);
  const isCheckedOut = Boolean(attendance?.checkOut);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name ? profile.name.split(" ")[0] : "Specialist";

  const TAB_ITEMS: Array<{
    id: "today" | "upcoming" | "breaks" | "attendance" | "leaves";
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    {
      id: "today",
      label: "Today's Jobs",
      icon: Briefcase,
      badge: summary?.todayBookings?.length || 0,
    },
    {
      id: "upcoming",
      label: "Upcoming Jobs",
      icon: Calendar,
      badge: summary?.upcomingJobsCount || 0,
    },
    {
      id: "breaks",
      label: "Break & Schedule",
      icon: Coffee,
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Clock,
    },
    {
      id: "leaves",
      label: "Leave Requests",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-2 sm:p-4 md:p-6 flex flex-col font-sans text-[#292525]">
      {/* ========================================================
          MAIN CONTENT SURFACE (Rounded Luxury Canvas from Admin UI)
         ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl md:rounded-[2rem] border border-[#E8D8C8]/70 shadow-[0_4px_30px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Top Header Inside Canvas */}
        <header className="px-5 md:px-8 py-4 border-b border-[#E8D8C8]/50 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-20">
          {/* Left: Brand Badge & Role */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/staff/dashboard"
                className="w-10 h-10 rounded-2xl bg-[#CF565D] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(207,86,93,0.35)] hover:scale-105 transition-transform"
                title="Rose Essence Specialist"
              >
                <span className="font-serif font-black text-lg tracking-tighter">
                  RE
                </span>
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-lg md:text-xl text-[#292525]">
                    Rose Essence
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-[#FAF7F2] text-[#CF565D] px-2.5 py-0.5 rounded-full border border-[#E8D8C8]">
                    Specialist Portal
                  </span>
                </div>
                <p className="text-[11px] text-[#746D69] hidden sm:block">
                  Field Operations • Dubai GST
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center font-bold text-xs text-[#CF565D]"
              >
                {profile?.name?.charAt(0) || "S"}
              </button>
            </div>
          </div>

          {/* Center: Top Floating Pill Navigation (Matching Admin Layout) */}
          <nav className="hidden lg:flex items-center bg-[#FAF7F2] p-1 rounded-full border border-[#E8D8C8]/80 shadow-xs">
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#292525] text-white shadow-xs"
                      : "text-[#746D69] hover:text-[#292525]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-[#CF565D] text-white"
                          : "bg-[#E8D8C8]/80 text-[#292525]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Duty Clocking, Refresh & Specialist Profile Pill */}
          <div className="flex items-center gap-2.5 justify-end">
            {/* Clock in / Clock out buttons */}
            {!isCheckedIn && !isCheckedOut && (
              <button
                onClick={handleClockIn}
                disabled={actionLoading === "clock-in"}
                className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {actionLoading === "clock-in" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Clock In</span>
              </button>
            )}

            {isCheckedIn && (
              <button
                onClick={handleClockOut}
                disabled={actionLoading === "clock-out"}
                className="px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {actionLoading === "clock-out" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Clock Out</span>
              </button>
            )}

            {isCheckedOut && (
              <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#746D69] text-xs font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Day Done</span>
              </span>
            )}

            {/* Real-time Live Status Badge (replaces manual refresh) */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8]/80 text-xs font-semibold shadow-xs"
              title={
                isRealtimeConnected
                  ? "Real-time updates active (Socket.IO)"
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

            {/* Browser notification prompt */}
            {browserPerm !== "granted" && (
              <button
                type="button"
                onClick={requestBrowserPerm}
                className="px-3 py-1.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] flex items-center gap-1.5 shadow-xs transition-all hover:bg-[#FAF7F2]"
                title="Enable Browser Notifications for Assigned Bookings"
              >
                <Bell className="w-3.5 h-3.5 text-[#CF565D]" />
                <span className="hidden sm:inline">Enable Browser Notifications</span>
                <span className="sm:hidden">Alerts</span>
              </button>
            )}

            {/* Specialist Profile Pill Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8]/80 hover:border-[#CF565D]/50 transition-all text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#CF565D] to-[#F5DAD6] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {profile?.name?.charAt(0) || "S"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-[#292525] leading-tight">
                    {profile?.name || "Specialist"}
                  </p>
                  <p className="text-[10px] text-[#746D69] leading-tight truncate max-w-[120px]">
                    {profile?.employeeId || "Therapist"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#746D69]" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-[#E8D8C8] shadow-xl p-3 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#E8D8C8]/50 mb-1">
                    <p className="font-bold text-[#292525]">{profile?.name}</p>
                    <p className="text-[11px] text-[#746D69] truncate">
                      {profile?.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-[#FCF4F2] text-[#CF565D] px-2 py-0.5 rounded-full">
                      Field Specialist
                    </span>
                  </div>

                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#746D69] hover:bg-[#FAF7F2] hover:text-[#292525]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Customer Site</span>
                  </Link>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Pill Nav */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-[#E8D8C8]/60 bg-[#FAF7F2]/60 overflow-x-auto">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#292525] text-white shadow-xs"
                    : "bg-white text-[#746D69] border border-[#E8D8C8]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 rounded-full ${
                      isSelected
                        ? "bg-[#CF565D] text-white"
                        : "bg-[#FAF7F2] text-[#292525]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body Canvas */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          {/* Toast / Banner Message */}
          {message && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 transition-all ${
                message.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="text-xs md:text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* ========================================================
              1. OPERATIONAL GREETING & SPECIALIST HERO BANNER
             ======================================================== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#CF565D] uppercase tracking-wider">
                <span>Specialist Operations</span>
                <span>•</span>
                <span>Real-Time Dispatch</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-[#292525] mt-0.5">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs md:text-sm text-[#746D69] mt-1">
                Dubai at-home appointments, real-time client dispatch, schedule
                management, and duty tracking.
              </p>
            </div>
          </div>

          {/* Specialist Profile Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FAF7F2] via-white to-[#F5DAD6]/25 border border-[#E8D8C8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border-2 border-[#E8D8C8] shadow-sm shrink-0 flex items-center justify-center">
                {profile?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profileImage}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#FAF7F2] flex items-center justify-center font-serif font-bold text-xl text-[#CF565D]">
                    {profile?.name?.charAt(0) || "S"}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-[#292525]">
                    {profile?.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FCF4F2] text-[#CF565D] border border-[#CF565D]/30">
                    Field Specialist
                  </span>
                </div>
                <p className="text-xs text-[#746D69] mt-0.5">
                  {profile?.email} • {profile?.phone}
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="text-[11px] font-medium text-[#292525] bg-white border border-[#E8D8C8] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                    Shift: {format12Hour(profile?.workingHours?.start || "09:00")}{" "}
                    – {format12Hour(profile?.workingHours?.end || "21:00")}
                  </span>
                  <span className="text-[11px] font-medium text-[#292525] bg-white border border-[#E8D8C8] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                    <MapPin className="w-3.5 h-3.5 text-[#CF565D]" />
                    Base: {profile?.baseZoneName || "Dubai"}
                  </span>
                  <span className="text-[11px] font-medium text-[#292525] bg-white border border-[#E8D8C8] px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                    <Coffee className="w-3.5 h-3.5 text-[#CF565D]" />
                    Break:{" "}
                    {profile?.breaks && profile.breaks.length > 0
                      ? profile.breaks
                          .map(
                            (b) =>
                              `${format12Hour(b.start)} – ${format12Hour(
                                b.end
                              )}`
                          )
                          .join(", ")
                      : "Flexible (Your Choice)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Status Badge Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8D8C8] shadow-xs text-right sm:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-wider text-[#746D69] font-semibold">
                Today&apos;s Duty Status
              </p>
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCheckedIn
                      ? "bg-emerald-500 animate-pulse"
                      : isCheckedOut
                      ? "bg-gray-400"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-bold text-[#292525]">
                  {isCheckedIn
                    ? "On Duty (Clocked In)"
                    : isCheckedOut
                    ? "Clocked Out"
                    : "Not Checked In"}
                </span>
              </div>
              {attendance?.checkIn && (
                <p className="text-[11px] text-[#746D69] mt-1 font-mono">
                  In:{" "}
                  {new Date(attendance.checkIn).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  {attendance.checkOut &&
                    ` • Out: ${new Date(
                      attendance.checkOut
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}`}
                </p>
              )}
            </div>
          </div>

          {/* ========================================================
              2. QUICK METRIC STAT CARDS (Styled Like Admin Dashboard)
             ======================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF7F2]/70 border border-[#E8D8C8]/80 hover:border-[#CF565D]/40 transition-all shadow-xs">
              <span className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider block">
                Today&apos;s Appointments
              </span>
              <p className="text-2xl md:text-3xl font-serif font-bold text-[#292525] mt-1">
                {summary?.todayJobsCount || 0}
              </p>
              <span className="text-[11px] text-[#746D69] mt-1 block">
                Scheduled for today
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2]/70 border border-[#E8D8C8]/80 hover:border-[#CF565D]/40 transition-all shadow-xs">
              <span className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider block">
                Upcoming Bookings
              </span>
              <p className="text-2xl md:text-3xl font-serif font-bold text-[#292525] mt-1">
                {summary?.upcomingJobsCount || 0}
              </p>
              <span className="text-[11px] text-[#746D69] mt-1 block">
                Assigned future dates
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2]/70 border border-[#E8D8C8]/80 hover:border-[#CF565D]/40 transition-all shadow-xs">
              <span className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider block">
                Completed Services
              </span>
              <p className="text-2xl md:text-3xl font-serif font-bold text-[#292525] mt-1">
                {summary?.completedJobsCount || 0}
              </p>
              <span className="text-[11px] text-[#746D69] mt-1 block">
                Total lifetime jobs
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2]/70 border border-[#E8D8C8]/80 hover:border-[#CF565D]/40 transition-all shadow-xs">
              <span className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider block">
                Weekly Regular Off
              </span>
              <p className="text-lg md:text-xl font-serif font-bold text-[#292525] mt-1.5">
                {profile?.weeklyOffDays
                  ?.map(
                    (d) =>
                      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
                  )
                  .join(", ") || "None"}
              </p>
              <span className="text-[11px] text-[#746D69] mt-1 block">
                Protected rest days
              </span>
            </div>
          </div>

          {/* ========================================================
              3. TAB CONTENTS
             ======================================================== */}

          {/* Tab 1: Today's Jobs */}
          {activeTab === "today" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8D8C8]/60">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#292525]">
                    Today&apos;s Assigned Rituals
                  </h3>
                  <p className="text-xs text-[#746D69]">
                    Client appointments scheduled for delivery across Dubai
                    today.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525]">
                  {summary?.todayBookings?.length || 0} Appointments
                </span>
              </div>

              {summary?.todayBookings && summary.todayBookings.length > 0 ? (
                summary.todayBookings.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    actionLoading={actionLoading}
                    onAccept={() => handleAcceptJob(job._id)}
                    onReject={() => setRejectingBooking(job)}
                    onStatusUpdate={(status) =>
                      handleStatusUpdate(job._id, status)
                    }
                  />
                ))
              ) : (
                <div className="py-16 text-center rounded-3xl bg-[#FAF7F2]/50 border border-[#E8D8C8] p-8">
                  <Sparkles className="w-10 h-10 text-[#CF565D] mx-auto mb-3" />
                  <h3 className="text-base font-serif font-bold text-[#292525]">
                    No Appointments Scheduled For Today
                  </h3>
                  <p className="text-xs text-[#746D69] max-w-sm mx-auto mt-1">
                    Enjoy your open schedule or keep your duty status clocked in
                    to receive automatic client assignments.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upcoming Jobs */}
          {activeTab === "upcoming" && (
            <UpcomingJobsList
              upcoming={upcomingJobs}
              loading={loadingUpcoming}
              actionLoading={actionLoading}
              onAccept={handleAcceptJob}
              onReject={(job) => setRejectingBooking(job)}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {/* Tab 3: Break Time & Schedule (Staff Choice) */}
          {activeTab === "breaks" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Break Configuration Form */}
              <div className="lg:col-span-1 p-6 rounded-3xl bg-[#FAF7F2]/60 border border-[#E8D8C8] space-y-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 text-[#CF565D] mb-1">
                    <Coffee className="w-5 h-5" />
                    <h3 className="text-base font-serif font-bold text-[#292525]">
                      Your Break Time Choice
                    </h3>
                  </div>
                  <p className="text-xs text-[#746D69] leading-relaxed">
                    Breaks are 100% flexible. You can set a reserved break slot
                    based on your free time, or clear it to keep complete
                    flexibility between client bookings.
                  </p>
                </div>

                {breakError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{breakError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveBreak} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#746D69] uppercase tracking-wider mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs font-bold focus:outline-none focus:border-[#CF565D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#746D69] uppercase tracking-wider mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs font-bold focus:outline-none focus:border-[#CF565D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#746D69] uppercase tracking-wider mb-1">
                      Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={breakLabel}
                      onChange={(e) => setBreakLabel(e.target.value)}
                      placeholder="E.g., Lunch & Rest, Afternoon Coffee"
                      className="w-full px-3 py-2 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={breakSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {breakSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Save Chosen Break</span>
                    </button>

                    {profile?.breaks && profile.breaks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearBreak}
                        disabled={breakSubmitting}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Clear Break (Keep 100% Flexible)</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Current Status & Free Time Overview */}
              <div className="lg:col-span-2 space-y-4">
                {/* Current Break Status Card */}
                <div className="p-6 rounded-3xl bg-white border border-[#E8D8C8] shadow-xs">
                  <h4 className="text-xs uppercase tracking-wider text-[#746D69] font-bold mb-3">
                    Active Break Preference
                  </h4>

                  {profile?.breaks && profile.breaks.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-[#FCF4F2] border border-[#E8D8C8] flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-white text-[#CF565D] border border-[#E8D8C8]/60 shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-[#292525]">
                            {profile.breaks[0].label || "Rest Break"}
                          </h5>
                          <p className="text-xs text-[#CF565D] font-semibold mt-0.5">
                            {format12Hour(profile.breaks[0].start)} –{" "}
                            {format12Hour(profile.breaks[0].end)} GST
                          </p>
                          <p className="text-[11px] text-[#746D69] mt-1">
                            Automatic booking assignments will avoid this
                            window to protect your selected rest time.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleClearBreak}
                        disabled={breakSubmitting}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#E8D8C8] text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-white text-emerald-600 border border-emerald-200 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-emerald-900">
                          100% Flexible Breaks Active
                        </h5>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          You have no fixed break window configured. You have
                          complete freedom to choose when to rest during your
                          free time between client appointments.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Today's Appointments & Free Time Visualizer */}
                <div className="p-6 rounded-3xl bg-white border border-[#E8D8C8] shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[#746D69] font-bold">
                        Today&apos;s Appointments & Free Time Visualizer
                      </h4>
                      <span className="text-[11px] text-[#746D69]">
                        Shift window:{" "}
                        {format12Hour(profile?.workingHours?.start || "09:00")} –{" "}
                        {format12Hour(profile?.workingHours?.end || "21:00")} GST
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#292525] bg-[#FAF7F2] border border-[#E8D8C8] px-2.5 py-1 rounded-full">
                      {summary?.todayBookings?.length || 0} Jobs Scheduled
                    </span>
                  </div>

                  {summary?.todayBookings && summary.todayBookings.length > 0 ? (
                    <div className="space-y-2.5">
                      {summary.todayBookings.map((job) => {
                        const rawStart =
                          (job as any).scheduledTime ||
                          new Date(job.scheduledStartTime).toLocaleTimeString(
                            "en-GB",
                            {
                              timeZone: "Asia/Dubai",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          );
                        const rawEnd = new Date(
                          job.scheduledEndTime
                        ).toLocaleTimeString("en-GB", {
                          timeZone: "Asia/Dubai",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={job._id}
                            className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-[#CF565D] bg-white border border-[#E8D8C8] px-2.5 py-1 rounded-xl shadow-2xs">
                                {format12Hour(rawStart)} – {format12Hour(rawEnd)}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#292525]">
                                  {job.services?.[0]?.name ||
                                    (job as any).service?.name ||
                                    "Beauty Service"}
                                </p>
                                <p className="text-[11px] text-[#746D69]">
                                  {job.customerDetails?.name ||
                                    (job as any).customerName ||
                                    "Customer"}{" "}
                                  •{" "}
                                  {job.serviceAddress?.area ||
                                    (job as any).address?.zone ||
                                    "Dubai"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white border border-[#E8D8C8] text-[#746D69]">
                              {job.staffAssignmentStatus || "assigned"}
                            </span>
                          </div>
                        );
                      })}
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
                        <p className="text-xs font-medium text-amber-900">
                          Any gap between appointments above is your free time
                          to enjoy meals and rest at your choice!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-center">
                      <p className="text-xs text-[#746D69]">
                        No appointments scheduled yet today. Your shift is
                        currently open for flexible break time!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Attendance & Timeclock */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-[#FAF7F2]/60 border border-[#E8D8C8] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#292525]">
                    Daily Attendance Tracker
                  </h3>
                  <p className="text-xs text-[#746D69] mt-1 max-w-md">
                    Check in at the start of your shift to accept automatic
                    assignments. Check out when you have completed your final
                    service of the day.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClockIn}
                    disabled={
                      isCheckedIn ||
                      isCheckedOut ||
                      actionLoading === "clock-in"
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {actionLoading === "clock-in" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Check In</span>
                  </button>

                  <button
                    onClick={handleClockOut}
                    disabled={
                      !isCheckedIn ||
                      isCheckedOut ||
                      actionLoading === "clock-out"
                    }
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {actionLoading === "clock-out" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Check Out</span>
                  </button>
                </div>
              </div>

              {/* Attendance History Table */}
              <div className="rounded-3xl bg-white border border-[#E8D8C8] overflow-hidden shadow-xs">
                <div className="p-5 border-b border-[#E8D8C8]/60 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#292525]">
                    Recent Attendance Logs
                  </h4>
                  <button
                    onClick={loadAttendance}
                    className="text-xs font-semibold text-[#CF565D] hover:underline cursor-pointer"
                  >
                    Refresh Logs
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F2] text-[#746D69] uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="py-3.5 px-5">Date</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5">Check In</th>
                        <th className="py-3.5 px-5">Check Out</th>
                        <th className="py-3.5 px-5">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8D8C8]/60 text-[#292525]">
                      {attendanceRecords.length > 0 ? (
                        attendanceRecords.map((rec) => {
                          let durationStr = "—";
                          if (rec.checkIn && rec.checkOut) {
                            const diffMs =
                              new Date(rec.checkOut).getTime() -
                              new Date(rec.checkIn).getTime();
                            const hrs = Math.floor(diffMs / 3600000);
                            const mins = Math.floor((diffMs % 3600000) / 60000);
                            durationStr = `${hrs}h ${mins}m`;
                          }
                          return (
                            <tr
                              key={rec._id || rec.date}
                              className="hover:bg-[#FAF7F2]/40 transition-colors"
                            >
                              <td className="py-3 px-5 font-mono text-xs font-medium">
                                {rec.date}
                              </td>
                              <td className="py-3 px-5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {rec.status}
                                </span>
                              </td>
                              <td className="py-3 px-5">
                                {rec.checkIn
                                  ? new Date(rec.checkIn).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      }
                                    )
                                  : "—"}
                              </td>
                              <td className="py-3 px-5">
                                {rec.checkOut
                                  ? new Date(rec.checkOut).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      }
                                    )
                                  : "—"}
                              </td>
                              <td className="py-3 px-5 font-mono">
                                {durationStr}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-[#746D69]"
                          >
                            No attendance records found yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Leave Requests */}
          {activeTab === "leaves" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Submit Leave Form */}
              <div className="lg:col-span-1 p-6 rounded-3xl bg-[#FAF7F2]/60 border border-[#E8D8C8] space-y-4 shadow-xs">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#292525] mb-1">
                    Submit Leave Request
                  </h3>
                  <p className="text-xs text-[#746D69]">
                    Approved leaves block automatic appointment assignments to
                    protect your planned off time.
                  </p>
                </div>

                <form onSubmit={handleSubmitLeave} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#746D69] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#746D69] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      min={
                        leaveStartDate || new Date().toISOString().split("T")[0]
                      }
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#746D69] mb-1">
                      Reason
                    </label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="E.g. Family wedding, medical appointment, vacation..."
                      rows={3}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-[#292525] text-xs focus:outline-none focus:border-[#CF565D] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={leaveSubmitting}
                    className="w-full py-2.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white font-semibold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {leaveSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <span>Submit Leave Request</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Past Leave Requests Table */}
              <div className="lg:col-span-2 rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-xs">
                <h3 className="text-base font-serif font-bold text-[#292525] mb-1">
                  Your Leave Requests & Approvals
                </h3>
                <p className="text-xs text-[#746D69] mb-4">
                  Real-time status of your requested time off.
                </p>

                <div className="space-y-3">
                  {leavesList.length > 0 ? (
                    leavesList.map((leave, idx) => {
                      const startStr = new Date(
                        leave.startDate
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      const endStr = new Date(
                        leave.endDate
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={leave._id || idx}
                          className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-[#292525]">
                                {startStr} – {endStr}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  leave.status === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : leave.status === "rejected"
                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {leave.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#746D69] mt-1 italic">
                              &ldquo;{leave.reason}&rdquo;
                            </p>
                            {leave.reviewNotes && (
                              <p className="text-[11px] text-[#746D69] mt-0.5 font-medium">
                                Admin note: {leave.reviewNotes}
                              </p>
                            )}
                          </div>

                          <span className="text-[10px] text-[#746D69] font-mono">
                            Submitted:{" "}
                            {leave.requestedAt
                              ? new Date(leave.requestedAt).toLocaleDateString(
                                  "en-GB"
                                )
                              : "Recently"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs text-[#746D69]">
                      No leave requests submitted yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          4. REJECTION MODAL (Luxury Light Styling)
         ======================================================== */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8D8C8] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-serif font-bold text-[#292525]">
                Decline Appointment & Reassign
              </h3>
            </div>
            <p className="text-xs text-[#746D69] mb-4 leading-relaxed">
              Declining appointment{" "}
              <span className="font-mono font-bold text-[#CF565D]">
                {rejectingBooking.bookingNumber}
              </span>{" "}
              will automatically search for an alternative qualified specialist
              or flag this job for administrative concierge oversight.
            </p>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-[#746D69] mb-1.5 font-bold">
                Reason for Declining (Required)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Vehicle breakdown, emergency travel delay, conflicting emergency..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] text-xs focus:outline-none focus:border-[#CF565D] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRejectingBooking(null);
                  setRejectReason("");
                }}
                disabled={rejectSubmitting}
                className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2] text-xs font-semibold cursor-pointer"
              >
                Keep Job
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={rejectSubmitting || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {rejectSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Declining...</span>
                  </>
                ) : (
                  <span>Confirm Decline</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Realtime Toast Alert for Staff */}
      {staffActiveToast && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-full bg-white rounded-2xl border border-[#E8D8C8] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center shrink-0 text-[#CF565D]">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-[#292525] truncate">
                {staffActiveToast.title}
              </p>
              <button
                type="button"
                onClick={dismissStaffToast}
                className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#746D69] mt-0.5 line-clamp-2">
              {staffActiveToast.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab("today");
                dismissStaffToast();
              }}
              className="inline-block mt-1.5 text-[11px] font-bold text-[#CF565D] hover:underline cursor-pointer"
            >
              View Scheduled Rituals →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Job Card (Styled Like Admin Dashboard Cards)
function JobCard({
  job,
  actionLoading,
  onAccept,
  onReject,
  onStatusUpdate,
}: {
  job: Booking;
  actionLoading: string | null;
  onAccept: () => void;
  onReject: () => void;
  onStatusUpdate: (
    status: "on_the_way" | "arrived" | "in_progress" | "completed"
  ) => void;
}) {
  const rawStart =
    (job as any).scheduledTime ||
    new Date(job.scheduledStartTime).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dubai",
      hour: "2-digit",
      minute: "2-digit",
    });
  const rawEnd = new Date(job.scheduledEndTime).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startTime = format12Hour(rawStart);
  const endTime = format12Hour(rawEnd);
  const assignmentStatus = job.staffAssignmentStatus || "assigned";

  const scheduledDateFormatted = (() => {
    try {
      if (job.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(job.scheduledDate)) {
        const [y, m, d] = job.scheduledDate.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      if (job.scheduledStartTime) {
        return new Date(job.scheduledStartTime).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch (e) {}
    return job.scheduledDate || "Scheduled Date";
  })();

  return (
    <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-[#E8D8C8]/80 hover:border-[#CF565D]/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8D8C8]/60">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-[#CF565D] bg-[#FCF4F2] px-2.5 py-1 rounded-xl border border-[#E8D8C8]/60">
            {job.bookingNumber}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#292525] font-semibold bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E8D8C8]/80">
            <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>{scheduledDateFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#292525] font-semibold bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E8D8C8]/80">
            <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>
              {startTime} &ndash; {endTime} ({job.totalDurationMinutes} mins)
            </span>
          </div>
        </div>

        {/* Assignment Status Pill */}
        <div>
          {assignmentStatus === "assigned" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Pending Acceptance
            </span>
          )}
          {assignmentStatus === "accepted" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-600" />
              Accepted & Confirmed
            </span>
          )}
          {assignmentStatus === "on_the_way" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-amber-600" />
              Specialist On The Way
            </span>
          )}
          {assignmentStatus === "arrived" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-indigo-600" />
              Arrived on Location
            </span>
          )}
          {assignmentStatus === "in_progress" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
              <Play className="w-3 h-3 text-purple-600" />
              Ritual In Progress
            </span>
          )}
          {assignmentStatus === "completed" && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCheck className="w-3 h-3 text-emerald-600" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Body Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
        {/* Client & Address Info */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[#292525] font-bold">
            <User className="w-3.5 h-3.5 text-[#746D69]" />
            <span>{job.customerDetails?.name || "Client"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#746D69]">
            <Phone className="w-3.5 h-3.5 text-[#746D69]" />
            <a
              href={`tel:${job.customerDetails?.phone}`}
              className="hover:text-[#CF565D] underline font-mono text-xs font-semibold"
            >
              {job.customerDetails?.phone}
            </a>
          </div>
          <div className="flex items-start gap-2.5 text-[#292525] bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8D8C8]/70">
            <MapPin className="w-4 h-4 text-[#CF565D] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#292525]">
                Unit {job.serviceAddress?.unitNumber},{" "}
                {job.serviceAddress?.buildingName}
              </p>
              <p className="text-[#746D69] text-[11px]">
                {job.serviceAddress?.area}, {job.serviceAddress?.city}
              </p>
              {job.serviceAddress?.accessInstructions && (
                <p className="text-[11px] text-amber-900 mt-1 italic font-medium">
                  Note: &ldquo;{job.serviceAddress.accessInstructions}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Services snapshot */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-[#746D69] font-bold">
            Requested Services
          </p>
          <div className="space-y-1.5">
            {job.services?.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8]/60 text-xs"
              >
                <span className="text-[#292525] font-semibold">{s.name}</span>
                <span className="text-[#746D69] font-mono font-medium">
                  {s.durationMinutes} min • {s.price} AED
                </span>
              </div>
            ))}
          </div>
          {job.specialRequests && (
            <div className="text-[11px] text-[#746D69] bg-[#FCF4F2] p-2.5 rounded-xl border border-[#E8D8C8]/70">
              <span className="text-[#292525] font-bold">
                Special Client Request:
              </span>{" "}
              {job.specialRequests}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="pt-3 border-t border-[#E8D8C8]/60 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation link */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${job.serviceAddress?.buildingName || ""}, ${
              job.serviceAddress?.area || ""
            }, Dubai`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#CF565D] hover:underline flex items-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Open in Google Maps</span>
        </a>

        {/* Workflow Action State Machine */}
        <div className="flex items-center gap-2">
          {assignmentStatus === "assigned" && (
            <>
              <button
                onClick={onReject}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E8D8C8] hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Decline / Reject
              </button>
              <button
                onClick={onAccept}
                disabled={actionLoading === job._id}
                className="px-4 py-1.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {actionLoading === job._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Accept Appointment</span>
              </button>
            </>
          )}

          {assignmentStatus === "accepted" && (
            <button
              onClick={() => onStatusUpdate("on_the_way")}
              disabled={actionLoading === `${job._id}-on_the_way`}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {actionLoading === `${job._id}-on_the_way` ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>Start Driving (On The Way)</span>
            </button>
          )}

          {assignmentStatus === "on_the_way" && (
            <button
              onClick={() => onStatusUpdate("arrived")}
              disabled={actionLoading === `${job._id}-arrived`}
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {actionLoading === `${job._id}-arrived` ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>Mark Arrived</span>
            </button>
          )}

          {assignmentStatus === "arrived" && (
            <button
              onClick={() => onStatusUpdate("in_progress")}
              disabled={actionLoading === `${job._id}-in_progress`}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {actionLoading === `${job._id}-in_progress` ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Start Service</span>
            </button>
          )}

          {assignmentStatus === "in_progress" && (
            <button
              onClick={() => onStatusUpdate("completed")}
              disabled={actionLoading === `${job._id}-completed`}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {actionLoading === `${job._id}-completed` ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Complete Service</span>
            </button>
          )}

          {assignmentStatus === "completed" && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCheck className="w-4 h-4" />
              Job Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component: Upcoming Jobs List (with List & Calendar Views)
function UpcomingJobsList({
  upcoming,
  loading,
  actionLoading,
  onAccept,
  onReject,
  onStatusUpdate,
}: {
  upcoming: Booking[];
  loading: boolean;
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onReject: (job: Booking) => void;
  onStatusUpdate: (
    id: string,
    status: "on_the_way" | "arrived" | "in_progress" | "completed"
  ) => void;
}) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Group upcoming bookings by scheduledDate (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of upcoming) {
      let dStr = b.scheduledDate;
      if (!dStr && b.scheduledStartTime) {
        dStr = new Date(b.scheduledStartTime).toISOString().split("T")[0];
      }
      if (!dStr) continue;
      const list = map.get(dStr) || [];
      list.push(b);
      map.set(dStr, list);
    }
    return map;
  }, [upcoming]);

  // Compute Days for Month Calendar View
  const { monthDays, monthLabel, todayStr } = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      raw: Date;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(dayNum).padStart(2, "0");
      days.push({ dayNum, dateStr: `${y}-${m}-${dayStr}`, isCurrentMonth: false, raw: d });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const y = d.getFullYear();
      const m = String(month + 1).padStart(2, "0");
      const dayStr = String(dayNum).padStart(2, "0");
      days.push({ dayNum, dateStr: `${y}-${m}-${dayStr}`, isCurrentMonth: true, raw: d });
    }

    const monthLabel = calendarDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return { monthDays: days, monthLabel, todayStr };
  }, [calendarDate]);

  const handlePrevMonth = () => {
    const d = new Date(calendarDate);
    d.setMonth(d.getMonth() - 1);
    setCalendarDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(calendarDate);
    d.setMonth(d.getMonth() + 1);
    setCalendarDate(d);
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Determine filtered list of jobs to display below calendar or in list
  const displayedJobs = useMemo(() => {
    if (viewMode === "calendar" && selectedDateFilter) {
      return bookingsByDate.get(selectedDateFilter) || [];
    }
    return upcoming;
  }, [viewMode, selectedDateFilter, bookingsByDate, upcoming]);

  if (loading && upcoming.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[#746D69]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#CF565D] mb-2" />
        Loading upcoming schedule...
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="py-16 text-center rounded-3xl bg-[#FAF7F2]/50 border border-[#E8D8C8] p-8">
        <Calendar className="w-10 h-10 text-[#746D69] mx-auto mb-3" />
        <h3 className="text-base font-serif font-bold text-[#292525]">
          No Upcoming Appointments
        </h3>
        <p className="text-xs text-[#746D69] max-w-sm mx-auto mt-1">
          When clients book services matching your specialist qualifications,
          they will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D8C8]/60">
        <div>
          <h3 className="font-serif font-bold text-lg text-[#292525]">
            Upcoming Confirmed Appointments
          </h3>
          <p className="text-xs text-[#746D69]">
            Scheduled bookings assigned to you for upcoming dates.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525]">
            {upcoming.length} Future Jobs
          </span>

          {/* View Toggle */}
          <div className="bg-[#FAF7F2] p-1 rounded-2xl border border-[#E8D8C8] flex items-center">
            <button
              onClick={() => {
                setViewMode("list");
                setSelectedDateFilter(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                viewMode === "list"
                  ? "bg-[#CF565D] text-white shadow-xs"
                  : "text-[#746D69] hover:text-[#292525]"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                viewMode === "calendar"
                  ? "bg-[#CF565D] text-white shadow-xs"
                  : "text-[#746D69] hover:text-[#292525]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= CALENDAR VIEW ================= */}
      {viewMode === "calendar" && (
        <div className="space-y-5">
          {/* Calendar Container */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#E8D8C8] shadow-sm space-y-4">
            {/* Month Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69] hover:text-[#292525] transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-[#E8D8C8] hover:bg-[#FAF7F2] text-[#746D69] hover:text-[#292525] transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-[#FAF7F2] transition-colors"
                >
                  This Month
                </button>
                <h4 className="text-base font-serif font-bold text-[#292525] ml-2">
                  {monthLabel}
                </h4>
              </div>

              {selectedDateFilter && (
                <div className="flex items-center gap-2 self-start sm:self-auto bg-[#FCF4F2] px-3 py-1.5 rounded-xl border border-[#E8D8C8]">
                  <span className="text-xs text-[#CF565D] font-medium">
                    Filter: <strong>{selectedDateFilter}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(null)}
                    className="p-0.5 rounded-full hover:bg-white text-[#CF565D] transition-colors"
                    title="Clear Date Filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#746D69] uppercase tracking-wider py-1 border-b border-[#FAF7F2]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthDays.map((d, idx) => {
                const dayBookings = bookingsByDate.get(d.dateStr) || [];
                const isToday = d.dateStr === todayStr;
                const isSelected = selectedDateFilter === d.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (dayBookings.length > 0) {
                        setSelectedDateFilter(isSelected ? null : d.dateStr);
                      }
                    }}
                    className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                      d.isCurrentMonth
                        ? isSelected
                          ? "bg-[#FCF4F2] border-[#CF565D] ring-2 ring-[#CF565D]/30"
                          : dayBookings.length > 0
                          ? "bg-white border-[#CF565D]/40 hover:border-[#CF565D] shadow-xs"
                          : "bg-white border-[#E8D8C8]/60 hover:border-[#CF565D]/30"
                        : "bg-[#FAF7F2]/40 border-stone-100 opacity-50"
                    } ${isToday && !isSelected ? "ring-2 ring-emerald-500/40 bg-emerald-50/20" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isSelected
                            ? "bg-[#CF565D] text-white"
                            : isToday
                            ? "bg-emerald-600 text-white"
                            : d.isCurrentMonth
                            ? "text-[#292525]"
                            : "text-[#746D69]"
                        }`}
                      >
                        {d.dayNum}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-[10px] font-bold text-[#CF565D] bg-[#FCF4F2] px-1.5 py-0.5 rounded-full border border-[#E8D8C8]">
                          {dayBookings.length} {dayBookings.length === 1 ? "Job" : "Jobs"}
                        </span>
                      )}
                    </div>

                    {/* Booking preview pills inside day cell */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                      {dayBookings.slice(0, 2).map((b) => {
                        const status = b.staffAssignmentStatus || "assigned";
                        return (
                          <div
                            key={b._id}
                            className={`p-1 rounded-md text-[9px] font-semibold truncate border ${
                              status === "on_the_way"
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : status === "arrived"
                                ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                                : status === "in_progress"
                                ? "bg-purple-50 text-purple-900 border-purple-200"
                                : status === "accepted"
                                ? "bg-sky-50 text-sky-900 border-sky-200"
                                : "bg-stone-50 text-stone-700 border-stone-200"
                            }`}
                          >
                            {(b as any).scheduledTime || "Ritual"} • {b.customerDetails?.name?.split(" ")[0]}
                          </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <span className="text-[9px] text-[#CF565D] font-bold block text-center">
                          +{dayBookings.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointments Details Section (Below Calendar) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8D8C8]/60">
              <h4 className="text-sm font-serif font-bold text-[#292525]">
                {selectedDateFilter ? (
                  <>Rituals Scheduled for <span className="text-[#CF565D] font-mono">{selectedDateFilter}</span> ({displayedJobs.length})</>
                ) : (
                  <>All Assigned Upcoming Rituals ({displayedJobs.length})</>
                )}
              </h4>
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(null)}
                  className="text-xs font-semibold text-[#CF565D] hover:underline"
                >
                  Show All Dates
                </button>
              )}
            </div>

            {displayedJobs.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-[#FAF7F2]/40 border border-[#E8D8C8] p-6">
                <Calendar className="w-8 h-8 text-[#746D69] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#292525]">No Rituals On Selected Date</p>
                <p className="text-[11px] text-[#746D69] mt-0.5">
                  Click on any highlighted calendar day with assigned bookings to inspect details.
                </p>
              </div>
            ) : (
              displayedJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  actionLoading={actionLoading}
                  onAccept={() => onAccept(job._id)}
                  onReject={() => onReject(job)}
                  onStatusUpdate={(status) => onStatusUpdate(job._id, status)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= LIST VIEW ================= */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {upcoming.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              actionLoading={actionLoading}
              onAccept={() => onAccept(job._id)}
              onReject={() => onReject(job)}
              onStatusUpdate={(status) => onStatusUpdate(job._id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
