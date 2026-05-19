"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "klasik" | "modern" | "futuristik" | "koyu" | "neseli";

export const THEMES: { id: ThemeId; label: string; icon: string }[] = [
  { id: "klasik",      label: "Klasik",      icon: "🏛️" },
  { id: "modern",      label: "Modern",      icon: "⬛" },
  { id: "futuristik",  label: "Futuristik",  icon: "🚀" },
  { id: "koyu",        label: "Koyu",        icon: "🌙" },
  { id: "neseli",      label: "Neşeli",      icon: "🌈" },
];

const ThemeContext = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void }>({
  theme: "modern", setTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("modern");

  useEffect(() => {
    const saved = localStorage.getItem("eph-theme") as ThemeId;
    if (saved) setThemeState(saved);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem("eph-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`eph-theme-${theme}`} style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
