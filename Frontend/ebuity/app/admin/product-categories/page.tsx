"use client";

import React, { useState, useEffect, useId, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  adminCategoryApi,
  adminProductApi,
  ApiError,
} from "../../../lib/api-client";
import {
  FlatCategoryItem,
  ProductCategoryNode,
} from "../../../types/product";
import {
  Tag,
  Plus,
  RefreshCw,
  FolderTree,
  Edit2,
  Trash2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Upload,
  Info,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

export default function AdminProductCategoriesPage() {
  const fileInputId = useId();

  // State
  const [treeCategories, setTreeCategories] = useState<ProductCategoryNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategoryItem[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryNode | null>(null);
  const [label, setLabel] = useState("");
  const [parent, setParent] = useState<string>("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Guard Modal
  const [deleteTarget, setDeleteTarget] = useState<ProductCategoryNode | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load Categories & Product Counts
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [treeRes, flatRes, productsRes] = await Promise.all([
        adminCategoryApi.getCategories(),
        adminCategoryApi.getFlat(),
        adminProductApi.getAll({ page: 1, limit: 100 }),
      ]);

      const tree = (treeRes as ProductCategoryNode[]) || [];
      const flat = flatRes?.items || [];
      setTreeCategories(tree);
      setFlatCategories(flat);

      // Compute product counts per category
      const counts: Record<string, number> = {};
      if (productsRes && productsRes.items) {
        productsRes.items.forEach((item) => {
          const cat = item.product.category;
          const sub = item.product.subcategory;
          const catId = typeof cat === "object" && cat ? cat._id : String(cat || "");
          const subId = typeof sub === "object" && sub ? sub._id : String(sub || "");
          if (catId) counts[catId] = (counts[catId] || 0) + 1;
          if (subId && subId !== catId) counts[subId] = (counts[subId] || 0) + 1;
        });
      }
      setProductCounts(counts);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load product categories";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setLabel("");
    setParent("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setModalError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat: ProductCategoryNode) => {
    setEditingCategory(cat);
    setLabel(cat.label || "");
    setParent(cat.parent ? String(cat.parent) : "");
    setDescription(cat.description || "");
    setImageFile(null);
    setImagePreview(cat.image || null);
    setModalError(null);
    setModalOpen(true);
  };

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // Submit Modal (Create or Update)
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setModalError("Category label is required.");
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const formData = new FormData();
      formData.append("label", label.trim());
      if (parent) {
        formData.append("parent", parent);
      }
      if (description) {
        formData.append("description", description.trim());
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editingCategory) {
        await adminCategoryApi.update(editingCategory._id, formData);
        setNotification({
          type: "success",
          message: `Category "${label}" updated successfully.`,
        });
      } else {
        await adminCategoryApi.create(formData);
        setNotification({
          type: "success",
          message: `New category "${label}" created successfully.`,
        });
      }

      setModalOpen(false);
      setTimeout(() => setNotification(null), 3000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to save category";
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Delete Guard Modal
  const handleInitiateDelete = (cat: ProductCategoryNode) => {
    setDeleteTarget(cat);
    setDeleteBlockedReason(null);

    // Guard 1: Has child categories
    const hasChildren = (cat.children && cat.children.length > 0) || false;
    if (hasChildren) {
      setDeleteBlockedReason(
        `This category has ${cat.children?.length} subcategories. Please reassign or delete child categories first.`
      );
      return;
    }

    // Guard 2: Has linked products
    const linkedCount = productCounts[cat._id] || 0;
    if (linkedCount > 0) {
      setDeleteBlockedReason(
        `This category contains ${linkedCount} active product(s). To protect product integrity, please reassign those products before deleting this category.`
      );
      return;
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteBlockedReason) return;

    try {
      setDeleting(true);
      await adminCategoryApi.delete(deleteTarget._id);
      setNotification({
        type: "success",
        message: `Category "${deleteTarget.label}" deleted.`,
      });
      setDeleteTarget(null);
      setTimeout(() => setNotification(null), 3000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete category";
      setNotification({ type: "error", message: msg });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#292525]">
              Product Categories
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D] text-xs font-bold tracking-wider uppercase">
              Boutique Taxonomy
            </span>
          </div>
          <p className="text-xs text-[#746D69] mt-0.5">
            Organize Rose Essence collections, skincare rituals, body care, and wellness elixirs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] hover:border-[#CF565D]/40 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Taxonomy"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-md shadow-[#CF565D]/20 hover:bg-[#b8454c] active:scale-[0.99] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Info Alert */}
      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#CF565D] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#746D69] leading-relaxed">
          <span className="font-semibold text-[#292525]">Category Safety Policy: </span>
          Categories cannot be deleted if child subcategories or products are currently linked to
          them. Reassign products in the{" "}
          <Link href="/admin/products" className="text-[#CF565D] underline font-semibold">
            Product Management
          </Link>{" "}
          table prior to removal.
        </div>
      </div>

      {/* Main Categories Display */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-stone-100 rounded" />
                  <div className="h-3 w-1/2 bg-stone-100 rounded" />
                </div>
                <div className="h-8 w-20 bg-stone-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              Error Loading Categories
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => loadData()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : treeCategories.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-[#F5DAD6]/50 border border-[#F5DAD6] text-[#CF565D] flex items-center justify-center mx-auto">
              <Tag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Categories Created Yet
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">
              Create your primary boutique categories such as Skincare, Body Care, or Wellness.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Category
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#FAF7F2]">
            {treeCategories.map((rootCat) => {
              const rootProductCount = productCounts[rootCat._id] || 0;
              const hasSubcategories = rootCat.children && rootCat.children.length > 0;

              return (
                <div key={rootCat._id} className="p-5 hover:bg-[#FAF7F2]/30 transition-colors">
                  {/* Root Node Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-2xl bg-[#F5DAD6]/40 border border-[#E8D8C8] overflow-hidden flex items-center justify-center flex-shrink-0 text-[#CF565D]">
                        {rootCat.image ? (
                          <Image
                            src={rootCat.image}
                            alt={rootCat.label}
                            fill
                            sizes="48px"
                            className="object-cover object-center"
                          />
                        ) : (
                          <Layers className="w-6 h-6" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-serif font-bold text-[#292525]">
                            {rootCat.label}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8] text-[10px] font-bold uppercase tracking-wider">
                            Root Category
                          </span>
                        </div>
                        {rootCat.description && (
                          <p className="text-xs text-[#746D69] mt-0.5 line-clamp-1 max-w-md">
                            {rootCat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#746D69]">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#CF565D]" />
                        <span>{rootProductCount} products</span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(rootCat)}
                          title="Edit category"
                          className="p-2 rounded-xl hover:bg-stone-100 text-[#746D69] hover:text-[#CF565D] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInitiateDelete(rootCat)}
                          title="Delete category"
                          className="p-2 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories Tree Branch */}
                  {hasSubcategories && (
                    <div className="mt-4 ml-6 pl-6 border-l-2 border-[#E8D8C8] space-y-3">
                      {rootCat.children!.map((subCat) => {
                        const subProductCount = productCounts[subCat._id] || 0;

                        return (
                          <div
                            key={subCat._id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#FAF7F2]/60 border border-[#E8D8C8]/60"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight className="w-4 h-4 text-[#CF565D] flex-shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-[#292525]">
                                  {subCat.label}
                                </p>
                                {subCat.description && (
                                  <p className="text-[11px] text-[#746D69] line-clamp-1">
                                    {subCat.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <span className="text-[11px] font-medium text-[#746D69]">
                                {subProductCount} products
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(subCat)}
                                  title="Edit subcategory"
                                  className="p-1.5 rounded-lg hover:bg-white text-[#746D69] hover:text-[#CF565D] transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleInitiateDelete(subCat)}
                                  title="Delete subcategory"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-serif font-bold text-[#292525]">
                  {editingCategory ? "Edit Category" : "Add Product Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Category Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Damascus Facial Serums"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Parent Category
                </label>
                <select
                  value={parent}
                  onChange={(e) => setParent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] cursor-pointer"
                >
                  <option value="">None (Top-Level / Root Category)</option>
                  {flatCategories
                    .filter((c) => !editingCategory || c._id !== editingCategory._id)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.pathLabel || c.label}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-[#746D69] mt-1">
                  Leave empty to create a primary root category.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Artisanal formulations crafted with Damascus Rosa..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/10 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                  Category Image
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#E8D8C8] bg-stone-50 flex-shrink-0">
                      <Image
                        src={imagePreview}
                        alt="Category preview"
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <label
                    htmlFor={fileInputId}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-dashed border-[#E8D8C8] hover:border-[#CF565D] bg-[#FAF7F2]/40 text-center cursor-pointer text-xs font-medium text-[#746D69] hover:text-[#292525] transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-[#CF565D]" />
                    <span>Choose image file</span>
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#FAF7F2]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation / Guard Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-xl space-y-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                deleteBlockedReason
                  ? "bg-amber-50 border border-amber-200 text-amber-600"
                  : "bg-rose-50 border border-rose-200 text-rose-600"
              }`}
            >
              {deleteBlockedReason ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#292525]">
                {deleteBlockedReason ? "Deletion Restricted" : "Delete Category?"}
              </h3>
              <p className="text-xs text-[#746D69] leading-relaxed">
                {deleteBlockedReason || (
                  <>
                    Are you sure you want to delete category{" "}
                    <span className="font-bold text-[#292525]">
                      &quot;{deleteTarget.label}&quot;
                    </span>
                    ? This action cannot be undone.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50 transition-colors"
              >
                {deleteBlockedReason ? "Understood" : "Cancel"}
              </button>
              {!deleteBlockedReason && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
