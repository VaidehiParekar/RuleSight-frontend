import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageFrame } from "@/components/layout/page-frame";
import { Sheet } from "@/components/ui/sheet";

export function NotFoundPage() {
  return (
    <PageFrame title="Page not found" subtitle="The address does not match any screen.">
      <Sheet>
        <EmptyState
          title="There is nothing at this address."
          description="Use the navigation, or return to the overview."
          action={
            <Link className="button primary" to="/">
              Go to the dashboard
            </Link>
          }
        />
      </Sheet>
    </PageFrame>
  );
}
