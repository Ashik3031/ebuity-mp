"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../../../lib/admin-auth-context";
import { Lock, Mail, ShieldAlert, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAdminAuth();

  const [email, setEmail] = useState("admin@roseessence.ae");
  const [password, setPassword] = useState("AdminPass123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/admin");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await login({ email, password });
      if (res.success) {
        router.push("/admin");
      } else {
        setError(res.message || "Invalid credentials or unauthorized role.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("admin@roseessence.ae");
    setPassword("AdminPass123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      {/* Subtle organic decorative background elements */}
      <div className="absolute top-12 left-12 w-64 h-64 rounded-full bg-[#F5DAD6]/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-80 h-80 rounded-full bg-[#E8D8C8]/50 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8D8C8]/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-10">
        {/* Brand Emblem */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#CF565D] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(207,86,93,0.35)] mb-4">
            <span className="font-serif font-black text-2xl tracking-tighter">RE</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#292525]">
            Rose Essence
          </h1>
          <p className="text-xs text-[#746D69] uppercase tracking-wider mt-1">
            Administrative Portal
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#292525] mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@roseessence.ae"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292525] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#746D69] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAF7F2] border border-[#E8D8C8] rounded-xl text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#292525] hover:bg-[#1f1c1c] text-white text-xs font-bold tracking-wide uppercase shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#CF565D]" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4 text-[#CF565D]" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div className="mt-6 pt-5 border-t border-[#E8D8C8]/60 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-[11px] font-semibold text-[#CF565D] hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Demo: Fill Fatima Al Mansoori credentials
          </button>

          <Link
            href="/"
            className="text-[11px] text-[#746D69] hover:text-[#292525] mt-1"
          >
            ← Return to customer store
          </Link>
        </div>
      </div>
    </div>
  );
}
