import { useMemo, useSyncExternalStore } from "react";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function media(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const query = media();
  query?.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    query?.removeEventListener("change", onChange);
  };
}

function themeSnapshot(): string {
  const explicit = document.documentElement.getAttribute("data-theme") ?? "system";
  return `${explicit}:${media()?.matches ? "dark" : "light"}`;
}

/**
 * Reads design tokens (CSS custom properties) as concrete colours for SVG charts, and
 * re-reads them whenever the theme changes. Colours stay defined in one place: index.css.
 */
export function useCssColors<K extends string>(names: readonly K[]): Record<K, string> {
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => "server");
  return useMemo(() => {
    const colors = {} as Record<K, string>;
    // Before hydration there is no document to read; charts fall back to the text colour.
    const styles = theme === "server" ? null : getComputedStyle(document.documentElement);
    for (const name of names) {
      colors[name] = styles?.getPropertyValue(`--${name}`).trim() || "currentColor";
    }
    return colors;
  }, [theme, names]);
}
