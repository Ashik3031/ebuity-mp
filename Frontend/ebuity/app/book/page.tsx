"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import {
  serviceCategoryApi,
  serviceApi,
  packageApi,
  serviceZoneApi,
  addressApi,
  bookingApi,
  ZoneValidationResponse,
  Booking,
} from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Service, ServiceCategory, ServiceZone } from "../../types/service";
import { Package } from "../../types/package";
import { TimeSlot, SavedAddress } from "../../types/booking";
import { format12Hour } from "../../lib/booking-utils";
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  CalendarDays,
  Heart,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Pencil,
} from "lucide-react";
import { UAE_EMIRATES } from "../../lib/locations";

/* ---------- helpers ---------- */
const getPrice = (s: Service) =>
  s.isExclusiveDeal && s.dealPrice != null && Number(s.dealPrice) >= 0
    ? Number(s.dealPrice)
    : Number(s.price);

const isDealSvc = (s: Service) =>
  Boolean(s.isExclusiveDeal && s.dealPrice != null && Number(s.dealPrice) < Number(s.price));

const getMins = (s: Service) =>
  typeof s.duration === "number" && s.duration > 0
    ? s.duration
    : typeof s.durationMinutes === "number" && s.durationMinutes > 0
      ? s.durationMinutes
      : 60;

const catSlugOf = (s: Service): string => {
  if (typeof s.category === "string") return s.category;
  if (s.category && typeof s.category === "object") {
    return s.category.slug || s.category.name || "";
  }
  return "";
};

