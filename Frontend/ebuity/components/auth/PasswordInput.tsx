"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  id: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = "Password",
  error,
  id,
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-[#292525]">
          {label}
        </label>
      </div>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={showPassword ? "text" : "password"}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#292525] placeholder:text-[#746D69]/50 transition-colors focus:border-[#CF565D] focus:outline-none focus:ring-1 focus:ring-[#CF565D] ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-[#E8D8C8]"
          } ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#746D69] hover:text-[#292525] focus:outline-none"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
