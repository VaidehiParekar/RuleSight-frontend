import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCssColors } from "@/hooks/use-css-colors";
import type { Priority } from "@/types/domain";

export interface PriorityRow {
  label: string;
  counts: Record<Priority, number>;
}

const PRIORITY_TOKENS = ["critical", "warning", "neutral", "border", "muted"] as const;

/** Horizontal stacked bars: one row per gap type, split by priority. */
export function PriorityStackChart({ label, rows }: { label: string; rows: PriorityRow[] }) {
  const colors = useCssColors(PRIORITY_TOKENS);
  const data = rows.map((row) => ({ label: row.label, ...row.counts }));
  const description = rows
    .map(
      (row) =>
        `${row.label}: ${String(row.counts.P1)} P1, ${String(row.counts.P2)} P2, ${String(row.counts.P3)} P3`,
    )
    .join("; ");
  const height = Math.max(160, rows.length * 44 + 40);

  return (
    <figure className="chart">
      <div
        className="bar-chart-box"
        style={{ height }}
        role="img"
        aria-label={`${label}. ${description}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid horizontal={false} stroke={colors.border} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: colors.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={{ fill: colors.muted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: colors.border, opacity: 0.4 }} />
            <Bar dataKey="P1" stackId="p" fill={colors.critical} isAnimationActive={false} />
            <Bar dataKey="P2" stackId="p" fill={colors.warning} isAnimationActive={false} />
            <Bar
              dataKey="P3"
              stackId="p"
              fill={colors.neutral}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mini-legend">
        <span>
          <i style={{ background: colors.critical }} aria-hidden="true" /> P1
        </span>
        <span>
          <i style={{ background: colors.warning }} aria-hidden="true" /> P2
        </span>
        <span>
          <i style={{ background: colors.neutral }} aria-hidden="true" /> P3
        </span>
      </figcaption>
    </figure>
  );
}