const fmtDuration = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m} min`;

const toLocalISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inputCls =
  "w-full h-12 sm:h-11 px-4 bg-white border border-[#EADFD3] rounded-xl text-base sm:text-sm text-[#1E293B] placeholder:text-[#64748B]/60 focus:outline-none focus:border-[#E11D74] focus:ring-4 focus:ring-[#E11D74]/10 transition";

const STEP_HEADERS: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Choose your treatments",
    subtitle: "Select one or more. Your total updates as you go.",
  },
  2: {
    title: "Where should we come?",
    subtitle: "Our therapists visit homes within active service areas.",
  },
  3: {
    title: "Select Date & Time",
    subtitle: "Booking for Women Only",
  },
  4: {
    title: "Review and confirm",
    subtitle: "Check the details below. You can edit any section.",
  },
  5: {
    title: "Booking Confirmed",
    subtitle: "We have received your appointment request.",
  },
};

function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-[#1E293B] mb-1">
        {label} {required && <span className="text-[#E11D74]">*</span>}
      </label>
      {children}
    </div>
  );
}

function getCategoryVisual(slug: string, name: string, image?: string | null) {
  if (image) {
    return <img src={image} alt={name} className="w-full h-full object-cover rounded-xl" />;
  }
  const s = (slug + " " + name).toLowerCase();
  if (s.includes("package") || s.includes("deal") || s.includes("combo")) {
    return (
      <div className="w-full h-full rounded-xl bg-[#FAF5FF] flex items-center justify-center text-[#7C3AED]">
        <Gift className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
      </div>
    );
  }
  if (s.includes("wax") || s.includes("thread")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("henna") || s.includes("mehndi")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("face") || s.includes("facial") || s.includes("skin") || s.includes("brow") || s.includes("lash")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("pedicure") || s.includes("feet") || s.includes("foot")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("nail") || s.includes("mani") || s.includes("polish")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("hair")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  if (s.includes("body") || s.includes("massage") || s.includes("spa") || s.includes("hammam") || s.includes("salon")) {
    return (
      <img
        src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=300&q=80"
        alt={name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }
  return (
    <div className="w-full h-full rounded-xl bg-[#FAF5FF] flex items-center justify-center text-[#7C3AED]">
      <Gift className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
    </div>
  );
}

/* ==================================================================== */
/* MAIN COMPONENT                                                       */
/* ==================================================================== */
function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const preselectedSlug = searchParams?.get("service");
  const packageSlug = searchParams?.get("package");
  const categoryParam = searchParams?.get("category");

  // Step state (1: Services, 2: Address, 3: Date & Time, 4: Review, 5: Confirmation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data states
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);

  // Selection
  const [selectedCategory, setSelectedCategory] = useState<string>("packages");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  // Address
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    email: "",
    unitNumber: "",
    buildingName: "",
    street: "",
    area: "",
    city: "Dubai",
    state: "Dubai",
    accessInstructions: "",
    saveToProfile: false,
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  // Zone validation
  const [validatingZone, setValidatingZone] = useState<boolean>(false);
  const [zoneValidation, setZoneValidation] = useState<ZoneValidationResponse | null>(null);

  // Date & Time
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalISO(new Date()));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Confirmation / submission
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const useNewAddress = !isAuthenticated || savedAddresses.length === 0 || isAddingNewAddress;

  const goTo = (step: number) => {
    setCurrentStep(step);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ---------- initial fetch ---------- */
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setServicesLoading(true);
        const [catRes, srvRes, pkgRes, zoneRes] = await Promise.all([
          serviceCategoryApi.getAll(),
          serviceApi.getAll({ limit: 200 }),
          packageApi.getAll().catch(() => ({ packages: [] })),
          serviceZoneApi.getAll().catch(() => ({ zones: [] })),
        ]);

        if (!isMounted) return;

        const allSrvs: Service[] = srvRes.services || [];
        const allPkgs: Package[] = pkgRes?.packages || [];

        setPackages(allPkgs);
        setServices(allSrvs);
        if (catRes.categories) setCategories(catRes.categories);
        if (zoneRes?.zones) setServiceZones(zoneRes.zones);

        if (preselectedSlug && srvRes.services) {
          const matched = srvRes.services.find(
            (s: Service) => s.slug === preselectedSlug
          );
          if (matched) {
            setSelectedServiceIds([matched._id]);
            const cSlug = catSlugOf(matched);
            if (cSlug) setSelectedCategory(cSlug);
            setCurrentStep(1);
            setConfirmedBooking(null);
          }
        } else if (packageSlug) {
          setSelectedCategory("packages");
          try {
            const pkgResSingle = await packageApi.getBySlug(packageSlug);
            if (isMounted && pkgResSingle.success && pkgResSingle.package) {
              const p = pkgResSingle.package;
              setSelectedPackageIds([p._id]);
              const sIds = (p.services || [])
                .map((s: any) => (typeof s === "string" ? s : s._id))
                .filter(Boolean);
              if (sIds.length > 0) {
                setSelectedServiceIds(sIds);
              }
              setCurrentStep(1);
              setConfirmedBooking(null);
            }
          } catch (e) {
            console.error("Failed to load package for booking:", e);
          }
        } else if (categoryParam) {
          setSelectedCategory(categoryParam);
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
  }, [preselectedSlug, packageSlug, categoryParam]);

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

  /* ---------- derived state ---------- */
  const selectedPackages = useMemo(
    () => packages.filter((p) => selectedPackageIds.includes(p._id)),
    [packages, selectedPackageIds]
  );

  const selectedPackage = selectedPackages[0] || null;

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s._id)),
    [services, selectedServiceIds]
  );

  const totalDurationMinutes = useMemo(() => {
    const pkgMins = selectedPackages.reduce(
      (sum, p) => sum + Number(p.durationMinutes || 90),
      0
    );
    const svcMins = selectedServices.reduce((sum, s) => sum + getMins(s), 0);
    return pkgMins + svcMins;
  }, [selectedPackages, selectedServices]);

  const totalPrice = useMemo(() => {
    const pkgPrice = selectedPackages.reduce(
      (sum, p) => sum + Number(p.price || 0),
      0
    );
    const svcPrice = selectedServices.reduce((sum, s) => sum + getPrice(s), 0);
    return pkgPrice + svcPrice;
  }, [selectedPackages, selectedServices]);

  const toggleService = useCallback((id: string) => {
    // Allows selecting individual services alongside packages
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      if (
        selectedCategory &&
        selectedCategory !== "all" &&
        catSlugOf(srv)?.toLowerCase() !== selectedCategory.toLowerCase()
      )
        return false;
      return true;
    });
  }, [services, selectedCategory]);

  const filteredPackages = useMemo(() => packages, [packages]);

  const isPackageSelected = useCallback(
    (pkg: Package) => selectedPackageIds.includes(pkg._id),
    [selectedPackageIds]
  );

  const togglePackage = useCallback((pkg: Package) => {
    // Allows selecting packages alongside other services or multiple packages
    setSelectedPackageIds((prev) =>
      prev.includes(pkg._id) ? prev.filter((id) => id !== pkg._id) : [...prev, pkg._id]
    );
  }, []);

  /* ---------- Calendar helpers ---------- */
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);

  const canGoPrevMonth = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    return (
      y > currentYearMonth.year ||
      (y === currentYearMonth.year && m > currentYearMonth.month)
    );
  }, [calendarMonth, currentYearMonth]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isNextMonth?: boolean;
    }> = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      days.push({
        dateStr: toLocalISO(prevDate),
        dayNum,
        isCurrentMonth: false,
        isPast: true,
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(year, month, d);
      curDate.setHours(0, 0, 0, 0);
      const dateStr = toLocalISO(curDate);
      const isPast = curDate.getTime() < today.getTime();

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPast,
      });
    }

    // Leading days of next month
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nextDate = new Date(year, month + 1, n);
      days.push({
        dateStr: toLocalISO(nextDate),
        dayNum: n,
        isCurrentMonth: false,
        isPast: false,
        isNextMonth: true,
      });
    }

    return days;
  }, [calendarMonth]);

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
      const area = useNewAddress
        ? newAddress.area
        : savedAddresses.find((x) => x._id === selectedAddressId)?.area;
      const city = useNewAddress
        ? newAddress.city
        : savedAddresses.find((x) => x._id === selectedAddressId)?.city;
      const addrId = useNewAddress ? undefined : selectedAddressId;

      if (!area && !addrId) {
        setZoneValidation(null);
        return;
      }
      try {
        setValidatingZone(true);
        const res = await bookingApi.validateZone({
          area: area || undefined,
          city: city || undefined,
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

  /* ---------- slots fetch ---------- */
  useEffect(() => {
    let isMounted = true;
    if (selectedDate && totalDurationMinutes > 0) {
      setSlotsLoading(true);
      bookingApi
        .getAvailability({
          date: selectedDate,
          duration: totalDurationMinutes,
          serviceIds:
            selectedServiceIds.length > 0
              ? selectedServiceIds
              : services[0]
                ? [services[0]._id]
                : [],
        })
        .then((res) => {
          if (!isMounted) return;
          const list = res.slots || [];
          setSlots(list);
          setSelectedSlot((prev: TimeSlot | null) =>
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
  }, [selectedDate, totalDurationMinutes, selectedServiceIds, services]);

  const effectiveSlots = useMemo<TimeSlot[]>(() => {
    if (slots.length > 0) return slots;

    const times = [
      "16:25", "16:30", "16:35", "16:40", "16:45", "16:50",
      "16:55", "17:00", "17:05", "17:10", "17:15", "17:20",
      "17:25", "17:30", "17:35", "17:40", "17:45", "17:50",
      "17:55", "18:00", "18:05", "18:10", "18:15", "18:20",
      "18:25", "18:30", "18:35", "18:40", "18:45", "18:50",
      "18:55", "19:00", "19:05", "19:10", "19:15", "19:20",
      "19:25", "19:30", "19:35", "19:40", "19:45", "19:50",
      "19:55", "20:00", "20:05", "20:10", "20:15", "20:20",
      "20:25", "20:30", "20:35", "20:40", "20:45", "20:50",
      "20:55", "21:00", "21:05", "21:10", "21:15", "21:20",
      "21:25", "21:30", "21:35", "21:40", "21:45", "21:50",
      "21:55", "22:00",
    ];

    return times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const endMins = h * 60 + m + (totalDurationMinutes || 60);
      const endH = String(Math.floor(endMins / 60) % 24).padStart(2, "0");
      const endM = String(endMins % 60).padStart(2, "0");
      return {
        time: t,
        endTime: `${endH}:${endM}`,
        startTime: `${selectedDate || "2026-11-06"}T${t}:00.000Z`,
        isAvailable: true,
        period: h < 12 ? "morning" : h < 17 ? "afternoon" : "evening",
      };
    });
  }, [slots, totalDurationMinutes, selectedDate]);

  /* ---------- navigation & validation ---------- */
  const handleNextFromAddress = () => {
    setAddressError(null);
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
      setAddressError("Choose a saved address or enter your location.");
      return;
    }
    goTo(3);
  };

  const handleConfirmBooking = async () => {
    try {
      setIsSubmitting(true);
      setBookingError(null);
      const pkgSrvIds = selectedPackages.flatMap((pkg) =>
        (pkg.services || []).map((s: any) => (typeof s === "string" ? s : s?._id)).filter(Boolean)
      );

      const allServiceIds = Array.from(new Set([...pkgSrvIds, ...selectedServiceIds]));

      const pkgNotes = selectedPackages.map((p) => `[Package: ${p.name}]`).join(" ");
      const combinedNotes = [pkgNotes, specialRequests].filter(Boolean).join(" ").trim();

      const payload = {
        serviceIds:
          allServiceIds.length > 0
            ? allServiceIds
            : services[0]
              ? [services[0]._id]
              : [],
        packageId: selectedPackages[0]?._id,
        scheduledDate: selectedDate,
        scheduledTime: selectedSlot?.time || "16:25",
        specialRequests: combinedNotes || specialRequests,
        ...(useNewAddress
          ? {
            address: {
              label: newAddress.label,
              fullName: newAddress.fullName,
              phone: newAddress.phone,
              email: newAddress.email,
              unitNumber: newAddress.unitNumber,
              buildingName: newAddress.buildingName,
              street: newAddress.street,
              area: newAddress.area,
              city: newAddress.city,
              state: newAddress.state,
              accessInstructions: newAddress.accessInstructions,
            },
            saveAddress: newAddress.saveToProfile,
          }
          : { addressId: selectedAddressId }),
      };

      const res = await bookingApi.create(payload as any);
      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        setCurrentStep(5);
      } else {
        setBookingError(res.message || "Could not confirm booking. Please try again.");
      }
    } catch (err: any) {
      setBookingError(
        err?.response?.data?.message || err?.message || "Failed to confirm booking."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewBooking = () => {
    setSelectedServiceIds([]);
    setSelectedPackageIds([]);
    setSelectedSlot(null);
    setConfirmedBooking(null);
    setBookingError(null);
    setCurrentStep(1);
    router.push("/book");
  };

  /* ---------- address summary ---------- */
  const addressText = (() => {
    if (useNewAddress) {
      return [newAddress.unitNumber, newAddress.buildingName, newAddress.area, newAddress.city]
        .filter(Boolean)
        .join(", ");
    }
    const a = savedAddresses.find((x) => x._id === selectedAddressId);
    if (!a) return "";
    return [a.unitNumber, a.buildingName, a.area, a.city].filter(Boolean).join(", ");
  })();

  const addressRecipient = (() => {
    if (useNewAddress) {
      return [newAddress.fullName?.trim(), newAddress.phone?.trim()].filter(Boolean).join(" · ");
    }
    const a = savedAddresses.find((x) => x._id === selectedAddressId);
    if (!a) return "";
    return [a.fullName, a.phone].filter(Boolean).join(" · ");
  })();

  const prettyDate = (iso: string, long = false) =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
        weekday: long ? "long" : "short",
        month: long ? "long" : "short",
        day: "numeric",
      })
      : "";

  /* ---------- primary CTA per step ---------- */
  const cta = (() => {
    if (currentStep === 1)
      return {
        label: "Continue to address",
        disabled: selectedServiceIds.length === 0 && selectedPackageIds.length === 0,
        onClick: () => goTo(2),
      };
    if (currentStep === 2)
      return { label: "Continue to date & time", disabled: false, onClick: handleNextFromAddress };
    if (currentStep === 3)
      return {
        label: "Review booking",
        disabled: !selectedDate || !selectedSlot || !selectedSlot.isAvailable,
        onClick: () => goTo(4),
      };
    return {
      label: isSubmitting ? "Confirming…" : "Confirm booking",
      disabled: isSubmitting || !selectedDate || !selectedSlot || !selectedSlot.isAvailable,
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
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="w-4 h-4 mt-0.5 text-[#E11D74] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#64748B]">{label}</p>
        <p className={`text-sm ${value ? "text-[#1E293B] font-medium" : "text-[#64748B]/70"}`}>
          {value || "Not chosen yet"}
        </p>
      </div>
      {value && currentStep !== step && currentStep < 5 && (
        <button
          type="button"
          onClick={() => goTo(step)}
          className="text-xs text-[#E11D74] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );

  /* ---------- UI RENDER ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5FA] w-full max-w-full overflow-x-hidden">
      <Header />

      <main className="flex-1 w-full max-w-full min-w-0 pb-36 sm:pb-40 lg:pb-16 pt-3 sm:pt-5">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
          {/* App-like Top Bar with Step Progress */}
          {currentStep < 5 && (
            <div className="mb-3 sm:mb-5 w-full min-w-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => goTo(currentStep - 1)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1E293B] hover:text-[#E11D74] transition -ml-1 py-1 px-2 rounded-lg hover:bg-black/5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Back</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] bg-[#FAF5FF] px-2.5 py-0.5 rounded-full border border-[#DDD5EA]">
                    Step {currentStep} of 4
                  </span>
                )}

                {currentStep > 1 && (
                  <span className="text-xs font-semibold text-[#64748B]">
                    Step {currentStep} of 4
                  </span>
                )}
              </div>

              {/* Visual 4-Segment Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5 w-full">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`h-1.5 rounded-full transition-all duration-300 ${stepNum <= currentStep ? "bg-[#E11D74]" : "bg-[#E8E2EE]"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ================= STEP 1: CHOOSE TREATMENTS ================= */}
          {currentStep === 1 && (
            <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-5">
              {/* Category Icons Row (Smooth Horizontal Scrolling, Zero Page Overflow, Never Cut-Off on Mobile) */}
              <div className="w-full max-w-full min-w-0 flex items-start gap-3 sm:gap-4 overflow-x-auto pb-2 pt-0.5 px-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                {/* Packages Tile */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("packages")}
                  className="w-[74px] sm:w-[88px] min-w-[74px] sm:min-w-[88px] shrink-0 flex flex-col items-center justify-start gap-1.5 group cursor-pointer focus:outline-none active:scale-95 transition-transform"
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border flex items-center justify-center p-2 transition-all ${selectedCategory === "packages"
                      ? "border-2 border-[#7C3AED] shadow-sm ring-2 ring-[#7C3AED]/20"
                      : "border-[#E8E2EE] hover:border-[#7C3AED]/40"
                      }`}
                  >
                    {getCategoryVisual("packages", "Packages")}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-medium text-center line-clamp-2 leading-tight break-words w-full h-7 sm:h-8 flex items-start justify-center ${selectedCategory === "packages"
                      ? "text-[#1E293B] font-semibold"
                      : "text-[#64748B] group-hover:text-[#1E293B]"
                      }`}
                  >
                    Packages
                  </span>
                </button>

                {/* Individual Service Categories */}
                {categories.map((c) => {
                  const active =
                    selectedCategory.toLowerCase() === c.slug.toLowerCase() ||
                    selectedCategory.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c._id || c.slug}
                      type="button"
                      onClick={() => setSelectedCategory(c.slug)}
                      className="w-[74px] sm:w-[88px] min-w-[74px] sm:min-w-[88px] shrink-0 flex flex-col items-center justify-start gap-1.5 group cursor-pointer focus:outline-none active:scale-95 transition-transform"
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border flex items-center justify-center p-1.5 transition-all overflow-hidden ${active
                          ? "border-2 border-[#7C3AED] shadow-sm ring-2 ring-[#7C3AED]/20"
                          : "border-[#E8E2EE] hover:border-[#7C3AED]/40"
                          }`}
                      >
                        {getCategoryVisual(c.slug, c.name, c.image)}
                      </div>
                      <span
                        title={c.name}
                        className={`text-[11px] sm:text-xs font-medium text-center line-clamp-2 leading-tight break-words w-full h-7 sm:h-8 flex items-start justify-center ${active
                          ? "text-[#1E293B] font-semibold"
                          : "text-[#64748B] group-hover:text-[#1E293B]"
                          }`}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grid: Left Treatments / Right Sidebar */}
              <div className="grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] gap-6 sm:gap-8 items-start">
                {/* Left Treatments List */}
                <div className="w-full max-w-full min-w-0 space-y-3">
                  {servicesLoading ? (
                    <div className="space-y-2.5 w-full">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-16 rounded-2xl bg-white border border-[#E5DFEB] animate-pulse w-full"
                        />
                      ))}
                    </div>
                  ) : selectedCategory === "packages" ? (
                    filteredPackages.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-2xl border border-[#E5DFEB] w-full">
                        <p className="font-semibold text-base text-[#1E293B]">No packages currently available</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 w-full max-w-full min-w-0">
                        {filteredPackages.map((pkg) => {
                          const isSel = isPackageSelected(pkg);
                          return (
                            <div
                              key={pkg._id}
                              role="button"
                              tabIndex={0}
                              aria-pressed={isSel}
                              onClick={() => togglePackage(pkg)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  togglePackage(pkg);
                                }
                              }}
                              className={`w-full max-w-full min-w-0 box-border cursor-pointer rounded-2xl bg-white p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 border transition-all focus:outline-none ${isSel
                                ? "border-[#E11D74] bg-[#FAF8FC] shadow-2xs"
                                : "border-[#E5DFEB] hover:border-[#7C3AED]/40"
                                }`}
                            >
                              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                {isSel ? (
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E11D74] border border-[#E11D74] text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-[#D9D0E3] bg-[#F7F2FA] shrink-0 flex items-center justify-center text-[#7C3AED]">
                                    <Plus className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-sm sm:text-[15px] text-[#1E293B] leading-snug line-clamp-2 sm:truncate break-words">
                                    {pkg.name}
                                  </h3>
                                  <p className="text-xs sm:text-[13px] text-[#64748B] mt-0.5 font-normal">
                                    {pkg.durationMinutes || 90} Mins
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 pl-2">
                                {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                                  <p className="text-xs text-[#94A3B8] line-through font-normal whitespace-nowrap">
                                    AED {pkg.originalPrice}
                                  </p>
                                )}
                                <p className="text-sm sm:text-[15px] font-bold text-[#1E293B] whitespace-nowrap">
                                  AED {pkg.price}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : filteredServices.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-[#E5DFEB] w-full">
                      <p className="font-semibold text-base text-[#1E293B]">No treatments match this category</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 w-full max-w-full min-w-0">
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
                            className={`w-full max-w-full min-w-0 box-border cursor-pointer rounded-2xl bg-white p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 border transition-all focus:outline-none ${selected
                              ? "border-[#E11D74] bg-[#FAF8FC] shadow-2xs"
                              : "border-[#E5DFEB] hover:border-[#7C3AED]/40"
                              }`}
                          >
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                              {selected ? (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E11D74] border border-[#E11D74] text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-[#D9D0E3] bg-[#F7F2FA] shrink-0 flex items-center justify-center text-[#7C3AED]">
                                  <Plus className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-sm sm:text-[15px] text-[#1E293B] leading-snug line-clamp-2 sm:truncate break-words">
                                  {srv.name}
                                </h3>
                                <p className="text-xs sm:text-[13px] text-[#64748B] mt-0.5 font-normal">
                                  {getMins(srv)} Mins
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0 pl-2">
                              {deal && (
                                <p className="text-xs text-[#94A3B8] line-through font-normal whitespace-nowrap">
                                  AED {srv.price}
                                </p>
                              )}
                              <p className="text-sm sm:text-[15px] font-bold text-[#1E293B] whitespace-nowrap">
                                AED {getPrice(srv)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Rose Essence Booking Sidebar (Desktop Only) */}
                <aside className="hidden lg:block sticky top-6">
                  <div className="bg-[#F5F3F8] rounded-2xl sm:rounded-3xl border border-[#E8E2EE] p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-[#1E293B]">Rose Essence Booking</h3>
                    </div>

                    {selectedServices.length === 0 && selectedPackages.length === 0 ? (
                      <div className="py-7 text-center bg-white rounded-xl border border-[#E8E2EE] p-4">
                        <p className="text-xs text-[#64748B]">Add a treatment or package to view your booking summary.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-[#E8E2EE] p-4 space-y-3 max-h-[340px] overflow-y-auto">
                        {/* Selected Packages */}
                        {selectedPackages.map((pkg) => (
                          <div
                            key={pkg._id}
                            className="flex items-start justify-between gap-3 text-xs pb-2.5 last:pb-0 border-b border-[#E8E2EE]/60 last:border-0"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-[#FAF5FF] text-[#7C3AED] border border-[#DDD5EA]">
                                  Package
                                </span>
                                <p className="font-semibold text-[#1E293B] text-sm truncate">
                                  {pkg.name}
                                </p>
                              </div>
                              <p className="text-xs text-[#64748B] mt-0.5">
                                {pkg.durationMinutes || 90} Mins · Specialist : Rose Essence
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm text-[#1E293B]">
                                AED {pkg.price.toFixed(2)}
                              </p>
                              {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                                <p className="text-xs text-[#94A3B8] line-through">
                                  AED {pkg.originalPrice.toFixed(2)}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => togglePackage(pkg)}
                                className="text-xs text-[#E11D74] hover:underline mt-1 block ml-auto cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Selected Services */}
                        {selectedServices.map((s) => (
                          <div
                            key={s._id}
                            className="flex items-start justify-between gap-3 text-xs pb-2.5 last:pb-0 border-b border-[#E8E2EE]/60 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1E293B] text-sm truncate">
                                {s.name}{" "}
                                <span className="text-xs text-[#64748B] font-normal">
                                  {getMins(s)} Mins
                                </span>
                              </p>
                              <p className="text-xs text-[#64748B] mt-0.5">Specialist : Rose Essence</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm text-[#1E293B]">
                                AED {getPrice(s).toFixed(2)}
                              </p>
                              {isDealSvc(s) && (
                                <p className="text-xs text-[#94A3B8] line-through">
                                  AED {Number(s.price).toFixed(2)}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleService(s._id)}
                                aria-label={`Remove ${s.name}`}
                                className="text-xs text-[#E11D74] hover:underline mt-1 block ml-auto cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-baseline justify-between border-t border-[#E8E2EE]">
                      <span className="font-bold text-sm text-[#1E293B]">Total</span>
                      <span className="font-bold text-lg text-[#1E293B]">
                        AED {totalPrice.toFixed(0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={cta.disabled}
                      onClick={cta.onClick}
                      className="w-full h-11 rounded-lg bg-[#E11D74] hover:bg-[#c91866] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* ================= STEP 2: ADDRESS ================= */}
          {currentStep === 2 && (
            <div className="grid lg:grid-cols-[1fr_360px] gap-6 sm:gap-8 items-start">
              <div className="w-full max-w-full min-w-0 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E293B] hover:bg-white transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg sm:text-xl text-[#1E293B]">Where should we come?</h2>
                    <p className="text-xs sm:text-sm text-[#64748B]">Our therapists visit homes within active service areas.</p>
                  </div>
                </div>

                {isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-[#1E293B]">Saved addresses</h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E11D74] hover:underline cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add new address
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const sel = selectedAddressId === addr._id;
                        return (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => setSelectedAddressId(addr._id)}
                            className={`p-4 rounded-2xl border text-left transition relative cursor-pointer ${sel
                              ? "border-[#E11D74] bg-[#FAF8FC] ring-2 ring-[#E11D74]/15"
                              : "border-[#E8E2EE] bg-white hover:border-[#CF565D]/30"
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#E11D74]" />
                                {addr.label || "Address"}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF5FF] text-[#7C3AED] border border-[#DDD5EA]">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#1E293B] font-medium leading-snug">
                              {addr.unitNumber}, {addr.buildingName}
                            </p>
                            <p className="text-xs text-[#64748B] mt-0.5">
                              {addr.area}, {addr.city}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New address form */}
                {(useNewAddress || isAddingNewAddress) && (
                  <div className="bg-white rounded-2xl border border-[#E8E2EE] p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8E2EE]">
                      <h3 className="font-semibold text-sm text-[#1E293B]">
                        {isAddingNewAddress ? "Add new address" : "Service location"}
                      </h3>
                      {isAuthenticated && savedAddresses.length > 0 && isAddingNewAddress && (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(false)}
                          className="text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                        >
                          Use saved address
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <Field label="Emirate" required>
                        <select
                          className={inputCls}
                          value={newAddress.city}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              city: e.target.value,
                              area: "",
                            })
                          }
                        >
                          {UAE_EMIRATES.map((em) => (
                            <option key={em} value={em}>
                              {em}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Service Area / Community" required>
                        <input
                          className={inputCls}
                          list="area-suggestions"
                          value={newAddress.area}
                          onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                          placeholder="e.g. Dubai Marina, Downtown, JVC"
                        />
                        <datalist id="area-suggestions">
                          {availableLocationsForEmirate.map((loc) => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </Field>

                      <Field label="Apartment / Villa Number" required>
                        <input
                          className={inputCls}
                          value={newAddress.unitNumber}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, unitNumber: e.target.value })
                          }
                          placeholder="Apt 402, Villa 12"
                        />
                      </Field>

                      <Field label="Building / Compound Name" required>
                        <input
                          className={inputCls}
                          value={newAddress.buildingName}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, buildingName: e.target.value })
                          }
                          placeholder="e.g. Princess Tower, Springs 4"
                        />
                      </Field>

                      <Field label="Street / Landmark (optional)">
                        <input
                          className={inputCls}
                          value={newAddress.street}
                          onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                          placeholder="Street 14, Near Spinneys"
                        />
                      </Field>

                      <Field label="Contact Name" required>
                        <input
                          className={inputCls}
                          value={newAddress.fullName}
                          onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                          placeholder="Your full name"
                        />
                      </Field>

                      <Field label="Mobile Phone" required>
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
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, accessInstructions: e.target.value })
                          }
                          placeholder="Gate code, parking, intercom"
                        />
                      </Field>
                    </div>

                    {isAuthenticated && (
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#64748B]">
                        <input
                          type="checkbox"
                          checked={newAddress.saveToProfile}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, saveToProfile: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-[#E8E2EE] text-[#E11D74] focus:ring-[#E11D74]"
                        />
                        Save this address for next time
                      </label>
                    )}
                  </div>
                )}

                {addressError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {addressError}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block sticky top-6">
                <div className="bg-[#F5F3F8] rounded-2xl sm:rounded-3xl border border-[#E8E2EE] p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-[#1E293B]">Rose Essence Booking</h3>
                  </div>
                  <div className="pt-2 flex items-baseline justify-between border-t border-[#E8E2EE]">
                    <span className="font-bold text-sm text-[#1E293B]">Total</span>
                    <span className="font-bold text-lg text-[#1E293B]">
                      AED {totalPrice.toFixed(0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextFromAddress}
                    className="w-full h-11 rounded-lg bg-[#E11D74] hover:bg-[#c91866] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to date & time</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* ================= STEP 3: SELECT DATE & TIME ================= */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl border border-[#E8E2EE] p-5 sm:p-8 shadow-xs max-w-6xl mx-auto">
              {/* Header: Back Arrow, Lady Avatar, Select Date, Booking for Women Only */}
              <div className="flex items-center gap-3.5 mb-6">
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E293B] hover:bg-[#F5F3F8] transition cursor-pointer"
                  aria-label="Back to address"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="w-10 h-10 rounded-full bg-[#EAE4F5] flex items-center justify-center text-[#7C3AED] shrink-0">
                  <svg
                    className="w-5 h-5 text-[#7C3AED]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.2 4.6 3 5.8V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.2c1.8-1.2 3-3.3 3-5.8a7 7 0 0 0-7-7z" />
                    <path d="M9 10a1.5 1.5 0 0 0 3 0" />
                    <path d="M15 10a1.5 1.5 0 0 0-3 0" />
                    <path d="M9.5 14c1 .6 2 .6 3 0" />
                    <path d="M7 8c1-1 3-1.5 5-1.5s4 .5 5 1.5" />
                  </svg>
                </div>

                <div>
                  <h2 className="font-bold text-lg sm:text-xl text-[#1E293B] leading-tight">Select Date</h2>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Booking for Women Only</p>
                </div>
              </div>

              {/* Side-by-side Layout: Calendar on Left, 6-col Time Slots on Right (Aligned at Top) */}
              <div className="grid lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] gap-6 sm:gap-8 items-start">
                {/* Left Column: Calendar */}
                <div>
                  {/* Month Navigation Bar */}
                  <div className="bg-[#F5F3F8] rounded-lg py-2.5 px-4 flex items-center justify-between mb-4">
                    <button
                      type="button"
                      disabled={!canGoPrevMonth}
                      onClick={handlePrevMonth}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#1E293B] hover:bg-black/5 disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
                      aria-label="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-bold text-xs sm:text-sm tracking-wider uppercase text-[#1E293B]">
                      {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#1E293B] hover:bg-black/5 transition cursor-pointer"
                      aria-label="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Days of week */}
                  <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#64748B] mb-3">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {calendarDays.map((d, idx) => {
                      const isSelected = selectedDate === d.dateStr;
                      const isPast = d.isPast;
                      const isCurrentMonth = d.isCurrentMonth;

                      if (!isCurrentMonth && isPast) {
                        return (
                          <div
                            key={`${d.dateStr}-${idx}`}
                            className="h-9 sm:h-10 flex items-center justify-center text-xs text-[#CBD5E1] cursor-not-allowed select-none"
                          >
                            {d.dayNum}
                          </div>
                        );
                      }

                      if (isPast) {
                        return (
                          <div
                            key={`${d.dateStr}-${idx}`}
                            className="h-9 sm:h-10 flex items-center justify-center text-xs text-[#94A3B8] opacity-50 cursor-not-allowed select-none"
                          >
                            {d.dayNum}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={`${d.dateStr}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d.dateStr);
                            setSelectedSlot(null);
                          }}
                          className={`h-9 sm:h-10 w-full rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center select-none ${isSelected
                            ? "bg-[#7C3AED] text-white font-bold shadow-xs"
                            : isCurrentMonth
                              ? "text-[#1E293B] hover:bg-[#F5F3F8]"
                              : "text-[#94A3B8] hover:bg-[#F5F3F8]"
                            }`}
                        >
                          {d.dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Time Slots */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E2EE]">
                    <h3 className="font-bold text-sm text-[#1E293B] uppercase tracking-wider">
                      Available Times
                    </h3>
                    <span className="text-xs text-[#64748B]">
                      {prettyDate(selectedDate, true)}
                    </span>
                  </div>

                  {slotsLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {[...Array(18)].map((_, i) => (
                        <div
                          key={i}
                          className="h-10 rounded-lg bg-[#F5F3F8] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : effectiveSlots.length === 0 ? (
                    <div className="py-8 text-center bg-[#F7F5FA] rounded-xl border border-[#E8E2EE]">
                      <p className="text-xs text-[#64748B]">No slots available for this date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {effectiveSlots.map((slot) => {
                        const isSel = selectedSlot?.time === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`h-10 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center border ${isSel
                              ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                              : slot.isAvailable
                                ? "bg-white text-[#1E293B] border-[#E8E2EE] hover:border-[#7C3AED]/40 hover:bg-[#FAF5FF]"
                                : "bg-[#F5F3F8] text-[#94A3B8] border-[#E8E2EE] opacity-50 cursor-not-allowed"
                              }`}
                          >
                            {format12Hour(slot.time)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E8E2EE]">
                    <div>
                      {selectedSlot ? (
                        <div>
                          <p className="text-xs text-[#64748B]">Selected appointment:</p>
                          <p className="font-bold text-sm text-[#1E293B]">
                            {prettyDate(selectedDate, true)} at {format12Hour(selectedSlot.time)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#64748B]">
                          Please pick a date and a time slot to continue
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedDate || !selectedSlot || !selectedSlot.isAvailable}
                      onClick={() => goTo(4)}
                      className="w-full sm:w-auto h-11 px-8 rounded-lg bg-[#E11D74] hover:bg-[#c91866] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: REVIEW & CONFIRM ================= */}
          {currentStep === 4 && (
            <div className="grid lg:grid-cols-[1fr_360px] gap-6 sm:gap-8 items-start">
              <div className="w-full max-w-full min-w-0 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => goTo(3)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E293B] hover:bg-white transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg sm:text-xl text-[#1E293B]">Review and confirm</h2>
                    <p className="text-xs sm:text-sm text-[#64748B]">
                      Check the details below. You can edit any section.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E8E2EE] p-5 sm:p-6 space-y-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#1E293B]">
                        Selected Services & Packages (
                        {selectedPackages.length + selectedServices.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => goTo(1)}
                        className="text-xs text-[#E11D74] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="divide-y divide-[#E8E2EE]">
                      {/* Packages */}
                      {selectedPackages.map((pkg) => (
                        <div
                          key={pkg._id}
                          className="py-2.5 flex items-start justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-[#FAF5FF] text-[#7C3AED] border border-[#DDD5EA]">
                                Package
                              </span>
                              <p className="font-semibold text-sm text-[#1E293B]">{pkg.name}</p>
                            </div>
                            <p className="text-xs text-[#64748B] mt-0.5">
                              {pkg.durationMinutes || 90} Mins · Complete Ritual
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#1E293B]">
                              AED {pkg.price.toFixed(2)}
                            </p>
                            {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                              <p className="text-xs text-[#94A3B8] line-through">
                                AED {pkg.originalPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Individual Services */}
                      {selectedServices.map((srv) => (
                        <div
                          key={srv._id}
                          className="py-2.5 flex items-start justify-between gap-4"
                        >
                          <div>
                            <p className="font-semibold text-sm text-[#1E293B]">{srv.name}</p>
                            <p className="text-xs text-[#64748B] mt-0.5">{getMins(srv)} Mins</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#1E293B]">AED {getPrice(srv).toFixed(2)}</p>
                            {isDealSvc(srv) && (
                              <p className="text-xs text-[#94A3B8] line-through">
                                AED {Number(srv.price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8E2EE] divide-y divide-[#E8E2EE]">
                    <SummaryRow
                      icon={MapPin}
                      label="Service Location"
                      value={addressText}
                      step={2}
                    />
                    <SummaryRow
                      icon={CalendarDays}
                      label="Appointment Time"
                      value={
                        selectedDate && selectedSlot
                          ? `${prettyDate(selectedDate, true)} at ${format12Hour(selectedSlot.time)}`
                          : ""
                      }
                      step={3}
                    />
                    <SummaryRow
                      icon={Heart}
                      label="Client details"
                      value={addressRecipient}
                      step={2}
                    />
                  </div>

                  <div className="pt-3 border-t border-[#E8E2EE]">
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      Special instructions or notes (optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full p-3 bg-white border border-[#E8E2EE] rounded-xl text-xs sm:text-sm text-[#1E293B] placeholder:text-[#64748B]/60 focus:outline-none focus:border-[#E11D74] focus:ring-4 focus:ring-[#E11D74]/10 transition"
                      placeholder="e.g. Any specific requests, pet at home, building access details..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                    />
                  </div>
                </div>

                {bookingError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {bookingError}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block sticky top-6">
                <div className="bg-[#F5F3F8] rounded-2xl sm:rounded-3xl border border-[#E8E2EE] p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-[#1E293B]">Rose Essence Booking</h3>
                  </div>
                  <div className="pt-2 flex items-baseline justify-between border-t border-[#E8E2EE]">
                    <span className="font-bold text-sm text-[#1E293B]">Total</span>
                    <span className="font-bold text-lg text-[#1E293B]">
                      AED {totalPrice.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Payment is collected in cash or card upon completion of service.
                  </p>
                  <button
                    type="button"
                    disabled={cta.disabled}
                    onClick={handleConfirmBooking}
                    className="w-full h-11 rounded-lg bg-[#E11D74] hover:bg-[#c91866] text-white text-sm font-semibold transition active:scale-[0.98] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Confirm booking</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* ================= STEP 5: CONFIRMATION ================= */}
          {currentStep === 5 && confirmedBooking && (
            <div className="max-w-xl mx-auto py-6 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1E293B]">You're booked</h2>
                <p className="text-sm text-[#64748B]">
                  Your therapist will arrive on {prettyDate(confirmedBooking.scheduledDate, true)}.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E2EE] p-5 text-left text-xs sm:text-sm divide-y divide-[#E8E2EE] shadow-xs">
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
                  <div key={k} className="py-2.5 flex justify-between gap-6">
                    <span className="text-[#64748B]">{k}</span>
                    <span className="font-medium text-[#1E293B] text-right">{v}</span>
                  </div>
                ))}
                <div className="pt-3 flex justify-between items-baseline">
                  <span className="font-semibold text-base text-[#1E293B]">Total</span>
                  <span className="font-bold text-xl text-[#1E293B]">
                    {confirmedBooking.currency} {confirmedBooking.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center pt-2">
                <a
                  href={`https://wa.me/971501234567?text=${encodeURIComponent(
                    `Hello Rose Essence, I have just booked an appointment (Ref: ${confirmedBooking.bookingNumber || ""
                    }) for ${confirmedBooking.scheduledDate || ""}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 px-6 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleStartNewBooking}
                  className="h-11 px-6 rounded-full bg-[#E11D74] hover:bg-[#c91866] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center transition shadow-xs active:scale-95 cursor-pointer"
                >
                  Book another treatment
                </button>

                {isAuthenticated && (
                  <Link
                    href="/my-bookings"
                    className="h-11 px-6 rounded-full bg-white border border-[#E8E2EE] text-[#1E293B] text-xs sm:text-sm font-medium inline-flex items-center justify-center hover:bg-[#F7F5FA] transition cursor-pointer"
                  >
                    View my bookings
                  </Link>
                )}

                <Link
                  href="/services"
                  className="h-11 px-6 rounded-full bg-white border border-[#E8E2EE] text-[#1E293B] text-xs sm:text-sm font-medium inline-flex items-center justify-center hover:bg-[#F7F5FA] transition cursor-pointer"
                >
                  Browse more treatments
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM BAR (ALL STEPS 1-4) ================= */}
      {currentStep < 5 && (
        <aside
          aria-label="Booking summary and navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E2EE] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] w-full max-w-full"
        >
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3 w-full min-w-0">
            <div className="min-w-0 flex-1">
              {currentStep === 1 && (
                <div className="flex flex-col justify-center min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-base sm:text-lg text-[#1E293B] leading-none">
                      AED {totalPrice.toFixed(0)}
                    </span>
                    {totalDurationMinutes > 0 && (
                      <span className="text-[11px] text-[#64748B] font-medium leading-none">
                        · {fmtDuration(totalDurationMinutes)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] font-medium truncate mt-0.5">
                    {[
                      selectedPackages.length > 0
                        ? `${selectedPackages.length} ${selectedPackages.length === 1 ? "Package" : "Packages"}`
                        : null,
                      selectedServices.length > 0
                        ? `${selectedServices.length} ${selectedServices.length === 1 ? "Treatment" : "Treatments"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" + ") || "0 Selected"}
                  </p>
                </div>
              )}
              {currentStep === 2 && (
                <div className="flex flex-col justify-center">
                  <p className="text-xs text-[#64748B] font-medium">Service Location</p>
                  <p className="font-bold text-sm text-[#1E293B] truncate max-w-[180px] leading-tight mt-0.5">
                    {useNewAddress
                      ? (newAddress.area || newAddress.city || "New Address")
                      : (savedAddresses.find((x) => x._id === selectedAddressId)?.area || "Saved Address")}
                  </p>
                </div>
              )}
              {currentStep === 3 && (
                <div className="flex flex-col justify-center">
                  <p className="text-xs text-[#64748B] font-medium truncate">
                    {selectedDate ? prettyDate(selectedDate, false) : "Choose Date"}
                  </p>
                  <p className="font-bold text-sm text-[#1E293B] truncate leading-tight mt-0.5">
                    {selectedSlot ? format12Hour(selectedSlot.time) : "Select Time Slot"}
                  </p>
                </div>
              )}
              {currentStep === 4 && (
                <div className="flex flex-col justify-center">
                  <p className="text-xs text-[#64748B] font-medium">Total Amount</p>
                  <p className="font-bold text-lg text-[#1E293B] leading-tight mt-0.5">
                    AED {totalPrice.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={cta.disabled}
              onClick={cta.onClick}
              className="h-11 px-5 sm:px-6 rounded-xl bg-[#E11D74] hover:bg-[#c91866] text-white text-xs sm:text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              {isSubmitting && currentStep === 4 ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{currentStep === 1 ? "Continue" : cta.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </aside>
      )}
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
        <div className="min-h-screen bg-[#F7F5FA] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E11D74] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingPageInner />
    </Suspense>
  );
}
