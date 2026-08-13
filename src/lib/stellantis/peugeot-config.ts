import { Buffer } from "node:buffer";

export type PeugeotCountryConfig = {
  locale: string;
  client_id: string;
  client_secret: string;
};

export type PeugeotBrandConfig = {
  oauth_url: string;
  realm: string;
  scheme: string;
  configs: Record<string, PeugeotCountryConfig>;
};

/** Mobile-app credentials used by community integrations (MyPeugeot). */
export const MYPEUGEOT: PeugeotBrandConfig = {
  oauth_url: "https://idpcvs.peugeot.com",
  realm: "clientsB2CPeugeot",
  scheme: "mymap",
  configs: {
    DE: {
      locale: "de-DE",
      client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530",
      client_secret: "T5tP7iS0cO8sC0lA2iE2aR7gK6uE5rF3lJ8pC3nO1pR7tL8vU1",
    },
    AT: {
      locale: "de-AT",
      client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530",
      client_secret: "T5tP7iS0cO8sC0lA2iE2aR7gK6uE5rF3lJ8pC3nO1pR7tL8vU1",
    },
    CH: {
      locale: "de-CH",
      client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530",
      client_secret: "T5tP7iS0cO8sC0lA2iE2aR7gK6uE5rF3lJ8pC3nO1pR7tL8vU1",
    },
    FR: {
      locale: "fr-FR",
      client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530",
      client_secret: "T5tP7iS0cO8sC0lA2iE2aR7gK6uE5rF3lJ8pC3nO1pR7tL8vU1",
    },
  },
};

export function getCountryConfig(countryCode: string): PeugeotCountryConfig {
  const code = countryCode.toUpperCase();
  const config = MYPEUGEOT.configs[code] ?? MYPEUGEOT.configs.DE;
  return config;
}

export function getBasicToken(countryCode: string): string {
  const { client_id, client_secret } = getCountryConfig(countryCode);
  return Buffer.from(`${client_id}:${client_secret}`, "utf8").toString("base64");
}

export function getAuthorizeUrl(countryCode: string): string {
  const code = countryCode.toUpperCase();
  const cfg = getCountryConfig(code);
  const culture = code.toLowerCase();
  const redirectUri = `${MYPEUGEOT.scheme}://oauth2redirect/${culture}`;
  const params = new URLSearchParams({
    client_id: cfg.client_id,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email",
    locale: cfg.locale,
  });
  return `${MYPEUGEOT.oauth_url}/am/oauth2/authorize?${params.toString()}`;
}

export function getRedirectUri(countryCode: string): string {
  return `${MYPEUGEOT.scheme}://oauth2redirect/${countryCode.toLowerCase()}`;
}
