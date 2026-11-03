import React from "react";
import { Header } from "../components/layout/Header";
import { Hero } from "../components/home/Hero";
import { PopularServices } from "../components/home/PopularServices";
import { TodaysExclusiveDeals } from "../components/home/TodaysExclusiveDeals";
import { ServiceCategories } from "../components/home/ServiceCategories";
import { BestSellerProducts } from "../components/home/BestSellerProducts";
import { HowItWorks } from "../components/home/HowItWorks";
import { WhyChooseUs } from "../components/home/WhyChooseUs";
import { HeadSpaSection } from "../components/home/HeadSpaSection";
import { Footer } from "../components/layout/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#746D69]">
      <Header />
      <main className="flex-1">
        <Hero />
        <PopularServices />
        <TodaysExclusiveDeals />
        <ServiceCategories />
        <BestSellerProducts />
        {/* <HowItWorks /> */}
        <WhyChooseUs />
        <HeadSpaSection />
      </main>
      <Footer />
    </div>
  );
}
