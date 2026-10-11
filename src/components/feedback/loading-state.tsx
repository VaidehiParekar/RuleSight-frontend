interface LoadingStateProps {
  message?: string;
  /** Number of placeholder rows to draw, shaped like the content that will load. */
  rows?: number;
}

/** Accessible loading indicator: soft pulse blocks plus a polite status message. */
export function LoadingState({ message = "Loading…", rows = 4 }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="sr-only">{message}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span className="pulse" key={index} style={{ width: `${String(92 - index * 9)}%` }} />
      ))}
    </div>
  );
}
