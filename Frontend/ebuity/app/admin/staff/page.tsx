"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  adminStaffApi,
  serviceApi,
  serviceCategoryApi,
} from "../../../lib/api-client";
import { StaffProfile } from "../../../types/staff";
import { Service, ServiceCategory } from "../../../types/service";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Send,
  Lock,
  Briefcase,
  Clock,
  Building,
  Info,
} from "lucide-react";
import {
  useRealtimeConnection,
  useRealtimeEvent,
} from "../../../lib/realtime-socket";

export default function AdminStaffDirectoryPage() {
  // State
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination & Filtering
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);

  // Alerts & Messages
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [viewingStaff, setViewingStaff] = useState<StaffProfile | null>(null);
  const [staffStats, setStaffStats] = useState<{
    totalAssigned: number;
    completed: number;
  } | null>(null);

  const [statusConfirmStaff, setStatusConfirmStaff] =
    useState<StaffProfile | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [invitationModalData, setInvitationModalData] = useState<{
    name: string;
    url: string;
    token: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    employeeId: "",
    joiningDate: new Date().toISOString().split("T")[0],
    employmentStatus: "full-time",
    profileImage: "",
    password: "",
    sendInvitation: true,
    categoryIds: [] as string[],
    serviceIds: [] as string[],
    baseZoneName: "Dubai Central",
    notes: "",
  });

  // Load staff list
  const loadStaff = useCallback(
    async (pageToLoad = currentPage, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await adminStaffApi.getAllStaff({
          search: search.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          employmentStatus:
            employmentFilter !== "all" ? employmentFilter : undefined,
          categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
          page: pageToLoad,
          limit: 10,
        });

        if (res.success && Array.isArray(res.staff)) {
          setStaffList(res.staff);
          setTotalStaff(res.total ?? res.count ?? res.staff.length);
          setTotalPages(res.totalPages ?? 1);
          setCurrentPage(res.currentPage ?? pageToLoad);
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load staff list.",
        });
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [search, statusFilter, employmentFilter, categoryFilter, currentPage]
  );

  // Load metadata (categories & services)
  const loadMetadata = async () => {
    try {
      const [catRes, srvRes] = await Promise.all([
        serviceCategoryApi.getAll(),
        serviceApi.getAll({ limit: 100 }),
      ]);

      if (catRes.success && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
      }
      if (srvRes.success && Array.isArray(srvRes.services)) {
        setServices(srvRes.services);
      }
    } catch (err) {
      console.warn("Failed to load categories/services list:", err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadStaff(1);
  }, [search, statusFilter, employmentFilter, categoryFilter]);

  // Real-time Socket.IO Connection & Listeners
  const { isConnected: isRealtimeConnected } = useRealtimeConnection({
    role: "admin",
  });

  useRealtimeEvent(
    "staff:updated",
    () => {
      loadStaff(currentPage);
    },
    { role: "admin" }
  );

  // Helper to extract category ID of a service safely
  const getServiceCategoryId = (srv: Service): string => {
    if (!srv || !srv.category) return "";
    if (typeof srv.category === "object" && "_id" in srv.category) {
      return String((srv.category as ServiceCategory)._id || "");
    }
    return String(srv.category);
  };

  // Auto-select or deselect services when category selection changes
  const handleToggleCategory = (catId: string) => {
    const isChecked = formData.categoryIds.includes(catId);
    let nextCategoryIds: string[];
    let nextServiceIds: string[];

    // All services belonging to this toggled category
    const catServiceIds = services
      .filter((srv) => getServiceCategoryId(srv) === catId)
      .map((srv) => srv._id);

    if (isChecked) {
      // Uncheck category -> remove category and its services
      nextCategoryIds = formData.categoryIds.filter((id) => id !== catId);
      nextServiceIds = formData.serviceIds.filter(
        (id) => !catServiceIds.includes(id)
      );
    } else {
      // Check category -> add category and auto-select all its services
      nextCategoryIds = [...formData.categoryIds, catId];
      const serviceIdSet = new Set(formData.serviceIds);
      catServiceIds.forEach((id) => serviceIdSet.add(id));
      nextServiceIds = Array.from(serviceIdSet);
    }

    setFormData((prev) => ({
      ...prev,
      categoryIds: nextCategoryIds,
      serviceIds: nextServiceIds,
    }));
  };

  // Open Form for Add
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      joiningDate: new Date().toISOString().split("T")[0],
      employmentStatus: "full-time",
      profileImage: "",
      password: "",
      sendInvitation: true,
      categoryIds: [],
      serviceIds: [],
      baseZoneName: "Dubai Central",
      notes: "",
    });
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (staff: StaffProfile) => {
    setEditingStaff(staff);
    const catIds = (staff.categoryIds || []).map((c) =>
      typeof c === "string" ? c : c._id
    );
    const srvIds = (staff.serviceIds || []).map((s) =>
      typeof s === "string" ? s : s._id
    );

    // Auto-select all services belonging to the qualified categories
    const categorySrvIds = services
      .filter((srv) => catIds.includes(getServiceCategoryId(srv)))
      .map((s) => s._id);

    const mergedServiceIds = Array.from(
      new Set([...srvIds, ...categorySrvIds])
    );

    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      employeeId: staff.employeeId || "",
      joiningDate: staff.joiningDate
        ? new Date(staff.joiningDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      employmentStatus: staff.employmentStatus || "full-time",
      profileImage: staff.profileImage || "",
      password: "",
      sendInvitation: false,
      categoryIds: catIds,
      serviceIds: mergedServiceIds,
      baseZoneName: staff.baseZoneName || "Dubai Central",
      notes: staff.notes || "",
    });
    setIsFormOpen(true);
  };

  // View Profile
  const handleViewProfile = async (staff: StaffProfile) => {
    setViewingStaff(staff);
    setStaffStats(null);
    try {
      const res = await adminStaffApi.getStaffById(staff._id);
      if (res.success && res.staff) {
        setViewingStaff(res.staff);
        setStaffStats(res.stats || null);
      }
    } catch {
      // Use existing staff data
    }
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setMessage({ type: "error", text: "Please enter staff name, email, and phone." });
      return;
    }

    setFormSubmitting(true);
    setMessage(null);

    try {
      if (editingStaff) {
        const payload: Partial<StaffProfile> & { password?: string } = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          employeeId: formData.employeeId.trim() || undefined,
          joiningDate: formData.joiningDate,
          employmentStatus: formData.employmentStatus as StaffProfile["employmentStatus"],
          profileImage: formData.profileImage.trim(),
          categoryIds: formData.categoryIds,
          serviceIds: formData.serviceIds,
          notes: formData.notes.trim(),
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        const res = await adminStaffApi.updateStaff(editingStaff._id, payload);
        if (res.success) {
          setMessage({
            type: "success",
            text: `Staff member ${res.staff.name} successfully updated.`,
          });
          setIsFormOpen(false);
          loadStaff(currentPage);
        }
      } else {
        const res = await adminStaffApi.createStaff({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          employeeId: formData.employeeId.trim() || undefined,
          joiningDate: formData.joiningDate,
          employmentStatus: formData.employmentStatus as StaffProfile["employmentStatus"],
          profileImage: formData.profileImage.trim(),
          password: formData.password.trim() || undefined,
          sendInvitation: formData.sendInvitation,
          categoryIds: formData.categoryIds,
          serviceIds: formData.serviceIds,
          notes: formData.notes.trim(),
        });

        if (res.success) {
          setMessage({
            type: "success",
            text: `Staff member ${res.staff.name} (${res.staff.employeeId}) created successfully!`,
          });
          setIsFormOpen(false);

          if (res.invitationUrl) {
            setInvitationModalData({
              name: res.staff.name,
              url: window.location.origin + res.invitationUrl,
              token: res.invitationToken || "",
            });
          }

          loadStaff(1);
        }
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save staff profile.",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Activation
  const handleConfirmStatusToggle = async () => {
    if (!statusConfirmStaff) return;
    setStatusSubmitting(true);
    try {
      const newStatus = !statusConfirmStaff.isActive;
      const res = await adminStaffApi.toggleStatus(statusConfirmStaff._id, newStatus);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Staff profile for ${statusConfirmStaff.name} has been ${
            newStatus ? "activated" : "deactivated"
          }.`,
        });
        setStatusConfirmStaff(null);
        loadStaff(currentPage);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to toggle status.",
      });
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Generate / Resend Invitation
  const handleSendInvite = async (staff: StaffProfile) => {
    try {
      const res = await adminStaffApi.inviteStaff(staff._id);
      if (res.success && res.invitationUrl) {
        setInvitationModalData({
          name: staff.name,
          url: window.location.origin + res.invitationUrl,
          token: res.invitationToken,
        });
        setMessage({
          type: "success",
          text: `New secure setup invitation link generated for ${staff.name}.`,
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to generate invitation.",
      });
    }
  };

  // Stats calculation
  const activeCount = staffList.filter((s) => s.isActive).length;
  const fullTimeCount = staffList.filter(
    (s) => s.employmentStatus === "full-time" || !s.employmentStatus
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#CF565D]/10 text-[#CF565D]">
              Admin Level 4
            </span>
            <span className="text-xs text-[#746D69] font-medium">• UAE Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-1">
            Staff Management
          </h1>
          <p className="text-sm text-[#746D69] mt-0.5">
            Manage certified luxury therapists, profiles, skill specializations, and accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Live Badge (replaces manual refresh) */}
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-semibold shadow-xs"
            title={
              isRealtimeConnected
                ? "Real-time staff directory active (Socket.IO)"
                : "Connecting to real-time service..."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={isRealtimeConnected ? "text-emerald-700" : "text-amber-700"}>
              {isRealtimeConnected ? "Live" : "Connecting..."}
            </span>
          </div>

          <Link
            href="/admin/staff-schedules"
            className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] bg-[#FAF7F2] hover:bg-white hover:border-[#CF565D] transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-[#CF565D]" />
            Schedules
          </Link>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(207,86,93,0.3)] hover:bg-[#b8454c] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : message.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : message.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Total Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#292525]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {totalStaff}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Registered in fleet</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Active Therapists
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 mt-2">
            {activeCount}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Available for booking</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Full-Time Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {fullTimeCount}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">Core UAE workforce</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#746D69]">
              Service Catalog
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#CF565D]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#292525] mt-2">
            {services.length}
          </p>
          <span className="text-[11px] text-[#746D69] mt-1 block">
            Across {categories.length} categories
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D] placeholder:text-[#746D69]/60"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Employment Type */}
          <select
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
          >
            <option value="all">All Employment</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="probation">Probation</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D] max-w-[180px]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          {(search || statusFilter !== "all" || employmentFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setEmploymentFilter("all");
                setCategoryFilter("all");
              }}
              className="px-3 py-2 text-xs font-semibold text-[#CF565D] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#746D69]">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Loading staff directory...
            </p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center text-[#746D69] mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Staff Members Found
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mt-1 mb-5">
              {search || statusFilter !== "all"
                ? "No staff match your current search and filter criteria."
                : "No staff members have been created in the fleet yet. Add your first certified therapist to begin."}
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-sm hover:bg-[#b8454c] transition-colors"
            >
              Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D8C8]/60 bg-[#FAF7F2]/50 text-[11px] uppercase font-bold text-[#746D69] tracking-wider">
                  <th className="py-4 px-6">Therapist Profile</th>
                  <th className="py-4 px-4">Employee ID</th>
                  <th className="py-4 px-4">Contact</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Skill Specializations</th>
                  <th className="py-4 px-4">Joining Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/40 text-xs">
                {staffList.map((st) => {
                  const assignedCats = (st.categoryIds || []).map((c) =>
                    typeof c === "string" ? c : c.name
                  );
                  const assignedSrvs = (st.serviceIds || []).length;

                  return (
                    <tr
                      key={st._id}
                      className="hover:bg-[#FAF7F2]/40 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center font-serif font-bold text-[#CF565D] overflow-hidden shrink-0">
                            {st.profileImage ? (
                              <img
                                src={st.profileImage}
                                alt={st.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              st.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-serif font-bold text-[#292525] block group-hover:text-[#CF565D] transition-colors">
                              {st.name}
                            </span>
                            <span className="text-[11px] text-[#746D69] block">
                              {st.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span className="px-2 py-0.5 rounded-lg bg-[#FAF7F2] border border-[#E8D8C8] text-[11px] text-[#292525]">
                          {st.employeeId || "—"}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-[#746D69]">
                        <span className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-[#CF565D]" />
                          {st.phone}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge
                            status={st.isActive ? "active" : "inactive"}
                          />
                          {st.employmentStatus && (
                            <span className="text-[10px] text-[#746D69] capitalize font-medium">
                              {st.employmentStatus}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Skills & Categories */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {assignedCats.length > 0 ? (
                            assignedCats.slice(0, 2).map((catName, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E8D8C8] text-[10px] font-medium text-[#292525]"
                              >
                                {catName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#746D69] italic">
                              No categories
                            </span>
                          )}
                          {assignedCats.length > 2 && (
                            <span className="text-[10px] text-[#746D69] font-medium">
                              +{assignedCats.length - 2} more
                            </span>
                          )}
                          {assignedSrvs > 0 && (
                            <span className="text-[10px] text-[#CF565D] font-medium ml-1">
                              ({assignedSrvs} services)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-3.5 px-4 text-[#746D69] text-[11px]">
                        {st.joiningDate
                          ? new Date(st.joiningDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewProfile(st)}
                            className="p-1.5 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2] transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2] transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleSendInvite(st)}
                            className="p-1.5 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:text-[#CF565D] hover:bg-[#FAF7F2] transition-colors"
                            title="Send Account Setup Invitation"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setStatusConfirmStaff(st)}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              st.isActive
                                ? "border-emerald-200 text-emerald-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                : "border-rose-200 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                            }`}
                            title={st.isActive ? "Deactivate Staff" : "Activate Staff"}
                          >
                            {st.isActive ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserX className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[#E8D8C8]/60 bg-[#FAF7F2]/30 flex items-center justify-between">
            <span className="text-xs text-[#746D69]">
              Page <strong className="text-[#292525]">{currentPage}</strong> of{" "}
              <strong className="text-[#292525]">{totalPages}</strong> (
              {totalStaff} total staff members)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => loadStaff(currentPage - 1)}
                className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-medium text-[#292525] disabled:opacity-40 disabled:pointer-events-none hover:bg-white transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => loadStaff(currentPage + 1)}
                className="px-3 py-1.5 rounded-xl border border-[#E8D8C8] text-xs font-medium text-[#292525] disabled:opacity-40 disabled:pointer-events-none hover:bg-white transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT STAFF PROFILE
         ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8D8C8]/60 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider">
                  {editingStaff ? "Edit Profile" : "New Therapist Registration"}
                </span>
                <h2 className="text-xl font-serif font-bold text-[#292525] mt-0.5">
                  {editingStaff
                    ? `Update ${editingStaff.name}`
                    : "Add Certified Staff Member"}
                </h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2] hover:text-[#292525]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Layla Al-Mansouri"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Email Address * (Account Login)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="layla@roseessence.ae"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    UAE Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+971 50 123 4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Employee ID (Unique badge / auto-generated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RE-EMP-1042 (leave blank to auto-create)"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D] uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employmentStatus: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  >
                    <option value="full-time">Full-time Regular</option>
                    <option value="part-time">Part-time Therapist</option>
                    <option value="contract">Specialist Contractor</option>
                    <option value="probation">Probation Period</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) =>
                      setFormData({ ...formData, joiningDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                  Profile Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.profileImage}
                  onChange={(e) =>
                    setFormData({ ...formData, profileImage: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Password & Security */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/70 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#CF565D]" />
                  <span className="text-xs font-semibold text-[#292525]">
                    Account Security & Access
                  </span>
                </div>

                {!editingStaff ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sendInvitation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sendInvitation: e.target.checked,
                          })
                        }
                        className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                      />
                      <span className="text-xs text-[#292525] font-medium">
                        Generate secure setup invitation link (Staff sets their own password)
                      </span>
                    </label>

                    {!formData.sendInvitation && (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#746D69] mb-1">
                          Manual Initial Password
                        </label>
                        <input
                          type="password"
                          required={!formData.sendInvitation}
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-xs text-[#292525]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#746D69] mb-1">
                      Reset Password (leave empty to keep current password)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password to change..."
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-xs text-[#292525]"
                    />
                  </div>
                )}
              </div>

              {/* Service Categories Skills */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-2 flex items-center justify-between">
                  <span>Qualified Service Categories</span>
                  <span className="text-[11px] text-[#746D69] font-normal">
                    Selecting a category auto-selects all of its rituals below
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isChecked = formData.categoryIds.includes(cat._id);
                    return (
                      <label
                        key={cat._id}
                        className={`p-2.5 rounded-2xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                          isChecked
                            ? "border-[#CF565D] bg-[#F5DAD6]/30 text-[#292525] font-semibold"
                            : "border-[#E8D8C8] bg-[#FAF7F2] text-[#746D69] hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat._id)}
                          className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Services Skills */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-2 flex items-center justify-between">
                  <span>Specific Service Qualification Overrides</span>
                  <span className="text-[11px] text-[#746D69] font-normal">
                    Auto-selected from categories ({formData.serviceIds.length} qualified)
                  </span>
                </label>
                <div className="max-h-48 overflow-y-auto p-2 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2] space-y-1.5">
                  {services.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[#746D69]">
                      Loading rituals...
                    </div>
                  ) : (
                    services.map((srv) => {
                      const isChecked = formData.serviceIds.includes(srv._id);
                      const srvCatId = getServiceCategoryId(srv);
                      const isAutoFromCategory = formData.categoryIds.includes(srvCatId);
                      const catObj = categories.find((c) => c._id === srvCatId);

                      return (
                        <label
                          key={srv._id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isChecked ? "bg-white shadow-xs" : "hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? formData.serviceIds.filter((id) => id !== srv._id)
                                  : [...formData.serviceIds, srv._id];
                                setFormData({ ...formData, serviceIds: next });
                              }}
                              className="rounded text-[#CF565D] focus:ring-[#CF565D]"
                            />
                            <span
                              className={`truncate font-medium ${
                                isChecked ? "text-[#292525]" : "text-[#746D69]"
                              }`}
                            >
                              {srv.name}
                            </span>
                            {catObj && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8]/60 shrink-0">
                                {catObj.name}
                              </span>
                            )}
                            {isAutoFromCategory && isChecked && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F5DAD6]/50 text-[#CF565D] font-semibold shrink-0">
                                Auto-selected
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#746D69] shrink-0 ml-2">
                            {srv.durationMinutes || 45} mins • AED {srv.price}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-1.5">
                  Internal Operational Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Speaks Arabic & English. CID registered. Specialist in Moroccan Bath and Deep Tissue."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-md hover:bg-[#b8454c] disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingStaff ? "Save Profile Changes" : "Register Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIEW STAFF PROFILE DRAWER
         ======================================================== */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#F5DAD6] border border-[#E8D8C8] flex items-center justify-center text-xl font-serif font-bold text-[#CF565D] overflow-hidden">
                  {viewingStaff.profileImage ? (
                    <img
                      src={viewingStaff.profileImage}
                      alt={viewingStaff.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    viewingStaff.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#292525]">
                    {viewingStaff.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-[#CF565D] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#E8D8C8]">
                      {viewingStaff.employeeId || "RE-STAFF"}
                    </span>
                    <StatusBadge
                      status={viewingStaff.isActive ? "active" : "inactive"}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingStaff(null)}
                className="p-2 rounded-2xl border border-[#E8D8C8] text-[#746D69] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Info Details */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7F2] text-xs">
              <div>
                <span className="text-[#746D69] block text-[11px]">Email</span>
                <span className="font-medium text-[#292525] break-all">
                  {viewingStaff.email}
                </span>
              </div>
              <div>
                <span className="text-[#746D69] block text-[11px]">Phone</span>
                <span className="font-medium text-[#292525]">
                  {viewingStaff.phone}
                </span>
              </div>
              <div>
                <span className="text-[#746D69] block text-[11px]">Employment</span>
                <span className="font-medium text-[#292525] capitalize">
                  {viewingStaff.employmentStatus || "Full-time"}
                </span>
              </div>
              <div>
                <span className="text-[#746D69] block text-[11px]">Joining Date</span>
                <span className="font-medium text-[#292525]">
                  {viewingStaff.joiningDate
                    ? new Date(viewingStaff.joiningDate).toLocaleDateString("en-GB")
                    : "—"}
                </span>
              </div>
            </div>

            {/* Shift & Working Hours */}
            <div className="p-4 rounded-2xl border border-[#E8D8C8] space-y-2">
              <span className="text-xs font-semibold text-[#292525] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#CF565D]" />
                Standard UAE Shift Hours
              </span>
              <p className="text-xs text-[#746D69]">
                Working Hours:{" "}
                <strong className="text-[#292525]">
                  {viewingStaff.workingHours?.start || "09:00"} –{" "}
                  {viewingStaff.workingHours?.end || "21:00"} GST
                </strong>
              </p>
              <p className="text-xs text-[#746D69]">
                Breaks:{" "}
                <span className="text-[#292525] font-medium">
                  {viewingStaff.breaks && viewingStaff.breaks.length > 0
                    ? viewingStaff.breaks
                        .map((b) => `${b.start}-${b.end}${b.label ? ` (${b.label})` : ""}`)
                        .join(", ")
                    : "Flexible (chosen by staff based on free time)"}
                </span>
              </p>
            </div>

            {/* Stats if available */}
            {staffStats && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]">
                  <span className="text-xl font-serif font-bold text-[#292525]">
                    {staffStats.totalAssigned}
                  </span>
                  <span className="text-[11px] text-[#746D69] block">
                    Total Assignments
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]">
                  <span className="text-xl font-serif font-bold text-emerald-700">
                    {staffStats.completed}
                  </span>
                  <span className="text-[11px] text-[#746D69] block">
                    Completed Rituals
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {viewingStaff.notes && (
              <div className="text-xs text-[#746D69] bg-[#FAF7F2] p-3 rounded-2xl">
                <strong className="text-[#292525] block mb-0.5">Notes:</strong>
                {viewingStaff.notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const toEdit = viewingStaff;
                  setViewingStaff(null);
                  handleOpenEdit(toEdit);
                }}
                className="px-4 py-2 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c]"
              >
                Edit Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: INVITATION / PASSWORD SETUP LINK
         ======================================================== */}
      {invitationModalData && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5DAD6] flex items-center justify-center text-[#CF565D] mb-1">
              <Send className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-serif font-bold text-[#292525]">
                Account Invitation Generated
              </h3>
              <p className="text-xs text-[#746D69] mt-1">
                Share this secure password setup link with{" "}
                <strong className="text-[#292525]">{invitationModalData.name}</strong>.
                The link is valid for 48 hours and allows them to securely configure
                their staff portal credentials.
              </p>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8] flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={invitationModalData.url}
                className="bg-transparent text-xs text-[#292525] font-mono w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invitationModalData.url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#CF565D] text-white text-xs font-semibold shrink-0 hover:bg-[#b8454c] flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInvitationModalData(null)}
                className="px-4 py-2 rounded-2xl bg-[#292525] text-white text-xs font-semibold hover:bg-black"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM ACTIVATION / DEACTIVATION
         ======================================================== */}
      {statusConfirmStaff && (
        <div className="fixed inset-0 bg-[#292525]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div
              className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
                statusConfirmStaff.isActive
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-serif font-bold text-[#292525]">
                {statusConfirmStaff.isActive
                  ? "Deactivate Staff Member?"
                  : "Reactivate Staff Member?"}
              </h3>
              <p className="text-xs text-[#746D69] mt-1.5 leading-relaxed">
                {statusConfirmStaff.isActive
                  ? `Deactivating ${statusConfirmStaff.name} will immediately exclude them from booking availability calculations and prevent staff portal logins.`
                  : `Reactivating ${statusConfirmStaff.name} will restore their availability in the scheduling engine and re-enable portal access.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setStatusConfirmStaff(null)}
                className="px-4 py-2 rounded-2xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                disabled={statusSubmitting}
                onClick={handleConfirmStatusToggle}
                className={`px-5 py-2 rounded-2xl text-white text-xs font-semibold shadow-md ${
                  statusConfirmStaff.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {statusSubmitting ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
