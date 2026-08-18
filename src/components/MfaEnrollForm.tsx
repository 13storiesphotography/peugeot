"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/i18n/I18nProvider";

export function MfaEnrollForm({
  forced,
  onDone,
}: {
  forced?: boolean;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Peugeot Control",
      });
      if (cancelled) return;
      if (enrollError || !data) {
        setError(enrollError?.message ?? t("mfa.enrollFail"));
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const verify = async () => {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw verified.error;
      onDone?.();
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
        {t("mfa.title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {forced ? t("mfa.forced") : t("mfa.hint")}
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-[var(--fg-muted)]">{t("mfa.loadingQr")}</p>
      ) : (
        <>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={t("mfa.qrAlt")}
              className="mx-auto mt-6 h-48 w-48 rounded-xl bg-white p-2"
            />
          ) : null}
          {secret ? (
            <p className="mt-4 break-all text-center text-xs text-[var(--fg-muted)]">
              {t("mfa.secret")}: <code className="text-[var(--accent-bright)]">{secret}</code>
            </p>
          ) : null}

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
            {pending ? t("mfa.checking") : t("mfa.activate")}
          </button>
        </>
      )}
    </div>
  );
}
