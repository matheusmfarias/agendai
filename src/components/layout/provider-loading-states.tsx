function LoadingBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-md bg-muted/70 ${className}`}
    />
  );
}

function LoadingLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-full bg-muted/80 ${className}`}
    />
  );
}

function LoadingModuleHeader({ actionCount = 1 }: { actionCount?: 0 | 1 | 2 }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <LoadingBlock className="size-10 shrink-0" />
          <div className="space-y-2 pt-0.5">
            <LoadingLine className="h-6 w-44" />
            <LoadingLine className="h-4 w-[min(32rem,70vw)]" />
          </div>
        </div>
        {actionCount ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: actionCount }).map((_, index) => (
              <LoadingBlock key={index} className="h-10 w-32" />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LoadingTabs({ count = 3 }: { count?: number }) {
  return (
    <div className="overflow-hidden">
      <div className="inline-flex gap-1 rounded-md border border-border bg-card p-1 shadow-card">
        {Array.from({ length: count }).map((_, index) => (
          <LoadingBlock key={index} className="h-9 w-24" />
        ))}
      </div>
    </div>
  );
}

function LoadingToolbar({ controls = 2 }: { controls?: 1 | 2 | 3 }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-3 shadow-card md:grid-cols-[minmax(0,1fr)_12rem]">
      <LoadingBlock className="h-10" />
      {controls > 1 ? <LoadingBlock className="h-10" /> : null}
      {controls > 2 ? <LoadingBlock className="h-10 md:col-span-2" /> : null}
    </section>
  );
}

function LoadingMetricCard() {
  return (
    <div className="flex min-h-28 items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="space-y-2">
        <LoadingLine className="h-4 w-28" />
        <LoadingLine className="h-7 w-20" />
        <LoadingLine className="h-3 w-36" />
      </div>
      <LoadingBlock className="size-9 shrink-0" />
    </div>
  );
}

function LoadingMetrics({ count = 3 }: { count?: 2 | 3 | 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <LoadingMetricCard key={index} />
      ))}
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
          <LoadingBlock className="h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

function LoadingSection({ rows = 4 }: { rows?: number }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <LoadingLine className="h-5 w-40" />
        <LoadingLine className="mt-2 h-3 w-56" />
      </div>
      <LoadingListRows rows={rows} />
    </section>
  );
}

export function ProviderListPageSkeleton({
  metricCount = 3,
  rowCount = 5,
  actionCount = 1,
}: {
  metricCount?: 0 | 2 | 3 | 4;
  rowCount?: number;
  actionCount?: 0 | 1 | 2;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4" aria-busy="true" aria-live="polite">
      <LoadingModuleHeader actionCount={actionCount} />
      {metricCount ? <LoadingMetrics count={metricCount} /> : null}
      <LoadingToolbar />
      <LoadingSection rows={rowCount} />
    </div>
  );
}

export function ProviderDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4" aria-busy="true" aria-live="polite">
      <LoadingModuleHeader actionCount={0} />
      <LoadingMetrics count={4} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <LoadingSection rows={5} />
          <LoadingSection rows={3} />
        </div>
        <div className="hidden space-y-4 xl:block">
          <LoadingSection rows={3} />
          <LoadingSection rows={2} />
        </div>
      </div>
    </div>
  );
}

export function ProviderFinancialSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4" aria-busy="true" aria-live="polite">
      <LoadingModuleHeader actionCount={2} />
      <LoadingTabs count={4} />
      <LoadingToolbar controls={3} />
      <LoadingMetrics count={4} />
      <div className="grid items-start gap-3 xl:grid-cols-4">
        <div className="space-y-4 xl:col-span-3">
          <section className="rounded-lg border border-border bg-card p-5 shadow-card">
            <LoadingLine className="h-5 w-40" />
            <LoadingLine className="mt-2 h-4 w-64" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <LoadingBlock key={index} className="h-20" />
              ))}
            </div>
            <LoadingBlock className="mt-4 h-48 w-full" />
          </section>
          <LoadingSection rows={4} />
        </div>
        <aside className="hidden space-y-3 xl:col-span-1 xl:block">
          <LoadingSection rows={2} />
          <LoadingSection rows={3} />
        </aside>
      </div>
    </div>
  );
}

export function ProviderAvailabilitySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4" aria-busy="true" aria-live="polite">
      <LoadingModuleHeader actionCount={1} />
      <LoadingTabs count={2} />
      <LoadingMetrics count={3} />
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <LoadingToolbar />
        <LoadingListRows rows={6} />
      </section>
    </div>
  );
}

export function ProviderAgendaSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4" aria-busy="true" aria-live="polite">
      <LoadingModuleHeader actionCount={0} />
      <div className="grid min-h-[calc(100dvh-14rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:block">
          <LoadingBlock className="h-72 w-full" />
          <LoadingBlock className="h-60 w-full" />
        </aside>
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="grid gap-3 border-b border-border bg-card px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="space-y-2">
              <LoadingLine className="h-6 w-40" />
              <LoadingLine className="h-3 w-56" />
            </div>
            <LoadingBlock className="h-11 w-64" />
            <div className="flex gap-2 lg:justify-end">
              <LoadingBlock className="h-10 w-36" />
              <LoadingBlock className="h-10 w-24" />
            </div>
          </div>
          <div className="space-y-0 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[4rem_1fr] gap-4 border-b border-border/60 py-4 last:border-b-0"
              >
                <LoadingLine className="mt-1 h-4 w-12" />
                <LoadingBlock className="h-12" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
