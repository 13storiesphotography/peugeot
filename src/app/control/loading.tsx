export default function ControlLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:ml-[15.5rem] lg:max-w-none lg:px-10 lg:pb-12">
        <div className="hidden lg:mb-8 lg:block lg:h-full lg:w-[15.5rem]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-white/5 lg:hidden" />
            <div className="h-7 w-40 animate-pulse rounded bg-white/5 lg:h-10 lg:w-56" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5 lg:hidden" />
        </div>
        <div className="mt-8 lg:mt-6 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <div className="h-52 animate-pulse rounded-[1.75rem] bg-white/5 lg:h-[28rem]" />
          <div className="mt-6 space-y-3 lg:mt-0">
            <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </main>
  );
}
