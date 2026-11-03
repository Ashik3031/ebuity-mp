"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useCart } from "../../lib/cart-context";
import { BrandLogo } from "./BrandLogo";
import {
  Search,
  User as UserIcon,
  ShoppingBag,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Calendar,
} from "lucide-react";

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totals } = useCart();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  // Transparent navbar on hero section initial state; changes to glass blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled && !mobileMenuOpen;

  return (
    <header
      className={`${isHome ? "fixed top-0 left-0 right-0" : "sticky top-0"
        } z-50 w-full transition-all duration-300 ${isTransparent
          ? "bg-transparent border-b border-transparent shadow-none"
          : "bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8D8C8]/60 shadow-xs"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Brand Logo */}
          <div className="flex items-center">
            <BrandLogo />
          </div>

          {/* Center: Desktop Navigation with Services & Shop */}
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 font-serif font-medium text-sm lg:text-[16px] xl:text-[17px]"
            aria-label="Main Navigation"
          >
            {/* Prominently Highlighted Services Navigation */}
            <div
              className="relative"
              onMouseEnter={() => setServicesDropdownOpen(true)}
              onMouseLeave={() => setServicesDropdownOpen(false)}
            >
              <Link
                href="/services"
                className="flex items-center gap-1.5 py-1 text-[#CF565D] hover:text-[#b8454c] transition-colors focus:outline-none"
                aria-expanded={servicesDropdownOpen}
              >
                <span>Our Services</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#CF565D]" />
              </Link>

              {servicesDropdownOpen && (
                <div className="absolute top-full -left-4 w-64 pt-2 z-50">
                  <div className="p-3 bg-white rounded-2xl shadow-xl border border-[#E8D8C8] space-y-1">
                    <Link
                      href="/services"
                      className="block px-3 py-2 text-xs font-semibold text-[#CF565D] bg-[#FAF7F2] rounded-xl transition-colors"
                    >
                      All At-Home Ceremonies &rarr;
                    </Link>
                    <Link
                      href="/services?category=face"
                      className="block px-3 py-2 text-xs font-medium text-[#292525] hover:bg-[#FAF7F2] hover:text-[#CF565D] rounded-xl transition-colors"
                    >
                      Face (Lashes & Threading)
                    </Link>
                    <Link
                      href="/services?category=hair"
                      className="block px-3 py-2 text-xs font-medium text-[#292525] hover:bg-[#FAF7F2] hover:text-[#CF565D] rounded-xl transition-colors"
                    >
                      Hair (Blow Dry, Curls & Color)
                    </Link>
                    <Link
                      href="/services?category=nail"
                      className="block px-3 py-2 text-xs font-medium text-[#292525] hover:bg-[#FAF7F2] hover:text-[#CF565D] rounded-xl transition-colors"
                    >
                      Nail (Manicure, Pedicure & Gelish)
                    </Link>
                    <Link
                      href="/services?category=massage"
                      className="block px-3 py-2 text-xs font-medium text-[#292525] hover:bg-[#FAF7F2] hover:text-[#CF565D] rounded-xl transition-colors"
                    >
                      Massage (Full Body, Deep Tissue & Stones)
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Packages & Offers */}
            <Link
              href="/packages"
              className="relative py-1 text-[#746D69] hover:text-[#CF565D] transition-colors flex items-center gap-1.5"
            >
              <span>Packages & Offers</span>
            </Link>

            {/* Shop */}
            <Link
              href="/shop"
              className="relative py-1 text-[#746D69] hover:text-[#292525] transition-colors flex items-center gap-1.5"
            >
              <span>Shop </span>
            </Link>

            <Link
              href="/#about"
              className="py-1 text-[#746D69] hover:text-[#292525] transition-colors"
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="py-1 text-[#746D69] hover:text-[#292525] transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right: Actions (Search, Profile, Cart, Book Now, Mobile Toggle) */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">

            {/* Search Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                aria-label="Search services"
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 p-2 bg-white rounded-2xl shadow-xl border border-[#E8D8C8] z-50">
                  <div className="flex items-center px-2 py-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search facials, massages, manicure..."
                      className="w-full text-xs text-[#292525] placeholder:text-[#746D69]/60 focus:outline-none bg-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs text-[#746D69] hover:text-[#292525] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account / Profile */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8D8C8] hover:border-[#CF565D] hover:text-[#CF565D] transition-colors text-xs font-medium text-[#292525] shadow-2xs"
                    title="Customer Account"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#CF565D]" />
                    <span className="hidden xl:inline max-w-[100px] truncate">
                      {user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="p-2 text-[#746D69] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
                  aria-label="Client Sign In"
                >
                  <UserIcon className="w-5 h-5 stroke-[1.75]" />
                </Link>
              )}
            </div>

            {/* Cart Bag Icon with Badge */}
            <Link
              href="/cart"
              className="relative p-2 text-[#292525] hover:text-[#CF565D] transition-colors rounded-full hover:bg-white/60"
              aria-label={`Shopping Cart, ${totals.count} items`}
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {totals.count > 0 && (
                <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#CF565D] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs animate-in zoom-in duration-150">
                  {totals.count > 99 ? "99+" : totals.count}
                </span>
              )}
            </Link>

            {/* Book Now Button */}
            <Link
              href="/book"
              onClick={() => {
                if (pathname === "/book") {
                  window.dispatchEvent(new CustomEvent("reset-booking-flow"));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 lg:px-5 py-2 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Now</span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#292525] hover:text-[#CF565D] rounded-lg focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[1.75]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[1.75]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF7F2] border-t border-[#E8D8C8] px-5 py-6 space-y-4 animate-in slide-in-from-top duration-200">
          {/* Quick Book CTA Button in Mobile Drawer */}
          <Link
            href="/book"
            onClick={() => {
              setMobileMenuOpen(false);
              if (pathname === "/book") {
                window.dispatchEvent(new CustomEvent("reset-booking-flow"));
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#CF565D] hover:bg-[#b8454c] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Book an Appointment</span>
          </Link>

          <nav className="flex flex-col space-y-3">
            <Link
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>At-Home Services</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                Ceremonies
              </span>
            </Link>
            <Link
              href="/packages"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Packages & Offers</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                Offers
              </span>
            </Link>
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Shop Botanicals</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5DAD6] text-[#CF565D]">
                Store
              </span>
            </Link>
            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40 flex items-center justify-between"
            >
              <span>Shopping Cart</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8D8C8]/60 text-[#292525]">
                {totals.count} items
              </span>
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1 border-b border-[#E8D8C8]/40"
            >
              About Our Standards
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#292525] hover:text-[#CF565D] py-1"
            >
              Contact & Concierge
            </Link>
          </nav>

          <div className="pt-4 border-t border-[#E8D8C8] flex flex-col gap-3">

            {isAuthenticated ? (
              <div className="flex flex-col gap-2 w-full pt-1">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-[#292525] font-semibold hover:text-[#CF565D] py-1"
                >
                  My Account &rarr;
                </Link>
                <div className="flex items-center justify-between w-full pt-1 border-t border-[#FAF7F2]">
                  <span className="text-xs text-[#746D69]">
                    Signed in as {user?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-[#CF565D] font-semibold"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#292525] border border-[#E8D8C8] rounded-full bg-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#292525] border border-[#E8D8C8] rounded-full bg-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
