import { ControlSideNav } from "@/components/ControlSideNav";

/** Shared pulse block for control-area loading states. */
export function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

export function SettingsSectionsSkeleton() {
  return (
    <div
      className="mt-6 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0"
      aria-busy="true"
      aria-label="Einstellungen werden geladen"
    >
      <div className="ui-surface space-y-3 p-4 sm:p-5 lg:col-span-2">
        <Pulse className="h-3 w-12" />
        <Pulse className="h-6 w-40" />
        <Pulse className="h-4 w-full max-w-md" />
        <Pulse className="mt-2 h-11 w-full rounded-full" />
      </div>
      <div className="ui-surface space-y-3 p-4 sm:p-5">
        <Pulse className="h-5 w-36" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-10 w-full rounded-xl" />
        <Pulse className="h-10 w-full rounded-xl" />
      </div>
      <div className="ui-surface space-y-3 p-4 sm:p-5">
        <Pulse className="h-5 w-32" />
        <Pulse className="h-4 w-48 max-w-full" />
        <Pulse className="h-10 w-40 rounded-full" />
        <Pulse className="h-10 w-full rounded-xl" />
      </div>
      <div className="ui-surface space-y-3 p-4 sm:p-5">
        <Pulse className="h-5 w-40" />
        <Pulse className="h-10 w-full rounded-xl" />
      </div>
      <div className="ui-surface space-y-3 p-4 sm:p-5">
        <Pulse className="h-5 w-36" />
        <Pulse className="h-10 w-full rounded-xl" />
        <Pulse className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="relative min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <ControlSideNav section="settings" />
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:ml-[15.5rem] lg:max-w-5xl lg:px-10 lg:pt-10 xl:px-14">
        <div className="flex items-center justify-between gap-3">
          <Pulse className="h-10 w-10 shrink-0 rounded-full lg:invisible" />
          <div className="min-w-0 flex-1 space-y-2 text-center lg:text-left">
            <p className="eyebrow mx-auto lg:mx-0">Peugeot Control</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight lg:text-3xl">
              Einstellungen
            </h1>
          </div>
          <Pulse className="h-8 w-20 shrink-0 rounded-full" />
        </div>

        <Pulse className="mx-auto mt-3 h-4 w-48 lg:mx-0" />
        <Pulse className="mt-4 h-14 w-full rounded-2xl" />

        <SettingsSectionsSkeleton />
      </div>
    </div>
  );
}

export function AccountPageSkeleton() {
  return (
    <div className="relative min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <ControlSideNav section="account" />
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:ml-[15.5rem] lg:max-w-5xl lg:px-10 lg:pt-10 xl:px-14">
        <div className="flex items-center justify-between gap-3">
          <Pulse className="h-10 w-10 shrink-0 rounded-full lg:invisible" />
          <div className="min-w-0 flex-1 space-y-2 text-center lg:text-left">
            <Pulse className="mx-auto h-3 w-28 lg:mx-0" />
            <Pulse className="mx-auto h-6 w-28 lg:mx-0 lg:h-8 lg:w-36" />
          </div>
          <Pulse className="h-8 w-20 shrink-0 rounded-full" />
        </div>

        <div className="mt-6 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
          <Pulse className="h-32 w-full rounded-2xl" />
          <Pulse className="h-40 w-full rounded-2xl" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
          <Pulse className="h-64 w-full rounded-2xl" />
          <div className="space-y-4">
            <Pulse className="h-48 w-full rounded-2xl" />
            <Pulse className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlHomeSkeleton() {
  const tabLabels = ["Home", "Klima", "Laden", "Steuern"] as const;
  return (
    <div className="relative min-h-dvh">
      <ControlSideNav section="control" tab="home" />
      <div className="mx-auto flex w-full max-w-lg flex-col overflow-x-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6 lg:ml-[15.5rem] lg:w-[calc(100%-15.5rem)] lg:max-w-none lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
        <div className="flex items-start justify-between gap-3 py-3 lg:items-end lg:pb-5">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="eyebrow lg:hidden">Peugeot Control</p>
            <Pulse className="h-7 w-40 lg:h-9 lg:w-48" />
            <Pulse className="h-4 w-28" />
          </div>
          <Pulse className="h-10 w-10 shrink-0 rounded-full lg:hidden" />
        </div>

        <div className="mt-2 w-full min-w-0 space-y-3 lg:mt-0 lg:max-w-4xl lg:space-y-5">
          <Pulse className="h-20 w-full rounded-2xl" />
          <div className="space-y-6 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(14,28,40,0.4)] p-4 sm:p-5 lg:space-y-7 lg:p-8">
            <Pulse className="mx-auto h-44 w-full max-w-sm rounded-2xl lg:h-56 lg:max-w-md" />
            <div className="mx-auto flex w-full max-w-sm items-end justify-between gap-4 lg:max-w-md">
              <div className="space-y-2">
                <Pulse className="h-10 w-20" />
                <Pulse className="h-3 w-36" />
              </div>
              <div className="space-y-2">
                <Pulse className="ml-auto h-7 w-16" />
                <Pulse className="ml-auto h-3 w-24" />
              </div>
            </div>
            <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
              <Pulse className="h-24 rounded-2xl" />
              <Pulse className="h-24 rounded-2xl" />
            </div>
            <div className="space-y-3 border-t border-[var(--line)] pt-5">
              <Pulse className="h-12 rounded-2xl" />
              <Pulse className="h-16 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(7,16,24,0.92)] pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
        aria-hidden
      >
        <div className="mx-auto flex max-w-lg justify-between gap-1 px-2 py-2 sm:max-w-xl sm:px-4">
          {tabLabels.map((label) => (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold text-[var(--fg-muted)]"
            >
              <Pulse className="h-5 w-5 rounded-md" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProCardSkeleton() {
  return (
    <section
      id="pro"
      className="ui-surface scroll-mt-24 p-4 sm:p-5"
      aria-busy="true"
      aria-label="Abo wird geladen"
    >
      <Pulse className="h-3 w-12" />
      <Pulse className="mt-2 h-6 w-40" />
      <Pulse className="mt-3 h-4 w-full max-w-md" />
      <Pulse className="mt-5 h-11 w-full rounded-full" />
    </section>
  );
}
