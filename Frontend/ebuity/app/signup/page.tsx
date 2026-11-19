"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { BrandLogo } from "../../components/layout/BrandLogo";
import {
  validateEmail,
  validatePassword,
  validateName,
  validateConfirmPassword,
  ValidationErrors,
} from "../../schemas/auth.schema";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const emailParam = searchParams.get("email") || "";
  const nameParam = searchParams.get("name") || "";
  const phoneParam = searchParams.get("phone") || "";
  const bookingIdParam = searchParams.get("bookingId") || "";
  const claimTokenParam = searchParams.get("claimToken") || "";

  const { register } = useAuth();

  const [name, setName] = useState(nameParam);
  const [email, setEmail] = useState(emailParam);
  const [phone, setPhone] = useState(phoneParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (nameParam && !name) setName(nameParam);
    if (emailParam && !email) setEmail(emailParam);
    if (phoneParam && !phone) setPhone(phoneParam);
  }, [nameParam, emailParam, phoneParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAlreadyExists(false);
    setSuccessMessage(null);

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

    if (nameErr || emailErr || passErr || confirmErr) {
      setErrors({
        name: nameErr || undefined,
        email: emailErr || undefined,
        password: passErr || undefined,
        confirmPassword: confirmErr || undefined,
      });
      return;
    }

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: (phone || phoneParam || "").trim() || undefined,
        bookingId: bookingIdParam || undefined,
        claimToken: claimTokenParam || undefined,
      });

      setSuccessMessage("Your Rose Essence account has been created! Redirecting to your bookings...");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("sign in") ||
        msg.toLowerCase().includes("already registered")
      ) {
        setAlreadyExists(true);
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
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
            Create Client Account
          </h1>
          <p className="mt-2 text-sm text-[#746D69]">
            Join Rose Essence for personalized skincare recommendations
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E8D8C8] shadow-sm">
          {alreadyExists && (
            <div
              className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5 shadow-xs"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span className="font-semibold text-sm">
                  This email already has an account. Please sign in to view your booking.
                </span>
              </div>
              <div className="pt-1">
                <Link
                  href={`/login?redirect=${encodeURIComponent(redirectUrl)}&email=${encodeURIComponent(email)}${bookingIdParam ? `&bookingId=${encodeURIComponent(bookingIdParam)}` : ""}${claimTokenParam ? `&claimToken=${encodeURIComponent(claimTokenParam)}` : ""}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold transition shadow-xs"
                >
                  <span>Sign In to View Booking</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </Link>
              </div>
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#292525] mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Eleanor Vance"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D] ${errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#E8D8C8]"
                  }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

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
                placeholder="eleanor@example.com"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D] ${errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#E8D8C8]"
                  }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#292525] mb-1.5">
                Phone Number (optional)
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full px-4 py-2.5 bg-white border border-[#E8D8C8] rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D]"
              />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              error={errors.password}
            />

            <PasswordInput
              id="confirm-password"
              label="Confirm Password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              error={errors.confirmPassword}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-[#CF565D] text-white text-sm font-medium hover:bg-[#B9474E] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs focus:ring-2 focus:ring-[#CF565D] focus:ring-offset-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E8D8C8] text-center">
            <p className="text-sm text-[#746D69]">
              Already registered?{" "}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectUrl)}&email=${encodeURIComponent(email)}${bookingIdParam ? `&bookingId=${encodeURIComponent(bookingIdParam)}` : ""}${claimTokenParam ? `&claimToken=${encodeURIComponent(claimTokenParam)}` : ""}`}
                className="font-semibold text-[#CF565D] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CF565D]" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
