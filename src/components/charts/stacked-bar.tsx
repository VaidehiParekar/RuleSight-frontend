export interface StackedSegment {
  key: string;
  label: string;
  value: number;
  /** CSS class that sets the segment colour (sequential ramp step). */
  className: string;
}

interface StackedBarProps {
  label: string;
  segments: StackedSegment[];
}

/**
 * Single 100% stacked bar with a legend that repeats every value, plus a
 * screen-reader table, so identity never depends on colour.
 */
export function StackedBar({ label, segments }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const description = segments
    .map((segment) => `${String(segment.value)} ${segment.label.toLowerCase()}`)
    .join(", ");
  return (
    <figure className="chart">
      <div className="stacked-bar" role="img" aria-label={`${label}: ${description}`}>
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className={segment.className}
              style={{ flex: segment.value }}
              title={`${segment.label}: ${String(segment.value)} of ${String(total)}`}
            />
          ))}
      </div>
      <figcaption className="chart-legend">
        {segments.map((segment) => (
          <span key={segment.key}>
            <i className={segment.className} aria-hidden="true" />
            {segment.label} <b>{segment.value}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
