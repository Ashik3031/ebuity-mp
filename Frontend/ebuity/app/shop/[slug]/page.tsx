"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { ProductGallery } from "../../../components/shop/ProductGallery";
import { VariantSelector } from "../../../components/shop/VariantSelector";
import { ProductCard } from "../../../components/shop/ProductCard";
import { productApi } from "../../../lib/api-client";
import { Product, ProductVariant } from "../../../types/product";
import {
  FALLBACK_PRODUCTS,
  getFallbackProductBySlug,
} from "../../../lib/catalog-data";
import { useCart } from "../../../lib/cart-context";
import {
  ChevronRight,
  Star,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
  Check,
  Minus,
  Plus,
  AlertCircle,
  Flower2,
  Loader2,
} from "lucide-react";

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Fetch product detail by slug or id
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);

        // First attempt backend API
        const res = await productApi.getById(slug);

        if (isMounted && res && res.product) {
          setProduct(res.product);
          const vList = res.variants || [];
          setVariants(vList);
          if (vList.length > 0) {
            setSelectedVariant(vList[0]);
          }
          return;
        }
      } catch (err) {
        console.warn(
          "Backend product lookup miss, falling back to local catalog:",
          err
        );
      }

      // Fallback lookup
      if (isMounted) {
        const fallback = getFallbackProductBySlug(slug);
        if (fallback) {
          setProduct(fallback);
          setVariants(fallback.variants || []);
          if (fallback.variants && fallback.variants.length > 0) {
            setSelectedVariant(fallback.variants[0]);
          }
        } else {
          setError("Product not found");
        }
      }
    }

    fetchDetail().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Pricing calculations
  const effectivePrice =
    selectedVariant?.price ??
    product?.pricing?.salePrice ??
    product?.salePrice ??
    product?.defaultPrice ??
    0;

  const originalPrice =
    product?.compareAtPrice ??
    product?.pricing?.basePrice ??
    (product?.pricing?.salePrice ? product.pricing.basePrice : null);

  const availableStock =
    selectedVariant?.stock ?? product?.defaultStock ?? 0;

  const isOutOfStock = availableStock <= 0;

  // Quantity handlers
  const handleIncreaseQty = () => {
    if (quantity < availableStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecreaseQty = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!product || isOutOfStock || isAdding) return;

    setAddError(null);
    setIsAdding(true);

    try {
      const res = await addToCart({
        productId: product._id,
        variantId: selectedVariant?._id,
        quantity,
        productSnapshot: {
          _id: product._id,
          name: product.name,
          images: product.images,
          defaultPrice: product.defaultPrice,
          slug: product.slug,
        },
        variantSnapshot: selectedVariant
          ? {
              _id: selectedVariant._id,
              price: selectedVariant.price,
              optionValues: selectedVariant.optionValues,
            }
          : undefined,
      });

      if (res.success) {
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 2500);
      } else {
        setAddError(res.message || "Failed to add item to bag");
      }
    } catch (err: any) {
      setAddError(
        err?.message || "Failed to add item to bag. Please try again."
      );
    } finally {
      setIsAdding(false);
    }
  };

  // Related products (from fallback or other products)
  const relatedProducts = FALLBACK_PRODUCTS.filter(
    (p) => p._id !== product?._id && p.slug !== slug
  ).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Header />

      <main className="flex-1 pb-24">
        {/* Breadcrumb Bar */}
        <div className="bg-[#FAF7F2] border-b border-[#E8D8C8]/60 py-3.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-[#746D69]">
              <Link
                href="/"
                className="hover:text-[#CF565D] transition-colors"
              >
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <Link
                href="/shop"
                className="hover:text-[#CF565D] transition-colors"
              >
                Shop
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span className="font-semibold text-[#292525] truncate max-w-[200px] sm:max-w-none">
                {product ? product.name : "Product Details"}
              </span>
            </nav>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 animate-pulse">
              <div className="aspect-[4/5] rounded-3xl bg-[#E8D8C8]/40" />
              <div className="space-y-6">
                <div className="h-4 bg-[#E8D8C8]/40 rounded w-1/4" />
                <div className="h-10 bg-[#E8D8C8]/40 rounded w-3/4" />
                <div className="h-6 bg-[#E8D8C8]/40 rounded w-1/3" />
                <div className="h-24 bg-[#E8D8C8]/40 rounded w-full" />
                <div className="h-12 bg-[#E8D8C8]/40 rounded-full w-full" />
              </div>
            </div>
          ) : error || !product ? (
            /* Error / Not Found */
            <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl border border-[#E8D8C8] p-10 shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-[#CF565D]">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-[#292525]">
                Botanical Formulation Not Found
              </h2>
              <p className="text-sm text-[#746D69]">
                The product you requested might have been retired or moved to our
                seasonal archives.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
              >
                Return to Shop
              </Link>
            </div>
          ) : (
            /* Product Details Grid */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* Left Column: Image Gallery */}
              <div className="lg:sticky lg:top-28">
                <ProductGallery
                  images={product.images || []}
                  title={product.name}
                />
              </div>

              {/* Right Column: Information & Actions */}
              <div className="space-y-6 sm:space-y-8">
                {/* Header Information */}
                <div className="space-y-2 border-b border-[#E8D8C8]/60 pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                      {typeof product.category === "object"
                        ? product.category.name || product.category.label
                        : product.category || "Botanical Extract"}
                    </span>

                    {/* Stock Status Pill */}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        isOutOfStock
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : availableStock <= 5
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isOutOfStock
                        ? "Currently Sold Out"
                        : availableStock <= 5
                        ? `Only ${availableStock} units remaining`
                        : "In Stock & Ready to Dispatch"}
                    </span>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#292525] leading-tight">
                    {product.name}
                  </h1>

                  {/* Rating Stars & Reviews */}
                  {product.avgRating && (
                    <div className="flex items-center gap-2 pt-1 text-sm text-[#292525]">
                      <div className="flex items-center text-[#CF565D]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.avgRating || 5)
                                ? "fill-[#CF565D]"
                                : "text-neutral-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-xs">
                        {product.avgRating.toFixed(1)}
                      </span>
                      {product.reviewCount ? (
                        <span className="text-[#746D69] text-xs">
                          ({product.reviewCount} verified client reviews)
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Pricing Display */}
                  <div className="pt-3 flex items-baseline gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-[#CF565D]">AED</span>
                      <span className="font-serif text-3xl font-semibold text-[#292525]">
                        {effectivePrice.toFixed(2)}
                      </span>
                    </div>
                    {originalPrice && originalPrice > effectivePrice && (
                      <span className="text-base text-[#746D69]/60 line-through">
                        AED {originalPrice.toFixed(2)}
                      </span>
                    )}
                    {product.pricing?.discount && product.pricing.discount > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                        Save AED {product.pricing.discount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                    About The Formulation
                  </h3>
                  <p className="text-sm text-[#746D69] leading-relaxed">
                    {product.detailedDescription || product.description}
                  </p>
                </div>

                {/* Variant Selection */}
                {variants.length > 0 && (
                  <VariantSelector
                    variants={variants}
                    selectedVariantId={selectedVariant?._id}
                    onSelectVariant={(v) => {
                      setSelectedVariant(v);
                      if (quantity > v.stock) {
                        setQuantity(Math.max(1, v.stock));
                      }
                    }}
                  />
                )}

                {/* Quantity and Add to Bag */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between sm:justify-start border border-[#E8D8C8] rounded-full bg-white px-3 py-2 w-full sm:w-36">
                      <button
                        type="button"
                        onClick={handleDecreaseQty}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="p-1 text-[#292525] hover:text-[#CF565D] disabled:opacity-30 disabled:hover:text-[#292525] focus:outline-none"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="text-sm font-semibold text-[#292525] px-4">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncreaseQty}
                        disabled={quantity >= availableStock || isOutOfStock}
                        className="p-1 text-[#292525] hover:text-[#CF565D] disabled:opacity-30 disabled:hover:text-[#292525] focus:outline-none"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Add To Cart CTA Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isOutOfStock || isAdding}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-8 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#CF565D]/30 ${
                        addedSuccess
                          ? "bg-emerald-700 text-white shadow-md"
                          : isOutOfStock
                          ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                          : "bg-[#CF565D] text-white hover:bg-[#b8454c] shadow-md hover:shadow-lg active:scale-[0.98]"
                      }`}
                    >
                      {addedSuccess ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Added to Bag!</span>
                        </>
                      ) : isOutOfStock ? (
                        <span>Out of Stock</span>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>
                            {isAdding
                              ? "Adding..."
                              : `Add to Bag • AED ${(
                                  effectivePrice * quantity
                                ).toFixed(2)}`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Add error feedback if any */}
                  {addError && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{addError}</span>
                    </p>
                  )}
                </div>

                {/* Fast Checkout or View Cart Links */}
                {addedSuccess && (
                  <div className="p-3.5 rounded-2xl bg-[#F5DAD6]/40 border border-[#CF565D]/20 flex items-center justify-between animate-in fade-in duration-200">
                    <span className="text-xs font-medium text-[#292525]">
                      Item successfully added to your shopping bag.
                    </span>
                    <Link
                      href="/cart"
                      className="text-xs font-bold text-[#CF565D] hover:underline"
                    >
                      View Bag &rarr;
                    </Link>
                  </div>
                )}

                {/* Reassurance & Value Props */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t border-[#E8D8C8]/60">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/60">
                    <Flower2 className="w-5 h-5 text-[#CF565D] flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <strong className="block text-[#292525] font-semibold">
                        Organic Rosa Damascena
                      </strong>
                      <span className="text-[#746D69]">
                        Single-origin botanical harvest distilled with zero parabens.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/60">
                    <Truck className="w-5 h-5 text-[#CF565D] flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <strong className="block text-[#292525] font-semibold">
                        Complimentary Delivery
                      </strong>
                      <span className="text-[#746D69]">
                        Free tracked ground shipping on orders over $60.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/60">
                    <ShieldCheck className="w-5 h-5 text-[#CF565D] flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <strong className="block text-[#292525] font-semibold">
                        Dermatologist Approved
                      </strong>
                      <span className="text-[#746D69]">
                        Certified hypoallergenic and safe for sensitive skin barriers.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#E8D8C8]/60">
                    <Sparkles className="w-5 h-5 text-[#CF565D] flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <strong className="block text-[#292525] font-semibold">
                        Salon-Grade Freshness
                      </strong>
                      <span className="text-[#746D69]">
                        Bottled in small batches in dark protective miron glass.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Formulations Carousel / Grid */}
          {relatedProducts.length > 0 && (
            <section className="mt-20 pt-16 border-t border-[#E8D8C8]">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-xs uppercase tracking-widest font-semibold text-[#CF565D]">
                    Harmonious Rituals
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#292525] mt-1">
                    Complete Your Skincare Ceremony
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#CF565D] hover:text-[#b8454c]"
                >
                  <span>Explore Collection</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {relatedProducts.map((prod) => (
                  <ProductCard key={prod._id} product={prod} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CF565D]" />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
