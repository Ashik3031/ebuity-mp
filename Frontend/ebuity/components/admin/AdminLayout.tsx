"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "../../lib/admin-auth-context";
import { useAdminTheme } from "../../lib/admin-theme-context";
import { useDashboardNotifications } from "../../lib/browser-notifications";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Sparkles,
  Layers,
  MapPin,
  Gift,
  Users,
  Clock,
  ShoppingBag,
  Tag,
  Package,
  Receipt,
  UserCheck,
  CreditCard,
  Star,
  Percent,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Moon,
  Sun,
  Loader2,
  Check,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard, badge: "Level 8", group: "General" },
  { name: "Bookings", href: "/admin/bookings", icon: CalendarDays, badge: "Level 9", group: "Bookings" },
  { name: "Booking Calendar", href: "/admin/bookings/calendar", icon: Calendar, group: "Bookings" },
  { name: "Availability & Hours", href: "/admin/availability", icon: Clock, group: "Bookings" },
  { name: "Services", href: "/admin/services", icon: Sparkles, group: "Catalog" },
  { name: "Packages & Offers", href: "/admin/packages", icon: Gift, badge: "New", group: "Catalog" },
  { name: "Service Categories", href: "/admin/service-categories", icon: Layers, group: "Catalog" },
  { name: "Service Zones", href: "/admin/service-zones", icon: MapPin, group: "Catalog" },
  { name: "Staff Directory", href: "/admin/staff", icon: Users, badge: "Level 4", group: "Therapists" },
  { name: "Working Schedules", href: "/admin/staff-schedules", icon: Clock, group: "Therapists" },
  { name: "Leave Management", href: "/admin/staff-leave", icon: CalendarDays, group: "Therapists" },
  { name: "Daily Attendance", href: "/admin/attendance", icon: UserCheck, group: "Therapists" },
  { name: "Products", href: "/admin/products", icon: ShoppingBag, badge: "Level 5", group: "Boutique" },
  { name: "Product Categories", href: "/admin/product-categories", icon: Tag, group: "Boutique" },
  { name: "Inventory", href: "/admin/inventory", icon: Package, group: "Boutique" },
  { name: "Product Orders", href: "/admin/orders", icon: Receipt, group: "Boutique" },
  { name: "Customers", href: "/admin/customers", icon: UserCheck, badge: "Level 7", group: "Operations" },
  { name: "Payments", href: "/admin/payments", icon: CreditCard, group: "Operations" },
  { name: "Reviews", href: "/admin/reviews", icon: Star, group: "Operations" },
  { name: "Promotions", href: "/admin/promotions", icon: Percent, group: "Marketing" },
  { name: "Reports", href: "/admin/reports", icon: BarChart3, group: "Analytics" },
  { name: "Settings", href: "/admin/settings", icon: Settings, group: "System" },
];

