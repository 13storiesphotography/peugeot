import { headers } from "next/headers";

const FALLBACK_SITE = "https://www.peugeotcontrol.app";

/** Origins allowed for auth redirects, Stripe return URLs, and mail links. */
export function allowedSiteOrigins(): string[] {
  const primary = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE
  ).replace(/\/$/, "");
  const extras = (process.env.ALLOWED_SITE_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const origins = new Set<string>([primary, ...extras]);

  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercelUrl) {
    origins.add(
      vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`,
    );
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return [...origins];
}

/** Prefer configured allowlist; never trust a bare Host / Origin header alone. */
export function resolveSiteOrigin(candidate?: string | null): string {
  const allow = allowedSiteOrigins();
  const primary = allow[0] ?? FALLBACK_SITE;
  if (!candidate) return primary;
  const normalized = candidate.replace(/\/$/, "");
  return allow.includes(normalized) ? normalized : primary;
}

/** Public origin for auth redirect URLs (reset / confirm). */
export async function getSiteOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return resolveSiteOrigin(origin);

  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  if (host) return resolveSiteOrigin(`${proto}://${host}`);

  return resolveSiteOrigin(null);
}
