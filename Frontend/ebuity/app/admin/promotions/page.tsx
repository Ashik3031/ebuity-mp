"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminServiceApi, serviceApi, Service } from "../../../lib/api-client";
import {
  Zap,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit2,
  ArrowRight,
  Tag,
  Percent,
  X,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function AdminPromotionsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State for Adding/Editing a Deal
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [dealForm, setDealForm] = useState({
    dealPrice: 249,
    dealDiscountPercentage: 25,
    dealBadge: "Today's Exclusive",
    dealDescription: "",
    dealEndsAt: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await adminServiceApi.getAll({ limit: 100 }).catch(() => serviceApi.getAll({ limit: 100 }));
      if (res && "services" in res && Array.isArray(res.services)) {
        setServices(res.services);
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

  const activeDeals = services.filter((s) => s.isExclusiveDeal);
  const nonDealServices = services.filter((s) => !s.isExclusiveDeal);

  // Open modal to add a deal
  const handleOpenAddDeal = (serviceId?: string) => {
    const targetService = serviceId
      ? services.find((s) => s._id === serviceId)
      : nonDealServices[0] || services[0];

    const sid = targetService ? targetService._id : "";
    setSelectedServiceId(sid);

    const reg = targetService ? targetService.price : 350;
    const defaultDealPrice = targetService?.dealPrice || Math.round(reg * 0.75);
    const defaultPct = targetService?.dealDiscountPercentage || Math.round(((reg - defaultDealPrice) / reg) * 100);

    setDealForm({
      dealPrice: defaultDealPrice,
      dealDiscountPercentage: defaultPct,
      dealBadge: targetService?.dealBadge || "Today's Exclusive",
      dealDescription: targetService?.dealDescription || "",
      dealEndsAt: targetService?.dealEndsAt ? new Date(targetService.dealEndsAt).toISOString().slice(0, 16) : "",
    });
    setMessage(null);
    setIsDealModalOpen(true);
  };

  // Open modal to edit an existing deal
  const handleOpenEditDeal = (s: Service) => {
    setSelectedServiceId(s._id);
    setDealForm({
      dealPrice: s.dealPrice != null ? s.dealPrice : Math.round(s.price * 0.75),
      dealDiscountPercentage: s.dealDiscountPercentage != null ? s.dealDiscountPercentage : 25,
      dealBadge: s.dealBadge || "Today's Exclusive",
      dealDescription: s.dealDescription || "",
      dealEndsAt: s.dealEndsAt ? new Date(s.dealEndsAt).toISOString().slice(0, 16) : "",
    });
    setMessage(null);
    setIsDealModalOpen(true);
  };

  // Remove deal from service
  const handleRemoveDeal = async (s: Service) => {
    try {
      const res = await adminServiceApi.update(s._id, {
        isExclusiveDeal: false,
      });
      if (res.success) {
        setMessage({
          type: "success",
          text: `Removed "${s.name}" from Today's Exclusive Deals.`,
        });
        await loadData();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove deal.",
      });
    }
  };

  // Save deal
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      setMessage({ type: "error", text: "Please select a service." });
      return;
    }

    setSaving(true);
    try {
      const res = await adminServiceApi.update(selectedServiceId, {
        isExclusiveDeal: true,
        dealPrice: Number(dealForm.dealPrice),
        dealDiscountPercentage: Number(dealForm.dealDiscountPercentage),
        dealBadge: dealForm.dealBadge.trim() || "Today's Exclusive",
        dealDescription: dealForm.dealDescription.trim(),
        dealEndsAt: dealForm.dealEndsAt ? new Date(dealForm.dealEndsAt).toISOString() : null,
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: `Today's Exclusive Deal saved for "${res.service.name}"!`,
        });
        setIsDealModalOpen(false);
        await loadData();
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save deal.",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedServiceObj = services.find((s) => s._id === selectedServiceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D8C8]/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#746D69] mb-1">
            <Link href="/admin" className="hover:text-[#CF565D] transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#292525] font-semibold">Marketing</span>
            <span>/</span>
            <span className="text-[#CF565D] font-semibold">Today's Exclusive Deals</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#292525] flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-[#CF565D] text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <span>Today's Exclusive Deals & Flash Offers</span>
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Select in-home wellness rituals and apply exclusive daily pricing that displays prominently across the client portal and homepage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8D8C8] text-[#746D69] hover:text-[#292525] text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#CF565D]" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/services"
            className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8D8C8] text-[#292525] text-xs font-semibold hover:border-[#CF565D] transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
            <span>All Services</span>
          </Link>

          <button
            onClick={() => handleOpenAddDeal()}
            className="px-4 py-2 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold tracking-wide shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Today's Deal</span>
          </button>
        </div>
      </div>

      {/* Alert Message */}
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

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-rose-500/10 rounded-2xl p-5 border border-amber-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Active Today's Deals
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#292525]">{activeDeals.length}</span>
            <span className="text-xs text-[#746D69]">services featured today</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#746D69]">
              Maximum Deal Discount
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#CF565D] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#CF565D]">
              {activeDeals.length > 0
                ? Math.max(...activeDeals.map((d) => d.dealDiscountPercentage || 0))
                : 0}
              %
            </span>
            <span className="text-xs text-[#746D69]">maximum discount</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8D8C8]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#746D69]">
              Available Services Catalog
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#292525] flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#CF565D]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#292525]">{services.length}</span>
            <span className="text-xs text-[#746D69]">eligible services</span>
          </div>
        </div>
      </div>

      {/* Active Deals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#292525] flex items-center gap-2">
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Currently Active Deals ({activeDeals.length})</span>
          </h2>
          <span className="text-xs text-[#746D69]">
            Deals automatically appear on homepage & services catalogue with special pricing
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E8D8C8] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#CF565D] mb-2" />
            <span className="text-xs text-[#746D69]">Loading exclusive deals...</span>
          </div>
        ) : activeDeals.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E8D8C8] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#292525]">No Exclusive Deals Set For Today</h3>
            <p className="text-xs text-[#746D69] mt-1 max-w-sm">
              Attract more bookings by featuring services with Today's Exclusive Deals. Customers will see them highlighted on the homepage and catalogue.
            </p>
            <button
              onClick={() => handleOpenAddDeal()}
              className="mt-4 px-4 py-2 rounded-xl bg-[#292525] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer hover:bg-[#1a1717]"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Your First Deal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeDeals.map((deal) => {
              const catName =
                typeof deal.category === "object" && deal.category !== null
                  ? deal.category.name
                  : "At-Home Ritual";

              const savings = deal.dealPrice != null ? deal.price - deal.dealPrice : 0;

              return (
                <div
                  key={deal._id}
                  className="bg-white rounded-3xl border border-amber-300/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Top Image Preview & Badge */}
                  <div className="relative aspect-[16/9] w-full bg-[#FAF7F2] overflow-hidden">
                    <img
                      src={
                        deal.images?.[0] ||
                        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={deal.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500 to-[#CF565D] text-white shadow-md">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>{deal.dealBadge || "Today's Exclusive"}</span>
                    </div>

                    {deal.dealDiscountPercentage && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-extrabold bg-white/95 text-[#CF565D] shadow-sm">
                        {deal.dealDiscountPercentage}% OFF
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#CF565D] block mb-1">
                        {catName}
                      </span>
                      <h3 className="font-bold text-base text-[#292525] line-clamp-1">{deal.name}</h3>
                      {deal.dealDescription ? (
                        <p className="text-xs text-[#746D69] mt-1 line-clamp-2">{deal.dealDescription}</p>
                      ) : (
                        <p className="text-xs text-[#746D69] mt-1 line-clamp-2">{deal.shortDescription}</p>
                      )}
                    </div>

                    {/* Price Comparison */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#746D69] block font-semibold uppercase">
                          Today's Deal Price
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-extrabold text-[#CF565D]">
                            AED {deal.dealPrice}
                          </span>
                          <span className="text-xs text-stone-400 line-through">
                            AED {deal.price}
                          </span>
                        </div>
                      </div>

                      {savings > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full border border-emerald-300">
                          Save AED {savings}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-[#E8D8C8]/60 flex items-center justify-between">
                      <button
                        onClick={() => handleRemoveDeal(deal)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Deal</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditDeal(deal)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Deal</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eligible Services Quick Add Table */}
      {nonDealServices.length > 0 && (
        <div className="mt-8 bg-white rounded-3xl border border-[#E8D8C8]/70 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E8D8C8]/60 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#292525]">Other Services Available For Today's Deals</h3>
              <p className="text-xs text-[#746D69]">Click any service to instantly set up an exclusive deal promotion</p>
            </div>
            <span className="text-xs font-bold text-[#CF565D] bg-[#FCF4F2] px-3 py-1 rounded-full border border-[#F5DAD6]">
              {nonDealServices.length} Regular Services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#746D69] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8D8C8]/60">
                <tr>
                  <th className="py-3 px-5">Service Name</th>
                  <th className="py-3 px-5">Duration</th>
                  <th className="py-3 px-5">Regular Price</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D8C8]/40">
                {nonDealServices.slice(0, 10).map((srv) => (
                  <tr key={srv._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3 px-5 font-semibold text-[#292525]">{srv.name}</td>
                    <td className="py-3 px-5 text-[#746D69]">{srv.duration || 60} mins</td>
                    <td className="py-3 px-5 font-bold text-[#292525]">AED {srv.price}</td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => handleOpenAddDeal(srv._id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Make Today's Deal</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Deal Modal */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-amber-300 shadow-2xl p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E8D8C8]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-[#CF565D] text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#292525]">Set Today's Exclusive Deal</h3>
                  <p className="text-xs text-[#746D69]">Promote this service with special daily pricing</p>
                </div>
              </div>
              <button
                onClick={() => setIsDealModalOpen(false)}
                className="p-1 rounded-lg text-[#746D69] hover:text-[#292525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="mt-4 space-y-4">
              {/* Select Service Dropdown */}
              <div>
                <label className="block text-xs font-bold text-[#292525] mb-1">
                  Choose Service <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelectedServiceId(sid);
                    const found = services.find((s) => s._id === sid);
                    if (found) {
                      const reg = found.price || 350;
                      const dPrice = Math.round(reg * 0.75);
                      setDealForm((prev) => ({
                        ...prev,
                        dealPrice: dPrice,
                        dealDiscountPercentage: 25,
                      }));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-xs font-semibold text-[#292525] focus:outline-none focus:border-[#CF565D]"
                >
                  <option value="">Select a service...</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Regular: AED {s.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Discount */}
              {selectedServiceObj && (
                <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs">
                  <span className="font-semibold text-amber-900 block">
                    Original Price: <span className="font-extrabold">AED {selectedServiceObj.price}</span>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#292525] mb-1">
                    Promotional Deal Price (AED) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#CF565D]">AED</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={dealForm.dealPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const reg = selectedServiceObj ? selectedServiceObj.price : 350;
                        const pct = Math.max(0, Math.min(100, Math.round(((reg - val) / reg) * 100)));
                        setDealForm((prev) => ({ ...prev, dealPrice: val, dealDiscountPercentage: pct }));
                      }}
                      className="w-full pl-13 pr-3.5 py-2.5 text-xs font-extrabold bg-[#FAF7F2] border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                  </div>
                  {selectedServiceObj && selectedServiceObj.price > dealForm.dealPrice && (
                    <span className="text-[10px] font-semibold text-emerald-700 mt-1 block">
                      Customer saves AED {selectedServiceObj.price - dealForm.dealPrice}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#292525] mb-1">
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={dealForm.dealDiscountPercentage}
                      onChange={(e) => {
                        const pct = parseInt(e.target.value, 10) || 0;
                        const reg = selectedServiceObj ? selectedServiceObj.price : 350;
                        const newPrice = Math.max(0, Math.round(reg * (1 - pct / 100)));
                        setDealForm((prev) => ({ ...prev, dealDiscountPercentage: pct, dealPrice: newPrice }));
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-extrabold bg-[#FAF7F2] border border-amber-300 rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746D69]">%</span>
                  </div>
                </div>
              </div>

              {/* Deal Badge / Title */}
              <div>
                <label className="block text-xs font-bold text-[#292525] mb-1">
                  Deal Badge Tag
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Today's Exclusive, Flash 30% OFF"
                    value={dealForm.dealBadge}
                    onChange={(e) => setDealForm((prev) => ({ ...prev, dealBadge: e.target.value }))}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                  {["Today's Exclusive", "Flash Deal", "30% OFF"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDealForm((prev) => ({ ...prev, dealBadge: preset }))}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-bold bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#CF565D] whitespace-nowrap"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry Time */}
              <div>
                <label className="block text-xs font-bold text-[#292525] mb-1">
                  Deal Expiry Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={dealForm.dealEndsAt}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, dealEndsAt: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#292525] mb-1">
                  Deal Promotional Subtext (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive daily discount on in-home ritual appointments."
                  value={dealForm.dealDescription}
                  onChange={(e) => setDealForm((prev) => ({ ...prev, dealDescription: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D]"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDealModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-[#746D69] text-xs font-semibold hover:text-[#292525]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#292525] hover:bg-[#1a1717] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                  <span>Save & Publish Deal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
