"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  adminInventoryApi,
  InventorySummary,
  InventoryProductItem,
  InventoryMovementItem,
  BackInStockWaitlistItem,
  ApiError,
} from "../../../lib/api-client";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Minus,
  Edit3,
  Truck,
  History,
  Bell,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Sparkles,
  Layers,
  X,
  Clock,
  ArrowRight,
  Check,
  Tag,
} from "lucide-react";

export default function AdminInventoryPage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"catalog" | "movements" | "waitlist" | "receive">("catalog");

  // Summary State
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Products Table State
  const [products, setProducts] = useState<InventoryProductItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("stock_asc");
  const productLimit = 12;

  // Movements Audit Log State
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [movementPage, setMovementPage] = useState(1);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");

  // Waitlist State
  const [waitlist, setWaitlist] = useState<BackInStockWaitlistItem[]>([]);
  const [totalWaitlist, setTotalWaitlist] = useState(0);
  const [waitlistPage, setWaitlistPage] = useState(1);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [notifyingProductId, setNotifyingProductId] = useState<string | null>(null);

  // Stock Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<InventoryProductItem | null>(null);
  const [adjustVariantId, setAdjustVariantId] = useState<string>("");
  const [adjustMode, setAdjustMode] = useState<"add" | "subtract" | "set">("add");
  const [adjustQuantity, setAdjustQuantity] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>("Cycle count adjustment");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Inbound Batch Receiving State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [batchSupplier, setBatchSupplier] = useState("Rose Essence Dubai Laboratory");
  const [batchNote, setBatchNote] = useState("Standard boutique replenishment");
  const [batchItems, setBatchItems] = useState<Array<{ productId: string; variantId?: string; quantity: number }>>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // 1. Fetch Inventory Summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await adminInventoryApi.getSummary();
      if (res && res.success) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      console.warn("Could not fetch inventory summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // 2. Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await adminInventoryApi.getProducts({
        page: productPage,
        limit: productLimit,
        status: stockStatusFilter,
        q: productSearch,
        sort: sortOrder,
      });
      if (res && res.success) {
        setProducts(res.items);
        setTotalProducts(res.total);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to load inventory products.");
    } finally {
      setLoadingProducts(false);
    }
  }, [productPage, stockStatusFilter, productSearch, sortOrder]);

  // 3. Fetch Movements
  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const res = await adminInventoryApi.getMovements({
        page: movementPage,
        limit: 15,
        type: movementTypeFilter,
      });
      if (res && res.success) {
        setMovements(res.movements);
        setTotalMovements(res.total);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to load stock movements.");
    } finally {
      setLoadingMovements(false);
    }
  }, [movementPage, movementTypeFilter]);

  // 4. Fetch Waitlist
  const fetchWaitlist = useCallback(async () => {
    try {
      setLoadingWaitlist(true);
      const res = await adminInventoryApi.getWaitlist({
        page: waitlistPage,
        limit: 15,
      });
      if (res && res.success) {
        setWaitlist(res.subscribers);
        setTotalWaitlist(res.total);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to load back-in-stock waitlist.");
    } finally {
      setLoadingWaitlist(false);
    }
  }, [waitlistPage]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "catalog") fetchProducts();
    if (activeTab === "movements") fetchMovements();
    if (activeTab === "waitlist") fetchWaitlist();
  }, [activeTab, fetchProducts, fetchMovements, fetchWaitlist]);

  // Open Adjust Modal
  const openAdjustModal = (product: InventoryProductItem, variantId?: string) => {
    setAdjustProduct(product);
    setAdjustVariantId(variantId || "");
    setAdjustMode("add");
    setAdjustQuantity(5);
    setAdjustReason("Stock count replenishment");
    setAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    try {
      setAdjustSubmitting(true);
      const res = await adminInventoryApi.adjustStock({
        productId: adjustProduct._id,
        variantId: adjustVariantId || undefined,
        mode: adjustMode,
        quantity: adjustQuantity,
        reason: adjustReason.trim(),
      });

      showFeedback("success", res.message || "Stock level updated successfully!");
      setAdjustModalOpen(false);
      fetchSummary();
      fetchProducts();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to adjust stock.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Trigger Waitlist Notification
  const handleNotifyWaitlist = async (productId: string) => {
    try {
      setNotifyingProductId(productId);
      const res = await adminInventoryApi.notifyWaitlist(productId);
      showFeedback("success", res.message || "Waitlist subscribers notified!");
      fetchWaitlist();
      fetchSummary();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to notify waitlist.");
    } finally {
      setNotifyingProductId(null);
    }
  };

  // Submit Inbound Batch Receiving
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchItems.length === 0) {
      showFeedback("error", "Please add at least one product line to receive.");
      return;
    }
    try {
      setBatchSubmitting(true);
      const res = await adminInventoryApi.receiveBatch({
        batchNumber: batchNumber.trim(),
        supplier: batchSupplier.trim(),
        note: batchNote.trim(),
        items: batchItems,
      });

      showFeedback("success", res.message || "Batch received into inventory!");
      setBatchModalOpen(false);
      setBatchItems([]);
      fetchSummary();
      fetchProducts();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to receive batch.");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const productTotalPages = Math.max(1, Math.ceil(totalProducts / productLimit));
  const movementTotalPages = Math.max(1, Math.ceil(totalMovements / 15));
  const waitlistTotalPages = Math.max(1, Math.ceil(totalWaitlist / 15));

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Executive Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#CF565D]">
              Warehouse & Stock Control
            </span>
            <span className="text-[#E8D8C8]">•</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              UAE Botanical Boutique
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#292525] flex items-center gap-3">
            <span>Inventory Management</span>
            {summary && summary.lowStockCount + summary.outOfStockCount > 0 && (
              <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{summary.lowStockCount + summary.outOfStockCount} Alerts</span>
              </span>
            )}
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (products.length > 0) openAdjustModal(products[0]);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-98"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Quick Stock Adjust</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (batchItems.length === 0 && products.length > 0) {
                setBatchItems([{ productId: products[0]._id, quantity: 10 }]);
              }
              setBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm"
          >
            <Truck className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>Receive Inbound Batch</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchSummary();
              if (activeTab === "catalog") fetchProducts();
              if (activeTab === "movements") fetchMovements();
              if (activeTab === "waitlist") fetchWaitlist();
            }}
            className="p-2 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-[#746D69] hover:text-[#CF565D] transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock on Hand */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#746D69]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Stock on Hand
            </span>
            <div className="w-8 h-8 rounded-full bg-[#FCF4F2] text-[#CF565D] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="font-serif text-2xl font-bold text-[#292525]">
              {loadingSummary ? "..." : (summary?.totalUnits || 0).toLocaleString()}
            </span>
            <p className="text-[11px] text-[#746D69]">
              Across <strong>{summary?.totalProducts || 0}</strong> products ({summary?.totalVariants || 0} variants)
            </p>
          </div>
        </div>

        {/* Card 2: Inventory Valuation */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#746D69]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Inventory Value
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="font-serif text-2xl font-bold text-[#CF565D]">
              {loadingSummary
                ? "..."
                : `AED ${(summary?.totalValuation || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
            <p className="text-[11px] text-[#746D69]">Retail market valuation in UAE</p>
          </div>
        </div>

        {/* Card 3: Low & Out of Stock */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#746D69]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Stock Warnings
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="font-serif text-2xl font-bold text-amber-700">
                {loadingSummary ? "..." : summary?.lowStockCount || 0}
              </span>
              <span className="text-[10px] text-amber-800 font-semibold block uppercase">Low Stock</span>
            </div>
            <span className="text-[#E8D8C8] text-xl">/</span>
            <div>
              <span className="font-serif text-2xl font-bold text-rose-700">
                {loadingSummary ? "..." : summary?.outOfStockCount || 0}
              </span>
              <span className="text-[10px] text-rose-800 font-semibold block uppercase">Out of Stock</span>
            </div>
          </div>
        </div>

        {/* Card 4: Back-in-Stock Demand */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#746D69]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Waitlist Subscribers
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="font-serif text-2xl font-bold text-[#292525]">
              {loadingSummary ? "..." : summary?.waitlistSubscribersCount || 0}
            </span>
            <p className="text-[11px] text-[#746D69]">Customers awaiting back-in-stock alerts</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8D8C8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === "catalog"
              ? "bg-[#CF565D] text-white shadow-sm"
              : "text-[#746D69] hover:bg-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Product Inventory Catalog ({totalProducts})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === "movements"
              ? "bg-[#CF565D] text-white shadow-sm"
              : "text-[#746D69] hover:bg-white"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Audit Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waitlist")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === "waitlist"
              ? "bg-[#CF565D] text-white shadow-sm"
              : "text-[#746D69] hover:bg-white"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Waitlist & Notifications</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT INVENTORY CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-[#F5DAD6] shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search */}
              <div className="sm:col-span-6 relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="Search product by name or SKU..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                />
                <Search className="w-4 h-4 text-[#746D69] absolute left-3 top-2.5" />
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value);
                    setProductPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="in_stock">In Stock (&gt; 5 units)</option>
                  <option value="low_stock">Low Stock (1 - 5 units)</option>
                  <option value="out_stock">Out of Stock (0 units)</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="sm:col-span-3">
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setProductPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                >
                  <option value="stock_asc">Sort: Stock Level (Lowest First)</option>
                  <option value="stock_desc">Sort: Stock Level (Highest First)</option>
                  <option value="name_asc">Sort: Name (A - Z)</option>
                  <option value="price_desc">Sort: Price (Highest First)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#F5DAD6] shadow-sm overflow-hidden">
            {loadingProducts ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
                <p className="text-xs text-[#746D69]">Loading inventory items...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <Package className="w-12 h-12 mx-auto text-[#CF565D] opacity-60" />
                <h4 className="font-serif text-base font-bold text-[#292525]">No products match filter</h4>
                <p className="text-xs text-[#746D69]">Adjust your search query or status criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#F5DAD6] text-[#746D69] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Product & SKU</th>
                      <th className="py-3.5 px-4 font-semibold">Category</th>
                      <th className="py-3.5 px-4 font-semibold">Retail Price</th>
                      <th className="py-3.5 px-4 font-semibold">Current Stock</th>
                      <th className="py-3.5 px-4 font-semibold">Stock Health</th>
                      <th className="py-3.5 px-4 font-semibold">Waitlist</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5DAD6]/60">
                    {products.map((p) => {
                      const img = p.images?.[0] || null;
                      const price = Number(p.defaultPrice || p.price || 0);

                      return (
                        <tr key={p._id} className="hover:bg-[#FCF4F2]/50 transition-colors">
                          {/* Product Image & Title */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative">
                                {img ? (
                                  <Image src={img} alt={p.name} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                                    <Sparkles className="w-4 h-4 opacity-40" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-[#292525] block truncate max-w-xs">
                                  {p.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#746D69]">
                                  SKU: {p.sku || p._id.slice(-6).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 text-[#746D69]">
                            {p.category?.name || "Skincare"}
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 font-serif font-semibold text-[#292525]">
                            AED {price.toFixed(2)}
                          </td>

                          {/* Stock Quantity */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-serif text-sm font-bold ${
                                    p.stock === 0
                                      ? "text-rose-600"
                                      : p.stock <= 5
                                      ? "text-amber-600"
                                      : "text-[#292525]"
                                  }`}
                                >
                                  {p.stock}
                                </span>
                                <span className="text-[11px] text-[#746D69]">units</span>
                              </div>

                              {p.hasVariants && (
                                <span className="text-[10px] text-[#746D69] block">
                                  ({p.variants?.length || 0} variant options)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {p.stock === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Out of Stock</span>
                              </span>
                            ) : p.stock <= 5 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Low Stock ({p.stock} left)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Healthy Stock</span>
                              </span>
                            )}
                          </td>

                          {/* Waitlist count */}
                          <td className="py-3.5 px-4">
                            {p.waitlistCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                                <Bell className="w-3 h-3" />
                                <span>{p.waitlistCount} waiting</span>
                              </span>
                            ) : (
                              <span className="text-stone-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openAdjustModal(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] text-xs font-semibold text-[#292525] hover:text-[#CF565D] transition-all shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Adjust</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loadingProducts && products.length > 0 && (
              <div className="p-4 border-t border-[#F5DAD6] flex items-center justify-between text-xs text-[#746D69]">
                <span>
                  Showing Page <strong>{productPage}</strong> of <strong>{productTotalPages}</strong> ({totalProducts} items)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    disabled={productPage >= productTotalPages}
                    onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENT AUDIT LOGS */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-[#F5DAD6] shadow-sm flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs font-semibold text-[#292525]">
              Filter by Movement Type
            </span>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "All Movements", value: "all" },
                { label: "Inbound Receives", value: "inbound_receive" },
                { label: "Customer Sales", value: "order_sale" },
                { label: "Order Cancellations", value: "order_cancel" },
                { label: "Manual Adjustments", value: "manual_adjustment" },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setMovementTypeFilter(f.value);
                    setMovementPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    movementTypeFilter === f.value
                      ? "bg-[#CF565D] text-white border-[#CF565D]"
                      : "bg-white text-[#746D69] border-[#E8D8C8] hover:border-[#CF565D]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#F5DAD6] shadow-sm overflow-hidden">
            {loadingMovements ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
                <p className="text-xs text-[#746D69]">Loading audit logs...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <History className="w-12 h-12 mx-auto text-[#CF565D] opacity-60" />
                <h4 className="font-serif text-base font-bold text-[#292525]">No movements recorded</h4>
                <p className="text-xs text-[#746D69]">Stock changes will appear here as orders, replenishments, or adjustments occur.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#F5DAD6] text-[#746D69] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-3.5 px-4 font-semibold">Product</th>
                      <th className="py-3.5 px-4 font-semibold">Movement Type</th>
                      <th className="py-3.5 px-4 font-semibold">Previous</th>
                      <th className="py-3.5 px-4 font-semibold">Quantity Delta</th>
                      <th className="py-3.5 px-4 font-semibold">New Balance</th>
                      <th className="py-3.5 px-4 font-semibold">Audit Reason / Initiator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5DAD6]/60">
                    {movements.map((m) => {
                      const isPositive = m.change > 0;
                      return (
                        <tr key={m._id} className="hover:bg-[#FCF4F2]/50 transition-colors">
                          <td className="py-3.5 px-4 text-[#746D69] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString("en-AE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-[#292525]">
                            {m.product?.name || "Product"}
                            {m.variant?.sku && (
                              <span className="text-[10px] text-[#746D69] block font-mono">
                                SKU: {m.variant.sku}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                m.type === "inbound_receive"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : m.type === "order_sale"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : m.type === "order_cancel"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {m.type === "inbound_receive"
                                ? "Inbound Receive"
                                : m.type === "order_sale"
                                ? "Order Sale"
                                : m.type === "order_cancel"
                                ? "Order Restock"
                                : "Manual Adjustment"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#746D69]">{m.previousStock}</td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`font-semibold ${
                                isPositive ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isPositive ? `+${m.change}` : m.change}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-[#292525]">{m.newStock}</td>

                          <td className="py-3.5 px-4 text-[#746D69]">
                            <div className="font-medium text-[#292525] truncate max-w-xs">{m.reason || "-"}</div>
                            <span className="text-[10px] text-stone-400">
                              By: {m.performedBy?.name || "System"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loadingMovements && movements.length > 0 && (
              <div className="p-4 border-t border-[#F5DAD6] flex items-center justify-between text-xs text-[#746D69]">
                <span>
                  Showing Page <strong>{movementPage}</strong> of <strong>{movementTotalPages}</strong> ({totalMovements} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={movementPage <= 1}
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    disabled={movementPage >= movementTotalPages}
                    onClick={() => setMovementPage((p) => Math.min(movementTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WAITLIST SUBSCRIBERS */}
      {activeTab === "waitlist" && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-[#F5DAD6] shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-serif text-sm font-bold text-[#292525]">
                Back-in-Stock Customer Waitlist
              </h3>
              <p className="text-xs text-[#746D69]">
                Customers subscribed to receive email notifications as soon as out-of-stock items are replenished.
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#F5DAD6] shadow-sm overflow-hidden">
            {loadingWaitlist ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 mx-auto text-[#CF565D] animate-spin mb-3" />
                <p className="text-xs text-[#746D69]">Loading subscriber waitlist...</p>
              </div>
            ) : waitlist.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <Bell className="w-12 h-12 mx-auto text-[#CF565D] opacity-60" />
                <h4 className="font-serif text-base font-bold text-[#292525]">No active waitlist subscribers</h4>
                <p className="text-xs text-[#746D69]">When customers request back-in-stock notifications, they will be listed here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#F5DAD6] text-[#746D69] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Subscriber Email</th>
                      <th className="py-3.5 px-4 font-semibold">Interested Product</th>
                      <th className="py-3.5 px-4 font-semibold">Subscribed Date</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5DAD6]/60">
                    {waitlist.map((w) => (
                      <tr key={w._id} className="hover:bg-[#FCF4F2]/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#292525]">
                          {w.email}
                          {w.user?.name && (
                            <span className="text-[10px] text-[#746D69] block">
                              Customer: {w.user.name}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-[#292525]">
                          {w.product?.name || "Product"}
                          <span className="text-[10px] text-[#746D69] block">
                            Current Stock: {w.product?.defaultStock || 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#746D69]">
                          {new Date(w.createdAt).toLocaleDateString("en-AE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          {w.active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              <Clock className="w-3 h-3" />
                              <span>Waiting</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>Notified</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {w.product?._id && w.active && (
                            <button
                              type="button"
                              disabled={notifyingProductId === w.product._id}
                              onClick={() => handleNotifyWaitlist(w.product!._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 hover:bg-stone-900 text-white text-[11px] font-semibold transition-all disabled:opacity-60"
                            >
                              {notifyingProductId === w.product._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Send Alert</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loadingWaitlist && waitlist.length > 0 && (
              <div className="p-4 border-t border-[#F5DAD6] flex items-center justify-between text-xs text-[#746D69]">
                <span>
                  Showing Page <strong>{waitlistPage}</strong> of <strong>{waitlistTotalPages}</strong> ({totalWaitlist} subscribers)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={waitlistPage <= 1}
                    onClick={() => setWaitlistPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    disabled={waitlistPage >= waitlistTotalPages}
                    onClick={() => setWaitlistPage((p) => Math.min(waitlistTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#E8D8C8] bg-white disabled:opacity-40 flex items-center gap-1 font-semibold hover:border-[#CF565D]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT */}
      {adjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#F5DAD6] space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#F5DAD6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF565D]">
                  Inventory Correction
                </span>
                <h3 className="font-serif text-lg font-bold text-[#292525]">
                  Adjust Stock Quantity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Product Summary */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8]">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#F5DAD6] overflow-hidden flex-shrink-0 relative">
                {adjustProduct.images?.[0] ? (
                  <Image src={adjustProduct.images[0]} alt={adjustProduct.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#CF565D]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-xs text-[#292525] block truncate">{adjustProduct.name}</strong>
                <span className="text-[11px] text-[#746D69]">
                  Current Stock: <strong className="text-[#CF565D]">{adjustProduct.stock} units</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              {/* Variant Selector if applicable */}
              {adjustProduct.hasVariants && adjustProduct.variants && adjustProduct.variants.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                    Select Variant
                  </label>
                  <select
                    value={adjustVariantId}
                    onChange={(e) => setAdjustVariantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                  >
                    <option value="">Base Product Default Stock</option>
                    {adjustProduct.variants.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.sku} (Stock: {v.stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Adjustment Mode */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Add (+)", value: "add" },
                    { label: "Subtract (-)", value: "subtract" },
                    { label: "Direct Set (=)", value: "set" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setAdjustMode(m.value as any)}
                      className={`py-2 px-3 rounded-xl font-semibold border transition-all ${
                        adjustMode === m.value
                          ? "bg-[#CF565D] text-white border-[#CF565D] shadow-sm"
                          : "bg-white text-[#746D69] border-[#E8D8C8] hover:border-[#CF565D]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                  Quantity ({adjustMode === "set" ? "New Total Units" : "Delta Units"})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1.5">
                  Audit Reason / Note
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical count reconciliation, Inbound replenishment"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                />
              </div>

              {/* Dynamic Calculation Preview */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
                <strong>Projected Balance: </strong>
                <span>
                  {adjustProduct.stock} →{" "}
                  <strong>
                    {adjustMode === "set"
                      ? adjustQuantity
                      : adjustMode === "subtract"
                      ? Math.max(0, adjustProduct.stock - adjustQuantity)
                      : adjustProduct.stock + adjustQuantity}
                  </strong>{" "}
                  units
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-[#F5DAD6]">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white font-semibold transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {adjustSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Apply Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INBOUND BATCH RECEIVING */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-[#F5DAD6] space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#F5DAD6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF565D]">
                  Supplier Replenishment
                </span>
                <h3 className="font-serif text-lg font-bold text-[#292525]">
                  Receive Inbound Stock Batch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                    Batch / PO #
                  </label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                    Supplier / Source
                  </label>
                  <input
                    type="text"
                    required
                    value={batchSupplier}
                    onChange={(e) => setBatchSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#746D69] mb-1">
                  Receiving Note
                </label>
                <input
                  type="text"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30"
                />
              </div>

              {/* Items in Batch */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
                    Receiving Lines ({batchItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0) {
                        setBatchItems((prev) => [...prev, { productId: products[0]._id, quantity: 10 }]);
                      }
                    }}
                    className="text-[11px] font-semibold text-[#CF565D] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {batchItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8]">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBatchItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, productId: val } : it))
                          );
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8D8C8] bg-white text-xs truncate focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} (Cur: {p.stock})
                          </option>
                        ))}
                      </select>

                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setBatchItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#E8D8C8] bg-white text-xs font-mono text-center focus:outline-none"
                        />
                        <span className="text-[10px] text-[#746D69]">qty</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBatchItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-[#F5DAD6]">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting || batchItems.length === 0}
                  className="px-5 py-2 rounded-full bg-[#292525] hover:bg-[#3a3535] text-white font-semibold transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {batchSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Commit Batch Receiving</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
