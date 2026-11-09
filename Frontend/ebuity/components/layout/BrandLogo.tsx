import React from "react";
import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  isLight?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "" }) => {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center transition-opacity hover:opacity-95 ${className}`}
      aria-label="Rose Essence Home"
    >
      <div className="relative h-9 sm:h-11 md:h-14 w-auto flex items-center shrink-0">
        <Image
          src="/rose-essence-logo.png"
          alt="Rose Essence"
          width={180}
          height={68}
          priority
          className="h-9 sm:h-11 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
        />
      </div>
    </Link>
  );
};
