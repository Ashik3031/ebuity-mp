"use client";

import React, { useState, useMemo } from "react";
import { DashboardActivity } from "../../lib/api-client";
import { StatusBadge } from "./StatusBadge";
import {
  Search,
  Filter,
  Sparkles,
  ShoppingBag,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
  Square,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface RecentActivitiesTableProps {
  activities: DashboardActivity[];
}

export function RecentActivitiesTable({ activities }: RecentActivitiesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter logic
  const filteredActivities = useMemo(() => {
    return (activities || []).filter((item) => {
      const matchesSearch =
        item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assignedStaff.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "all" || item.type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [activities, searchTerm, statusFilter, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, currentPage]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      paginatedItems.forEach((item) => {
        next[item.id] = true;
      });
      setSelectedIds(next);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-colors">
      {/* Header controls matching screenshot */}
      <div className="p-4 sm:p-5 border-b border-[#E8D8C8]/50 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2]">Recent Activities</h3>
          <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
            Real-time reservations and boutique wellness orders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-[#746D69] dark:text-[#A89F9A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 rounded-xl text-[#292525] dark:text-[#FAF7F2] placeholder-[#746D69]/60 dark:placeholder-[#A89F9A]/60 focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D]"
            />
          </div>

          {/* Status filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 rounded-xl text-[#292525] dark:text-[#FAF7F2] focus:outline-none focus:border-[#CF565D] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="w-3 h-3 text-[#746D69] dark:text-[#A89F9A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/80 dark:border-white/10 rounded-xl text-[#292525] dark:text-[#FAF7F2] focus:outline-none focus:border-[#CF565D] cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="booking">Bookings</option>
            <option value="order">Orders</option>
            <option value="registration">New Clients</option>
            <option value="inventory">Inventory Alerts</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8D8C8]/40 dark:border-white/10 bg-[#FAF7F2]/60 dark:bg-[#252020]/80 text-[11px] font-semibold uppercase tracking-wider text-[#746D69] dark:text-[#A89F9A]">
              <th className="py-3 px-4 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                >
                  {Object.keys(selectedIds).length === paginatedItems.length &&
                  paginatedItems.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#CF565D]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Order / Booking ID</th>
              <th className="py-3 px-4">Activity & Client</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned / Logistics</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8D8C8]/30 dark:divide-white/10 text-xs">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#746D69] dark:text-[#A89F9A]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#FAF7F2] dark:bg-[#282323] flex items-center justify-center text-[#746D69] dark:text-[#A89F9A]">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-medium text-sm text-[#292525] dark:text-[#FAF7F2]">No activities found</p>
                    <p className="text-xs text-[#746D69] dark:text-[#A89F9A]">
                      Try adjusting your search criteria or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isSelected = !!selectedIds[item.id];
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#FAF7F2]/50 dark:hover:bg-white/5 transition-colors ${
                      isSelected ? "bg-[#FCF4F2]/50 dark:bg-[#CF565D]/10" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="text-[#746D69] dark:text-[#A89F9A] hover:text-[#292525] dark:hover:text-[#FAF7F2]"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#CF565D]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#292525] dark:text-[#FAF7F2]">
                      {item.reference}
                    </td>

                    {/* Activity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            item.type === "booking"
                              ? "bg-[#FCF4F2] dark:bg-[#CF565D]/20 text-[#CF565D]"
                              : item.type === "registration"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                              : item.type === "inventory"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                              : "bg-[#FAF7F2] dark:bg-[#282323] text-[#292525] dark:text-[#FAF7F2]"
                          }`}
                        >
                          {item.type === "booking" ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : item.type === "registration" ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : item.type === "inventory" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#292525] dark:text-[#FAF7F2] line-clamp-1">
                            {item.itemTitle}
                          </div>
                          <div className="text-[11px] text-[#746D69] dark:text-[#A89F9A]">
                            {item.customer}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-bold text-[#292525] dark:text-[#FAF7F2]">
                      {item.price}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    {/* Assigned */}
                    <td className="py-3.5 px-4 text-[#746D69] dark:text-[#A89F9A]">
                      <span className="font-medium text-[#292525] dark:text-[#FAF7F2]">
                        {item.assignedStaff}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#746D69] whitespace-nowrap">
                      {item.dateTime}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {item.type === "booking" ? (
                        <Link
                          href="/admin/bookings"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#CF565D] hover:underline"
                        >
                          Bookings
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : item.type === "registration" ? (
                        <Link
                          href="/admin/customers"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                        >
                          Clients
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : item.type === "inventory" ? (
                        <Link
                          href="/admin/products"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
                        >
                          Stock
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          href="/admin/orders"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#746D69] hover:text-[#292525]"
                        >
                          Orders
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredActivities.length > itemsPerPage && (
        <div className="p-4 border-t border-[#E8D8C8]/40 dark:border-white/10 flex items-center justify-between text-xs text-[#746D69] dark:text-[#A89F9A] bg-[#FAF7F2]/40 dark:bg-[#252020]/60">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of{" "}
            {filteredActivities.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-[#E8D8C8] dark:border-white/10 disabled:opacity-40 hover:bg-white dark:hover:bg-[#282323] text-[#292525] dark:text-[#FAF7F2]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-[#292525] dark:text-[#FAF7F2]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-[#E8D8C8] dark:border-white/10 disabled:opacity-40 hover:bg-white dark:hover:bg-[#282323] text-[#292525] dark:text-[#FAF7F2]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
