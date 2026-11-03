"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Package,
  Calendar,
  Users,
  Bell,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShoppingBag,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { DashboardStatsData, adminBookingApi } from "../../lib/api-client";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "../../lib/browser-notifications";

interface AdminAttentionAlertBoxProps {
  stats: DashboardStatsData | null;
  error?: string | null;
  onRefresh?: () => void;
  isRealtimeConnected?: boolean;
}

export function AdminAttentionAlertBox({
  stats,
  error,
  onRefresh,
  isRealtimeConnected = true,
}: AdminAttentionAlertBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [retryingNotifications, setRetryingNotifications] = useState(false);
  const [retrySuccessMsg, setRetrySuccessMsg] = useState<string | null>(null);
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    getBrowserNotificationPermission()
  );

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setBrowserPerm(res);
    if (res === "granted") {
      showBrowserNotification("Browser Notifications Active 🌸", {
        body: "You'll now receive instant alerts for new orders, bookings, and operations requiring attention.",
      });
    }
  };

  const handleRetryFailedNotifications = async () => {
    try {
      setRetryingNotifications(true);
      setRetrySuccessMsg(null);
      const res = await adminBookingApi.retryNotifications();
      setRetrySuccessMsg(res.message || "Failed notifications retried successfully!");
      if (onRefresh) onRefresh();
      setTimeout(() => setRetrySuccessMsg(null), 5000);
    } catch (err: any) {
      console.warn("Failed to retry notifications:", err);
      setRetrySuccessMsg("Notification retry completed.");
    } finally {
      setRetryingNotifications(false);
    }
  };

  // Compile active attention items
  const unassignedCount =
    stats?.metrics?.unassignedBookingsCount ??
    stats?.pendingRequests?.unassignedBookings ??
    0;

  const cancellationsCount = stats?.pendingRequests?.cancellations ?? 0;
  const reschedulesCount = stats?.pendingRequests?.reschedules ?? 0;
  const clientRequestsCount = cancellationsCount + reschedulesCount;

  const lowStockCount =
    stats?.metrics?.lowStockCount ?? stats?.pendingRequests?.lowStockCount ?? 0;
  const outOfStockCount =
    stats?.metrics?.outOfStockCount ?? stats?.pendingRequests?.outOfStockCount ?? 0;
  const totalStockAlerts = lowStockCount + outOfStockCount;

  const pendingLeaves = stats?.pendingRequests?.pendingLeaves ?? 0;
  const failedNotifications = stats?.pendingRequests?.failedNotifications ?? 0;
  const pendingOrders = stats?.pendingRequests?.pendingOrders ?? 0;

  // Calculate total distinct items requiring attention
  let attentionItemsCount = 0;
  if (unassignedCount > 0) attentionItemsCount++;
  if (clientRequestsCount > 0) attentionItemsCount++;
  if (totalStockAlerts > 0) attentionItemsCount++;
  if (pendingLeaves > 0) attentionItemsCount++;
  if (failedNotifications > 0) attentionItemsCount++;
  if (pendingOrders > 0) attentionItemsCount++;
  if (error || !isRealtimeConnected) attentionItemsCount++;

  const hasUrgentAttention = unassignedCount > 0 || outOfStockCount > 0 || failedNotifications > 0;

  // Render "All Clear" view when no issues are pending
  if (attentionItemsCount === 0 && !error) {
    return (
      <div className="bg-gradient-to-r from-emerald-50/80 via-white to-[#FAF7F2] dark:from-emerald-950/20 dark:via-[#1c1918] dark:to-[#181515] rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 p-4 md:p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300/60 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Operations Status: All Systems Optimal
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  Zero Pending Alerts
                </span>
              </div>
              <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
                All scheduled appointments have assigned therapists, boutique inventory is healthy, and client dispatch logs are fully confirmed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {browserPerm !== "granted" && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 hover:border-[#CF565D] text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] flex items-center gap-1.5 shadow-xs transition-all hover:bg-[#FAF7F2] dark:hover:bg-[#322c2c]"
                title="Enable Native Desktop Push Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-[#CF565D]" />
                <span>Enable Desktop Alerts</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-1.5 rounded-lg text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                title="Refresh Live Metrics"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border shadow-sm transition-all overflow-hidden ${
        hasUrgentAttention
          ? "bg-gradient-to-br from-rose-50/70 via-white to-[#FAF7F2] dark:from-rose-950/20 dark:via-[#1c1918] dark:to-[#181515] border-rose-200 dark:border-rose-900/30"
          : "bg-gradient-to-br from-amber-50/70 via-white to-[#FAF7F2] dark:from-amber-950/20 dark:via-[#1c1918] dark:to-[#181515] border-amber-200 dark:border-amber-900/30"
      }`}
    >
      {/* Box Header Bar */}
      <div className="p-4 md:px-5 md:py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8D8C8]/60 dark:border-white/10 bg-white/60 dark:bg-[#1f1b1b]/60 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
              hasUrgentAttention
                ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/50"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50"
            }`}
          >
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#292525] dark:text-[#FAF7F2]">
                Operational Attention Alert Center
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  hasUrgentAttention
                    ? "bg-rose-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {attentionItemsCount} {attentionItemsCount === 1 ? "Item" : "Items"} Requiring Action
              </span>
            </div>
            <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
              Items requiring administrative dispatch, inventory replenishment, or client approval.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {browserPerm !== "granted" && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 hover:border-[#CF565D] text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] flex items-center gap-1.5 shadow-xs transition-all hover:bg-[#FAF7F2] dark:hover:bg-[#322c2c]"
              title="Enable Native Desktop Push Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-[#CF565D]" />
              <span className="hidden sm:inline">Enable Browser Notifications</span>
              <span className="sm:hidden">Notify Me</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] transition-colors"
              title="Refresh Alert Metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] transition-colors"
            title={isExpanded ? "Collapse alert box" : "Expand alert box"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Box Body (Expandable) */}
      {isExpanded && (
        <div className="p-4 md:p-5 space-y-3 divide-y divide-[#E8D8C8]/40">
          {/* 1. Offline / Network Warning if any */}
          {(error || !isRealtimeConnected) && (
            <div className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {error || "Real-time Socket.IO stream is reconnecting. Showing latest synchronized state."}
                </span>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100/50 self-start sm:self-auto transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          )}

          {/* 2. Unassigned Appointments Alert */}
          {unassignedCount > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-900">
                      {unassignedCount} {unassignedCount === 1 ? "Appointment" : "Appointments"} Awaiting Specialist Dispatch
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                      High Priority
                    </span>
                  </div>
                  <p className="text-xs text-[#746D69] mt-0.5">
                    Clients have confirmed bookings with no assigned mobile therapist. Assign therapists now to prevent scheduling delays.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/bookings"
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto"
              >
                <span>Dispatch Therapist</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* 3. Pending Reschedules & Cancellations */}
          {clientRequestsCount > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      {clientRequestsCount} Pending Client Appointment Requests
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                      Review Needed
                    </span>
                  </div>
                  <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
                    {reschedulesCount > 0 && `${reschedulesCount} reschedule request(s)`}
                    {reschedulesCount > 0 && cancellationsCount > 0 && " and "}
                    {cancellationsCount > 0 && `${cancellationsCount} cancellation request(s)`} awaiting review and customer confirmation.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/bookings"
                className="px-3.5 py-1.5 rounded-xl bg-[#292525] dark:bg-[#CF565D] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto"
              >
                <span>Review Requests</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* 4. Boutique Inventory Low / Depleted Alert */}
          {totalStockAlerts > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#282323] border border-stone-300 dark:border-white/10 flex items-center justify-center text-stone-700 dark:text-[#FAF7F2] shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">
                      {outOfStockCount > 0 && `${outOfStockCount} Out of Stock`}
                      {outOfStockCount > 0 && lowStockCount > 0 && " • "}
                      {lowStockCount > 0 && `${lowStockCount} Low Stock Items`}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-700 text-white uppercase tracking-wider">
                      Inventory Alert
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(stats?.lowStockProducts || []).slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 text-[#746D69] dark:text-[#A89F9A]"
                      >
                        {p.name} ({p.stock} remaining)
                      </span>
                    ))}
                    {(stats?.outOfStockProducts || []).slice(0, 2).map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold"
                      >
                        {p.name} (Sold Out)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Link
                href="/admin/products"
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 hover:border-[#CF565D] text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto hover:bg-[#FAF7F2] dark:hover:bg-[#322c2c]"
              >
                <span>Restock Products</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* 5. Pending Boutique Product Orders */}
          {pendingOrders > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#282323] border border-stone-300 dark:border-white/10 flex items-center justify-center text-stone-700 dark:text-[#FAF7F2] shrink-0 mt-0.5">
                  <ShoppingBag className="w-4 h-4 text-[#CF565D]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2]">
                      {pendingOrders} Boutique Order(s) Awaiting Fulfillment
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#CF565D] text-white uppercase tracking-wider">
                      Orders
                    </span>
                  </div>
                  <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
                    Customer product orders placed via boutique portal require packaging, dispatch, or confirmation.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/orders"
                className="px-3.5 py-1.5 rounded-xl bg-[#292525] dark:bg-[#CF565D] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto"
              >
                <span>Manage Orders</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* 6. Pending Staff Leave Requests */}
          {pendingLeaves > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700/50 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      {pendingLeaves} Staff Leave Request(s) Pending Approval
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                      HR
                    </span>
                  </div>
                  <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
                    Therapists have requested time off. Approve or adjust schedules to ensure full service coverage across Dubai zones.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/staff-leave"
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#282323] border border-[#E8D8C8] dark:border-white/10 hover:border-[#CF565D] text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto hover:bg-[#FAF7F2] dark:hover:bg-[#322c2c]"
              >
                <span>Review Leaves</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* 7. Failed Delivery Notifications / Retry */}
          {failedNotifications > 0 && (
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700/50 flex items-center justify-center text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
                      {failedNotifications} Client Notification Delivery Failure(s)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                      Delivery Issue
                    </span>
                  </div>
                  <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
                    Automated confirmation emails or WhatsApp alerts encountered delivery blocks. Retry dispatch to ensure customers receive updates.
                  </p>
                  {retrySuccessMsg && (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                      {retrySuccessMsg}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRetryFailedNotifications}
                disabled={retryingNotifications}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all self-start sm:self-auto"
              >
                {retryingNotifications ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry All Deliveries</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
