"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { useCart } from "../../../lib/cart-context";
import { noonPaymentApi } from "../../../lib/api-client";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

function NoonReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"SUCCESS" | "FAILED" | "PENDING">("PENDING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [type, setType] = useState<"product" | "booking">("product");
  const [referenceId, setReferenceId] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function checkPaymentStatus() {
      const orderIdParam = searchParams.get("orderId");
      const bookingIdParam = searchParams.get("bookingId");
      const noonOrderIdParam = searchParams.get("noonOrderId") || searchParams.get("order_id");
      const typeParam = (searchParams.get("type") || (bookingIdParam ? "booking" : "product")) as
        | "product"
        | "booking";

      setType(typeParam);
      setReferenceId(orderIdParam || bookingIdParam || noonOrderIdParam || "");

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

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-lg text-center space-y-6">
          {/* Loading Verification State */}
          {loading && (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FCF4F2] flex items-center justify-center text-[#CF565D]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-xl font-bold text-[#292525]">Verifying Your Payment</h2>
                <p className="text-xs text-[#746D69]">
                  Securing 3D Secure authentication with noon payments...
                </p>
              </div>
            </div>
          )}

          {/* Payment Success State */}
          {!loading && status === "SUCCESS" && (
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-serif text-2xl font-bold text-[#292525]">Payment Successful!</h2>
                <p className="text-xs text-[#746D69] leading-relaxed">
                  Your transaction has been verified and securely processed by noon payments.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-[#E8D8C8]/60 text-xs text-[#746D69] flex items-center justify-between">
                <span>Method</span>
                <span className="font-semibold text-[#292525]">noon payments (Cards)</span>
              </div>

              <div className="pt-2">
                {type === "product" ? (
                  <Link
                    href={referenceId ? `/account/orders/${referenceId}` : "/account/orders"}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
                  >
                    <span>View Your Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/my-bookings"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#E11D74] hover:bg-[#c91866] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
                  >
                    <span>View Booking Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
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
                <p className="text-xs text-rose-700 leading-relaxed">
                  {errorMessage || "The payment transaction could not be authorized. No funds were debited."}
                </p>
              </div>

              <div className="pt-2 space-y-2">
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

