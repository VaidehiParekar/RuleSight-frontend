import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type SubmitEventHandler,
  type ReactNode,
  type RefObject,
} from "react";

import { IconButton } from "@/components/ui/button";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "sm";
  /** When set, the panel is a <form> and the footer's submit button submits it. */
  onSubmit?: SubmitEventHandler<HTMLFormElement>;
}

/**
 * Modal dialog. Escape and the backdrop close it; focus moves into the dialog on
 * open and returns to the triggering element on close.
 */
export function Dialog({ title, onClose, children, footer, size = "md", onSubmit }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      "input:not([type=file]), textarea, [role=radio][aria-checked=true], button:not(.icon-button)",
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

  const content = (
    <>
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <div className="dialog-body">{children}</div>
      <div className="dialog-foot">{footer}</div>
    </>
  );

  const shared = {
    className: size === "sm" ? "dialog small" : "dialog",
    role: "dialog",
    "aria-modal": true,
    "aria-labelledby": titleId,
    tabIndex: -1,
    onMouseDown: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
    },
  } as const;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      {onSubmit ? (
        <form
          ref={panelRef as RefObject<HTMLFormElement>}
          noValidate
          onSubmit={onSubmit}
          {...shared}
        >
          {content}
        </form>
      ) : (
        <section ref={panelRef} {...shared}>
          {content}
        </section>
      )}
    </div>
  );
}
