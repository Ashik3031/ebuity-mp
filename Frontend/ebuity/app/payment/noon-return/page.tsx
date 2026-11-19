"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { useCart } from "../../../lib/cart-context";
import { useAuth } from "../../../lib/auth-context";
import { noonPaymentApi } from "../../../lib/api-client";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  UserPlus,
  CreditCard,
  Sparkles,
  Calendar,
  Lock,
  MessageCircle,
} from "lucide-react";

function NoonReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"SUCCESS" | "FAILED" | "PENDING">("PENDING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [type, setType] = useState<"product" | "booking">("product");
  const [referenceId, setReferenceId] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [claimToken, setClaimToken] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function checkPaymentStatus() {
      const orderIdParam = searchParams.get("orderId");
      const bookingIdParam = searchParams.get("bookingId");
      const noonOrderIdParam = searchParams.get("noonOrderId") || searchParams.get("order_id");
      const claimTokenParam = searchParams.get("claimToken");
      const typeParam = (searchParams.get("type") || (bookingIdParam ? "booking" : "product")) as
        | "product"
        | "booking";

      setType(typeParam);
      setReferenceId(orderIdParam || bookingIdParam || noonOrderIdParam || "");
      if (bookingIdParam) setBookingId(bookingIdParam);
      if (claimTokenParam) setClaimToken(claimTokenParam);

      // If guest booking return, ensure hint with claimToken is preserved locally
      if (typeof window !== "undefined" && bookingIdParam) {
        try {
          const raw = JSON.parse(localStorage.getItem("rose_guest_bookings") || "[]");
          const hints = Array.isArray(raw)
            ? raw.map((i: any) => (typeof i === "string" ? { id: i } : i))
            : [];
          const idx = hints.findIndex((h: any) => h.id === bookingIdParam || h.number === bookingIdParam);
          if (idx >= 0) {
            if (claimTokenParam) hints[idx].claimToken = claimTokenParam;
          } else {
            hints.push({
              id: bookingIdParam,
              claimToken: claimTokenParam || undefined,
            });
          }
          localStorage.setItem("rose_guest_bookings", JSON.stringify(hints));
        } catch { }
      }

      if (!orderIdParam && !bookingIdParam && !noonOrderIdParam) {
        if (isMounted) {
          setLoading(false);
          setStatus("FAILED");
          setErrorMessage("No order or transaction reference was found in the return URL.");
        }
        return;
      }

      try {
        const res = await noonPaymentApi.verify({
          orderId: orderIdParam || undefined,
          bookingId: bookingIdParam || undefined,
          noonOrderId: noonOrderIdParam || undefined,
          type: typeParam,
        });

        if (!isMounted) return;

        if (res.isPaid || res.status === "SUCCESS") {
          setStatus("SUCCESS");
          // Clear cart on verified product order
          if (typeParam === "product") {
            try {
              await clearCart();
            } catch {
              // ignore
            }
          }
        } else if (res.status === "CANCELLED" || res.status === "FAILED") {
          setStatus("FAILED");
          setErrorMessage(
            res.message ||
            "Your payment was not completed or was cancelled by the card issuer. Please try again."
          );
        } else {
          setStatus("PENDING");
        }
      } catch (err: any) {
        console.error("[NoonReturn] Verification error:", err);
        if (isMounted) {
          setStatus("FAILED");
          setErrorMessage(err?.message || "Failed to confirm payment status with the gateway.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkPaymentStatus();

    return () => {
      isMounted = false;
    };
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-9 border border-[#E8D8C8] shadow-lg text-center space-y-6">
          {/* Loading Verification State */}
          {loading && (
            <div className="py-10 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#FCF4F2] flex items-center justify-center text-[#CF565D]">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">Verifying Your Payment</h2>
                <p className="text-xs text-[#746D69]">
                  Securing 3D Secure authentication with the card gateway...
                </p>
              </div>
            </div>
          )}

          {/* Payment Success State */}
          {!loading && status === "SUCCESS" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              {/* Header Status Badge */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Payment Confirmed</span>
                </div>

                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-4 border-emerald-100/70 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292525]">
                    {type === "booking" ? "Appointment Confirmed!" : "Thank You For Your Order!"}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#746D69] max-w-md mx-auto leading-relaxed">
                    {type === "booking"
                      ? "Your payment has been verified and your at-home appointment is reserved. A confirmation has been emailed to you."
                      : "Your payment has been verified. Your luxury beauty order is confirmed and being prepared for delivery."}
                  </p>
                </div>
              </div>

              {/* Transaction Receipt Card */}
              <div className="bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8]/80 p-4 sm:p-5 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#746D69] font-medium">Reference Code</span>
                  <span className="font-mono font-bold text-[#292525] bg-white px-2.5 py-1 rounded-lg border border-[#E8D8C8]">
                    {bookingId || referenceId || "CONFIRMED"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#746D69] font-medium">Payment Method</span>
                  <span className="font-semibold text-[#292525] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span>Credit or Debit Card</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#746D69] font-medium">Payment Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Paid &amp; Authorized
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#746D69] font-medium">Security</span>
                  <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3 text-stone-400" />
                    256-Bit SSL Encrypted
                  </span>
                </div>
              </div>

              {/* Service Experience Steps (Product-Level Touch) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/70 space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 text-[#CF565D] font-semibold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>{type === "booking" ? "Therapist Assigned" : "Carefully Packaged"}</span>
                  </div>
                  <p className="text-[11px] text-[#746D69] leading-relaxed">
                    {type === "booking"
                      ? "Our specialist therapist is reviewing your requested treatments and preparing salon-grade tools."
                      : "Your items are inspected and packed in our signature luxury presentation packaging."}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/70 space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 text-[#CF565D] font-semibold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{type === "booking" ? "Timely At-Home Arrival" : "Prompt Delivery"}</span>
                  </div>
                  <p className="text-[11px] text-[#746D69] leading-relaxed">
                    {type === "booking"
                      ? "We will arrive at your requested location in Dubai with full sanitization standards."
                      : "Dispatched directly to your address with end-to-end courier coordination."}
                  </p>
                </div>
              </div>

              {/* Guest Customer: Create Account & View Booking Card */}
              {!isAuthenticated && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-center space-y-3 shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-amber-900 font-semibold text-xs sm:text-sm">
                    <UserPlus className="w-4 h-4 text-amber-700" />
                    <span>Track Your Booking Anytime</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-amber-800/90 leading-relaxed max-w-sm mx-auto">
                    You booked as a guest. Create an account with a password now to link this appointment, monitor arrival, and manage bookings anytime.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                    <Link
                      href={`/signup?redirect=/my-bookings&bookingId=${encodeURIComponent(bookingId || referenceId)}&claimToken=${encodeURIComponent(claimToken)}`}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
                    >
                      Create Account &amp; View Booking
                    </Link>
                    <Link
                      href={`/login?redirect=/my-bookings&bookingId=${encodeURIComponent(bookingId || referenceId)}&claimToken=${encodeURIComponent(claimToken)}`}
                      className="text-xs font-semibold text-[#CF565D] hover:underline px-2 py-1"
                    >
                      Already have an account? Sign In
                    </Link>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                {type === "product" ? (
                  <Link
                    href={referenceId ? `/account/orders/${referenceId}` : "/account/orders"}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98"
                  >
                    <span>View Your Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/my-bookings"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98"
                  >
                    <span>View Booking Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                <div className="flex items-center justify-center gap-4 text-xs pt-1">
                  <a
                    href={`https://wa.me/971501234567?text=${encodeURIComponent(
                      `Hello Rose Essence, I have completed my booking (Ref: ${bookingId || referenceId}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Concierge</span>
                  </a>
                  <span className="text-[#E8D8C8]">•</span>
                  <Link
                    href="/"
                    className="text-[#746D69] hover:text-[#292525] font-medium transition"
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Payment Failed / Declined State */}
          {!loading && status === "FAILED" && (
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-serif text-2xl font-bold text-[#292525]">Payment Incomplete</h2>
                <p className="text-xs text-rose-700 leading-relaxed max-w-sm mx-auto">
                  {errorMessage || "The payment transaction could not be authorized. No funds were debited."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-[#E8D8C8]/60 text-xs text-[#746D69] text-left space-y-1.5">
                <p className="font-medium text-[#292525]">What can you do?</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#746D69]">
                  <li>Verify that your card has online international / 3D Secure payments enabled.</li>
                  <li>Try another credit/debit card or choose Pay at Appointment.</li>
                </ul>
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  href={type === "product" ? "/checkout" : "/book"}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Return to Checkout</span>
                </Link>
                <Link
                  href="/"
                  className="block text-xs font-semibold text-[#746D69] hover:text-[#292525] transition"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function NoonReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-xs text-[#746D69]">
          Loading verification...
        </div>
      }
    >
      <NoonReturnContent />
    </Suspense>
  );
}
