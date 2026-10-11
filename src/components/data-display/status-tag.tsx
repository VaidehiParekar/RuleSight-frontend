import type { ReactNode } from "react";

import type { LabelTone, Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface StatusTagProps {
  tone?: Tone | "plain";
  outline?: boolean;
  small?: boolean;
  /** Short glyph before the label (✓, !, ~, ⊘). Colour is never the only cue. */
  icon?: string;
  struck?: boolean;
  title?: string;
  children: ReactNode;
}

/** Small status label: tinted or outlined, always with text. */
export function StatusTag({
  tone = "neutral",
  outline = false,
  small = false,
  icon,
  struck = false,
  title,
  children,
}: StatusTagProps) {
  return (
    <span
      className={cn("status", tone, outline && "outline", small && "small", struck && "struck")}
      title={title}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

/** Renders a label/tone pair from lib/labels.ts. */
export function LabelTag({
  value,
  outline,
  struck,
}: {
  value: LabelTone;
  outline?: boolean;
  struck?: boolean;
}) {
  return (
    <StatusTag
      tone={value.tone}
      outline={outline ?? value.outline ?? false}
      icon={value.icon}
      struck={struck ?? false}
    >
      {value.label}
    </StatusTag>
  );
}
