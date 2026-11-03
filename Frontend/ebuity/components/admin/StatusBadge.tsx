import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const norm = (status || "").toLowerCase().trim();

  let bg = "bg-stone-100 text-stone-700 border-stone-200";
  let dot = "bg-stone-400";
  let label = status || "Unknown";

  if (norm === "on_the_way" || norm === "on-the-way" || norm === "driving") {
    bg = "bg-amber-50 text-amber-900 border-amber-300";
    dot = "bg-amber-500 animate-pulse";
    label = "On The Way";
  } else if (norm === "arrived") {
    bg = "bg-indigo-50 text-indigo-900 border-indigo-200";
    dot = "bg-indigo-600";
    label = "Arrived";
  } else if (norm === "in_progress" || norm === "in-progress") {
    bg = "bg-purple-50 text-purple-900 border-purple-300";
    dot = "bg-purple-600 animate-pulse";
    label = "In Progress";
  } else if (norm === "accepted") {
    bg = "bg-sky-50 text-sky-900 border-sky-300";
    dot = "bg-sky-500";
    label = "Accepted";
  } else if (norm === "assigned") {
    bg = "bg-blue-50 text-blue-900 border-blue-200";
    dot = "bg-blue-500";
    label = "Assigned";
  } else if (norm === "confirmed" || norm === "paid" || norm === "active") {
    bg = "bg-emerald-50 text-emerald-800 border-emerald-200";
    dot = "bg-emerald-500";
    label = norm === "paid" ? "Paid" : norm === "active" ? "Active" : "Confirmed";
  } else if (norm === "completed" || norm === "delivered") {
    bg = "bg-emerald-50 text-emerald-900 border-emerald-300";
    dot = "bg-emerald-600";
    label = norm === "delivered" ? "Delivered" : "Completed";
  } else if (norm === "shipped") {
    bg = "bg-amber-50 text-amber-800 border-amber-200";
    dot = "bg-amber-500";
    label = "Shipped";
  } else if (norm === "unassigned") {
    bg = "bg-[#FCF4F2] text-[#CF565D] border-[#F5DAD6]";
    dot = "bg-[#CF565D]";
    label = "Unassigned";
  } else if (norm === "pending" || norm === "pending_confirmation") {
    bg = "bg-[#FCF4F2] text-[#CF565D] border-[#F5DAD6]";
    dot = "bg-[#CF565D]";
    label = norm === "pending_confirmation" ? "Pending Conf." : "Pending";
  } else if (norm === "cancelled" || norm === "rejected" || norm === "failed") {
    bg = "bg-rose-50 text-rose-800 border-rose-200";
    dot = "bg-rose-500";
    label = norm === "rejected" ? "Rejected" : norm === "failed" ? "Failed" : "Cancelled";
  } else if (norm === "inactive" || norm === "disabled" || norm === "draft") {
    bg = "bg-stone-100 text-stone-600 border-stone-200";
    dot = "bg-stone-400";
    label = norm === "draft" ? "Draft" : "Inactive";
  } else if (norm === "admin_attention" || norm === "flagged") {
    bg = "bg-red-50 text-red-800 border-red-200";
    dot = "bg-red-600 animate-pulse";
    label = "Needs Attention";
  }

  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${px}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
}
