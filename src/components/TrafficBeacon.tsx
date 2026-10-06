"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_EVENT,
  hasAnalyticsConsent,
} from "@/lib/cookie-consent";

const VISITOR_KEY = "pc_vid";
const LAST_PATH_KEY = "pc_last_path";

function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]+$/.test(existing)) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `anon${Date.now().toString(36)}`;
  }
}

function shouldSkip(path: string): boolean {
  if (!path.startsWith("/")) return true;
  if (path.startsWith("/api/")) return true;
  if (path.startsWith("/_next")) return true;
  if (path.startsWith("/auth/")) return true;
  if (path.startsWith("/control/stats")) return true;
  return false;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return hasAnalyticsConsent();
}

function getServerSnapshot() {
  return false;
}

/** Anonymous page-view beacon for the owner traffic dashboard — only with consent. */
export function TrafficBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  const allowed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (!allowed) {
      lastSent.current = null;
      return;
    }
    if (!pathname || shouldSkip(pathname)) return;
    if (lastSent.current === pathname) return;

    try {
      if (sessionStorage.getItem(LAST_PATH_KEY) === pathname) {
        lastSent.current = pathname;
        return;
      }
      sessionStorage.setItem(LAST_PATH_KEY, pathname);
    } catch {
      // sessionStorage may be blocked
    }

    lastSent.current = pathname;
    const visitorId = getVisitorId();
    const body = JSON.stringify({
      path: pathname,
      visitorId,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });

    void fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // best-effort
    });
  }, [pathname, allowed]);

  return null;
}
