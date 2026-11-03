"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  adminServiceCategoryApi,
  serviceCategoryApi,
  ServiceCategory,
} from "../../../lib/api-client";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
  Eye,
} from "lucide-react";

export default function AdminServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Notification message
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // Delete modal states
  const [categoryToDelete, setCategoryToDelete] =
    useState<ServiceCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    displayOrder: 0,
    isActive: true,
  });

  const loadCategories = useCallback(async () => {
    try {
      const res = await adminServiceCategoryApi.getAll();
      if (res.success && Array.isArray(res.categories)) {
        setCategories(res.categories);
      }
    } catch (err: unknown) {
      // Fallback: try public endpoint
      try {
        const pub = await serviceCategoryApi.getAll();
        if (pub.success && Array.isArray(pub.categories)) {
          setCategories(pub.categories);
        }
      } catch {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load categories.",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    setMessage(null);
    loadCategories();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: "",
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  // Auto-generate slug from name if creating or slug was auto-generated
  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: val };
      if (!editingCategory) {
        next.slug = val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
      }
      return next;
    });
  };

  // Submit Add or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "Category name is required." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (editingCategory) {
        const res = await adminServiceCategoryApi.update(
          editingCategory._id,
          formData
        );
        if (res.success) {
          setMessage({
            type: "success",
            text: `Category "${res.category.name}" updated successfully.`,
          });
          setIsModalOpen(false);
          await loadCategories();
        }
      } else {
        const res = await adminServiceCategoryApi.create(formData);
        if (res.success) {
          setMessage({
            type: "success",
            text: `Category "${res.category.name}" created successfully.`,
          });
          setIsModalOpen(false);
          await loadCategories();
        }
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save category.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (cat: ServiceCategory) => {
    try {
      const nextStatus = !cat.isActive;
      const res = await adminServiceCategoryApi.toggleStatus(
        cat._id,
        nextStatus
      );
      if (res.success) {
        setMessage({
          type: "success",
          text: `Category "${cat.name}" is now ${
            nextStatus ? "active" : "inactive"
          }.`,
        });
        await loadCategories();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to update category status.",
      });
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await adminServiceCategoryApi.delete(categoryToDelete._id);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Category "${categoryToDelete.name}" deleted successfully.`,
        });
        setCategoryToDelete(null);
        await loadCategories();
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to delete category.";
      setDeleteError(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description &&
          cat.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && cat.isActive) ||
        (statusFilter === "inactive" && !cat.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const activeCount = categories.filter((c) => c.isActive).length;
  const inactiveCount = categories.filter((c) => !c.isActive).length;
  const totalServices = categories.reduce(
    (acc, curr) => acc + (curr.serviceCount || 0),
    0
  );

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
            <span className="text-[#CF565D] font-semibold">Service Categories</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#292525]">
            Service Categories
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Organize luxury at-home rituals into client-facing categories (Face, Hair, Nail, Massage).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing ? "animate-spin text-[#CF565D]" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/services"
            className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold hover:border-[#CF565D] transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>Manage Services</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold tracking-wide shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#CF565D]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between border ${
            message.type === "success"
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
          <button
            onClick={() => setMessage(null)}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          2. METRIC PILL COUNTERS
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center text-[#292525]">
            <Layers className="w-5 h-5 text-[#CF565D]" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">
              Total Categories
            </span>
            <span className="text-xl font-extrabold text-[#292525]">
              {categories.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">
              Active Public
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">
              Inactive / Draft
            </span>
            <span className="text-xl font-extrabold text-stone-700">
              {inactiveCount}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#746D69] uppercase font-semibold block">
              Linked Services
            </span>
            <span className="text-xl font-extrabold text-[#292525]">
              {totalServices > 0 ? totalServices : "20 Bespoke"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. CONTROLS BAR: SEARCH & STATUS FILTER
         ======================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8]/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-[#746D69] font-medium hidden sm:inline">
            Status:
          </span>
          {["all", "active", "inactive"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? "bg-[#292525] text-white shadow-xs"
                  : "bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8] hover:text-[#292525]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          4. MAIN CATEGORIES TABLE
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-[#E8D8C8]/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#CF565D] mb-3" />
            <p className="text-xs font-semibold text-[#292525]">
              Loading service categories...
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#292525]">
              No service categories found
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mt-1">
              {searchQuery
                ? `No categories match "${searchQuery}". Try clearing search.`
                : "Get started by adding your first luxury beauty ritual category."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 rounded-xl bg-[#292525] text-white text-xs font-bold hover:bg-[#1a1717]"
              >
                + Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8D8C8]/50 bg-[#FAF7F2]/60 text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
                  <th className="py-3.5 px-5">Category & Visual</th>
                  <th className="py-3.5 px-5">Slug</th>
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5 text-center">Display Order</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/30 text-xs">
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat._id}
                    className="hover:bg-[#FAF7F2]/40 transition-colors"
                  >
                    {/* Visual & Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-[#E8D8C8] overflow-hidden shrink-0 relative">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#292525] text-sm flex items-center gap-2">
                            <span>{cat.name}</span>
                            {cat.serviceCount !== undefined && (
                              <span className="text-[10px] font-semibold bg-[#FAF7F2] text-[#746D69] px-2 py-0.5 rounded-full border border-[#E8D8C8]">
                                {cat.serviceCount} services
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#746D69]">
                            {cat.slug === "face"
                              ? "Facials, Dermaplaning & Glow"
                              : cat.slug === "hair"
                              ? "Blow Dry, Styling & Head Spa"
                              : cat.slug === "nail"
                              ? "Manicure, Pedicure & Gel"
                              : cat.slug === "massage"
                              ? "Hammam & Body Relaxation"
                              : "Beauty Category"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-5 font-mono text-[11px] text-[#746D69]">
                      <span className="bg-[#FAF7F2] px-2 py-1 rounded-md border border-[#E8D8C8]/60">
                        {cat.slug}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-5 text-[#746D69] max-w-xs truncate">
                      {cat.description || "—"}
                    </td>

                    {/* Display Order */}
                    <td className="py-3.5 px-5 text-center font-bold text-[#292525]">
                      {cat.displayOrder || 0}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => handleToggleStatus(cat)}
                        className="cursor-pointer"
                        title={
                          cat.isActive
                            ? "Click to deactivate"
                            : "Click to activate"
                        }
                      >
                        <StatusBadge
                          status={cat.isActive ? "active" : "inactive"}
                          size="sm"
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/services?category=${cat._id}`}
                          className="p-1.5 rounded-lg text-[#746D69] hover:text-[#292525] hover:bg-[#FAF7F2]"
                          title="View category services"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-[#746D69] hover:text-[#CF565D] hover:bg-[#FCF4F2] transition-colors"
                          title="Edit category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setCategoryToDelete(cat);
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          5. MODAL: ADD / EDIT SERVICE CATEGORY
         ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#292525]">
                    {editingCategory ? "Edit Category" : "Add Service Category"}
                  </h3>
                  <p className="text-[11px] text-[#746D69]">
                    {editingCategory
                      ? `Updating "${editingCategory.name}"`
                      : "Create a new beauty ritual classification"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Face, Hair, Nail, Massage"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Unique Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. face, hair-styling"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
                <span className="text-[10px] text-[#746D69] mt-0.5 block">
                  Used in URLs: /services/{formData.slug || "slug"}
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description for customer catalog..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-semibold text-[#292525] mb-1">
                  Category Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, image: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
                {formData.image && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-[#E8D8C8]">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Display Order & Active Switch */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        displayOrder: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#292525] mb-1">
                    Publish Status
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: !prev.isActive,
                      }))
                    }
                    className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                      formData.isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-stone-100 text-stone-600 border-stone-300"
                    }`}
                  >
                    {formData.isActive ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Active (Public)</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        <span>Draft (Hidden)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white font-bold tracking-wide shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CF565D]" />
                  )}
                  <span>
                    {editingCategory ? "Save Changes" : "Create Category"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: DELETE CATEGORY CONFIRMATION & SAFETY CHECK
         ======================================================== */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8] shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#292525]">
                  Delete Category?
                </h3>
                <p className="text-xs text-[#746D69]">
                  {categoryToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#746D69] leading-relaxed mb-4">
              Deleting a category is irreversible. If any services are still attached to this category, deletion will be blocked by system safety rules to protect historical catalog integrity.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8D8C8]/60">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
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
