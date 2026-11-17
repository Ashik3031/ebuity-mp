"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin,
  ChevronDown,
  Search,
  Check,
  X,
  Sparkles,
  Building2,
  Plus,
} from "lucide-react";

export interface ServiceAreaSelectProps {
  value: string;
  onChange: (area: string) => void;
  options: string[];
  emirate?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  popularLocations?: string[];
}

const DEFAULT_POPULAR_DUBAI = [
  "Dubai Marina",
  "Downtown Dubai",
  "Palm Jumeirah",
  "Business Bay",
  "DIFC",
  "Dubai Hills Estate",
  "JBR (Jumeirah Beach Residence)",
  "Jumeirah Lake Towers (JLT)",
  "Arabian Ranches",
  "City Walk",
  "Al Barsha",
  "Jumeirah",
];

export function ServiceAreaSelect({
  value,
  onChange,
  options = [],
  emirate = "Dubai",
  placeholder = "Select or search your area / community...",
  disabled = false,
  className = "",
  popularLocations = DEFAULT_POPULAR_DUBAI,
}: ServiceAreaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Keyboard navigation: Escape closes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, search]);

  const hasExactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return options.some((opt) => opt.toLowerCase() === q);
  }, [options, search]);

  const handleSelect = (area: string) => {
    onChange(area);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl flex items-center justify-between text-left transition cursor-pointer select-none ${
          isOpen
            ? "border-[#E11D74] ring-4 ring-[#E11D74]/10"
            : value
            ? "border-[#CF565D]/40 hover:border-[#CF565D]"
            : "border-[#EADFD3] hover:border-[#CF565D]/40"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-stone-50" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MapPin
            className={`w-4 h-4 shrink-0 transition-colors ${
              value ? "text-[#CF565D]" : "text-[#746D69]"
            }`}
          />
          {value ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm font-semibold text-[#1E293B] truncate">
                {value}
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Active Zone
              </span>
            </div>
          ) : (
            <span className="text-sm text-[#64748B]/70 truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 text-[#746D69] hover:text-[#1E293B] hover:bg-[#FAF7F2] rounded-md transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#746D69] transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#CF565D]" : ""
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E8D8C8] shadow-[0_16px_40px_rgba(41,37,36,0.14)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: "280px" }}
        >
          {/* Sticky Header with Search */}
          <div className="p-3 bg-[#FAF7F2]/80 border-b border-[#E8D8C8]/70">
            <div className="relative">
              <Search className="w-4 h-4 text-[#746D69] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${emirate} areas (e.g. Marina, Downtown)...`}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#E8D8C8] rounded-xl text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none focus:border-[#CF565D] focus:ring-2 focus:ring-[#CF565D]/15"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#746D69] hover:text-[#292525] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Popular Fast-Pick Chips (shown when search is empty) */}
            {!search && popularLocations && popularLocations.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[#E8D8C8]/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#746D69] mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#CF565D]" />
                  Popular {emirate} Areas
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {popularLocations.slice(0, 8).map((pop) => (
                    <button
                      key={pop}
                      type="button"
                      onClick={() => handleSelect(pop)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        value === pop
                          ? "bg-[#CF565D] text-white border-[#CF565D] font-semibold"
                          : "bg-white text-[#292525] border-[#E8D8C8] hover:border-[#CF565D] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      {pop}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List of Communities */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#E8D8C8]/30 py-1">
            {/* Custom search entry option if no exact match */}
            {search.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full px-3.5 py-2.5 text-left text-xs bg-[#FAF7F2] hover:bg-[#FDF2F4] text-[#CF565D] font-medium flex items-center justify-between transition cursor-pointer border-b border-[#E8D8C8]"
              >
                <span className="flex items-center gap-2 truncate">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Use &ldquo;<strong>{search.trim()}</strong>&rdquo; as my community</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                  Custom
                </span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((loc) => {
                const isSelected = value === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF7F2] text-[#CF565D] font-semibold"
                        : "text-[#292525] hover:bg-[#FAF7F2]/70 hover:text-[#CF565D]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Building2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? "text-[#CF565D]" : "text-[#746D69]"
                        }`}
                      />
                      <span className="truncate">{loc}</span>
                    </span>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[#CF565D] shrink-0 ml-2">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-[#746D69] mb-2">
                  No predefined zone found matching &ldquo;{search}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#292525] text-white text-xs font-semibold hover:bg-[#1a1717] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Select &ldquo;{search.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-3.5 py-2 bg-[#FAF7F2] border-t border-[#E8D8C8]/60 text-[11px] text-[#746D69] flex items-center justify-between">
            <span>{filteredOptions.length} areas available in {emirate}</span>
            <span className="text-[#059669] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              Verified Home & Hotel Service
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
