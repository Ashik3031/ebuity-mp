"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { productApi } from "../../lib/api-client";
import { ProductListItem } from "../../types/product";
import { ProductCard } from "../shop/ProductCard";
import { FALLBACK_PRODUCTS } from "../../lib/catalog-data";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Flower2,
} from "lucide-react";

// Filter tabs (labels unchanged)
const TABS = [
  { key: "all", label: "All Best Sellers" },
  { key: "skincare", label: "Skincare services" },
  { key: "wellness", label: "Wellness & Relaxation" },
];

export const BestSellerProducts: React.FC = () => {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadBestSellers() {
      try {
        setLoading(true);
        const res = await productApi.getAll({
          limit: 20,
          isActive: true,
        });

        if (isMounted) {
          if (res?.items && res.items.length > 0) {
            // Filter out any mock/test products to maintain luxury branding
            const curated = res.items.filter(
              (item) =>
                item.product?.name &&
                !item.product.name.toLowerCase().includes("test")
            );
            setItems(curated.length > 0 ? curated : res.items);
          } else {
            // Graceful fallback to curated catalog data if database has no products
            const fallbackItems: ProductListItem[] = FALLBACK_PRODUCTS.map((p) => ({
              product: p,
              variants: p.variants,
            }));
            setItems(fallbackItems);
          }
        }
      } catch (err) {
        console.warn("Could not load best seller products from DB:", err);
        if (isMounted) {
          const fallbackItems: ProductListItem[] = FALLBACK_PRODUCTS.map((p) => ({
            product: p,
            variants: p.variants,
          }));
          setItems(fallbackItems);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBestSellers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered by selected category tab (All, Skincare, Wellness)
  const displayItems = useMemo(() => {
    if (activeTab === "all") {
      return items.slice(0, 8);
    }

    return items
      .filter((item) => {
        const cat = item.product.category;
        const catName =
          (typeof cat === "object" ? cat?.name || cat?.label : String(cat || "")) || "";
        return catName.toLowerCase().includes(activeTab.toLowerCase());
      })
      .slice(0, 8);
  }, [items, activeTab]);

  return (
    <section
      id="best-sellers"
      className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-[#FDF7F3] via-[#FAF4EF] to-[#FBF4EF]"
    >
      {/* Background: soft blush glows + petals, same family as the other sections */}
      <div className="absolute top-0 right-0 w-[45%] max-w-[700px] h-[50%] pointer-events-none select-none">
        <svg
          viewBox="0 0 700 520"
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="bestEdgeSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <linearGradient id="bestBlushGrad" x1="700" y1="0" x2="50" y2="520" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F9D8DB" />
              <stop offset="55%" stopColor="#FBE3E2" />
              <stop offset="100%" stopColor="#FCEEEA" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M560,0 L700,0 L700,520 L330,520 C150,470 150,330 250,240 C340,160 470,130 560,0 Z"
            fill="url(#bestBlushGrad)"
            filter="url(#bestEdgeSoft)"
          />
        </svg>
      </div>
      <div className="absolute -bottom-28 -left-24 w-96 h-96 rounded-full bg-[#F7D4D7]/40 blur-3xl pointer-events-none" />

      <div className="hidden lg:block absolute inset-0 pointer-events-none select-none">
        <div className="absolute left-[4%] top-[8%] animate-petal-1">
          <svg viewBox="0 0 36 44" fill="none" className="w-9 xl:w-11 h-auto drop-shadow-sm" style={{ transform: "rotate(-20deg)" }}>
            <path d="M15 2C26 6 34 17 33 30C32 40 19 44 11 41C3 38 -1 26 1 16C3 6 9 0 15 2Z" fill="url(#bestPetalA)" />
            <defs>
              <linearGradient id="bestPetalA" x1="5" y1="5" x2="32" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE8F99" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute right-[3%] bottom-[14%] animate-petal-4 blur-[0.5px]">
          <svg viewBox="0 0 34 38" fill="none" className="w-8 xl:w-10 h-auto" style={{ transform: "rotate(22deg)" }}>
            <path d="M12 2C22 5 30 14 29 24C28 32 17 36 9 33C2 30 -1 22 1 13C3 4 7 0 12 2Z" fill="url(#bestPetalB)" />
            <defs>
              <linearGradient id="bestPetalB" x1="4" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCE8E6" />
                <stop offset="0.6" stopColor="#EE959D" />
                <stop offset="1" stopColor="#D9606E" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-14">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-[#746D69]">
                {/* <Sparkles className="w-3.5 h-3.5 text-[#C8505F]" /> */}
                <span>Organic Rose Botanicals &amp; Accessories</span>
              </span>
              <span className="hidden sm:inline-block w-12 h-[1px] bg-[#E8D8C8]"></span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.6rem] uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
              Best Seller Products
            </h2>
          </div>

          <div className="max-w-md">
            <p className="text-sm text-[#746D69] font-normal leading-relaxed mb-3">
              Formulated with pure Rosa Damascena and clinical-grade botanical extracts. Continue your luxurious spa ceremony at home.
            </p>
            <Link
              href="/shop"
              className="group/link inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#C8505F] border-b border-[#C8505F]/30 hover:border-[#C8505F] pb-0.5 transition-colors"
            >
              <span>Explore All Botanicals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide shrink-0 transition-all duration-200 ${activeTab === tab.key
                ? "bg-[#C8505F] text-white shadow-md shadow-[#C8505F]/20"
                : "bg-white/80 backdrop-blur-sm text-[#292525] border border-[#E8D8C8] hover:border-[#C8505F] hover:text-[#C8505F]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/90 rounded-[28px] border border-[#E8D8C8]/70 p-3 animate-pulse"
              >
                <div className="w-full aspect-[4/5] bg-[#F5DAD6]/40 rounded-3xl" />
                <div className="space-y-3 p-3 pt-5">
                  <div className="w-2/3 h-5 bg-[#E8D8C8]/40 rounded-full" />
                  <div className="w-1/3 h-4 bg-[#FAF4EF] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayItems.map((item) => (
              <div
                key={item.product._id}
                className="rounded-[28px] shadow-[0_12px_40px_rgba(200,80,95,0.06)] hover:shadow-[0_22px_55px_rgba(200,80,95,0.15)] hover:-translate-y-1 transition-all duration-300"
              >
                <ProductCard
                  product={item.product}
                  defaultVariant={item.variants?.[0]}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/90 backdrop-blur-sm rounded-[28px] border border-[#E8D8C8]/70 shadow-[0_12px_40px_rgba(200,80,95,0.06)]">
            <div className="w-14 h-14 rounded-full bg-[#F5DAD6] flex items-center justify-center mx-auto mb-4">
              <Flower2 className="w-7 h-7 text-[#C8505F]" />
            </div>
            <p className="font-serif text-xl text-[#292525]">No products found</p>
            <p className="text-sm text-[#746D69] mt-1">Check back soon for new arrivals.</p>
          </div>
        )}

        {/* Trust Badges Strip */}
        <div className="mt-16 p-6 sm:p-8 rounded-[28px] bg-white/70 backdrop-blur-md border border-[#E8D8C8]/70 shadow-[0_12px_40px_rgba(200,80,95,0.06)] grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-[#E8D8C8]/70 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-4 sm:pr-6">
            <div className="w-12 h-12 rounded-full bg-[#F5DAD6] flex items-center justify-center text-[#C8505F] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                Complimentary UAE Delivery
              </h4>
              <p className="text-xs text-[#746D69] mt-1">
                On all product orders over AED 250
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-4 sm:px-6">
            <div className="w-12 h-12 rounded-full bg-[#F5DAD6] flex items-center justify-center text-[#C8505F] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                Pure Rosa Damascena
              </h4>
              <p className="text-xs text-[#746D69] mt-1">
                100% natural, certified clean formulations
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-4 sm:pl-6">
            <div className="w-12 h-12 rounded-full bg-[#F5DAD6] flex items-center justify-center text-[#C8505F] shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292525]">
                Salon-Grade Assurance
              </h4>
              <p className="text-xs text-[#746D69] mt-1">
                Administered by licensed aesthetic specialists
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};