"use client";

import React from "react";
import { AdminPlaceholderPage } from "../../../components/admin/AdminPlaceholderPage";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholderPage
      title="Platform Settings & Configuration"
      category="System"
      description="System-wide business settings, UAE VAT rate, working hours, and notifications."
      icon={Settings}
      upcomingFeatures={[
        "Business profile details (Trade license, tax registration, address in Dubai)",
        "Default safety buffers and travel duration calculation settings",
        "WhatsApp / SMS client reminder and dispatch notification templates",
        "Admin account management and role-based permissions",
      ]}
      relatedAction={{
        label: "Return to Overview",
        href: "/admin",
      }}
    />
  );
}
