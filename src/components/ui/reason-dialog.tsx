import { useState } from "react";

import { useSession } from "@/app/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";

interface ReasonDialogProps {
  title: string;
  /** One sentence on what happens next. */
  body?: string;
  confirmLabel: string;
  pending: boolean;
  /** When false, no reason is asked for. */
  requireReason?: boolean;
  /** Destructive actions (reject, dismiss) get a solid critical button. */
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  /** Display-safe message when the last attempt failed (for example a 403). */
  error?: string | null | undefined;
}

/** Confirmation that names the acting user and, for reject or dismiss, requires a reason. */
export function ReasonDialog({
  title,
  body,
  confirmLabel,
  pending,
  requireReason = true,
  danger = true,
  error,
  onCancel,
  onConfirm,
}: ReasonDialogProps) {
  const { actor } = useSession();
  const [reason, setReason] = useState("");
  const blocked = requireReason && !reason.trim();
  return (
    <Dialog
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant={danger ? "danger-solid" : "primary"}
            disabled={pending || blocked}
            onClick={() => {
              onConfirm(reason.trim());
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body ? <p className="dialog-note">{body}</p> : null}
      <p className="recorded-as">
        This will be recorded as{" "}
        <strong>
          {actor.name}, {actor.role}
        </strong>
        .
      </p>
      {requireReason ? (
        <Field label="Reason (required)" full>
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          )}
        </Field>
      ) : null}
      {error ? (
        <p className="field-message error" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
