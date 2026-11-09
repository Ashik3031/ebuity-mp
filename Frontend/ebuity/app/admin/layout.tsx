import React, { Suspense } from "react";
import { AdminAuthProvider } from "../../lib/admin-auth-context";
import { AdminThemeProvider } from "../../lib/admin-theme-context";
import { AdminLayout } from "../../components/admin/AdminLayout";

export const metadata = {
  title: "Rose Essence — Admin Dashboard",
  description: "Management portal for Rose Essence at-home services, staff operations, and luxury wellness boutique.",
};

export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminThemeProvider>
        <Suspense fallback={null}>
          <AdminLayout>{children}</AdminLayout>
        </Suspense>
      </AdminThemeProvider>
    </AdminAuthProvider>
  );
}
