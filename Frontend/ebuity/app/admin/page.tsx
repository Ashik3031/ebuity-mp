"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../lib/admin-auth-context";
import { adminDashboardApi, DashboardStatsData } from "../../lib/api-client";
import { StatCard } from "../../components/admin/StatCard";
import { HeroStatCard } from "../../components/admin/HeroStatCard";
import { BookingTrendChart } from "../../components/admin/BookingTrendChart";
import { CategoryDistributionChart } from "../../components/admin/CategoryDistributionChart";
import { RecentActivitiesTable } from "../../components/admin/RecentActivitiesTable";
import { UpcomingAppointmentsWidget } from "../../components/admin/UpcomingAppointmentsWidget";
import { StaffAvailabilityWidget } from "../../components/admin/StaffAvailabilityWidget";
import { LowStockWidget } from "../../components/admin/LowStockWidget";
import { BookingStatusDistributionWidget } from "../../components/admin/BookingStatusDistributionWidget";
import { AdminAttentionAlertBox } from "../../components/admin/AdminAttentionAlertBox";
import {
  CalendarDays,
  Calendar,
  Users,
  Sparkles,
  ShoppingBag,

  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../lib/realtime-socket";

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState("AED");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "6m">("6m");
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (range: "7d" | "30d" | "6m" = timeRange) => {
    try {
      setError(null);
      const res = await adminDashboardApi.getStats({ range });
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn("Error fetching live dashboard metrics:", err);
      setError("Unable to sync live metrics from server. Showing cached view.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats(timeRange);
  }, [fetchStats, timeRange]);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "admin",
  });

  useRealtimeEvent(
    "booking:updated",
    () => {
      fetchStats(timeRange);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "booking:status_changed",
    () => {
      fetchStats(timeRange);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "booking:created",
    () => {
      fetchStats(timeRange);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "staff:updated",
    () => {
      fetchStats(timeRange);
    },
    { role: "admin" }
  );

  useRealtimeEvent(
    "order:created",
    () => {
      fetchStats(timeRange);
    },
    { role: "admin" }
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats(timeRange);
  };

  const handleRangeChange = (range: "7d" | "30d" | "6m") => {
    setTimeRange(range);
    setRefreshing(true);
    fetchStats(range);
  };

  // Determine time of day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const adminFirstName = admin?.name ? admin.name.split(" ")[0] : "Administrator";

  const metrics = stats?.metrics || {
    todayBookings: 0,
    upcomingBookings: 0,
    totalBookings: 0,
    totalCustomers: 0,
    activeStaff: 0,
    activeServices: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    unassignedBookingsCount: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    currency: "AED",
    revenueGrowth: 12,
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. GREETING & OPERATIONAL HEADER
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#CF565D] uppercase tracking-wider">
            <span>Executive Dashboard</span>
            <span>•</span>
            <span>Level 8 Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-[#292525] dark:text-[#FAF7F2] mt-0.5">
            {greeting}, {adminFirstName}
          </h1>
          <p className="text-xs md:text-sm text-[#746D69] dark:text-[#A89F9A] mt-1">
            Real-time Dubai wellness bookings, therapist scheduling, boutique inventory, and financial analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-white dark:bg-[#1f1b1b] p-1 rounded-xl border border-[#E8D8C8] dark:border-white/10 shadow-xs">
            {(["7d", "30d", "6m"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRangeChange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeRange === r
                    ? "bg-[#CF565D] text-white shadow-xs"
                    : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "6 Months"}
              </button>
            ))}
          </div>

          {/* Real-time Live Badge */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1f1b1b] border border-[#E8D8C8] dark:border-white/10 text-xs font-semibold shadow-xs"
            title={
              isRealtimeConnected
                ? "Real-time analytics sync active (Socket.IO)"
                : "Connecting to real-time service..."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={isRealtimeConnected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
              {isRealtimeConnected ? "Live" : "Connecting..."}
            </span>
          </div>

          <Link
            href="/admin/bookings"
            className="px-4 py-2 rounded-xl bg-[#292525] dark:bg-[#CF565D] hover:opacity-90 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-[#CF565D] dark:text-white" />
            <span>Bookings</span>
          </Link>
        </div>
      </div>

      {/* ========================================================
          OPERATIONAL ATTENTION ALERT BOX
          Aggregates all items needing immediate admin attention
         ======================================================== */}
      <AdminAttentionAlertBox
        stats={stats}
        error={error}
        onRefresh={handleRefresh}
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* ========================================================
          2. PRIMARY HERO WIDGETS ROW
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Left Column: Realized Revenue Hero Card */}
        <div className="lg:col-span-4 min-w-0 flex flex-col justify-between bg-white dark:bg-[#1f1b1b] rounded-2xl p-5 sm:p-6 border border-[#E8D8C8]/70 dark:border-white/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#746D69] dark:text-[#A89F9A] tracking-wider uppercase">
                Realized Revenue
              </span>
              <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 px-2 py-0.5 rounded-lg text-xs font-semibold text-[#292525] dark:text-[#FAF7F2]">
                <span>🇦🇪</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="text-3xl font-serif font-extrabold text-[#292525] dark:text-[#FAF7F2] tracking-tight">
              {metrics.totalRevenue > 0
                ? `${currency} ${metrics.totalRevenue.toLocaleString()}`
                : `${currency} 0`}
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{metrics.revenueGrowth || 12}% vs previous period</span>
            </div>
          </div>

          {/* Quick Management Links */}
          <div className="grid grid-cols-2 gap-2.5 my-6">
            <Link
              href="/admin/bookings"
              className="py-2.5 px-3 rounded-xl bg-[#292525] dark:bg-[#282323] hover:bg-[#1a1717] dark:hover:bg-[#322c2c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
            >
              <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
              <span>All Bookings</span>
            </Link>

            <Link
              href="/admin/customers"
              className="py-2.5 px-3 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 text-[#292525] dark:text-[#FAF7F2] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#F5DAD6]/30 dark:hover:bg-white/5 transition-all text-center"
            >
              <Users className="w-3.5 h-3.5 text-[#CF565D]" />
              <span>Clients ({metrics.totalCustomers || 0})</span>
            </Link>
          </div>

          {/* Operational Breakdown */}
          <div className="pt-4 border-t border-[#E8D8C8]/50 dark:border-white/10 space-y-2">
            <div className="text-[11px] font-semibold text-[#746D69] dark:text-[#A89F9A] uppercase tracking-wider">
              Operational Channels
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 text-center">
                <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A] block">At-Home</span>
                <span className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">85%</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 text-center">
                <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A] block">Boutique</span>
                <span className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">15%</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/60 dark:border-white/10 text-center">
                <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A] block">VIP Rituals</span>
                <span className="text-xs font-bold text-[#CF565D]">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: 2x2 Metric Cards Grid */}
        <div className="lg:col-span-4 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Today's Bookings */}
          <HeroStatCard
            title="Today's Bookings"
            value={metrics.todayBookings}
            icon={Sparkles}
            trend="Live UAE Day"
            badge="Asia/Dubai"
            subtitle="Rituals scheduled today"
          />

          {/* Upcoming Bookings */}
          <StatCard
            title="Upcoming Bookings"
            value={metrics.upcomingBookings || 0}
            icon={CalendarDays}
            trend="Active Queue"
            trendType="up"
            subtitle="Future scheduled rituals"
          />

          {/* Total Clients */}
          <StatCard
            title="Total Clients"
            value={metrics.totalCustomers || 0}
            icon={Users}
            trend="Registered"
            trendType="up"
            subtitle="Verified client accounts"
          />

          {/* Unassigned or Pending Attention */}
          <StatCard
            title="Unassigned Appointments"
            value={metrics.unassignedBookingsCount || 0}
            icon={AlertTriangle}
            trend={
              (metrics.unassignedBookingsCount || 0) > 0
                ? "Assign Therapist"
                : "All Assigned"
            }
            trendType={(metrics.unassignedBookingsCount || 0) > 0 ? "down" : "neutral"}
            subtitle="Requires therapist dispatch"
          />
        </div>

        {/* Right Column: Dynamic Booking Trend Chart */}
        <div className="lg:col-span-4 min-w-0">
          <BookingTrendChart
            data={stats?.charts?.bookingTrends || []}
            title="Rituals & Service Activity"
            subtitle={`Showing treatment trends for ${timeRange.toUpperCase()}`}
            currentRange={timeRange}
            onRangeChange={handleRangeChange}
          />
        </div>
      </div>

      {/* ========================================================
          3. SECONDARY METRICS BAR
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Rituals */}
        <Link
          href="/admin/services"
          className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 border border-[#E8D8C8]/60 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-[#CF565D]/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-center text-[#CF565D]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] dark:text-[#A89F9A] uppercase font-semibold block">
              Active Services
            </span>
            <span className="text-lg font-bold text-[#292525] dark:text-[#FAF7F2]">
              {metrics.activeServices} Rituals
            </span>
          </div>
        </Link>

        {/* Active Products */}
        <Link
          href="/admin/products"
          className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 border border-[#E8D8C8]/60 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-[#CF565D]/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-center text-[#292525] dark:text-[#FAF7F2]">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] dark:text-[#A89F9A] uppercase font-semibold block">
              Boutique Catalog
            </span>
            <span className="text-lg font-bold text-[#292525] dark:text-[#FAF7F2]">
              {metrics.activeProducts} Products
            </span>
          </div>
        </Link>

        {/* Verified Therapists */}
        <Link
          href="/admin/staff"
          className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 border border-[#E8D8C8]/60 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-[#CF565D]/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] dark:text-[#A89F9A] uppercase font-semibold block">
              Verified Therapists
            </span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {metrics.activeStaff} Active Staff
            </span>
          </div>
        </Link>

        {/* Low Stock / Inventory Alerts */}
        <Link
          href="/admin/products"
          className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 border border-[#E8D8C8]/60 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-[#CF565D]/60 transition-colors"
        >
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${(metrics.lowStockCount || 0) + (metrics.outOfStockCount || 0) > 0
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400"
                : "bg-[#FAF7F2] dark:bg-[#282323] border-[#E8D8C8] dark:border-white/10 text-[#746D69] dark:text-[#A89F9A]"
              }`}
          >
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] dark:text-[#A89F9A] uppercase font-semibold block">
              Stock Warnings
            </span>
            <span className="text-lg font-bold text-[#292525] dark:text-[#FAF7F2]">
              {(metrics.lowStockCount || 0) + (metrics.outOfStockCount || 0) > 0
                ? `${(metrics.lowStockCount || 0) + (metrics.outOfStockCount || 0)} Items`
                : "Healthy"}
            </span>
          </div>
        </Link>
      </div>

      {/* ========================================================
          4. RECENT ACTIVITY & SIDE WIDGETS
         ======================================================== */}
      <div id="activity" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Staff availability summary */}
          <StaffAvailabilityWidget
            summary={
              stats?.staffAvailability || {
                totalStaff: 0,
                activeStaff: metrics.activeStaff,
                onDutyToday: metrics.activeStaff,
                onLeaveToday: 0,
              }
            }
          />

          {/* Bookings by status distribution */}
          <BookingStatusDistributionWidget
            distribution={stats?.charts?.bookingsByStatus || []}
            totalBookings={metrics.totalBookings}
          />

          {/* Service category distribution */}
          <CategoryDistributionChart
            data={stats?.charts?.categoryDistribution || []}
          />

          {/* Low stock alerts */}
          <LowStockWidget
            products={stats?.lowStockProducts || []}
            pendingRequests={stats?.pendingRequests}
          />
        </div>

        {/* Right Side: Searchable, Filterable Recent Activities & Appointments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Unified Recent Activities Table */}
          <RecentActivitiesTable
            activities={stats?.recentActivities || []}
          />

          {/* Upcoming Appointments Card */}
          <UpcomingAppointmentsWidget
            appointments={stats?.upcomingAppointments || []}
          />
        </div>
      </div>
    </div>
  );
}
