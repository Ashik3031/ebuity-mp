"use client";

import React from "react";
import { AdminPlaceholderPage } from "../../../components/admin/AdminPlaceholderPage";
import { Star } from "lucide-react";

export default function AdminReviewsPage() {
  return (
    <AdminPlaceholderPage
      title="Client Feedback & Reviews"
      category="Quality"
      description="Moderate customer testimonials, ritual feedback, and therapist ratings."
      icon={Star}
      upcomingFeatures={[
        "Approve, moderate, and feature client reviews on the boutique showcase",
        "Individual therapist star rating analytics and performance flags",
        "Direct reply to customer testimonials with luxury editorial responses",
      ]}
      relatedAction={{
        label: "View Overview",
        href: "/admin",
      }}
    />
  );
}
