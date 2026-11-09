"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Check,
  CheckCheck,
  RotateCcw,
  User,
  Phone,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sun,
  Moon,
  Sunrise,
  Scissors,
  Flower2,
  Heart,
  Palette,
  Eye,
  Flame,
  Info,
} from "lucide-react";
import {
  serviceApi,
  serviceZoneApi,
  bookingApi,
  Service,
} from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";

// ============================================================================
// Types
// ============================================================================

interface ChatServiceOption {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text?: string;
  timestamp: string;
  type?: "text" | "service-picker" | "treatment-picker" | "location-picker" | "date-picker" | "time-picker" | "contact-form" | "summary-card" | "confirmation";
  categoryKey?: string;
}

// Preset Fallback Categories
const DEFAULT_CATEGORIES = [
  { key: "hair", name: "Hair Styling", icon: Scissors, samplePrice: "From AED 109" },
  { key: "manicure", name: "Manicure", icon: Sparkles, samplePrice: "From AED 109" },
  { key: "pedicure", name: "Pedicure", icon: Flower2, samplePrice: "From AED 130" },
  { key: "facial", name: "Facial & Skin", icon: Eye, samplePrice: "From AED 150" },
  { key: "waxing", name: "Waxing & Threading", icon: Flame, samplePrice: "From AED 59" },
  { key: "massage", name: "Massage & Body", icon: Heart, samplePrice: "From AED 120" },
  { key: "henna", name: "Henna Designs", icon: Palette, samplePrice: "From AED 120" },
];

// Pure, strictly separated preset treatments for each category
const PRESET_TREATMENTS: Record<string, ChatServiceOption[]> = {
  hair: [
    { id: "h1", name: "Blow Dry (Short & Medium)", category: "Hair Styling", price: 109, duration: 65 },
    { id: "h2", name: "Blow Dry with Curls", category: "Hair Styling", price: 129, duration: 85 },
    { id: "h3", name: "Hair Straightening", category: "Hair Styling", price: 169, duration: 65 },
    { id: "h4", name: "Blow Dry (Extra Long)", category: "Hair Styling", price: 149, duration: 85 },
    { id: "h5", name: "Blow Dry with Defined Curls", category: "Hair Styling", price: 200, duration: 60 },
  ],
  manicure: [
    { id: "m1", name: "Classic Manicure", category: "Manicure", price: 110, duration: 50 },
    { id: "m2", name: "Gel Polish Manicure", category: "Manicure", price: 199, duration: 70 },
    { id: "m3", name: "Polish-Free Manicure", category: "Manicure", price: 109, duration: 50 },
    { id: "m4", name: "Classic Polish Change (Hands)", category: "Manicure", price: 59, duration: 25 },
    { id: "m5", name: "Polish Manicure", category: "Manicure", price: 200, duration: 50 },
  ],
  pedicure: [
    { id: "p1", name: "Classic Pedicure", category: "Pedicure", price: 130, duration: 60 },
    { id: "p2", name: "Gel Polish Pedicure", category: "Pedicure", price: 189, duration: 80 },
    { id: "p3", name: "Polish-Free Pedicure", category: "Pedicure", price: 139, duration: 60 },
    { id: "p4", name: "Spa Pedicure with Callus Treatment", category: "Pedicure", price: 180, duration: 75 },
    { id: "p5", name: "Classic Polish Change (Feet)", category: "Pedicure", price: 59, duration: 25 },
  ],
  facial: [
    { id: "f1", name: "Herbal Facial", category: "Facial", price: 199, duration: 65 },
    { id: "f2", name: "Face Clean-Up Ritual", category: "Facial", price: 150, duration: 35 },
    { id: "f3", name: "Soothing Brightening & Glowing Facial", category: "Facial", price: 359, duration: 65 },
    { id: "f4", name: "Deep Cleansing Hydra Facial", category: "Facial", price: 299, duration: 60 },
  ],
  waxing: [
    { id: "w1", name: "Full Body Waxing with Brazilian", category: "Waxing", price: 570, duration: 140 },
    { id: "w2", name: "Full Body Waxing without Brazilian", category: "Waxing", price: 440, duration: 110 },
    { id: "w3", name: "Full Arm & Underarm Waxing", category: "Waxing", price: 110, duration: 35 },
    { id: "w4", name: "Half Leg Waxing", category: "Waxing", price: 99, duration: 25 },
    { id: "w5", name: "Eyebrow & Upper Lip Threading", category: "Waxing", price: 79, duration: 20 },
  ],
  massage: [
    { id: "msg1", name: "Head Tension Relief Massage", category: "Massage", price: 120, duration: 45 },
    { id: "msg2", name: "Neck & Shoulder Deep Relaxation", category: "Massage", price: 140, duration: 45 },
  ],
  henna: [
    { id: "hn1", name: "Fingers & Palm Cone Henna", category: "Henna", price: 120, duration: 40 },
    { id: "hn2", name: "Both Hands & Forearms Henna", category: "Henna", price: 220, duration: 75 },
    { id: "hn3", name: "Feet & Ankle Henna Design", category: "Henna", price: 150, duration: 45 },
    { id: "hn4", name: "Full Bridal Henna Ritual", category: "Henna", price: 450, duration: 120 },
  ],
};

const DEFAULT_LOCATIONS = [
  "Downtown Dubai",
  "Dubai Marina",
  "Palm Jumeirah",
  "Jumeirah (1, 2, 3)",
  "Business Bay",
  "Dubai Hills Estate",
  "Arabian Ranches",
  "DIFC",
];

