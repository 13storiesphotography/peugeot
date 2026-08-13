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
      <div className="min-w-0">
        <p className="eyebrow">Standort</p>
        <p className="mt-1 text-sm font-medium leading-snug">{location.address}</p>
      </div>
      {href ? (
        <span className="shrink-0 text-[var(--fg-muted)]" aria-hidden>
          ›
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return <div className={className ?? "ui-link-row"}>{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "ui-link-row transition hover:text-[var(--accent-bright)]"}
      aria-label={`Navigation zu ${location.address}`}
    >
      {body}
    </a>
  );
}
