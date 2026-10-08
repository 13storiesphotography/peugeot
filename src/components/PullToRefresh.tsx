"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

function scrollTop(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  /** True while a refresh is already running (e.g. header button). */
  refreshing?: boolean;
  children: ReactNode;
}

/**
 * iOS-style pull-to-refresh on the document scroll. Triggers the same hard
 * refresh path as the header control.
 */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  refreshing = false,
  children,
}: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const armedRef = useRef(false);
  const busyRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const [pull, setPull] = useState(0);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!refreshing) busyRef.current = false;
  }, [refreshing]);

  const setArmedBoth = useCallback((next: boolean) => {
    armedRef.current = next;
    setArmed(next);
  }, []);

  const reset = useCallback(() => {
    startY.current = null;
    pulling.current = false;
    setPull(0);
    setArmedBoth(false);
  }, [setArmedBoth]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (busyRef.current || refreshing) return;
      if (scrollTop() > 2) return;
      startY.current = e.touches[0]?.clientY ?? null;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current == null) return;
      if (busyRef.current || refreshing) return;
      const y = e.touches[0]?.clientY ?? startY.current;
      const raw = y - startY.current;
      if (raw <= 0 || scrollTop() > 2) {
        setPull(0);
        setArmedBoth(false);
        return;
      }
      const dampened = Math.min(
        MAX_PULL_PX,
        raw < THRESHOLD_PX ? raw : THRESHOLD_PX + (raw - THRESHOLD_PX) * 0.35,
      );
      setPull(dampened);
      setArmedBoth(dampened >= THRESHOLD_PX);
      if (raw > 8 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      const shouldRefresh =
        armedRef.current && !busyRef.current && !refreshing;
      reset();
      if (shouldRefresh) {
        busyRef.current = true;
        void Promise.resolve(onRefreshRef.current()).finally(() => {
          busyRef.current = false;
        });
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, refreshing, reset, setArmedBoth]);

  const showIndicator = pull > 0 || refreshing;
  const indicatorPull = refreshing ? THRESHOLD_PX * 0.7 : pull;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          height: indicatorPull,
          opacity: showIndicator ? Math.min(1, indicatorPull / 40) : 0,
          transition:
            pull === 0 && !refreshing ? "opacity 160ms ease" : undefined,
        }}
        aria-hidden
      >
        <div
          className={`mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg-deep)]/90 text-[var(--accent-bright)] shadow-sm ${
            refreshing || armed ? "animate-spin" : ""
          }`}
          style={{
            transform: `translateY(${Math.max(0, indicatorPull - 36)}px) rotate(${
              armed || refreshing ? 0 : (pull / THRESHOLD_PX) * 180
            }deg)`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v10M12 15l-3.5-3.5M12 15l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.45}px)` : undefined,
          transition: pull === 0 ? "transform 180ms ease" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
