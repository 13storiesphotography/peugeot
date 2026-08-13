/** Map Peugeot visuel3d / option paint codes → display name + hex. */

export type PaintInfo = {
  code: string;
  label: string;
  hex: string;
  pictureUrl: string | null;
};

const PAINT_BY_CODE: Record<string, { label: string; hex: string }> = {
  // E-3008 / common Peugeot codes
  "9V": { label: "Perla Nera Schwarz", hex: "#0c0d10" },
  N9V: { label: "Perla Nera Schwarz", hex: "#0c0d10" },
  M09V: { label: "Perla Nera Schwarz", hex: "#0c0d10" },
  M49V: { label: "Perla Nera Schwarz", hex: "#0c0d10" },
  KTV: { label: "Perla Nera Schwarz", hex: "#0c0d10" },
  DP: { label: "Obsession Blau", hex: "#1a3f5c" },
  EDP: { label: "Obsession Blau", hex: "#1a3f5c" },
  M0DP: { label: "Obsession Blau", hex: "#1a3f5c" },
  "7K": { label: "Ingaro Blau", hex: "#1c2f55" },
  E7K: { label: "Ingaro Blau", hex: "#1c2f55" },
  M07K: { label: "Ingaro Blau", hex: "#1c2f55" },
  SU: { label: "Okenit Weiß", hex: "#e8e6e1" },
  ESU: { label: "Okenit Weiß", hex: "#e8e6e1" },
  M0SU: { label: "Okenit Weiß", hex: "#e8e6e1" },
  F4: { label: "Artense Grau", hex: "#6b7078" },
  EF4: { label: "Artense Grau", hex: "#6b7078" },
  NF4: { label: "Artense Grau", hex: "#6b7078" },
  M0F4: { label: "Artense Grau", hex: "#6b7078" },
  // Titan / Titane grey variants seen in catalogs
  "9H": { label: "Titan Grau", hex: "#5a5e66" },
  E9H: { label: "Titan Grau", hex: "#5a5e66" },
};

export function paintCodeCandidates(raw: string): string[] {
  const code = raw.trim().toUpperCase();
  if (!code) return [];
  const out = new Set<string>([code]);
  out.add(code.replace(/^0+/, ""));

  const m = code.match(/^0MM00(.+)$/);
  if (m) {
    const short = m[1];
    out.add(short);
    out.add(short.replace(/^N/, ""));
    if (short.startsWith("N") && short.length >= 3) {
      out.add(`M0${short.slice(1)}`);
    }
    out.add(`M0${short}`);
  }

  // Generic: last 2–4 chars often are the paint short code
  for (const n of [2, 3, 4]) {
    if (code.length >= n) out.add(code.slice(-n));
  }

  return [...out];
}

export function resolvePaintLabel(rawCode: string): {
  code: string;
  label: string;
  hex: string;
} | null {
  for (const candidate of paintCodeCandidates(rawCode)) {
    const hit = PAINT_BY_CODE[candidate];
    if (hit) {
      return { code: candidate, label: hit.label, hex: hit.hex };
    }
  }
  return null;
}

export function extractPaintFromPictures(
  pictures: unknown,
): PaintInfo | null {
  if (!Array.isArray(pictures) || pictures.length === 0) return null;
  const urls = pictures.filter((p): p is string => typeof p === "string");
  if (urls.length === 0) return null;

  // Prefer a side-ish view if numbered; else first
  const pictureUrl =
    urls.find((u) => /view=00[123]/i.test(u)) ??
    urls.find((u) => /view=EXT/i.test(u)) ??
    urls[0];

  let rawColor = "";
  try {
    const u = new URL(pictureUrl);
    rawColor = u.searchParams.get("color") ?? u.searchParams.get("Color") ?? "";
  } catch {
    const m = pictureUrl.match(/[?&]color=([^&]+)/i);
    rawColor = m ? decodeURIComponent(m[1]) : "";
  }

  const resolved = rawColor ? resolvePaintLabel(rawColor) : null;
  return {
    code: resolved?.code ?? (rawColor ? rawColor.toUpperCase() : "unknown"),
    label: resolved?.label ?? (rawColor ? `Lack ${rawColor}` : "Unbekannt"),
    hex: resolved?.hex ?? "#1a3a48",
    pictureUrl,
  };
}
