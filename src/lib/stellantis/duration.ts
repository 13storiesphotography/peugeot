/** Parse PSA ISO-8601 durations like PT10H30M / PT45M / PT2H. */
export function parseIsoDurationToMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().toUpperCase();
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const m = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const seconds = Number(m[4] ?? 0);
  const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60;
  return total > 0 ? total : null;
}

/** Parse Peugeot `nextDelayedTime` (PT22H30M) into wall-clock hour/minute. */
export function parseNextDelayedClock(value: unknown): {
  hour: number;
  minute: number;
} {
  if (typeof value === "string") {
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/i.exec(value.trim());
    if (match) {
      const hour = match[1] != null ? Number(match[1]) : 0;
      const minute = match[2] != null ? Number(match[2]) : 0;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }
  }
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}
