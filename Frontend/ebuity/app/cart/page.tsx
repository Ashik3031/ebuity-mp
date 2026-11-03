"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useCart } from "../../lib/cart-context";
import { useAuth } from "../../lib/auth-context";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function CartPage() {
  const {
    items,
    totals,
    loading,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { isAuthenticated } = useAuth();

  const [checkoutInitiated, setCheckoutInitiated] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [modifyingLineId, setModifyingLineId] = useState<string | null>(null);

  const freeShippingThreshold = 60;
  const subtotal = totals.subtotal;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingPercent = Math.min(
    100,
    Math.round((subtotal / freeShippingThreshold) * 100)
  );

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === "ROSE10") {
      setPromoApplied(true);
      setPromoError("");
    } else {
      setPromoError("Invalid promotional code. Try 'ROSE10' for 10% off.");
    }
  };

  const discountAmount = promoApplied ? subtotal * 0.1 : 0;
  const finalShipping =
    subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 8;
  const finalTax = Math.round(subtotal * 0.08 * 100) / 100;
  const grandTotal = Math.max(
    0,
    subtotal - discountAmount + finalShipping + finalTax
  );

  const handleUpdateQty = async (
    productId: string,
    variantId: string | null | undefined,
    newQty: number
  ) => {
    try {
      setModifyingLineId(productId + (variantId || ""));
      await updateQuantity({
        productId,
        variantId,
        quantity: newQty,
      });
    } catch (err) {
      console.error("Failed to update cart quantity:", err);
    } finally {
      setModifyingLineId(null);
    }
  };

  const handleRemove = async (
    lineId?: string,
    productId?: string,
    variantId?: string | null
  ) => {
    try {
      setModifyingLineId(lineId || productId || "removing");
      await removeFromCart({
        lineId,
        productId,
        variantId,
      });
    } catch (err) {
      console.error("Failed to remove cart item:", err);
    } finally {
      setModifyingLineId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Header />

      <main className="flex-1 pb-24">
        {/* Banner */}
        <section className="bg-gradient-to-b from-[#F5DAD6]/25 to-[#FAF7F2] border-b border-[#E8D8C8]/60 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                  Curated Ceremony
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#292525] mt-1">
                  Your Shopping Bag
                </h1>
              </div>

              <div className="text-xs text-[#746D69]">
                <span>
                  {totals.count} {totals.count === 1 ? "item" : "items"} selected
                </span>
                {!isAuthenticated && (
                  <span className="block sm:inline sm:ml-2 text-[#CF565D] font-medium">
                    (Guest Mode — your items will sync upon sign in)
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
          {items.length === 0 ? (
            /* Empty State */
            <div className="max-w-lg mx-auto py-20 text-center bg-white rounded-3xl border border-[#E8D8C8] p-8 sm:p-12 shadow-sm space-y-5">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                <ShoppingBag className="w-10 h-10 stroke-[1.25]" />
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#292525]">
                  Your Bag is Currently Empty
                </h2>
                <p className="text-sm text-[#746D69] max-w-sm mx-auto leading-relaxed">
                  Infuse your daily ritual with our pure organic Damask rose
                  mists, lipid elixirs, and soothing barrier creams.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md active:scale-95"
                >
                  <span>Explore Apothecary</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Cart Grid (Items Left, Summary Right) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Cart Line Items */}
              <div className="lg:col-span-8 space-y-6">
                {/* Free Shipping Meter */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8D8C8] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#292525] flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#CF565D]" />
                      {amountNeededForFreeShipping === 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          You&apos;ve unlocked Complimentary Shipping!
                        </span>
                      ) : (
                        <span>
                          Add{" "}
                          <strong className="text-[#CF565D]">
                            AED {amountNeededForFreeShipping.toFixed(2)}
                          </strong>{" "}
                          more to receive Free Delivery
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-[#746D69]">
                      {shippingPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#FAF7F2] overflow-hidden border border-[#E8D8C8]/60">
                    <div
                      className="h-full bg-gradient-to-r from-[#F5DAD6] to-[#CF565D] transition-all duration-500 rounded-full"
                      style={{ width: `${shippingPercent}%` }}
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-3xl border border-[#E8D8C8] divide-y divide-[#E8D8C8]/60 overflow-hidden shadow-2xs">
                  {items.map((item) => {
                    const lineKey =
                      item.lineId ||
                      `${item.productId}-${item.variantId || "default"}`;
                    const itemName = item.product?.name || "Botanical Formulation";
                    const itemImage =
                      item.product?.images?.[0] ||
                      "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=400&q=80";

                    const variantLabel =
                      item.variant?.optionValues &&
                        Object.values(item.variant.optionValues).length > 0
                        ? Object.values(item.variant.optionValues).join(" • ")
                        : null;

                    const productLink = item.product?.slug
                      ? `/shop/${item.product.slug}`
                      : "/shop";

                    const isBusy = modifyingLineId === lineKey;

                    return (
                      <div
                        key={lineKey}
                        className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF7F2]/30 transition-colors ${isBusy ? "opacity-50 pointer-events-none" : ""
                          }`}
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-center gap-4 sm:gap-5 flex-1">
                          <Link
                            href={productLink}
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E8D8C8] flex-shrink-0"
                          >
                            <Image
                              src={itemImage}
                              alt={itemName}
                              fill
                              sizes="96px"
                              className="object-cover object-center"
                            />
                          </Link>

                          <div className="space-y-1 min-w-0">
                            <Link
                              href={productLink}
                              className="font-serif text-base sm:text-lg font-medium text-[#292525] hover:text-[#CF565D] transition-colors line-clamp-1"
                            >
                              {itemName}
                            </Link>

                            {variantLabel && (
                              <p className="text-xs text-[#746D69]">
                                Option: {variantLabel}
                              </p>
                            )}

                            <p className="text-xs text-[#746D69]">
                              Unit Price:{" "}
                              <span className="font-semibold text-[#292525]">
                                AED {item.unitPrice.toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Quantity Stepper & Line Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8D8C8]/50">
                          {/* Quantity Counter */}
                          <div className="flex items-center border border-[#E8D8C8] rounded-full bg-[#FAF7F2] px-2.5 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQty(
                                  item.productId,
                                  item.variantId,
                                  item.quantity - 1
                                )
                              }
                              disabled={loading}
                              className="p-1 text-[#292525] hover:text-[#CF565D] disabled:opacity-30 focus:outline-none"
                              aria-label={`Decrease quantity of ${itemName}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-xs font-semibold text-[#292525] px-3 min-w-[28px] text-center">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQty(
                                  item.productId,
                                  item.variantId,
                                  item.quantity + 1
                                )
                              }
                              disabled={loading}
                              className="p-1 text-[#292525] hover:text-[#CF565D] disabled:opacity-30 focus:outline-none"
                              aria-label={`Increase quantity of ${itemName}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right min-w-[70px]">
                            <span className="font-serif text-base sm:text-lg font-semibold text-[#292525]">
                              AED {item.lineTotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemove(
                                item.lineId,
                                item.productId,
                                item.variantId
                              )
                            }
                            disabled={loading}
                            className="p-2 text-[#746D69] hover:text-[#CF565D] transition-colors rounded-full hover:bg-rose-50 focus:outline-none"
                            title="Remove item"
                            aria-label={`Remove ${itemName} from bag`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CF565D] hover:text-[#b8454c]"
                  >
                    &larr; Continue Shopping Formulations
                  </Link>

                  <button
                    type="button"
                    onClick={() => clearCart()}
                    className="text-xs text-[#746D69] hover:text-red-700 underline focus:outline-none"
                  >
                    Clear All Items
                  </button>
                </div>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl border border-[#E8D8C8] p-6 sm:p-8 space-y-6 shadow-sm">
                  <h2 className="font-serif text-xl font-medium text-[#292525]">
                    Order Summary
                  </h2>

                  {/* Promo Code Input */}
                  <form onSubmit={handleApplyPromo} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo code (e.g. ROSE10)"
                        className="flex-1 px-3.5 py-2 text-xs rounded-full border border-[#E8D8C8] text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none focus:border-[#CF565D]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-[#FAF7F2] text-[#292525] hover:bg-[#CF565D] hover:text-white border border-[#E8D8C8] text-xs font-semibold uppercase tracking-wider transition-colors"
                      >
                        Apply
                      </button>
                    </div>

                    {promoApplied && (
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Code ROSE10 applied (10% Off)</span>
                      </p>
                    )}

                    {promoError && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{promoError}</span>
                      </p>
                    )}
                  </form>

                  {/* Pricing Breakdown */}
                  <div className="space-y-3 pt-3 border-t border-[#E8D8C8]/60 text-xs text-[#746D69]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[#292525]">
                        AED {subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Ceremony Discount</span>
                        <span>-AED {discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Standard Courier Delivery</span>
                      <span className="font-semibold text-[#292525]">
                        {finalShipping === 0 ? (
                          <span className="text-emerald-700 uppercase tracking-wider font-bold text-[10px]">
                            Complimentary
                          </span>
                        ) : (
                          `AED ${finalShipping.toFixed(2)}`
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Estimated State & Local Tax (5% VAT)</span>
                      <span className="font-semibold text-[#292525]">
                        AED {finalTax.toFixed(2)}
                      </span>
                    </div>

                    {/* Grand Total */}
                    <div className="pt-4 border-t border-[#E8D8C8] flex justify-between items-baseline">
                      <span className="font-medium text-sm text-[#292525]">
                        Estimated Total
                      </span>
                      <div className="text-right">
                        <span className="font-serif text-2xl font-semibold text-[#292525]">
                          AED {grandTotal.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#746D69]">
                          AED (All duties and taxes included)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout CTA */}
                  <div className="pt-2">
                    <Link
                      href="/checkout"
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md active:scale-98"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Proceed to Checkout</span>
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="pt-4 border-t border-[#E8D8C8]/60 space-y-2.5 text-[11px] text-[#746D69]">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#CF565D] flex-shrink-0" />
                      <span>256-bit SSL encrypted checkout & guarantee</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-4 h-4 text-[#CF565D] flex-shrink-0" />
                      <span>30-day gentle skin satisfaction guarantee</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
