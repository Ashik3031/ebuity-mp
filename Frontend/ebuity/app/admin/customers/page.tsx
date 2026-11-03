"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  CalendarCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import {
  Customer,
  Booking,
  ProductOrder,
  adminCustomerApi,
  adminBookingApi,
  adminOrderApi,
  ApiError,
} from "../../../lib/api-client";
import { CustomerStatusModal } from "../../../components/admin/CustomerStatusModal";
import { CustomerPasswordResetModal } from "../../../components/admin/CustomerPasswordResetModal";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [statusModalCustomer, setStatusModalCustomer] = useState<Customer | null>(null);
  const [resetModalCustomer, setResetModalCustomer] = useState<Customer | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customers, bookings, and orders in parallel for rich aggregation
      const [userRes, bookingRes, orderRes] = await Promise.allSettled([
        adminCustomerApi.getAll(),
        adminBookingApi.getAll({ limit: 200 }),
        adminOrderApi.getAll({ limit: 100 }),
      ]);

      if (userRes.status === "fulfilled" && userRes.value.success) {
        setCustomers(userRes.value.users || []);
      } else if (userRes.status === "rejected") {
        throw userRes.reason;
      }

      if (bookingRes.status === "fulfilled" && bookingRes.value.success) {
        setBookings(bookingRes.value.bookings || []);
      }

      if (orderRes.status === "fulfilled" && orderRes.value.orders) {
        setOrders(orderRes.value.orders || []);
      }
    } catch (err: unknown) {
      console.error("Failed to load customers:", err);
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to load client directory. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute booking and order count mappings
  const bookingCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const customerId =
        typeof b.customer === "string" ? b.customer : (b.customer as any)?._id;
      const email = b.customerDetails?.email?.toLowerCase().trim();

      if (customerId) {
        map.set(customerId, (map.get(customerId) || 0) + 1);
      }
      if (email) {
        map.set(email, (map.get(email) || 0) + 1);
      }
    }
    return map;
  }, [bookings]);

  const orderCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const userId = o.user?._id;
      const email = o.user?.email?.toLowerCase().trim() || o.address?.email?.toLowerCase().trim();

      if (userId) {
        map.set(userId, (map.get(userId) || 0) + 1);
      }
      if (email) {
        map.set(email, (map.get(email) || 0) + 1);
      }
    }
    return map;
  }, [orders]);

  // Enriched customers list
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const id = c.userId || c._id;
      const email = c.email?.toLowerCase().trim() || "";
      const bCount = (id && bookingCountMap.get(id)) || (email && bookingCountMap.get(email)) || 0;
      const oCount = (id && orderCountMap.get(id)) || (email && orderCountMap.get(email)) || 0;

      // Extract phone if not present on top level
      const primaryPhone =
        c.phone ||
        (Array.isArray(c.addresses) && c.addresses.length > 0
          ? c.addresses[0]?.phone
          : "") ||
        "";

      return {
        ...c,
        phone: primaryPhone,
        totalBookings: bCount,
        totalOrders: oCount,
      };
    });
  }, [customers, bookingCountMap, orderCountMap]);

  // Filtering
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      // Status filter
      if (statusFilter === "active" && c.isBlocked) return false;
      if (statusFilter === "blocked" && !c.isBlocked) return false;

      // Date filter (YYYY-MM-DD match on registration date)
      if (dateFilter) {
        if (!c.createdAt) return false;
        const regDateStr = new Date(c.createdAt).toISOString().split("T")[0];
        if (regDateStr !== dateFilter) return false;
      }

      return true;
    });
  }, [enrichedCustomers, searchQuery, statusFilter, dateFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => !c.isBlocked).length;
    const blocked = customers.filter((c) => c.isBlocked).length;
    const withBookings = enrichedCustomers.filter((c) => (c.totalBookings || 0) > 0).length;

    return { total, active, blocked, withBookings };
  }, [customers, enrichedCustomers]);

  const handleStatusUpdateSuccess = (updated: Customer) => {
    setCustomers((prev) =>
      prev.map((c) =>
        (c.userId || c._id) === (updated.userId || updated._id)
          ? { ...c, isBlocked: updated.isBlocked }
          : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#CF565D] uppercase tracking-wider">
            <span>Operations & Clients</span>
            <span>•</span>
            <span>Level 7</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[#292525]">
            Client Management
          </h1>
          <p className="mt-1 text-sm text-[#746D69]">
            Comprehensive client directory, booking frequency, addresses, and account controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#292525] bg-white border border-[#F5DAD6] rounded-xl hover:bg-[#FAF7F2] transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#CF565D] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="p-5 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#746D69] uppercase tracking-wider">
              Total Clients
            </span>
            <div className="p-2 rounded-xl bg-[#FAF7F2] text-[#CF565D]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#292525]">
            {metrics.total}
          </p>
          <span className="text-xs text-[#746D69] mt-1 block">
            Registered accounts
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#746D69] uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-emerald-700">
            {metrics.active}
          </p>
          <span className="text-xs text-emerald-600/80 mt-1 block">
            Full service access
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#746D69] uppercase tracking-wider">
              Deactivated
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-red-700">
            {metrics.blocked}
          </p>
          <span className="text-xs text-red-600/80 mt-1 block">
            Blocked accounts
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#746D69] uppercase tracking-wider">
              Service Clients
            </span>
            <div className="p-2 rounded-xl bg-[#F5DAD6]/40 text-[#CF565D]">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#292525]">
            {metrics.withBookings}
          </p>
          <span className="text-xs text-[#746D69] mt-1 block">
            Clients with bookings
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#746D69]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF7F2] border border-[#F5DAD6] rounded-xl text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none focus:border-[#CF565D] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] border border-[#F5DAD6] rounded-xl">
              <Filter className="w-3.5 h-3.5 text-[#CF565D]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by account status"
                className="text-xs font-medium bg-transparent text-[#292525] focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="blocked">Deactivated Only</option>
              </select>
            </div>

            {/* Registration Date Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] border border-[#F5DAD6] rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter by registration date"
                className="text-xs font-medium bg-transparent text-[#292525] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || statusFilter !== "all" || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#CF565D] hover:bg-[#F5DAD6]/30 rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-[#F5DAD6] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F5DAD6] bg-[#FAF7F2]/60 text-xs font-semibold text-[#746D69] uppercase tracking-wider">
                <th className="py-3.5 px-5">Client Profile</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Member Since</th>
                <th className="py-3.5 px-4 text-center">Service Bookings</th>
                <th className="py-3.5 px-4 text-center">Product Orders</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5DAD6]/60 text-sm">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-200" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-stone-200 rounded" />
                          <div className="w-36 h-3 bg-stone-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24 h-3.5 bg-stone-200 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-20 h-3.5 bg-stone-200 rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="w-10 h-5 bg-stone-200 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="w-10 h-5 bg-stone-200 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-16 h-5 bg-stone-200 rounded-full" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="w-20 h-7 bg-stone-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedCustomers.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center mx-auto border border-[#F5DAD6]">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[#292525]">
                        No Clients Found
                      </h3>
                      <p className="text-xs text-[#746D69] leading-relaxed">
                        {searchQuery || statusFilter !== "all" || dateFilter
                          ? "No client accounts matched your active search or filter criteria. Try resetting filters."
                          : "No client records have been registered in the system yet."}
                      </p>
                      {(searchQuery || statusFilter !== "all" || dateFilter) && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                            setDateFilter("");
                          }}
                          className="px-4 py-2 text-xs font-medium text-white bg-[#CF565D] hover:bg-[#b8454c] rounded-xl transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Customer Rows
                paginatedCustomers.map((customer) => {
                  const customerId = customer.userId || customer._id;
                  const initial = (customer.name || "C").charAt(0).toUpperCase();

                  const regDateFormatted = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={customerId}
                      className="hover:bg-[#FAF7F2]/40 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#F5DAD6] text-[#CF565D] font-serif font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/customers/${customerId}`}
                              className="font-medium text-[#292525] hover:text-[#CF565D] transition-colors truncate block"
                            >
                              {customer.name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-[#746D69] truncate">
                              <Mail className="w-3 h-3 shrink-0 text-[#746D69]/70" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 text-xs">
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1.5 text-[#292525] hover:text-[#CF565D] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#CF565D] shrink-0" />
                            <span>{customer.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[#746D69]/60 italic">
                            No phone recorded
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-4 px-4 text-xs text-[#746D69]">
                        {regDateFormatted}
                      </td>

                      {/* Service Bookings */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/admin/customers/${customerId}#bookings`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF7F2] text-[#CF565D] border border-[#F5DAD6] hover:bg-[#F5DAD6]/50 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{customer.totalBookings || 0}</span>
                        </Link>
                      </td>

                      {/* Product Orders */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/admin/customers/${customerId}#orders`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-[#292525] border border-stone-200 hover:bg-stone-200 transition-colors"
                        >
                          <ShoppingBag className="w-3 h-3 text-[#746D69]" />
                          <span>{customer.totalOrders || 0}</span>
                        </Link>
                      </td>

                      {/* Account Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            customer.isBlocked
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {customer.isBlocked ? (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              <span>Deactivated</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <Link
                            href={`/admin/customers/${customerId}`}
                            className="p-1.5 text-[#746D69] hover:text-[#CF565D] hover:bg-[#FAF7F2] rounded-lg border border-transparent hover:border-[#F5DAD6] transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Password Reset OTP */}
                          <button
                            onClick={() => setResetModalCustomer(customer)}
                            className="p-1.5 text-[#746D69] hover:text-[#CF565D] hover:bg-[#FAF7F2] rounded-lg border border-transparent hover:border-[#F5DAD6] transition-colors"
                            title="Send Password Recovery OTP"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Block / Unblock */}
                          <button
                            onClick={() => setStatusModalCustomer(customer)}
                            className={`p-1.5 rounded-lg border border-transparent transition-colors ${
                              customer.isBlocked
                                ? "text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                                : "text-red-700 hover:bg-red-50 hover:border-red-200"
                            }`}
                            title={
                              customer.isBlocked
                                ? "Activate Account"
                                : "Deactivate Account"
                            }
                          >
                            {customer.isBlocked ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && filteredCustomers.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-[#F5DAD6]/80 bg-[#FAF7F2]/40 text-xs text-[#746D69]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#292525]">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#292525]">
                {Math.min(currentPage * pageSize, filteredCustomers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#292525]">
                {filteredCustomers.length}
              </span>{" "}
              clients
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#F5DAD6] rounded-xl text-[#292525] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 font-medium text-[#292525]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#F5DAD6] rounded-xl text-[#292525] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Status Modal */}
      <CustomerStatusModal
        customer={statusModalCustomer}
        isOpen={Boolean(statusModalCustomer)}
        onClose={() => setStatusModalCustomer(null)}
        onSuccess={handleStatusUpdateSuccess}
      />

      {/* Password Reset Modal */}
      <CustomerPasswordResetModal
        customer={resetModalCustomer}
        isOpen={Boolean(resetModalCustomer)}
        onClose={() => setResetModalCustomer(null)}
      />
    </div>
  );
}