const TOP_PILL_LINKS = [
  { name: "Overview", href: "/admin" },
  { name: "Activity", href: "/admin#activity" },
  { name: "Bookings", href: "/admin/bookings" },
  { name: "Staff", href: "/admin/staff" },
  { name: "Products", href: "/admin/products" },
  { name: "Reports", href: "/admin/reports" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const { theme, setTheme, toggleTheme, isDark } = useAdminTheme();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Real-time browser notifications & attention alerts
  const {
    notifications,
    unreadCount,
    activeToast,
    permission,
    requestPermission,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useDashboardNotifications("admin");

  // Authentication protection
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#121010] flex flex-col items-center justify-center transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1c1918] border border-[#E8D8C8] dark:border-white/10 shadow-sm flex items-center justify-center text-[#CF565D] mb-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] tracking-wider uppercase">
          Verifying Admin Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Navigation items grouped for mobile drawer
  const navGroups = [
    { title: "General", items: NAV_ITEMS.filter((i) => i.group === "General" || i.group === "Analytics") },
    { title: "Bookings & Schedules", items: NAV_ITEMS.filter((i) => i.group === "Bookings" || i.group === "Therapists") },
    { title: "Boutique & Catalog", items: NAV_ITEMS.filter((i) => i.group === "Boutique" || i.group === "Catalog") },
    { title: "Operations & Admin", items: NAV_ITEMS.filter((i) => i.group === "Operations" || i.group === "Marketing" || i.group === "System") },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#121010] p-1.5 sm:p-3 md:p-6 flex gap-3 md:gap-6 font-sans text-[#292525] dark:text-[#FAF7F2] transition-colors">
      {/* ========================================================
          1. SLIM VERTICAL ICON SIDEBAR (Desktop)
         ======================================================== */}
      <aside
        className={`hidden md:flex flex-col justify-between items-center bg-white dark:bg-[#181515] rounded-3xl border border-[#E8D8C8]/70 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300 py-6 px-3 z-30 shrink-0 ${
          sidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        {/* Top: Logo & Toggle */}
        <div className="flex flex-col items-center w-full">
          <Link
            href="/admin"
            className="w-12 h-12 rounded-2xl bg-[#CF565D] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(207,86,93,0.35)] hover:scale-105 transition-transform"
            title="Rose Essence Admin"
          >
            <span className="font-serif font-black text-xl tracking-tighter">RE</span>
          </Link>

          {sidebarExpanded && (
            <div className="mt-3 text-center">
              <span className="font-serif font-bold text-sm tracking-wide text-[#292525] dark:text-[#FAF7F2] block">
                Rose Essence
              </span>
              <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A] uppercase tracking-wider block">
                At-Home Wellness UAE
              </span>
            </div>
          )}

          {/* Quick theme icon toggle */}
          <div className="flex flex-col items-center gap-1.5 mt-5 p-1.5 rounded-2xl bg-[#FAF7F2] dark:bg-[#241F1F] border border-[#E8D8C8]/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                theme === "light"
                  ? "bg-white text-[#CF565D] shadow-xs"
                  : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
              }`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                theme === "dark"
                  ? "bg-[#292525] dark:bg-[#CF565D] text-white shadow-xs"
                  : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
              }`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation icons stack */}
          <nav className="flex flex-col gap-1.5 mt-5 w-full max-h-[calc(100vh-340px)] overflow-y-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[#292525] dark:bg-[#282323] text-white dark:text-[#FAF7F2] shadow-sm"
                      : "text-[#746D69] dark:text-[#A89F9A] hover:bg-[#FAF7F2] dark:hover:bg-[#252020] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  } ${sidebarExpanded ? "justify-start px-4" : "justify-center"}`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-[#CF565D]" : "group-hover:text-[#CF565D]"
                    }`}
                  />

                  {sidebarExpanded && (
                    <span className="text-xs font-semibold whitespace-nowrap truncate">
                      {item.name}
                    </span>
                  )}

                  {/* Active dot indicator on slim mode */}
                  {!sidebarExpanded && isActive && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-l-full bg-[#CF565D]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Settings, Help & Logout */}
        <div className="flex flex-col items-center gap-3 w-full pt-4 border-t border-[#E8D8C8]/60 dark:border-white/10">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-9 h-9 rounded-xl bg-[#FAF7F2] dark:bg-[#252020] border border-[#E8D8C8]/80 dark:border-white/10 text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] flex items-center justify-center text-xs"
            title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                sidebarExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          <Link
            href="/"
            target="_blank"
            className="w-9 h-9 rounded-xl text-[#746D69] dark:text-[#A89F9A] hover:text-[#CF565D] hover:bg-[#FAF7F2] dark:hover:bg-[#252020] flex items-center justify-center"
            title="View Live Customer Store"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            onClick={() => logout()}
            className="w-9 h-9 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========================================================
          2. MAIN CONTENT SURFACE (Rounded Canvas)
         ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191616] rounded-2xl sm:rounded-3xl md:rounded-[2rem] border border-[#E8D8C8]/70 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden transition-colors">
        {/* Top Header Inside Canvas */}
        <header className="px-3.5 sm:px-5 md:px-8 py-3 sm:py-4 border-b border-[#E8D8C8]/50 dark:border-white/10 flex items-center justify-between gap-3 sticky top-0 bg-white/95 dark:bg-[#191616]/95 backdrop-blur-md z-20 transition-colors">
          {/* Left: Mobile trigger & Brand badge */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#252020] border border-[#E8D8C8] dark:border-white/10 text-[#292525] dark:text-[#FAF7F2]"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/admin" className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg sm:text-xl text-[#292525] dark:text-[#FAF7F2] tracking-tight">
                Rose Essence
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-[#FAF7F2] dark:bg-[#252020] text-[#CF565D] px-2 py-0.5 rounded-full border border-[#E8D8C8] dark:border-white/10">
                Admin
              </span>
            </Link>
          </div>

          {/* Center: Top Floating Pill Navigation (Desktop Only) */}
          <nav className="hidden lg:flex items-center bg-[#FAF7F2] dark:bg-[#241F1F] p-1 rounded-full border border-[#E8D8C8]/80 dark:border-white/10 shadow-xs">
            {TOP_PILL_LINKS.map((pill) => {
              const isSelected =
                pill.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(pill.href);

              return (
                <Link
                  key={pill.name}
                  href={pill.href}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                    isSelected
                      ? "bg-[#292525] dark:bg-[#CF565D] text-white shadow-xs"
                      : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  }`}
                >
                  {pill.name}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search, Theme Toggle, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            {/* Quick search input (Hidden on small mobile) */}
            <div className="relative hidden sm:block w-36 md:w-48">
              <Search className="w-3.5 h-3.5 text-[#746D69] dark:text-[#A89F9A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] dark:bg-[#241F1F] border border-[#E8D8C8]/70 dark:border-white/10 rounded-full text-[#292525] dark:text-[#FAF7F2] placeholder-[#746D69]/60 dark:placeholder-[#A89F9A]/60 focus:outline-none focus:border-[#CF565D]"
              />
            </div>

            {/* Quick Theme Toggle Button (Desktop & Mobile header) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF7F2] dark:bg-[#241F1F] border border-[#E8D8C8]/80 dark:border-white/10 flex items-center justify-center text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#746D69]" />
              )}
            </button>

            {/* Live Notifications Button & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF7F2] dark:bg-[#241F1F] border border-[#E8D8C8]/80 dark:border-white/10 flex items-center justify-center text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#CF565D] text-white text-[9px] font-bold absolute -top-1 -right-1 border-2 border-white dark:border-[#181515] flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white dark:bg-[#221D1D] rounded-2xl border border-[#E8D8C8] dark:border-white/10 shadow-2xl p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E8D8C8]/60 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#292525] dark:text-[#FAF7F2]">Notifications</span>
                      {unreadCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#CF565D] text-white font-semibold">
                          {unreadCount} New
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A]">All caught up</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-semibold text-[#CF565D] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Browser notification permission banner */}
                  {permission !== "granted" && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#2a2424] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-[#746D69] dark:text-[#C4BBB7]">
                        <Bell className="w-3.5 h-3.5 text-[#CF565D] shrink-0" />
                        <span>Desktop alerts are disabled.</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestPermission}
                        className="px-2.5 py-1 rounded-lg bg-[#292525] dark:bg-[#CF565D] hover:opacity-90 text-white text-[10px] font-bold shrink-0 transition-all"
                      >
                        Enable
                      </button>
                    </div>
                  )}

                  {/* Scrollable Notifications List */}
                  <div className="divide-y divide-[#E8D8C8]/40 dark:divide-white/5 py-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-[#746D69] dark:text-[#A89F9A] text-xs">
                        <Check className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-60" />
                        <p>No new notifications right now.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`py-2.5 px-2 rounded-xl transition-colors cursor-pointer ${
                            n.read
                              ? "opacity-75 hover:bg-[#FAF7F2]/50 dark:hover:bg-white/5"
                              : "bg-[#FAF7F2]/70 dark:bg-white/5 hover:bg-[#FAF7F2] dark:hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-[#1a1717] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                              {n.type === "order" ? (
                                <ShoppingBag className="w-3.5 h-3.5 text-[#CF565D]" />
                              ) : n.type === "booking" ? (
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-[12px] truncate ${n.read ? "font-medium text-[#292525] dark:text-[#FAF7F2]" : "font-bold text-[#292525] dark:text-[#FAF7F2]"}`}>
                                  {n.title}
                                </p>
                                {!n.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#CF565D] shrink-0" />
                                )}
                              </div>
                              <p className="text-[#746D69] dark:text-[#A89F9A] text-[11px] line-clamp-2 mt-0.5 leading-tight">
                                {n.message}
                              </p>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-stone-400">
                                <span>
                                  {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {n.link && (
                                  <Link
                                    href={n.link}
                                    onClick={() => setNotificationsOpen(false)}
                                    className="font-semibold text-[#CF565D] hover:underline"
                                  >
                                    View Details →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="pt-2 border-t border-[#E8D8C8]/50 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Real-time alerts active</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin User Profile Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-3 py-1 rounded-full bg-[#FAF7F2] dark:bg-[#241F1F] border border-[#E8D8C8]/80 dark:border-white/10 hover:border-[#CF565D]/50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#CF565D] to-[#F5DAD6] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {admin?.name?.charAt(0) || "A"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2] leading-tight truncate max-w-[100px]">
                    {admin?.name?.split(" ")[0] || "Admin"}
                  </p>
                  <p className="text-[10px] text-[#746D69] dark:text-[#A89F9A] leading-tight capitalize">
                    {admin?.role || "Staff"}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-[#746D69] dark:text-[#A89F9A]" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#221D1D] rounded-2xl border border-[#E8D8C8] dark:border-white/10 shadow-xl p-3 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#E8D8C8]/50 dark:border-white/10 mb-1">
                    <p className="font-bold text-[#292525] dark:text-[#FAF7F2]">{admin?.name}</p>
                    <p className="text-[11px] text-[#746D69] dark:text-[#A89F9A] truncate">{admin?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-[#FCF4F2] dark:bg-[#CF565D]/20 text-[#CF565D] px-2 py-0.5 rounded-full">
                      {admin?.role || "Administrator"}
                    </span>
                  </div>

                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#746D69] dark:text-[#A89F9A] hover:bg-[#FAF7F2] dark:hover:bg-white/5 hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings & Preferences</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[#746D69] dark:text-[#A89F9A] hover:bg-[#FAF7F2] dark:hover:bg-white/5 hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  >
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                      <span>Theme Mode</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF565D]">
                      {theme === "dark" ? "Dark" : "Light"}
                    </span>
                  </button>

                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#746D69] dark:text-[#A89F9A] hover:bg-[#FAF7F2] dark:hover:bg-white/5 hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Customer Site</span>
                  </Link>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body Scroll Canvas with mobile dock clearance (pb-24) */}
        <div className={`flex-1 overflow-y-auto ${pathname.startsWith("/admin/staff") ? "p-0" : "p-3 sm:p-5 md:p-8"} pb-24 md:pb-8`}>
          {children}
        </div>
      </main>

      {/* ========================================================
          3. NATIVE MOBILE APP BOTTOM NAVIGATION DOCK
          Fixed thumb-reachable dock on mobile phones
         ======================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#181515]/95 backdrop-blur-xl border-t border-[#E8D8C8]/80 dark:border-white/10 px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex items-center justify-around transition-colors"
      >
        {/* Overview */}
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            pathname === "/admin"
              ? "text-[#CF565D] font-bold"
              : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${pathname === "/admin" ? "bg-[#CF565D]/10 text-[#CF565D]" : ""}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Overview</span>
        </Link>

        {/* Bookings */}
        <Link
          href="/admin/bookings"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            pathname.startsWith("/admin/bookings")
              ? "text-[#CF565D] font-bold"
              : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${pathname.startsWith("/admin/bookings") ? "bg-[#CF565D]/10 text-[#CF565D]" : ""}`}>
            <CalendarDays className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Bookings</span>
        </Link>

        {/* Orders */}
        <Link
          href="/admin/orders"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            pathname.startsWith("/admin/orders")
              ? "text-[#CF565D] font-bold"
              : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${pathname.startsWith("/admin/orders") ? "bg-[#CF565D]/10 text-[#CF565D]" : ""}`}>
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Orders</span>
        </Link>

        {/* Inventory */}
        <Link
          href="/admin/inventory"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            pathname.startsWith("/admin/inventory")
              ? "text-[#CF565D] font-bold"
              : "text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${pathname.startsWith("/admin/inventory") ? "bg-[#CF565D]/10 text-[#CF565D]" : ""}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Inventory</span>
        </Link>

        {/* Menu / Drawer Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2] transition-all"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
        </button>
      </nav>

      {/* ========================================================
          4. FULL CATEGORIZED MOBILE DRAWER
         ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85%] bg-white dark:bg-[#181515] h-full p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 border-r border-[#E8D8C8] dark:border-white/10 transition-colors">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E8D8C8] dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[#CF565D] text-white font-serif font-black flex items-center justify-center text-sm shadow-sm">
                    RE
                  </span>
                  <div>
                    <span className="font-serif font-bold text-base text-[#292525] dark:text-[#FAF7F2] block leading-tight">
                      Rose Essence
                    </span>
                    <span className="text-[10px] text-[#746D69] dark:text-[#A89F9A] block">
                      Admin Portal
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-[#FAF7F2] dark:bg-[#252020] border border-[#E8D8C8]/60 dark:border-white/10 text-[#746D69] dark:text-[#A89F9A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card & Theme Switch in Drawer */}
              <div className="mt-3.5 p-3 rounded-2xl bg-[#FAF7F2] dark:bg-[#221D1D] border border-[#E8D8C8]/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#CF565D] to-[#F5DAD6] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {admin?.name?.charAt(0) || "A"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2] truncate">
                      {admin?.name || "Administrator"}
                    </p>
                    <p className="text-[10px] text-[#746D69] dark:text-[#A89F9A] truncate">
                      {admin?.email}
                    </p>
                  </div>
                </div>

                {/* Quick Theme Toggle Button in Mobile Drawer */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-white dark:bg-[#181515] border border-[#E8D8C8] dark:border-white/10 text-[#746D69] dark:text-[#A89F9A] shrink-0"
                  title="Toggle Light/Dark Theme"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#746D69]" />
                  )}
                </button>
              </div>

              {/* Categorized Navigation Sections */}
              <div className="mt-4 space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#746D69] dark:text-[#A89F9A] px-2 mb-1">
                      {group.title}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isActive
                                ? "bg-[#292525] dark:bg-[#CF565D] text-white"
                                : "text-[#746D69] dark:text-[#C4BBB7] hover:bg-[#FAF7F2] dark:hover:bg-white/5 hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={`w-4 h-4 ${
                                  isActive ? "text-[#CF565D] dark:text-white" : "text-[#746D69] dark:text-[#A89F9A]"
                                }`}
                              />
                              <span>{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 font-normal">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#E8D8C8] dark:border-white/10 space-y-2 mt-4">
              <Link
                href="/"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#252020] border border-[#E8D8C8] dark:border-white/10 text-[#292525] dark:text-[#FAF7F2] font-semibold text-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Customer Storefront</span>
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Realtime Toast Alert */}
      {activeToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] bg-white dark:bg-[#221D1D] rounded-2xl border border-[#E8D8C8] dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.15)] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] dark:bg-[#2a2424] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-center shrink-0 text-[#CF565D]">
            {activeToast.type === "order" ? (
              <ShoppingBag className="w-4 h-4" />
            ) : activeToast.type === "booking" ? (
              <Sparkles className="w-4 h-4 text-amber-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-[#292525] dark:text-[#FAF7F2] truncate">
                {activeToast.title}
              </p>
              <button
                type="button"
                onClick={dismissToast}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#746D69] dark:text-[#A89F9A] mt-0.5 line-clamp-2">
              {activeToast.message}
            </p>
            {activeToast.link && (
              <Link
                href={activeToast.link}
                onClick={dismissToast}
                className="inline-block mt-1.5 text-[11px] font-bold text-[#CF565D] hover:underline"
              >
                View Now →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
