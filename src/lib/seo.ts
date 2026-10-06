import type { Metadata } from "next";
import { PRO_MONTH_CENTS, formatEuroFromCents } from "@/lib/billing/catalog";

/** Canonical public site origin for SEO (sitemap, robots, metadata). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.peugeotcontrol.app";

export const SITE_NAME = "Peugeot Control";

export const SITE_DESCRIPTION =
  "Peugeot im Browser und auf dem Handy steuern: Batterie, Laden, Vorklima und Fernbedienung — ohne ständiges Neuanmelden. Getestet am E-3008.";

export const SITE_KEYWORDS = [
  "Peugeot steuern",
  "MyPeugeot Browser",
  "E-3008 App",
  "Peugeot Vorklima",
  "Peugeot Fernbedienung",
  "Peugeot Control",
  "Peugeot PWA",
  "Peugeot laden Status",
  "MyPeugeot Alternative Browser",
] as const;

export type FaqItem = { question: string; answer: string };

export const SITE_FAQS: FaqItem[] = [
  {
    question: "Was ist Peugeot Control?",
    answer:
      "Peugeot Control ist eine inoffizielle Web-App, mit der du dein Peugeot-Fahrzeug über MyPeugeot im Browser oder auf dem Handy steuern und den Status sehen kannst. Aktuell getestet am E-3008.",
  },
  {
    question: "Ist Peugeot Control von Peugeot oder Stellantis?",
    answer:
      "Nein. Peugeot Control ist unabhängig und nicht mit Stellantis N.V., Peugeot oder verbundenen Marken verbunden. Es nutzt dein eigenes MyPeugeot-Konto.",
  },
  {
    question: "Brauche ich die offizielle MyPeugeot-App trotzdem?",
    answer:
      "Für die Verbindung und für Peugeot-Dienste (z. B. e-Remote / Connect) brauchst du weiterhin ein gültiges MyPeugeot-Konto und ggf. das passende Connected-Services-Abo. Peugeot Control ersetzt die Serien-App nicht vollständig.",
  },
  {
    question: "Funktioniert es auf dem Handy und am Computer?",
    answer:
      "Ja. Du kannst Peugeot Control im Browser auf Smartphone, Tablet oder Desktop nutzen und optional als PWA auf dem Homescreen speichern — ohne ständiges Neuanmelden.",
  },
  {
    question: "Welche Funktionen sind kostenlos, was ist Pro?",
    answer: `Free zeigt u. a. Live-Status (Batterie, Reichweite, Ladezustand), Standort und Ladekurve. Pro ergänzt Fernbedienung wie Vorklima, Entriegeln/Verriegeln, Finden/Hupe und das 80%-Ladelimit — aktuell ${formatEuroFromCents(PRO_MONTH_CENTS)}/Monat inkl. MwSt.`,
  },
  {
    question: "Welche Voraussetzungen brauche ich?",
    answer:
      "Ein Peugeot mit MyPeugeot-Konto. Für Vorklima und Fernbedienung e-Remote / Connect. Connect PLUS ist optional für Schloss-Status und Hupe. Getestet am E-3008; andere Modelle können funktionieren.",
  },
  {
    question: "Wie starte ich?",
    answer:
      "Konto anlegen, in den Einstellungen MyPeugeot verbinden, e-Remote einmalig freischalten (SMS-Code + PIN) — danach Übersicht, Laden, Klima und Steuern nutzen.",
  },
  {
    question: "Sind meine MyPeugeot-Zugangsdaten sicher?",
    answer:
      "Die Verbindung erfolgt über dein Konto. Sensible Zugangsdaten werden verschlüsselt abgelegt, soweit für die Sitzungserneuerung nötig. Details stehen in der Datenschutzerklärung.",
  },
];

export const SETUP_STEPS = [
  {
    name: "Konto anlegen",
    text: "E-Mail und Passwort — kostenlos und in unter einer Minute.",
  },
  {
    name: "MyPeugeot verbinden",
    text: "In den Einstellungen mit E-Mail/Passwort oder OAuth — wie in der offiziellen App.",
  },
  {
    name: "Fernbedienung freischalten",
    text: "SMS-Code und 4-stellige PIN einmalig hinterlegen (e-Remote / Connect).",
  },
  {
    name: "Loslegen",
    text: "Übersicht, Laden, Klima und Steuern — auf dem Handy oder Desktop.",
  },
] as const;

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path ?? "/");
  const index = opts.index ?? true;
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: "de_DE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}
