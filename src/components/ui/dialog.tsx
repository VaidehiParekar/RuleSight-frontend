import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/ui/button";

interface DialogProps {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "sm";
}

/**
 * Modal dialog. Escape and the backdrop close it; focus moves into the dialog on
 * open and returns to the triggering element on close.
 */
export function Dialog({ eyebrow, title, onClose, children, footer, size = "md" }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button:not(.icon-button)",
    );
    (firstField ?? panelRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className={size === "sm" ? "dialog small" : "dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-foot">{footer}</div>
      </section>
    </div>
  );
}
