"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { ProductCard } from "../../components/shop/ProductCard";
import { productApi } from "../../lib/api-client";
import { ProductListItem } from "../../types/product";
import { FALLBACK_PRODUCTS } from "../../lib/catalog-data";
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

export default function ShopPage() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Fetch products from backend
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);

        const response = await productApi.getAll({
          page: 1,
          limit: 50,
          isActive: true,
        });

        if (isMounted) {
          if (response && response.items && response.items.length > 0) {
            setItems(response.items);
          } else {
            // Backend DB is unseeded/empty: Fall back gracefully to curated Rose Essence catalog
            const fallbackListItems: ProductListItem[] = FALLBACK_PRODUCTS.map(
              (p) => ({
                product: p,
                variants: p.variants,
              })
            );
            setItems(fallbackListItems);
          }
        }
      } catch (err: unknown) {
        console.warn("Product API load notice:", err);
        if (isMounted) {
          const fallbackListItems: ProductListItem[] = FALLBACK_PRODUCTS.map(
            (p) => ({
              product: p,
              variants: p.variants,
            })
          );
          setItems(fallbackListItems);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute available categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(({ product }) => {
      const catName =
        typeof product.category === "object"
          ? product.category.name || product.category.label
          : product.category;
      if (catName) set.add(catName);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  // Filter & sort product list items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter(({ product }) => {
        const catName =
          typeof product.category === "object"
            ? product.category.name || product.category.label
            : product.category;
        return catName?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        ({ product }) =>
          product.name.toLowerCase().includes(q) ||
          product.description?.toLowerCase().includes(q) ||
          product.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => {
        const pA =
          a.product.pricing?.salePrice ??
          a.product.salePrice ??
          a.product.defaultPrice ??
          0;
        const pB =
          b.product.pricing?.salePrice ??
          b.product.salePrice ??
          b.product.defaultPrice ??
          0;
        return pA - pB;
      });
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => {
        const pA =
          a.product.pricing?.salePrice ??
          a.product.salePrice ??
          a.product.defaultPrice ??
          0;
        const pB =
          b.product.pricing?.salePrice ??
          b.product.salePrice ??
          b.product.defaultPrice ??
          0;
        return pB - pA;
      });
    } else if (sortBy === "rating") {
      result.sort(
        (a, b) => (b.product.avgRating ?? 0) - (a.product.avgRating ?? 0)
      );
    }

    return result;
  }, [items, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Header />

      <main className="flex-1 pb-24">
        {/* Breadcrumb & Hero Banner */}
        <section className="bg-gradient-to-b from-[#F5DAD6]/30 via-[#FAF7F2] to-[#FAF7F2] border-b border-[#E8D8C8]/60 pt-8 pb-12 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-[#746D69] mb-6">
              <Link
                href="/"
                className="hover:text-[#CF565D] transition-colors"
              >
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span className="font-semibold text-[#292525]">
                Botanical Apothecary
              </span>
            </nav>

            {/* Title & Description */}
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E8D8C8] text-xs font-semibold uppercase tracking-wider text-[#CF565D] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The Skincare Collection</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#292525] leading-tight">
                Pure Rose Botanicals & Daily services
              </h1>
              <p className="text-sm sm:text-base text-[#746D69] leading-relaxed">
                Clean, salon-grade formulations crafted with single-origin
                organic Damask Rose. Formulated to calm inflammation, strengthen
                the lipid barrier, and illuminate your complexion.
              </p>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="sticky top-20 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8D8C8]/70 py-4 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none ${isActive
                          ? "bg-[#CF565D] text-white shadow-xs"
                          : "bg-white text-[#292525] border border-[#E8D8C8] hover:border-[#CF565D]/40"
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search formula..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-full border border-[#E8D8C8] text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none focus:border-[#CF565D] focus:ring-1 focus:ring-[#CF565D]"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#746D69]/60 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-[10px] text-[#746D69] hover:text-[#292525]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-[#E8D8C8]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#746D69]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs font-medium text-[#292525] bg-transparent focus:outline-none cursor-pointer pr-1"
                    aria-label="Sort products"
                  >
                    <option value="featured">Featured</option>
                    <option value="rating">Top Rated</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Active filter count status */}
          <div className="flex items-center justify-between pb-6 text-xs text-[#746D69]">
            <span>
              Showing{" "}
              <strong className="text-[#292525] font-semibold">
                {filteredItems.length}
              </strong>{" "}
              {filteredItems.length === 1 ? "product" : "products"}
            </span>

            {searchQuery && (
              <span>
                Filtered by &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl border border-[#E8D8C8]/60 p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-square w-full rounded-2xl bg-[#FAF7F2]" />
                  <div className="space-y-2">
                    <div className="h-4 bg-[#FAF7F2] rounded w-1/3" />
                    <div className="h-5 bg-[#FAF7F2] rounded w-3/4" />
                    <div className="h-3 bg-[#FAF7F2] rounded w-full" />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-6 bg-[#FAF7F2] rounded w-1/4" />
                    <div className="h-8 bg-[#FAF7F2] rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            /* Product Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredItems.map(({ product, variants }) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  defaultVariant={variants && variants.length > 0 ? variants[0] : undefined}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="py-20 text-center max-w-md mx-auto space-y-4 bg-white rounded-3xl border border-[#E8D8C8] p-8 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F5DAD6]/40 flex items-center justify-center text-[#CF565D]">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#292525]">
                No Formulations Found
              </h3>
              <p className="text-xs text-[#746D69] leading-relaxed">
                We couldn&apos;t find any products matching your current category
                or search criteria. Try resetting filters to explore our full
                range.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSortBy("featured");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#CF565D] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#b8454c] transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
