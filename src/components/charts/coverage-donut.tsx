import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useCssColors } from "@/hooks/use-css-colors";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  /** Name of the CSS colour token, without the leading "--". */
  token: string;
}

interface CoverageDonutProps {
  label: string;
  segments: DonutSegment[];
  /** Big number in the centre, e.g. "58%". */
  centre: string;
  centreNote: string;
}

/** Donut with the headline figure in the middle and a legend that repeats every value. */
export function CoverageDonut({ label, segments, centre, centreNote }: CoverageDonutProps) {
  const tokenKey = segments.map((segment) => segment.token).join(",");
  const tokens = useMemo(() => tokenKey.split(","), [tokenKey]);
  const colors = useCssColors(tokens);
  const description = segments
    .map((segment) => `${String(segment.value)} ${segment.label.toLowerCase()}`)
    .join(", ");
  // Recharts reads each slice colour from its data entry's `fill`.
  const visible = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => ({ ...segment, fill: colors[segment.token] }));

  return (
    <figure className="donut">
      <div className="donut-chart" role="img" aria-label={`${label}: ${description}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-centre" aria-hidden="true">
          <strong>{centre}</strong>
          <span>{centreNote}</span>
        </div>
      </div>
      <figcaption className="donut-legend">
        {segments.map((segment) => (
          <span key={segment.key}>
            <i style={{ background: colors[segment.token] }} aria-hidden="true" />
            {segment.label}
            <b>{segment.value}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
