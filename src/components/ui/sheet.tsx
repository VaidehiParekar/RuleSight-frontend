import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The default content container: a white card with a hairline border and a soft shadow. */
export function Sheet({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("sheet", className)} {...props} />;
}

interface SheetHeadProps {
  title: ReactNode;
  /** Right-hand side: a short note, a legend or a tag. */
  meta?: ReactNode;
  id?: string;
}

/** Card header: a sans title on the left, quiet context on the right, ruled below. */
export function SheetHead({ title, meta, id }: SheetHeadProps) {
  return (
    <div className="sheet-head">
      <h3 id={id}>{title}</h3>
      {meta ? <span className="sheet-meta">{meta}</span> : null}
    </div>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  id?: string;
}

/** Optional eyebrow label + title, with an optional action on the right. */
export function SectionHeading({ eyebrow, title, action, id }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
