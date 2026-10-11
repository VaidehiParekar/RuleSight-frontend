import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  full?: boolean;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}

/** Label, control, hint and error message wired together for assistive technology. */
export function Field({ label, hint, error, full = false, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div className={cn("field", full && "full")}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        ...(message ? { "aria-describedby": messageId } : {}),
        ...(error ? { "aria-invalid": true } : {}),
      })}
      {message ? (
        <span id={messageId} className={cn("field-message", error && "error")}>
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("control", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("control textarea", className)} {...props} />;
}
