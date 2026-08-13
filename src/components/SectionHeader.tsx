export function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
