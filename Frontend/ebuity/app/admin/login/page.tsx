"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeprecatedAdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ownadmin");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#CF565D] border-t-transparent animate-spin" />
    </div>
  );
}
