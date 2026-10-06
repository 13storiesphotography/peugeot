import { JsonLd } from "@/components/JsonLd";
import {
  SETUP_STEPS,
  SITE_DESCRIPTION,
  SITE_FAQS,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";
import { PRO_MONTH_CENTS, formatEuroFromCents } from "@/lib/billing/catalog";

/** JSON-LD for the public homepage. */
export function LandingJsonLd() {
  const proPrice = formatEuroFromCents(PRO_MONTH_CENTS);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "de-DE",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon-512.png`,
        },
        description:
          "Inoffizielle Steuerungs-Oberfläche für Peugeot-Fahrzeuge über MyPeugeot.",
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: `${SITE_NAME} — Peugeot im Browser steuern`,
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#app` },
        inLanguage: "de-DE",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web, iOS, Android",
        description: SITE_DESCRIPTION,
        inLanguage: "de-DE",
        offers: [
          {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            name: "Free",
            description: "Live-Status, Standort und Ladekurve",
          },
          {
            "@type": "Offer",
            price: (PRO_MONTH_CENTS / 100).toFixed(2),
            priceCurrency: "EUR",
            name: "Pro",
            description: `Vorklima und Fernbedienung, ${proPrice}/Monat`,
          },
        ],
      },
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}/#howto`,
        name: "Peugeot Control einrichten",
        description:
          "In wenigen Schritten MyPeugeot verbinden und dein Peugeot steuern.",
        totalTime: "PT10M",
        step: SETUP_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${SITE_URL}/#start`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Start",
            item: SITE_URL,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: SITE_FAQS.slice(0, 4).map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return <JsonLd data={data} />;
}

export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl("/faq")}/#faq`,
    url: absoluteUrl("/faq"),
    name: `FAQ · ${SITE_NAME}`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "de-DE",
    mainEntity: SITE_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}
