import { Booking } from "../types/booking";

/**
 * Converts a 24-hour "HH:mm" time string (e.g., "14:30") to 12-hour format ("2:30 PM").
 */
export function format12Hour(timeStr?: string | null): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (
    trimmed.includes("AM") ||
    trimmed.includes("PM") ||
    trimmed.includes("am") ||
    trimmed.includes("pm")
  ) {
    return trimmed;
  }
  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return trimmed;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Safely extracts and formats the booking start or end time in Dubai timezone (GST, UTC+4).
 * Handles:
 * 1. Explicit `scheduledTime` (e.g., "14:30")
 * 2. ISO Date strings (`scheduledStartTime`, `scheduledEndTime`) -> formatted in "Asia/Dubai"
 * 3. Fallback extraction from `slotLockKey` (e.g., "2026-10-28_14:30_...")
 */
export function formatBookingTime(
  timeOrIso?: string | null,
  bookingFallback?: Partial<Booking> | null
): string {
  // 1. Check if string is already HH:mm (e.g. "14:30" or "09:00")
  if (timeOrIso && /^\d{1,2}:\d{2}$/.test(timeOrIso.trim())) {
    return format12Hour(timeOrIso);
  }

  // 2. If timeOrIso is a valid Date/ISO string, format specifically in Asia/Dubai (+04:00)
  if (timeOrIso) {
    try {
      const d = new Date(timeOrIso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dubai",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to bookingFallback object properties
  if (bookingFallback) {
    if (
      bookingFallback.scheduledTime &&
      /^\d{1,2}:\d{2}$/.test(bookingFallback.scheduledTime.trim())
    ) {
      return format12Hour(bookingFallback.scheduledTime);
    }

    if (bookingFallback.slotLockKey) {
      const parts = bookingFallback.slotLockKey.split("_");
      if (parts.length >= 2 && /^\d{1,2}:\d{2}$/.test(parts[1])) {
        return format12Hour(parts[1]);
      }
    }

    if (bookingFallback.scheduledStartTime) {
      try {
        const d = new Date(bookingFallback.scheduledStartTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString("en-US", {
            timeZone: "Asia/Dubai",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        }
      } catch {
        // ignore
      }
    }
  }

  return "";
}

/**
 * Formats a Date/ISO string or booking in Dubai timezone into 24h "HH:mm" (e.g., "14:30")
 */
export function getDubaiTime24H(
  timeOrIso?: string | null,
  bookingFallback?: Partial<Booking> | null
): string {
  if (timeOrIso && /^\d{1,2}:\d{2}$/.test(timeOrIso.trim())) {
    const [h, m] = timeOrIso.trim().split(":");
    return `${String(parseInt(h, 10)).padStart(2, "0")}:${String(
      parseInt(m, 10)
    ).padStart(2, "0")}`;
  }

  if (timeOrIso) {
    try {
      const d = new Date(timeOrIso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
    } catch {
      // ignore
    }
  }

  if (bookingFallback) {
    if (bookingFallback.scheduledTime) {
      return bookingFallback.scheduledTime;
    }
    if (bookingFallback.slotLockKey) {
      const parts = bookingFallback.slotLockKey.split("_");
      if (parts.length >= 2 && /^\d{1,2}:\d{2}$/.test(parts[1])) {
        return parts[1];
      }
    }
    if (bookingFallback.scheduledStartTime) {
      try {
        const d = new Date(bookingFallback.scheduledStartTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Dubai",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      } catch {
        // ignore
      }
    }
  }

  return "10:00";
}
