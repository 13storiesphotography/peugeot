import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { isPublicSignupEnabled } from "@/lib/auth/allowlist";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: "Peugeot Control",
      description: t("meta.description"),
      type: "website",
    },
  };
}

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
