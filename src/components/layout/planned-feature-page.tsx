import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";

interface PlannedFeaturePageProps {
  title: string;
}

/**
 * Placeholder for a planned feature. It states plainly that nothing is implemented,
 * so the scaffold cannot be mistaken for working functionality.
 */
export function PlannedFeaturePage({ title }: PlannedFeaturePageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Scaffold placeholder. This feature is planned and not implemented yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="Implementation will follow the roadmap in docs/architecture.md."
        />
      </CardContent>
    </Card>
  );
}
