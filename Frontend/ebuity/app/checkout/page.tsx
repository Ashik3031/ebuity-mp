"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useCart } from "../../lib/cart-context";
import { useAuth } from "../../lib/auth-context";
import {
  customerAddressApi,
  orderApi,
  settingsApi,
  CustomerAddress,
  ApiError,
} from "../../lib/api-client";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  MapPin,
  User,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  Lock,
  Plus,
  Info,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totals, clearCart, loading: cartLoading } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Saved addresses for authenticated users
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Address Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressType, setAddressType] = useState<"apartment" | "villa" | "office">("apartment");
  const [unitNumber, setUnitNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Dubai");
  const [state, setState] = useState("Dubai");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [saveToAccount, setSaveToAccount] = useState(true);

  // Store Settings & Pricing Rules
  const [storeSettings, setStoreSettings] = useState<{
    shippingFreeOver: number;
    standardShippingFee: number;
    taxRate: number;
    eta: string;
  }>({
    shippingFreeOver: 199,
    standardShippingFee: 15,
    taxRate: 5,
    eta: "2-4 days",
  });

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [codConfirmed, setCodConfirmed] = useState(true);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name || "");
      if (!email) setEmail(user.email || "");
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Fetch store settings for shipping & taxes
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await settingsApi.getPublic();
        if (res) {
          const std = res.shipping?.methods?.find((m) => m.code === "standard");
          setStoreSettings({
            shippingFreeOver: res.shipping?.freeOver ?? 199,
            standardShippingFee: std?.amount ?? 15,
            taxRate: res.tax?.rate ?? 5,
            eta: std ? `${std.etaDaysMin}-${std.etaDaysMax} days` : "2-4 days",
          });
        }
      } catch (err) {
        console.warn("Could not load public settings, using defaults:", err);
      }
    }
    loadSettings();
  }, []);

  // Fetch saved addresses if logged in
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadAddresses() {
      try {
        setLoadingAddresses(true);
        const res = await customerAddressApi.getAddresses();
        if (res && res.success && Array.isArray(res.addresses)) {
          setSavedAddresses(res.addresses);
          const defaultAddr = res.addresses.find((a) => a.isDefault);
          if (defaultAddr && defaultAddr._id) {
            setSelectedAddressId(defaultAddr._id);
          } else if (res.addresses.length > 0 && res.addresses[0]._id) {
            setSelectedAddressId(res.addresses[0]._id);
          }
        }
      } catch (err) {
        console.warn("Failed to load saved addresses:", err);
      } finally {
        setLoadingAddresses(false);
      }
    }
    loadAddresses();
  }, [isAuthenticated]);

  // If a saved address is selected, fill form from it
  useEffect(() => {
    if (selectedAddressId !== "new" && savedAddresses.length > 0) {
      const selected = savedAddresses.find((a) => a._id === selectedAddressId);
      if (selected) {
        setFullName(selected.fullName || "");
        if (selected.email) setEmail(selected.email);
        setPhone(selected.phone || "");
        setAddressType((selected.addressType as any) || "apartment");
        setUnitNumber(selected.unitNumber || "");
        setBuildingName(selected.buildingName || "");
        setArea(selected.area || "");
        setCity(selected.city || "Dubai");
        setState(selected.state || "Dubai");
        setStreet(selected.street || "");
        setLandmark(selected.landmark || "");
        setAccessInstructions(selected.accessInstructions || "");
      }
    }
  }, [selectedAddressId, savedAddresses]);

  // Calculate pricing breakdown
  const subtotal = totals.subtotal;
  const shippingFee = subtotal >= storeSettings.shippingFreeOver ? 0 : storeSettings.standardShippingFee;
  const taxableBase = subtotal + shippingFee;
  const taxAmount = (storeSettings.taxRate / 100) * taxableBase;
  const grandTotal = subtotal + shippingFee + taxAmount;

  // Handle Order Submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Add products before checking out.");
      return;
    }

    if (paymentMethod === "ONLINE") {
      setErrorMessage(
        "Online payment gateway integration is currently deferred. Please select Cash on Delivery to place your order now."
      );
      return;
    }

    if (!codConfirmed) {
      setErrorMessage("Please confirm that you agree to pay upon delivery (Cash on Delivery).");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !unitNumber.trim() || !buildingName.trim() || !area.trim()) {
      setErrorMessage(
        "Please complete all required delivery fields (Full Name, Phone, Unit/Villa, Building Name, and Area)."
      );
      return;
    }

    if (!email.trim() && !isAuthenticated) {
      setErrorMessage("Please provide an email address for order notifications and receipts.");
      return;
    }

    try {
      setSubmitting(true);

      const addressPayload = {
        label: addressType === "apartment" ? "Apartment" : addressType === "villa" ? "Villa" : "Office",
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        addressType,
        unitNumber: unitNumber.trim(),
        buildingName: buildingName.trim(),
        area: area.trim(),
        city: city.trim() || "Dubai",
        state: state.trim() || "Dubai",
        street: street.trim(),
        landmark: landmark.trim(),
        accessInstructions: accessInstructions.trim(),
        formatted: `${unitNumber.trim()}, ${buildingName.trim()}, ${area.trim()}, ${city.trim() || "Dubai"}, UAE`,
      };

      // If user is authenticated and chose to save a new address
      if (isAuthenticated && selectedAddressId === "new" && saveToAccount) {
        try {
          await customerAddressApi.addAddress(addressPayload);
        } catch (err) {
          console.warn("Could not save address to user profile:", err);
        }
      }

      // Map cart items to backend Order schema
      const orderProducts = items
        .filter((it) => !it.unavailable)
        .map((it) => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity: it.quantity,
          price: it.unitPrice,
        }));

      const createdOrder = await orderApi.placeOrder({
        products: orderProducts,
        address: addressPayload,
        paymentMethod: "COD",
        codConfirmed: true,
      });

      // If guest token returned, save to local storage
      if (createdOrder.guestToken && typeof window !== "undefined") {
        try {
          const storedTokens = JSON.parse(localStorage.getItem("rose_guest_tokens") || "{}");
          storedTokens[createdOrder._id] = createdOrder.guestToken;
          localStorage.setItem("rose_guest_tokens", JSON.stringify(storedTokens));
        } catch {
          // ignore localStorage error
        }
      }

      // Clear cart
      await clearCart();

      // Redirect to customer order details
      router.push(`/account/orders/${createdOrder._id}`);
    } catch (err: any) {
      console.error("Order placement error:", err);
      setErrorMessage(err.message || "Failed to place order. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8D8C8]/60">
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#746D69] hover:text-[#CF565D] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bag</span>
            </Link>
            <span className="text-[#E8D8C8]">•</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#CF565D]">
              Secure Checkout
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#746D69]">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Empty Bag Warning */}
        {!cartLoading && items.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-white/70 backdrop-blur-md rounded-3xl border border-[#F5DAD6] shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FCF4F2] flex items-center justify-center text-[#CF565D]">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#292525] mb-2">
              Your bag is empty
            </h2>
            <p className="text-sm text-[#746D69] mb-6">
              Discover our botanical skincare collections before proceeding to checkout.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-all shadow-md"
            >
              Explore Boutique
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Contact, Address, Payment Step */}
            <div className="lg:col-span-7 space-y-8">
              {/* Error Notice */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold mb-0.5">Please check your submission</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Step 1: Contact Information */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5DAD6]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#CF565D] text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <h2 className="font-serif text-lg font-bold text-[#292525]">
                      Contact Information
                    </h2>
                  </div>
                  {!isAuthenticated && (
                    <Link
                      href="/login?redirect=/checkout"
                      className="text-xs font-semibold text-[#CF565D] hover:underline"
                    >
                      Already have an account? Sign In
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Layla Al-Mansoor"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                      />
                      <User className="w-4 h-4 text-[#746D69] absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                      Phone Number (UAE) *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+971 50 123 4567"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                      />
                      <Phone className="w-4 h-4 text-[#746D69] absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="layla@example.com"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                      />
                      <Mail className="w-4 h-4 text-[#746D69] absolute left-3 top-3" />
                    </div>
                    <p className="text-[11px] text-[#746D69] mt-1">
                      Your order confirmation, invoice, and courier tracking updates will be sent to this email.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery Address */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5DAD6]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#CF565D] text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <h2 className="font-serif text-lg font-bold text-[#292525]">
                      Delivery Address
                    </h2>
                  </div>
                  <span className="text-xs text-[#746D69] font-medium">UAE Delivery</span>
                </div>

                {/* Saved Address Selector for Logged In Customers */}
                {isAuthenticated && savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#746D69]">
                      Select Saved Address
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr._id;
                        return (
                          <div
                            key={addr._id}
                            onClick={() => setSelectedAddressId(addr._id || "new")}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#CF565D] bg-[#FCF4F2] shadow-sm ring-1 ring-[#CF565D]"
                                : "border-[#E8D8C8] bg-white hover:border-[#CF565D]/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-xs text-[#292525] uppercase tracking-wider">
                                {addr.label || "Address"}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#292525] font-medium leading-relaxed">
                              {addr.unitNumber}, {addr.buildingName}
                            </p>
                            <p className="text-xs text-[#746D69]">
                              {addr.area}, {addr.city || "Dubai"}
                            </p>
                            <p className="text-[11px] text-[#746D69] mt-1">{addr.phone}</p>
                          </div>
                        );
                      })}

                      <div
                        onClick={() => setSelectedAddressId("new")}
                        className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                          selectedAddressId === "new"
                            ? "border-[#CF565D] bg-[#FCF4F2]"
                            : "border-[#E8D8C8] hover:border-[#CF565D]/50 bg-white"
                        }`}
                      >
                        <Plus className="w-5 h-5 text-[#CF565D] mb-1" />
                        <span className="text-xs font-semibold text-[#292525]">Enter New Address</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Form (Shown if "new" or guest) */}
                {(selectedAddressId === "new" || !isAuthenticated) && (
                  <div className="space-y-4 pt-2">
                    {/* Address Type */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-2">
                        Property Type
                      </label>
                      <div className="flex gap-3">
                        {(["apartment", "villa", "office"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setAddressType(type)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                              addressType === type
                                ? "bg-[#CF565D] text-white border-[#CF565D] shadow-sm"
                                : "bg-white text-[#746D69] border-[#E8D8C8] hover:border-[#CF565D]"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          {addressType === "villa" ? "Villa / House #" : "Unit / Apartment #"} *
                        </label>
                        <input
                          type="text"
                          required
                          value={unitNumber}
                          onChange={(e) => setUnitNumber(e.target.value)}
                          placeholder="e.g. Apt 1402 or Villa 12"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          Building / Compound Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={buildingName}
                          onChange={(e) => setBuildingName(e.target.value)}
                          placeholder="e.g. Marina Heights Tower"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          Area / Neighborhood *
                        </label>
                        <input
                          type="text"
                          required
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="e.g. Dubai Marina, Downtown Dubai"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          City & Emirate *
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            setState(e.target.value);
                          }}
                          placeholder="Dubai"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          Street Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="e.g. Al Marsa Street"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          Nearby Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="e.g. Near Marina Mall"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                          Delivery Instructions / Gate Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={accessInstructions}
                          onChange={(e) => setAccessInstructions(e.target.value)}
                          placeholder="e.g. Please leave with concierge, or ring bell #1402"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E8D8C8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 focus:border-[#CF565D]"
                        />
                      </div>
                    </div>

                    {isAuthenticated && (
                      <div className="pt-2">
                        <label className="flex items-center gap-2.5 text-xs text-[#746D69] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveToAccount}
                            onChange={(e) => setSaveToAccount(e.target.checked)}
                            className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                          />
                          <span>Save this delivery address to my account address book</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Payment Options (Notice: Online Payment Deferred, COD Active) */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5DAD6]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#CF565D] text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <h2 className="font-serif text-lg font-bold text-[#292525]">
                      Payment Method
                    </h2>
                  </div>
                  <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-medium">
                    Payment Gateway Deferred
                  </span>
                </div>

                {/* Payment Option: Cash on Delivery (ACTIVE) */}
                <div
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "COD"
                      ? "border-[#CF565D] bg-[#FCF4F2] shadow-sm ring-1 ring-[#CF565D]"
                      : "border-[#E8D8C8] bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "COD"}
                        onChange={() => setPaymentMethod("COD")}
                        className="text-[#CF565D] focus:ring-[#CF565D]"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-[#CF565D]" />
                          <span className="font-semibold text-sm text-[#292525]">
                            Cash on Delivery (COD)
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Active & Supported
                        </span>
                      </div>
                      <p className="text-xs text-[#746D69]">
                        Pay directly upon delivery at your door with cash or card terminal. No online card details required.
                      </p>

                      {paymentMethod === "COD" && (
                        <div className="pt-3 mt-3 border-t border-[#F5DAD6]">
                          <label className="flex items-start gap-2.5 text-xs text-[#292525] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={codConfirmed}
                              onChange={(e) => setCodConfirmed(e.target.checked)}
                              className="mt-0.5 rounded text-[#CF565D] focus:ring-[#CF565D]"
                            />
                            <span>
                              <strong>I confirm my order with Cash on Delivery.</strong> I understand payment is collected upon package handover.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Option: Online Payment (DEFERRED NOTICE) */}
                <div className="p-5 rounded-2xl border border-dashed border-[#E8D8C8] bg-stone-50/70 opacity-90 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <input
                        type="radio"
                        disabled
                        checked={paymentMethod === "ONLINE"}
                        className="text-stone-400 cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-stone-400" />
                          <span className="font-semibold text-sm text-stone-600 line-through">
                            Online Credit / Debit Card & Apple Pay
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                          Deferred / In Progress
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Online credit card gateway processing is temporarily deferred in this deployment. All boutique orders are currently fulfilled via <strong>Cash on Delivery</strong> with verified courier receipts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#F5DAD6] shadow-sm sticky top-24 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5DAD6]/60">
                  <h3 className="font-serif text-lg font-bold text-[#292525]">
                    Order Summary
                  </h3>
                  <span className="text-xs font-semibold text-[#746D69]">
                    {totals.count} {totals.count === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Items Mini List */}
                <div className="max-h-72 overflow-y-auto space-y-3.5 pr-1 divide-y divide-[#F5DAD6]/40">
                  {items.map((item, idx) => (
                    <div key={item.lineId || idx} className="pt-3.5 first:pt-0 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[#FAF7F2] border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative">
                        {item.product?.images?.[0] ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                            <Sparkles className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#CF565D] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-[#292525] truncate">
                          {item.product?.name || "Product"}
                        </h4>
                        {item.variant?.optionValues && (
                          <p className="text-[11px] text-[#746D69] truncate">
                            {Object.entries(item.variant.optionValues)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </p>
                        )}
                        <span className="text-[11px] text-[#746D69]">
                          AED {item.unitPrice.toFixed(2)} each
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-xs text-[#292525]">
                          AED {item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Fees Breakdown */}
                <div className="pt-4 border-t border-[#F5DAD6] space-y-2.5 text-xs text-[#746D69]">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-[#292525]">AED {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span>Delivery Fee</span>
                      {shippingFee === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          Free Over AED {storeSettings.shippingFreeOver}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[#292525]">
                      {shippingFee === 0 ? "FREE" : `AED ${shippingFee.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>UAE VAT ({storeSettings.taxRate}%)</span>
                    <span className="font-semibold text-[#292525]">AED {taxAmount.toFixed(2)}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-3 border-t border-[#E8D8C8] flex justify-between items-baseline">
                    <span className="font-semibold text-sm text-[#292525]">Total Due</span>
                    <div className="text-right">
                      <span className="font-serif text-2xl font-bold text-[#CF565D]">
                        AED {grandTotal.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-[#746D69]">
                        (Payment method: Cash on Delivery)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Delivery incentive banner if below threshold */}
                {subtotal < storeSettings.shippingFreeOver && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      Add <strong>AED {(storeSettings.shippingFreeOver - subtotal).toFixed(2)}</strong> more to unlock <strong>Free Delivery</strong>!
                    </span>
                  </div>
                )}

                {/* Place Order CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || items.length === 0 || !codConfirmed}
                    className="w-full py-4 px-6 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Confirm & Place Order (AED {grandTotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-[#746D69] mt-2">
                    Payment is collected upon arrival via cash or courier terminal.
                  </p>
                </div>

                {/* Trust guarantees */}
                <div className="pt-4 border-t border-[#F5DAD6]/60 space-y-2 text-[11px] text-[#746D69]">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span>Estimated delivery: {storeSettings.eta} across the UAE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span>100% Authentic Botanical Formulations Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
