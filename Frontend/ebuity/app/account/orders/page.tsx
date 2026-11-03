"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { useAuth } from "../../../lib/auth-context";
import { orderApi, ProductOrder } from "../../../lib/api-client";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Package,
  Calendar,
  CreditCard,
  MapPin,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Truck,
  RotateCcw,
  Search,
} from "lucide-react";

export default function CustomerOrdersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest lookup state
  const [guestOrderId, setGuestOrderId] = useState("");
  const [guestSearching, setGuestSearching] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      async function loadUserOrders() {
        try {
          setLoading(true);
          setError(null);
          const data = await orderApi.getUserOrders();
          setOrders(Array.isArray(data) ? data : []);
        } catch (err: any) {
          console.error("Failed to load orders:", err);
          setError(err.message || "Failed to load your orders.");
        } finally {
          setLoading(false);
        }
      }
      loadUserOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Guest lookup handler
  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestOrderId.trim()) return;

    try {
      setGuestSearching(true);
      setGuestError(null);

      // Check if we have a saved guest token in localStorage
      let token: string | undefined;
      if (typeof window !== "undefined") {
        try {
          const stored = JSON.parse(localStorage.getItem("rose_guest_tokens") || "{}");
          token = stored[guestOrderId.trim()];
        } catch {
          // ignore
        }
      }

      const res = await orderApi.getOrderById(guestOrderId.trim(), token);
      if (res && res._id) {
        window.location.href = `/account/orders/${res._id}`;
      } else {
        setGuestError("Order not found. Please verify the Order Reference ID.");
      }
    } catch (err: any) {
      setGuestError(err.message || "Order not found. Please verify the Order Reference ID.");
    } finally {
      setGuestSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E8D8C8]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#CF565D]">
                Account Dashboard
              </span>
              <span className="text-[#E8D8C8]">•</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
                Skincare Boutique
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292525]">
              My Product Orders
            </h1>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm self-start sm:self-auto"
          >
            <ShoppingBag className="w-4 h-4 text-[#CF565D]" />
            <span>Browse Products</span>
          </Link>
        </div>

        {/* Unauthenticated View: Sign In Prompt + Guest Lookup */}
        {!authLoading && !isAuthenticated && (
          <div className="max-w-xl mx-auto space-y-8 py-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-[#F5DAD6] text-center shadow-sm space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#FCF4F2] flex items-center justify-center text-[#CF565D]">
                <Package className="w-7 h-7" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#292525]">
                Sign in to view your orders
              </h2>
              <p className="text-xs text-[#746D69] leading-relaxed max-w-sm mx-auto">
                Sign in with your Rose Essence customer account to review your purchase history, dispatch statuses, and delivery tracking.
              </p>
              <div className="pt-2">
                <Link
                  href="/login?redirect=/account/orders"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md"
                >
                  Sign In to Account
                </Link>
              </div>
            </div>

            {/* Guest Order Lookup Box */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#292525] flex items-center gap-2">
                <Search className="w-4 h-4 text-[#CF565D]" />
                <span>Track a Guest Order</span>
              </h3>
              <p className="text-xs text-[#746D69]">
                Placed an order as a guest? Enter your Order Reference ID from your confirmation email to inspect current status.
              </p>

              {guestError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{guestError}</span>
                </div>
              )}

              <form onSubmit={handleGuestLookup} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={guestOrderId}
                  onChange={(e) => setGuestOrderId(e.target.value)}
                  placeholder="e.g. 660f... (Order ID)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                />
                <button
                  type="submit"
                  disabled={guestSearching}
                  className="px-5 py-2.5 rounded-xl bg-[#292525] hover:bg-[#3a3535] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {guestSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Track</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Authenticated View */}
        {isAuthenticated && (
          <div>
            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
                <p className="text-xs text-[#746D69]">Loading your order history...</p>
              </div>
            ) : error ? (
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
                <h3 className="font-serif text-base font-bold text-rose-900">Unable to load orders</h3>
                <p className="text-xs text-rose-800">{error}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white/70 backdrop-blur-sm rounded-3xl border border-[#F5DAD6] max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FCF4F2] flex items-center justify-center text-[#CF565D]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#292525]">No orders placed yet</h3>
                <p className="text-xs text-[#746D69] leading-relaxed">
                  Your skincare order history will appear here once you make your first purchase.
                </p>
                <div className="pt-2">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explore Products</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const dateStr = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-AE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Recently";

                  const totalItems = order.products?.reduce(
                    (acc, p) => acc + (p.quantity || 1),
                    0
                  ) || 0;

                  return (
                    <div
                      key={order._id}
                      className="bg-white/85 backdrop-blur-sm rounded-3xl p-5 sm:p-6 border border-[#F5DAD6] hover:border-[#CF565D]/40 transition-all shadow-sm hover:shadow-md space-y-4"
                    >
                      {/* Top Bar: Order ID, Date, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F5DAD6]/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#292525]">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-[#746D69]">
                              • {dateStr}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#746D69]">
                            {order.address?.formatted ||
                              `${order.address?.buildingName || ""}, ${order.address?.area || "Dubai"}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Order Status Badge */}
                          <StatusBadge status={order.status} size="sm" />

                          {/* Payment Status Badge */}
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                              order.paymentStatus === "Paid"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            Payment: {order.paymentStatus || "Pending"} (COD)
                          </span>
                        </div>
                      </div>

                      {/* Items Preview & Total */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Mini thumbnails preview */}
                        <div className="flex items-center gap-3 overflow-x-auto py-1">
                          {order.products?.slice(0, 4).map((p, pIdx) => {
                            const img =
                              p.productId?.images?.[0] ||
                              p.variantId?.images?.[0] ||
                              null;
                            return (
                              <div
                                key={pIdx}
                                className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative"
                              >
                                {img ? (
                                  <Image
                                    src={img}
                                    alt="Product"
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                                    <Sparkles className="w-4 h-4 opacity-40" />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {order.products && order.products.length > 4 && (
                            <span className="text-xs text-[#746D69] font-medium pl-1">
                              +{order.products.length - 4} more
                            </span>
                          )}

                          <span className="text-xs text-[#746D69] pl-2">
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {/* Grand Total & Action Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="block text-[11px] text-[#746D69]">
                              Order Total
                            </span>
                            <span className="font-serif text-base font-bold text-[#CF565D]">
                              AED {(order.totalAmount || order.pricing?.grandTotal || 0).toFixed(2)}
                            </span>
                          </div>

                          <Link
                            href={`/account/orders/${order._id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF7F2] hover:bg-[#FCF4F2] border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
