import { createContext, useContext } from "react";

export type ToastTone = "success" | "neutral" | "critical";

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string | undefined;
  tone: ToastTone;
}

export interface ToastContextValue {
  notify: (toast: Omit<ToastMessage, "id" | "tone"> & { tone?: ToastTone }) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Short confirmation after an action. Announced politely to screen readers. */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return value;
}
