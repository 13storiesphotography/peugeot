"use client";

import { CONTROL_TABS } from "@/components/control-nav-items";
import type { ControlTab } from "@/components/control-tabs";

export type { ControlTab };

export function ControlBottomNav({
  tab,
  onChange,
}: {
  tab: ControlTab;
  onChange: (tab: ControlTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(7,16,24,0.88)] pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-[18px] lg:hidden"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1 sm:max-w-xl">
        {CONTROL_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className="control-bottom-item flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{
                color: active ? "var(--accent-bright)" : "var(--fg-muted)",
              }}
              aria-current={active ? "page" : undefined}
            >
              <span className="transition-transform duration-200 ease-out">
                {item.icon(active)}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
