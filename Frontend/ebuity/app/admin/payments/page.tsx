"use client";

import React from "react";
import { AdminPlaceholderPage } from "../../../components/admin/AdminPlaceholderPage";
import { CreditCard } from "lucide-react";

export default function AdminPaymentsPage() {
  return (
    <AdminPlaceholderPage
      title="Payments & Financial Transactions"
      category="Financials"
      description="Track card payments, online booking deposits, cash-on-arrival, and refunds."
      icon={CreditCard}
      upcomingFeatures={[
        "Stripe and payment gateway transaction logs with payment status",
        "Cash on Delivery / Cash on Arrival reconciliation for at-home visits",
        "Refund management and customer credit balance issuance",
      ]}
      relatedAction={{
        label: "View Revenue Trends",
        href: "/admin/reports",
      }}
    />
  );
}
