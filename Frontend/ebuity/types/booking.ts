export interface BookingServiceItem {
  serviceId: string;
  name: string;
  slug: string;
  price: number;
  durationMinutes: number;
  currency: string;
}

export interface BookingAddress {
  label?: string;
  fullName: string;
  phone: string;
  email?: string;
  unitNumber: string;
  buildingName: string;
  street?: string;
  area: string;
  city: string;
  state?: string;
  postalCode?: string;
  landmark?: string;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
  accessInstructions?: string;
  zoneId?: string;
  zoneName?: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  customer: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  services: BookingServiceItem[];
  totalDurationMinutes: number;
  totalPrice: number;
  currency: string;
  serviceAddress: BookingAddress;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm in Dubai local time (e.g. "14:30")
  scheduledStartTime: string; // ISO
  scheduledEndTime: string; // ISO
  slotLockKey?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  cancellationReason?: string;
  cancelledAt?: string;
  specialRequests?: string;
  // Level 5 & 9: Staff Management & Workflow
  assignedStaff?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
  } | null;
  staffAssignmentStatus?:
    | "unassigned"
    | "assigned"
    | "accepted"
    | "rejected"
    | "on_the_way"
    | "arrived"
    | "in_progress"
    | "completed"
    | "admin_attention";
  assignmentHistory?: Array<{
    staffId?: string;
    staffName?: string;
    action: string;
    reason?: string;
    performedBy?: string;
    timestamp: string;
  }>;
  staffRejectionReason?: string;
  flaggedForAdmin?: boolean;
  travelBufferMinutes?: number;
  serviceTracking?: {
    onTheWayAt?: string | null;
    arrivedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  cancellationRequest?: {
    status: "none" | "pending" | "approved" | "rejected";
    reason?: string;
    requestedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string;
    adminNote?: string;
  };
  rescheduleRequest?: {
    status: "none" | "pending" | "approved" | "rejected";
    requestedDate?: string;
    requestedStartTime?: string | null;
    requestedEndTime?: string | null;
    requestedTimeStr?: string;
    reason?: string;
    requestedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string;
    adminNote?: string;
  };
  paymentStatus?: "unpaid" | "pending" | "paid" | "refunded";
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogItem {
  _id: string;
  bookingId?: string;
  recipient: string;
  recipientRole: "customer" | "staff" | "admin";
  channel: "email" | "whatsapp";
  eventType: string;
  subject?: string;
  content: string;
  status: "pending" | "sent" | "failed" | "logged";
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  persistentFailure: boolean;
  lastAttemptAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface TimeSlot {
  time: string; // HH:mm
  endTime: string; // HH:mm
  startTime: string; // ISO
  isAvailable: boolean;
  reason?: string | null;
  period: "morning" | "afternoon" | "evening";
}

export interface AvailabilityResponse {
  success: boolean;
  date: string;
  totalDurationMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
  bufferMinutes?: number;
  leadTimeHours?: number;
  maxAdvanceDays?: number;
  isProvisional?: boolean;
  availabilityType?: string;
  statusNote?: string;
  slots: TimeSlot[];
  availableSlotsCount: number;
  message?: string;
}

export interface AvailabilityBreak {
  start: string; // HH:mm e.g. "13:00"
  end: string;   // HH:mm e.g. "14:00"
  label: string; // e.g. "Therapist Rest & Disinfection Break"
}

export interface AvailabilityConfig {
  _id?: string;
  key: string;
  workingHours: {
    start: string; // "09:00"
    end: string;   // "21:00"
  };
  slotIntervalMinutes: number;
  bufferMinutes: number;
  breaks: AvailabilityBreak[];
  maxConcurrentBookings: number;
  leadTimeHours: number;
  maxAdvanceDays: number;
  holidays: string[]; // YYYY-MM-DD
  activeDaysOfWeek: number[]; // 0: Sun ... 6: Sat
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneValidationResponse {
  success: boolean;
  isSupported: boolean;
  area?: string;
  zone?: {
    _id: string;
    name: string;
    slug: string;
  };
  message?: string;
  supportedZones?: Array<{
    name: string;
    areas: string[];
  }>;
}

export interface CreateBookingPayload {
  serviceIds: string[];
  address?: Partial<BookingAddress>;
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  specialRequests?: string;
  saveAddressToProfile?: boolean;
  isLiveChat?: boolean;
}

export interface SavedAddress {
  _id: string;
  label: string;
  fullName: string;
  email?: string;
  phone: string;
  addressType?: "apartment" | "villa" | "office";
  unitNumber: string;
  buildingName: string;
  area: string;
  city: string;
  state: string;
  street?: string;
  landmark?: string;
  poBox?: string;
  postalCode?: string;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
  accessInstructions?: string;
  isDefault: boolean;
}
