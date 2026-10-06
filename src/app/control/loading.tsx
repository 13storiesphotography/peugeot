export default function ControlLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex w-full max-w-lg flex-col overflow-x-hidden px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6 lg:ml-[15.5rem] lg:w-[calc(100%-15.5rem)] lg:max-w-none lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
        <div className="flex items-start justify-between gap-3 py-3 lg:items-end lg:pb-5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-white/5 lg:hidden" />
            <div className="h-7 w-40 animate-pulse rounded bg-white/5 lg:h-9 lg:w-48" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/5 lg:hidden" />
        </div>

        <div className="mt-2 w-full min-w-0 space-y-3 lg:mt-0 lg:max-w-4xl lg:space-y-5">
          <div className="space-y-6 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(14,28,40,0.4)] p-4 sm:p-5 lg:space-y-7 lg:p-8">
            <div className="mx-auto h-44 w-full max-w-sm animate-pulse rounded-2xl bg-white/5 lg:h-56 lg:max-w-md" />
            <div className="mx-auto flex w-full max-w-sm items-end justify-between gap-4 lg:max-w-md">
              <div className="space-y-2">
                <div className="h-10 w-20 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-36 animate-pulse rounded bg-white/5" />
              </div>
              <div className="space-y-2 text-right">
                <div className="ml-auto h-7 w-16 animate-pulse rounded bg-white/5" />
                <div className="ml-auto h-3 w-24 animate-pulse rounded bg-white/5" />
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            </div>

            <div className="space-y-3 border-t border-[var(--line)] pt-5">
              <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
