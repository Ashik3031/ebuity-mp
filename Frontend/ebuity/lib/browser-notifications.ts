"use client";

import { useState, useEffect, useCallback } from "react";
import { getRealtimeSocket } from "./realtime-socket";

export type NotificationType = "booking" | "order" | "alert" | "stock" | "staff";

export interface DashboardNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  meta?: any;
}

/**
 * Check current browser Notification permission
 */
export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request notification permission from browser
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

/**
 * Play a high-end, subtle luxury chime using Web Audio API
 * No external mp3 files required — 100% resilient and offline-ready.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Gentle, calming 2-tone chime (F#5 -> C#6 luxury harmonic)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(739.99, now); // F#5
    osc1.frequency.exponentialRampToValueAtTime(740, now + 0.1);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1108.73, now + 0.08); // C#6
    osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.45);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (err) {
    // Audio autoplay might be restricted before first click; fail gracefully
  }
}

/**
 * Display a native operating system / browser push notification
 */
export function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
    sound?: boolean;
  }
) {
  if (options?.sound !== false) {
    playNotificationSound();
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body: options?.body || "",
        icon: options?.icon || "/apple-touch-icon.png",
        tag: options?.tag || `notif_${Date.now()}`,
      });

      notif.onclick = () => {
        window.focus();
        if (options?.url) {
          window.location.href = options.url;
        }
        notif.close();
      };

      return notif;
    } catch (err) {
      console.warn("Error showing native Notification:", err);
      return null;
    }
  }

  return null;
}

const STORAGE_KEY_ADMIN = "rose_admin_notifications_v1";
const STORAGE_KEY_STAFF = "rose_staff_notifications_v1";

/**
 * React Hook managing real-time notifications, in-app toast alerts,
 * and audio alerts for both Admin and Staff dashboards.
 */
export function useDashboardNotifications(role: "admin" | "staff", staffId?: string) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [activeToast, setActiveToast] = useState<DashboardNotification | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  const storageKey = role === "admin" ? STORAGE_KEY_ADMIN : `${STORAGE_KEY_STAFF}_${staffId || "default"}`;

  // Load cached notifications from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(getBrowserNotificationPermission());

    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        setNotifications(JSON.parse(cached));
      } else {
        // Initial defaults for demo/admin onboarding
        if (role === "admin") {
          setNotifications([
            {
              id: "seed-1",
              type: "booking",
              title: "Operational Notification Center Active",
              message: "Real-time browser notifications & attention alerts are enabled for this session.",
              timestamp: new Date().toISOString(),
              read: false,
              link: "/admin/bookings",
            },
          ]);
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }, [storageKey, role]);

  // Persist notifications list to localStorage
  const saveNotifications = useCallback(
    (newNotifs: DashboardNotification[]) => {
      setNotifications(newNotifs);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newNotifs.slice(0, 50)));
      } catch (e) {}
    },
    [storageKey]
  );

  const addNotification = useCallback(
    (notif: Omit<DashboardNotification, "id" | "read" | "timestamp">) => {
      const item: DashboardNotification = {
        ...notif,
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // 1. Show native browser notification + play sound
      showBrowserNotification(item.title, {
        body: item.message,
        url: item.link,
        sound: true,
      });

      // 2. Set active in-app toast
      setActiveToast(item);

      // Auto-hide in-app toast after 6 seconds
      setTimeout(() => {
        setActiveToast((prev) => (prev?.id === item.id ? null : prev));
      }, 6000);

      // 3. Prepend to list
      setNotifications((prev) => {
        const updated = [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 50);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    },
    [storageKey]
  );

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    },
    [storageKey]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [storageKey]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  }, [storageKey]);

  const requestPermission = useCallback(async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      showBrowserNotification("Notifications Enabled! 🌸", {
        body: `You will now receive instant desktop alerts for new ${role === "admin" ? "orders & bookings" : "assigned appointments"}.`,
        sound: true,
      });
    }
    return res;
  }, [role]);

  // Connect to realtime Socket.IO events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const socket = getRealtimeSocket({ role, staffId });
    if (!socket) return;

    if (role === "admin") {
      // New Boutique Order
      const handleOrderCreated = (data: any) => {
        const orderId = data.orderId || data.orderNumber || "ORDER";
        const ref = String(orderId).slice(-6).toUpperCase();
        addNotification({
          type: "order",
          title: "New Boutique Order Received 🛍️",
          message: `Order #${ref} for AED ${Number(data.totalAmount || 0).toFixed(2)} placed by ${data.customerName || "Customer"}.`,
          link: "/admin/orders",
          meta: data,
        });
      };

      // New Booking Order
      const handleBookingCreated = (data: any) => {
        const b = data.booking || data;
        const bNum = b.bookingNumber || `BK-${String(b._id || b.bookingId || "").slice(-6).toUpperCase()}`;
        addNotification({
          type: "booking",
          title: "New Ritual Booking Order 🌸",
          message: `Appointment #${bNum} confirmed for ${b.scheduledDate || "upcoming"} (${b.customerDetails?.name || "Client"}).`,
          link: "/admin/bookings",
          meta: data,
        });
      };

      // General Admin Alerts (Low Stock, Reschedules, Delivery Failures)
      const handleAdminAlert = (data: any) => {
        addNotification({
          type: data.type || "alert",
          title: data.title || "Admin Operations Alert ⚠️",
          message: data.message || "A new event requires your attention.",
          link: data.link || "/admin",
          meta: data,
        });
      };

      socket.on("order:created", handleOrderCreated);
      socket.on("booking:created", handleBookingCreated);
      socket.on("admin:alert", handleAdminAlert);

      return () => {
        socket.off("order:created", handleOrderCreated);
        socket.off("booking:created", handleBookingCreated);
        socket.off("admin:alert", handleAdminAlert);
      };
    } else if (role === "staff") {
      // Job Assigned to this staff member
      const handleBookingAssigned = (data: any) => {
        const b = data.booking || data;
        const bNum = b.bookingNumber || `BK-${String(b._id || b.bookingId || "").slice(-6).toUpperCase()}`;
        addNotification({
          type: "booking",
          title: "New Job Assigned! 🚗",
          message: `You've been assigned to appointment #${bNum} for ${b.customerDetails?.name || "Client"} on ${b.scheduledDate || "today"}.`,
          link: "/staff/dashboard",
          meta: data,
        });
      };

      const handleJobStatusChanged = (data: any) => {
        const b = data.booking || data;
        if (data.action === "reassigned" || data.action === "assigned") {
          handleBookingAssigned(data);
        }
      };

      socket.on("booking:assigned", handleBookingAssigned);
      socket.on("booking:status_changed", handleJobStatusChanged);

      return () => {
        socket.off("booking:assigned", handleBookingAssigned);
        socket.off("booking:status_changed", handleJobStatusChanged);
      };
    }
  }, [role, staffId, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    activeToast,
    permission,
    requestPermission,
    dismissToast: () => setActiveToast(null),
    markAsRead,
    markAllAsRead,
    clearAll,
    addNotification,
  };
}
