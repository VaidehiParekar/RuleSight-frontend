import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type ThemeContextValue,
  type ThemeMode,
} from "@/app/theme-context";
import { readStorage, writeStorage } from "@/lib/storage";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

function initialMode(): ThemeMode {
  const saved = readStorage(THEME_STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

/**
 * Light is the default. "system" follows the OS; an explicit choice is stored and
 * written to <html data-theme>. index.html applies the stored choice before first
 * paint, so the page does not flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", mode);
    }
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved: mode === "system" ? (systemDark ? "dark" : "light") : mode,
      setMode: (next) => {
        setModeState(next);
        writeStorage(THEME_STORAGE_KEY, next === "system" ? null : next);
      },
    }),
    [mode, systemDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
