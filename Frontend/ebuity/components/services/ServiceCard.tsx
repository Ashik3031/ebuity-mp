"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Service } from "../../types/service";
import { Clock, ArrowRight, Sparkles, UserCheck, Home, Zap } from "lucide-react";

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const [imgError, setImgError] = useState(false);

  const primaryImage =
    service.images?.[0] ||
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80";

  const categoryName =
    typeof service.category === "object"
      ? service.category.name
      : "At-Home Ceremony";

  const durationDisplay = service.durationMinutes ?? service.duration ?? 30;
  const currencyDisplay = service.currency || "AED";
  const serviceLink = `/services/${encodeURIComponent(service.slug || service._id)}`;

  return (
    <div className="group relative flex flex-col bg-white rounded-3xl border border-[#E8D8C8]/70 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#CF565D]/30 transition-all duration-300 w-full max-w-full min-w-0 box-border">
      {/* Top Image Container */}
      <Link
        href={serviceLink}
        className="relative block aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-[#FAF7F2]"
        aria-label={`Explore ${service.name}`}
      >
        <Image
          src={
            imgError
              ? "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
              : primaryImage
          }
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => setImgError(true)}
        />

        {/* Badges Container (Zero Collision on Mobile) */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none z-10">
          {/* Top Left Badges */}
          <div className="flex flex-wrap gap-1.5 max-w-[56%]">
            {/* Duration Badge */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/95 backdrop-blur-xs text-[#292525] border border-[#E8D8C8] shadow-2xs">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#CF565D]" />
              <span>{durationDisplay}m</span>
            </div>

            {/* Women Only Badge */}
            {service.womenOnly && (
              <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#F5DAD6] text-[#CF565D] border border-[#CF565D]/20 shadow-2xs">
                <UserCheck className="w-3 h-3" />
                <span>Ladies</span>
              </div>
            )}
          </div>

          {/* Top Right Badges */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[42%]">
            {service.isExclusiveDeal && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500 to-[#CF565D] text-white shadow-md truncate">
                <Zap className="w-3 h-3 fill-current shrink-0" />
                <span className="truncate">{service.dealBadge || "Deal"}</span>
              </div>
            )}

            {service.isFeatured && !service.isExclusiveDeal && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#CF565D] text-white shadow-2xs">
                <Sparkles className="w-3 h-3" />
                <span>Popular</span>
              </div>
            )}

            {service.serviceType === "home" && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 backdrop-blur-xs text-[#746D69] border border-[#E8D8C8]">
                <Home className="w-2.5 h-2.5 text-[#CF565D]" />
                <span>At Home</span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 lg:p-6 justify-between gap-3 sm:gap-4 min-w-0">
        <div className="space-y-2 min-w-0">
          {/* Category Tag */}
          <div className="flex items-center justify-between">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#CF565D]">
              {categoryName}
            </span>
            {service.isExclusiveDeal && service.dealDiscountPercentage ? (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                {service.dealDiscountPercentage}% OFF
              </span>
            ) : null}
          </div>

          {/* Title */}
          <Link href={serviceLink} className="block group/title focus:outline-none">
            <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#292525] group-hover/title:text-[#CF565D] transition-colors line-clamp-1">
              {service.name}
            </h3>
          </Link>

          {/* Short Description */}
          {service.shortDescription && (
            <p className="text-xs text-[#746D69] line-clamp-2 leading-relaxed">
              {service.shortDescription}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="pt-3 border-t border-[#E8D8C8]/60 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#746D69]/70 tracking-wider">
              {service.isExclusiveDeal ? "Today's Deal" : "Session Price"}
            </span>
            <div className="flex items-baseline gap-1.5">
              {service.isExclusiveDeal && service.dealPrice != null ? (
                <>
                  <span className="text-xs font-semibold text-[#CF565D]">
                    {currencyDisplay}
                  </span>
                  <span className="text-xl font-serif font-bold text-[#CF565D]">
                    {service.dealPrice}
                  </span>
                  <span className="text-xs text-[#746D69]/60 line-through">
                    {service.price}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-[#CF565D]">
                    {currencyDisplay}
                  </span>
                  <span className="text-xl font-serif font-semibold text-[#292525]">
                    {service.price}
                  </span>
                </>
              )}
            </div>
          </div>

          <Link
            href={serviceLink}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-2xs ${service.isExclusiveDeal
              ? "bg-[#CF565D] text-white hover:bg-[#b8454c] shadow-xs"
              : "bg-[#FAF7F2] text-[#292525] border border-[#E8D8C8] hover:bg-[#CF565D] hover:text-white hover:border-[#CF565D]"
              }`}
          >
            <span>{service.isExclusiveDeal ? "Claim Deal" : "Explore"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
