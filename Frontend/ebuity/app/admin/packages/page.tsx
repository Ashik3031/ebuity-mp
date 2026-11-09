"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  adminPackageApi,
  adminServiceApi,
  Package,
  PackageFormData,
  PackageCategory,
  Service,
} from "../../../lib/api-client";
import {
  Gift,
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
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
  Check,
  Tag,
  Image as ImageIcon,
  CheckSquare,
  Square,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";

const CATEGORIES: PackageCategory[] = [
  "Bridal & Events",
  "Spa & Wellness",
  "Grooming & Nails",
  "Seasonal Offers",
  "General",
];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80";

export default function AdminPackagesPage() {
  // Data states
  const [packages, setPackages] = useState<Package[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PackageFormData>({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    category: "Spa & Wellness",
    services: [],
    inclusions: [],
    originalPrice: 450,
    price: 350,
    currency: "AED",
    discountPercentage: 22,
    durationMinutes: 90,
    badge: "Special Offer",
    images: [DEFAULT_IMAGE],
    isFeatured: false,
    isActive: true,
  });

  const [inclusionInput, setInclusionInput] = useState("");
  const [imageInput, setImageInput] = useState("");

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch packages and services
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgRes, srvRes] = await Promise.all([
        adminPackageApi.getAll(),
        adminServiceApi.getAll({ limit: 100 }),
      ]);

      if (pkgRes.success) {
        setPackages(pkgRes.packages || []);
      }
      if (srvRes.success) {
        setAllServices(srvRes.services || []);
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load packages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        searchQuery === "" ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "all" || pkg.category === selectedCategory;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && pkg.isActive) ||
        (statusFilter === "inactive" && !pkg.isActive);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [packages, searchQuery, selectedCategory, statusFilter]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      slug: "",
      tagline: "",
      description: "",
      category: "Spa & Wellness",
      services: [],
      inclusions: ["Complimentary Botanical Infusion Refreshment"],
      originalPrice: 450,
      price: 349,
      currency: "AED",
      discountPercentage: 22,
      durationMinutes: 90,
      badge: "Signature Ritual",
      images: [DEFAULT_IMAGE],
      isFeatured: false,
      isActive: true,
    });
    setInclusionInput("");
    setImageInput("");
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    const serviceIds = (pkg.services || []).map((s: any) =>
      typeof s === "string" ? s : s._id
    );

    setFormData({
      name: pkg.name,
      slug: pkg.slug,
      tagline: pkg.tagline || "",
      description: pkg.description || "",
      category: pkg.category || "Spa & Wellness",
      services: serviceIds,
      inclusions: pkg.inclusions || [],
      originalPrice: pkg.originalPrice,
      price: pkg.price,
      currency: pkg.currency || "AED",
      discountPercentage: pkg.discountPercentage || 0,
      durationMinutes: pkg.durationMinutes || 90,
      badge: pkg.badge || "",
      images: pkg.images && pkg.images.length > 0 ? pkg.images : [DEFAULT_IMAGE],
      isFeatured: pkg.isFeatured,
      isActive: pkg.isActive,
    });
    setInclusionInput("");
    setImageInput("");
    setIsFormModalOpen(true);
  };

  // Calculate discount percentage automatically when prices change
  const handlePriceChange = (original: number, special: number) => {
    let discount = 0;
    if (original > 0 && special < original) {
      discount = Math.round(((original - special) / original) * 100);
    }
    setFormData((prev) => ({
      ...prev,
      originalPrice: original,
      price: special,
      discountPercentage: discount,
    }));
  };

  // Toggle service selection in package
  const toggleServiceSelection = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.services.includes(serviceId);
      const newServices = exists
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId];

      // Auto update duration and suggested original price if adding
      const selectedServiceObjs = allServices.filter((s) =>
        newServices.includes(s._id)
      );
      const calculatedDuration = selectedServiceObjs.reduce(
        (sum, s) => sum + (s.duration || 60),
        0
      );
      const calculatedOriginal = selectedServiceObjs.reduce(
        (sum, s) => sum + (s.price || 0),
        0
      );

      return {
        ...prev,
        services: newServices,
        durationMinutes: calculatedDuration > 0 ? calculatedDuration : prev.durationMinutes,
        originalPrice: calculatedOriginal > 0 ? calculatedOriginal : prev.originalPrice,
        discountPercentage:
          calculatedOriginal > 0 && prev.price < calculatedOriginal
            ? Math.round(((calculatedOriginal - prev.price) / calculatedOriginal) * 100)
            : prev.discountPercentage,
      };
    });
  };

  // Inclusions handling
  const addInclusion = () => {
    if (!inclusionInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, inclusionInput.trim()],
    }));
    setInclusionInput("");
  };

  const removeInclusion = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== idx),
    }));
  };

  // Image handling
  const addImage = () => {
    if (!imageInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, imageInput.trim()],
    }));
    setImageInput("");
  };

  const removeImage = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  // Submit create / edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification("error", "Package name is required");
      return;
    }
    if (formData.price <= 0 || formData.originalPrice <= 0) {
      showNotification("error", "Please provide valid original and package prices");
      return;
    }

    try {
      setSubmitting(true);
      if (editingPackage) {
        const res = await adminPackageApi.update(editingPackage._id, formData);
        if (res.success) {
          showNotification("success", "Package updated successfully");
          setIsFormModalOpen(false);
          fetchData();
        }
      } else {
        const res = await adminPackageApi.create(formData);
        if (res.success) {
          showNotification("success", "Package created successfully");
          setIsFormModalOpen(false);
          fetchData();
        }
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to save package");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (pkg: Package) => {
    try {
      const res = await adminPackageApi.toggleStatus(pkg._id, !pkg.isActive);
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) => (p._id === pkg._id ? { ...p, isActive: !p.isActive } : p))
        );
        showNotification(
          "success",
          `Package "${pkg.name}" is now ${!pkg.isActive ? "Active" : "Inactive"}`
        );
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to update package status");
    }
  };

  // Delete package
  const handleDelete = async () => {
    if (!packageToDelete) return;
    try {
      setDeleting(true);
      const res = await adminPackageApi.delete(packageToDelete._id);
      if (res.success) {
        setPackages((prev) => prev.filter((p) => p._id !== packageToDelete._id));
        showNotification("success", "Package deleted successfully");
        setPackageToDelete(null);
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete package");
    } finally {
      setDeleting(false);
    }
  };

  // Quick stats
  const totalCount = packages.length;
  const activeCount = packages.filter((p) => p.isActive).length;
  const featuredCount = packages.filter((p) => p.isFeatured).length;
  const avgDiscount =
    packages.length > 0
      ? Math.round(
        packages.reduce((sum, p) => sum + (p.discountPercentage || 0), 0) /
        packages.length
      )
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${notification.type === "success"
            ? "bg-[#292525] text-white border border-[#CF565D]/30"
            : "bg-red-600 text-white"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#CF565D]" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-white" />
          )}
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Title and Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8D8C8]/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-[#F5DAD6] text-[#CF565D]">
              <Gift className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
              Catalog & Special Offers
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-[#292525]">
            Packages & Offers
          </h1>
          <p className="text-sm text-[#746D69] mt-1">
            Create and manage bundled ceremony packages with special pricing and custom inclusions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 text-[#746D69] hover:text-[#292525] bg-[#FAF7F2] hover:bg-[#F5DAD6]/40 rounded-2xl border border-[#E8D8C8]/60 transition-colors"
            title="Refresh packages"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/packages"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#292525] hover:text-[#CF565D] bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8]/60 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Customer View</span>
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-semibold rounded-2xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Package</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8D8C8]/60 shadow-sm">
          <div className="text-xs font-medium text-[#746D69]">Total Packages</div>
          <div className="text-2xl font-display text-[#292525] mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8D8C8]/60 shadow-sm">
          <div className="text-xs font-medium text-[#746D69]">Active on Site</div>
          <div className="text-2xl font-display text-[#CF565D] mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8D8C8]/60 shadow-sm">
          <div className="text-xs font-medium text-[#746D69]">Featured Offers</div>
          <div className="text-2xl font-display text-[#292525] mt-1">{featuredCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8D8C8]/60 shadow-sm">
          <div className="text-xs font-medium text-[#746D69]">Average Savings</div>
          <div className="text-2xl font-display text-emerald-600 mt-1">{avgDiscount}%</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8D8C8]/60 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by package name, tagline, or inclusions..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF7F2] border border-[#E8D8C8]/60 rounded-2xl text-[#292525] placeholder-[#746D69]/60 focus:outline-none focus:border-[#CF565D]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#746D69] hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E8D8C8]/60 rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E8D8C8]/60 rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Package List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-[#CF565D] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#746D69]">Loading packages & offers...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4 text-[#CF565D]">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-serif font-medium text-[#292525]">No packages found</h3>
          <p className="text-sm text-[#746D69] max-w-md mx-auto mt-1 mb-6">
            {searchQuery || selectedCategory !== "all" || statusFilter !== "all"
              ? "No packages match the current filters. Try resetting the search or category."
              : "You have not created any package services yet. Click below to bundle services into a customer package."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#CF565D] hover:bg-[#b8454c] text-white text-sm font-semibold rounded-2xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Package</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const serviceCount = pkg.services?.length || 0;
            const inclusionsCount = pkg.inclusions?.length || 0;
            const displayImg =
              pkg.images && pkg.images.length > 0 ? pkg.images[0] : DEFAULT_IMAGE;

            return (
              <div
                key={pkg._id}
                className="bg-white rounded-3xl border border-[#E8D8C8]/70 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="relative h-48 w-full bg-[#FAF7F2] overflow-hidden group">
                    <img
                      src={displayImg}
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-white/95 text-[#292525] backdrop-blur-md shadow-sm">
                        {pkg.category}
                      </span>
                      {pkg.badge && (
                        <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-[#CF565D] text-white shadow-sm">
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    {/* Active toggle button badge */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleToggleStatus(pkg)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-md transition-all shadow-sm ${pkg.isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-neutral-800 text-neutral-300"
                          }`}
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {/* Bottom Title overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center gap-2 text-xs text-white/80 mb-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{pkg.durationMinutes} mins ceremony</span>
                        {pkg.isFeatured && (
                          <span className="flex items-center gap-1 text-amber-300 text-xs">
                            <Sparkles className="w-3 h-3" /> Featured
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-medium text-lg leading-snug line-clamp-1 drop-shadow-sm">
                        {pkg.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3.5">
                    {pkg.tagline && (
                      <p className="text-xs text-[#CF565D] font-medium italic line-clamp-1">
                        "{pkg.tagline}"
                      </p>
                    )}

                    {pkg.description && (
                      <p className="text-xs text-[#746D69] line-clamp-2 leading-relaxed">
                        {pkg.description}
                      </p>
                    )}

                    {/* Services Included */}
                    <div className="pt-2 border-t border-[#FAF7F2]">
                      <div className="text-[11px] font-semibold text-[#292525] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Bundled Services ({serviceCount})</span>
                        <span className="text-[#746D69] text-[10px] normal-case">
                          +{inclusionsCount} perks
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.services && pkg.services.length > 0 ? (
                          pkg.services.map((s: any, idx) => {
                            const name = typeof s === "string" ? s : s.name;
                            return (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[11px] bg-[#FAF7F2] text-[#292525] rounded-lg border border-[#E8D8C8]/60 truncate max-w-[160px]"
                              >
                                {name}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-[#746D69]/70 italic">
                            Custom service ritual bundle
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inclusions highlights */}
                    {pkg.inclusions && pkg.inclusions.length > 0 && (
                      <div className="space-y-1">
                        {pkg.inclusions.slice(0, 2).map((inc, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-xs text-[#746D69]"
                          >
                            <Check className="w-3.5 h-3.5 text-[#CF565D] shrink-0" />
                            <span className="truncate">{inc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Pricing and Actions */}
                <div className="p-5 pt-3 bg-[#FAF7F2]/50 border-t border-[#E8D8C8]/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-serif font-bold text-[#CF565D]">
                        AED {pkg.price}
                      </span>
                      {pkg.originalPrice > pkg.price && (
                        <span className="text-xs text-[#746D69] line-through">
                          AED {pkg.originalPrice}
                        </span>
                      )}
                    </div>
                    {pkg.discountPercentage > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Save {pkg.discountPercentage}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPackage(pkg)}
                      className="p-2 text-[#746D69] hover:text-[#292525] hover:bg-white rounded-xl transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(pkg)}
                      className="p-2 text-[#746D69] hover:text-[#CF565D] hover:bg-white rounded-xl transition-colors"
                      title="Edit Package"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPackageToDelete(pkg)}
                      className="p-2 text-[#746D69] hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                      title="Delete Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-[#E8D8C8] shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#E8D8C8] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#CF565D]">
                  {editingPackage ? "Update Package Offer" : "New Signature Package"}
                </span>
                <h2 className="text-xl font-display uppercase tracking-tight text-[#292525] mt-0.5">
                  {editingPackage ? `Edit: ${editingPackage.name}` : "Create Curated Package"}
                </h2>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-[#746D69] hover:text-[#292525] rounded-full hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Package Name & Tagline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Bridal Radiance Glow Ritual"
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. The definitive head-to-toe wedding beauty experience"
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              {/* Row 2: Category, Badge & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Highlight Badge
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. Save 25% | Most Popular"
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#292525] mb-1">
                    Total Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-xs font-semibold text-[#292525] mb-1">
                  Full Package Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the entire experience, flow of ceremonies, and customer benefits..."
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-2xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Row 4: Services Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#292525] uppercase tracking-wider">
                    Select Included Services ({formData.services.length} selected)
                  </label>
                  <span className="text-[11px] text-[#746D69]">
                    Click service to bundle it into this package
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8] grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allServices.length === 0 ? (
                    <div className="text-xs text-[#746D69] col-span-2 py-4 text-center">
                      No services found in database.
                    </div>
                  ) : (
                    allServices.map((srv) => {
                      const isSelected = formData.services.includes(srv._id);
                      return (
                        <div
                          key={srv._id}
                          onClick={() => toggleServiceSelection(srv._id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected
                            ? "bg-white border-[#CF565D] shadow-xs text-[#292525]"
                            : "bg-white/60 border-transparent hover:bg-white text-[#746D69]"
                            }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#CF565D] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[#746D69]/40 shrink-0" />
                            )}
                            <span className="text-xs font-medium truncate">{srv.name}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#CF565D] ml-2 shrink-0">
                            AED {srv.price}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Row 5: Pricing & Auto-Savings */}
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8D8C8] space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#292525] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#CF565D]" />
                  <span>Package Pricing & Savings</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#746D69] mb-1">
                      Individual Value Total (AED) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.originalPrice}
                      onChange={(e) =>
                        handlePriceChange(Number(e.target.value), formData.price)
                      }
                      className="w-full px-4 py-2 text-sm bg-white border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#746D69] mb-1">
                      Package Special Price (AED) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.price}
                      onChange={(e) =>
                        handlePriceChange(formData.originalPrice, Number(e.target.value))
                      }
                      className="w-full px-4 py-2 text-sm bg-white border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#746D69] mb-1">
                      Discount Percentage
                    </label>
                    <div className="flex items-center gap-2 h-10">
                      <span className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                        {formData.discountPercentage}% OFF
                      </span>
                      <span className="text-xs text-[#746D69]">
                        (Customer saves AED {Math.max(0, formData.originalPrice - formData.price)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Custom Inclusions */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#292525]">
                  Custom Ceremony Perks / Inclusions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inclusionInput}
                    onChange={(e) => setInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInclusion();
                      }
                    }}
                    placeholder="e.g. Complimentary organic rose mist, scalp acupressure ritual..."
                    className="flex-1 px-4 py-2 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                  <button
                    type="button"
                    onClick={addInclusion}
                    className="px-4 py-2 bg-[#292525] text-white text-xs font-semibold rounded-xl hover:bg-[#3d3838] transition-colors"
                  >
                    Add Perk
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.inclusions.map((inc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs rounded-xl"
                    >
                      <span>{inc}</span>
                      <button
                        type="button"
                        onClick={() => removeInclusion(idx)}
                        className="text-[#746D69] hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 7: Images */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#292525]">
                  Image URLs
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2 text-sm bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="px-4 py-2 bg-[#292525] text-white text-xs font-semibold rounded-xl hover:bg-[#3d3838] transition-colors"
                  >
                    Add Image
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E8D8C8] group"
                    >
                      <img src={img} alt="Package" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 8: Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#CF565D] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-[#292525]">
                    Active (Visible to Customers)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData({ ...formData, isFeatured: e.target.checked })
                    }
                    className="w-4 h-4 text-[#CF565D] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-[#292525]">
                    Feature on Homepage & Spotlight
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#E8D8C8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#746D69] hover:text-[#292525] bg-[#FAF7F2] rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold rounded-2xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingPackage ? "Save Package" : "Publish Package"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-[#E8D8C8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="relative h-56 bg-[#FAF7F2]">
              <img
                src={
                  viewingPackage.images && viewingPackage.images.length > 0
                    ? viewingPackage.images[0]
                    : DEFAULT_IMAGE
                }
                alt={viewingPackage.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setViewingPackage(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-white/95 text-[#292525] shadow-sm">
                  {viewingPackage.category}
                </span>
                <h3 className="text-xl font-serif font-bold text-white mt-1 drop-shadow-md">
                  {viewingPackage.name}
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {viewingPackage.tagline && (
                <p className="text-xs text-[#CF565D] italic font-medium">
                  "{viewingPackage.tagline}"
                </p>
              )}

              <p className="text-xs text-[#746D69] leading-relaxed">
                {viewingPackage.description || "No description provided."}
              </p>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#FAF7F2]">
                <div>
                  <div className="text-[11px] text-[#746D69]">Total Duration</div>
                  <div className="text-sm font-semibold text-[#292525]">
                    {viewingPackage.durationMinutes} Minutes
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#746D69]">Pricing</div>
                  <div className="text-sm font-bold text-[#CF565D]">
                    AED {viewingPackage.price}{" "}
                    {viewingPackage.originalPrice > viewingPackage.price && (
                      <span className="text-xs text-[#746D69] line-through font-normal">
                        AED {viewingPackage.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inclusions */}
              {viewingPackage.inclusions && viewingPackage.inclusions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                    Package Perks & Inclusions
                  </div>
                  <div className="space-y-1.5">
                    {viewingPackage.inclusions.map((inc, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#746D69]">
                        <Check className="w-3.5 h-3.5 text-[#CF565D]" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingPackage(null)}
                  className="px-5 py-2 text-xs font-semibold text-[#292525] bg-[#FAF7F2] rounded-xl hover:bg-[#F5DAD6]/50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {packageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#E8D8C8] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#292525]">
              Delete "{packageToDelete.name}"?
            </h3>
            <p className="text-xs text-[#746D69] mt-2 mb-6 leading-relaxed">
              Are you sure you want to delete this package offer? This action cannot be undone. Customers will no longer be able to book this package.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPackageToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#746D69] hover:text-[#292525] bg-[#FAF7F2] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Package</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

