"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  adminServiceApi,
  adminServiceCategoryApi,
  serviceApi,
  serviceCategoryApi,
  uploadApi,
  Service,
  ServiceCategory,
} from "../../../lib/api-client";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Clock,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Heart,
  RefreshCw,
  X,
  Check,
  Tag,
  Image as ImageIcon,
  ShieldCheck,
  FileText,
  Info,
  Zap,
  Upload,
} from "lucide-react";

function AdminServicesManagementContent() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category") || "all";

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [womenOnlyFilter, setWomenOnlyFilter] = useState<boolean | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Notification message
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View modal
  const [viewingService, setViewingService] = useState<Service | null>(null);

  // Delete modal
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    category: "",
    price: 350,
    duration: 60,
    shortDescription: "",
    fullDescription: "",
    preparationInstructions: "",
    images: [] as string[],
    imageUrlInput: "",
    womenOnly: false,
    isActive: true,
    isFeatured: false,
    isExclusiveDeal: false,
    dealPrice: 249,
    dealDiscountPercentage: 25,
    dealBadge: "Today's Exclusive",
    dealDescription: "",
    dealEndsAt: "",
    displayOrder: 0,
  });

  // Quick Deal Modal State
  const [dealModalService, setDealModalService] = useState<Service | null>(null);
  const [dealFormData, setDealFormData] = useState({
    isExclusiveDeal: true,
    dealPrice: 249,
    dealDiscountPercentage: 25,
    dealBadge: "Today's Exclusive",
    dealDescription: "",
    dealEndsAt: "",
  });
  const [savingDeal, setSavingDeal] = useState(false);

  // Service Image Upload & URL State
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [serviceImageMode, setServiceImageMode] = useState<"upload" | "url">("upload");
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingServiceImage(true);
      setImageUploadError(null);
      const res = await uploadApi.uploadImage(file);
      if (res && res.url) {
        setFormData((prev) => ({
          ...prev,
          imageUrlInput: res.url,
          images: [res.url],
        }));
      }
    } catch (err: unknown) {
      console.error("Service image upload failed:", err);
      setImageUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingServiceImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveServiceImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrlInput: "",
      images: [],
    }));
    setImageUploadError(null);
  };

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [catsRes, servsRes] = await Promise.all([
        adminServiceCategoryApi.getAll().catch(() => serviceCategoryApi.getAll()),
        adminServiceApi.getAll({ limit: 100 }).catch(() => serviceApi.getAll({ limit: 100 })),
      ]);

      if (catsRes && "categories" in catsRes && Array.isArray(catsRes.categories)) {
        setCategories(catsRes.categories);
      }

      if (servsRes && "services" in servsRes && Array.isArray(servsRes.services)) {
        setServices(servsRes.services);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load services.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    setMessage(null);
    loadData();
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingService(null);
    const defaultCatId = categories.length > 0 ? categories[0]._id : "";
    setFormData({
      name: "",
      slug: "",
      category: defaultCatId,
      price: 350,
      duration: 60,
      shortDescription: "",
      fullDescription: "",
      preparationInstructions: "",
      images: [],
      imageUrlInput: "",
      womenOnly: false,
      isActive: true,
      isFeatured: false,
      isExclusiveDeal: false,
      dealPrice: 249,
      dealDiscountPercentage: 25,
      dealBadge: "Today's Exclusive",
      dealDescription: "",
      dealEndsAt: "",
      displayOrder: services.length + 1,
    });
    setUploadingServiceImage(false);
    setServiceImageMode("upload");
    setImageUploadError(null);
    setMessage(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    const catId = typeof s.category === "object" && s.category !== null ? s.category._id : (s.category || "");
    const regularPrice = s.price || 350;
    const initialDealPrice = s.dealPrice != null ? s.dealPrice : Math.round(regularPrice * 0.75);
    const initialPct = s.dealDiscountPercentage != null ? s.dealDiscountPercentage : Math.round(((regularPrice - initialDealPrice) / regularPrice) * 100);

    setFormData({
      name: s.name,
      slug: s.slug,
      category: catId,
      price: s.price,
      duration: s.duration || s.durationMinutes || 60,
      shortDescription: s.shortDescription || "",
      fullDescription: s.fullDescription || "",
      preparationInstructions: s.preparationInstructions || "",
      images: Array.isArray(s.images) ? s.images : [],
      imageUrlInput: s.images?.[0] || "",
      womenOnly: Boolean(s.womenOnly),
      isActive: s.isActive !== false,
      isFeatured: Boolean(s.isFeatured),
      isExclusiveDeal: Boolean(s.isExclusiveDeal),
      dealPrice: initialDealPrice,
      dealDiscountPercentage: initialPct,
      dealBadge: s.dealBadge || "Today's Exclusive",
      dealDescription: s.dealDescription || "",
      dealEndsAt: s.dealEndsAt ? new Date(s.dealEndsAt).toISOString().slice(0, 16) : "",
      displayOrder: s.displayOrder || 0,
    });
    setUploadingServiceImage(false);
    setServiceImageMode(s.images?.[0]?.startsWith("http") ? "url" : "upload");
    setImageUploadError(null);
    setMessage(null);
    setIsFormModalOpen(true);
  };

  // Quick Deal Modal Open & Save
  const handleOpenDealModal = (s: Service) => {
    setDealModalService(s);
    const regPrice = s.price || 350;
    const defaultDealPrice = s.dealPrice != null ? s.dealPrice : Math.round(regPrice * 0.75);
    const defaultPct = s.dealDiscountPercentage != null ? s.dealDiscountPercentage : Math.max(5, Math.round(((regPrice - defaultDealPrice) / regPrice) * 100));
    setDealFormData({
      isExclusiveDeal: s.isExclusiveDeal !== false,
      dealPrice: defaultDealPrice,
      dealDiscountPercentage: defaultPct,
      dealBadge: s.dealBadge || "Today's Exclusive",
      dealDescription: s.dealDescription || "",
      dealEndsAt: s.dealEndsAt ? new Date(s.dealEndsAt).toISOString().slice(0, 16) : "",
    });
  };

  const handleSaveDealModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealModalService) return;
    setSavingDeal(true);
    try {
      const res = await adminServiceApi.update(dealModalService._id, {
        isExclusiveDeal: Boolean(dealFormData.isExclusiveDeal),
        dealPrice: dealFormData.isExclusiveDeal && dealFormData.dealPrice ? Number(dealFormData.dealPrice) : null,
        dealDiscountPercentage: dealFormData.isExclusiveDeal && dealFormData.dealDiscountPercentage ? Number(dealFormData.dealDiscountPercentage) : null,
        dealBadge: dealFormData.dealBadge?.trim() || "Today's Exclusive",
        dealDescription: dealFormData.dealDescription?.trim() || "",
        dealEndsAt: dealFormData.dealEndsAt ? new Date(dealFormData.dealEndsAt).toISOString() : null,
      });
      if (res.success) {
        setMessage({
          type: "success",
          text: `Today's Deal for "${res.service.name}" ${dealFormData.isExclusiveDeal ? "activated" : "removed"} successfully.`,
        });
        setDealModalService(null);
        await loadData();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update deal.",
      });
    } finally {
      setSavingDeal(false);
    }
  };

  // Auto-slug generator on name typing
  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: val };
      if (!editingService) {
        next.slug = val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
      }
      return next;
    });
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "Service name is required." });
      return;
    }
    if (!formData.category) {
      setMessage({ type: "error", text: "Please select a service category." });
      return;
    }
    if (formData.price < 0) {
      setMessage({ type: "error", text: "Price must be a positive value in AED." });
      return;
    }
    if (formData.duration < 5) {
      setMessage({ type: "error", text: "Duration must be at least 5 minutes." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      category: formData.category,
      price: Number(formData.price),
      duration: Number(formData.duration),
      durationMinutes: Number(formData.duration),
      shortDescription: formData.shortDescription.trim(),
      fullDescription: formData.fullDescription.trim(),
      preparationInstructions: formData.preparationInstructions.trim(),
      images: formData.imageUrlInput ? [formData.imageUrlInput.trim()] : formData.images,
      womenOnly: formData.womenOnly,
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      isExclusiveDeal: formData.isExclusiveDeal,
      dealPrice: formData.isExclusiveDeal && formData.dealPrice ? Number(formData.dealPrice) : null,
      dealDiscountPercentage: formData.isExclusiveDeal && formData.dealDiscountPercentage ? Number(formData.dealDiscountPercentage) : null,
      dealBadge: formData.dealBadge?.trim() || "Today's Exclusive",
      dealDescription: formData.dealDescription?.trim() || "",
      dealEndsAt: formData.dealEndsAt ? new Date(formData.dealEndsAt).toISOString() : null,
      displayOrder: formData.displayOrder,
    };

    try {
      if (editingService) {
        const res = await adminServiceApi.update(editingService._id, payload);
        if (res.success) {
          setMessage({
            type: "success",
            text: `Service "${res.service.name}" updated successfully.`,
          });
          setIsFormModalOpen(false);
          await loadData();
        }
      } else {
        const res = await adminServiceApi.create(payload);
        if (res.success) {
          setMessage({
            type: "success",
            text: `Service "${res.service.name}" created successfully.`,
          });
          setIsFormModalOpen(false);
          await loadData();
        }
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (s: Service) => {
    try {
      const nextStatus = !s.isActive;
      const res = await adminServiceApi.toggleStatus(s._id, nextStatus);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Service "${s.name}" is now ${nextStatus ? "active" : "deactivated"}.`,
        });
        await loadData();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update status.",
      });
    }
  };

  // Delete service
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setDeleting(true);

    try {
      const res = await adminServiceApi.delete(serviceToDelete._id);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Service "${serviceToDelete.name}" deleted.`,
        });
        setServiceToDelete(null);
        await loadData();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete service.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.shortDescription && s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));

      const catId = typeof s.category === "object" && s.category !== null ? s.category._id : s.category;
      const matchesCategory =
        selectedCategory === "all" || catId === selectedCategory;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "deals" && Boolean(s.isExclusiveDeal)) ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive);

      const matchesWomenOnly =
        womenOnlyFilter === null || s.womenOnly === womenOnlyFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesWomenOnly;
    });
  }, [services, searchQuery, selectedCategory, statusFilter, womenOnlyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);

  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.filter((s) => !s.isActive).length;
  const dealsCount = services.filter((s) => s.isExclusiveDeal).length;
  const womenOnlyCount = services.filter((s) => s.womenOnly).length;

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. HEADER & BREADCRUMBS
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D8C8]/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#746D69] mb-1">
            <Link href="/admin" className="hover:text-[#CF565D] transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#292525] font-semibold">Catalog</span>
            <span>/</span>
            <span className="text-[#CF565D] font-semibold">Services & Rituals</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#292525]">
            Services & Beauty Rituals
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Manage at-home wellness treatments, prices in AED, durations, preparation guides, and women-only settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#CF565D]" : ""}`} />
            <span>Sync Catalog</span>
          </button>

          <Link
            href="/admin/service-categories"
            className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold hover:border-[#CF565D] transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>Categories</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold tracking-wide shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#CF565D]" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between border ${message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          2. METRIC PILL COUNTERS
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">Total Services</span>
            <span className="text-xl font-extrabold text-[#292525]">{services.length}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "deals" ? "all" : "deals");
            setCurrentPage(1);
          }}
          className={`rounded-2xl p-4 border text-left transition-all cursor-pointer ${statusFilter === "deals"
            ? "bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400/40"
            : "bg-white border-[#E8D8C8]/60 shadow-xs hover:border-amber-300"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-[#CF565D] text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-[11px] text-[#746D69] uppercase font-semibold block">Today's Deals</span>
              <span className="text-xl font-extrabold text-amber-700">{dealsCount}</span>
            </div>
          </div>
        </button>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">Active Public</span>
            <span className="text-xl font-extrabold text-emerald-700">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">Inactive Drafts</span>
            <span className="text-xl font-extrabold text-stone-700">{inactiveCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <Heart className="w-5 h-5 text-[#CF565D]" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">Women-Only</span>
            <span className="text-xl font-extrabold text-[#292525]">{womenOnlyCount}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. CONTROLS BAR: SEARCH, CATEGORY FILTER & STATUS
         ======================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service title, slug, or details..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] font-semibold focus:outline-none focus:border-[#CF565D] cursor-pointer"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-[#746D69] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-xl border border-[#E8D8C8]">
            {[
              { id: "all", label: "All" },
              { id: "deals", label: `⚡ Deals (${dealsCount})` },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Drafts" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === st.id
                  ? "bg-[#292525] text-white shadow-xs"
                  : "text-[#746D69] hover:text-[#292525]"
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Women only quick toggle */}
          <button
            onClick={() => {
              setWomenOnlyFilter((prev) => (prev === null ? true : prev === true ? false : null));
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${womenOnlyFilter === true
              ? "bg-[#FCF4F2] text-[#CF565D] border-[#CF565D]"
              : womenOnlyFilter === false
                ? "bg-stone-100 text-stone-700 border-stone-300"
                : "bg-[#FAF7F2] text-[#746D69] border-[#E8D8C8]"
              }`}
            title="Cycle: All / Women Only / General"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>
              {womenOnlyFilter === true
                ? "Women Only"
                : womenOnlyFilter === false
                  ? "General"
                  : "Audience: All"}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          4. SERVICES TABLE
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-[#E8D8C8]/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold text-[#292525]">Loading beauty rituals...</p>
          </div>
        ) : paginatedServices.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#292525]">No services match your filters</h3>
            <p className="text-xs text-[#746D69] max-w-sm mt-1">
              Try adjusting your search query, category selection, or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D8C8]/50 bg-[#FAF7F2]/60 text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
                  <th className="py-3.5 px-5">Service & Category</th>
                  <th className="py-3.5 px-5">Duration</th>
                  <th className="py-3.5 px-5">Price (AED)</th>
                  <th className="py-3.5 px-5">Audience</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/30 text-xs">
                {paginatedServices.map((service) => {
                  const categoryName =
                    typeof service.category === "object" && service.category !== null
                      ? service.category.name
                      : "Ritual";

                  const thumbImage = service.images?.[0] || "";

                  return (
                    <tr key={service._id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                      {/* Service Name & Category */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-stone-100 border border-[#E8D8C8] overflow-hidden shrink-0">
                            {thumbImage ? (
                              <img src={thumbImage} alt={service.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                                <Sparkles className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[#292525] text-sm flex items-center gap-2">
                              <span>{service.name}</span>
                              {service.isExclusiveDeal && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5 fill-current text-amber-600" />
                                  <span>{service.dealBadge || "Today's Deal"}</span>
                                </span>
                              )}
                              {service.isFeatured && (
                                <span className="text-[10px] font-bold bg-[#FAF7F2] text-[#CF565D] px-1.5 py-0.2 rounded border border-[#E8D8C8]">
                                  Featured
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#746D69] mt-0.5">
                              <span className="font-medium text-[#CF565D]">{categoryName}</span>
                              <span>·</span>
                              <span className="font-mono text-stone-400">/{service.slug}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] font-semibold text-xs">
                          <Clock className="w-3 h-3 text-[#CF565D]" />
                          <span>{service.duration || service.durationMinutes || 60} mins</span>
                        </span>
                      </td>

                      {/* Price in AED */}
                      <td className="py-3.5 px-5">
                        {service.isExclusiveDeal && service.dealPrice != null ? (
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-extrabold text-[#CF565D] text-sm">
                                AED {service.dealPrice}
                              </span>
                              <span className="text-[11px] text-[#746D69]/60 line-through">
                                {service.price}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 w-fit mt-0.5">
                              ⚡ Deal {service.dealDiscountPercentage ? `(-${service.dealDiscountPercentage}%)` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-[#292525] text-sm">
                            AED {service.price}
                          </span>
                        )}
                      </td>

                      {/* Audience */}
                      <td className="py-3.5 px-5">
                        {service.womenOnly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <Heart className="w-3 h-3 text-[#CF565D]" />
                            <span>Women Only</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#746D69] bg-stone-100 px-2 py-0.5 rounded-full">
                            All Clients
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => handleToggleStatus(service)}
                          className="cursor-pointer"
                          title={service.isActive ? "Click to deactivate" : "Click to activate"}
                        >
                          <StatusBadge status={service.isActive ? "active" : "inactive"} size="sm" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDealModal(service)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${service.isExclusiveDeal
                              ? "text-amber-700 bg-amber-100 hover:bg-amber-200"
                              : "text-[#746D69] hover:text-amber-600 hover:bg-amber-50"
                              }`}
                            title={service.isExclusiveDeal ? "Edit Today's Exclusive Deal" : "Set as Today's Exclusive Deal"}
                          >
                            <Zap className={`w-4 h-4 ${service.isExclusiveDeal ? "fill-amber-600 text-amber-600" : ""}`} />
                          </button>

                          <button
                            onClick={() => setViewingService(service)}
                            className="p-1.5 rounded-lg text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2]"
                            title="Quick view"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(service)}
                            className="p-1.5 rounded-lg text-[#746D69] hover:text-[#CF565D] hover:bg-[#FCF4F2] transition-colors"
                            title="Edit service"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setServiceToDelete(service)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete service"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {filteredServices.length > itemsPerPage && (
          <div className="p-4 border-t border-[#E8D8C8]/50 flex items-center justify-between text-xs text-[#746D69] bg-[#FAF7F2]/40">
            <div>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredServices.length)} of {filteredServices.length} services
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-[#E8D8C8] disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-[#292525]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-[#E8D8C8] disabled:opacity-40 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          5. MODAL: ADD / EDIT SERVICE
         ======================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#292525]">
                    {editingService ? "Edit Service" : "Add New Ritual"}
                  </h3>
                  <p className="text-[11px] text-[#746D69]">
                    {editingService ? `Editing "${editingService.name}"` : "Create bespoke at-home beauty treatment"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Moroccan Bath & Hammam"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] font-semibold focus:outline-none focus:border-[#CF565D]"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Slug & Price & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Unique Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. royal-moroccan-bath"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3.5 py-2.5 font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Price (AED) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="350"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] font-bold focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Duration (Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    placeholder="60"
                    value={formData.duration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: parseInt(e.target.value, 10) || 60 }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] font-bold focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Short Description (Catalog subtitle)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Traditional Black Olive Soap scrub and eucalyptus steam ritual."
                  value={formData.shortDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Full Ritual Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of the service ritual, benefits, and experience..."
                  value={formData.fullDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullDescription: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Preparation Instructions */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Client Preparation Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please ensure a quiet room with an accessible power outlet. Towels are provided by our specialist."
                  value={formData.preparationInstructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, preparationInstructions: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Service Showcase Image (Upload file OR provide URL) */}
              <div className="space-y-3 bg-[#FAF7F2]/60 p-4 rounded-2xl border border-[#E8D8C8]/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#292525] uppercase tracking-wider">
                      Service Showcase Image
                    </label>
                    <p className="text-[11px] text-[#746D69] mt-0.5">
                      Upload an image file from your device or paste an external image URL.
                    </p>
                  </div>

                  {/* Mode Toggle Pills */}
                  <div className="flex items-center p-1 bg-white rounded-xl border border-[#E8D8C8] text-xs shadow-2xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setServiceImageMode("upload")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        serviceImageMode === "upload"
                          ? "bg-[#CF565D] text-white shadow-xs"
                          : "text-[#746D69] hover:text-[#292525]"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceImageMode("url")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        serviceImageMode === "url"
                          ? "bg-[#CF565D] text-white shadow-xs"
                          : "text-[#746D69] hover:text-[#292525]"
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Image URL</span>
                    </button>
                  </div>
                </div>

                {/* Upload File Input Tab */}
                {serviceImageMode === "upload" && (
                  <div>
                    <label
                      className={`relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl bg-white hover:bg-[#FDF3F1]/40 border-[#E8D8C8] hover:border-[#CF565D] transition-all cursor-pointer text-center ${
                        uploadingServiceImage ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleServiceImageUpload}
                        className="sr-only"
                        disabled={uploadingServiceImage}
                      />
                      {uploadingServiceImage ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#CF565D]" />
                          <span className="text-xs font-semibold text-[#292525]">
                            Uploading image to server...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <div className="w-10 h-10 rounded-xl bg-[#F5DAD6]/60 text-[#CF565D] flex items-center justify-center mb-1">
                            <Upload className="w-5 h-5 stroke-[2]" />
                          </div>
                          <span className="text-xs font-bold text-[#292525]">
                            Click or drag image file here
                          </span>
                          <span className="text-[11px] text-[#746D69]">
                            PNG, JPG, WEBP, AVIF, SVG up to 15MB
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* URL Input Tab */}
                {serviceImageMode === "url" && (
                  <div>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-... or /uploads/..."
                        value={formData.imageUrlInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            imageUrlInput: val,
                            images: val.trim() ? [val.trim()] : [],
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/10"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Error Alert */}
                {imageUploadError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{imageUploadError}</span>
                  </p>
                )}

                {/* Image Preview & Details */}
                {(formData.imageUrlInput || formData.images[0]) && (
                  <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E8D8C8] shadow-2xs">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E8D8C8] shrink-0 bg-[#FAF7F2]">
                      <img
                        src={formData.imageUrlInput || formData.images[0]}
                        alt="Service showcase preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-[#292525] truncate">
                        Selected Image
                      </span>
                      <span className="block text-[11px] text-[#746D69] truncate">
                        {formData.imageUrlInput || formData.images[0]}
                      </span>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Ready to save
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveServiceImage}
                      title="Remove image"
                      className="p-2 text-[#746D69] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* ========================================================
                  TODAY'S EXCLUSIVE DEAL SECTION
                 ======================================================== */}
              <div className={`p-4 rounded-2xl border transition-all ${formData.isExclusiveDeal
                ? "bg-gradient-to-br from-amber-50/90 via-[#FAF7F2] to-rose-50/60 border-amber-300 shadow-xs"
                : "bg-[#FAF7F2] border-[#E8D8C8]"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.isExclusiveDeal ? "bg-amber-500 text-white shadow-xs" : "bg-stone-200 text-stone-500"
                      }`}>
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#292525]">Today's Exclusive Deal</h4>
                      <p className="text-[11px] text-[#746D69]">
                        Feature this service with a limited-time exclusive discount today.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => {
                        const nextDeal = !prev.isExclusiveDeal;
                        const reg = prev.price || 350;
                        return {
                          ...prev,
                          isExclusiveDeal: nextDeal,
                          dealPrice: nextDeal && (!prev.dealPrice || prev.dealPrice >= reg) ? Math.round(reg * 0.75) : prev.dealPrice,
                          dealDiscountPercentage: nextDeal && !prev.dealDiscountPercentage ? 25 : prev.dealDiscountPercentage,
                        };
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${formData.isExclusiveDeal
                      ? "bg-amber-500 text-white shadow-xs hover:bg-amber-600"
                      : "bg-white text-stone-600 border border-[#E8D8C8] hover:border-amber-400"
                      }`}
                  >
                    {formData.isExclusiveDeal ? "Deal Active" : "Enable Deal"}
                  </button>
                </div>

                {formData.isExclusiveDeal && (
                  <div className="mt-4 pt-4 border-t border-amber-200/80 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#292525] mb-1">
                          Promotional Deal Price (AED) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#CF565D]">AED</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={formData.dealPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFormData((prev) => {
                                const reg = prev.price || 1;
                                const discountPct = Math.max(0, Math.min(100, Math.round(((reg - val) / reg) * 100)));
                                return { ...prev, dealPrice: val, dealDiscountPercentage: discountPct };
                              });
                            }}
                            className="w-full pl-13 pr-3.5 py-2 text-xs font-extrabold bg-white border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                          />
                        </div>
                        {formData.price > formData.dealPrice && (
                          <span className="text-[10px] font-semibold text-emerald-700 mt-1 block">
                            Customer saves AED {formData.price - formData.dealPrice}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#292525] mb-1">
                          Discount Percentage (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.dealDiscountPercentage}
                            onChange={(e) => {
                              const pct = parseInt(e.target.value, 10) || 0;
                              setFormData((prev) => {
                                const reg = prev.price || 1;
                                const newDealPrice = Math.max(0, Math.round(reg * (1 - pct / 100)));
                                return { ...prev, dealDiscountPercentage: pct, dealPrice: newDealPrice };
                              });
                            }}
                            className="w-full px-3.5 py-2 text-xs font-extrabold bg-white border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746D69]">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#292525] mb-1">
                          Deal Badge / Label
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Today's Exclusive, Flash 25% OFF"
                          value={formData.dealBadge}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dealBadge: e.target.value }))}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#292525] mb-1">
                          Deal Expiry Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.dealEndsAt}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dealEndsAt: e.target.value }))}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#292525] mb-1">
                        Deal Highlight Subtitle (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Special daily promotion for in-home ritual appointments."
                        value={formData.dealDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dealDescription: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles: Women Only & Publish Status */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, womenOnly: !prev.womenOnly }))}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 font-semibold transition-all ${formData.womenOnly
                    ? "bg-rose-50 text-rose-800 border-rose-300"
                    : "bg-[#FAF7F2] text-[#746D69] border-[#E8D8C8]"
                    }`}
                >
                  <Heart className={`w-4 h-4 ${formData.womenOnly ? "text-[#CF565D]" : "text-stone-400"}`} />
                  <div className="text-left">
                    <span className="block text-xs font-bold text-[#292525]">Women-Only Ritual</span>
                    <span className="text-[10px] text-[#746D69]">
                      {formData.womenOnly ? "Restricted to female clients" : "Open for all clients"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 font-semibold transition-all ${formData.isActive
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-stone-100 text-stone-600 border-stone-300"
                    }`}
                >
                  {formData.isActive ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <X className="w-4 h-4 text-stone-400" />
                  )}
                  <div className="text-left">
                    <span className="block text-xs font-bold text-[#292525]">Publish Status</span>
                    <span className="text-[10px] text-[#746D69]">
                      {formData.isActive ? "Active (Online Booking Open)" : "Inactive / Draft"}
                    </span>
                  </div>
                </button>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white font-bold tracking-wide shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CF565D]" />}
                  <span>{editingService ? "Save Service Changes" : "Create Service"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: VIEW SERVICE DETAILS
         ======================================================== */}
      {viewingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-[#CF565D]">
                Service Specification
              </span>
              <button onClick={() => setViewingService(null)} className="p-1 rounded-lg text-[#746D69]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingService.images?.[0] && (
              <div className="mt-4 w-full h-44 rounded-2xl overflow-hidden border border-[#E8D8C8]">
                <img src={viewingService.images[0]} alt={viewingService.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="mt-4">
              <h2 className="text-xl font-bold text-[#292525]">{viewingService.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-[#CF565D] bg-[#FCF4F2] px-3 py-1 rounded-full border border-[#F5DAD6]">
                  AED {viewingService.price}
                </span>
                <span className="text-xs font-semibold text-[#292525] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E8D8C8]">
                  {viewingService.duration || viewingService.durationMinutes} Minutes
                </span>
                <StatusBadge status={viewingService.isActive ? "active" : "inactive"} size="sm" />
                {viewingService.womenOnly && (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Women-Only
                  </span>
                )}
              </div>
            </div>

            {viewingService.isExclusiveDeal && (
              <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-300 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Today's Exclusive Deal Active ({viewingService.dealBadge || "Exclusive Deal"})</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-extrabold text-[#CF565D]">
                    Deal Price: AED {viewingService.dealPrice}
                  </span>
                  <span className="text-xs text-stone-400 line-through">
                    Regular: AED {viewingService.price}
                  </span>
                  {viewingService.dealDiscountPercentage && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Save {viewingService.dealDiscountPercentage}%
                    </span>
                  )}
                </div>
                {viewingService.dealDescription && (
                  <p className="text-[11px] text-[#746D69] mt-1.5">{viewingService.dealDescription}</p>
                )}
              </div>
            )}

            {viewingService.shortDescription && (
              <p className="text-xs text-[#746D69] mt-3 leading-relaxed">
                {viewingService.shortDescription}
              </p>
            )}

            {viewingService.preparationInstructions && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]/70 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#292525] mb-1">
                  <Info className="w-4 h-4 text-[#CF565D]" />
                  <span>Preparation Instructions</span>
                </div>
                <p className="text-[#746D69] text-[11px] leading-relaxed">
                  {viewingService.preparationInstructions}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[#E8D8C8]/60 flex items-center justify-between">
              <button
                onClick={() => {
                  const s = viewingService;
                  setViewingService(null);
                  handleOpenEdit(s);
                }}
                className="px-4 py-2 rounded-xl bg-[#292525] text-white text-xs font-bold hover:bg-[#1a1717]"
              >
                Edit Service
              </button>
              <button
                onClick={() => setViewingService(null)}
                className="text-xs font-semibold text-[#746D69] hover:text-[#292525]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7. MODAL: QUICK TODAY'S EXCLUSIVE DEAL
         ======================================================== */}
      {dealModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-amber-300 shadow-2xl overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#292525]">Today's Exclusive Deal</h3>
                  <p className="text-[11px] text-[#746D69] truncate max-w-[200px]">{dealModalService.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDealModalService(null)}
                className="p-1 rounded-lg text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDealModal} className="mt-4 space-y-4">
              {/* Toggle Deal Status */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]">
                <div>
                  <span className="block text-xs font-bold text-[#292525]">Feature in Today's Deals</span>
                  <span className="text-[11px] text-[#746D69]">
                    {dealFormData.isExclusiveDeal ? "Active on client frontend with deal pricing" : "Disabled (regular price applies)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDealFormData((prev) => ({ ...prev, isExclusiveDeal: !prev.isExclusiveDeal }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${dealFormData.isExclusiveDeal
                    ? "bg-amber-500 text-white shadow-xs hover:bg-amber-600"
                    : "bg-white text-stone-600 border border-[#E8D8C8]"
                    }`}
                >
                  {dealFormData.isExclusiveDeal ? "Active" : "Disabled"}
                </button>
              </div>

              {dealFormData.isExclusiveDeal && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#292525] mb-1">
                        Deal Price (AED) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#CF565D]">AED</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={dealFormData.dealPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const reg = dealModalService.price || 1;
                            const pct = Math.max(0, Math.min(100, Math.round(((reg - val) / reg) * 100)));
                            setDealFormData((prev) => ({ ...prev, dealPrice: val, dealDiscountPercentage: pct }));
                          }}
                          className="w-full pl-12 pr-3 py-2 text-xs font-extrabold bg-[#FAF7F2] border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Regular: AED {dealModalService.price}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#292525] mb-1">
                        Discount (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={dealFormData.dealDiscountPercentage}
                          onChange={(e) => {
                            const pct = parseInt(e.target.value, 10) || 0;
                            const reg = dealModalService.price || 1;
                            const newDealPrice = Math.max(0, Math.round(reg * (1 - pct / 100)));
                            setDealFormData((prev) => ({ ...prev, dealDiscountPercentage: pct, dealPrice: newDealPrice }));
                          }}
                          className="w-full px-3 py-2 text-xs font-extrabold bg-[#FAF7F2] border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746D69]">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#292525] mb-1">
                      Deal Badge Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Today's Exclusive, Flash 25% OFF"
                      value={dealFormData.dealBadge}
                      onChange={(e) => setDealFormData((prev) => ({ ...prev, dealBadge: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#292525] mb-1">
                      Deal Expiry Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={dealFormData.dealEndsAt}
                      onChange={(e) => setDealFormData((prev) => ({ ...prev, dealEndsAt: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDealModalService(null)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8D8C8] text-[#746D69] text-xs font-semibold hover:text-[#292525]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDeal}
                  className="px-4 py-2 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingDeal && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                  <span>{dealFormData.isExclusiveDeal ? "Save Today's Deal" : "Remove Deal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          8. MODAL: DELETE SERVICE CONFIRMATION
         ======================================================== */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#292525]">Delete Service?</h3>
                <p className="text-xs text-[#746D69]">{serviceToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#746D69] leading-relaxed mb-4">
              Are you sure you want to permanently delete this service? If clients have previously booked this service, historical appointment snapshots are preserved, but deactivating the service instead is recommended to retain operational records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8D8C8]/60">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-[#746D69] text-xs font-semibold hover:text-[#292525]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminServicesManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#CF565D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminServicesManagementContent />
    </Suspense>
  );
}
