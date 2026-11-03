"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { authApi } from "../../lib/api-client";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { BrandLogo } from "../../components/layout/BrandLogo";
import {
  validateEmail,
  validatePassword,
  validateOtp,
} from "../../schemas/auth.schema";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password reset modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setErrors({
        email: emailErr || undefined,
        password: passErr || undefined,
      });
      return;
    }

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      setSuccessMessage("Welcome back to Rose Essence! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials or network issue.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setResetError(emailErr);
      return;
    }

    try {
      setResetLoading(true);
      const res = await authApi.sendResetOtp({ email: resetEmail.trim() });
      if (res.success) {
        setResetStep("verify");
        setResetSuccess("Verification OTP sent to your registered email.");
      } else {
        setResetError(res.message || "Failed to send reset OTP.");
      }
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const otpErr = validateOtp(resetOtp);
    const passErr = validatePassword(newPassword);
    if (otpErr || passErr) {
      setResetError(otpErr || passErr);
      return;
    }

    try {
      setResetLoading(true);
      const res = await authApi.resetPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        newPassword,
      });
      if (res.success) {
        setResetSuccess("Password reset successfully! You can now log in.");
        setTimeout(() => {
          setShowForgotModal(false);
          setResetStep("request");
          setResetSuccess(null);
          setPassword("");
        }, 1800);
      } else {
        setResetError(res.message || "Invalid or expired OTP.");
      }
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#746D69] hover:text-[#CF565D] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Boutique
        </Link>

        <div className="flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#292525] mt-6 tracking-tight">
            Client Sign In
          </h1>
          <p className="mt-2 text-sm text-[#746D69]">
            Access your botanical skincare rituals & orders
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E8D8C8] shadow-sm">
          {errors.general && (
            <div
              className="mb-5 p-3.5 rounded-2xl bg-[#F5DAD6]/50 border border-[#CF565D]/40 text-[#292525] text-xs flex items-start gap-2.5"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-[#CF565D] shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="mb-5 p-3.5 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-start gap-2.5"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#292525] mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D] ${
                  errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#E8D8C8]"
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <PasswordInput
              id="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              error={errors.password}
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setResetEmail(email || "");
                  setResetStep("request");
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="text-xs font-semibold text-[#CF565D] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-[#CF565D] text-white text-sm font-medium hover:bg-[#B9474E] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs focus:ring-2 focus:ring-[#CF565D] focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In to Rose Essence"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E8D8C8] text-center">
            <p className="text-sm text-[#746D69]">
              New to Rose Essence?{" "}
              <Link href="/signup" className="font-semibold text-[#CF565D] hover:underline">
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8D8C8] max-w-md w-full p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#292525] font-serif text-2xl font-medium">
                <KeyRound className="w-5 h-5 text-[#CF565D]" />
                <span>Reset Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#746D69] hover:text-[#292525] text-xl font-medium"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-[#F5DAD6]/50 text-[#CF565D] text-xs flex items-center gap-2 border border-[#CF565D]/30">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-xs flex items-center gap-2 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetStep === "request" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-[#746D69]">
                  Enter your email address to receive a 6-digit password reset OTP.
                </p>
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-[#292525] mb-1">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-sm text-[#292525] focus:border-[#CF565D] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-full border border-[#E8D8C8] text-xs font-medium text-[#746D69] hover:bg-[#FAF7F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-full bg-[#CF565D] text-white text-xs font-medium hover:bg-[#B9474E] disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-otp" className="block text-xs font-semibold text-[#292525] mb-1">
                    6-Digit OTP
                  </label>
                  <input
                    id="reset-otp"
                    type="text"
                    maxLength={6}
                    required
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2 bg-white border border-[#E8D8C8] rounded-xl text-sm text-[#292525] tracking-widest text-center font-mono focus:border-[#CF565D] focus:outline-none"
                  />
                </div>
                <div>
                  <PasswordInput
                    id="new-password"
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep("request")}
                    className="px-4 py-2 rounded-full border border-[#E8D8C8] text-xs font-medium text-[#746D69] hover:bg-[#FAF7F2]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-full bg-[#CF565D] text-white text-xs font-medium hover:bg-[#B9474E] disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm New Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
