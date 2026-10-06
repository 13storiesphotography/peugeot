"use client";

import Link from "next/link";
import { CONTROL_TABS } from "@/components/control-nav-items";
import {
  controlTabHref,
  type ControlTab,
} from "@/components/control-tabs";

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ControlSideNav({
  tab,
  onChange,
  section = "control",
  vehicleName,
}: {
  tab?: ControlTab;
  onChange?: (tab: ControlTab) => void;
  section?: "control" | "settings" | "account";
  vehicleName?: string;
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-[var(--line)] bg-[rgba(7,16,24,0.92)] px-4 py-6 backdrop-blur-xl lg:flex"
      aria-label="Desktop-Navigation"
    >
      <div className="px-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          Peugeot Control
        </p>
        {vehicleName ? (
          <p className="mt-2 truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            {vehicleName}
          </p>
        ) : (
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Steuerung
          </p>
        )}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {CONTROL_TABS.map((item) => {
          const active = section === "control" && tab === item.id;
          const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            active
              ? "bg-[rgba(95,227,192,0.12)] text-[var(--accent-bright)]"
              : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
          }`;

          if (onChange) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={className}
                aria-current={active ? "page" : undefined}
              >
                {item.icon(active)}
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={controlTabHref(item.id)}
              className={className}
              aria-current={active ? "page" : undefined}
            >
              {item.icon(active)}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-[var(--line)] pt-4">
        <a
          href="/control/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            section === "settings"
              ? "bg-[rgba(95,227,192,0.12)] text-[var(--accent-bright)]"
              : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
          }`}
          aria-current={section === "settings" ? "page" : undefined}
        >
          <GearIcon />
          Einstellungen
        </a>
        <Link
          href="/control/account"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            section === "account"
              ? "bg-[rgba(95,227,192,0.12)] text-[var(--accent-bright)]"
              : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
          }`}
          aria-current={section === "account" ? "page" : undefined}
        >
          <UserIcon />
          Konto
        </Link>
      </div>
    </aside>
  );
}
