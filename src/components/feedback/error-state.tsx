import { CircleAlert, RotateCcw } from "lucide-react";

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
    <div role="alert" className="error-state">
      <CircleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {requestId ? <p className="mono">Request ID: {requestId}</p> : null}
        {onRetry ? (
          <Button size="sm" icon={<RotateCcw size={14} />} onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
