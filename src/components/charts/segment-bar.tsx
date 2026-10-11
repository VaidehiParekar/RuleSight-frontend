import { cn } from "@/lib/utils";

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** A CSS colour, normally a token such as var(--seq-3). */
  color: string;
}

interface SegmentBarProps {
  segments: readonly Segment[];
  /** Accessible summary, read instead of the bar. */
  label: string;
  /** Print each segment's value (or `text`) inside it. */
  showValues?: boolean | ((segment: Segment) => string);
  /** Scale: segment width is value / total. Defaults to the sum of the segments. */
  total?: number;
  size?: "thin" | "default" | "thick";
}

/** Horizontal stacked bar. Zero-value segments are dropped; the last one gets a rounded end. */
export function SegmentBar({
  segments,
  label,
  showValues = false,
  total,
  size = "default",
}: SegmentBarProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const sum = total ?? visible.reduce((acc, segment) => acc + segment.value, 0);
  return (
    <div className={cn("bar", size !== "default" && size)} role="img" aria-label={label}>
      {visible.map((segment) => (
        <span
          key={segment.key}
          title={`${segment.label}: ${String(segment.value)}`}
          style={{
            width: sum > 0 ? `${String((segment.value / sum) * 100)}%` : "0",
            background: segment.color,
          }}
        >
          {showValues === false
            ? null
            : typeof showValues === "function"
              ? showValues(segment)
              : segment.value}
        </span>
      ))}
    </div>
  );
}

/** Swatch-and-label legend for a SegmentBar. */
export function SegmentLegend({
  segments,
  counts = false,
}: {
  segments: readonly Segment[];
  counts?: boolean;
}) {
  return (
    <div className="legend">
      {segments.map((segment) => (
        <span key={segment.key}>
          <i className="swatch" style={{ background: segment.color }} aria-hidden="true" />
          {segment.label}
          {counts ? <b>{segment.value}</b> : null}
        </span>
      ))}
    </div>
  );
}
