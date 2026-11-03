"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import {
  serviceApi,
  serviceCategoryApi,
  packageApi,
  bookingApi,
  addressApi,
  serviceZoneApi,
} from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Service, ServiceCategory, ServiceZone } from "../../types/service";
import {
  TimeSlot,
  SavedAddress,
  Booking,
  ZoneValidationResponse,
} from "../../types/booking";
import { format12Hour } from "../../lib/booking-utils";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  CalendarDays,
  ShieldCheck,
  Heart,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Search,
  Lock,
  Check,
  X,
  Sunrise,
  Sun,
  Moon,
  Pencil,
} from "lucide-react";
import { UAE_EMIRATES } from "../../lib/locations";

/* ---------- design tokens (Tailwind arbitrary values) ---------- */
const ROSE = "#B8434B"; // deeper, richer rose
const INK = "#2A2022";
const MUTED = "#7A6F6B";
const LINE = "#EADFD3";
const IVORY = "#FBF8F4";
const GOLD = "#B08D57";

const STEPS = ["Services", "Address", "Date & time", "Review"];

/* ---------- helpers ---------- */
const getPrice = (s: Service) =>
  s.isExclusiveDeal && s.dealPrice != null && Number(s.dealPrice) >= 0
    ? Number(s.dealPrice)
    : Number(s.price || 0);
const isDealSvc = (s: Service) =>
  Boolean(s.isExclusiveDeal && s.dealPrice != null && Number(s.dealPrice) >= 0);
const getMins = (s: Service) => s.durationMinutes || s.duration || 30;
const catName = (s: Service) =>
  typeof s.category === "object" ? s.category?.name : s.category;
const catSlugOf = (s: Service) =>
  typeof s.category === "object" ? s.category?.slug : s.category;
