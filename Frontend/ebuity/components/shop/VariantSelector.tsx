"use client";

import React from "react";
import { ProductVariant } from "../../types/product";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onSelectVariant: (variant: ProductVariant) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onSelectVariant,
}) => {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
          Select Option / Volume
        </label>
        <span className="text-[11px] text-[#746D69]">
          {variants.length} available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variants.map((v) => {
          const isSelected = v._id === selectedVariantId;
          const isOutOfStock = v.stock <= 0;
          const isLowStock = v.stock > 0 && v.stock <= 5;
          const label =
            v.optionValues && Object.values(v.optionValues).filter(Boolean).length > 0
              ? Object.values(v.optionValues).filter(Boolean).join(" • ")
              : "Standard Size";

          return (
            <button
              key={v._id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelectVariant(v)}
              className={`relative flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 focus:outline-none ${isSelected
                  ? "border-[#CF565D] bg-[#F5DAD6]/20 ring-1 ring-[#CF565D] shadow-xs"
                  : "border-[#E8D8C8] bg-white hover:border-[#CF565D]/40"
                } ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-neutral-100" : ""}`}
            >
              <div className="space-y-0.5">
                <span className="block text-sm font-medium text-[#292525]">
                  {label}
                </span>
                <span className="block text-[11px] text-[#746D69]">
                  {isOutOfStock ? (
                    <span className="text-red-600 font-semibold">Sold Out</span>
                  ) : isLowStock ? (
                    <span className="text-amber-700 font-medium">
                      Only {v.stock} left in stock
                    </span>
                  ) : (
                    <span>In stock ({v.stock})</span>
                  )}
                </span>
              </div>

              <div className="text-right">
                <span className="text-sm font-serif font-semibold text-[#292525]">
                  ${v.price.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
