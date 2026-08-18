/** Full navigation so iOS can leave `/auth/reset` even if client JS is stuck. */
export function CancelRecoveryLink({
  className,
  children,
}: {
  className?: string;
  children?: string;
}) {
  return (
    <a href="/auth/cancel-recovery" className={className}>
      {children ?? "Abbrechen und zur Anmeldung"}
    </a>
  );
}
