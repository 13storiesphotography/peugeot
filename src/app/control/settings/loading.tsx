export default function SettingsLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5" />
          <div className="h-6 w-32 animate-pulse rounded bg-white/5" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-36 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}
