export interface TrendSeries {
  key: string;
  name: string;
  color: string;
  values: readonly number[];
}

interface TrendChartProps {
  labels: readonly string[];
  series: readonly TrendSeries[];
  /** Note pinned to the last point, e.g. what changed in the latest run. */
  annotation?: string;
  label: string;
}

const WIDTH = 560;
const HEIGHT = 210;
const LEFT = 30;
const RIGHT = 26;
const TOP = 30;
const BOTTOM = 28;

/** Line chart for a handful of runs: gridlines every 4, end values labelled, last run annotated. */
export function TrendChart({ labels, series, annotation, label }: TrendChartProps) {
  const peak = Math.max(4, ...series.flatMap((item) => item.values));
  const ceiling = Math.ceil((peak + 1) / 4) * 4;
  const ticks = Array.from({ length: ceiling / 4 + 1 }, (_, index) => index * 4);
  const last = labels.length - 1;
  const x = (index: number) => LEFT + (index * (WIDTH - LEFT - RIGHT)) / Math.max(1, last);
  const y = (value: number) => TOP + (HEIGHT - TOP - BOTTOM) * (1 - value / ceiling);

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      role="img"
      aria-label={label}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={LEFT}
            x2={WIDTH - RIGHT + 10}
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--border)"
          />
          <text x={LEFT - 8} y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {labels.map((text, index) => (
        <text key={text} x={x(index)} y={HEIGHT - 6} textAnchor="middle">
          {text}
        </text>
      ))}
      {annotation ? (
        <>
          <line
            x1={x(last)}
            x2={x(last)}
            y1={TOP - 18}
            y2={HEIGHT - BOTTOM}
            stroke="var(--accent)"
            strokeDasharray="3 3"
          />
          <text className="annotation" x={x(last) - 8} y={TOP - 10} textAnchor="end">
            {annotation}
          </text>
        </>
      ) : null}
      {series.map((item) => {
        const d = item.values
          .map(
            (value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`,
          )
          .join(" ");
        const end = item.values[last] ?? 0;
        return (
          <g key={item.key}>
            <path className="line" d={d} stroke={item.color} />
            {item.values.map((value, index) => (
              <circle
                key={labels[index]}
                cx={x(index)}
                cy={y(value)}
                r={index === last ? 4.5 : 3}
                fill="var(--card)"
                stroke={item.color}
                strokeWidth={2}
              >
                <title>{`${item.name} · ${labels[index] ?? ""}: ${String(value)}`}</title>
              </circle>
            ))}
            <text className="end-label" x={x(last) + 9} y={y(end) + 4}>
              {end}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
