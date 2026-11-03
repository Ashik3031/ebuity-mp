import React from "react";
import { LowStockProductItem } from "../../lib/api-client";
import { AlertTriangle, Package, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface LowStockWidgetProps {
  products: LowStockProductItem[];
  pendingRequests?: {
    cancellations: number;
    reschedules: number;
    flaggedAssignments: number;
  };
}

export function LowStockWidget({
  products,
  pendingRequests,
}: LowStockWidgetProps) {
  return (
    <div className="bg-white dark:bg-[#1f1b1b] rounded-2xl p-4 sm:p-5 border border-[#E8D8C8]/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#292525] dark:text-[#FAF7F2]">Low-Stock Alerts</h3>
            <p className="text-xs text-[#746D69] dark:text-[#A89F9A] mt-0.5">
              Skincare & retail items requiring restock
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Operational Attention Badge if any cancellations or flags */}
        {pendingRequests && (pendingRequests.cancellations > 0 || pendingRequests.flaggedAssignments > 0) && (
          <div className="p-3 mb-3 rounded-xl bg-[#FCF4F2] dark:bg-[#CF565D]/15 border border-[#F5DAD6] dark:border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CF565D] animate-ping" />
              <span className="font-semibold text-[#292525] dark:text-[#FAF7F2]">
                {pendingRequests.flaggedAssignments} Flagged Bookings
              </span>
            </div>
            <Link
              href="/admin/staff"
              className="text-[#CF565D] font-bold text-[11px] hover:underline"
            >
              Resolve
            </Link>
          </div>
        )}

        {/* Products list */}
        <div className="space-y-2.5">
          {(!products || products.length === 0) ? (
            <div className="text-center py-6 text-[#746D69] dark:text-[#A89F9A] text-xs">
              <Package className="w-6 h-6 mx-auto mb-1 text-emerald-600/70" />
              Inventory levels healthy. No urgent low-stock items.
            </div>
          ) : (
            products.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#282323] border border-[#E8D8C8]/50 dark:border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1a1717] border border-[#E8D8C8] dark:border-white/10 flex items-center justify-center text-[#746D69] dark:text-[#A89F9A] shrink-0 overflow-hidden">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5 text-[#CF565D]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#292525] dark:text-[#FAF7F2] truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[#746D69] dark:text-[#A89F9A]">
                      {p.currency} {p.price}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      p.stock <= 2
                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300"
                        : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#E8D8C8]/40 dark:border-white/10 flex items-center justify-between">
        <Link
          href="/admin/inventory"
          className="text-xs font-semibold text-[#CF565D] hover:underline inline-flex items-center gap-1"
        >
          View Full Inventory
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
