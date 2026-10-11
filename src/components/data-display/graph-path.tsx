import { StatusTag } from "@/components/data-display/status-tag";
import type { CriticResult } from "@/types/domain";

const CRITIC: Record<
  CriticResult,
  { label: string; icon: string; tone: "success" | "warning" | "critical" }
> = {
  passed: { label: "Critic passed", icon: "✓", tone: "success" },
  retried: { label: "Critic passed on retry", icon: "↻", tone: "warning" },
  failed: { label: "Critic failed", icon: "✕", tone: "critical" },
};

/**
 * The knowledge-graph path that justified a mapping, plus the critic result.
 * Shown instead of a confidence percentage.
 */
export function GraphPath({ path, critic }: { path: string[]; critic: CriticResult }) {
  return (
    <div className="graph-path">
      <span className="eyebrow">Path</span>
      <ol aria-label="Knowledge graph path">
        {path.map((step, index) => (
          <li
            key={`${step}-${String(index)}`}
            className={index === 0 ? "start" : index === path.length - 1 ? "end" : "via"}
          >
            {step}
          </li>
        ))}
      </ol>
      <StatusTag tone={CRITIC[critic].tone} icon={CRITIC[critic].icon}>
        {CRITIC[critic].label}
      </StatusTag>
    </div>
  );
}
