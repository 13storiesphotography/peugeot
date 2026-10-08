"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ControlSideNav } from "@/components/ControlSideNav";

/** Desktop rail + mobile-friendly content column for settings/account pages. */
export function ControlPageShell({
  section,
  children,
}: {
  section: "settings" | "account";
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/control");
    if (section === "settings") {
      router.prefetch("/control/account");
    } else {
      router.prefetch("/control/settings");
    }
  }, [router, section]);

  return (
    <div className="relative min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <ControlSideNav section={section} />
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:ml-[15.5rem] lg:max-w-5xl lg:px-10 lg:pt-10 xl:px-14">
        {children}
      </div>
    </div>
  );
}
