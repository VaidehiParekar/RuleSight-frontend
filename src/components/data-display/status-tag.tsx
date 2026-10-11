import type { ReactNode } from "react";

import type { LabelTone, Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface StatusTagProps {
  tone?: Tone;
  outline?: boolean;
  children: ReactNode;
}

/** Small status label: tinted background, a dot, and text. Colour is never the only cue. */
export function StatusTag({ tone = "neutral", outline = false, children }: StatusTagProps) {
  return (
    <span className={cn("status", tone, outline && "outline")}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Renders a label/tone pair from lib/labels.ts. */
export function LabelTag({ value, outline }: { value: LabelTone; outline?: boolean }) {
  return (
    <StatusTag tone={value.tone} outline={outline ?? false}>
      {value.label}
    </StatusTag>
  );
}
