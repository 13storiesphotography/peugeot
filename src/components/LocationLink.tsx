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
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
        Standort
      </p>
      <p className="mt-1 text-sm font-medium leading-snug">{location.address}</p>
      {href ? (
        <p className="mt-1.5 text-[11px] font-medium text-[var(--accent-bright)]">
          Navigation öffnen →
        </p>
      ) : null}
      <p className="mt-1 text-[10px] text-[var(--fg-muted)]/70">
        Adresse © OpenStreetMap
      </p>
    </>
  );

  if (!href) {
    return (
      <div
        className={
          className ?? "rounded-2xl border border-[var(--line)] px-4 py-3"
        }
      >
        {body}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "block rounded-2xl border border-[var(--line)] px-4 py-3 transition hover:border-[var(--accent-bright)]/40"
      }
      aria-label={`Navigation zu ${location.address}`}
    >
      {body}
    </a>
  );
}
