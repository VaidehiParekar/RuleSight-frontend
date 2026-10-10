interface SuccessStateProps {
  message: string;
}

/** Confirms a completed action. role="status" announces it politely. */
export function SuccessState({ message }: SuccessStateProps) {
  return (
    <p role="status" aria-live="polite" className="py-2 text-sm font-medium text-success">
      {message}
    </p>
  );
}
