/** Browser-safe authorize URL (no Node Buffer). Keep in sync with peugeot-config. */

const CLIENT_ID = "1eebc2d5-5df3-459b-a624-20abfcf82530";

const LOCALES: Record<string, string> = {
  DE: "de-DE",
  AT: "de-AT",
  CH: "de-CH",
  FR: "fr-FR",
};

export function buildPeugeotAuthorizeUrl(countryCode: string): string {
  const code = countryCode.toUpperCase();
  const locale = LOCALES[code] ?? LOCALES.DE;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: `mymap://oauth2redirect/${code.toLowerCase()}`,
    scope: "openid profile email",
    locale,
  });
  return `https://idpcvs.peugeot.com/am/oauth2/authorize?${params.toString()}`;
}
