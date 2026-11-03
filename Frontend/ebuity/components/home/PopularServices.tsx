"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { serviceApi, serviceCategoryApi } from "../../lib/api-client";
import { Service, ServiceCategory } from "../../types/service";

interface PopularServiceItem {
  id: string;
  title: string;
  query: string;
  categorySlug?: string;
  keywords: string[];
  illustration: React.ReactNode;
}

export const PopularServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [servRes, catRes] = await Promise.allSettled([
          serviceApi.getAll({ limit: 50 }),
          serviceCategoryApi.getAll(),
        ]);

        if (isMounted) {
          if (servRes.status === "fulfilled" && servRes.value?.services) {
            setServices(servRes.value.services);
          }
          if (catRes.status === "fulfilled" && catRes.value?.categories) {
            setCategories(catRes.value.categories);
          }
        }
      } catch (err) {
        console.warn("Could not load popular services data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live database metrics (count of matching services and starting price)
  const getServiceStats = (keywords: string[], categorySlug?: string) => {
    const matched = services.filter((s) => {
      const sName = (s.name || "").toLowerCase();
      const sCatSlug =
        typeof s.category === "object" ? s.category?.slug : s.categorySlug;
      const sCatName =
        typeof s.category === "object"
          ? s.category?.name
          : s.categoryName || s.category;

      if (categorySlug && sCatSlug?.toLowerCase() === categorySlug.toLowerCase()) {
        return true;
      }
      return keywords.some(
        (kw) =>
          sName.includes(kw.toLowerCase()) ||
          (sCatName && sCatName.toLowerCase().includes(kw.toLowerCase()))
      );
    });

    const count = matched.length;
    const minPrice =
      matched.length > 0
        ? Math.min(...matched.map((s) => Number(s.price) || 999999))
        : null;

    return {
      count,
      minPrice: minPrice && minPrice < 999999 ? minPrice : null,
      firstServiceSlug: matched[0]?.slug,
    };
  };

  const POPULAR_ITEMS: PopularServiceItem[] = [
    {
      id: "hair-cut",
      title: "Hair Cut",
      query: "Trim",
      categorySlug: "hair",
      keywords: ["trim", "cut", "hair trim"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft blush blob */}
          <path
            d="M50 18C68 14 84 26 80 44C76 64 62 82 44 80C24 78 18 58 24 38C28 24 38 20 50 18Z"
            fill="#F2DCE5"
            fillOpacity="0.8"
          />
          {/* Line art: back of woman with cascading hair & shears */}
          <path
            d="M50 25C44 25 39 30 39 38C39 48 42 66 38 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M50 25C56 25 61 30 61 38C61 48 58 66 62 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M45 28C47 22 53 22 55 28"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Hair strands */}
          <path
            d="M46 36C46 50 48 64 47 76"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M54 36C54 50 52 64 53 76"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Neck & shoulder line */}
          <path
            d="M34 76C38 72 44 71 50 71C56 71 62 72 66 76"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Minimalist scissor blades */}
          <path
            d="M66 52L76 60M76 52L66 60"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="78" cy="50" r="2.5" stroke="#292525" strokeWidth="1.3" />
          <circle cx="78" cy="62" r="2.5" stroke="#292525" strokeWidth="1.3" />
        </svg>
      ),
    },
    {
      id: "hair-color",
      title: "Hair Color",
      query: "Color",
      categorySlug: "hair",
      keywords: ["color", "colour", "full hair color"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft lavender/blush blob */}
          <path
            d="M52 16C72 18 84 34 80 54C76 72 58 84 40 78C24 74 18 54 22 36C26 22 36 14 52 16Z"
            fill="#EADDEB"
            fillOpacity="0.85"
          />
          {/* Line art: woman's face & voluminous wavy locks */}
          <path
            d="M48 30C42 30 36 36 36 44C36 50 40 54 44 58C46 60 46 64 46 68"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M46 42C50 42 54 46 54 50C54 56 50 62 48 68"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Luscious wave sweeps */}
          <path
            d="M42 28C48 24 58 26 64 32C70 38 72 48 68 56C64 64 66 72 68 76"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M60 36C64 42 66 50 62 58"
            stroke="#292525"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Eyebrow & closed eyelash */}
          <path
            d="M44 46C46 45 49 45 51 47"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M46 49C48 51 50 50 51 48"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Earring droplet */}
          <circle cx="41" cy="56" r="2" fill="#292525" />
        </svg>
      ),
    },
    {
      id: "manicure",
      title: "Manicure",
      query: "Manicure",
      categorySlug: "nail",
      keywords: ["manicure", "nail", "hard gel", "ombre"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft rose blob */}
          <path
            d="M48 20C66 18 80 30 78 48C76 66 62 82 44 80C26 78 18 62 20 44C22 28 32 22 48 20Z"
            fill="#F6DCD8"
            fillOpacity="0.85"
          />
          {/* Line art: two graceful hands with polished nails */}
          <path
            d="M34 76C34 68 36 58 38 50C40 42 42 34 44 28C45 25 48 25 49 28C50 33 50 44 50 52"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M50 42C51 34 53 26 55 22C56 20 59 20 60 23C61 28 60 40 58 50"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M58 44C60 38 63 32 66 28C67 26 70 27 70 30C70 36 67 46 64 56"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M38 52C34 56 30 62 30 68C30 74 34 78 38 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Polished fingernails */}
          <path
            d="M43.5 28C44 26 46 26 46.5 28"
            stroke="#CF565D"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M54.5 22C55 20 57 20 57.5 22"
            stroke="#CF565D"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M65.5 28C66 26 68 26 68.5 28"
            stroke="#CF565D"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "pedicure",
      title: "Pedicure",
      query: "Pedicure",
      categorySlug: "nail",
      keywords: ["pedicure", "deluxe pedicure", "classic pedicure"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft lavender blob */}
          <path
            d="M46 16C64 12 78 24 82 42C86 62 72 80 52 82C34 84 22 70 20 52C18 34 30 20 46 16Z"
            fill="#EADDEF"
            fillOpacity="0.8"
          />
          {/* Line art: arched foot, ankle and nail polish applicator */}
          <path
            d="M38 24C40 32 40 40 42 48C44 54 46 60 52 64C58 68 64 68 70 66C74 65 76 60 72 58C68 56 64 56 60 54"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M48 24C48 30 46 38 46 44C44 52 38 58 34 62C30 66 32 72 38 72C46 72 54 70 60 66"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Delicate toes */}
          <path
            d="M70 64C72 64 74 62 74 60"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M67 66C69 66 71 65 72 63"
            stroke="#292525"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Polish applicator brush */}
          <path
            d="M68 44L74 54M74 54L72 57M74 54L76 55"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="68" cy="44" r="2.5" stroke="#292525" strokeWidth="1.3" />
        </svg>
      ),
    },
    {
      id: "facial",
      title: "Facial",
      query: "Facial",
      categorySlug: "face",
      keywords: ["facial", "face", "lash", "threading", "eyebrows"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft pink blob */}
          <path
            d="M54 18C72 16 84 28 82 46C80 66 66 82 48 80C30 78 20 62 22 44C24 26 36 20 54 18Z"
            fill="#F7DFE2"
            fillOpacity="0.85"
          />
          {/* Line art: woman's serene profile */}
          <path
            d="M38 32C42 26 50 26 54 28C60 31 62 38 62 44C62 48 59 52 56 55C54 57 55 60 56 64C56 68 53 72 48 74"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Eyelash & brow */}
          <path
            d="M44 40C46 39 49 39 51 41"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M45 44C47 46 49 45 50 43"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Lips */}
          <path
            d="M52 56C54 57 56 57 57 56"
            stroke="#CF565D"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Rose quartz / jade facial roller */}
          <path
            d="M62 40L68 46M65 43L74 34M74 34L78 38"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <rect
            x="58"
            y="37"
            width="8"
            height="5"
            rx="2.5"
            transform="rotate(45 58 37)"
            fill="#F5DAD6"
            stroke="#292525"
            strokeWidth="1.4"
          />
        </svg>
      ),
    },
    {
      id: "massage",
      title: "Massage",
      query: "Massage",
      categorySlug: "massage",
      keywords: ["massage", "oil massage", "hot stones", "cupping", "deep tissue"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft lavender blob */}
          <path
            d="M48 18C68 16 82 28 80 48C78 68 64 82 44 80C24 78 16 60 20 40C24 24 34 20 48 18Z"
            fill="#EBDDEF"
            fillOpacity="0.85"
          />
          {/* Line art: client lying prone & soothing therapist hands on shoulder */}
          <path
            d="M26 62C30 56 36 52 44 50C54 48 64 50 74 54C80 57 82 62 82 68"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M32 54C34 46 38 42 42 42C46 42 48 46 48 50"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Hands applying gentle therapeutic pressure */}
          <path
            d="M48 38C52 34 56 34 60 38C62 40 60 44 58 48C56 50 52 50 50 46"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M60 42C64 38 68 38 72 42C74 44 72 48 70 52"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Subtle relaxation motion lines */}
          <path
            d="M42 60C48 62 54 62 60 60"
            stroke="#292525"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </svg>
      ),
    },
    {
      id: "waxing",
      title: "Waxing",
      query: "Waxing",
      categorySlug: "face",
      keywords: ["waxing", "threading", "shaving", "upper lip"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft peach/blush blob */}
          <path
            d="M50 16C68 14 82 26 80 44C78 64 62 82 44 80C26 78 18 60 22 40C26 24 36 18 50 16Z"
            fill="#F6E2DE"
            fillOpacity="0.85"
          />
          {/* Line art: sleek crossed bare legs */}
          <path
            d="M32 76C36 68 44 58 52 48C58 40 64 32 70 24C72 22 76 24 74 27C70 34 62 46 56 58C52 66 48 74 46 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M42 66C46 58 54 50 62 40C68 32 74 26 78 22C80 20 83 22 81 25C76 32 68 44 60 56C56 64 52 72 50 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Sleek knee and ankle curve */}
          <path
            d="M50 50C52 48 54 48 56 50"
            stroke="#292525"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M60 42C62 40 64 40 66 42"
            stroke="#292525"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "hair-styling",
      title: "Hair Styling",
      query: "Blow Dry",
      categorySlug: "hair",
      keywords: ["blow dry", "curly", "wavy", "styling", "extension"],
      illustration: (
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
          {/* Organic soft rose blob */}
          <path
            d="M52 18C70 16 82 28 80 48C78 68 64 82 44 80C26 78 18 60 22 40C26 24 36 20 52 18Z"
            fill="#F2DBE3"
            fillOpacity="0.85"
          />
          {/* Line art: woman with voluminous blow-out hair and styling brush */}
          <path
            d="M40 28C46 22 56 22 62 26C70 30 74 40 72 50C70 60 64 70 58 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M38 34C44 38 48 46 46 54C44 62 42 70 40 78"
            stroke="#292525"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M46 36C52 34 58 38 60 44C62 52 58 60 56 68"
            stroke="#292525"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Round ceramic brush / airflow lines */}
          <path
            d="M66 48C72 46 76 50 78 54M68 56C72 56 76 58 78 62"
            stroke="#292525"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M50 72C54 72 58 73 62 76"
            stroke="#292525"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full bg-[#FAF7F2] py-8 sm:py-12 border-b border-[#E8D8C8]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-medium text-[#292525] tracking-tight">
            Popular Services
          </h2>
          <p className="text-xs sm:text-sm text-[#746D69] mt-1 font-normal">
            Find your salon by popular services
          </p>
        </div>

        {/* 8 Cards Carousel / Grid */}
        <div className="flex lg:grid lg:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 scrollbar-none snap-x snap-mandatory">
          {POPULAR_ITEMS.map((item) => {
            const stats = getServiceStats(item.keywords, item.categorySlug);
            const destinationHref = item.query
              ? `/services?query=${encodeURIComponent(item.query)}`
              : item.categorySlug
                ? `/services?category=${encodeURIComponent(item.categorySlug)}`
                : "/services";

            return (
              <Link
                key={item.id}
                href={destinationHref}
                className="group shrink-0 w-[125px] sm:w-[140px] lg:w-auto snap-start bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-[#E8D8C8]/70 shadow-[0_4px_16px_rgba(200,80,95,0.04)] hover:shadow-[0_12px_28px_rgba(200,80,95,0.12)] hover:border-[#CF565D]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer min-h-[148px] sm:min-h-[168px]"
              >
                {/* Illustration with soft pastel blush blob */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  {item.illustration}
                </div>

                {/* Title & Live Data Caption */}
                <div className="w-full mt-2 space-y-0.5">
                  <h3 className="font-serif font-medium text-sm sm:text-[15px] text-[#292525] group-hover:text-[#CF565D] transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-[#746D69]/80 font-normal truncate">
                    {loading ? (
                      <span className="inline-block w-12 h-2.5 bg-gray-100 rounded animate-pulse" />
                    ) : stats.count > 0 ? (
                      `${stats.count} service${stats.count > 1 ? "s" : ""}`
                    ) : (
                      "Available"
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
