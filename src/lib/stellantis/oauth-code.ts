/** Accept raw code or full mymap:// / https redirect URL. */

/** Peugeot login/consent page — has no OAuth code yet. */
export function isPeugeotLoginPageUrl(input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  return /id-dcr\.peugeot\.com|idpcvs\.peugeot\.com\/am\/oauth2\/authorize|authorize-consentments|gotoparam=/i.test(
    raw,
  );
}

/** Accept raw code or full mymap:// / https redirect URL. */
export function extractOAuthCode(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  // Bare token (no URL)
  if (!raw.includes("://") && !raw.includes("code=")) {
    return raw;
  }

  try {
    const normalized = raw.replace(/^mymap:/i, "https:");
    const url = new URL(normalized);
    const code = url.searchParams.get("code");
    if (code) return code.trim();
  } catch {
    // fall through
  }

  const match = raw.match(/[?&#]code=([^&#\s]+)/i);
  if (match?.[1]) {
    const value = decodeURIComponent(match[1]).trim();
    // Ignore query flags like response_type=code (no value that looks like a grant)
    if (value && value !== "code" && value.length > 8) return value;
  }

  // Never treat a random URL as the code (e.g. authorize-consentments page).
  return "";
}
