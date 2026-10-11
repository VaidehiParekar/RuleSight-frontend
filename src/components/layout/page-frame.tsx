import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";

import { cn } from "@/lib/utils";

interface PageFrameProps {
  title: ReactNode;
  /** Browser tab title. Required when `title` is not plain text. */
  documentTitle?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Link shown above the title, e.g. back to a list. */
  back?: { to: string; label: string };
  /** Extra row under the title, e.g. tags. */
  meta?: ReactNode;
  /** Wider spacing between sections, used by the dashboard. */
  roomy?: boolean;
  children: ReactNode;
}

/** Page header (serif title, one-line scope) above the page content. */
export function PageFrame({
  title,
  documentTitle,
  subtitle,
  action,
  back,
  meta,
  roomy = false,
  children,
}: PageFrameProps) {
  const tabTitle = documentTitle ?? (typeof title === "string" ? title : "RuleSight");
  useEffect(() => {
    document.title = `${tabTitle} · RuleSight`;
  }, [tabTitle]);

  return (
    <main id="main-content" className={cn("page", roomy && "roomy")} tabIndex={-1}>
      <header className="page-header">
        <div>
          {back ? (
            <Link className="back-link" to={back.to}>
              ← {back.label}
            </Link>
          ) : null}
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {meta}
        </div>
        {action ? <div className="action-row">{action}</div> : null}
      </header>
      {children}
    </main>
  );
}
