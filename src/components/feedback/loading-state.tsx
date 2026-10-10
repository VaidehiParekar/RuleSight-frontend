interface LoadingStateProps {
  message?: string;
}

/** Accessible loading indicator. role="status" announces the message politely. */
export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-4 text-sm">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}
