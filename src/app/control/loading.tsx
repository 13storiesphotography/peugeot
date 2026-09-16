export default function ControlLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
            <div className="h-7 w-40 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mt-8 h-44 animate-pulse rounded-3xl bg-white/5" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}
