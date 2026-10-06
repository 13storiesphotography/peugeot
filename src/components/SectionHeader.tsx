export function SectionHeader({
  title,
  hint,
  hideTitleOnDesktop = false,
}: {
  title: string;
  hint?: string;
  /** When the page chrome already shows the section title on lg+. */
  hideTitleOnDesktop?: boolean;
}) {
  return (
    <div>
      <h2
        className={`font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight ${
          hideTitleOnDesktop ? "lg:hidden" : ""
        }`}
      >
        {title}
      </h2>
      {hint ? (
        <p
          className={`mt-1 text-sm text-[var(--fg-muted)] ${
            hideTitleOnDesktop ? "lg:mt-0" : ""
          }`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