const COMPREHENSIVE_TIME_SLOTS: Array<{ time: string; period: "morning" | "afternoon" | "evening" }> = [
  // Morning (10:00 AM - 12:00 PM)
  { time: "10:00 AM", period: "morning" },
  { time: "10:30 AM", period: "morning" },
  { time: "11:00 AM", period: "morning" },
  { time: "11:30 AM", period: "morning" },
  // Afternoon (12:00 PM - 05:00 PM)
  { time: "12:00 PM", period: "afternoon" },
  { time: "12:30 PM", period: "afternoon" },
  { time: "01:00 PM", period: "afternoon" },
  { time: "01:30 PM", period: "afternoon" },
  { time: "02:00 PM", period: "afternoon" },
  { time: "02:30 PM", period: "afternoon" },
  { time: "03:00 PM", period: "afternoon" },
  { time: "03:30 PM", period: "afternoon" },
  { time: "04:00 PM", period: "afternoon" },
  { time: "04:30 PM", period: "afternoon" },
  // Evening (05:00 PM - 10:00 PM)
  { time: "05:00 PM", period: "evening" },
  { time: "05:30 PM", period: "evening" },
  { time: "06:00 PM", period: "evening" },
  { time: "06:30 PM", period: "evening" },
  { time: "07:00 PM", period: "evening" },
  { time: "07:30 PM", period: "evening" },
  { time: "08:00 PM", period: "evening" },
  { time: "08:30 PM", period: "evening" },
  { time: "09:00 PM", period: "evening" },
  { time: "09:30 PM", period: "evening" },
  { time: "10:00 PM", period: "evening" },
];

/**
 * Strict category key matcher: prevents Henna from ever being categorized as Hair
 */
function classifyServiceCategory(serviceName: string, categoryName: string, categorySlug: string): string | null {
  const s = serviceName.toLowerCase();
  const c = categoryName.toLowerCase();
  const slug = categorySlug.toLowerCase();

  // 1. Henna (check FIRST so Henna never leaks into Hair or Body)
  if (slug.includes("henna") || c.includes("henna") || s.includes("henna")) {
    return "henna";
  }

  // 2. Hair Styling (blow dry, blowout, curls, hair straightening)
  if (
    slug.includes("hair") ||
    c.includes("hair") ||
    s.includes("blowdry") ||
    s.includes("blow dry") ||
    s.includes("blow-dry") ||
    s.includes("curls") ||
    s.includes("straightening") ||
    s.includes("haircut")
  ) {
    return "hair";
  }

  // 3. Manicure
  if (
    slug.includes("manicure") ||
    c.includes("manicure") ||
    (s.includes("manicure") && !s.includes("mani-pedi")) ||
    (s.includes("polish") && s.includes("hand"))
  ) {
    return "manicure";
  }

  // 4. Pedicure
  if (
    slug.includes("pedicure") ||
    c.includes("pedicure") ||
    s.includes("pedicure") ||
    (s.includes("polish") && (s.includes("feet") || s.includes("foot")))
  ) {
    return "pedicure";
  }

  // 5. Facial
  if (
    slug.includes("facial") ||
    c.includes("facial") ||
    s.includes("facial") ||
    s.includes("clean up") ||
    s.includes("clean-up")
  ) {
    return "facial";
  }

  // 6. Waxing & Threading
  if (
    slug.includes("wax") ||
    c.includes("wax") ||
    slug.includes("thread") ||
    c.includes("thread") ||
    s.includes("wax") ||
    s.includes("threading")
  ) {
    return "waxing";
  }

  // 7. Massage & Body
  if (
    slug.includes("massage") ||
    c.includes("massage") ||
    slug.includes("salon") ||
    c.includes("salon") ||
    s.includes("massage")
  ) {
    return "massage";
  }

  return null;
}