const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const fmtDuration = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m} min`;

const inputCls =
  "w-full h-12 px-4 bg-white border border-[#EADFD3] rounded-xl text-sm text-[#2A2022] placeholder:text-[#7A6F6B]/60 focus:outline-none focus:border-[#B8434B] focus:ring-4 focus:ring-[#B8434B]/10 transition";

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#2A2022] mb-1.5">
        {label} {required && <span className="text-[#B8434B]">*</span>}
      </label>
      {children}
    </div>
  );
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const preselectedSlug = searchParams.get("service");
  const packageSlug = searchParams.get("package");

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Step 2
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    unitNumber: "",
    buildingName: "",
    street: "",
    area: "",
    city: "Dubai",
    state: "Dubai",
    accessInstructions: "",
    saveToProfile: true,
  });
  const [zoneValidation, setZoneValidation] =
    useState<ZoneValidationResponse | null>(null);
  const [validatingZone, setValidatingZone] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Step 3
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotPeriodFilter, setSlotPeriodFilter] = useState<
    "all" | "morning" | "afternoon" | "evening"
  >("all");

  // Step 4
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Step 5
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const useNewAddress = isAddingNewAddress || savedAddresses.length === 0;

  const goTo = (n: number) => {
    setCurrentStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartNewBooking = useCallback(() => {
    setConfirmedBooking(null);
    setCurrentStep(1);
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    setSpecialRequests("");
    setBookingError(null);
    setAddressError(null);
    if (preselectedSlug || packageSlug) {
      router.replace("/book");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router, preselectedSlug, packageSlug]);

  // Listen to header "Book Now" clicks when already on /book
  useEffect(() => {
    const handleReset = () => {
      handleStartNewBooking();
    };
    window.addEventListener("reset-booking-flow", handleReset);
    return () => {
      window.removeEventListener("reset-booking-flow", handleReset);
    };
  }, [handleStartNewBooking]);

  // Clean up confirmed booking state when unmounting / navigating away
  useEffect(() => {
    return () => {
      setConfirmedBooking(null);
      setCurrentStep(1);
    };
  }, []);

  /* ---------- data loading ---------- */
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setServicesLoading(true);
        const [srvRes, catRes, zoneRes] = await Promise.all([
          serviceApi.getAll({ limit: 50 }),
          serviceCategoryApi.getAll(),
          serviceZoneApi.getAll().catch(() => ({ success: false, zones: [] })),
        ]);
        if (!isMounted) return;
        if (srvRes.services) setServices(srvRes.services);
        if (catRes.categories) setCategories(catRes.categories);
        if (zoneRes?.zones) setServiceZones(zoneRes.zones);

        if (preselectedSlug && srvRes.services) {
          const matched = srvRes.services.find(
            (s: Service) => s.slug === preselectedSlug
          );
          if (matched) {
            setSelectedServiceIds([matched._id]);
            setCurrentStep(1);
            setConfirmedBooking(null);
          }
        } else if (packageSlug) {
          try {
            const pkgRes = await packageApi.getBySlug(packageSlug);
            if (isMounted && pkgRes.success && pkgRes.package?.services) {
              const sIds = pkgRes.package.services.map((s: any) =>
                typeof s === "string" ? s : s._id
              );
              if (sIds.length > 0) {
                setSelectedServiceIds(sIds);
                setCurrentStep(1);
                setConfirmedBooking(null);
              }
            }
          } catch (e) {
            console.error("Failed to load package for booking:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load services for booking:", err);
      } finally {
        if (isMounted) setServicesLoading(false);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [preselectedSlug, packageSlug]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      addressApi
        .getAll()
        .then((res) => {
          if (isMounted && res.success && res.addresses) {
            setSavedAddresses(res.addresses);
            const def =
              res.addresses.find((a) => a.isDefault) || res.addresses[0];
            if (def) setSelectedAddressId((prev) => prev || def._id);
          }
        })
        .catch(() => { });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (user && !newAddress.fullName) {
      setNewAddress((prev) => ({ ...prev, fullName: user.name || "" }));
    }
  }, [user, newAddress.fullName]);

  /* ---------- derived ---------- */
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s._id)),
    [services, selectedServiceIds]
  );
  const totalDurationMinutes = useMemo(
    () => selectedServices.reduce((sum, s) => sum + getMins(s), 0),
    [selectedServices]
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + getPrice(s), 0),
    [selectedServices]
  );
  const totalSavings = useMemo(
    () =>
      selectedServices.reduce(
        (sum, s) => sum + (isDealSvc(s) ? Number(s.price || 0) - getPrice(s) : 0),
        0
      ),
    [selectedServices]
  );

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((srv) => {
      if (
        selectedCategory !== "all" &&
        catSlugOf(srv)?.toLowerCase() !== selectedCategory.toLowerCase()
      )
        return false;
      return q ? srv.name.toLowerCase().includes(q) : true;
    });
  }, [services, selectedCategory, searchQuery]);

  const availableDates = useMemo(() => {
    const out: Array<{ dateStr: string; dayName: string; day: string; month: string }> = [];
    const start = new Date();
    start.setDate(start.getDate() + 1);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({
        dateStr: toLocalISO(d),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        day: String(d.getDate()),
        month: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    return out;
  }, []);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0)
      setSelectedDate(availableDates[0].dateStr);
  }, [availableDates, selectedDate]);

  const availableLocationsForEmirate = useMemo(() => {
    const emirate = (newAddress.city || "Dubai").trim().toLowerCase();
    const set = new Set<string>();
    serviceZones
      .filter((z) => {
        if (!z.isActive) return false;
        return (z.city || z.emirate || "Dubai").trim().toLowerCase() === emirate;
      })
      .forEach((z) => {
        if (z.name?.trim()) set.add(z.name.trim());
        if (Array.isArray(z.supportedAreas))
          z.supportedAreas.forEach((a) => a?.trim() && set.add(a.trim()));
      });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [serviceZones, newAddress.city]);

  /* ---------- zone validation ---------- */
  useEffect(() => {
    let isMounted = true;
    async function checkZone() {
      let area = "";
      let city = "";
      let addrId = "";
      if (useNewAddress) {
        area = newAddress.area;
        city = newAddress.city;
      } else if (selectedAddressId) {
        const found = savedAddresses.find((a) => a._id === selectedAddressId);
        if (found) {
          area = found.area;
          city = found.city || (found as any).state || "Dubai";
          addrId = found._id;
        }
      }
      if (!area || area.trim().length < 2) {
        setZoneValidation(null);
        return;
      }
      try {
        setValidatingZone(true);
        const res = await bookingApi.validateZone({
          area,
          city,
          emirate: city,
          addressId: addrId || undefined,
        });
        if (isMounted) setZoneValidation(res);
      } catch (err) {
        console.error("Zone check failed:", err);
      } finally {
        if (isMounted) setValidatingZone(false);
      }
    }
    const t = setTimeout(checkZone, 300);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [selectedAddressId, useNewAddress, newAddress.area, newAddress.city, savedAddresses]);

  /* ---------- slots ---------- */
  useEffect(() => {
    let isMounted = true;
    if (currentStep === 3 && selectedDate && totalDurationMinutes > 0) {
      setSlotsLoading(true);
      bookingApi
        .getAvailability({
          date: selectedDate,
          duration: totalDurationMinutes,
          serviceIds: selectedServiceIds,
        })
        .then((res) => {
          if (!isMounted) return;
          const list = res.slots || [];
          setSlots(list);
          setSelectedSlot((prev) =>
            prev && list.some((s) => s.time === prev.time && s.isAvailable) ? prev : null
          );
        })
        .catch((err) => {
          console.error("Slot availability fetch error:", err);
          if (isMounted) setSlots([]);
        })
        .finally(() => isMounted && setSlotsLoading(false));
    }
    return () => {
      isMounted = false;
    };
  }, [currentStep, selectedDate, totalDurationMinutes, selectedServiceIds]);

  const filteredSlots = useMemo(
    () =>
      slotPeriodFilter === "all"
        ? slots
        : slots.filter((s) => s.period === slotPeriodFilter),
    [slots, slotPeriodFilter]
  );

  /* ---------- navigation ---------- */
  const handleNextFromAddress = () => {
    setAddressError(null);
    if (!isAuthenticated) {
      setAddressError("Please sign in or create an account to continue.");
      return;
    }
    if (useNewAddress) {
      if (
        !newAddress.fullName.trim() ||
        !newAddress.phone.trim() ||
        !newAddress.unitNumber.trim() ||
        !newAddress.buildingName.trim() ||
        !newAddress.area.trim()
      ) {
        setAddressError(
          "Please complete the required fields: name, phone, unit, building and area."
        );
        return;
      }
    } else if (!selectedAddressId) {
      setAddressError("Choose a saved address or add a new one.");
      return;
    }
    if (!zoneValidation?.isSupported) {
      setAddressError(
        `We don't serve ${newAddress.area || "this location"} yet. Please choose an area from the list of supported locations.`
      );
      return;
    }
    goTo(3);
  };

  const handleConfirmBooking = async () => {
    try {
      setIsSubmitting(true);
      setBookingError(null);
      const payload = {
        serviceIds: selectedServiceIds,
        scheduledDate: selectedDate,
        scheduledTime: selectedSlot?.time || "10:00",
        specialRequests,
        ...(useNewAddress
          ? {
            address: {
              label: newAddress.label,
              fullName: newAddress.fullName,
              phone: newAddress.phone,
              unitNumber: newAddress.unitNumber,
              buildingName: newAddress.buildingName,
              street: newAddress.street,
              area: newAddress.area,
              city: newAddress.city,
              state: newAddress.state,
              accessInstructions: newAddress.accessInstructions,
            },
            saveAddressToProfile: newAddress.saveToProfile,
          }
          : { addressId: selectedAddressId }),
      };
      const res = await bookingApi.create(payload);
      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        goTo(5);
      } else {
        setBookingError(res.message || "We couldn't confirm your booking. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      setBookingError(
        e.status === 409
          ? "Someone just booked this time. Go back and choose another slot."
          : e.message || "Something went wrong while booking. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- address text for summary ---------- */
  const addressText = (() => {
    if (useNewAddress) {
      return newAddress.area
        ? [newAddress.unitNumber, newAddress.buildingName, newAddress.area]
          .filter(Boolean)
          .join(", ")
        : "";
    }
    const a = savedAddresses.find((x) => x._id === selectedAddressId);
    return a ? `${a.unitNumber}, ${a.buildingName}, ${a.area}` : "";
  })();

  const prettyDate = (iso: string, long = false) =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
        weekday: long ? "long" : "short",
        month: long ? "long" : "short",
        day: "numeric",
      })
      : "";

  /* ---------- primary CTA per step (shared by sidebar + mobile bar) ---------- */
  const cta = (() => {
    if (currentStep === 1)
      return {
        label: "Continue to address",
        disabled: selectedServiceIds.length === 0,
        onClick: () => goTo(2),
      };
    if (currentStep === 2)
      return { label: "Continue to date & time", disabled: false, onClick: handleNextFromAddress };
    if (currentStep === 3)
      return {
        label: "Review booking",
        disabled: !selectedSlot || !selectedSlot.isAvailable,
        onClick: () => goTo(4),
      };
    return {
      label: isSubmitting ? "Confirming…" : "Confirm booking",
      disabled: isSubmitting,
      onClick: handleConfirmBooking,
    };
  })();

  const SummaryRow = ({
    icon: Icon,
    label,
    value,
    step,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    step: number;
  }) => (
    <div className="flex items-start gap-3 py-3">
      <Icon className="w-4 h-4 mt-0.5 text-[#B8434B] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#7A6F6B]">{label}</p>
        <p className={`text-sm ${value ? "text-[#2A2022] font-medium" : "text-[#7A6F6B]/70"}`}>
          {value || "Not chosen yet"}
        </p>
      </div>
      {value && currentStep !== step && currentStep < 5 && (
        <button
          type="button"
          onClick={() => goTo(step)}
          className="text-xs text-[#B8434B] hover:underline inline-flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F4]">
      <Header />

      <main className="flex-1 pb-28 lg:pb-16">
        {/* Hero + progress */}
        <section className="border-b border-[#EADFD3] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
            <h1 className="font-serif text-3xl sm:text-4xl text-[#2A2022] tracking-tight">
              Book your at-home ritual
            </h1>
            <p className="text-sm text-[#7A6F6B] mt-1.5">
              Female therapists, sterilised tools, and your own space.
            </p>

            {currentStep < 5 && (
              <ol className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const done = currentStep > n;
                  const active = currentStep === n;
                  return (
                    <li key={label}>
                      <button
                        type="button"
                        disabled={n > currentStep}
                        onClick={() => goTo(n)}
                        className="w-full text-left group disabled:cursor-default"
                      >
                        <div
                          className={`h-1.5 rounded-full transition-colors ${done || active ? "bg-[#B8434B]" : "bg-[#EADFD3]"
                            } ${active ? "opacity-100" : done ? "opacity-60" : ""}`}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${done
                              ? "bg-[#B8434B] text-white"
                              : active
                                ? "border-2 border-[#B8434B] text-[#B8434B]"
                                : "border border-[#EADFD3] text-[#7A6F6B]"
                              }`}
                          >
                            {done ? <Check className="w-3 h-3" /> : n}
                          </span>
                          <span
                            className={`text-xs sm:text-sm truncate ${active ? "font-semibold text-[#2A2022]" : "text-[#7A6F6B]"
                              }`}
                          >
                            {label}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div
            className={
              currentStep < 5
                ? "grid lg:grid-cols-[1fr_380px] gap-8 items-start"
                : ""
            }
          >
            {/* ================= MAIN COLUMN ================= */}
            <div className="min-w-0">
              {/* ---------- STEP 1 ---------- */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#2A2022]">Choose your treatments</h2>
                    <p className="text-sm text-[#7A6F6B] mt-1">
                      Select one or more. Your total updates as you go.
                    </p>
                  </div>

                  <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-[#FBF8F4]/95 backdrop-blur space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7A6F6B]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search treatments"
                        className={`${inputCls} pl-11 rounded-full`}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A6F6B]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {[{ slug: "all", name: "All" }, ...categories].map((c) => {
                        const active = selectedCategory === c.slug;
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => setSelectedCategory(c.slug)}
                            className={`shrink-0 h-10 px-5 rounded-full text-sm font-medium transition ${active
                              ? "bg-[#2A2022] text-white"
                              : "bg-white text-[#2A2022] border border-[#EADFD3] hover:border-[#B8434B]"
                              }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {servicesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-2xl bg-white border border-[#EADFD3] animate-pulse" />
                      ))}
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-[#EADFD3]">
                      <p className="font-serif text-lg text-[#2A2022]">No treatments match your search</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                        className="mt-2 text-sm text-[#B8434B] hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredServices.map((srv) => {
                        const selected = selectedServiceIds.includes(srv._id);
                        const deal = isDealSvc(srv);
                        return (
                          <div
                            key={srv._id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selected}
                            onClick={() => toggleService(srv._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleService(srv._id);
                              }
                            }}
                            className={`cursor-pointer rounded-2xl bg-white p-5 flex gap-4 items-center border transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B8434B]/20 ${selected
                              ? "border-[#B8434B] bg-[#B8434B]/[0.03] shadow-[0_0_0_1px_#B8434B]"
                              : "border-[#EADFD3] hover:border-[#B8434B]/50"
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-serif text-lg text-[#2A2022]">{srv.name}</h3>
                                {deal && (
                                  <span className="text-xs font-medium text-[#8A6A32] bg-[#B08D57]/15 px-2 py-0.5 rounded-full">
                                    {srv.dealBadge || "Today's deal"}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#7A6F6B] mt-1 line-clamp-2">
                                {srv.shortDescription ||
                                  srv.description ||
                                  "Delivered with sterilised tools and personal care."}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-[#7A6F6B]">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {fmtDuration(getMins(srv))}
                                </span>
                                {catName(srv) && <span>{catName(srv)}</span>}
                                {(srv.womenOnly ?? true) && (
                                  <span className="inline-flex items-center gap-1 text-[#B8434B]">
                                    <Heart className="w-3 h-3" /> Ladies only
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3 shrink-0">
                              <div className="text-right">
                                <p className={`font-serif text-lg font-semibold ${deal ? "text-[#B8434B]" : "text-[#2A2022]"}`}>
                                  {srv.currency || "AED"} {getPrice(srv)}
                                </p>
                                {deal && (
                                  <p className="text-xs text-[#7A6F6B] line-through">
                                    {srv.currency || "AED"} {srv.price}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`h-9 px-4 rounded-full text-sm font-medium inline-flex items-center gap-1.5 transition ${selected
                                  ? "bg-[#B8434B] text-white"
                                  : "border border-[#B8434B] text-[#B8434B]"
                                  }`}
                              >
                                {selected ? (
                                  <>
                                    <Check className="w-4 h-4" /> Added
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" /> Add
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ---------- STEP 2 ---------- */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#2A2022]">Where should we come?</h2>
                    <p className="text-sm text-[#7A6F6B] mt-1">
                      Our therapists visit homes within active service areas.
                    </p>
                  </div>

                  {!isAuthenticated && !authLoading && (
                    <div className="p-5 rounded-2xl bg-[#B08D57]/10 border border-[#B08D57]/30 flex flex-col sm:flex-row sm:items-center gap-4">
                      <Lock className="w-5 h-5 text-[#8A6A32] shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-[#2A2022]">Sign in to book</p>
                        <p className="text-sm text-[#7A6F6B]">
                          Bookings are linked to your account so we can send updates and your therapist's details.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href="/login?redirect=/book"
                          className="h-11 px-5 rounded-full bg-[#B8434B] text-white text-sm font-medium inline-flex items-center hover:bg-[#9d363e] transition"
                        >
                          Sign in
                        </Link>
                        <Link
                          href="/signup?redirect=/book"
                          className="h-11 px-5 rounded-full bg-white border border-[#EADFD3] text-[#2A2022] text-sm font-medium inline-flex items-center hover:bg-[#FBF8F4] transition"
                        >
                          Create account
                        </Link>
                      </div>
                    </div>
                  )}

                  {isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-[#2A2022]">Saved addresses</h3>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B8434B] hover:underline"
                        >
                          <Plus className="w-4 h-4" /> Add new address
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {savedAddresses.map((addr) => {
                          const sel = selectedAddressId === addr._id;
                          return (
                            <button
                              type="button"
                              key={addr._id}
                              onClick={() => setSelectedAddressId(addr._id)}
                              className={`text-left p-5 rounded-2xl bg-white border transition flex gap-3 ${sel
                                ? "border-[#B8434B] shadow-[0_0_0_1px_#B8434B]"
                                : "border-[#EADFD3] hover:border-[#B8434B]/50"
                                }`}
                            >
                              <span
                                className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${sel ? "bg-[#B8434B] border-[#B8434B]" : "border-[#EADFD3]"
                                  }`}
                              >
                                {sel && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <span className="space-y-1 min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-[#2A2022]">{addr.label || "Home"}</span>
                                  {addr.isDefault && (
                                    <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </span>
                                <span className="block text-sm text-[#7A6F6B]">
                                  {addr.unitNumber}, {addr.buildingName}, {addr.area}, {addr.city}
                                </span>
                                <span className="block text-sm text-[#7A6F6B]">
                                  {addr.fullName} · {addr.phone}
                                </span>
                                {addr.accessInstructions && (
                                  <span className="block text-xs text-[#B8434B]">
                                    Note: {addr.accessInstructions}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {useNewAddress && (
                    <div className="bg-white rounded-2xl border border-[#EADFD3] p-6 sm:p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif text-lg text-[#2A2022]">Address details</h3>
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsAddingNewAddress(false)}
                            className="text-sm text-[#7A6F6B] hover:text-[#2A2022]"
                          >
                            Use a saved address
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Emirate" required>
                          <select
                            value={newAddress.city}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                city: e.target.value,
                                state: e.target.value,
                                area: "",
                              })
                            }
                            className={inputCls}
                          >
                            {UAE_EMIRATES.map((em) => (
                              <option key={em} value={em}>
                                {em}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Area" required>
                          <select
                            value={newAddress.area}
                            onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                            disabled={availableLocationsForEmirate.length === 0}
                            className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            <option value="">
                              {availableLocationsForEmirate.length === 0
                                ? `No areas in ${newAddress.city} yet`
                                : `Select area in ${newAddress.city}`}
                            </option>
                            {availableLocationsForEmirate.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                          {availableLocationsForEmirate.length === 0 && (
                            <p className="text-xs text-amber-700 mt-1.5">
                              We don't serve {newAddress.city} yet. Try another emirate.
                            </p>
                          )}
                        </Field>

                        <Field label="Flat / villa / suite" required>
                          <input
                            className={inputCls}
                            value={newAddress.unitNumber}
                            onChange={(e) => setNewAddress({ ...newAddress, unitNumber: e.target.value })}
                            placeholder="Apt 1402 or Villa 7"
                          />
                        </Field>

                        <Field label="Building / community" required>
                          <input
                            className={inputCls}
                            value={newAddress.buildingName}
                            onChange={(e) => setNewAddress({ ...newAddress, buildingName: e.target.value })}
                            placeholder="Princess Tower"
                          />
                        </Field>
                      </div>

                      <div className="border-t border-[#EADFD3] pt-6 grid sm:grid-cols-2 gap-4">
                        <Field label="Recipient name" required>
                          <input
                            className={inputCls}
                            value={newAddress.fullName}
                            onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                            placeholder="Full name"
                          />
                        </Field>
                        <Field label="Mobile number" required>
                          <input
                            type="tel"
                            className={inputCls}
                            value={newAddress.phone}
                            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                            placeholder="+971 50 123 4567"
                          />
                        </Field>
                        <Field label="Address label">
                          <input
                            className={inputCls}
                            value={newAddress.label}
                            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                            placeholder="Home, Villa, Office"
                          />
                        </Field>
                        <Field label="Access notes">
                          <input
                            className={inputCls}
                            value={newAddress.accessInstructions}
                            onChange={(e) => setNewAddress({ ...newAddress, accessInstructions: e.target.value })}
                            placeholder="Gate code, parking, intercom"
                          />
                        </Field>
                      </div>

                      {isAuthenticated && (
                        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#7A6F6B]">
                          <input
                            type="checkbox"
                            checked={newAddress.saveToProfile}
                            onChange={(e) => setNewAddress({ ...newAddress, saveToProfile: e.target.checked })}
                            className="w-4 h-4 rounded border-[#EADFD3] text-[#B8434B] focus:ring-[#B8434B]"
                          />
                          Save this address for next time
                        </label>
                      )}
                    </div>
                  )}

                  {/* Zone status */}
                  <div
                    aria-live="polite"
                    className={`p-4 rounded-2xl border flex items-start gap-3 text-sm ${validatingZone || !zoneValidation
                      ? "bg-white border-[#EADFD3] text-[#7A6F6B]"
                      : zoneValidation.isSupported
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-red-50 border-red-200 text-red-800"
                      }`}
                  >
                    {validatingZone ? (
                      <>
                        <MapPin className="w-4 h-4 mt-0.5 animate-pulse text-[#B8434B]" />
                        <span>Checking coverage…</span>
                      </>
                    ) : !zoneValidation ? (
                      <>
                        <MapPin className="w-4 h-4 mt-0.5 text-[#B8434B]" />
                        <span>Choose your emirate and area to check coverage.</span>
                      </>
                    ) : zoneValidation.isSupported ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>We serve {zoneValidation.zone?.name || zoneValidation.area}.</strong>{" "}
                          Therapist travel is included.
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                        <span>
                          <strong>We don't serve this area yet.</strong>{" "}
                          {zoneValidation.message || "Try a nearby area from the list."}
                        </span>
                      </>
                    )}
                  </div>

                  {addressError && (
                    <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {addressError}
                    </div>
                  )}
                </div>
              )}

              {/* ---------- STEP 3 ---------- */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#2A2022]">Pick a date and time</h2>
                    <p className="text-sm text-[#7A6F6B] mt-1">
                      Your session takes <strong className="text-[#2A2022]">{fmtDuration(totalDurationMinutes)}</strong>.
                      Times include travel and setup.
                    </p>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                    {availableDates.map((d) => {
                      const sel = selectedDate === d.dateStr;
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(d.dateStr)}
                          className={`shrink-0 w-[72px] py-3 rounded-2xl text-center border transition ${sel
                            ? "bg-[#2A2022] border-[#2A2022] text-white"
                            : "bg-white border-[#EADFD3] text-[#2A2022] hover:border-[#B8434B]"
                            }`}
                        >
                          <span className={`block text-xs ${sel ? "text-white/70" : "text-[#7A6F6B]"}`}>
                            {d.dayName}
                          </span>
                          <span className="block font-serif text-2xl leading-tight">{d.day}</span>
                          <span className={`block text-xs ${sel ? "text-white/70" : "text-[#7A6F6B]"}`}>
                            {d.month}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white rounded-2xl border border-[#EADFD3] p-5 sm:p-7 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-serif text-lg text-[#2A2022]">{prettyDate(selectedDate, true)}</h3>
                      <div className="inline-flex p-1 rounded-full bg-[#FBF8F4] border border-[#EADFD3] self-start">
                        {(
                          [
                            { k: "all", label: "All", Icon: null },
                            { k: "morning", label: "Morning", Icon: Sunrise },
                            { k: "afternoon", label: "Afternoon", Icon: Sun },
                            { k: "evening", label: "Evening", Icon: Moon },
                          ] as const
                        ).map(({ k, label, Icon }) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setSlotPeriodFilter(k)}
                            className={`h-9 px-3 rounded-full text-sm inline-flex items-center gap-1.5 transition ${slotPeriodFilter === k
                              ? "bg-white text-[#2A2022] font-medium shadow-sm"
                              : "text-[#7A6F6B] hover:text-[#2A2022]"
                              }`}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            <span className={Icon ? "hidden sm:inline" : ""}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-16 rounded-xl bg-[#FBF8F4] animate-pulse" />
                        ))}
                      </div>
                    ) : filteredSlots.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="font-serif text-lg text-[#2A2022]">No times available</p>
                        <p className="text-sm text-[#7A6F6B] mt-1">
                          Try another day or switch the time of day.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {filteredSlots.map((slot) => {
                          const sel = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.isAvailable}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-3 rounded-xl border text-center transition ${!slot.isAvailable
                                ? "bg-[#FBF8F4] border-[#EADFD3] text-[#7A6F6B]/60 cursor-not-allowed"
                                : sel
                                  ? "bg-[#B8434B] border-[#B8434B] text-white shadow-md"
                                  : "bg-white border-[#EADFD3] text-[#2A2022] hover:border-[#B8434B]"
                                }`}
                            >
                              <span className="block font-medium">{format12Hour(slot.time)}</span>
                              <span
                                className={`block text-xs mt-0.5 ${sel ? "text-white/80" : "text-[#7A6F6B]"
                                  }`}
                              >
                                {slot.isAvailable
                                  ? `Ends ${format12Hour(slot.endTime)}`
                                  : slot.reason || "Unavailable"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------- STEP 4 ---------- */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#2A2022]">Review and confirm</h2>
                    <p className="text-sm text-[#7A6F6B] mt-1">
                      Check the details below. You can edit any section.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#EADFD3] p-6 sm:p-8 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-[#2A2022]">Treatments ({selectedServices.length})</h3>
                        <button type="button" onClick={() => goTo(1)} className="text-sm text-[#B8434B] hover:underline">
                          Edit
                        </button>
                      </div>
                      <div className="divide-y divide-[#EADFD3]">
                        {selectedServices.map((srv) => (
                          <div key={srv._id} className="py-3 flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-[#2A2022]">{srv.name}</p>
                              <p className="text-xs text-[#7A6F6B] mt-0.5">
                                {fmtDuration(getMins(srv))}
                                {catName(srv) ? ` · ${catName(srv)}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-serif font-semibold text-[#2A2022]">
                                AED {getPrice(srv).toFixed(2)}
                              </p>
                              {isDealSvc(srv) && (
                                <p className="text-xs text-[#7A6F6B] line-through">
                                  AED {Number(srv.price).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#FBF8F4] border border-[#EADFD3]">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#7A6F6B]">When</p>
                          <button type="button" onClick={() => goTo(3)} className="text-xs text-[#B8434B] hover:underline">
                            Edit
                          </button>
                        </div>
                        <p className="font-medium text-[#2A2022] mt-1">{prettyDate(selectedDate, true)}</p>
                        <p className="text-sm text-[#7A6F6B]">
                          {format12Hour(selectedSlot?.time)} – {format12Hour(selectedSlot?.endTime)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FBF8F4] border border-[#EADFD3]">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#7A6F6B]">Where</p>
                          <button type="button" onClick={() => goTo(2)} className="text-xs text-[#B8434B] hover:underline">
                            Edit
                          </button>
                        </div>
                        <p className="font-medium text-[#2A2022] mt-1">
                          {zoneValidation?.zone?.name || "Dubai"}
                        </p>
                        <p className="text-sm text-[#7A6F6B] line-clamp-2">{addressText || "Selected address"}</p>
                      </div>
                    </div>

                    <Field label="Notes for your therapist (optional)">
                      <textarea
                        rows={3}
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Sensitive skin, fragrance-free products, silent doorbell…"
                        className={`${inputCls} h-auto py-3 resize-none`}
                      />
                    </Field>

                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                      <p className="text-sm text-emerald-900 leading-relaxed">
                        Single-use sterilised toolkits opened in front of you, licensed female therapists, and organic Damask rose formulations.
                      </p>
                    </div>
                  </div>

                  {bookingError && (
                    <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {bookingError}
                    </div>
                  )}
                </div>
              )}

              {/* Back button (steps 2-4, desktop + mobile) */}
              {currentStep > 1 && currentStep < 5 && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => goTo(currentStep - 1)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#7A6F6B] hover:text-[#2A2022]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              {/* ---------- STEP 5 ---------- */}
              {currentStep === 5 && confirmedBooking && (
                <div className="max-w-xl mx-auto py-6 text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl text-[#2A2022]">You're booked</h2>
                    <p className="text-[#7A6F6B]">
                      Your therapist will arrive on {prettyDate(confirmedBooking.scheduledDate, true)}.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#EADFD3] p-6 text-left text-sm divide-y divide-[#EADFD3]">
                    {[
                      ["Booking reference", confirmedBooking.bookingNumber],
                      [
                        "Date & arrival",
                        `${confirmedBooking.scheduledDate} · ${format12Hour(
                          confirmedBooking.scheduledTime || selectedSlot?.time
                        )}`,
                      ],
                      [
                        `Treatments (${confirmedBooking.services.length})`,
                        confirmedBooking.services.map((s) => s.name).join(", "),
                      ],
                      [
                        "Location",
                        `${confirmedBooking.serviceAddress.unitNumber}, ${confirmedBooking.serviceAddress.buildingName}, ${confirmedBooking.serviceAddress.area}`,
                      ],
                      ...(confirmedBooking.assignedStaff
                        ? [["Your specialist", confirmedBooking.assignedStaff.name]]
                        : []),
                    ].map(([k, v]) => (
                      <div key={k} className="py-3 flex justify-between gap-6">
                        <span className="text-[#7A6F6B]">{k}</span>
                        <span className="font-medium text-[#2A2022] text-right">{v}</span>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-between items-baseline">
                      <span className="font-serif text-lg text-[#2A2022]">Total</span>
                      <span className="font-serif text-2xl font-semibold text-[#2A2022]">
                        {confirmedBooking.currency} {confirmedBooking.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleStartNewBooking}
                      className="h-12 px-8 rounded-full bg-[#B8434B] hover:bg-[#9d363e] text-white font-medium inline-flex items-center justify-center transition shadow-xs active:scale-95 cursor-pointer"
                    >
                      Book another treatment
                    </button>
                    <Link
                      href="/my-bookings"
                      className="h-12 px-8 rounded-full bg-white border border-[#EADFD3] text-[#2A2022] font-medium inline-flex items-center justify-center hover:bg-[#FBF8F4] transition"
                    >
                      View my bookings
                    </Link>
                    <Link
                      href="/services"
                      className="h-12 px-8 rounded-full bg-white border border-[#EADFD3] text-[#2A2022] font-medium inline-flex items-center justify-center hover:bg-[#FBF8F4] transition"
                    >
                      Browse more treatments
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ================= SUMMARY SIDEBAR (desktop) ================= */}
            {currentStep < 5 && (
              <aside className="hidden lg:block sticky top-6">
                <div className="bg-white rounded-2xl border border-[#EADFD3] shadow-[0_12px_40px_-16px_rgba(42,32,34,0.18)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#EADFD3] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#B08D57]" />
                    <h3 className="font-serif text-lg text-[#2A2022]">Your booking</h3>
                  </div>

                  <div className="px-6 py-4">
                    {selectedServices.length === 0 ? (
                      <p className="text-sm text-[#7A6F6B] py-6 text-center">
                        Add a treatment to get started.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {selectedServices.map((s) => (
                          <li key={s._id} className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#2A2022] truncate">{s.name}</p>
                              <p className="text-xs text-[#7A6F6B]">{fmtDuration(getMins(s))}</p>
                            </div>
                            <span className="text-sm text-[#2A2022]">AED {getPrice(s).toFixed(0)}</span>
                            {currentStep === 1 && (
                              <button
                                type="button"
                                onClick={() => toggleService(s._id)}
                                aria-label={`Remove ${s.name}`}
                                className="w-6 h-6 rounded-full border border-[#EADFD3] text-[#7A6F6B] hover:border-[#B8434B] hover:text-[#B8434B] flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="px-6 divide-y divide-[#EADFD3] border-t border-[#EADFD3]">
                    <SummaryRow icon={MapPin} label="Address" value={addressText} step={2} />
                    <SummaryRow
                      icon={CalendarDays}
                      label="Date & time"
                      value={
                        selectedSlot
                          ? `${prettyDate(selectedDate)} · ${format12Hour(selectedSlot.time)}`
                          : ""
                      }
                      step={3}
                    />
                  </div>

                  <div className="px-6 py-5 bg-[#FBF8F4] border-t border-[#EADFD3] space-y-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-[#7A6F6B]">
                        <span>Session length</span>
                        <span>{fmtDuration(totalDurationMinutes)}</span>
                      </div>
                      {totalSavings > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Deal savings</span>
                          <span>− AED {totalSavings.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="font-medium text-[#2A2022]">Total</span>
                        <span className="font-serif text-2xl font-semibold text-[#2A2022]">
                          AED {totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A6F6B]">Travel and equipment included.</p>
                    </div>
                    <button
                      type="button"
                      disabled={cta.disabled}
                      onClick={cta.onClick}
                      className="w-full h-12 rounded-full bg-[#B8434B] text-white font-medium hover:bg-[#9d363e] disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98] inline-flex items-center justify-center gap-2"
                    >
                      {isSubmitting && currentStep === 4 && (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {cta.label}
                      {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>

      {/* ================= MOBILE BOTTOM BAR ================= */}
      {currentStep < 5 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[#EADFD3] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto flex items-center gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#7A6F6B]">
                {selectedServiceIds.length} {selectedServiceIds.length === 1 ? "treatment" : "treatments"} ·{" "}
                {fmtDuration(totalDurationMinutes)}
              </p>
              <p className="font-serif text-xl font-semibold text-[#2A2022]">AED {totalPrice.toFixed(2)}</p>
            </div>
            <button
              type="button"
              disabled={cta.disabled}
              onClick={cta.onClick}
              className="ml-auto h-12 px-6 rounded-full bg-[#B8434B] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition inline-flex items-center gap-2"
            >
              {cta.label}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function BookingPageInner() {
  const searchParams = useSearchParams();
  const key = searchParams ? searchParams.toString() : "booking-root";
  return <BookingContent key={key} />;
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF8F4] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#B8434B] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingPageInner />
    </Suspense>
  );
}