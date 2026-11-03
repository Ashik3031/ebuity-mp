"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface AdminThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "rose_admin_theme";

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      } else if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setThemeState("dark");
        applyThemeClass("dark");
      } else {
        setThemeState("light");
        applyThemeClass("light");
      }
    } catch {
      setThemeState("light");
      applyThemeClass("light");
    }
  }, []);

  const applyThemeClass = (targetTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn("Unable to save theme preference:", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <AdminThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === "dark",
      }}
    >
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    // Provide a safe default fallback if rendered outside provider
    return {
      theme: "light" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return context;
}
