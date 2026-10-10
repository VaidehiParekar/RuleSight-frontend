import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
}

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  neutral: "bg-muted text-muted-foreground",
};

/** Compact status indicator. The label carries the meaning, so colour is not the only cue. */
export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
