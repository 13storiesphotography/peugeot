/** Canonical public site origin for SEO (sitemap, robots, metadata). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.peugeotcontrol.app";

export const SITE_NAME = "Peugeot Control";

export const SITE_DESCRIPTION =
  "Peugeot im Browser und auf dem Handy steuern: Batterie, Laden, Vorklima und Fernbedienung — ohne ständiges Neuanmelden. Getestet am E-3008.";
