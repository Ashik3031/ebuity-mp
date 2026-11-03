"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { staffApi } from "../../../lib/api-client";
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await staffApi.login({
        email: email.trim(),
        password,
      });

      if (res.success) {
        setSuccess(`Welcome, ${res.staff.name}! Loading your job schedule...`);
        if (typeof window !== "undefined") {
          localStorage.setItem("rose_staff_session", JSON.stringify(res.staff));
        }
        setTimeout(() => {
          router.push("/staff/dashboard");
        }, 800);
      } else {
        setError(res.message || "Invalid credentials.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative luxury ambient blur shapes matching admin */}
      <div className="absolute top-12 left-12 w-64 h-64 rounded-full bg-[#F5DAD6]/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-80 h-80 rounded-full bg-[#E8D8C8]/50 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8]/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-10 z-10">
        {/* Brand Emblem */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#CF565D] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(207,86,93,0.35)] mb-3.5">
            <span className="font-serif font-black text-2xl tracking-tighter">
              RE
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FCF4F2] text-[#CF565D] border border-[#CF565D]/20 mb-1">
            Specialist Portal
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#292525]">
            Rose Essence
          </h1>
          <p className="text-xs text-[#746D69] mt-0.5">
            Therapist & Stylist Secure Access
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="staff-email"
              className="block text-xs font-semibold text-[#292525] mb-1.5"
            >
              Specialist Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#746D69]" />
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="therapist@roseessence.ae"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] placeholder-[#746D69]/60 text-xs focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D] transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="staff-password"
              className="block text-xs font-semibold text-[#292525] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#746D69]" />
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] placeholder-[#746D69]/60 text-xs focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D] transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#CF565D] hover:bg-[#b8454c] text-white font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Access Specialist Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-[#E8D8C8]/70">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#CF565D]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#746D69]">
              Quick Demo Staff Accounts
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo("fatima@roseessence.ae")}
              className="w-full text-left p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5DAD6]/30 border border-[#E8D8C8] transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-[#292525] group-hover:text-[#CF565D]">
                  Fatima Al-Mansoor
                </p>
                <p className="text-[11px] text-[#746D69]">
                  Nail & Facial Artist
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-[#E8D8C8] text-[#292525] font-semibold">
                Use
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo("layla@roseessence.ae")}
              className="w-full text-left p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5DAD6]/30 border border-[#E8D8C8] transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-[#292525] group-hover:text-[#CF565D]">
                  Layla Zahran
                </p>
                <p className="text-[11px] text-[#746D69]">
                  Hair & Makeup Specialist
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-[#E8D8C8] text-[#292525] font-semibold">
                Use
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/admin/staff"
            className="text-xs text-[#746D69] hover:text-[#CF565D] underline transition-colors"
          >
            Are you an administrator? Open Admin Staff Management &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
