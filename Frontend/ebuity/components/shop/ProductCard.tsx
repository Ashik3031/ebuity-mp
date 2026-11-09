"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, ProductVariant } from "../../types/product";
import { useCart } from "../../lib/cart-context";
import { ShoppingBag, Check, Star } from "lucide-react";

interface ProductCardProps {
  product: Product;
  defaultVariant?: ProductVariant;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  defaultVariant,
}) => {
  const { addToCart, loading } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const primaryImage =
    product.images?.[0] ||
    "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=800&q=80";

  const effectivePrice =
    defaultVariant?.price ??
    product.pricing?.salePrice ??
    product.salePrice ??
    product.defaultPrice ??
    0;

  const originalPrice =
    product.compareAtPrice ??
    product.pricing?.basePrice ??
    (product.pricing?.salePrice ? product.pricing.basePrice : null);

  const discountPercent =
    originalPrice && originalPrice > effectivePrice
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : null;

  const currentStock = defaultVariant?.stock ?? product.defaultStock ?? 0;
  const isOutOfStock = currentStock <= 0;
  const productLink = product.slug ? `/shop/${product.slug}` : "/shop";

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isAdding) return;

    try {
      setIsAdding(true);
      const res = await addToCart({
        productId: product._id,
        variantId: defaultVariant?._id,
        quantity: 1,
        productSnapshot: {
          _id: product._id,
          name: product.name,
          images: product.images,
          defaultPrice: product.defaultPrice,
          slug: product.slug,
        },
        variantSnapshot: defaultVariant
          ? {
            _id: defaultVariant._id,
            price: defaultVariant.price,
            optionValues: defaultVariant.optionValues,
          }
          : undefined,
      });

      if (res.success) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2200);
      }
    } catch (err) {
      console.error("Failed to add to bag:", err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-3xl border border-[#E8D8C8]/60 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#CF565D]/30 transition-all duration-300">
      {/* Top Media Container */}
      <Link
        href={productLink}
        className="relative block aspect-square w-full overflow-hidden bg-[#FAF7F2]"
        aria-label={`View details for ${product.name}`}
      >
        <Image
          src={
            imgError
              ? "https://images.unsplash.com/photo-1608248597359-009187ec9c79?auto=format&fit=crop&w=800&q=80"
              : primaryImage
          }
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => setImgError(true)}
        />

        {/* Badges Overlay */}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
          {discountPercent && discountPercent > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#CF565D] text-white shadow-xs">
              Save {discountPercent}%
            </span>
          )}
          {product.tags?.includes("bestseller") && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#FAF7F2]/90 backdrop-blur-xs text-[#292525] border border-[#E8D8C8]">
              Bestseller
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#292525]/85 text-white">
              Sold Out
            </span>
          )}
        </div>
      </Link>

      {/* Card Info Container */}
      <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
        <div className="space-y-1.5">
          {/* Category & Rating */}
          {/* <div className="flex items-center justify-between text-xs text-[#746D69]">
            <span className="uppercase tracking-widest text-[10px] font-semibold text-[#CF565D]">
              {typeof product.category === "object"
                ? product.category.name || product.category.label
                : product.category || "Botanical Elixir"}
            </span>

            {product.avgRating && (
              <div className="flex items-center gap-1 text-[#292525] font-medium">
                <Star className="w-3.5 h-3.5 fill-[#CF565D] text-[#CF565D]" />
                <span>{product.avgRating.toFixed(1)}</span>
                {product.reviewCount ? (
                  <span className="text-[#746D69] text-[11px]">
                    ({product.reviewCount})
                  </span>
                ) : null}
              </div>
            )}
          </div> */}

          {/* Title */}
          <Link
            href={productLink}
            className="block group/title focus:outline-none"
          >
            <h3 className="font-serif text-lg sm:text-xl font-medium text-[#292525] group-hover/title:text-[#CF565D] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          {/* Short Description */}
          {product.description && (
            <p className="text-xs text-[#746D69] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="pt-2 border-t border-[#E8D8C8]/50 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#746D69]/70 tracking-wider">
              Price
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-[#CF565D]">AED</span>
              <span className="text-lg font-serif font-semibold text-[#292525]">
                {effectivePrice.toFixed(2)}
              </span>
              {originalPrice && originalPrice > effectivePrice && (
                <span className="text-xs text-[#746D69]/60 line-through">
                  AED {originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isAdding}
            className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 ${justAdded
              ? "bg-emerald-700 text-white shadow-xs"
              : isOutOfStock
                ? "bg-[#FAF7F2] text-[#746D69]/50 border border-[#E8D8C8] cursor-not-allowed"
                : "bg-[#CF565D] text-white hover:bg-[#b8454c] shadow-xs active:scale-95"
              }`}
            aria-label={`Add ${product.name} to bag`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Added</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isAdding ? "Adding..." : "Add"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
