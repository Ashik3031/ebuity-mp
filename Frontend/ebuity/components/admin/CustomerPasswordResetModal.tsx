"use client";

import React, { useState } from "react";
import { KeyRound, CheckCircle, AlertTriangle, X, Loader2, Mail } from "lucide-react";
import { Customer, adminCustomerApi, ApiError } from "../../lib/api-client";

interface CustomerPasswordResetModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerPasswordResetModal({
  customer,
  isOpen,
  onClose,
}: CustomerPasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const handleSendReset = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await adminCustomerApi.initiatePasswordReset(customer.email);

      if (res.success) {
        setSuccessMsg(
          `Password recovery OTP has been securely dispatched to ${customer.email}.`
        );
      } else {
        setError(res.message || "Failed to trigger password reset");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to initiate password reset workflow";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessMsg(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#F5DAD6] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5DAD6]/60 bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#CF565D]/10 text-[#CF565D]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#292525]">
                Account Recovery
              </h3>
              <p className="text-xs text-[#746D69]">
                Initiate client password reset
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
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

          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-900">Recovery Sent</p>
                <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                  {successMsg}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F5DAD6]/80 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#746D69]">Client Name:</span>
                  <span className="font-medium text-[#292525]">
                    {customer.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#746D69]">Destination:</span>
                  <span className="font-mono text-xs text-[#292525]">
                    {customer.email}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5 leading-relaxed">
                <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  In accordance with privacy and security policy, passwords are
                  never stored or exposed in plain text. A secure OTP will be
                  transmitted directly to the client to set their own password.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#FAF7F2] border-t border-[#F5DAD6]/60">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#746D69] hover:text-[#292525] transition-colors"
          >
            {successMsg ? "Close" : "Cancel"}
          </button>
          {!successMsg && (
            <button
              type="button"
              onClick={handleSendReset}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#CF565D] hover:bg-[#b8454c] rounded-xl shadow-sm transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Send Reset OTP</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
