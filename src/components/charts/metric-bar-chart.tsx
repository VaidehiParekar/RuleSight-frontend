import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCssColors } from "@/hooks/use-css-colors";
import type { EvalMetric } from "@/types/domain";

const TOKENS = ["primary", "border", "muted"] as const;

function percent(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/** Accuracy metrics (0 to 1) as horizontal bars with the value printed on each bar. */
export function MetricBarChart({ label, metrics }: { label: string; metrics: EvalMetric[] }) {
  const colors = useCssColors(TOKENS);
  const data = metrics.map((metric) => ({ label: metric.label, value: metric.value }));
  const description = metrics.map((m) => `${m.label} ${percent(m.value)}`).join(", ");
  const height = Math.max(160, metrics.length * 34 + 30);

  return (
    <div
      className="bar-chart-box"
      style={{ height }}
      role="img"
      aria-label={`${label}: ${description}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={colors.border} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={percent}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fill: colors.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value) => percent(Number(value))} />
          <Bar
            dataKey="value"
            fill={colors.primary}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            label={{
              position: "right",
              formatter: (value: unknown) => percent(Number(value)),
              fill: colors.muted,
              fontSize: 11,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
