"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  children: ReactNode;
  /** Extra class while the soft navigation is pending. */
  pendingClassName?: string;
};

function PendingMark({ pendingClassName }: { pendingClassName?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-pending={pending ? "true" : "false"}
      className={
        pending
          ? (pendingClassName ??
            "pointer-events-none absolute inset-0 rounded-[inherit] bg-[rgba(95,227,192,0.14)]")
          : "hidden"
      }
    />
  );
}

/**
 * Soft Next.js Link with prefetch + instant pending chrome.
 * Prefer over raw <a> for in-app control routes so iOS doesn’t stick on :hover.
 */
export function InstantNavLink({
  children,
  className,
  pendingClassName,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      prefetch
      className={`relative ${className ?? ""}`}
      data-instant-nav=""
    >
      <PendingMark pendingClassName={pendingClassName} />
      {children}
    </Link>
  );
}
