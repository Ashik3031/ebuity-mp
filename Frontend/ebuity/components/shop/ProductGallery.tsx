"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images?: string[];
  title: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  title,
}) => {
  const fallbackUrl =
    "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=1200&q=85";

  const displayImages: string[] =
    images && images.length > 0 ? images : [fallbackUrl];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImageUrl = displayImages[activeIndex] || displayImages[0];

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-6">
      {/* Thumbnail Bar */}
      {displayImages.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[550px] scrollbar-none py-1">
          {displayImages.map((url, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-18 h-18 sm:w-20 sm:h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? "border-[#CF565D] ring-2 ring-[#CF565D]/20 shadow-xs"
                    : "border-[#E8D8C8] hover:border-[#CF565D]/50 opacity-75 hover:opacity-100"
                }`}
                aria-label={`Thumbnail ${idx + 1} for ${title}`}
              >
                <Image
                  src={url}
                  alt={`${title} preview ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main Large Image Container */}
      <div className="relative flex-1 aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8D8C8]/70 shadow-md">
        <Image
          src={activeImageUrl}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center transition-all duration-500 ease-out"
        />

        {/* Botanical Watermark subtle pill */}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-[11px] font-serif italic text-[#746D69] border border-[#E8D8C8]">
          Pure Damascena Formula
        </div>
      </div>
    </div>
  );
};
