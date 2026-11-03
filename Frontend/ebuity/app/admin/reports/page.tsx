"use client";

import React from "react";
import { AdminPlaceholderPage } from "../../../components/admin/AdminPlaceholderPage";
import { BarChart3 } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <AdminPlaceholderPage
      title="Analytics & Operational Reports"
      category="Analytics"
      description="Deep-dive into booking trends, therapist utilization, and boutique revenue reports."
      icon={BarChart3}
      upcomingFeatures={[
        "Monthly and quarterly financial revenue exports (CSV / PDF)",
        "Therapist performance and punctuality metrics",
        "Most requested beauty ritual services by UAE zone",
        "Customer lifetime retention and repeat booking rate",
      ]}
      relatedAction={{
        label: "View Overview Dashboard",
        href: "/admin",
      }}
    />
  );
}
