"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CONTROL_TABS } from "@/components/control-nav-items";
import type { ControlTab } from "@/components/control-tabs";

export type { ControlTab };

const TAB_IDS = CONTROL_TABS.map((t) => t.id);
/** Spring with slight overshoot — reads more “liquid” than ease-out. */
const PILL_EASE = "cubic-bezier(0.34, 1.35, 0.64, 1)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tabAtClientX(
  track: HTMLElement,
  items: Array<HTMLButtonElement | null>,
  clientX: number,
): ControlTab | null {
  for (let i = 0; i < items.length; i++) {
    const btn = items[i];
    if (!btn) continue;
    const box = btn.getBoundingClientRect();
    if (clientX >= box.left && clientX <= box.right) {
      return TAB_IDS[i] ?? null;
    }
  }
  // Snap to nearest when dragging in gaps / past edges.
  const trackBox = track.getBoundingClientRect();
  const rel = Math.min(
    1,
    Math.max(0, (clientX - trackBox.left) / Math.max(1, trackBox.width)),
  );
  const idx = Math.min(TAB_IDS.length - 1, Math.floor(rel * TAB_IDS.length));
  return TAB_IDS[idx] ?? null;
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
  const scrubbingRef = useRef(false);
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

      if (
        !animate ||
        prefersReducedMotion() ||
        (fromX === next.x && fromW === next.w)
      ) {
        el.style.transform = `translate3d(${next.x}px,0,0)`;
        el.style.width = `${next.w}px`;
        return;
      }

      animRef.current?.cancel();
      const dx = Math.abs(next.x - fromX);
      const stretch = Math.min(1.65, 1 + dx / 180);
      const duration = Math.min(560, 340 + dx * 0.4);
      const midW = Math.max(fromW, next.w) * stretch;

      animRef.current = el.animate(
        [
          {
            transform: `translate3d(${fromX}px,0,0)`,
            width: `${fromW}px`,
            offset: 0,
          },
          {
            transform: `translate3d(${(fromX + next.x) / 2 - (midW - next.w) / 4}px,0,0)`,
            width: `${midW}px`,
            offset: 0.45,
          },
          {
            transform: `translate3d(${next.x}px,0,0)`,
            width: `${next.w}px`,
            offset: 1,
          },
        ],
        {
          duration,
          easing: PILL_EASE,
          fill: "forwards",
        },
      );
      animRef.current.finished
        .then(() => {
          el.style.transform = `translate3d(${next.x}px,0,0)`;
          el.style.width = `${next.w}px`;
          animRef.current = null;
        })
        .catch(() => {
          el.style.transform = `translate3d(${next.x}px,0,0)`;
          el.style.width = `${next.w}px`;
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

  // Collapse labels on scroll-down; expand on scroll-up (content focus).
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking || scrubbingRef.current) return;
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
    const id = window.setTimeout(() => placePill(tab, false), 240);
    return () => window.clearTimeout(id);
  }, [minimized, placePill, tab]);

  // Finger scrub: drag across the glass bar — pill follows, tab commits on release.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let active = false;
    let moved = false;
    let hoverTab: ControlTab | null = null;

    const onStart = (clientX: number) => {
      active = true;
      moved = false;
      scrubbingRef.current = true;
      hoverTab = tabAtClientX(track, itemRefs.current, clientX);
      if (hoverTab) placePill(hoverTab, true);
    };

    const onMove = (clientX: number) => {
      if (!active) return;
      moved = true;
      const next = tabAtClientX(track, itemRefs.current, clientX);
      if (next && next !== hoverTab) {
        hoverTab = next;
        placePill(next, true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(8);
          } catch {
            /* ignore */
          }
        }
      }
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      scrubbingRef.current = false;
      if (moved && hoverTab && hoverTab !== tab) onChange(hoverTab);
      else placePill(tab, true);
      hoverTab = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      onStart(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !active) return;
      onMove(t.clientX);
      if (moved && e.cancelable) e.preventDefault();
    };

    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchmove", onTouchMove, { passive: false });
    track.addEventListener("touchend", onEnd, { passive: true });
    track.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchmove", onTouchMove);
      track.removeEventListener("touchend", onEnd);
      track.removeEventListener("touchcancel", onEnd);
    };
  }, [onChange, placePill, tab]);

  return (
    <nav
      className={`control-bottom-nav control-glass-nav fixed inset-x-0 bottom-0 z-40 px-3.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden${
        minimized ? " control-glass-nav-min" : ""
      }`}
      aria-label="Hauptnavigation"
    >
      <div
        ref={trackRef}
        className="control-glass-shell relative mx-auto flex max-w-lg items-stretch justify-between sm:max-w-xl"
      >
        <span className="control-glass-sheen" aria-hidden />
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
              <span
                className={`control-glass-icon grid place-items-center${
                  active ? " control-glass-icon-active" : ""
                }`}
              >
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
