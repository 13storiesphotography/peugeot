import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { isPublicSignupEnabled } from "@/lib/auth/allowlist";
import { founderSpotsTaken } from "@/lib/billing/entitlement";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-3008 Control — Peugeot E-3008 im Browser steuern",
  description:
    "Laden, Vorklima und Fernbedienung für den Peugeot E-3008 — klar, schnell und im Browser. Registrieren, MyPeugeot verbinden, loslegen.",
  openGraph: {
    title: "E-3008 Control",
    description:
      "Dein Peugeot E-3008 im Browser: Laden, Klima, Fernbedienung — übersichtlicher als die Serien-App.",
    type: "website",
  },
};

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const publicSignup = isPublicSignupEnabled();
  const denied = params.denied === "1";
  const supabase = await createClient();
  const founderTaken = await founderSpotsTaken(supabase);

  return (
    <LandingPage
      publicSignup={publicSignup}
      denied={denied}
      founderTaken={founderTaken}
    />
  );
}
