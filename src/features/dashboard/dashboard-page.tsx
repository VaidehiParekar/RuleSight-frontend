import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { SuccessState } from "@/components/feedback/success-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReadiness } from "@/hooks/use-readiness";
import { ApiError } from "@/services/api-client";

/**
 * SCAFFOLD: placeholder dashboard. The only live data is the backend readiness probe.
 * No regulatory metrics exist yet, so the charts and tiles will be added with their features.
 */
export function DashboardPage() {
  const readiness = useReadiness();

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-warning bg-muted px-4 py-3 text-sm text-foreground"
      >
        <strong className="font-semibold">Scaffold:</strong> this dashboard shows placeholder
        content. No regulatory data or AI features are implemented yet.
      </div>

      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of compliance activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API readiness</CardTitle>
            <CardDescription>
              Checks that the backend and its database are reachable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readiness.isPending ? <LoadingState message="Checking API readiness…" /> : null}

            {readiness.isError ? (
              <ErrorState
                title="API is not reachable"
                message={
                  readiness.error instanceof ApiError
                    ? readiness.error.message
                    : "An unexpected error occurred."
                }
                requestId={
                  readiness.error instanceof ApiError ? readiness.error.requestId : undefined
                }
                onRetry={() => void readiness.refetch()}
              />
            ) : null}

            {readiness.isSuccess ? (
              <div className="flex flex-col gap-3">
                <SuccessState message="API is ready." />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>Database:</span>
                  <StatusBadge
                    tone={readiness.data.database === "ok" ? "success" : "danger"}
                    label={readiness.data.database === "ok" ? "Connected" : "Unavailable"}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => void readiness.refetch()}>
                  Refresh
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open obligations</CardTitle>
            <CardDescription>Placeholder for the obligations summary.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No obligations loaded"
              description="Regulatory sources and obligations will be added in a later milestone."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
