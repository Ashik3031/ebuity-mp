"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";
import { useAuth } from "../../../../lib/auth-context";
import { orderApi, ProductOrder } from "../../../../lib/api-client";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import {
  ArrowLeft,
  Package,
  Calendar,
  CreditCard,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Clock,
  Banknote,
  X,
  AlertTriangle,
} from "lucide-react";

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    if (!orderId || authLoading) return;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);

        // Retrieve guest token if guest order
        let guestToken = searchParams.get("token") || undefined;
        if (!guestToken && typeof window !== "undefined") {
          try {
            const stored = JSON.parse(localStorage.getItem("rose_guest_tokens") || "{}");
            guestToken = stored[orderId];
          } catch {
            // ignore
          }
        }

        const data = await orderApi.getOrderById(orderId, guestToken);
        setOrder(data);
      } catch (err: any) {
        console.error("Order fetch error:", err);
        setError(err.message || "Unable to find order or unauthorized.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, authLoading, searchParams]);

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      setCancelError(null);
      const res = await orderApi.cancelOrder(order._id);
      if (res && res.order) {
        setOrder(res.order);
      } else {
        setOrder({
          ...order,
          status: "Cancelled",
          statusHistory: [
            ...(order.statusHistory || []),
            { status: "Cancelled", note: "Cancelled by customer", at: new Date().toISOString() },
          ],
        });
      }
      setCancelSuccess(true);
      setShowCancelModal(false);
    } catch (err: any) {
      console.error("Cancellation error:", err);
      setCancelError(err.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const isPending = order?.status === "Pending" || order?.status === "Pending_Confirmation";
  const canCancel = isPending && order?.status !== "Cancelled" && order?.status !== "Shipped" && order?.status !== "Delivered";

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8D8C8]">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#746D69] hover:text-[#CF565D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Orders</span>
          </Link>
          <span className="text-xs text-[#746D69] font-medium">Order Details</span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-24">
            <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
            <p className="text-xs text-[#746D69]">Retrieving order details...</p>
          </div>
        ) : error || !order ? (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border border-rose-200 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-rose-950">Order Not Accessible</h2>
            <p className="text-xs text-[#746D69] leading-relaxed">
              {error || "We could not find the specified order or you do not have permission to view it."}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/account/orders"
                className="px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold"
              >
                Return to Orders
              </Link>
              {!isAuthenticated && (
                <Link
                  href={`/login?redirect=/account/orders/${orderId}`}
                  className="px-5 py-2.5 rounded-full bg-stone-100 text-[#292525] text-xs font-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success notification banner after cancellation */}
            {cancelSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <strong className="block font-semibold">Order Successfully Cancelled</strong>
                  <span>Your order has been cancelled and products restocked.</span>
                </div>
              </div>
            )}

            {/* Order Header Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F5DAD6]/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-serif text-2xl font-bold text-[#292525]">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h1>
                    <StatusBadge status={order.status} size="md" />
                  </div>
                  <p className="text-xs text-[#746D69] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-AE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>

                {/* Cancel Action if permitted */}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="self-start sm:self-auto px-4 py-2 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all active:scale-98"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              {/* Order Status Progress Bar */}
              {order.status !== "Cancelled" ? (
                <div className="py-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Step 1: Placed */}
                    <div className="space-y-2">
                      <div className="w-8 h-8 mx-auto rounded-full bg-[#CF565D] text-white flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="block font-semibold text-[#292525]">Order Placed</span>
                      <span className="block text-[11px] text-[#746D69]">Confirmed & Packed</span>
                    </div>

                    {/* Step 2: Shipped */}
                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold transition-all ${
                          order.status === "Shipped" || order.status === "Delivered"
                            ? "bg-[#CF565D] text-white"
                            : "bg-stone-200 text-stone-500"
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="block font-semibold text-[#292525]">In Transit</span>
                      <span className="block text-[11px] text-[#746D69]">Courier Dispatch</span>
                    </div>

                    {/* Step 3: Delivered */}
                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold transition-all ${
                          order.status === "Delivered"
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-200 text-stone-500"
                        }`}
                      >
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="block font-semibold text-[#292525]">Delivered</span>
                      <span className="block text-[11px] text-[#746D69]">Payment Collected</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>
                    This order was cancelled on{" "}
                    {order.cancelledAt
                      ? new Date(order.cancelledAt).toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "recently"}
                    . Products were restocked.
                  </span>
                </div>
              )}
            </div>

            {/* Courier Tracking & Payment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Courier Tracking Details */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-[#F5DAD6] shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#F5DAD6]/60">
                  <Truck className="w-4 h-4 text-[#CF565D]" />
                  <h3 className="font-serif text-sm font-bold text-[#292525]">
                    Dispatch & Tracking
                  </h3>
                </div>

                {order.tracking?.carrier || order.tracking?.trackingNumber ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#746D69]">Courier Partner</span>
                      <span className="font-semibold text-[#292525]">
                        {order.tracking.carrier || "Standard Courier"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#746D69]">Tracking #</span>
                      <span className="font-mono font-semibold text-[#292525]">
                        {order.tracking.trackingNumber || "Pending"}
                      </span>
                    </div>
                    {order.tracking.eta && (
                      <div className="flex justify-between">
                        <span className="text-[#746D69]">Estimated Arrival</span>
                        <span className="font-semibold text-[#CF565D]">
                          {new Date(order.tracking.eta).toLocaleDateString("en-AE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#746D69] leading-relaxed">
                    Courier dispatch is being processed. Tracking details will appear here once package leaves the boutique.
                  </p>
                )}
              </div>

              {/* Payment Details */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-[#F5DAD6] shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#F5DAD6]/60">
                  <Banknote className="w-4 h-4 text-[#CF565D]" />
                  <h3 className="font-serif text-sm font-bold text-[#292525]">
                    Payment Status
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#746D69]">Method</span>
                    <span className="font-semibold text-[#292525]">
                      Cash on Delivery (COD)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#746D69]">Payment State</span>
                    <span
                      className={`font-semibold ${
                        order.paymentStatus === "Paid"
                          ? "text-emerald-700"
                          : "text-amber-800"
                      }`}
                    >
                      {order.paymentStatus === "Paid"
                        ? "Paid & Collected"
                        : "Pending (Pay upon arrival)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#746D69] pt-1">
                    Online card payment gateway is deferred. You will pay the courier upon receipt.
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#F5DAD6]/60">
                <MapPin className="w-4 h-4 text-[#CF565D]" />
                <h3 className="font-serif text-base font-bold text-[#292525]">
                  Shipping Address
                </h3>
              </div>

              {order.address ? (
                <div className="text-xs text-[#292525] space-y-1.5 leading-relaxed">
                  <p className="font-bold text-sm">{order.address.fullName}</p>
                  <p>
                    {order.address.unitNumber}, {order.address.buildingName}
                  </p>
                  <p>
                    {order.address.area}, {order.address.city || "Dubai"}, {order.address.state || "Dubai"}, UAE
                  </p>
                  {order.address.street && <p>Street: {order.address.street}</p>}
                  {order.address.landmark && <p>Landmark: {order.address.landmark}</p>}
                  <p className="text-[#746D69] pt-1">
                    Phone: <span className="text-[#292525] font-medium">{order.address.phone}</span>
                  </p>
                  {order.address.email && (
                    <p className="text-[#746D69]">
                      Email: <span className="text-[#292525] font-medium">{order.address.email}</span>
                    </p>
                  )}
                  {order.address.accessInstructions && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-[#746D69]">
                      <strong>Delivery Instructions:</strong> {order.address.accessInstructions}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#746D69]">No delivery address provided.</p>
              )}
            </div>

            {/* Ordered Products Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-6">
              <h3 className="font-serif text-base font-bold text-[#292525] pb-3 border-b border-[#F5DAD6]/60">
                Purchased Items ({order.products?.length || 0})
              </h3>

              <div className="divide-y divide-[#F5DAD6]/60">
                {order.products?.map((item, idx) => {
                  const productObj = item.productId && typeof item.productId === "object" ? item.productId : null;
                  const variantObj = item.variantId && typeof item.variantId === "object" ? item.variantId : null;

                  const title = productObj?.name || "Boutique Product";
                  const img = productObj?.images?.[0] || variantObj?.images?.[0] || null;
                  const price = item.price || productObj?.price || 0;
                  const lineTotal = price * (item.quantity || 1);

                  return (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#FAF7F2] border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative">
                        {img ? (
                          <Image src={img} alt={title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                            <Sparkles className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-[#292525] truncate">{title}</h4>
                        {item.size && (
                          <span className="text-[11px] text-[#746D69] block">Size: {item.size}</span>
                        )}
                        <span className="text-[11px] text-[#746D69]">
                          Qty: <strong>{item.quantity}</strong> × AED {price.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-serif font-bold text-sm text-[#292525]">
                          AED {lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-6 border-t border-[#F5DAD6] space-y-2 text-xs text-[#746D69] max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#292525]">
                    AED {(order.pricing?.subtotal || order.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-semibold text-[#292525]">
                    {(order.pricing?.shippingFee ?? 0) === 0
                      ? "FREE"
                      : `AED ${(order.pricing?.shippingFee ?? 0).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>UAE VAT (5%)</span>
                  <span className="font-semibold text-[#292525]">
                    AED {(order.pricing?.taxAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#E8D8C8] flex justify-between items-baseline text-sm">
                  <span className="font-bold text-[#292525]">Total Due</span>
                  <span className="font-serif text-xl font-bold text-[#CF565D]">
                    AED {(order.totalAmount || order.pricing?.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-[#F5DAD6] space-y-5 animate-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#292525]">
                    Cancel Order?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#746D69] leading-relaxed">
                Are you sure you wish to cancel Order #{order?._id.slice(-8).toUpperCase()}? The reserved boutique inventory will be restocked immediately.
              </p>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