function BookingChatWidgetContent() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide widget in admin and staff portals
  const isBackOffice = pathname?.startsWith("/admin") || pathname?.startsWith("/staff");
  const hasStickyBottomCTA = pathname === "/book" || pathname === "/cart" || pathname === "/checkout";

  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Chat Data Selections
  const [selectedServices, setSelectedServices] = useState<ChatServiceOption[]>([]);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>("hair");
  const [serviceSelectionConfirmed, setServiceSelectionConfirmed] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Totals for multi-service selection
  const totalChatPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.price || 0), 0),
    [selectedServices]
  );
  const totalChatDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.duration || 60), 0),
    [selectedServices]
  );

  // Interactive Chat Calendar & Time Filter States
  const [chatCalendarMonth, setChatCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [chatTimeFilter, setChatTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");

  // Dynamic database lists
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [treatments, setTreatments] = useState<Record<string, ChatServiceOption[]>>(PRESET_TREATMENTS);
  const [dbServices, setDbServices] = useState<Service[]>([]);

  // Messages Thread
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Load real database services and locations with strict category grouping
  useEffect(() => {
    let isMounted = true;
    async function loadRealData() {
      try {
        const [zonesRes, servicesRes] = await Promise.allSettled([
          serviceZoneApi.getAll(),
          serviceApi.getAll({ limit: 100 }),
        ]);

        if (!isMounted) return;

        // Locations
        if (zonesRes.status === "fulfilled" && zonesRes.value?.zones) {
          const areaSet = new Set<string>();
          zonesRes.value.zones.forEach((z) => {
            if (z.isActive !== false) {
              if (z.name) areaSet.add(z.name);
              if (Array.isArray(z.supportedAreas)) {
                z.supportedAreas.forEach((a) => a && areaSet.add(a));
              }
            }
          });
          if (areaSet.size > 0) {
            setLocations(Array.from(areaSet).slice(0, 10));
          }
        }

        // Services with STRICT categorization
        if (servicesRes.status === "fulfilled" && servicesRes.value?.services) {
          const activeServices = servicesRes.value.services.filter(
            (s) => s.isActive !== false && s.active !== false
          );

          if (activeServices.length > 0) {
            setDbServices(activeServices);
            const mapped: Record<string, ChatServiceOption[]> = {
              hair: [],
              manicure: [],
              pedicure: [],
              facial: [],
              waxing: [],
              massage: [],
              henna: [],
            };

            activeServices.forEach((s) => {
              const catObj = typeof s.category === "object" ? s.category : null;
              const catName = catObj?.name || "";
              const catSlug = catObj?.slug || "";
              const sName = s.name || "";

              const targetKey = classifyServiceCategory(sName, catName, catSlug);

              // Push with REAL database _id
              if (targetKey && mapped[targetKey]) {
                mapped[targetKey].push({
                  id: s._id,
                  name: sName,
                  category: catName || targetKey,
                  price: s.isExclusiveDeal && s.dealPrice != null ? Number(s.dealPrice) : Number(s.price),
                  duration: s.durationMinutes || s.duration || 45,
                });
              }
            });

            // If any category had no DB services, fall back to presets for that category
            Object.keys(mapped).forEach((k) => {
              if (mapped[k].length === 0 && PRESET_TREATMENTS[k]) {
                mapped[k] = [...PRESET_TREATMENTS[k]];
              }
            });

            setTreatments(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not fetch dynamic live chat data:", err);
      }
    }
    loadRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Preload logged-in user profile name & phone if available
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.phone && !customerPhone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Initialize Conversation
  const initializeChat = () => {
    setSelectedServices([]);
    setActiveCategoryKey("hair");
    setServiceSelectionConfirmed(false);
    setSelectedLocation("");
    setSelectedDate("");
    setSelectedTime("");
    setContactSubmitted(false);
    setBookingConfirmed(false);
    setBookingReference("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages([
      {
        id: "msg-welcome-1",
        sender: "bot",
        text: "Hello! I am **Rose**, your at-home beauty booking assistant. 🌸",
        timestamp: timeStr,
      },
      {
        id: "msg-welcome-2",
        sender: "bot",
        text: "In just a few taps, we'll arrange a licensed female specialist to visit your home.\n\n**What service are you looking for today?**",
        timestamp: timeStr,
        type: "service-picker",
      },
    ]);
  };

  useEffect(() => {
    if (messages.length === 0) {
      initializeChat();
    }
  }, []);

  // Interactive Chat Calendar Logic
  const canGoPrevChatMonth = useMemo(() => {
    const today = new Date();
    return (
      chatCalendarMonth.getFullYear() > today.getFullYear() ||
      (chatCalendarMonth.getFullYear() === today.getFullYear() &&
        chatCalendarMonth.getMonth() > today.getMonth())
    );
  }, [chatCalendarMonth]);

  const handlePrevChatMonth = () => {
    if (!canGoPrevChatMonth) return;
    setChatCalendarMonth(
      new Date(chatCalendarMonth.getFullYear(), chatCalendarMonth.getMonth() - 1, 1)
    );
  };

  const handleNextChatMonth = () => {
    setChatCalendarMonth(
      new Date(chatCalendarMonth.getFullYear(), chatCalendarMonth.getMonth() + 1, 1)
    );
  };

  const chatCalendarDays = useMemo(() => {
    const year = chatCalendarMonth.getFullYear();
    const month = chatCalendarMonth.getMonth();

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
      isToday: boolean;
    }> = [];

    // Trailing previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const mm = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dd = String(dayNum).padStart(2, "0");
      days.push({
        dateStr: `${prevDate.getFullYear()}-${mm}-${dd}`,
        dayNum,
        isCurrentMonth: false,
        isPast: true,
        isToday: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(year, month, d);
      curDate.setHours(0, 0, 0, 0);
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;
      const isPast = curDate.getTime() < today.getTime();
      const isToday = curDate.getTime() === today.getTime();

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPast,
        isToday,
      });
    }

    // Trailing next month days to complete 7-column rows
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nextDate = new Date(year, month + 1, n);
      const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dd = String(n).padStart(2, "0");
      days.push({
        dateStr: `${nextDate.getFullYear()}-${mm}-${dd}`,
        dayNum: n,
        isCurrentMonth: false,
        isPast: false,
        isToday: false,
      });
    }

    return days;
  }, [chatCalendarMonth]);

  const getQuickDatePresets = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Upcoming Weekend (Friday or Saturday)
    const weekend = new Date(today);
    const dayOfWeek = today.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
    const daysUntilWeekend = (5 - dayOfWeek + 7) % 7 || 7;
    weekend.setDate(today.getDate() + daysUntilWeekend);

    const fmt = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    return [
      {
        badge: "Today",
        shortLabel: today.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        label: `Today, ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        dateVal: fmt(today),
      },
      {
        badge: "Tomorrow",
        shortLabel: tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        label: `Tomorrow, ${tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        dateVal: fmt(tomorrow),
      },
      {
        badge: "Weekend",
        shortLabel: weekend.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        label: weekend.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        dateVal: fmt(weekend),
      },
    ];
  };

  const handleSelectCalendarDate = (dStr: string) => {
    const [y, m, d] = dStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    handleSelectDate(dStr, formatted);
  };

  const displayedSlots = useMemo(() => {
    if (chatTimeFilter === "all") return COMPREHENSIVE_TIME_SLOTS;
    return COMPREHENSIVE_TIME_SLOTS.filter((s) => s.period === chatTimeFilter);
  }, [chatTimeFilter]);

  // Helper: Append bot reply with typing indicator
  const botReply = (nextMessage: Partial<ChatMessage>, delay = 400) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: "bot",
          timestamp: timeStr,
          ...nextMessage,
        },
      ]);
    }, delay);
  };

  // Step 1: User selected category -> bot displays specific treatments
  const handleSelectCategory = (catKey: string, catName: string) => {
    setActiveCategoryKey(catKey);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: `Category: ${catName}`,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Browse treatments for **${catName}** below. You can select multiple treatments across any category:`,
      type: "treatment-picker",
      categoryKey: catKey,
    });
  };

  // Toggle treatment selection (Multiple treatments allowed)
  const toggleTreatment = (service: ChatServiceOption) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id || s.name === service.name);
      if (exists) {
        return prev.filter((s) => s.id !== service.id && s.name !== service.name);
      } else {
        return [...prev, service];
      }
    });
  };

  // Step 2: Confirm selected treatments -> Move to Location
  const handleConfirmSelectedTreatments = () => {
    if (selectedServices.length === 0) return;
    setServiceSelectionConfirmed(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const names = selectedServices.map((s) => s.name).join(", ");
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: `Selected ${selectedServices.length} Treatment${selectedServices.length > 1 ? "s" : ""}: ${names} (AED ${totalChatPrice})`,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Excellent selection! You've chosen **${selectedServices.length} treatment${selectedServices.length > 1 ? "s" : ""}** (Total: **AED ${totalChatPrice}**, ~${totalChatDuration} mins).\n\n**Which location in Dubai do you prefer?**`,
      type: "location-picker",
    });
  };

  // Step 3: User selected location -> Ask for Date
  const handleSelectLocation = (loc: string) => {
    setSelectedLocation(loc);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: loc,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Specialists available in **${loc}**.\n\n**Select your preferred date:**`,
      type: "date-picker",
    });
  };

  // Step 4: User selected date -> Ask for Time Slot
  const handleSelectDate = (dateVal: string, dateLabel: string) => {
    setSelectedDate(dateVal);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: dateLabel,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Appointment for **${dateLabel}**.\n\n**Choose an available time slot:**`,
      type: "time-picker",
    });
  };

  // Step 5: User selected time slot -> Ask for Contact Details
  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: time,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Almost ready! Please enter your name and phone number for booking confirmation:`,
      type: "contact-form",
    });
  };

  // Convert 12-hour format ("02:30 PM") to 24-hour ("14:30")
  const convert12To24 = (time12: string): string => {
    if (!time12) return "12:00";
    if (/^\d{2}:\d{2}$/.test(time12.trim())) return time12.trim();
    const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  };

  // Step 6: User submitted contact details -> Show Summary Card & Confirmation question
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) return;

    setContactSubmitted(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: `${customerName.trim()} · ${customerPhone.trim()}`,
        timestamp: timeStr,
      },
    ]);

    botReply({
      text: `Thank you, ${customerName.trim()}! Here is your booking summary.\n\n**Would you like to confirm your booking?**`,
      type: "summary-card",
    });
  };

  // Step 7: Confirm Booking
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: "Yes, confirm my booking! ✨",
        timestamp: timeStr,
      },
    ]);

    // 1. Ensure we have database services loaded for valid ObjectId matching
    let allDbServices = dbServices;
    if (allDbServices.length === 0) {
      try {
        const fetched = await serviceApi.getAll({ limit: 200 });
        if (fetched?.services?.length) {
          allDbServices = fetched.services;
          setDbServices(fetched.services);
        }
      } catch (fErr) {
        console.warn("Could not fetch DB services on confirm:", fErr);
      }
    }

    // 2. Resolve real 24-character MongoDB ObjectIds for all selected services
    const finalServiceIds: string[] = [];
    for (const srv of selectedServices) {
      if (srv.id && /^[0-9a-fA-F]{24}$/.test(srv.id)) {
        finalServiceIds.push(srv.id);
      } else {
        const exactMatch = allDbServices.find(
          (s) => s.name?.toLowerCase().trim() === srv.name?.toLowerCase().trim()
        );
        if (exactMatch?._id) {
          finalServiceIds.push(exactMatch._id);
        } else {
          const partialMatch = allDbServices.find(
            (s) =>
              s.name?.toLowerCase().includes(srv.name?.toLowerCase() || "") ||
              srv.name?.toLowerCase().includes(s.name?.toLowerCase() || "")
          );
          if (partialMatch?._id) {
            finalServiceIds.push(partialMatch._id);
          }
        }
      }
    }

    // Fallback: If any service was not matched, pick first active DB service so creation succeeds in MongoDB
    if (finalServiceIds.length === 0 && allDbServices.length > 0) {
      finalServiceIds.push(allDbServices[0]._id);
    }

    const time24 = convert12To24(selectedTime || "12:00 PM");
    const serviceArea = selectedLocation || "Dubai Marina";
    const bookingDate = selectedDate || new Date().toISOString().split("T")[0];

    try {
      if (finalServiceIds.length === 0) {
        throw new Error("Please select at least one treatment from our active catalog.");
      }

      const res = await bookingApi.create({
        serviceIds: finalServiceIds,
        scheduledDate: bookingDate,
        scheduledTime: time24,
        isLiveChat: true,
        address: {
          fullName: customerName.trim() || "Live Chat Customer",
          phone: customerPhone.trim(),
          email: `${customerPhone.trim().replace(/[^0-9]/g, "") || Date.now()}@chat.ebuity.com`,
          unitNumber: "Residence",
          buildingName: selectedLocation ? `${selectedLocation} Tower` : "Dubai Residence",
          area: serviceArea,
          city: "Dubai",
          street: `${serviceArea}, Dubai`,
        },
        specialRequests: `[Booked via Live Chat Assistant]\nSelected Services: ${selectedServices.map((s) => s.name).join(", ")}`,
      });

      if (res?.success && res?.booking?.bookingNumber) {
        const realRef = res.booking.bookingNumber;
        setBookingReference(realRef);
        setIsSubmitting(false);
        setBookingConfirmed(true);

        botReply({
          text: `🎉 **Booking Confirmed!**\n\nYour official booking reference number is **#${realRef}**.\n\nA verified female specialist will arrive at your home in **${serviceArea}** on **${bookingDate}** at **${selectedTime}** for your ${selectedServices.length} treatment${selectedServices.length > 1 ? "s" : ""}.\n\nThis appointment is registered directly in our salon management system. Pay cash or card upon service completion.`,
          type: "confirmation",
        });
        return;
      } else {
        throw new Error(res?.message || "Booking creation was not confirmed by the salon server.");
      }
    } catch (err: any) {
      console.error("[BookingChatWidget] Real booking creation failed:", err);
      setIsSubmitting(false);

      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not submit booking to salon server. Please try a different slot or confirm directly via WhatsApp.";

      botReply({
        text: `⚠️ **Booking Notice:**\n${errorMsg}\n\nYou can click below to confirm instantly with our manager on WhatsApp:`,
        type: "summary-card",
      });
    }
  };

  // Helper: Open WhatsApp with pre-filled message
  const openWhatsAppConfirmation = () => {
    const servicesList = selectedServices
      .map((s) => `  • ${s.name} (AED ${s.price}, ~${s.duration || 60}m)`)
      .join("\n");

    const text = encodeURIComponent(
      `Hello Rose! 🌸 I would like to confirm my at-home beauty appointment:\n\n` +
      `• Ref: #${bookingReference || "RE-CHAT"}\n` +
      `• Treatments (${selectedServices.length}):\n${servicesList}\n` +
      `• Total Price: AED ${totalChatPrice}\n` +
      `• Total Duration: ~${totalChatDuration} mins\n` +
      `• Location: ${selectedLocation || "Dubai"}\n` +
      `• Date: ${selectedDate}\n` +
      `• Time: ${selectedTime}\n` +
      `• Name: ${customerName}\n` +
      `• Phone: ${customerPhone}`
    );
    window.open(`https://wa.me/971501234567?text=${text}`, "_blank");
  };

  if (isBackOffice) {
    return null;
  }

  return (
    <>
      {/* ==================================================================== */}
      {/* FLOATING LAUNCHER BUTTON                                            */}
      {/* ==================================================================== */}
      {!isOpen && (
        <div
          className={`fixed z-50 flex items-center gap-2 transition-all duration-300 ${hasStickyBottomCTA
            ? "hidden sm:flex sm:bottom-6 sm:right-6"
            : "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6"
            }`}
        >
          {/* Friendly floating speech bubble teaser on desktop */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#292525] border border-[#E8D8C8] shadow-md hover:shadow-lg hover:border-[#CF565D]/40 transition-all text-xs font-semibold group cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-[#292525]">Chat with <strong className="font-semibold text-[#CF565D]">Rose</strong></span>
            <span className="text-[#CF565D] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </button>

          {/* Main Floating Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#CF565D] to-[#B34351] hover:from-[#B34351] hover:to-[#9E3340] text-white shadow-[0_8px_20px_rgba(207,86,93,0.35)] hover:shadow-[0_12px_28px_rgba(207,86,93,0.48)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer overflow-hidden p-1.5"
            aria-label="Open Booking Assistant Rose"
          >
            {/* Online Green Pulsing Beacon */}
            <span className="absolute top-0.5 right-0.5 flex h-3 w-3 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
            </span>

            <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center">
              <Image
                src="/rose-essence-logo-square.jpg"
                alt="Rose Booking Assistant"
                width={48}
                height={48}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* WHATSAPP-STYLE LIVE CHAT WINDOW                                     */}
      {/* ==================================================================== */}
      {isOpen && (
        <div className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] sm:inset-auto sm:bottom-6 sm:right-6 w-auto sm:w-[400px] h-[590px] max-h-[calc(100dvh-2rem)] bg-[#FAF7F2] rounded-3xl border border-[#E8D8C8] shadow-[0_24px_60px_rgba(41,37,37,0.22)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* HEADER: Rose Assistant (Clean, Small, Elegant Font) */}
          <div className="bg-gradient-to-r from-[#CF565D] via-[#B8454C] to-[#9E3340] text-white px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/30 shrink-0 shadow-2xs bg-white">
                <Image
                  src="/rose-essence-logo-square.jpg"
                  alt="Rose"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold tracking-wide truncate flex items-center gap-1 leading-tight">
                  <span>Rose</span>
                </h3>
                <p className="text-[10px] text-white/80 font-medium flex items-center gap-1 leading-tight">
                  <span>Booking Assistant</span>
                  <span>•</span>
                  <span className="text-emerald-300">Online</span>
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={initializeChat}
                title="Restart conversation"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader: Trust Micro-Banner */}
          <div className="bg-[#F5DAD6]/40 border-b border-[#E8D8C8]/60 px-3.5 py-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-[#746D69] shrink-0">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#CF565D]" />
              Hospital-Grade Sanitized Kit
            </span>
            <span className="text-[#CF565D] font-semibold">Certified Female Staff</span>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs sm:text-sm">
            {messages.map((msg) => {
              const isBot = msg.sender === "bot";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? "items-start" : "items-end"} space-y-1`}
                >
                  {/* Bubble */}
                  <div
                    className={`relative max-w-[88%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${isBot
                      ? "bg-white text-[#292525] border border-[#E8D8C8]/70 rounded-tl-xs shadow-2xs"
                      : "bg-[#CF565D] text-white rounded-tr-xs shadow-2xs font-medium"
                      }`}
                  >
                    {isBot && (
                      <span className="text-[10px] font-bold text-[#CF565D] block mb-0.5 tracking-wider uppercase">
                        Rose
                      </span>
                    )}

                    {/* Message text with bold markdown parsing */}
                    {msg.text && (
                      <div className="whitespace-pre-line space-y-1">
                        {msg.text.split("\n\n").map((paragraph, pIdx) => (
                          <p key={pIdx}>
                            {paragraph.split(/(\*\*.*?\*\*)/).map((part, idx) => {
                              if (part.startsWith("**") && part.endsWith("**")) {
                                return (
                                  <strong key={idx} className={isBot ? "font-bold text-[#292525]" : "font-bold text-white"}>
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return part;
                            })}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Timestamp & Delivery status */}
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isBot ? "text-[#746D69]/60" : "text-white/80"
                        }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isBot && <CheckCheck className="w-3 h-3 text-white/90" />}
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* STEP 1: SERVICE CATEGORIES QUICK REPLIES                  */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "service-picker" && !serviceSelectionConfirmed && (
                    <div className="w-full pt-1 space-y-1.5">
                      <span className="block text-[10px] font-bold text-[#746D69] uppercase tracking-wider pl-1">
                        Select Category:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DEFAULT_CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => handleSelectCategory(cat.key, cat.name)}
                              className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-[#FDF3F1] border border-[#E8D8C8] hover:border-[#CF565D]/40 text-left transition-all shadow-2xs group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] group-hover:bg-[#F5DAD6] text-[#CF565D] flex items-center justify-center shrink-0 transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-[#292525] truncate">
                                  {cat.name}
                                </span>
                                <span className="block text-[10px] text-[#746D69] truncate">
                                  {cat.samplePrice}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 1.5: MULTI-TREATMENT PICKER & CATEGORY FILTER TABS   */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "treatment-picker" && !serviceSelectionConfirmed && (
                    <div className="w-full pt-1 space-y-2.5">
                      {/* Category Switcher Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {DEFAULT_CATEGORIES.map((cat) => {
                          const active = activeCategoryKey === cat.key;
                          const countInCat = selectedServices.filter(
                            (s) =>
                              s.category?.toLowerCase() === cat.name.toLowerCase() ||
                              s.category?.toLowerCase() === cat.key.toLowerCase()
                          ).length;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => setActiveCategoryKey(cat.key)}
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${active
                                ? "bg-[#CF565D] text-white shadow-xs"
                                : "bg-white text-[#746D69] hover:text-[#292525] border border-[#E8D8C8]"
                                }`}
                            >
                              <span>{cat.name}</span>
                              {countInCat > 0 && (
                                <span
                                  className={`min-w-3.5 h-3.5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${active ? "bg-white text-[#CF565D]" : "bg-[#CF565D] text-white"
                                    }`}
                                >
                                  {countInCat}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Treatments List (Multi-Selectable with Checkmarks) */}
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                        {(
                          treatments[activeCategoryKey] ||
                          PRESET_TREATMENTS[activeCategoryKey] ||
                          PRESET_TREATMENTS.hair
                        ).map((t) => {
                          const isSelected = selectedServices.some(
                            (s) => s.id === t.id || s.name === t.name
                          );
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTreatment(t)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all shadow-2xs group cursor-pointer active:scale-[0.99] ${isSelected
                                ? "bg-[#FDF3F1] border-2 border-[#CF565D] ring-2 ring-[#CF565D]/10"
                                : "bg-white hover:bg-[#FAF7F2] border border-[#E8D8C8]"
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected
                                    ? "bg-[#CF565D] text-white"
                                    : "border border-[#E8D8C8] text-transparent group-hover:border-[#CF565D]/50"
                                    }`}
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                                <div className="min-w-0">
                                  <span
                                    className={`block text-xs font-bold truncate ${isSelected ? "text-[#CF565D]" : "text-[#292525]"
                                      }`}
                                  >
                                    {t.name}
                                  </span>
                                  <span className="block text-[10px] text-[#746D69]">
                                    ~{t.duration} mins
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isSelected
                                    ? "bg-[#CF565D] text-white"
                                    : "bg-[#FAF7F2] text-[#CF565D] border border-[#E8D8C8]/60"
                                    }`}
                                >
                                  AED {t.price}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Sticky Action Footer */}
                      <div className="pt-2 border-t border-[#E8D8C8] space-y-1.5">
                        <div className="flex items-center justify-between px-1 text-xs">
                          <span className="text-[#746D69]">
                            {selectedServices.length > 0 ? (
                              <>
                                <strong className="text-[#292525]">{selectedServices.length}</strong> selected (~{totalChatDuration}m)
                              </>
                            ) : (
                              "Select 1 or more treatments"
                            )}
                          </span>
                          <span className="font-bold text-[#CF565D]">
                            AED {totalChatPrice}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={selectedServices.length === 0}
                          onClick={handleConfirmSelectedTreatments}
                          className="w-full py-2.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <span>Continue ({selectedServices.length} Selected · AED {totalChatPrice})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 2: LOCATION PICKER QUICK REPLIES                     */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "location-picker" && !selectedLocation && (
                    <div className="w-full pt-1 space-y-1.5">
                      <span className="block text-[10px] font-bold text-[#746D69] uppercase tracking-wider pl-1">
                        Select Location:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {locations.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className="flex items-center gap-1.5 p-2 rounded-xl bg-white hover:bg-[#FDF3F1] border border-[#E8D8C8] hover:border-[#CF565D]/40 text-left transition-all shadow-2xs text-xs font-semibold text-[#292525] group cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#CF565D] shrink-0" />
                            <span className="truncate">{loc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 3: DATE PICKER WITH INTERACTIVE CALENDAR             */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "date-picker" && !selectedDate && (
                    <div className="w-full pt-1 space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-[#746D69] uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#CF565D]" />
                          Select Date
                        </span>
                        <span className="text-[10px] text-[#746D69]">Pick from calendar</span>
                      </div>

                      {/* Quick Presets (Today, Tomorrow, Weekend) */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {getQuickDatePresets().map((item) => (
                          <button
                            key={item.dateVal}
                            type="button"
                            onClick={() => handleSelectDate(item.dateVal, item.label)}
                            className="py-1.5 px-2 rounded-xl bg-white hover:bg-[#FDF3F1] border border-[#E8D8C8] hover:border-[#CF565D]/50 text-center transition-all shadow-2xs group cursor-pointer active:scale-95"
                          >
                            <span className="block text-[9.5px] text-[#746D69] uppercase font-bold tracking-wider">
                              {item.badge}
                            </span>
                            <span className="block text-[11px] font-bold text-[#292525] group-hover:text-[#CF565D] leading-tight truncate mt-0.5">
                              {item.shortLabel}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Native App-like In-Chat Calendar Card */}
                      <div className="bg-white rounded-2xl border border-[#E8D8C8] p-2.5 sm:p-3 shadow-2xs space-y-2">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#FAF7F2]">
                          <button
                            type="button"
                            disabled={!canGoPrevChatMonth}
                            onClick={handlePrevChatMonth}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#292525] hover:bg-[#FAF7F2] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            aria-label="Previous month"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="font-bold text-xs text-[#292525] uppercase tracking-wider">
                            {chatCalendarMonth.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>

                          <button
                            type="button"
                            onClick={handleNextChatMonth}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#292525] hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                            aria-label="Next month"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#746D69]">
                          <span>Su</span>
                          <span>Mo</span>
                          <span>Tu</span>
                          <span>We</span>
                          <span>Th</span>
                          <span>Fr</span>
                          <span>Sa</span>
                        </div>

                        {/* Calendar Days 7-Col Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {chatCalendarDays.map((d: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean; isToday: boolean }, idx: number) => {
                            if (!d.isCurrentMonth && d.isPast) {
                              return (
                                <div
                                  key={`chat-d-${idx}`}
                                  className="h-7 flex items-center justify-center text-[10.5px] text-[#CBD5E1] cursor-not-allowed select-none"
                                >
                                  {d.dayNum}
                                </div>
                              );
                            }
                            if (d.isPast) {
                              return (
                                <div
                                  key={`chat-d-${idx}`}
                                  className="h-7 flex items-center justify-center text-[10.5px] text-[#CBD5E1] opacity-40 cursor-not-allowed select-none"
                                >
                                  {d.dayNum}
                                </div>
                              );
                            }
                            return (
                              <button
                                key={`chat-d-${idx}`}
                                type="button"
                                onClick={() => handleSelectCalendarDate(d.dateStr)}
                                className={`h-7 w-full rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center relative select-none active:scale-95 ${d.isToday
                                  ? "bg-[#FAF5FF] text-[#CF565D] border border-[#CF565D]/40 font-bold hover:bg-[#CF565D] hover:text-white"
                                  : d.isCurrentMonth
                                    ? "text-[#292525] hover:bg-[#CF565D] hover:text-white hover:shadow-xs"
                                    : "text-[#94A3B8] hover:bg-[#FAF7F2]"
                                  }`}
                              >
                                <span>{d.dayNum}</span>
                                {d.isToday && (
                                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#CF565D]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 4: TIME SLOTS QUICK REPLIES (App-Like Multi-Slot)    */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "time-picker" && !selectedTime && (
                    <div className="w-full pt-1 space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-[#746D69] uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#CF565D]" />
                          Select Time ({displayedSlots.length} Available)
                        </span>
                        {selectedDate && (
                          <span className="text-[10px] font-semibold text-[#CF565D] bg-[#FDF3F1] px-2 py-0.5 rounded-full border border-[#E8D8C8]">
                            {selectedDate}
                          </span>
                        )}
                      </div>

                      {/* Period Filter Tabs */}
                      <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#E8D8C8] shadow-2xs">
                        {[
                          { id: "all", label: "All" },
                          { id: "morning", label: "Morning", icon: Sunrise },
                          { id: "afternoon", label: "Afternoon", icon: Sun },
                          { id: "evening", label: "Evening", icon: Moon },
                        ].map((tab) => {
                          const Icon = (tab as any).icon;
                          const active = chatTimeFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setChatTimeFilter(tab.id as any)}
                              className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${active
                                ? "bg-[#CF565D] text-white shadow-xs"
                                : "text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2]"
                                }`}
                            >
                              {Icon && <Icon className="w-2.5 h-2.5" />}
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* 3-Column Time Slots Grid with Clock Icon */}
                      <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto p-0.5 pr-1 [scrollbar-width:thin]">
                        {displayedSlots.map((slot: { time: string; period: string }) => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => handleSelectTime(slot.time)}
                            className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-white hover:bg-[#FDF3F1] border border-[#E8D8C8] hover:border-[#CF565D]/60 text-center transition-all shadow-2xs text-[11px] font-semibold text-[#292525] hover:text-[#CF565D] group cursor-pointer active:scale-95"
                          >
                            <Clock className="w-2.5 h-2.5 text-[#CF565D] opacity-60 group-hover:opacity-100" />
                            <span>{slot.time}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 5: CONTACT DETAILS FORM                              */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "contact-form" && !contactSubmitted && (
                    <form
                      onSubmit={handleContactSubmit}
                      className="w-full pt-1 p-3 rounded-2xl bg-white border border-[#E8D8C8] shadow-2xs space-y-2.5"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-[#746D69] uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#746D69]" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sarah Mansoor"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E8D8C8] bg-[#FAF7F2] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#746D69] uppercase tracking-wider mb-1">
                          WhatsApp / Phone *
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#746D69]" />
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +971 50 123 4567"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E8D8C8] bg-[#FAF7F2] text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <span>Review Booking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 6: BOOKING SUMMARY CARD & CONFIRMATION BUTTONS      */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "summary-card" && !bookingConfirmed && (
                    <div className="w-full pt-1 space-y-2">
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#CF565D]">
                            Summary
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Slot Reserved
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* List of selected treatments */}
                          <div className="space-y-1.5 pb-2 border-b border-[#FAF7F2]">
                            <span className="block text-[10px] font-bold text-[#746D69] uppercase tracking-wider">
                              Treatments ({selectedServices.length}):
                            </span>
                            {selectedServices.map((srv) => (
                              <div key={srv.id} className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#292525] truncate">
                                  {srv.name}
                                </span>
                                <span className="text-[#CF565D] font-bold shrink-0">
                                  AED {srv.price}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-[#746D69] font-medium">Total Amount:</span>
                            <span className="font-bold text-sm text-[#CF565D]">
                              AED {totalChatPrice}
                              <span className="text-[10px] font-normal text-[#746D69] ml-1">
                                (~{totalChatDuration} mins)
                              </span>
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#746D69]">Location:</span>
                            <span className="font-semibold text-[#292525]">
                              {selectedLocation}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#746D69]">Date & Time:</span>
                            <span className="font-semibold text-[#292525]">
                              {selectedDate} at {selectedTime}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#746D69]">Client:</span>
                            <span className="font-semibold text-[#292525]">
                              {customerName} ({customerPhone})
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-[#FAF7F2] text-[10px] text-[#746D69] flex items-center gap-1">
                          <Info className="w-3 h-3 text-[#CF565D] shrink-0" />
                          <span>Pay in cash or card after service.</span>
                        </div>
                      </div>

                      {/* Confirmation Quick Action Buttons */}
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleConfirmBooking}
                          disabled={isSubmitting}
                          className="w-full py-2.5 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? "Confirming..." : "Confirm My Booking Now"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={openWhatsAppConfirmation}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <span>Confirm via WhatsApp Chat</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 7: SUCCESS CONFIRMATION & ACTIONS                    */}
                  {/* -------------------------------------------------------- */}
                  {isBot && msg.type === "confirmation" && (
                    <div className="w-full pt-1 space-y-2">
                      <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="font-bold text-emerald-800 text-xs">
                            Confirmed Reference: #{bookingReference}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 leading-relaxed">
                          Your appointment has been reserved. You can also chat with our dispatch team on WhatsApp anytime.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openWhatsAppConfirmation}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>WhatsApp Dispatch</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={initializeChat}
                          className="py-2 px-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-[#CF565D]" />
                          <span>Book Another</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#746D69] pl-1">
                  Rose is typing...
                </span>
                <div className="bg-white border border-[#E8D8C8]/60 p-2 px-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CF565D] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CF565D] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CF565D] animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* FOOTER: Quick Assistance Bar */}
          <div className="bg-white border-t border-[#E8D8C8]/80 px-3.5 py-2 flex items-center justify-between text-xs text-[#746D69] shrink-0">
            <span className="text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#CF565D]" />
              Need custom combo packages?
            </span>
            <Link
              href="/packages"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[#CF565D] hover:underline flex items-center gap-0.5"
            >
              <span>Explore Deals</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export const BookingChatWidget: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <BookingChatWidgetContent />
    </Suspense>
  );
};
