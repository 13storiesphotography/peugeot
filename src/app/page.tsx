import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { isPublicSignupEnabled } from "@/lib/auth/allowlist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peugeot Control — Schneller als die Serien-App",
  description:
    "Die MyPeugeot-App ist zu langsam. Peugeot Control: Laden, Vorklima und Fernbedienung im Browser — klar und schnell. Getestet am E-3008. Free ansehen, Pro steuern.",
  openGraph: {
    title: "Peugeot Control — Steuer dein Auto ohne App-Frust",
    description:
      "Laden, Klima, Schloss: schneller als die Serien-App. Im Browser & als PWA. Free zum Zuschauen, Pro zum Steuern.",
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
  const deleted = params.deleted === "1";

  return (
    <LandingPage
      publicSignup={publicSignup}
      denied={denied}
      confirmError={confirmError}
      deleted={deleted}
    />
  );
}
