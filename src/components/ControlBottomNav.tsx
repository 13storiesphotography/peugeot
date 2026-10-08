"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CONTROL_TABS } from "@/components/control-nav-items";
import type { ControlTab } from "@/components/control-tabs";

export type { ControlTab };

const TAB_IDS = CONTROL_TABS.map((t) => t.id);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ControlBottomNav({
  tab,
  onChange,
}: {
  tab: ControlTab;
  onChange: (tab: ControlTab) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pillRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);
  const posRef = useRef({ x: 0, w: 0, ready: false });
  const [pillReady, setPillReady] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const measureActive = useCallback((id: ControlTab) => {
    const track = trackRef.current;
    const idx = TAB_IDS.indexOf(id);
    const btn = itemRefs.current[idx];
    if (!track || !btn || idx < 0) return null;
    const trackBox = track.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    return {
      x: btnBox.left - trackBox.left,
      w: btnBox.width,
    };
  }, []);

  const placePill = useCallback(
    (id: ControlTab, animate: boolean) => {
      const next = measureActive(id);
      const el = pillRef.current;
      if (!next || !el) return;

      const prev = posRef.current;
      const fromX = prev.ready ? prev.x : next.x;
      const fromW = prev.ready ? prev.w : next.w;
      posRef.current = { x: next.x, w: next.w, ready: true };
      setPillReady(true);

      if (!animate || prefersReducedMotion() || (fromX === next.x && fromW === next.w)) {
        el.style.transform = `translate3d(${next.x}px,0,0)`;
        el.style.width = `${next.w}px`;
        return;
      }

      animRef.current?.cancel();
      const dx = Math.abs(next.x - fromX);
      const stretch = Math.min(1.55, 1 + dx / 220);
      const duration = Math.min(520, 320 + dx * 0.35);

      el.style.width = `${next.w}px`;
      animRef.current = el.animate(
        [
          {
            transform: `translate3d(${fromX}px,0,0) scaleX(1)`,
            offset: 0,
          },
          {
            transform: `translate3d(${(fromX + next.x) / 2}px,0,0) scaleX(${stretch})`,
            offset: 0.42,
          },
          {
            transform: `translate3d(${next.x}px,0,0) scaleX(1)`,
            offset: 1,
          },
        ],
        {
          duration,
          easing: "cubic-bezier(0.32, 0.72, 0, 1)",
          fill: "forwards",
        },
      );
      animRef.current.finished
        .then(() => {
          el.style.transform = `translate3d(${next.x}px,0,0)`;
          animRef.current = null;
        })
        .catch(() => {
          el.style.transform = `translate3d(${next.x}px,0,0)`;
          animRef.current = null;
        });
    },
    [measureActive],
  );

  useLayoutEffect(() => {
    placePill(tab, posRef.current.ready);
  }, [tab, placePill]);

  useEffect(() => {
    const onResize = () => placePill(tab, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [placePill, tab]);

  // Instagram / iOS-style: collapse labels while scrolling down, expand on up.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 24) setMinimized(false);
        else if (delta > 6) setMinimized(true);
        else if (delta < -6) setMinimized(false);
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => placePill(tab, false), 220);
    return () => window.clearTimeout(id);
  }, [minimized, placePill, tab]);

  return (
    <nav
      className={`control-bottom-nav control-glass-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden${
        minimized ? " control-glass-nav-min" : ""
      }`}
      aria-label="Hauptnavigation"
    >
      <div
        ref={trackRef}
        className="control-glass-shell relative mx-auto flex max-w-lg items-stretch justify-between sm:max-w-xl"
      >
        <span
          ref={pillRef}
          className="control-glass-pill"
          style={{ opacity: pillReady ? 1 : 0 }}
          aria-hidden
        />
        {CONTROL_TABS.map((item, index) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              onClick={() => onChange(item.id)}
              className="control-bottom-item control-glass-item relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{
                color: active ? "var(--accent-bright)" : "var(--fg-muted)",
              }}
              aria-current={active ? "page" : undefined}
            >
              <span className="control-glass-icon grid place-items-center transition-transform duration-200 ease-out">
                {item.icon(active)}
              </span>
              <span className="control-glass-label truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
