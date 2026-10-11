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
  /**
   * Shown instead of the content when the data holds nothing yet (by default: an empty
   * array). Every page passes one so an empty database reads as intentional.
   */
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

function isEmptyByDefault(data: unknown): boolean {
  return data === null || (Array.isArray(data) && data.length === 0);
}

/** Renders the loading and error states of a query, and the content once data arrives. */
export function QueryView<T>({
  query,
  what,
  rows,
  empty,
  isEmpty = isEmptyByDefault,
  children,
}: QueryViewProps<T>) {
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
  if (empty !== undefined && isEmpty(query.data)) {
    return <>{empty}</>;
  }
  return <>{children(query.data)}</>;
}
