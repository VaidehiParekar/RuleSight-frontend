import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A ruled "sheet" of paper: the default content container. No shadow. */
export function Sheet({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("sheet", className)} {...props} />;
}

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  id?: string;
}

/** Eyebrow label + serif title, with an optional action on the right. */
export function SectionHeading({ eyebrow, title, action, id }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
