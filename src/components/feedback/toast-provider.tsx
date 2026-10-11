import { Check, CircleAlert, Info, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ToastContext,
  type ToastContextValue,
  type ToastMessage,
} from "@/components/feedback/toast-context";

const TOAST_DURATION_MS = 4000;

const ICONS = { success: Check, neutral: Info, critical: CircleAlert } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue["notify"]>(
    (toast) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [
        ...current.slice(-2),
        { ...toast, id, tone: toast.tone ?? "success" },
      ]);
      window.setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div className={`toast ${toast.tone}`} key={toast.id}>
              <Icon size={16} aria-hidden="true" />
              <div>
                <strong>{toast.title}</strong>
                {toast.detail ? <span>{toast.detail}</span> : null}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => {
                  dismiss(toast.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
