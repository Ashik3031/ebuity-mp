"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { Customer, adminCustomerApi, ApiError } from "../../lib/api-client";

interface CustomerStatusModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCustomer: Customer) => void;
}

export function CustomerStatusModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: CustomerStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const willBlock = !customer.isBlocked;
  const actionVerb = willBlock ? "Deactivate" : "Activate";

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetId = customer.userId || customer._id;
      const res = await adminCustomerApi.toggleBlockStatus(targetId, willBlock);

      if (res.success) {
        onSuccess({
          ...customer,
          isBlocked: willBlock,
        });
        onClose();
      } else {
        setError(res.message || "Failed to update customer status");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to update customer account status";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#F5DAD6] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5DAD6]/60 bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                willBlock
                  ? "bg-[#CF565D]/10 text-[#CF565D]"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {willBlock ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#292525]">
                {actionVerb} Client Account
              </h3>
              <p className="text-xs text-[#746D69]">
                Update client access status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-[#746D69] hover:text-[#292525] rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6]/80 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[#746D69]">Client Name:</span>
              <span className="font-medium text-[#292525]">{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#746D69]">Email:</span>
              <span className="font-mono text-xs text-[#292525]">{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#746D69]">Current Status:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  customer.isBlocked
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {customer.isBlocked ? "Deactivated (Blocked)" : "Active"}
              </span>
            </div>
          </div>

          <p className="text-sm text-[#746D69] leading-relaxed">
            {willBlock
              ? "Deactivating this client account will immediately revoke their ability to sign in, book treatments, or order products. Their historical bookings and data will remain preserved for accounting compliance."
              : "Reactivating this client account will restore their ability to log in, view scheduled wellness rituals, and place boutique orders."}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#FAF7F2] border-t border-[#F5DAD6]/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#746D69] hover:text-[#292525] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all ${
              willBlock
                ? "bg-[#CF565D] hover:bg-[#b8454c]"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm {actionVerb}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
