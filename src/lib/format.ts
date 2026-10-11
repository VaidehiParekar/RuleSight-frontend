const TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

/** "11 Oct 2026" */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** "14:02 IST" */
export function formatTime(iso: string): string {
  return `${timeFormatter.format(new Date(iso))} IST`;
}

/** "11 Oct 2026, 14:02 IST" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Indian digit grouping: 2,105 · 1,24,000 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "2m 41s" or "840 ms" */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(ms)} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  return `${String(Math.floor(seconds / 60))}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
