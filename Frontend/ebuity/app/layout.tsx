import type { Metadata } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../lib/cart-context";

const bodoni = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif-soft",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rose Essence — Luxury At-Home Beauty, Salon & Spa Services",
  description:
    "Indulge in certified salon, spa, and Damascus rose facial services delivered to your doorstep. Hospital-grade sanitization, certified aestheticians, and effortless booking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${cormorant.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#746D69] font-sans selection:bg-[#F5DAD6] selection:text-[#CF565D]">
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
