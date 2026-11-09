"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  UserX,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Building,
  Home,
  Briefcase,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  Customer,
  Booking,
  ProductOrder,
  adminCustomerApi,
  adminBookingApi,
  adminOrderApi,
  ApiError,
} from "../../../../lib/api-client";
import { formatBookingTime } from "../../../../lib/booking-utils";
import { CustomerStatusModal } from "../../../../components/admin/CustomerStatusModal";
import { CustomerPasswordResetModal } from "../../../../components/admin/CustomerPasswordResetModal";

function AdminCustomerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const customerId = (params?.id as string) || "";

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sensitive Address Visibility toggle
  const [showSensitiveNotes, setShowSensitiveNotes] = useState(false);

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Active activity tab
  const [activeTab, setActiveTab] = useState<"bookings" | "orders">("bookings");

  const fetchCustomerDetails = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch customer profile directly by ID, plus all bookings and orders for history
      const [userRes, bookingRes, orderRes] = await Promise.allSettled([
        adminCustomerApi.getById(customerId),
        adminBookingApi.getAll({ limit: 200 }),
        adminOrderApi.getAll({ limit: 100 }),
      ]);

      let loadedCustomer: Customer | null = null;
      if (userRes.status === "fulfilled" && userRes.value.success) {
        loadedCustomer = userRes.value.user;
        setCustomer(loadedCustomer);
      } else {
        // Fallback: check if customer can be found in getAll list
        const allUsers = await adminCustomerApi.getAll();
        const found = allUsers.users.find(
          (u) => (u.userId || u._id) === customerId
        );
        if (found) {
          loadedCustomer = found;
          setCustomer(found);
        } else {
          throw new Error("Client account not found.");
        }
      }

      if (bookingRes.status === "fulfilled" && bookingRes.value.success) {
        setBookings(bookingRes.value.bookings || []);
      }

      if (orderRes.status === "fulfilled" && orderRes.value.orders) {
        setOrders(orderRes.value.orders || []);
      }
    } catch (err: unknown) {
      console.error("Error loading customer profile:", err);
      const msg =
        err instanceof ApiError ? err.message : (err as any)?.message || "Failed to load client profile";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  // Filter customer's service bookings
  const customerBookings = useMemo(() => {
    if (!customer) return [];
    const cId = customer.userId || customer._id;
    const cEmail = customer.email?.toLowerCase().trim();

    return bookings.filter((b) => {
      const bCustomerId =
        typeof b.customer === "string" ? b.customer : (b.customer as any)?._id;
      const bEmail = b.customerDetails?.email?.toLowerCase().trim();
      return (cId && bCustomerId === cId) || (cEmail && bEmail === cEmail);
    });
  }, [customer, bookings]);

  // Filter customer's product orders
  const customerOrders = useMemo(() => {
    if (!customer) return [];
    const cId = customer.userId || customer._id;
    const cEmail = customer.email?.toLowerCase().trim();

    return orders.filter((o) => {
      const oUserId = o.user?._id;
      const oEmail = o.user?.email?.toLowerCase().trim() || o.address?.email?.toLowerCase().trim();
      return (cId && oUserId === cId) || (cEmail && oEmail === cEmail);
    });
  }, [customer, orders]);

  // Aggregated customer notes / special requests from bookings
  const customerNotes = useMemo(() => {
    const notes: Array<{ source: string; text: string; date?: string }> = [];

    // Notes from booking special requests
    customerBookings.forEach((b) => {
      if (b.specialRequests?.trim()) {
        notes.push({
          source: `Booking #${b.bookingNumber || b._id.slice(-6).toUpperCase()}`,
          text: b.specialRequests.trim(),
          date: b.scheduledDate,
        });
      }
    });

    // Notes from addresses access instructions
    customer?.addresses?.forEach((a) => {
      if (a.accessInstructions?.trim()) {
        notes.push({
          source: `Address Instruction (${a.label || "Default"})`,
          text: a.accessInstructions.trim(),
        });
      }
    });

    return notes;
  }, [customerBookings, customer]);

  const handleStatusUpdateSuccess = (updated: Customer) => {
    setCustomer((prev) => (prev ? { ...prev, isBlocked: updated.isBlocked } : null));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-stone-200" />
          <div className="space-y-2">
            <div className="w-48 h-5 bg-stone-200 rounded" />
            <div className="w-32 h-3.5 bg-stone-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-[#F5DAD6] p-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-stone-200 mx-auto" />
            <div className="w-36 h-4 bg-stone-200 rounded mx-auto" />
            <div className="space-y-2 pt-4">
              <div className="w-full h-8 bg-stone-100 rounded-xl" />
              <div className="w-full h-8 bg-stone-100 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-[#F5DAD6] p-6" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-red-200 shadow-sm text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-[#292525]">
          Client Not Found
        </h2>
        <p className="text-sm text-[#746D69] leading-relaxed">
          {error || "The requested client record could not be located in the database."}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => router.push("/admin/customers")}
            className="px-4 py-2 text-sm font-medium text-[#746D69] hover:text-[#292525] border border-stone-200 rounded-xl"
          >
            Back to Directory
          </button>
          <button
            onClick={fetchCustomerDetails}
            className="px-4 py-2 text-sm font-medium text-white bg-[#CF565D] hover:bg-[#b8454c] rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const initial = (customer.name || "C").charAt(0).toUpperCase();
  const regDateFormatted = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "—";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#746D69] mb-1">
            <Link
              href="/admin/customers"
              className="hover:text-[#CF565D] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Client Directory</span>
            </Link>
            <span>/</span>
            <span className="text-[#292525] font-semibold">{customer.name}</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#292525] flex items-center gap-3">
            <span>{customer.name}</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.isBlocked
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
            >
              {customer.isBlocked ? (
                <>
                  <ShieldAlert className="w-3 h-3" />
                  <span>Account Deactivated</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Active Client</span>
                </>
              )}
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh */}
          <button
            onClick={fetchCustomerDetails}
            title="Refresh details"
            className="p-2 text-[#746D69] bg-white border border-[#F5DAD6] rounded-xl hover:bg-[#FAF7F2] transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-[#CF565D]" />
          </button>

          {/* Trigger Password Recovery */}
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#292525] bg-white border border-[#F5DAD6] rounded-xl hover:bg-[#FAF7F2] transition-colors shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>Send Password Reset</span>
          </button>

          {/* Block / Unblock Account */}
          <button
            onClick={() => setStatusModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all shadow-xs ${customer.isBlocked
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
              }`}
          >
            {customer.isBlocked ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Client</span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Account</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Saved Addresses */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="p-6 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border-2 border-[#F5DAD6] text-[#CF565D] font-serif font-bold text-2xl flex items-center justify-center mx-auto shadow-sm">
                {initial}
              </div>
              <h2 className="font-serif text-lg font-semibold text-[#292525]">
                {customer.name}
              </h2>
              <p className="text-xs text-[#746D69] font-mono">{customer.email}</p>
            </div>

            <div className="divide-y divide-[#F5DAD6]/60 border-t border-b border-[#F5DAD6]/60 text-xs py-2">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#746D69] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#CF565D]" />
                  <span>Email Address</span>
                </span>
                <span className="font-medium text-[#292525] truncate max-w-[180px]">
                  {customer.email}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#746D69] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#CF565D]" />
                  <span>Contact Phone</span>
                </span>
                <span className="font-medium text-[#292525]">
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="hover:text-[#CF565D] transition-colors"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="text-[#746D69]/60 italic">Not on file</span>
                  )}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#746D69] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
                  <span>Member Since</span>
                </span>
                <span className="font-medium text-[#292525]">{regDateFormatted}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#746D69] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#CF565D]" />
                  <span>Account Role</span>
                </span>
                <span className="font-medium uppercase tracking-wider text-xs px-2 py-0.5 bg-[#FAF7F2] rounded text-[#746D69]">
                  {customer.role || "user"}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#746D69] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verification</span>
                </span>
                <span className="font-medium text-[#292525]">
                  {customer.isAccountVerified ? "Email Verified" : "Unverified"}
                </span>
              </div>
            </div>

            {/* Quick Metrics Pills */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6]/80 text-center">
                <span className="text-[11px] font-medium text-[#746D69] uppercase tracking-wider block">
                  Bookings
                </span>
                <span className="font-serif text-xl font-bold text-[#CF565D]">
                  {customerBookings.length}
                </span>
              </div>
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6]/80 text-center">
                <span className="text-[11px] font-medium text-[#746D69] uppercase tracking-wider block">
                  Orders
                </span>
                <span className="font-serif text-xl font-bold text-[#292525]">
                  {customerOrders.length}
                </span>
              </div>
            </div>
          </div>

          {/* Saved Addresses Card */}
          <div className="p-6 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#CF565D]" />
                <h3 className="font-serif text-base font-semibold text-[#292525]">
                  Saved Addresses ({customer.addresses?.length || 0})
                </h3>
              </div>

              {/* Sensitive Data Visibility Toggle */}
              {customer.addresses && customer.addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSensitiveNotes(!showSensitiveNotes)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#CF565D] hover:underline"
                >
                  {showSensitiveNotes ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Hide Gate Notes</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Show Access Notes</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {(!customer.addresses || customer.addresses.length === 0) ? (
              <div className="p-5 bg-[#FAF7F2]/50 border border-dashed border-[#F5DAD6] rounded-xl text-center space-y-1">
                <Home className="w-5 h-5 text-[#746D69]/60 mx-auto" />
                <p className="text-xs text-[#746D69]">
                  No saved addresses on file yet.
                </p>
                <span className="text-[11px] text-[#746D69]/70 block">
                  Addresses will appear when the client books a home beauty ritual.
                </span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {customer.addresses.map((addr, idx) => {
                  const typeIcon =
                    addr.addressType === "villa" ? (
                      <Home className="w-3.5 h-3.5 text-[#CF565D]" />
                    ) : addr.addressType === "office" ? (
                      <Briefcase className="w-3.5 h-3.5 text-stone-600" />
                    ) : (
                      <Building className="w-3.5 h-3.5 text-[#CF565D]" />
                    );

                  return (
                    <div
                      key={addr._id || idx}
                      className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-[#292525]">
                          {typeIcon}
                          <span>{addr.label || "Address"}</span>
                          {addr.isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#CF565D]/10 text-[#CF565D]">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="uppercase text-[10px] tracking-wider text-[#746D69] px-1.5 py-0.5 bg-white border border-[#F5DAD6] rounded">
                          {addr.addressType || "apartment"}
                        </span>
                      </div>

                      <div className="text-[#292525] font-medium leading-relaxed">
                        {addr.unitNumber}, {addr.buildingName}
                        {addr.street ? `, ${addr.street}` : ""}
                        <br />
                        <span className="text-[#746D69]">
                          {addr.area}, {addr.city} {addr.state ? `(${addr.state})` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-[#746D69]">
                        <span>Contact: {addr.fullName || customer.name}</span>
                        <span>•</span>
                        <span>{addr.phone || customer.phone || "No phone"}</span>
                      </div>

                      {/* Access instructions & gate codes */}
                      {addr.accessInstructions && (
                        <div className="mt-2 pt-2 border-t border-[#F5DAD6]/70">
                          {showSensitiveNotes ? (
                            <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-amber-900 space-y-1">
                              <div className="flex items-center gap-1 font-semibold text-[11px] text-amber-800">
                                <Lock className="w-3 h-3 text-amber-700" />
                                <span>Security & Access Instructions:</span>
                              </div>
                              <p className="text-xs font-mono leading-relaxed">
                                {addr.accessInstructions}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-[#746D69] bg-white p-2 rounded border border-[#F5DAD6]">
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-[#CF565D]" />
                                <span>Access instructions protected</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowSensitiveNotes(true)}
                                className="text-[#CF565D] font-medium hover:underline"
                              >
                                Reveal
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Notes & Special Requests */}
          {customerNotes.length > 0 && (
            <div className="p-6 bg-white rounded-2xl border border-[#F5DAD6] shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#CF565D]" />
                <h3 className="font-serif text-base font-semibold text-[#292525]">
                  Client Notes & Preferences
                </h3>
              </div>
              <div className="space-y-2.5">
                {customerNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#746D69]">
                      <span className="font-medium text-[#CF565D]">
                        {note.source}
                      </span>
                      {note.date && <span>{note.date}</span>}
                    </div>
                    <p className="text-[#292525] leading-relaxed italic">
                      "{note.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Activity History (Bookings & Orders) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Navigation */}
          <div className="bg-white rounded-2xl border border-[#F5DAD6] shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F5DAD6] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "bookings"
                    ? "bg-[#CF565D] text-white shadow-xs"
                    : "text-[#746D69] hover:bg-[#FAF7F2] hover:text-[#292525]"
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Service Bookings ({customerBookings.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "orders"
                    ? "bg-[#CF565D] text-white shadow-xs"
                    : "text-[#746D69] hover:bg-[#FAF7F2] hover:text-[#292525]"
                    }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Product Orders ({customerOrders.length})</span>
                </button>
              </div>

              {activeTab === "bookings" ? (
                <Link
                  href="/admin/bookings"
                  className="text-xs text-[#CF565D] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open Booking Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <Link
                  href="/admin/orders"
                  className="text-xs text-[#CF565D] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open Orders Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* TAB CONTENT: SERVICE BOOKINGS */}
            {activeTab === "bookings" && (
              <div className="space-y-3">
                {customerBookings.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-[#CF565D]/40 mx-auto" />
                    <p className="font-serif text-base font-semibold text-[#292525]">
                      No Service Bookings Recorded
                    </p>
                    <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                      This client has not scheduled any at-home wellness or beauty services yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerBookings.map((b) => {
                      const refCode = b.bookingNumber || `BK-${b._id.slice(-6).toUpperCase()}`;
                      const therapistName = b.assignedStaff?.name || "Unassigned";

                      return (
                        <div
                          key={b._id}
                          className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6] hover:border-[#CF565D]/60 transition-colors space-y-3 text-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5DAD6]/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[#292525]">
                                #{refCode}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                  }`}
                              >
                                {b.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#746D69]">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
                                <span>{b.scheduledDate}</span>
                              </span>
                              {(b.scheduledTime || b.scheduledStartTime) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                                  <span>
                                    {formatBookingTime(
                                      b.scheduledTime || b.scheduledStartTime,
                                      b
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Services List */}
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-[#746D69] uppercase tracking-wider block">
                              Booked services:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {b.services?.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 bg-white border border-[#F5DAD6] rounded-lg text-xs font-medium text-[#292525]"
                                >
                                  {s.name} ({s.durationMinutes}m • AED {s.price})
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Logistics & Assigned Therapist */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F5DAD6]/60 text-xs">
                            <div className="text-[#746D69]">
                              <span>Therapist: </span>
                              <span className="font-medium text-[#292525]">
                                {therapistName}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[#746D69]">Total: </span>
                              <span className="font-serif font-bold text-base text-[#CF565D]">
                                {b.currency || "AED"} {b.totalPrice}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PRODUCT ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                {customerOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 text-[#746D69]/40 mx-auto" />
                    <p className="font-serif text-base font-semibold text-[#292525]">
                      No Product Orders Recorded
                    </p>
                    <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                      This client has not placed any orders from the Rose Essence luxury skincare boutique yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((o) => {
                      const refCode = `ORD-${o._id.slice(-6).toUpperCase()}`;
                      const orderDate = o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "—";

                      return (
                        <div
                          key={o._id}
                          className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6] hover:border-[#CF565D]/60 transition-colors space-y-3 text-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5DAD6]/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[#292525]">
                                #{refCode}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.status === "Cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                  }`}
                              >
                                {o.status}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-stone-200 text-stone-700">
                                {o.paymentMethod || "COD"} • {o.paymentStatus || "Pending"}
                              </span>
                            </div>

                            <span className="text-xs text-[#746D69] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#CF565D]" />
                              <span>{orderDate}</span>
                            </span>
                          </div>

                          {/* Products List */}
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-[#746D69] uppercase tracking-wider block">
                              Items Ordered ({o.products?.length || 0}):
                            </span>
                            <div className="text-xs text-[#292525] space-y-1">
                              {o.products?.map((p, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-[#F5DAD6]/80"
                                >
                                  <span>
                                    {p.productId?.name || "Boutique Skincare Product"} (Qty: {p.quantity})
                                  </span>
                                  {p.price && (
                                    <span className="font-semibold text-[#CF565D]">
                                      AED {p.price * p.quantity}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Total */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#F5DAD6]/60 text-xs">
                            <span className="text-[#746D69]">
                              Delivery: {o.address?.city || "Dubai"}, {o.address?.area || "UAE"}
                            </span>
                            <div>
                              <span className="text-[#746D69]">Total Amount: </span>
                              <span className="font-serif font-bold text-base text-[#CF565D]">
                                AED {o.totalAmount}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Status Modal */}
      <CustomerStatusModal
        customer={customer}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={handleStatusUpdateSuccess}
      />

      {/* Password Reset Modal */}
      <CustomerPasswordResetModal
        customer={customer}
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
      />
    </div>
  );
}

export default function AdminCustomerDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#CF565D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminCustomerDetailContent />
    </Suspense>
  );
}
