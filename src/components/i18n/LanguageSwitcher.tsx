"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/locale";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-black/20 p-0.5 ${compact ? "" : ""}`}
      role="group"
      aria-label={t("lang.label")}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => choose(code)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              active
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            aria-pressed={active}
          >
            {code === "de" ? "DE" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
