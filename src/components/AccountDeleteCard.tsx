"use client";

import { useActionState } from "react";
import { deleteOwnAccount, type AccountState } from "@/app/actions/account";
import { useI18n } from "@/components/i18n/I18nProvider";

const initial: AccountState = {};

export function AccountDeleteCard() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(deleteOwnAccount, initial);
  const confirmWord = t("account.confirmWord");

  return (
    <section className="ui-surface border border-[var(--danger)]/25 p-4 sm:p-5">
      <p className="eyebrow text-[var(--danger)]">{t("account.eyebrow")}</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        {t("account.title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{t("account.body")}</p>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">{t("account.password")}</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 ui-field w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">
            {t("account.confirmLabel", { word: confirmWord }).split(confirmWord)[0]}
            <span className="font-semibold">{confirmWord}</span>
            {t("account.confirmLabel", { word: confirmWord }).split(confirmWord)[1]}
          </span>
          <input
            name="confirm"
            type="text"
            autoComplete="off"
            required
            className="mt-1 ui-field w-full"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-btn w-full rounded-full border border-[var(--danger)]/50 px-5 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
        >
          {pending ? t("account.deleting") : t("account.delete")}
        </button>
      </form>
    </section>
  );
}
