import { useState } from "react";

import { useSession } from "@/app/auth-context";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";

interface ReasonDialogProps {
  title: string;
  confirmLabel: string;
  pending: boolean;
  /** When false, the reason is optional. */
  requireReason?: boolean;
  variant?: ButtonVariant;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Confirmation that names the acting user and, for reject or dismiss, requires a reason. */
export function ReasonDialog({
  title,
  confirmLabel,
  pending,
  requireReason = true,
  variant = "danger",
  onCancel,
  onConfirm,
}: ReasonDialogProps) {
  const { actor } = useSession();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <Dialog
      eyebrow="Recorded in the audit log"
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={variant}
            disabled={pending}
            onClick={() => {
              if (requireReason && !reason.trim()) {
                setError("A reason is required.");
                return;
              }
              onConfirm(reason.trim());
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="dialog-note">
        This will be recorded as {actor.name}, {actor.role}.
      </p>
      <Field label={requireReason ? "Reason" : "Note (optional)"} error={error} full>
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
    </Dialog>
  );
}
