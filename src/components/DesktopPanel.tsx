/** Shared desktop content surface — mobile stays unstyled/passthrough. */
export function DesktopPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lg:rounded-[1.5rem] lg:border lg:border-[var(--line)] lg:bg-[rgba(14,28,40,0.4)] lg:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
