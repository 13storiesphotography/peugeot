export default function SettingsLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:ml-[15.5rem] lg:max-w-5xl lg:px-10 lg:pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5 lg:hidden" />
          <div className="mx-auto space-y-2 lg:mx-0">
            <div className="mx-auto h-3 w-24 animate-pulse rounded bg-white/5 lg:mx-0" />
            <div className="mx-auto h-6 w-36 animate-pulse rounded bg-white/5 lg:mx-0 lg:h-8 lg:w-48" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}
