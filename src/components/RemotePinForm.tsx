"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  activateRemotePinAction,
  sendRemoteSmsAction,
  type RemotePinState,
} from "@/app/actions/remote";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  ready: boolean;
  /** Compact layout for the Klima tab (default settings-style). */
  compact?: boolean;
  /** Called after PIN setup succeeds so the parent can unlock climate. */
  onReady?: () => void;
};

export function RemotePinForm({ ready, compact = false, onReady }: Props) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    activateRemotePinAction,
    {} as RemotePinState,
  );
  const [smsMsg, setSmsMsg] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState("");
  const [pin, setPin] = useState("");
  const [smsPending, startSms] = useTransition();
  const [open, setOpen] = useState(!ready);
  const notified = useRef(false);

  useEffect(() => {
    if ((state.success || state.ready) && !notified.current) {
      notified.current = true;
      onReady?.();
    }
  }, [state.success, state.ready, onReady]);

  const showSetup = compact || open || !ready;

  return (
    <section className={compact ? "ui-surface space-y-4 px-4 py-4" : undefined}>
      {!compact ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {t("remote.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {ready ? t("remote.readyHint") : t("remote.setupHint")}
            </p>
          </div>
          {ready ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)]"
              aria-expanded={open}
            >
              {open ? t("remote.close") : t("remote.setupAgain")}
            </button>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="font-semibold">{t("remote.unlockClimate")}</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {t("remote.steps")}
          </p>
        </div>
      )}

      {showSetup ? (
        <>
          <div className={`${compact ? "" : "mt-4 "}flex flex-wrap gap-2`}>
            <button
              type="button"
              disabled={smsPending}
              className="action-btn rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
              onClick={() => {
                startSms(async () => {
                  setSmsMsg(null);
                  const res = await sendRemoteSmsAction();
                  setSmsMsg(res.error ?? res.success ?? null);
                });
              }}
            >
              {smsPending ? t("remote.sending") : t("remote.sendSms")}
            </button>
            {ready ? (
              <span className="self-center text-xs font-semibold text-[var(--accent-bright)]">
                {t("remote.active")}
              </span>
            ) : null}
          </div>
          {smsMsg ? (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">{smsMsg}</p>
          ) : null}

          <form
            action={action}
            className={`${compact ? "mt-1" : "mt-4"} grid gap-3 sm:grid-cols-2`}
          >
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">{t("remote.smsCode")}</span>
              <input
                name="smsCode"
                value={smsCode}
                onChange={(e) =>
                  setSmsCode(e.target.value.replace(/[^\d\s-]/g, ""))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="next"
            className="mt-1 ui-field"
            placeholder={t("remote.smsPlaceholder")}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">{t("remote.pin")}</span>
          <input
            name="pin"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 ui-field"
            placeholder="••••"
            required
          />
            </label>
            <button
              type="submit"
              disabled={
                pending ||
                smsCode.replace(/\D/g, "").length < 4 ||
                pin.length !== 4
              }
              className="action-btn btn-primary sm:col-span-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-55"
            >
              {pending
                ? t("remote.settingUp")
                : ready
                  ? t("remote.unlockAgain")
                  : t("remote.unlock")}
            </button>
          </form>
        </>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 text-sm text-[var(--accent-bright)]">{state.success}</p>
      ) : null}
    </section>
  );
}
