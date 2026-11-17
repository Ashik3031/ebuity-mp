import React, { Suspense } from "react";
import { AdminAuthProvider } from "../../lib/admin-auth-context";
import { AdminThemeProvider } from "../../lib/admin-theme-context";

export const metadata = {
  title: "Rose Essence — Administrative Access",
  description: "Secure login for Rose Essence operations and management.",
};

export default function OwnAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminThemeProvider>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </AdminThemeProvider>
    </AdminAuthProvider>
  );
}
