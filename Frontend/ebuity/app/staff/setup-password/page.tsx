"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { staffApi } from "../../../lib/api-client";
import { BrandLogo } from "../../../components/layout/BrandLogo";
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing invitation token. Please use the exact link sent by your administrator.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await staffApi.setupPassword({
        token,
        newPassword: password,
      });

      if (res.success) {
        setSuccess(
          `Welcome to Rose Essence, ${res.staff.name}! Your account credentials are verified. Redirecting to your staff dashboard...`
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("rose_staff_session", JSON.stringify(res.staff));
        }
        setTimeout(() => {
          router.push("/staff/dashboard");
        }, 1200);
      } else {
        setError(res.message || "Failed to set up password.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid or expired invitation token."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8] shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#CF565D] text-white flex items-center justify-center font-serif font-black text-xl mx-auto shadow-md">
            RE
          </div>
          <span className="text-[11px] font-semibold text-[#CF565D] uppercase tracking-wider block">
            Staff Portal Onboarding
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#292525]">
            Configure Account Password
          </h1>
          <p className="text-xs text-[#746D69] leading-relaxed">
            Welcome to the Rose Essence therapist team. Set up your confidential password to access your appointments and clock-in portal.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!token && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              No invitation token detected in the URL. Please verify your link.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#292525] mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#292525] mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8D8C8] text-xs font-medium text-[#292525] focus:outline-none focus:border-[#CF565D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 rounded-2xl bg-[#CF565D] text-white font-semibold text-xs shadow-md hover:bg-[#b8454c] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete Password Setup</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#E8D8C8]/60">
          <Link
            href="/staff/login"
            className="text-xs text-[#746D69] hover:text-[#CF565D] font-medium"
          >
            Already configured? Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StaffSetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#CF565D]" />
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  );
}
