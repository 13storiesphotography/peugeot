import type { VehicleLocation } from "@/lib/types";
import { navigationUrl } from "@/lib/geo/reverse-geocode";

type Props = {
  location: VehicleLocation;
  className?: string;
};

export function LocationLink({ location, className }: Props) {
  const canNavigate =
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
  const href = canNavigate
    ? navigationUrl(location.latitude, location.longitude)
    : null;

  const body = (
    <>
      <p className="eyebrow">Standort</p>
      <p className="mt-1 text-sm font-medium leading-snug">{location.address}</p>
      {href ? (
        <p className="mt-1.5 text-xs font-medium text-[var(--accent-bright)]">
          Navigation öffnen
        </p>
      ) : null}
    </>
  );

  if (!href) {
    return <div className={className ?? "ui-surface px-4 py-4"}>{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "ui-surface block px-4 py-4 transition hover:border-[var(--accent-bright)]/40"
      }
      aria-label={`Navigation zu ${location.address}`}
    >
      {body}
    </a>
  );
}
