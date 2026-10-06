import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { PRO_MONTH_CENTS, formatEuroFromCents } from "@/lib/billing/catalog";

/** JSON-LD for the public homepage (SoftwareApplication + WebSite). */
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
            description: "Free — Live-Status, Standort und Ladekurve",
          },
          {
            "@type": "Offer",
            price: (PRO_MONTH_CENTS / 100).toFixed(2),
            priceCurrency: "EUR",
            description: `Pro — Vorklima und Fernbedienung, ${proPrice}/Monat`,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
