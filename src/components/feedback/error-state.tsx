import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  message: string;
  /** Request ID from the API, shown so support can correlate server logs. */
  requestId?: string | undefined;
  onRetry?: () => void;
}

/** Accessible error message. role="alert" announces it immediately. */
export function ErrorState({ title, message, requestId, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 py-2">
      <p className="font-medium text-danger">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {requestId ? (
        <p className="font-mono text-xs text-muted-foreground">Request ID: {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
