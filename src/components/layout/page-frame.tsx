import { useEffect, type ReactNode } from "react";

interface PageFrameProps {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/** Page header (eyebrow, serif title, one-line scope) above the page content. */
export function PageFrame({ eyebrow, title, subtitle, action, children }: PageFrameProps) {
  useEffect(() => {
    document.title = `${title} · RuleSight`;
  }, [title]);

  return (
    <main id="main-content" className="page" tabIndex={-1}>
      <header className="page-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action ? <div className="action-row">{action}</div> : null}
      </header>
      {children}
    </main>
  );
}
