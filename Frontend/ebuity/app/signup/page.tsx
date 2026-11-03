"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
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
      });

      setSuccessMessage("Your Rose Essence account has been created! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrors({ general: msg });
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
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D] ${
                  errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#E8D8C8]"
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
              <Link href="/login" className="font-semibold text-[#CF565D] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
