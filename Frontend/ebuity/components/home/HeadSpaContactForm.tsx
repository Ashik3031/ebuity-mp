"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const INQUIRY_TOPICS = [
  "General Enquiry",
  "At-Home Service Booking",
  "Bespoke Bridal or Event Package",
  "Damascus Botanical Products",
  "Custom Ceremony Request",
  "Other Assistance",
];

export const HeadSpaContactForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: INQUIRY_TOPICS[0],
    message: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Full name is required (at least 2 characters).";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (formData.phone.trim() && !/^[+0-9\s\-()]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid contact number.";
    }

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      newErrors.message = "Please write your enquiry (at least 5 characters).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit enquiry. Please try again.");
      }

      setSuccess(true);
      setSuccessMessage(data.message || "Thank you! Your enquiry has been received.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: INQUIRY_TOPICS[0],
        message: "",
      });
    } catch (err: any) {
      setServerError(err?.message || "An error occurred while sending your enquiry.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setSuccessMessage("");
    setErrors({});
    setServerError(null);
  };

  return (
    <div className="w-full bg-white/20 sm:bg-white/25 backdrop-blur-xl border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)] rounded-3xl p-6 sm:p-8 relative transition-all duration-300">
      {/* Header Pill inside card */}
      <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#CF565D] animate-pulse" />
          <span
            className="text-xs uppercase tracking-widest font-semibold drop-shadow-xs"
            style={{ color: "#ffffff" }}
          >
            Send an Enquiry
          </span>
        </div>
        <span
          className="text-xs font-serif italic"
          style={{ color: "#ffffff", opacity: 0.9 }}
        >
          Rose Essence Concierge
        </span>
      </div>

      {success ? (
        <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-[#CF565D]/25 border border-[#CF565D]/60 flex items-center justify-center mx-auto text-[#CF565D] shadow-lg">
            <CheckCircle2 className="w-9 h-9 text-[#CF565D]" />
          </div>
          <h3
            className="font-serif text-2xl font-bold tracking-wide"
            style={{ color: "#ffffff" }}
          >
            Enquiry Received
          </h3>
          <p
            className="text-sm max-w-sm mx-auto leading-relaxed font-sans"
            style={{ color: "#ffffff", opacity: 0.95 }}
          >
            {successMessage}
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
              style={{ color: "#ffffff" }}
            >
              Send Another Message
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/40 border border-red-300/50 text-xs backdrop-blur-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-200" />
              <span className="font-medium" style={{ color: "#ffffff" }}>
                {serverError}
              </span>
            </div>
          )}

          {/* Row 1: Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="name"
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: "#ffffff" }}
              >
                Your Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                className={`w-full px-4 py-2.5 rounded-2xl bg-white/25 border text-sm placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#CF565D] transition-all ${errors.name ? "border-red-400 bg-red-500/20" : "border-white/40"
                  }`}
                style={{ color: "#ffffff" }}
              />
              {errors.name && (
                <p className="text-[11px] text-red-200 mt-1 font-medium">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: "#ffffff" }}
              >
                Phone / WhatsApp
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+971 50 123 4567"
                className={`w-full px-4 py-2.5 rounded-2xl bg-white/25 border text-sm placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#CF565D] transition-all ${errors.phone ? "border-red-400 bg-red-500/20" : "border-white/40"
                  }`}
                style={{ color: "#ffffff" }}
              />
              {errors.phone && (
                <p className="text-[11px] text-red-200 mt-1 font-medium">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Row 2: Email & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: "#ffffff" }}
              >
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 rounded-2xl bg-white/25 border text-sm placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#CF565D] transition-all ${errors.email ? "border-red-400 bg-red-500/20" : "border-white/40"
                  }`}
                style={{ color: "#ffffff" }}
              />
              {errors.email && (
                <p className="text-[11px] text-red-200 mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: "#ffffff" }}
              >
                Enquiry Topic
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#292525]/90 sm:bg-white/25 border border-white/40 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#CF565D] transition-all cursor-pointer"
                style={{ color: "#ffffff" }}
              >
                {INQUIRY_TOPICS.map((topic) => (
                  <option key={topic} value={topic} className="bg-[#292525] text-white">
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
              style={{ color: "#ffffff" }}
            >
              Your Message or Question *
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what you need help with, preferred dates, location, or questions..."
              className={`w-full px-4 py-2.5 rounded-2xl bg-white/25 border text-sm placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#CF565D] transition-all ${errors.message ? "border-red-400 bg-red-500/20" : "border-white/40"
                }`}
              style={{ color: "#ffffff" }}
            />
            {errors.message && (
              <p className="text-[11px] text-red-200 mt-1 font-medium">{errors.message}</p>
            )}
          </div>

          {/* Submit Button in Rose Coral Theme (matching site theme #CF565D) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#CF565D] hover:bg-[#B9474E] active:bg-[#A63D43] font-medium text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border border-white/20"
              style={{ color: "#ffffff" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span style={{ color: "#ffffff" }}>Sending Enquiry...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span style={{ color: "#ffffff" }}>Submit Enquiry</span>
                </>
              )}
            </button>
          </div>

          <p
            className="text-[11px] text-center pt-1"
            style={{ color: "#ffffff", opacity: 0.8 }}
          >
            Our concierge team typically responds within minutes during service hours.
          </p>
        </form>
      )}
    </div>
  );
};
