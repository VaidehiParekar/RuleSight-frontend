import type { Priority } from "@/types/domain";

const DESCRIPTION: Record<Priority, string> = {
  P1: "Priority 1, highest risk",
  P2: "Priority 2",
  P3: "Priority 3, lowest risk",
};

export function PriorityChip({ value }: { value: Priority }) {
  return (
    <span className={`priority ${value.toLowerCase()}`} title={DESCRIPTION[value]}>
      {value}
    </span>
  );
}
