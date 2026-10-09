"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Ignore small rubber-band / scroll overshoot before the gesture engages. */
const DEADZONE_PX = 36;
/** Must pull at least this far past the deadzone to arm refresh on release. */
const THRESHOLD_PX = 88;
const MAX_PULL_PX = 132;
/** Only start when the page is truly at rest at the top. */
const TOP_EPS_PX = 0.5;

function scrollTop(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

/** Rubber-band: linear to threshold, then heavy resistance. */
function dampen(rawPastDeadzone: number): number {
  if (rawPastDeadzone <= 0) return 0;
  if (rawPastDeadzone <= THRESHOLD_PX) return rawPastDeadzone;
  const extra = rawPastDeadzone - THRESHOLD_PX;
  return Math.min(MAX_PULL_PX, THRESHOLD_PX + extra * 0.28);
}

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  /** True while a refresh is already running (e.g. header button). */
  refreshing?: boolean;
  children: ReactNode;
}

/**
 * Safari-like pull-to-refresh on document scroll.
 * Growing arrow until a clear threshold — then refresh on release only.
 */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  refreshing = false,
  children,
}: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const engaged = useRef(false);
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
    tracking.current = false;
    engaged.current = false;
    setPull(0);
    setArmedBoth(false);
  }, [setArmedBoth]);

  useEffect(() => {
    if (disabled) return;

    const begin = (clientY: number) => {
      if (busyRef.current || refreshing) return;
      // Must start at the absolute top — mid-scroll overshoot must not arm.
      if (scrollTop() > TOP_EPS_PX) {
        tracking.current = false;
        startY.current = null;
        return;
      }
      startY.current = clientY;
      tracking.current = true;
      engaged.current = false;
    };

    const move = (clientY: number, cancelableEvent?: Event) => {
      if (!tracking.current || startY.current == null) return;
      if (busyRef.current || refreshing) return;

      const raw = clientY - startY.current;

      // Finger moved up, or page left the top → abandon gesture.
      if (raw <= 0 || scrollTop() > TOP_EPS_PX) {
        if (engaged.current) {
          setPull(0);
          setArmedBoth(false);
          engaged.current = false;
        }
        return;
      }

      // Deadzone: treat as normal scroll rubber-band, do not hijack.
      if (raw < DEADZONE_PX) {
        if (engaged.current) {
          setPull(0);
          setArmedBoth(false);
          engaged.current = false;
        }
        return;
      }

      engaged.current = true;
      const dampened = dampen(raw - DEADZONE_PX);
      setPull(dampened);
      setArmedBoth(dampened >= THRESHOLD_PX);
      if (cancelableEvent?.cancelable) cancelableEvent.preventDefault();
    };

    const end = () => {
      if (!tracking.current) return;
      const shouldRefresh =
        engaged.current &&
        armedRef.current &&
        !busyRef.current &&
        !refreshing;
      reset();
      if (shouldRefresh) {
        busyRef.current = true;
        void Promise.resolve(onRefreshRef.current()).finally(() => {
          busyRef.current = false;
        });
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      begin(y);
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      move(y, e);
    };
    const onPointerDown = (e: PointerEvent) => {
      // Touch is handled above; this covers mouse / pen for desktop QA.
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      begin(e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!tracking.current) return;
      move(e.clientY, e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      end();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", end, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [disabled, refreshing, reset, setArmedBoth]);

  const showIndicator = pull > 0 || refreshing;
  const indicatorPull = refreshing ? Math.round(THRESHOLD_PX * 0.55) : pull;
  const progress = Math.min(1, pull / THRESHOLD_PX);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          height: Math.max(indicatorPull, showIndicator ? 28 : 0),
          opacity: showIndicator
            ? refreshing
              ? 1
              : Math.min(1, 0.2 + progress * 0.8)
            : 0,
          transition:
            pull === 0 && !refreshing
              ? "opacity 200ms ease, height 200ms ease"
              : undefined,
        }}
        aria-hidden
      >
        <div
          className="mt-1.5 flex h-9 w-9 items-center justify-center text-[var(--accent-bright)]"
          style={{
            transform: `translateY(${Math.max(0, indicatorPull - 40)}px)`,
          }}
        >
          {refreshing ? (
            <RefreshSpinner />
          ) : (
            <GrowingArrow progress={progress} armed={armed} />
          )}
        </div>
      </div>
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.42}px)` : undefined,
          transition: pull === 0 ? "transform 220ms ease" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Stem lengthens with pull; flips once past the arm threshold. */
function GrowingArrow({
  progress,
  armed,
}: {
  progress: number;
  armed: boolean;
}) {
  const stem = 5 + progress * 11;
  const head = 3.2 + progress * 0.6;
  const tipY = 4 + stem;
  const color = armed ? "var(--accent-bright)" : "currentColor";

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: `rotate(${armed ? 180 : 0}deg) scale(${0.85 + progress * 0.2})`,
        transition: "transform 160ms ease",
        opacity: 0.35 + progress * 0.65,
      }}
    >
      <path
        d={`M12 4 V${tipY}`}
        stroke={color}
        strokeWidth={1.6 + progress * 0.4}
        strokeLinecap="round"
      />
      <path
        d={`M12 ${tipY} L${12 - head} ${tipY - head} M12 ${tipY} L${12 + head} ${tipY - head}`}
        stroke={color}
        strokeWidth={1.6 + progress * 0.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Discrete spinner after release — not a looping bounce arrow. */
function RefreshSpinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ animationDuration: "0.85s" }}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="2"
      />
      <path
        d="M20 12a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
