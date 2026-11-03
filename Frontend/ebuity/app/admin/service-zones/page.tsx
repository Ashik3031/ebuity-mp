"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  adminZoneApi,
  serviceZoneApi,
  ServiceZone,
} from "../../../lib/api-client";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Building,
  Calendar,
  Check,
  X,
  ShieldAlert,
  Globe,
  Tag,
  ArrowRight,
  Info,
} from "lucide-react";
import { UAE_EMIRATES, DEFAULT_EMIRATE_LOCATIONS } from "../../../lib/locations";

export default function AdminServiceZonesPage() {
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Notifications
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal States
  const [zoneToDelete, setZoneToDelete] = useState<ServiceZone | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State: Only Emirate, Location name (manual or select), Slug, and Active status
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    city: "Dubai",
    isActive: true,
  });

  const loadZones = useCallback(async () => {
    try {
      const res = await adminZoneApi.getAll();
      if (res.success && Array.isArray(res.zones)) {
        setZones(res.zones);
      }
    } catch (err: unknown) {
      // Fallback to public endpoint if admin route fails
      try {
        const pub = await serviceZoneApi.getAll();
        if (pub.success && Array.isArray(pub.zones)) {
          setZones(pub.zones);
        }
      } catch {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load locations.",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleRefresh = () => {
    setRefreshing(true);
    setMessage(null);
    loadZones();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormData({
      name: "",
      slug: "",
      city: cityFilter !== "all" ? cityFilter : "Dubai",
      isActive: true,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (zone: ServiceZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      slug: zone.slug || "",
      city: zone.city || zone.emirate || "Dubai",
      isActive: zone.isActive,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  // Auto-generate slug from name
  const handleNameChange = (nameVal: string) => {
    const slugVal = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: !editingZone ? slugVal : prev.slug,
    }));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "Location name is required." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const locName = formData.name.trim();
    const slugVal = (formData.slug.trim() || locName)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const payload: Partial<ServiceZone> = {
      name: locName,
      slug: slugVal,
      city: formData.city,
      emirate: formData.city,
      supportedAreas: [locName],
      displayOrder: editingZone?.displayOrder || zones.length + 1,
      isActive: formData.isActive,
    };

    try {
      if (editingZone) {
        const res = await adminZoneApi.update(editingZone._id, payload);
        setMessage({
          type: "success",
          text: res.message || `Location "${res.zone.name}" updated successfully.`,
        });
      } else {
        const res = await adminZoneApi.create(payload);
        setMessage({
          type: "success",
          text: res.message || `Location "${res.zone.name}" added successfully.`,
        });
      }
      setIsModalOpen(false);
      loadZones();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save location.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (zone: ServiceZone) => {
    try {
      const updatedStatus = !zone.isActive;
      await adminZoneApi.toggleStatus(zone._id, updatedStatus);
      setZones((prev) =>
        prev.map((z) => (z._id === zone._id ? { ...z, isActive: updatedStatus } : z))
      );
      setMessage({
        type: "success",
        text: `Zone "${zone.name}" is now ${updatedStatus ? "Active" : "Inactive"}.`,
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update zone status.",
      });
    }
  };

  // Open Safe Delete Modal
  const handleOpenDelete = (zone: ServiceZone) => {
    setZoneToDelete(zone);
    setDeleteError(null);
  };

  // Confirm Delete or Deactivate
  const handleConfirmDelete = async () => {
    if (!zoneToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await adminZoneApi.delete(zoneToDelete._id);
      setMessage({
        type: "success",
        text: res.message || `Zone "${zoneToDelete.name}" was successfully deleted.`,
      });
      setZoneToDelete(null);
      loadZones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete service zone.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // One-click deactivate from delete modal
  const handleDeactivateFromModal = async () => {
    if (!zoneToDelete) return;
    setDeleting(true);
    try {
      await adminZoneApi.toggleStatus(zoneToDelete._id, false);
      setMessage({
        type: "success",
        text: `Zone "${zoneToDelete.name}" deactivated successfully to prevent new bookings.`,
      });
      setZoneToDelete(null);
      loadZones();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to deactivate zone.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtering
  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      // Status filter
      if (statusFilter === "active" && !zone.isActive) return false;
      if (statusFilter === "inactive" && zone.isActive) return false;

      // City filter
      if (cityFilter !== "all") {
        const zoneCity = (zone.city || zone.emirate || "").toLowerCase();
        if (zoneCity !== cityFilter.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = zone.name.toLowerCase().includes(q);
        const cityMatch = (zone.city || zone.emirate || "").toLowerCase().includes(q);
        const areaMatch = zone.supportedAreas?.some((a) => a.toLowerCase().includes(q));
        const postalMatch = zone.postalIdentifiers?.some((p) => p.toLowerCase().includes(q));
        if (!nameMatch && !cityMatch && !areaMatch && !postalMatch) return false;
      }

      return true;
    });
  }, [zones, statusFilter, cityFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = zones.length;
    const active = zones.filter((z) => z.isActive).length;
    const totalAreas = zones.reduce((acc, z) => acc + (z.supportedAreas?.length || 0), 0);
    const totalBookings = zones.reduce((acc, z) => acc + (z.bookingCount || 0), 0);
    return { total, active, inactive: total - active, totalAreas, totalBookings };
  }, [zones]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#746D69] mb-1">
            <Link href="/admin" className="hover:text-[#CF565D] transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span>Catalog</span>
            <span>/</span>
            <span className="text-[#292525]">Service Zones</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#292525] flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#CF565D]" />
            Service Locations & Emirate Coverage
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Select and configure active service locations for each UAE Emirate. Only admin-selected locations appear in client booking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Real-time Live Badge (replaces manual refresh) */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E8D8C8] rounded-xl shadow-xs"
            title="Real-time locations active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700">Live</span>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#CF565D] hover:bg-[#b8454b] rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
          )}
          <div className="flex-1 text-xs font-medium">{message.text}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              Total Locations
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] flex items-center justify-center text-[#CF565D]">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#292525]">{metrics.total}</div>
          <p className="text-[11px] text-[#746D69] mt-0.5">Configured territories</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              Active Coverage
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-emerald-700">{metrics.active}</div>
          <p className="text-[11px] text-[#746D69] mt-0.5">Accepting reservations</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              Supported Emirates
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F5DAD6] flex items-center justify-center text-[#CF565D]">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#292525]">{UAE_EMIRATES.length}</div>
          <p className="text-[11px] text-[#746D69] mt-0.5">UAE territory Emirates</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#746D69]">
              Associated Bookings
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-blue-800">{metrics.totalBookings}</div>
          <p className="text-[11px] text-[#746D69] mt-0.5">Completed & scheduled</p>
        </div>
      </div>

      {/* Informational Callout */}
      <div className="p-3.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl flex items-center justify-between gap-3 text-xs text-[#746D69]">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#CF565D] flex-shrink-0" />
          <span>
            <strong>Emirate & Location Coverage:</strong> Only active locations configured here are displayed to clients when they select an Emirate during booking.
          </span>
        </div>
        <Link
          href="/admin/availability"
          className="text-[#CF565D] font-semibold hover:underline flex-shrink-0 flex items-center gap-1"
        >
          Operating Hours & Buffer Settings <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8D8C8] shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#746D69] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by location name, emirate, or slug..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] placeholder-[#746D69] focus:outline-none focus:ring-1 focus:ring-[#CF565D] focus:border-[#CF565D]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* City / Emirate Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
          >
            <option value="all">All Emirates</option>
            {UAE_EMIRATES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Zones List / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E8D8C8] text-center">
          <Loader2 className="w-7 h-7 text-[#CF565D] animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-[#746D69]">Loading territory service zones...</p>
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-[#E8D8C8] text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#CF565D] flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#292525]">No Service Zones Found</h3>
          <p className="text-xs text-[#746D69] mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all" || cityFilter !== "all"
              ? "No locations match the current search filters. Try clearing your filters."
              : "No service locations have been added yet. Click 'Add Location' to configure customer service coverage."}
          </p>
          {(searchQuery || statusFilter !== "all" || cityFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCityFilter("all");
              }}
              className="mt-3 text-xs font-semibold text-[#CF565D] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredZones.map((zone) => {
            const bookingCount = zone.bookingCount || 0;
            const areas = zone.supportedAreas || [];
            const postalCodes = zone.postalIdentifiers || [];

            return (
              <div
                key={zone._id}
                className="bg-white rounded-2xl p-5 border border-[#E8D8C8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Name, City & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-serif font-bold text-[#292525]">
                          {zone.name}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#746D69] border border-[#E8D8C8]">
                          {zone.city || zone.emirate || "Dubai"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#746D69] mt-0.5 font-mono">/{zone.slug}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(zone)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          zone.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                        }`}
                        title="Click to toggle active status"
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  {/* Associated Bookings Counter */}
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md ${
                        bookingCount > 0
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-gray-50 text-gray-500 border border-gray-100"
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <strong>{bookingCount}</strong> {bookingCount === 1 ? "booking" : "bookings"}
                    </span>
                    {zone.boundaryCoordinates && zone.boundaryCoordinates.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#746D69] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8D8C8]">
                        <MapPin className="w-2.5 h-2.5 text-[#CF565D]" />
                        Coords: {zone.boundaryCoordinates[0].lat.toFixed(3)},{" "}
                        {zone.boundaryCoordinates[0].lng.toFixed(3)}
                      </span>
                    )}
                  </div>

                  {/* Supported Areas Chips */}
                  <div className="mt-3.5">
                    <span className="text-[11px] font-semibold text-[#292525] block mb-1.5">
                      Supported Communities ({areas.length}):
                    </span>
                    {areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {areas.map((area, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-[#FAF7F2] text-[#292525] px-2.5 py-0.5 rounded-lg border border-[#E8D8C8]"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-[#746D69]">
                        No individual areas entered (entire city scope).
                      </p>
                    )}
                  </div>

                  {/* Postal / Address Identifiers */}
                  {postalCodes.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#F5DAD6]/50">
                      <span className="text-[10px] font-semibold uppercase text-[#746D69] tracking-wider block mb-1">
                        Postal / Community Codes:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {postalCodes.map((code, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono bg-white text-[#746D69] px-2 py-0.5 rounded border border-[#E8D8C8]"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-[#E8D8C8] flex items-center justify-between">
                  <span className="text-[10px] text-[#746D69]">
                    Order Index: {zone.displayOrder || 0}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(zone)}
                      className="p-1.5 text-[#746D69] hover:text-[#CF565D] hover:bg-[#FAF7F2] rounded-lg transition-all"
                      title="Edit Zone"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(zone)}
                      className="p-1.5 text-[#746D69] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title={bookingCount > 0 ? "Protected Zone (Deactivate Instead)" : "Delete Zone"}
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

      {/* ========================================================= */}
      {/* CREATE / EDIT ZONE MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#E8D8C8] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E8D8C8] flex items-center justify-between bg-[#FAF7F2]">
              <div>
                <h2 className="text-base font-serif font-bold text-[#292525]">
                  {editingZone ? `Edit Location: ${editingZone.name}` : "Add New Location"}
                </h2>
                <p className="text-xs text-[#746D69] mt-0.5">
                  Select an Emirate and pick from its locations or enter a custom location name.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 1. Emirate Selection */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  Select Emirate <span className="text-[#CF565D]">*</span>
                </label>
                <select
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                >
                  {UAE_EMIRATES.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#746D69] mt-1">
                  Choose the Emirate this location belongs to.
                </p>
              </div>

              {/* 2. Location Selection & Manual Entry */}
              <div className="space-y-3 p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]">
                <div>
                  <label className="text-xs font-semibold text-[#292525] block mb-1">
                    Select Location in {formData.city}
                  </label>
                  <select
                    value={DEFAULT_EMIRATE_LOCATIONS[formData.city]?.includes(formData.name) ? formData.name : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleNameChange(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                  >
                    <option value="">-- Choose from {formData.city} known locations --</option>
                    {DEFAULT_EMIRATE_LOCATIONS[formData.city]?.map((loc) => {
                      const isAdded = zones.some(
                        (z) =>
                          (z.city || z.emirate || "Dubai").toLowerCase() === formData.city.toLowerCase() &&
                          z.name.toLowerCase() === loc.toLowerCase()
                      );
                      return (
                        <option key={loc} value={loc}>
                          {loc} {isAdded ? "✓ (Added)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-[#746D69] mt-1">
                    Select a location from the {formData.city} list, or enter manually below.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#292525] block mb-1">
                    Location Name (Manual Entry) <span className="text-[#CF565D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={`e.g. Downtown ${formData.city} or Marina`}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                  />
                  <p className="text-[10px] text-[#746D69] mt-1">
                    This location will appear in the customer address dropdown when selecting {formData.city}.
                  </p>
                </div>
              </div>

              {/* 3. Slug */}
              <div>
                <label className="text-xs font-semibold text-[#292525] block mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, slug: e.target.value }))
                  }
                  placeholder="e.g. downtown-dubai"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
                />
              </div>

              {/* 4. Active Toggle */}
              <div className="pt-2 border-t border-[#E8D8C8]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#CF565D] rounded border-[#E8D8C8] focus:ring-[#CF565D]"
                  />
                  <span className="text-xs font-semibold text-[#292525]">
                    Active for client bookings
                  </span>
                </label>
                <p className="text-[10px] text-[#746D69] ml-6 mt-0.5">
                  Only active locations can be selected by clients on the booking page.
                </p>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-[#E8D8C8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#CF565D] hover:bg-[#b8454b] rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingZone ? "Save Location" : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SAFE DELETE / DEACTIVATE MODAL */}
      {/* ========================================================= */}
      {zoneToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E8D8C8] overflow-hidden p-5">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  (zoneToDelete.bookingCount || 0) > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-serif font-bold text-[#292525]">
                  {(zoneToDelete.bookingCount || 0) > 0
                    ? "Zone Protected from Deletion"
                    : "Delete Service Zone"}
                </h3>
                <p className="text-xs text-[#746D69] mt-1">
                  {(zoneToDelete.bookingCount || 0) > 0 ? (
                    <>
                      <strong>{zoneToDelete.name}</strong> is currently associated with{" "}
                      <span className="font-semibold text-[#292525]">
                        {zoneToDelete.bookingCount} active/completed booking(s)
                      </span>
                      . Deleting this zone would corrupt customer booking histories and dispatch records.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete <strong>{zoneToDelete.name}</strong>? This action cannot be undone.
                    </>
                  )}
                </p>

                {/* Error Banner */}
                {deleteError && (
                  <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    {deleteError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setZoneToDelete(null)}
                    disabled={deleting}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#746D69] hover:bg-[#FAF7F2] rounded-xl border border-[#E8D8C8]"
                  >
                    Cancel
                  </button>

                  {(zoneToDelete.bookingCount || 0) > 0 ? (
                    <button
                      onClick={handleDeactivateFromModal}
                      disabled={deleting}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Deactivate Zone Instead
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirm Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
