/** Accept raw code or full mymap:// / https redirect URL. */
export function extractOAuthCode(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
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
  return match?.[1] ? decodeURIComponent(match[1]) : raw;
}
