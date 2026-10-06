/** Public-facing contact addresses (forwarded to the operator inbox). */
export const CONTACT = {
  /** Impressum / allgemeine Erreichbarkeit */
  general: "kontakt@peugeotcontrol.app",
  /** Datenschutz / DSGVO-Anfragen */
  privacy: "datenschutz@peugeotcontrol.app",
  /** AGB, Widerruf, Vertragsfragen */
  legal: "mail@peugeotcontrol.app",
} as const;

export function mailto(address: string) {
  return `mailto:${address}`;
}
