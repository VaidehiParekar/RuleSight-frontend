import { useTheme, type ThemeMode } from "@/app/theme-context";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** System, light or dark. Until the user chooses, the OS setting applies. */
export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="segmented compact" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          onClick={() => {
            setMode(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
