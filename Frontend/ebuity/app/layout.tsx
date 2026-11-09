import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../lib/cart-context";
import { BookingChatWidget } from "../components/chat/BookingChatWidget";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#E11D74",
};

export const metadata: Metadata = {
  title: "Rose Essence — Luxury At-Home Beauty, Salon & Spa Services",
  description:
    "Indulge in certified salon, spa, and Damascus rose facial services delivered to your doorstep. Hospital-grade sanitization, certified aestheticians, and effortless booking.",
  icons: {
    icon: [
      { url: "/rose-essence-logo-square.jpg", type: "image/jpeg" },
      { url: "/rose-essence-logo.png", type: "image/png" },
    ],
    shortcut: "/rose-essence-logo-square.jpg",
    apple: [
      { url: "/rose-essence-logo-square.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#746D69] font-sans selection:bg-[#F5DAD6] selection:text-[#CF565D]">
        <AuthProvider>
          <CartProvider>
            {children}
            <BookingChatWidget />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
