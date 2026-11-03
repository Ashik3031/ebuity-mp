import React from "react";
import { Sparkles, Calendar, Home } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: "01",
      title: "Select Your Service",
      description:
        "Explore our curated menu of Damascus rose botanical facials, soothing aromatherapy spa treatments, and salon therapies tailored to your needs.",
      icon: Sparkles,
    },
    {
      number: "02",
      title: "Schedule Your Time & Address",
      description:
        "Select your preferred date, morning, afternoon, or evening arrival window, and tell us your residence address. Instant confirmation with zero waiting.",
      icon: Calendar,
    },
    {
      number: "03",
      title: "Relax in Your Home Sanctuary",
      description:
        "A background-verified therapist arrives with complete hospital-grade sterilized equipment, single-use linens, and pure botanical preparations.",
      icon: Home,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E8D8C8]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#CF565D]">
            <span>Seamless Convenience</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.6rem] uppercase font-normal text-[#292525] tracking-tight leading-[0.95]">
            How At-Home Care Works
          </h2>
          <p className="text-sm sm:text-base text-[#746D69] font-normal leading-relaxed">
            Luxury salon and spa experiences delivered seamlessly to your door in three simple steps.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative p-8 rounded-3xl bg-white border border-[#E8D8C8] shadow-xs flex flex-col justify-between hover:border-[#CF565D]/60 hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-13 h-13 rounded-2xl bg-[#F5DAD6]/40 text-[#CF565D] flex items-center justify-center">
                      <Icon className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <span className="font-serif text-3xl font-light text-[#E8D8C8] tracking-widest">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl font-medium text-[#292525] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#746D69] leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#E8D8C8]">
                    <span className="text-2xl font-light">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
