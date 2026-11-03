"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  adminOrderApi,
  ProductOrder,
  ApiError,
} from "../../../lib/api-client";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  User,
  Phone,
  Mail,
  Truck,
  Banknote,
  X,
  Send,
  AlertTriangle,
  Receipt,
} from "lucide-react";

export default function AdminOrdersPage() {
  // Data State
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 12;

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("all");

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Status & Tracking Update Form State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState<string>("Pending");
  const [statusNote, setStatusNote] = useState<string>("");

  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [carrierInput, setCarrierInput] = useState<string>("");
  const [trackingNumberInput, setTrackingNumberInput] = useState<string>("");
  const [etaInput, setEtaInput] = useState<string>("");

  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentStatusInput, setPaymentStatusInput] = useState<string>("Pending");

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Orders
  const fetchOrders = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        setError(null);

        const params: {
          page: number;
          limit: number;
          status?: string;
          paymentStatus?: string;
          q?: string;
        } = {
          page: currentPage,
          limit: pageSize,
        };

        if (selectedStatus !== "all") params.status = selectedStatus;
        if (selectedPaymentStatus !== "all") params.paymentStatus = selectedPaymentStatus;
        if (search.trim()) params.q = search.trim();

        const res = await adminOrderApi.getAll(params);

        if (res && Array.isArray(res.orders)) {
          setOrders(res.orders);
          setTotalCount(res.total ?? res.orders.length);
        } else {
          setOrders([]);
          setTotalCount(0);
        }
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : "Failed to load orders";
        if (!isSilent) setError(msg);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [currentPage, selectedStatus, selectedPaymentStatus, search]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time socket event: refresh when new order created
  useRealtimeConnection({ role: "admin" });

  useRealtimeEvent(
    "order:created",
    () => {
      fetchOrders(true);
    },
    { role: "admin" }
  );

  // Open Drawer and prefill subforms
  const handleOpenDrawer = (order: ProductOrder) => {
    setSelectedOrder(order);
    setStatusInput(order.status || "Pending");
    setStatusNote("");
    setCarrierInput(order.tracking?.carrier || "");
    setTrackingNumberInput(order.tracking?.trackingNumber || "");
    setEtaInput(order.tracking?.eta ? new Date(order.tracking.eta).toISOString().slice(0, 10) : "");
    setPaymentStatusInput(order.paymentStatus || "Pending");
    setActionSuccess(null);
    setActionError(null);
    setDrawerOpen(true);
  };

  // Update Status Handler
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await adminOrderApi.updateStatus(selectedOrder._id, statusInput, statusNote);
      setActionSuccess(`Order status successfully updated to "${statusInput}".`);
      if (res && res.order) {
        setSelectedOrder(res.order);
      } else {
        setSelectedOrder({
          ...selectedOrder,
          status: statusInput,
          statusHistory: [
            ...(selectedOrder.statusHistory || []),
            { status: statusInput, note: statusNote || undefined, at: new Date().toISOString() },
          ],
        });
      }
      fetchOrders(true);
    } catch (err: any) {
      setActionError(err.message || "Failed to update order status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Tracking Handler
  const handleTrackingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setUpdatingTracking(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await adminOrderApi.updateTracking(selectedOrder._id, {
        carrier: carrierInput.trim(),
        trackingNumber: trackingNumberInput.trim(),
        eta: etaInput || undefined,
      });

      setActionSuccess("Courier tracking information updated.");
      if (res && res.order) {
        setSelectedOrder(res.order);
      } else {
        setSelectedOrder({
          ...selectedOrder,
          tracking: {
            carrier: carrierInput.trim(),
            trackingNumber: trackingNumberInput.trim(),
            eta: etaInput || undefined,
          },
        });
      }
      fetchOrders(true);
    } catch (err: any) {
      setActionError(err.message || "Failed to update tracking.");
    } finally {
      setUpdatingTracking(false);
    }
  };

  // Update Payment Status Handler
  const handlePaymentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setUpdatingPayment(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await adminOrderApi.updatePayment(selectedOrder._id, paymentStatusInput);
      setActionSuccess(`Payment status updated to "${paymentStatusInput}".`);
      if (res && res.order) {
        setSelectedOrder(res.order);
      } else {
        setSelectedOrder({
          ...selectedOrder,
          paymentStatus: paymentStatusInput,
        });
      }
      fetchOrders(true);
    } catch (err: any) {
      setActionError(err.message || "Failed to update payment.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#CF565D]">
              Boutique Operations
            </span>
            <span className="text-[#E8D8C8]">•</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              Fulfillment Portal
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292525] flex items-center gap-3">
            <span>Product Orders</span>
            <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#FCF4F2] text-[#CF565D] border border-[#F5DAD6]">
              {totalCount} Total
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => fetchOrders()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Order ID or customer email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
            />
            <Search className="w-4 h-4 text-[#746D69] absolute left-3 top-3" />
          </div>

          {/* Fulfillment Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
            >
              <option value="all">All Order Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Pending_Confirmation">Pending Confirmation</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
            >
              <option value="all">All Payment States</option>
              <option value="Pending">Payment: Pending</option>
              <option value="Paid">Payment: Paid</option>
              <option value="Authorized">Payment: Authorized</option>
              <option value="Failed">Payment: Failed</option>
              <option value="Refunded">Payment: Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#F5DAD6] shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
            <p className="text-xs text-[#746D69]">Loading boutique orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
            <h3 className="font-serif text-base font-bold text-rose-950">Error Loading Orders</h3>
            <p className="text-xs text-rose-800">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Package className="w-12 h-12 mx-auto text-[#CF565D] opacity-60" />
            <h3 className="font-serif text-lg font-bold text-[#292525]">No orders match filters</h3>
            <p className="text-xs text-[#746D69]">Try clearing your search terms or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#F5DAD6] text-[#746D69] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Order ID & Date</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Destination</th>
                  <th className="py-3.5 px-4 font-semibold">Items</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Payment</th>
                  <th className="py-3.5 px-4 font-semibold">Order Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5DAD6]/60">
                {orders.map((order) => {
                  const dateStr = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-AE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  const customerName =
                    order.user?.name || order.address?.fullName || "Guest Customer";
                  const customerEmail =
                    order.user?.email || order.address?.email || "-";

                  const totalItems = order.products?.reduce(
                    (sum, p) => sum + (p.quantity || 1),
                    0
                  ) || 0;

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-[#FCF4F2]/50 transition-colors"
                    >
                      {/* Order ID & Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#292525]">
                        <div>#{order._id.slice(-8).toUpperCase()}</div>
                        <div className="font-sans font-normal text-[11px] text-[#746D69]">
                          {dateStr}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#292525] truncate max-w-[140px]">
                          {customerName}
                        </div>
                        <div className="text-[11px] text-[#746D69] truncate max-w-[140px]">
                          {customerEmail}
                        </div>
                      </td>

                      {/* Destination Area */}
                      <td className="py-3.5 px-4 text-[#746D69]">
                        <div className="font-medium text-[#292525]">
                          {order.address?.area || "Dubai"}
                        </div>
                        <div className="text-[10px]">
                          {order.address?.city || "Dubai"}, UAE
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#292525]">
                          {totalItems} {totalItems === 1 ? "item" : "items"}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#CF565D]">
                        AED {(order.totalAmount || order.pricing?.grandTotal || 0).toFixed(2)}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            order.paymentStatus === "Paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {order.paymentStatus || "Pending"} (COD)
                        </span>
                      </td>

                      {/* Order Status Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(order)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && orders.length > 0 && (
          <div className="p-4 border-t border-[#F5DAD6] flex items-center justify-between text-xs text-[#746D69]">
            <span>
              Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} orders)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail & Management Drawer Modal */}
      {drawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl h-full bg-[#FAF7F2] border-l border-[#F5DAD6] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 bg-white border-b border-[#F5DAD6] flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#292525]">
                    Order #{selectedOrder._id.slice(-8).toUpperCase()}
                  </span>
                  <StatusBadge status={selectedOrder.status} size="sm" />
                </div>
                <p className="text-xs text-[#746D69]">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString("en-AE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert in drawer */}
            {actionSuccess && (
              <div className="m-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="m-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer & Address Details */}
              <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-3">
                <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#CF565D]" />
                  <span>Customer & Shipping Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#746D69] block">Recipient</span>
                    <strong className="text-[#292525]">
                      {selectedOrder.address?.fullName || selectedOrder.user?.name || "Guest Customer"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#746D69] block">Contact Phone</span>
                    <strong className="text-[#292525]">
                      {selectedOrder.address?.phone || "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#746D69] block">Email</span>
                    <strong className="text-[#292525]">
                      {selectedOrder.address?.email || selectedOrder.user?.email || "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#746D69] block">Property Type</span>
                    <strong className="capitalize text-[#292525]">
                      {selectedOrder.address?.addressType || "Apartment"}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#746D69] block">Delivery Address</span>
                    <span className="text-[#292525] leading-relaxed">
                      {selectedOrder.address?.formatted ||
                        `${selectedOrder.address?.unitNumber || ""}, ${selectedOrder.address?.buildingName || ""}, ${selectedOrder.address?.area || ""}, ${selectedOrder.address?.city || "Dubai"}, UAE`}
                    </span>
                  </div>
                  {selectedOrder.address?.accessInstructions && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-[#746D69]">
                      <strong>Instructions:</strong> {selectedOrder.address.accessInstructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#CF565D]" />
                  <span>Update Order Status</span>
                </h4>

                <form onSubmit={handleStatusUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                        New Status
                      </label>
                      <select
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Pending_Confirmation">Pending Confirmation</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled (Auto-Restock)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                        Internal / Status Note
                      </label>
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="e.g. Handed to driver"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-4 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Save Order Status</span>
                  </button>
                </form>
              </div>

              {/* Courier Tracking Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#CF565D]" />
                  <span>Courier Tracking Information</span>
                </h4>

                <form onSubmit={handleTrackingUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                        Carrier
                      </label>
                      <input
                        type="text"
                        value={carrierInput}
                        onChange={(e) => setCarrierInput(e.target.value)}
                        placeholder="e.g. Aramex / DHL"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        placeholder="e.g. TRK-981249"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                        ETA Date
                      </label>
                      <input
                        type="date"
                        value={etaInput}
                        onChange={(e) => setEtaInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingTracking}
                    className="px-4 py-2 rounded-full bg-[#292525] hover:bg-[#3a3535] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {updatingTracking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Update Tracking</span>
                  </button>
                </form>
              </div>

              {/* Payment Status Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#CF565D]" />
                  <span>Payment Status (Cash on Delivery)</span>
                </h4>

                <form onSubmit={handlePaymentUpdate} className="flex items-center gap-3">
                  <select
                    value={paymentStatusInput}
                    onChange={(e) => setPaymentStatusInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                  >
                    <option value="Pending">Pending (Payment upon handover)</option>
                    <option value="Paid">Paid (Cash / Card terminal collected)</option>
                    <option value="Authorized">Authorized</option>
                    <option value="Failed">Failed</option>
                    <option value="Refunded">Refunded</option>
                  </select>

                  <button
                    type="submit"
                    disabled={updatingPayment}
                    className="px-4 py-2 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {updatingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Update Payment</span>
                  </button>
                </form>
              </div>

              {/* Order Items Table */}
              <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-3">
                <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#CF565D]" />
                  <span>Items Ordered ({selectedOrder.products?.length || 0})</span>
                </h4>

                <div className="divide-y divide-[#F5DAD6]/60">
                  {selectedOrder.products?.map((item, idx) => {
                    const prod = item.productId && typeof item.productId === "object" ? item.productId : null;
                    const variant = item.variantId && typeof item.variantId === "object" ? item.variantId : null;
                    const title = prod?.name || "Boutique Product";
                    const img = prod?.images?.[0] || variant?.images?.[0] || null;
                    const price = item.price || prod?.price || 0;
                    const total = price * (item.quantity || 1);

                    return (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative">
                          {img ? (
                            <Image src={img} alt={title} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                              <Sparkles className="w-4 h-4 opacity-40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-xs text-[#292525] truncate">{title}</h5>
                          {item.size && (
                            <span className="text-[10px] text-[#746D69] block">Size: {item.size}</span>
                          )}
                          <span className="text-[11px] text-[#746D69]">
                            {item.quantity} × AED {price.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-xs text-[#292525]">
                            AED {total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Summary */}
                <div className="pt-3 border-t border-[#F5DAD6] space-y-1.5 text-xs text-[#746D69] max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#292525]">
                      AED {(selectedOrder.pricing?.subtotal || selectedOrder.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold text-[#292525]">
                      {(selectedOrder.pricing?.shippingFee ?? 0) === 0
                        ? "FREE"
                        : `AED ${(selectedOrder.pricing?.shippingFee ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>UAE VAT (5%)</span>
                    <span className="font-semibold text-[#292525]">
                      AED {(selectedOrder.pricing?.taxAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#E8D8C8] flex justify-between font-bold text-sm text-[#292525]">
                    <span>Total Due</span>
                    <span className="text-[#CF565D]">
                      AED {(selectedOrder.totalAmount || selectedOrder.pricing?.grandTotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History Timeline */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-[#F5DAD6] shadow-sm space-y-3">
                  <h4 className="font-serif text-sm font-bold text-[#292525] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#CF565D]" />
                    <span>Status History</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.statusHistory.map((h, hIdx) => (
                      <div key={hIdx} className="text-xs flex items-start gap-2 text-[#746D69]">
                        <span className="w-2 h-2 rounded-full bg-[#CF565D] mt-1.5 flex-shrink-0" />
                        <div>
                          <strong className="text-[#292525]">{h.status}</strong>
                          {h.note && <span> — {h.note}</span>}
                          <span className="text-[10px] text-stone-400 block">
                            {new Date(h.at).toLocaleDateString("en-AE", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
