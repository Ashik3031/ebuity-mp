"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  adminProductApi,
  adminCategoryApi,
  ApiError,
} from "../../../lib/api-client";
import {
  Product,
  ProductListItem,
  FlatCategoryItem,
} from "../../../types/product";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminProductsPage() {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<FlatCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Action States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load Categories Flat for Filtering
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await adminCategoryApi.getFlat();
        if (res && Array.isArray(res.items)) {
          setCategories(res.items);
        }
      } catch (err) {
        console.warn("Categories fetch error:", err);
      }
    }
    loadCats();
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        page: number;
        limit: number;
        search?: string;
        category?: string;
        isActive?: boolean;
      } = {
        page: currentPage,
        limit: pageSize,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      if (selectedStatus === "active") {
        params.isActive = true;
      } else if (selectedStatus === "inactive") {
        params.isActive = false;
      }

      const res = await adminProductApi.getAll(params);

      if (res && Array.isArray(res.items)) {
        // Map items
        const prods = res.items.map((it: ProductListItem) => it.product);
        setProducts(prods);
        setTotalCount(res.total ?? prods.length);
      } else {
        setProducts([]);
        setTotalCount(0);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load boutique products";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Status Toggle
  const handleToggleStatus = async (product: Product) => {
    const nextStatus = !(product.isActive !== false);
    try {
      setActionLoadingId(product._id);
      await adminProductApi.update(product._id, { isActive: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isActive: nextStatus } : p))
      );
      setNotification({
        type: "success",
        message: `"${product.name}" is now ${nextStatus ? "active" : "inactive"}.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to update product status";
      setNotification({ type: "error", message: msg });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteModalProduct) return;
    try {
      setActionLoadingId(deleteModalProduct._id);
      await adminProductApi.delete(deleteModalProduct._id);
      setNotification({
        type: "success",
        message: `"${deleteModalProduct.name}" removed successfully.`,
      });
      setDeleteModalProduct(null);
      setTimeout(() => setNotification(null), 3000);
      fetchProducts();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete product";
      setNotification({ type: "error", message: msg });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper Stats Calculation
  const totalProductsCount = totalCount;
  const activeProductsCount = products.filter((p) => p.isActive !== false).length;
  const lowStockCount = products.filter(
    (p) => (p.defaultStock ?? p.stock ?? 0) <= 5
  ).length;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Resolve Category Name
  const getCategoryName = (p: Product) => {
    if (typeof p.category === "object" && p.category) {
      return p.category.label || p.category.name || "Boutique";
    }
    const match = categories.find((c) => c._id === p.category || c.value === p.category);
    return match?.label || "Boutique";
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#292525]">
              Boutique Products
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D] text-xs font-bold tracking-wider uppercase">
              Level 5
            </span>
          </div>
          <p className="text-xs text-[#746D69] mt-0.5">
            Manage Rose Essence skincare, elixirs, aromatic mists, and luxury wellness essentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] hover:border-[#CF565D]/40 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/admin/products/new"
            className="px-5 py-2.5 rounded-2xl bg-[#CF565D] text-white text-xs font-semibold shadow-md shadow-[#CF565D]/20 hover:bg-[#b8454c] active:scale-[0.99] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Total Products
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {totalCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Active in Shop
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {activeProductsCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Low / Out of Stock
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {lowStockCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8D8C8]/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] flex items-center justify-center text-[#CF565D]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#746D69] uppercase tracking-wider">
              Categories
            </p>
            <p className="text-xl font-serif font-bold text-[#292525] mt-0.5">
              {categories.length || 2}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-[#E8D8C8]/60 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#746D69]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name, SKU, or brand..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/10 transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] font-medium focus:outline-none focus:border-[#CF565D] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.pathLabel || c.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as "all" | "active" | "inactive");
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-xs text-[#292525] font-medium focus:outline-none focus:border-[#CF565D] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-[#E8D8C8]/60 shadow-sm overflow-hidden">
        {loading ? (
          /* Loading Skeletons */
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-stone-100 rounded" />
                  <div className="h-3 w-1/4 bg-stone-100 rounded" />
                </div>
                <div className="h-4 w-20 bg-stone-100 rounded" />
                <div className="h-6 w-16 bg-stone-100 rounded-full" />
                <div className="h-8 w-24 bg-stone-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              Error Loading Products
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Now
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-[#F5DAD6]/50 border border-[#F5DAD6] text-[#CF565D] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#292525]">
              No Products Found
            </h3>
            <p className="text-xs text-[#746D69] max-w-sm mx-auto">
              {search || selectedCategory !== "all" || selectedStatus !== "all"
                ? "No products match the selected filters. Try resetting search or category parameters."
                : "Your luxury boutique catalog is currently empty. Add your first signature product to get started."}
            </p>
            {search || selectedCategory !== "all" || selectedStatus !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setCurrentPage(1);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-stone-50 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                href="/admin/products/new"
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add First Product
              </Link>
            )}
          </div>
        ) : (
          /* Products Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#FAF7F2] bg-[#FAF7F2]/60 text-[11px] font-bold text-[#746D69] uppercase tracking-wider">
                  <th className="py-4 px-5">Product</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Price (AED)</th>
                  <th className="py-4 px-4">Inventory</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2] text-xs">
                {products.map((p) => {
                  const primaryImg =
                    p.images?.[0] ||
                    "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=400&q=80";
                  const priceVal = p.defaultPrice ?? p.price ?? 0;
                  const compareVal = p.compareAtPrice;
                  const stockVal = p.defaultStock ?? p.stock ?? 0;
                  const isProdActive = p.isActive !== false;
                  const isActionBusy = actionLoadingId === p._id;

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-[#FAF7F2]/40 transition-colors group"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-[#E8D8C8] bg-stone-50 flex-shrink-0">
                            <Image
                              src={primaryImg}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover object-center"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#292525] truncate max-w-[220px]">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-[#746D69] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E8D8C8]">
                                {p.sku || "RE-SKIN-PROD"}
                              </span>
                              {p.size && (
                                <span className="text-[11px] text-[#746D69]">
                                  • {p.size}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F5DAD6]/50 text-[#CF565D] border border-[#F5DAD6]">
                          {getCategoryName(p)}
                        </span>
                      </td>

                      {/* Price in AED */}
                      <td className="py-3.5 px-4 font-medium text-[#292525]">
                        <div className="flex flex-col">
                          <span className="font-bold">
                            AED {Number(priceVal).toFixed(2)}
                          </span>
                          {compareVal && Number(compareVal) > Number(priceVal) && (
                            <span className="text-[10px] text-[#746D69] line-through">
                              AED {Number(compareVal).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              stockVal <= 0
                                ? "bg-rose-500"
                                : stockVal <= 5
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={`font-semibold ${
                              stockVal <= 0
                                ? "text-rose-700"
                                : stockVal <= 5
                                ? "text-amber-700"
                                : "text-[#292525]"
                            }`}
                          >
                            {stockVal <= 0
                              ? "Out of Stock"
                              : `${stockVal} units`}
                          </span>
                        </div>
                      </td>

                      {/* Status & Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <StatusBadge
                            status={isProdActive ? "active" : "inactive"}
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            disabled={isActionBusy}
                            title={isProdActive ? "Deactivate product" : "Activate product"}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isProdActive ? "bg-[#CF565D]" : "bg-stone-300"
                            } ${isActionBusy ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isProdActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview View Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewProduct(p)}
                            title="Quick view product"
                            className="p-1.5 rounded-xl border border-transparent hover:border-[#E8D8C8] hover:bg-white text-[#746D69] hover:text-[#292525] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <Link
                            href={`/admin/products/${p._id}/edit`}
                            title="Edit product details"
                            className="p-1.5 rounded-xl border border-transparent hover:border-[#E8D8C8] hover:bg-white text-[#746D69] hover:text-[#CF565D] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalProduct(p)}
                            title="Delete product"
                            className="p-1.5 rounded-xl border border-transparent hover:border-rose-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
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

        {/* Pagination Bar */}
        {!loading && products.length > 0 && (
          <div className="p-4 border-t border-[#FAF7F2] bg-[#FAF7F2]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#746D69]">
            <p>
              Showing{" "}
              <span className="font-semibold text-[#292525]">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#292525]">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-[#292525]">{totalCount}</span>{" "}
              products
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-[#E8D8C8] bg-white text-[#292525] hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2 text-[#292525]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl border border-[#E8D8C8] bg-white text-[#292525] hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8D8C8] p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#292525]">
                Delete Boutique Product?
              </h3>
              <p className="text-xs text-[#746D69]">
                Are you sure you want to permanently remove{" "}
                <span className="font-bold text-[#292525]">
                  &quot;{deleteModalProduct.name}&quot;
                </span>
                ? This action cannot be undone and will delete all associated variants.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoadingId === deleteModalProduct._id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                {actionLoadingId === deleteModalProduct._id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View / Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-[#E8D8C8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D] text-[10px] font-bold uppercase tracking-wider">
                  Product Details
                </span>
                <span className="font-mono text-xs text-[#746D69]">
                  {previewProduct.sku || "RE-SKIN-PROD"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Product Cover Image */}
                <div className="relative w-full sm:w-48 aspect-square rounded-2xl overflow-hidden border border-[#E8D8C8] bg-stone-50 flex-shrink-0">
                  <Image
                    src={
                      previewProduct.images?.[0] ||
                      "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={previewProduct.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 192px"
                    className="object-cover object-center"
                  />
                </div>

                {/* Main Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider">
                      {previewProduct.brandName || "Rose Essence"}
                    </span>
                    <h2 className="text-xl font-serif font-bold text-[#292525] mt-0.5">
                      {previewProduct.name}
                    </h2>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-[#292525]">
                      AED {Number(previewProduct.defaultPrice ?? previewProduct.price ?? 0).toFixed(2)}
                    </span>
                    {previewProduct.compareAtPrice &&
                      Number(previewProduct.compareAtPrice) >
                        Number(previewProduct.defaultPrice ?? previewProduct.price ?? 0) && (
                        <span className="text-sm text-[#746D69] line-through">
                          AED {Number(previewProduct.compareAtPrice).toFixed(2)}
                        </span>
                      )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusBadge
                      status={previewProduct.isActive !== false ? "active" : "inactive"}
                      size="sm"
                    />
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8]">
                      Stock: {previewProduct.defaultStock ?? previewProduct.stock ?? 0} units
                    </span>
                    {previewProduct.size && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8]">
                        Size: {previewProduct.size}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {previewProduct.description && (
                <div>
                  <h4 className="text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                    Catalog Summary
                  </h4>
                  <p className="text-xs text-[#746D69] leading-relaxed bg-[#FAF7F2]/50 p-3.5 rounded-2xl border border-[#E8D8C8]/60">
                    {previewProduct.description}
                  </p>
                </div>
              )}

              {/* Detailed Ritual / Ingredients */}
              {previewProduct.detailedDescription && (
                <div>
                  <h4 className="text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                    Detailed Ritual & Usage Notes
                  </h4>
                  <p className="text-xs text-[#746D69] leading-relaxed bg-[#FAF7F2]/50 p-3.5 rounded-2xl border border-[#E8D8C8]/60">
                    {previewProduct.detailedDescription}
                  </p>
                </div>
              )}

              {/* Tags */}
              {previewProduct.tags && previewProduct.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                    Product Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewProduct.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-white border border-[#E8D8C8] text-[11px] font-medium text-[#292525]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#FAF7F2] bg-[#FAF7F2]/40 flex items-center justify-between">
              <Link
                href={`/shop/${previewProduct.slug || previewProduct._id}`}
                target="_blank"
                className="text-xs font-semibold text-[#CF565D] hover:underline flex items-center gap-1.5"
              >
                <span>View on Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewProduct(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8D8C8] text-xs font-semibold text-[#746D69] hover:bg-stone-50"
                >
                  Close
                </button>
                <Link
                  href={`/admin/products/${previewProduct._id}/edit`}
                  className="px-4 py-2 rounded-xl bg-[#CF565D] text-white text-xs font-semibold hover:bg-[#b8454c] transition-colors"
                >
                  Edit Product
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
