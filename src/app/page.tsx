import type { Metadata } from "next";
import { LandingJsonLd } from "@/components/landing/LandingJsonLd";
import { LandingPage } from "@/components/landing/LandingPage";
import { isPublicSignupEnabled } from "@/lib/auth/allowlist";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peugeot steuern im Browser — Laden, Klima, Fernbedienung",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  keywords: [
    "Peugeot steuern",
    "MyPeugeot Browser",
    "E-3008 App",
    "Peugeot Vorklima",
    "Peugeot Fernbedienung",
    "Peugeot Control",
    "Peugeot PWA",
  ],
  openGraph: {
    title: `${SITE_NAME} — Peugeot im Browser und auf dem Handy`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Peugeot im Browser steuern`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/icon-512.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const publicSignup = isPublicSignupEnabled();
  const denied = params.denied === "1";
  const confirmError = params.confirm === "failed";
  const deleted = params.deleted === "1";

  return (
    <>
      <LandingJsonLd />
      <LandingPage
        publicSignup={publicSignup}
        denied={denied}
        confirmError={confirmError}
        deleted={deleted}
      />
    </>
  );
}
