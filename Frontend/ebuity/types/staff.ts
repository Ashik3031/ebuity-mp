import { Service, ServiceCategory } from "./service";
import { Booking } from "./booking";

export interface StaffLeave {
  _id?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
  staffPhone?: string;
  staffImage?: string;
}

export interface StaffBreak {
  start: string; // HH:mm
  end: string;   // HH:mm
  label?: string;
}

export interface StaffScheduleException {
  date: string;
  isOff: boolean;
  start?: string;
  end?: string;
  reason?: string;
}

export interface AttendanceAuditTrailItem {
  action: string;
  modifiedBy: string;
  adminId?: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
  timestamp: string;
}

export interface StaffProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  employeeId?: string;
  joiningDate?: string;
  employmentStatus?: "active" | "probation" | "full-time" | "part-time" | "contract" | "on-leave" | "terminated";
  profileImage?: string;
  role: "staff";
  isActive: boolean;
  categoryIds?: Array<string | ServiceCategory>;
  serviceIds?: Array<string | Service>;
  workingHours: {
    start: string;
    end: string;
  };
  breaks: StaffBreak[];
  weeklyOffDays: number[]; // 0=Sunday ... 6=Saturday
  holidays: string[];
  scheduleExceptions?: StaffScheduleException[];
  leaves?: StaffLeave[];
  baseZone?: string;
  baseZoneName?: string;
  notes?: string;
  invitationToken?: string | null;
  invitationExpires?: string | null;
  invitationStatus?: "pending" | "accepted";
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAttendance {
  _id?: string;
  staff: string | StaffProfile;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "half_day" | "absent" | "on_leave";
  notes?: string;
  isCorrected?: boolean;
  correctionReason?: string;
  correctedBy?: string;
  auditTrail?: AttendanceAuditTrailItem[];
}

export interface StaffDashboardSummary {
  todayDate: string;
  todayJobsCount: number;
  upcomingJobsCount: number;
  completedJobsCount: number;
  attendanceToday: StaffAttendance | null;
  todayBookings: Booking[];
}

export interface AssignmentHistoryItem {
  staffId?: string;
  staffName?: string;
  action:
    | "auto_assigned"
    | "manually_assigned"
    | "accepted"
    | "rejected"
    | "reassigned"
    | "flagged_admin"
    | "status_update";
  reason?: string;
  performedBy?: string;
  timestamp: string;
}

export interface StaffScheduleItem {
  staff: StaffProfile;
  workingHours: { start: string; end: string };
  breaks: StaffBreak[];
  weeklyOffDays: number[];
  isOnLeave: boolean;
  attendance: StaffAttendance | null;
  bookingsCount: number;
  bookings: Booking[];
}
