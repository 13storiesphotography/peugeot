"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/i18n/I18nProvider";

export function MfaChallengeForm() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const verify = async () => {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const totp = factors.data.totp.find((f) => f.status === "verified");
      if (!totp) throw new Error(t("mfa.noFactor"));

      const challenge = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (challenge.error) throw challenge.error;

      const verified = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw verified.error;

      window.location.href = "/control";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mfa.invalidCode"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="panel w-full max-w-md rounded-[1.75rem] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        {t("mfa.confirmTitle")}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {t("mfa.enterCode")}
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          {t("mfa.sixDigit")}
        </span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
          placeholder="123456"
        />
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || code.length < 6}
        onClick={() => void verify()}
        className="action-btn mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold"
        style={{
          background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
          color: "#031016",
        }}
      >
        {pending ? t("mfa.checking") : t("mfa.confirm")}
      </button>
    </div>
  );
}
