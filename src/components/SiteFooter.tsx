import Link from "next/link";
import { getTranslator } from "@/i18n/server";

export async function SiteFooter() {
  const { t } = await getTranslator();
  return (
    <footer className="relative z-10 border-t border-[var(--line)] py-8 text-center text-xs text-[var(--fg-muted)]">
      <p>{t("footer.line1")}</p>
      <p className="mx-auto mt-2 max-w-xl px-4">{t("footer.line2")}</p>
      <p className="mt-3">
        <Link href="/impressum" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
          {t("common.imprint")}
        </Link>
      </p>
    </footer>
  );
}
