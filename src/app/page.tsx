import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { isPublicSignupEnabled } from "@/lib/auth/allowlist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peugeot Control — Peugeot im Browser steuern",
  description:
    "Laden, Vorklima und Fernbedienung für Peugeot — klar, schnell und im Browser. Aktuell getestet am E-3008. Registrieren, MyPeugeot verbinden, loslegen.",
  openGraph: {
    title: "Peugeot Control",
    description:
      "Dein Peugeot im Browser: Laden, Klima, Fernbedienung — übersichtlicher als die Serien-App. Aktuell getestet am E-3008.",
    type: "website",
  },
};

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const publicSignup = isPublicSignupEnabled();
  const denied = params.denied === "1";
  const confirmError = params.confirm === "failed";

  return (
    <LandingPage
      publicSignup={publicSignup}
      denied={denied}
      confirmError={confirmError}
    />
  );
}
