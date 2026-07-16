function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function LoadingStatus({ label }: { label: string }) {
  return (
    <p className="sr-only" role="status">
      {label}
    </p>
  );
}

export function PublicHeroSkeleton() {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <LoadingStatus label="Carregando estabelecimento" />
      <div className="flex items-start gap-3">
        <Pulse className="size-16 shrink-0 rounded-2xl sm:size-18" />
        <div className="min-w-0 flex-1 space-y-3 py-1">
          <Pulse className="h-7 w-2/3" />
          <Pulse className="h-4 w-4/5" />
          <Pulse className="h-4 w-full" />
        </div>
      </div>
    </section>
  );
}

export function PublicSlotsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <LoadingStatus label="Carregando horários disponíveis" />
      <section className="space-y-3">
        <Pulse className="h-5 w-40" />
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <Pulse key={item} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <Pulse className="mx-auto h-11 w-56" />
      </section>
      <section className="space-y-3">
        <Pulse className="h-5 w-44" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Pulse key={item} className="h-11 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function PublicHomeSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 bg-background px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
      <PublicHeroSkeleton />
      <section className="space-y-4" aria-busy="true">
        <LoadingStatus label="Carregando serviços" />
        <div className="space-y-2">
          <Pulse className="h-6 w-32" />
          <Pulse className="h-11 w-full" />
        </div>
        {[0, 1].map((category) => (
          <div key={category} className="space-y-2">
            <Pulse className="h-5 w-36" />
            <div className="overflow-hidden rounded-xl border bg-card p-4">
              <Pulse className="h-5 w-3/5" />
              <Pulse className="mt-3 h-4 w-full" />
              <Pulse className="mt-2 h-4 w-2/5" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export function PublicBookSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl bg-background px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-5" aria-busy="true">
        <LoadingStatus label="Carregando agendamento" />
        <Pulse className="h-5 w-36" />
        <article className="space-y-3 rounded-2xl border bg-card p-4">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-6 w-2/3" />
          <Pulse className="h-4 w-1/2" />
        </article>
        <PublicSlotsSkeleton />
      </div>
    </main>
  );
}

export function PublicReviewSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl bg-background px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-7" aria-busy="true">
        <LoadingStatus label="Carregando revisão do agendamento" />
        <Pulse className="h-5 w-48" />
        <div className="space-y-3 text-center">
          <Pulse className="mx-auto h-7 w-3/4" />
          <Pulse className="mx-auto h-7 w-1/2" />
          <Pulse className="mx-auto h-4 w-1/3" />
        </div>
        <div className="space-y-4 rounded-lg bg-muted p-4">
          <Pulse className="h-5 w-1/2" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-5 w-1/3" />
        </div>
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <Pulse className="h-5 w-48" />
          <Pulse className="h-11 w-full" />
          <Pulse className="h-24 w-full" />
        </div>
      </div>
    </main>
  );
}
