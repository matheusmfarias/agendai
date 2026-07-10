function LoadingBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} />;
}

function LoadingLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted/80 ${className}`} />;
}

function LoadingMetricCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <LoadingBlock className="size-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <LoadingLine className="h-6 w-12" />
          <LoadingLine className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

function LoadingPageHeader({
  actionCount = 2,
}: {
  actionCount?: 0 | 1 | 2;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="space-y-2">
        <LoadingLine className="h-8 w-56 rounded-xl" />
        <LoadingLine className="h-4 w-[min(22rem,70vw)]" />
      </div>
      {actionCount ? (
        <div className="flex gap-2">
          {Array.from({ length: actionCount }).map((_, index) => (
            <LoadingBlock key={index} className="h-10 w-32 rounded-xl" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingToolbar() {
  return (
    <div className="grid gap-3 border-b border-border bg-card p-3 md:grid-cols-[1fr_12rem]">
      <LoadingBlock className="h-10 rounded-2xl" />
      <LoadingBlock className="h-10 rounded-2xl" />
    </div>
  );
}

function LoadingListRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/70">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="space-y-2">
            <LoadingLine className="h-4 w-44" />
            <LoadingLine className="h-3 w-[min(32rem,75vw)]" />
          </div>
          <LoadingBlock className="h-9 w-28 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ProviderListPageSkeleton({
  metricCount = 3,
  rowCount = 5,
  actionCount = 2,
}: {
  metricCount?: 0 | 2 | 3 | 4;
  rowCount?: number;
  actionCount?: 0 | 1 | 2;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <LoadingPageHeader actionCount={actionCount} />
      {metricCount ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: metricCount }).map((_, index) => (
            <LoadingMetricCard key={index} />
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <LoadingToolbar />
        <LoadingListRows rows={rowCount} />
      </div>
    </div>
  );
}

export function ProviderDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <LoadingLine className="h-4 w-24" />
          <LoadingLine className="h-8 w-48 rounded-xl" />
        </div>
        <LoadingBlock className="hidden h-9 w-44 rounded-full sm:block" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingMetricCard key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <LoadingLine className="h-5 w-40" />
              <LoadingLine className="mt-2 h-3 w-56" />
            </div>
            <LoadingListRows rows={5} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <LoadingLine className="h-5 w-48" />
              <LoadingLine className="mt-2 h-3 w-64" />
            </div>
            <LoadingListRows rows={3} />
          </div>
        </div>
        <div className="hidden space-y-4 xl:block">
          <LoadingBlock className="h-64" />
          <LoadingBlock className="h-44" />
        </div>
      </div>
    </div>
  );
}

export function ProviderAgendaSkeleton() {
  return (
    <div
      className="grid min-h-[calc(100dvh-5rem)] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]"
      aria-busy="true"
      aria-live="polite"
    >
      <aside className="hidden space-y-4 lg:block">
        <LoadingBlock className="h-64" />
        <LoadingBlock className="h-72" />
      </aside>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border bg-card px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="space-y-2">
            <LoadingLine className="h-6 w-40" />
            <LoadingLine className="h-3 w-56" />
          </div>
          <LoadingBlock className="h-11 w-64 rounded-2xl" />
          <div className="flex gap-2 lg:justify-end">
            <LoadingBlock className="h-10 w-36 rounded-xl" />
            <LoadingBlock className="h-10 w-24 rounded-xl" />
          </div>
        </div>
        <div className="space-y-0 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[4rem_1fr] gap-4 border-b border-border/60 py-4 last:border-b-0"
            >
              <LoadingLine className="mt-1 h-4 w-12" />
              <LoadingBlock className="h-12 rounded-xl" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
