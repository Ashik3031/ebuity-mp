"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useAuth } from "../../lib/auth-context";
import {
  bookingApi,
  orderApi,
  customerAddressApi,
  userProfileApi,
  CustomerAddress,
  ProductOrder,
  UserProfileData,
} from "../../lib/api-client";
import { Booking, TimeSlot } from "../../types/booking";
import { formatBookingTime, format12Hour } from "../../lib/booking-utils";
import { StatusBadge } from "../../components/admin/StatusBadge";
import {
  User,
  Calendar,
  Clock,
  Package,
  MapPin,
  Settings,
  LogOut,
  Sparkles,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  ShieldCheck,
  ShoppingBag,
  Eye,
  FileText,
  Lock,
  Mail,
  Phone,
  Home,
  Building,
  Navigation,
  X,
  CreditCard,
  Truck,
  Download,
  KeyRound,
  Bell,
  Heart,
  HelpCircle,
} from "lucide-react";

type AccountTab =
  | "overview"
  | "appointments"
  | "orders"
  | "profile"
  | "addresses"
  | "settings";

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading, logout, refreshUser } = useAuth();

  // Tab State
  const requestedTab = (searchParams.get("tab") as AccountTab) || "overview";
  const [activeTab, setActiveTab] = useState<AccountTab>(
    ["overview", "appointments", "orders", "profile", "addresses", "settings"].includes(
      requestedTab
    )
      ? requestedTab
      : "overview"
  );

  // Synchronize URL query param without hard refresh
  const handleTabChange = (tab: AccountTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // Main Data States
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  // Loading States
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Global Alert / Toast
  const [alertNotice, setAlertNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showAlert = (text: string, type: "success" | "error" | "info" = "success") => {
    setAlertNotice({ text, type });
    setTimeout(() => {
      setAlertNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadAccountData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingData(true);
      const [profRes, bookRes, ordRes, addrRes] = await Promise.allSettled([
        userProfileApi.getProfile(),
        bookingApi.getMyBookings(),
        orderApi.getUserOrders(),
        customerAddressApi.getAddresses(),
      ]);

      if (profRes.status === "fulfilled" && profRes.value?.user) {
        setProfileData(profRes.value.user);
      } else if (user) {
        setProfileData(user);
      }

      if (bookRes.status === "fulfilled" && bookRes.value?.bookings) {
        setBookings(bookRes.value.bookings);
      }

      if (ordRes.status === "fulfilled" && Array.isArray(ordRes.value)) {
        setOrders(ordRes.value);
      }

      if (addrRes.status === "fulfilled" && addrRes.value?.addresses) {
        setAddresses(addrRes.value.addresses);
      }
    } catch (err) {
      console.error("[Account] Failed to load data:", err);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAccountData();
    } else if (!authLoading && !isAuthenticated) {
      setLoadingData(false);
    }
  }, [authLoading, isAuthenticated, loadAccountData]);

  // Derived summaries for Overview
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => {
      const isNotDone = b.status === "confirmed" || b.status === "pending";
      const start = b.scheduledStartTime ? new Date(b.scheduledStartTime) : null;
      return isNotDone && (!start || start >= now);
    });
  }, [bookings]);

  const nextAppointment = useMemo(() => {
    if (upcomingBookings.length === 0) return null;
    return [...upcomingBookings].sort((a, b) => {
      const ta = a.scheduledStartTime ? new Date(a.scheduledStartTime).getTime() : 0;
      const tb = b.scheduledStartTime ? new Date(b.scheduledStartTime).getTime() : 0;
      return ta - tb;
    })[0];
  }, [upcomingBookings]);

  const defaultAddress = useMemo(() => {
    return addresses.find((a) => a.isDefault) || addresses[0] || null;
  }, [addresses]);

  const latestOrder = useMemo(() => {
    return orders.length > 0 ? orders[0] : null;
  }, [orders]);

  // -------------------------------------------------------------
  // Modals & Action States
  // -------------------------------------------------------------

  // View Details Modals
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [viewOrder, setViewOrder] = useState<ProductOrder | null>(null);

  // Appointment Reschedule Modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Appointment Cancel Modal
  const [cancelBookingModal, setCancelBookingModal] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancelBooking, setSubmittingCancelBooking] = useState(false);

  // Order Cancel Modal
  const [cancelOrderModal, setCancelOrderModal] = useState<ProductOrder | null>(null);
  const [submittingCancelOrder, setSubmittingCancelOrder] = useState(false);

  // Address Modal (Add / Edit)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormData, setAddressFormData] = useState<Partial<CustomerAddress>>({
    label: "Home",
    fullName: "",
    phone: "",
    email: "",
    addressType: "apartment",
    unitNumber: "",
    buildingName: "",
    area: "",
    city: "Dubai",
    state: "Dubai",
    street: "",
    landmark: "",
    accessInstructions: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [zoneCheckResult, setZoneCheckResult] = useState<{
    checked: boolean;
    isSupported: boolean;
    zoneName?: string;
    message?: string;
  } | null>(null);
  const [checkingZone, setCheckingZone] = useState(false);

  // Address Delete Confirm
  const [deletingAddress, setDeletingAddress] = useState<CustomerAddress | null>(null);
  const [submittingDeleteAddress, setSubmittingDeleteAddress] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile form when data arrives
  useEffect(() => {
    if (profileData || user) {
      setProfileForm({
        name: profileData?.name || user?.name || "",
        email: profileData?.email || user?.email || "",
        phone: profileData?.phone || user?.phone || "",
      });
    }
  }, [profileData, user]);

  // Settings: Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings: OTP Verification State
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Settings: Notification Preferences (persisted in localStorage)
  const [notifPrefs, setNotifPrefs] = useState({
    smsReminders: true,
    emailConfirmations: true,
    botanicalReleases: true,
    conciergeOffers: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("rose_notif_prefs");
        if (stored) setNotifPrefs(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleTogglePref = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        localStorage.setItem("rose_notif_prefs", JSON.stringify(next));
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // Handlers: Appointment Actions
  // -------------------------------------------------------------
  const handleOpenReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(booking.scheduledDate || "");
    setRescheduleTime("");
    setRescheduleReason("");
    setAvailableSlots([]);
  };

  // Fetch slots whenever rescheduleDate changes
  useEffect(() => {
    if (!rescheduleBooking || !rescheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(rescheduleDate)) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const serviceIds = rescheduleBooking.services.map((s) => s.serviceId);
    bookingApi
      .getAvailability({
        date: rescheduleDate,
        duration: rescheduleBooking.totalDurationMinutes,
        serviceIds,
      })
      .then((res) => {
        if (!cancelled && res.slots) {
          setAvailableSlots(res.slots);
        }
      })
      .catch((err) => {
        console.error("Failed to load reschedule slots:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rescheduleBooking, rescheduleDate]);

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      showAlert("Please choose both a new ceremony date and time slot.", "error");
      return;
    }
    try {
      setSubmittingReschedule(true);
      const res = await bookingApi.requestReschedule(rescheduleBooking._id, {
        requestedDate: rescheduleDate,
        requestedTime: rescheduleTime,
        reason: rescheduleReason.trim(),
      });
      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === res.booking._id ? res.booking : b))
        );
        showAlert(res.message || "Reschedule request submitted successfully!");
        setRescheduleBooking(null);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to submit reschedule request.", "error");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleOpenCancelBooking = (booking: Booking) => {
    setCancelBookingModal(booking);
    setCancelReason("");
  };

  const handleSubmitCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBookingModal) return;
    try {
      setSubmittingCancelBooking(true);
      const res = await bookingApi.requestCancel(cancelBookingModal._id, {
        reason: cancelReason.trim(),
      });
      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === res.booking._id ? res.booking : b))
        );
        showAlert(res.message || "Appointment cancelled successfully.");
        setCancelBookingModal(null);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to cancel appointment.", "error");
    } finally {
      setSubmittingCancelBooking(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers: Order Actions
  // -------------------------------------------------------------
  const handleOpenCancelOrder = (order: ProductOrder) => {
    setCancelOrderModal(order);
  };

  const handleSubmitCancelOrder = async () => {
    if (!cancelOrderModal) return;
    try {
      setSubmittingCancelOrder(true);
      const res = await orderApi.cancelOrder(cancelOrderModal._id);
      if (res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === res.order._id ? res.order : o))
        );
        showAlert("Order cancelled successfully and inventory restored.");
        setCancelOrderModal(null);
        if (viewOrder?._id === cancelOrderModal._id) {
          setViewOrder(res.order);
        }
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to cancel order.", "error");
    } finally {
      setSubmittingCancelOrder(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers: Address Actions
  // -------------------------------------------------------------
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressFormData({
      label: "Home",
      fullName: profileData?.name || user?.name || "",
      phone: profileData?.phone || user?.phone || "",
      email: profileData?.email || user?.email || "",
      addressType: "apartment",
      unitNumber: "",
      buildingName: "",
      area: "",
      city: "Dubai",
      state: "Dubai",
      street: "",
      landmark: "",
      accessInstructions: "",
      isDefault: addresses.length === 0,
    });
    setZoneCheckResult(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr._id || null);
    setAddressFormData({
      label: addr.label || "Home",
      fullName: addr.fullName,
      phone: addr.phone,
      email: addr.email || "",
      addressType: addr.addressType || "apartment",
      unitNumber: addr.unitNumber,
      buildingName: addr.buildingName,
      area: addr.area,
      city: addr.city || "Dubai",
      state: addr.state || "Dubai",
      street: addr.street || "",
      landmark: addr.landmark || "",
      accessInstructions: addr.accessInstructions || "",
      isDefault: addr.isDefault || false,
    });
    setZoneCheckResult(null);
    setIsAddressModalOpen(true);
  };

  // Validate area zone
  const handleCheckAreaZone = async (areaName: string) => {
    if (!areaName || areaName.trim().length < 2) {
      setZoneCheckResult(null);
      return;
    }
    try {
      setCheckingZone(true);
      const res = await bookingApi.validateZone({
        area: areaName.trim(),
        city: addressFormData.city || "Dubai",
      });
      if (res.success && res.isSupported) {
        setZoneCheckResult({
          checked: true,
          isSupported: true,
          zoneName: res.zone?.name,
          message: `Supported by Rose Essence Dubai service team (${res.zone?.name || "Dubai Central"}).`,
        });
      } else {
        setZoneCheckResult({
          checked: true,
          isSupported: false,
          message: res.message || "Service zone not currently active for home delivery.",
        });
      }
    } catch {
      setZoneCheckResult({
        checked: true,
        isSupported: false,
        message: "Unable to verify service zone coverage right now.",
      });
    } finally {
      setCheckingZone(false);
    }
  };

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addressFormData.fullName ||
      !addressFormData.phone ||
      !addressFormData.unitNumber ||
      !addressFormData.buildingName ||
      !addressFormData.area
    ) {
      showAlert("Please complete all required address fields.", "error");
      return;
    }

    try {
      setSavingAddress(true);
      let res;
      if (editingAddressId) {
        res = await customerAddressApi.updateAddress(editingAddressId, addressFormData);
        showAlert("Address updated successfully!");
      } else {
        res = await customerAddressApi.addAddress(addressFormData);
        showAlert("New address added to your address book!");
      }

      if (res.success && res.addresses) {
        setAddresses(res.addresses);
        setIsAddressModalOpen(false);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to save address.", "error");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId?: string) => {
    if (!addressId) return;
    try {
      const res = await customerAddressApi.setDefault(addressId);
      if (res.success && res.addresses) {
        setAddresses(res.addresses);
        showAlert("Default address updated.");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to update default address.", "error");
    }
  };

  const handleConfirmDeleteAddress = async () => {
    if (!deletingAddress?._id) return;
    try {
      setSubmittingDeleteAddress(true);
      const res = await customerAddressApi.deleteAddress(deletingAddress._id);
      if (res.success && res.addresses) {
        setAddresses(res.addresses);
        showAlert("Address removed from your address book.");
        setDeletingAddress(null);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to delete address.", "error");
    } finally {
      setSubmittingDeleteAddress(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers: Profile & Settings
  // -------------------------------------------------------------
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showAlert("Full name is required.", "error");
      return;
    }
    if (!profileForm.email.trim()) {
      showAlert("Email address is required.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await userProfileApi.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      if (res.success && res.user) {
        setProfileData(res.user);
        await refreshUser();
        showAlert(res.message || "Profile updated successfully!");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showAlert("Current password and new password are required.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showAlert("New password must be at least 6 characters long.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert("New passwords do not match.", "error");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await userProfileApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res.success) {
        showAlert("Password changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to change password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendVerificationOtp = async () => {
    try {
      setSendingOtp(true);
      const res = await userProfileApi.sendVerifyOtp();
      if (res.success) {
        setOtpSent(true);
        showAlert("Verification 6-digit OTP sent to your email!");
      } else {
        showAlert(res.message || "Could not send verification OTP.", "error");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Failed to send verification OTP.", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      showAlert("Please enter the 6-digit OTP sent to your email.", "error");
      return;
    }
    try {
      setVerifyingOtp(true);
      const res = await userProfileApi.verifyOtp(otpCode.trim());
      if (res.success) {
        showAlert("Account verified successfully!");
        setOtpSent(false);
        setOtpCode("");
        await refreshUser();
        loadAccountData();
      } else {
        showAlert(res.message || "Invalid or expired OTP.", "error");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showAlert(errObj.message || "Verification failed.", "error");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // -------------------------------------------------------------
  // Unauthenticated Fallback View
  // -------------------------------------------------------------
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8D8C8] shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center mx-auto text-[#CF565D]">
              <User className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif text-[#292525]">
                Customer Account Access
              </h1>
              <p className="text-sm text-[#746D69] leading-relaxed">
                Please sign in to view your appointments, product deliveries, and personal Damascus Rose preferences.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/login?redirect=/account"
                className="flex-1 py-3 px-5 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
              >
                Client Sign In
              </Link>
              <Link
                href="/signup"
                className="flex-1 py-3 px-5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold uppercase tracking-wider hover:border-[#CF565D] hover:text-[#CF565D] transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------
  // Main Authenticated Account Page
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292525] flex flex-col font-sans">
      <Header />

      {/* Global Action Toast Notice */}
      {alertNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-medium ${alertNotice.type === "success"
              ? "bg-[#292525] text-white border-[#3F3A3A]"
              : alertNotice.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-white text-[#292525] border-[#E8D8C8]"
              }`}
          >
            {alertNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#CF565D] shrink-0" />
            ) : alertNotice.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#CF565D] shrink-0" />
            )}
            <span>{alertNotice.text}</span>
            <button
              onClick={() => setAlertNotice(null)}
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Customer Header Banner */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Avatar Initial */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center text-[#CF565D] font-serif text-2xl sm:text-3xl font-bold shadow-2xs shrink-0">
                {(profileData?.name || user?.name || "R").charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-serif text-[#292525] font-semibold">
                    {profileData?.name || user?.name || "Rose Essence Client"}
                  </h1>
                  {profileData?.isAccountVerified || user?.isAccountVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Client
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Pending Verification
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#746D69]">
                  {profileData?.email || user?.email}
                  {profileData?.phone && (
                    <span className="hidden sm:inline"> &bull; {profileData.phone}</span>
                  )}
                </p>
                <p className="text-[11px] text-[#746D69]/70 pt-0.5">
                  Dubai &bull; Damascus Rose Concierge Care
                </p>
              </div>
            </div>

            {/* Top Right Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-center">
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Book Service</span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-medium hover:border-[#CF565D] hover:text-[#CF565D] transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#CF565D]" />
                <span className="hidden sm:inline">Shop Botanicals</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  loadAccountData();
                }}
                disabled={refreshing}
                title="Refresh Account Data"
                className="p-2.5 rounded-full bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#CF565D] hover:border-[#CF565D] transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Account Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-[#E8D8C8]/60 scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: Sparkles },
            {
              id: "appointments",
              label: "My Appointments",
              icon: Calendar,
              count: bookings.length,
            },
            {
              id: "orders",
              label: "My Orders",
              icon: Package,
              count: orders.length,
            },
            { id: "profile", label: "Personal Profile", icon: User },
            {
              id: "addresses",
              label: "Saved Addresses",
              icon: MapPin,
              count: addresses.length,
            },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as AccountTab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-200 ${isActive
                  ? "bg-[#292525] text-white shadow-xs font-semibold"
                  : "bg-white text-[#746D69] border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#292525]"
                  }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "text-[#F5DAD6]" : "text-[#746D69]"
                    }`}
                />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#FAF7F2] text-[#292525] border border-[#E8D8C8]"
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        {loadingData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D]" />
            <p className="text-xs text-[#746D69] uppercase tracking-wider font-medium">
              Loading your Rose Essence profile...
            </p>
          </div>
        ) : (
          <div>
            {/* ------------------------------------------------------------- */}
            {/* 1. OVERVIEW TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Greeting & Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => handleTabChange("appointments")}
                    className="p-5 bg-white rounded-3xl border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D] cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#746D69]">
                        Upcoming Bookings
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-serif font-bold text-[#292525]">
                      {upcomingBookings.length}
                    </div>
                    <p className="text-[11px] text-[#746D69] mt-1 flex items-center gap-1 group-hover:text-[#CF565D] transition-colors">
                      <span>View appointments</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => handleTabChange("orders")}
                    className="p-5 bg-white rounded-3xl border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D] cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#746D69]">
                        Botanical Orders
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-serif font-bold text-[#292525]">
                      {orders.length}
                    </div>
                    <p className="text-[11px] text-[#746D69] mt-1 flex items-center gap-1 group-hover:text-[#CF565D] transition-colors">
                      <span>Track deliveries</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => handleTabChange("addresses")}
                    className="p-5 bg-white rounded-3xl border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D] cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#746D69]">
                        Saved Residences
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-serif font-bold text-[#292525]">
                      {addresses.length}
                    </div>
                    <p className="text-[11px] text-[#746D69] mt-1 flex items-center gap-1 group-hover:text-[#CF565D] transition-colors">
                      <span>Manage address book</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => handleTabChange("profile")}
                    className="p-5 bg-white rounded-3xl border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D] cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#746D69]">
                        Profile Status
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <div className="text-lg font-serif font-bold text-[#292525]">
                      {profileData?.isAccountVerified ? "Verified VIP" : "Standard Client"}
                    </div>
                    <p className="text-[11px] text-[#746D69] mt-1 flex items-center gap-1 group-hover:text-[#CF565D] transition-colors">
                      <span>Edit profile details</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                </div>

                {/* Highlights Grid: Next Appointment & Latest Order */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Next Appointment Card */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8D8C8] shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-[#E8D8C8]/60 mb-5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#CF565D]" />
                          <h2 className="text-sm font-serif font-semibold text-[#292525]">
                            Upcoming At-Home Ceremony
                          </h2>
                        </div>
                        {nextAppointment && (
                          <StatusBadge status={nextAppointment.status} size="sm" />
                        )}
                      </div>

                      {nextAppointment ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-base font-semibold text-[#292525]">
                                {nextAppointment.services
                                  .map((s) => s.name)
                                  .join(", ")}
                              </p>
                              <p className="text-xs text-[#746D69] mt-0.5">
                                Ref: {nextAppointment.bookingNumber} &bull;{" "}
                                {nextAppointment.totalDurationMinutes} mins
                              </p>
                            </div>
                            <span className="text-base font-bold text-[#CF565D]">
                              AED {nextAppointment.totalPrice}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#746D69] bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8D8C8]/60">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                              <span>
                                {nextAppointment.scheduledDate} &bull;{" "}
                                {formatBookingTime(
                                  nextAppointment.scheduledTime,
                                  nextAppointment
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#CF565D]" />
                              <span className="truncate">
                                {nextAppointment.serviceAddress?.area},{" "}
                                {nextAppointment.serviceAddress?.buildingName}
                              </span>
                            </div>
                          </div>

                          {nextAppointment.assignedStaff ? (
                            <div className="flex items-center gap-2.5 text-xs text-[#746D69] pt-1">
                              <div className="w-6 h-6 rounded-full bg-[#E8D8C8] flex items-center justify-center font-bold text-[10px] text-[#292525]">
                                {(nextAppointment.assignedStaff.name || "T")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span>
                                Assigned Therapist:{" "}
                                <strong className="text-[#292525]">
                                  {nextAppointment.assignedStaff.name}
                                </strong>
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#746D69] italic pt-1">
                              Concierge dispatch is finalizing your certified aesthetician.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center space-y-3">
                          <p className="text-xs text-[#746D69]">
                            You have no scheduled appointments upcoming.
                          </p>
                          <Link
                            href="/services"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
                          >
                            <span>Explore At-Home Ceremonies</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {nextAppointment && (
                      <div className="pt-5 mt-5 border-t border-[#E8D8C8]/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setViewBooking(nextAppointment)}
                          className="text-xs font-semibold text-[#CF565D] hover:underline"
                        >
                          View Full Details &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReschedule(nextAppointment)}
                          className="text-xs text-[#746D69] hover:text-[#292525]"
                        >
                          Reschedule Appointment
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Latest Product Order Card */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8D8C8] shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-[#E8D8C8]/60 mb-5">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#CF565D]" />
                          <h2 className="text-sm font-serif font-semibold text-[#292525]">
                            Latest Botanical Order
                          </h2>
                        </div>
                        {latestOrder && (
                          <StatusBadge status={latestOrder.status} size="sm" />
                        )}
                      </div>

                      {latestOrder ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-base font-semibold text-[#292525]">
                                Order #{latestOrder.orderId || latestOrder._id.slice(-6).toUpperCase()}
                              </p>
                              <p className="text-xs text-[#746D69] mt-0.5">
                                Placed on{" "}
                                {new Date(latestOrder.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}{" "}
                                &bull; {latestOrder.products.length} item(s)
                              </p>
                            </div>
                            <span className="text-base font-bold text-[#CF565D]">
                              AED {latestOrder.totalAmount}
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {latestOrder.products.slice(0, 2).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1.5 border-b border-[#FAF7F2] last:border-none"
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#E8D8C8] overflow-hidden flex items-center justify-center shrink-0">
                                    {item.productId?.images?.[0] ? (
                                      <Image
                                        src={item.productId.images[0]}
                                        alt={item.productId.name || "Product"}
                                        width={28}
                                        height={28}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <ShoppingBag className="w-3.5 h-3.5 text-[#CF565D]" />
                                    )}
                                  </div>
                                  <span className="truncate text-[#292525]">
                                    {item.productId?.name || "Botanical Elixir"}
                                  </span>
                                </div>
                                <span className="text-[#746D69] shrink-0">
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                            {latestOrder.products.length > 2 && (
                              <p className="text-[11px] text-[#746D69] italic">
                                + {latestOrder.products.length - 2} more items
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center space-y-3">
                          <p className="text-xs text-[#746D69]">
                            You have not ordered Damascus Rose botanicals yet.
                          </p>
                          <Link
                            href="/shop"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold hover:border-[#CF565D] hover:text-[#CF565D] transition-colors"
                          >
                            <span>Browse Botanicals</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {latestOrder && (
                      <div className="pt-5 mt-5 border-t border-[#E8D8C8]/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setViewOrder(latestOrder)}
                          className="text-xs font-semibold text-[#CF565D] hover:underline"
                        >
                          View Order Details &rarr;
                        </button>
                        <span className="text-xs text-[#746D69]">
                          Payment: {latestOrder.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Address & Quick Concierge Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Default Residence card */}
                  <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#E8D8C8] shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#CF565D]" />
                          <h3 className="text-sm font-serif font-semibold text-[#292525]">
                            Primary Service Residence
                          </h3>
                        </div>
                        {defaultAddress && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[10px] font-bold text-[#CF565D] uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>

                      {defaultAddress ? (
                        <div className="space-y-2 text-xs text-[#746D69]">
                          <p className="font-semibold text-sm text-[#292525]">
                            {defaultAddress.label} &bull; {defaultAddress.fullName}
                          </p>
                          <p>
                            {defaultAddress.unitNumber}, {defaultAddress.buildingName},{" "}
                            {defaultAddress.street}
                          </p>
                          <p>
                            {defaultAddress.area}, {defaultAddress.city},{" "}
                            {defaultAddress.state}
                          </p>
                          {defaultAddress.accessInstructions && (
                            <p className="text-[11px] text-[#746D69]/80 italic pt-1">
                              Note: {defaultAddress.accessInstructions}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[#746D69] py-4">
                          No saved delivery addresses. Add your residence to speed up bookings.
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#E8D8C8]/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTabChange("addresses")}
                        className="text-xs font-semibold text-[#CF565D] hover:underline"
                      >
                        Manage All Addresses &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddAddress}
                        className="text-xs text-[#292525] font-medium hover:text-[#CF565D] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    </div>
                  </div>

                  {/* Damascus Rose Concierge Care Banner */}
                  <div className="bg-gradient-to-br from-[#292525] to-[#3B3434] rounded-3xl p-6 sm:p-7 text-white shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-[#F5DAD6]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h4 className="text-base font-serif font-semibold text-white">
                        Private Concierge Desk
                      </h4>
                      <p className="text-xs text-[#E8D8C8]/80 leading-relaxed font-light">
                        Need bespoke timing, wedding ceremonies, or a private therapist delegation?
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/#contact"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5DAD6] hover:text-white transition-colors"
                      >
                        <span>Contact Concierge Desk</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. MY APPOINTMENTS TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "appointments" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-[#292525]">
                      My At-Home Appointments
                    </h2>
                    <p className="text-xs text-[#746D69] mt-0.5">
                      Review, reschedule, or cancel your Damascus Rose at-home ceremonies.
                    </p>
                  </div>
                  <Link
                    href="/services"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors self-start sm:self-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book New Ceremony</span>
                  </Link>
                </div>

                {bookings.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#E8D8C8] space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center mx-auto">
                      <Calendar className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-serif font-semibold text-[#292525]">
                        No Appointments Found
                      </h3>
                      <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                        You have not reserved any at-home salon or spa ceremonies yet.
                      </p>
                    </div>
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
                    >
                      <span>Explore Ceremonies</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const isUpcoming =
                        booking.status === "confirmed" || booking.status === "pending";
                      return (
                        <div
                          key={booking._id}
                          className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D]/60 transition-all space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF7F2]">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-mono font-semibold text-[#292525] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E8D8C8]">
                                {booking.bookingNumber}
                              </span>
                              <StatusBadge status={booking.status} size="sm" />
                              {booking.rescheduleRequest?.status === "pending" && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  Reschedule Pending
                                </span>
                              )}
                            </div>
                            <span className="text-base font-bold text-[#CF565D]">
                              AED {booking.totalPrice}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Service names & Duration */}
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-[#746D69]/80 tracking-wider">
                                Ceremony
                              </span>
                              <p className="font-semibold text-sm text-[#292525]">
                                {booking.services.map((s) => s.name).join(", ")}
                              </p>
                              <p className="text-[#746D69]">
                                Duration: {booking.totalDurationMinutes} mins
                              </p>
                            </div>

                            {/* Schedule & Location */}
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-[#746D69]/80 tracking-wider">
                                Date & Location
                              </span>
                              <p className="font-medium text-[#292525] flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#CF565D]" />
                                <span>
                                  {booking.scheduledDate} &bull;{" "}
                                  {formatBookingTime(booking.scheduledTime, booking)}
                                </span>
                              </p>
                              <p className="text-[#746D69] truncate flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#CF565D]" />
                                <span className="truncate">
                                  {booking.serviceAddress?.area},{" "}
                                  {booking.serviceAddress?.buildingName}
                                </span>
                              </p>
                            </div>

                            {/* Staff Member */}
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-[#746D69]/80 tracking-wider">
                                Assigned Therapist
                              </span>
                              {booking.assignedStaff ? (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center font-bold text-[10px] text-[#CF565D]">
                                    {(booking.assignedStaff.name || "T")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <span className="font-medium text-[#292525]">
                                    {booking.assignedStaff.name}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[#746D69] italic pt-0.5">
                                  Concierge Dispatch in progress
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setViewBooking(booking)}
                              className="text-xs font-semibold text-[#292525] hover:text-[#CF565D] flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Full Details</span>
                            </button>

                            {isUpcoming && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReschedule(booking)}
                                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#292525] border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#CF565D] transition-colors"
                                >
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCancelBooking(booking)}
                                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. MY ORDERS TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-[#292525]">
                      My Damascus Botanical Orders
                    </h2>
                    <p className="text-xs text-[#746D69] mt-0.5">
                      Review product deliveries, download invoices, and inspect order tracking.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors self-start sm:self-center"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Shop Botanicals</span>
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#E8D8C8] space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-serif font-semibold text-[#292525]">
                        No Orders Yet
                      </h3>
                      <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                        Your Damascus Rose skincare and botanical oils will appear here after purchasing.
                      </p>
                    </div>
                    <Link
                      href="/shop"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
                    >
                      <span>Explore Rose Products</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const isPending = order.status?.toLowerCase() === "pending";
                      return (
                        <div
                          key={order._id}
                          className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8D8C8] shadow-2xs hover:border-[#CF565D]/60 transition-all space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF7F2]">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-mono font-semibold text-[#292525] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E8D8C8]">
                                #{order.orderId || order._id.slice(-6).toUpperCase()}
                              </span>
                              <StatusBadge status={order.status} size="sm" />
                              <span className="text-xs text-[#746D69]">
                                {new Date(order.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <span className="text-base font-bold text-[#CF565D]">
                              AED {order.totalAmount}
                            </span>
                          </div>

                          {/* Items Preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {order.products.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#FAF7F2]/60 border border-[#E8D8C8]/40"
                              >
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8D8C8] overflow-hidden flex items-center justify-center shrink-0">
                                  {item.productId?.images?.[0] ? (
                                    <Image
                                      src={item.productId.images[0]}
                                      alt={item.productId.name || "Product"}
                                      width={40}
                                      height={40}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-4 h-4 text-[#CF565D]" />
                                  )}
                                </div>
                                <div className="truncate text-xs">
                                  <p className="font-semibold text-[#292525] truncate">
                                    {item.productId?.name || "Damascus Botanical"}
                                  </p>
                                  <p className="text-[#746D69] text-[11px]">
                                    Qty: {item.quantity} &bull; AED {item.price || 0}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setViewOrder(order)}
                                className="text-xs font-semibold text-[#292525] hover:text-[#CF565D] flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Details</span>
                              </button>
                              <a
                                href={`/api/order/${order._id}/invoice.pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#746D69] hover:text-[#292525] flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF Invoice</span>
                              </a>
                            </div>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancelOrder(order)}
                                className="px-3 py-1 rounded-full text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. PERSONAL PROFILE TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "profile" && (
              <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-2xs space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-[#292525]">
                    Personal Profile
                  </h2>
                  <p className="text-xs text-[#746D69] mt-0.5">
                    Update your authenticated contact details for at-home appointments and delivery notices.
                  </p>
                </div>

                <form onSubmit={handleSubmitProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      placeholder="e.g. Layla Al-Maktoum"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider">
                        Email Address *
                      </label>
                      {profileData?.isAccountVerified ? (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Unverified
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                      placeholder="client@roseessence.ae"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                      Phone Number (Mobile for SMS Ceremony Alerts)
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      placeholder="+971 50 123 4567"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                    <p className="text-[11px] text-[#746D69] mt-1">
                      Used by our certified aestheticians and concierge before arriving at your residence.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#FAF7F2] flex items-center justify-between">
                    <p className="text-[11px] text-[#746D69]">
                      Protected Account Tier:{" "}
                      <strong className="text-[#292525] uppercase font-semibold">
                        {profileData?.role || "Customer"}
                      </strong>
                    </p>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 5. SAVED ADDRESSES TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "addresses" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-[#292525]">
                      Saved Service Residences
                    </h2>
                    <p className="text-xs text-[#746D69] mt-0.5">
                      Manage your home, villa, or private suite addresses for ceremony dispatch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors self-start sm:self-center shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#E8D8C8] space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-serif font-semibold text-[#292525]">
                        No Saved Addresses
                      </h3>
                      <p className="text-xs text-[#746D69] max-w-sm mx-auto">
                        Add your residence once and select it in 1-click whenever reserving at-home beauty ceremonies.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add My Residence</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {addresses.map((addr) => (
                      <div
                        key={addr._id}
                        className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 relative ${addr.isDefault
                          ? "border-[#CF565D] shadow-xs"
                          : "border-[#E8D8C8] shadow-2xs hover:border-[#CF565D]/60"
                          }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[10px] font-bold text-[#CF565D] uppercase tracking-wider">
                              {addr.addressType === "villa" ? (
                                <Home className="w-3 h-3" />
                              ) : (
                                <Building className="w-3 h-3" />
                              )}
                              <span>{addr.label || "Residence"}</span>
                            </span>

                            {addr.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                <Check className="w-2.5 h-2.5" />
                                Default
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#746D69] space-y-1">
                            <p className="font-semibold text-sm text-[#292525]">
                              {addr.fullName}
                            </p>
                            <p className="text-[11px] text-[#292525]/80">
                              {addr.phone}
                            </p>
                            <p className="pt-1">
                              Unit/Villa: <strong className="text-[#292525]">{addr.unitNumber}</strong>,{" "}
                              {addr.buildingName}
                            </p>
                            {addr.street && <p>Street: {addr.street}</p>}
                            <p className="font-medium text-[#292525]">
                              {addr.area}, {addr.city || "Dubai"}
                            </p>
                            {addr.landmark && (
                              <p className="text-[11px] text-[#746D69] italic">
                                Near: {addr.landmark}
                              </p>
                            )}
                            {addr.accessInstructions && (
                              <p className="text-[11px] text-[#746D69]/80 bg-[#FAF7F2] p-2 rounded-xl mt-2 border border-[#E8D8C8]/50">
                                Access: {addr.accessInstructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between text-xs">
                          <div>
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr._id)}
                                className="text-[11px] font-semibold text-[#CF565D] hover:underline"
                              >
                                Set as Default
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress(addr)}
                              className="p-1.5 rounded-lg text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2] transition-colors"
                              title="Edit Address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingAddress(addr)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Delete Address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 6. SETTINGS TAB */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "settings" && (
              <div className="max-w-3xl space-y-8 animate-in fade-in duration-200">
                {/* Change Password Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-2xs space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-[#CF565D]" />
                      <h2 className="text-lg font-serif font-semibold text-[#292525]">
                        Change Account Password
                      </h2>
                    </div>
                    <p className="text-xs text-[#746D69]">
                      Ensure your account remains safe using a strong password.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                          New Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder="At least 6 characters"
                          className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="Re-enter new password"
                          className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {changingPassword && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Account Verification Section */}
                {!profileData?.isAccountVerified && (
                  <div className="bg-amber-50/70 rounded-3xl p-6 sm:p-7 border border-amber-200/80 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-amber-900">
                          Verify Your Email Address
                        </h3>
                        <p className="text-xs text-amber-800/90 leading-relaxed mt-0.5">
                          Confirming your email unlocks Damascus VIP perks, direct booking confirmations, and digital invoices.
                        </p>
                      </div>
                    </div>

                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendVerificationOtp}
                        disabled={sendingOtp}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors disabled:opacity-50"
                      >
                        {sendingOtp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Send 6-Digit Verification OTP</span>
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="flex items-center gap-3 max-w-sm pt-1">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="6-digit OTP"
                          className="w-32 px-3 py-2 rounded-xl bg-white border border-amber-300 text-center tracking-widest text-sm font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={verifyingOtp}
                          className="px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors disabled:opacity-50"
                        >
                          {verifyingOtp ? "Verifying..." : "Confirm OTP"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Notification Preferences */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-2xs space-y-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-[#CF565D]" />
                    <h3 className="text-base font-serif font-semibold text-[#292525]">
                      Ceremony & Order Notifications
                    </h3>
                  </div>

                  <div className="divide-y divide-[#FAF7F2] space-y-3">
                    {[
                      {
                        key: "smsReminders" as const,
                        label: "At-Home Ceremony SMS Alerts",
                        desc: "Receive real-time arrival text updates when your aesthetician departs.",
                      },
                      {
                        key: "emailConfirmations" as const,
                        label: "Email Receipts & Calendar Invites",
                        desc: "Automatic .ics calendar events and official Damascus receipts.",
                      },
                      {
                        key: "botanicalReleases" as const,
                        label: "Exclusive Damascus Rose Harvests",
                        desc: "Notices for limited seasonal drops of cold-pressed Bulgarian & Syrian oils.",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="pt-3 first:pt-0 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#292525]">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-[#746D69] mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePref(item.key)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${notifPrefs[item.key] ? "bg-[#CF565D]" : "bg-stone-200"
                            }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${notifPrefs[item.key] ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Sign Out / Privacy Assistance */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D8C8] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-serif font-semibold text-[#292525]">
                      Customer Session
                    </h4>
                    <p className="text-xs text-[#746D69]">
                      Signed in as {profileData?.email || user?.email}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 text-[#292525] text-xs font-semibold hover:bg-rose-50 hover:text-[#CF565D] transition-colors border border-stone-200 self-start sm:self-center"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out from Device</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: VIEW APPOINTMENT DETAILS */}
      {/* ------------------------------------------------------------- */}
      {viewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E8D8C8]">
                  {viewBooking.bookingNumber}
                </span>
                <StatusBadge status={viewBooking.status} size="sm" />
              </div>
              <button
                type="button"
                onClick={() => setViewBooking(null)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Service Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#746D69] uppercase tracking-wider">
                Reserved Ceremonies
              </h4>
              <div className="space-y-2">
                {viewBooking.services.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/50 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#292525]">{item.name}</p>
                      <p className="text-[11px] text-[#746D69]">
                        {item.durationMinutes} mins
                      </p>
                    </div>
                    <span className="font-bold text-[#CF565D]">AED {item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule & Timing */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF7F2]/60 p-4 rounded-2xl border border-[#E8D8C8]/40">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#746D69]">
                  Date
                </span>
                <p className="font-semibold text-[#292525] mt-0.5">
                  {viewBooking.scheduledDate}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#746D69]">
                  Timing (Dubai GST)
                </span>
                <p className="font-semibold text-[#292525] mt-0.5">
                  {formatBookingTime(viewBooking.scheduledTime, viewBooking)}
                </p>
              </div>
            </div>

            {/* Residence Address */}
            <div className="text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#746D69]">
                Delivery Residence
              </span>
              <p className="font-semibold text-[#292525]">
                {viewBooking.serviceAddress?.fullName} &bull;{" "}
                {viewBooking.serviceAddress?.phone}
              </p>
              <p className="text-[#746D69]">
                Unit {viewBooking.serviceAddress?.unitNumber},{" "}
                {viewBooking.serviceAddress?.buildingName},{" "}
                {viewBooking.serviceAddress?.street}
              </p>
              <p className="text-[#746D69]">
                {viewBooking.serviceAddress?.area},{" "}
                {viewBooking.serviceAddress?.city || "Dubai"}
              </p>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#746D69]">
                Total Price Paid
              </span>
              <span className="text-lg font-bold text-[#CF565D]">
                AED {viewBooking.totalPrice}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: VIEW ORDER DETAILS */}
      {/* ------------------------------------------------------------- */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E8D8C8]">
                  #{viewOrder.orderId || viewOrder._id.slice(-6).toUpperCase()}
                </span>
                <StatusBadge status={viewOrder.status} size="sm" />
              </div>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#746D69] uppercase tracking-wider">
                Order Items
              </h4>
              <div className="space-y-2">
                {viewOrder.products.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E8D8C8] overflow-hidden flex items-center justify-center shrink-0">
                        {item.productId?.images?.[0] ? (
                          <Image
                            src={item.productId.images[0]}
                            alt={item.productId.name || "Product"}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5 text-[#CF565D]" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-[#292525] truncate">
                          {item.productId?.name || "Damascus Botanical"}
                        </p>
                        <p className="text-[11px] text-[#746D69]">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-[#CF565D]">
                      AED {(item.price || 0) * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            {viewOrder.address && (
              <div className="text-xs space-y-1 bg-[#FAF7F2]/60 p-4 rounded-2xl border border-[#E8D8C8]/40">
                <span className="text-[10px] uppercase font-bold text-[#746D69]">
                  Shipping Destination
                </span>
                <p className="font-semibold text-[#292525]">
                  {viewOrder.address.fullName} &bull; {viewOrder.address.phone}
                </p>
                <p className="text-[#746D69]">
                  {viewOrder.address.unitNumber}, {viewOrder.address.buildingName},{" "}
                  {viewOrder.address.street}
                </p>
                <p className="text-[#746D69]">
                  {viewOrder.address.area}, {viewOrder.address.city || "Dubai"}
                </p>
              </div>
            )}

            {/* Total & Invoice */}
            <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-between">
              <a
                href={`/api/order/${viewOrder._id}/invoice.pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:border-[#CF565D] hover:text-[#CF565D] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Official PDF Invoice</span>
              </a>
              <div className="text-right">
                <span className="text-[11px] text-[#746D69]">Total Amount: </span>
                <span className="text-lg font-bold text-[#CF565D]">
                  AED {viewOrder.totalAmount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: RESCHEDULE APPOINTMENT */}
      {/* ------------------------------------------------------------- */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <div>
                <h3 className="text-base font-serif font-semibold text-[#292525]">
                  Reschedule Appointment
                </h3>
                <p className="text-xs text-[#746D69]">
                  Ref: {rescheduleBooking.bookingNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Select New Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Slot Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Available Dubai Time Slots *
                </label>
                {loadingSlots ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-[#746D69]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#CF565D]" />
                    <span>Verifying therapist availability...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-[#746D69] italic bg-[#FAF7F2] p-3 rounded-xl border border-[#E8D8C8]/60">
                    {rescheduleDate
                      ? "No available slots on this date. Please pick another date."
                      : "Choose a date above to check available ceremony slots."}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {availableSlots
                      .filter((s) => s.isAvailable)
                      .map((slot) => {
                        const isSelected = rescheduleTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setRescheduleTime(slot.time)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-medium transition-all ${isSelected
                              ? "bg-[#CF565D] text-white font-bold shadow-xs"
                              : "bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] hover:border-[#CF565D]"
                              }`}
                          >
                            {format12Hour(slot.time)}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Reason for Rescheduling (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, traveling..."
                  className="w-full px-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#746D69] hover:text-[#292525]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule || !rescheduleTime}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-2xs disabled:opacity-50"
                >
                  {submittingReschedule && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Confirm Reschedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CANCEL APPOINTMENT */}
      {/* ------------------------------------------------------------- */}
      {cancelBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <h3 className="text-base font-serif font-semibold text-[#292525]">
                Cancel Appointment
              </h3>
              <button
                type="button"
                onClick={() => setCancelBookingModal(null)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#746D69] leading-relaxed">
              Are you sure you want to cancel your Damascus ceremony (
              <strong>{cancelBookingModal.bookingNumber}</strong>)? Appointments cancelled
              more than 24 hours in advance are immediately cancelled without penalty.
            </p>

            <form onSubmit={handleSubmitCancelBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Cancellation Reason
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Change of plans, personal..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelBookingModal(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#746D69] hover:text-[#292525]"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={submittingCancelBooking}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {submittingCancelBooking && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: CANCEL ORDER */}
      {/* ------------------------------------------------------------- */}
      {cancelOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <h3 className="text-base font-serif font-semibold text-[#292525]">
                Cancel Botanical Order
              </h3>
              <button
                type="button"
                onClick={() => setCancelOrderModal(null)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#746D69] leading-relaxed">
              Are you sure you want to cancel order #{cancelOrderModal.orderId || cancelOrderModal._id.slice(-6).toUpperCase()}? Reserved quantities will be restored back to store inventory.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelOrderModal(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#746D69] hover:text-[#292525]"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleSubmitCancelOrder}
                disabled={submittingCancelOrder}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                {submittingCancelOrder && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Cancel Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: ADD / EDIT ADDRESS */}
      {/* ------------------------------------------------------------- */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E8D8C8] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <div>
                <h3 className="text-base font-serif font-semibold text-[#292525]">
                  {editingAddressId ? "Edit Residence Address" : "Add Service Residence"}
                </h3>
                <p className="text-xs text-[#746D69]">
                  Dubai at-home beauty ceremony destination details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Label (e.g. Home, Villa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.label}
                    onChange={(e) =>
                      setAddressFormData({ ...addressFormData, label: e.target.value })
                    }
                    placeholder="Home"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Residence Type
                  </label>
                  <select
                    value={addressFormData.addressType || "apartment"}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        addressType: e.target.value as any,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  >
                    <option value="apartment">Apartment / Flat</option>
                    <option value="villa">Private Villa</option>
                    <option value="office">Office / Suite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.fullName}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        fullName: e.target.value,
                      })
                    }
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressFormData.phone}
                    onChange={(e) =>
                      setAddressFormData({ ...addressFormData, phone: e.target.value })
                    }
                    placeholder="+971 50 123 4567"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Unit / Villa No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.unitNumber}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        unitNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. 1402 or Villa 12"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Building / Community *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.buildingName}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        buildingName: e.target.value,
                      })
                    }
                    placeholder="e.g. Marina Gate 1 / Arabian Ranches"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              {/* Area with Real-time Service Zone Coverage Check */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                  Area / Neighborhood *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={addressFormData.area}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAddressFormData({ ...addressFormData, area: v });
                      handleCheckAreaZone(v);
                    }}
                    placeholder="e.g. Downtown Dubai, Dubai Marina, Palm Jumeirah, JLT"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                  {checkingZone && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CF565D]" />
                    </div>
                  )}
                </div>
                {zoneCheckResult && (
                  <p
                    className={`text-[11px] mt-1 flex items-center gap-1 ${zoneCheckResult.isSupported ? "text-emerald-700" : "text-amber-700"
                      }`}
                  >
                    {zoneCheckResult.isSupported ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    )}
                    <span>{zoneCheckResult.message}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    Street / Road
                  </label>
                  <input
                    type="text"
                    value={addressFormData.street}
                    onChange={(e) =>
                      setAddressFormData({ ...addressFormData, street: e.target.value })
                    }
                    placeholder="Street name / number"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                    City / Emirate
                  </label>
                  <input
                    type="text"
                    value={addressFormData.city || "Dubai"}
                    onChange={(e) =>
                      setAddressFormData({ ...addressFormData, city: e.target.value })
                    }
                    placeholder="Dubai"
                    className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1">
                  Access & Gate Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={addressFormData.accessInstructions}
                  onChange={(e) =>
                    setAddressFormData({
                      ...addressFormData,
                      accessInstructions: e.target.value,
                    })
                  }
                  placeholder="e.g. Ring intercom 1402, visitor parking on basement level 1"
                  className="w-full px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressFormData.isDefault}
                  onChange={(e) =>
                    setAddressFormData({
                      ...addressFormData,
                      isDefault: e.target.checked,
                    })
                  }
                  className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                />
                <label
                  htmlFor="defaultAddressCheckbox"
                  className="text-xs text-[#292525] select-none"
                >
                  Set as my primary default delivery residence
                </label>
              </div>

              <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#746D69] hover:text-[#292525]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-2xs disabled:opacity-50"
                >
                  {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: CONFIRM DELETE ADDRESS */}
      {/* ------------------------------------------------------------- */}
      {deletingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 border border-[#E8D8C8] shadow-2xl space-y-4">
            <h3 className="text-base font-serif font-semibold text-[#292525]">
              Delete Residence Address?
            </h3>
            <p className="text-xs text-[#746D69] leading-relaxed">
              Remove &quot;{deletingAddress.label} &bull; {deletingAddress.buildingName}&quot; from
              your address book? Previous appointment and order records will not be affected.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#746D69] hover:text-[#292525]"
              >
                Keep Address
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAddress}
                disabled={submittingDeleteAddress}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                {submittingDeleteAddress && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function SinglePageCustomerAccount() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <div className="w-8 h-8 border-2 border-[#CF565D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
