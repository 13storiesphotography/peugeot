"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  type AuthState,
} from "@/app/actions/auth";
import { setLocaleAction } from "@/app/actions/locale";
import { useI18n } from "@/components/i18n/I18nProvider";
import { isLocale } from "@/i18n/config";

const initial: AuthState = {};

type AuthMode = "login" | "register" | "forgot";

export function AuthForm({
  publicSignup,
  denied,
  confirmError,
}: {
  publicSignup: boolean;
  denied?: boolean;
  confirmError?: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initial,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    signUp,
    initial,
  );
  const [forgotState, forgotAction, forgotPending] = useActionState(
    requestPasswordReset,
    initial,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendConfirmation,
    initial,
  );

  const pending =
    loginPending || registerPending || forgotPending || resendPending;
  const offerResend =
    publicSignup &&
    (Boolean(confirmError) ||
      Boolean(registerState.needsConfirmation) ||
      Boolean(loginState.needsConfirmation) ||
      Boolean(resendState.needsConfirmation));
  const state =
    resendState.success || resendState.error
      ? resendState
      : mode === "login"
        ? loginState
        : mode === "register"
          ? registerState
          : forgotState;
  const formAction =
    mode === "login"
      ? loginAction
      : mode === "register"
        ? registerAction
        : forgotAction;

  async function onLocaleChange(next: string) {
    if (!isLocale(next) || next === locale) return;
    await setLocaleAction(next);
    router.refresh();
  }

  return (
    <div
      id="start"
      className="panel mx-auto w-full max-w-md scroll-mt-24 rounded-[1.75rem] p-6 sm:p-8 lg:mx-0"
    >
      {mode !== "forgot" ? (
        <div className="flex gap-1 rounded-full border border-[var(--line)] bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "text-[var(--fg-muted)]"
            }`}
          >
            {t("auth.signIn")}
          </button>
          {publicSignup ? (
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[var(--accent-bright)] text-[#031016]"
                  : "text-[var(--fg-muted)]"
              }`}
            >
              {t("auth.register")}
            </button>
          ) : null}
        </div>
      ) : null}

      <h2
        className={`${mode === "forgot" ? "mt-0" : "mt-6"} font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight`}
      >
        {mode === "register"
          ? t("auth.createAccount")
          : mode === "forgot"
            ? t("auth.forgotTitle")
            : t("auth.welcomeBack")}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {mode === "register"
          ? t("auth.registerHint")
          : mode === "forgot"
            ? t("auth.forgotHint")
            : publicSignup
              ? t("auth.loginHint")
              : t("auth.loginHintPrivate")}
      </p>

      {confirmError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          {t("auth.confirmFailed")}
        </p>
      ) : null}

      {denied ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          {t("auth.denied")}{" "}
          {publicSignup ? t("auth.deniedPublic") : t("auth.deniedPrivate")}
        </p>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            {t("common.email")}
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
          />
        </label>

        {mode !== "forgot" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              {t("common.password")}
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
            />
          </label>
        ) : null}

        {mode === "login" ? (
          <p className="text-right text-sm">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-[var(--fg-muted)] underline-offset-2 hover:text-[var(--fg)] hover:underline"
            >
              {t("auth.forgotLink")}
            </button>
          </p>
        ) : null}

        {mode === "register" ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                {t("common.passwordRepeat")}
              </span>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                {t("lang.label")}
              </span>
              <select
                name="localeSelect"
                defaultValue={locale}
                onChange={(event) => void onLocaleChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
              >
                <option value="de">{t("lang.de")}</option>
                <option value="en">{t("lang.en")}</option>
              </select>
              <span className="mt-1.5 block text-xs text-[var(--fg-muted)]">
                {t("auth.languageHint")}
              </span>
            </label>
          </>
        ) : null}

        {state.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p role="status" className="text-sm text-[var(--accent-bright)]">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="action-btn w-full rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending && !resendPending
            ? t("common.wait")
            : mode === "register"
              ? t("auth.startFree")
              : mode === "forgot"
                ? t("auth.sendLink")
                : t("auth.toControl")}
        </button>

        {offerResend && mode !== "forgot" ? (
          <button
            type="submit"
            formAction={resendAction}
            formNoValidate
            disabled={pending}
            className="w-full pt-1 text-center text-sm text-[var(--fg-muted)] underline-offset-4 hover:text-[var(--fg)] hover:underline disabled:opacity-60"
          >
            {resendPending ? t("auth.resending") : t("auth.resend")}
          </button>
        ) : null}
      </form>

      {mode === "forgot" ? (
        <p className="mt-4 text-center text-sm text-[var(--fg-muted)]">
          <button
            type="button"
            onClick={() => setMode("login")}
            className="underline-offset-2 hover:text-[var(--fg)] hover:underline"
          >
            {t("common.backToSignIn")}
          </button>
        </p>
      ) : null}
    </div>
  );
}