import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/app/theme-context";

/** Switches between light and dark. Until the user chooses, the OS setting applies. */
export function ThemeToggle() {
  const { resolved, setMode } = useTheme();
  const next = resolved === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        setMode(next);
      }}
    >
      {resolved === "light" ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
      <span>{resolved === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
