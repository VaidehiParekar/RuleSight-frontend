import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  label: string;
  value: T;
  tabs: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Tab strip. The panel below it should carry role="tabpanel". */
export function Tabs<T extends string>({ label, value, tabs, onChange }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          key={tab.value}
          aria-selected={tab.value === value}
          className={cn("tab", tab.value === value && "active")}
          onClick={() => {
            onChange(tab.value);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
