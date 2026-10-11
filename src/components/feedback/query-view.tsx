import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { describeError } from "@/lib/errors";

interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  /** Names what is loading, e.g. "gaps". Used in the loading and error messages. */
  what: string;
  rows?: number;
  children: (data: T) => ReactNode;
}

/** Renders the loading and error states of a query, and the content once data arrives. */
export function QueryView<T>({ query, what, rows, children }: QueryViewProps<T>) {
  if (query.isPending) {
    return <LoadingState message={`Loading ${what}…`} rows={rows ?? 4} />;
  }
  if (query.isError) {
    const { message, requestId } = describeError(query.error);
    return (
      <ErrorState
        title={`Could not load ${what}`}
        message={message}
        requestId={requestId}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return <>{children(query.data)}</>;
}
