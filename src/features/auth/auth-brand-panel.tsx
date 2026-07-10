/**
 * Desktop brand panel — full left-side panel on lg+ screens.
 * Shows the AgendaZap identity: brand name, value proposition,
 * and a subtle mini agenda card with fictional entries.
 */
export function AuthBrandPanel() {
  return (
    <div className="flex flex-col gap-8">
      {/* Brand identity */}
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-sidebar-foreground">
          AgendaZap
        </h1>
        <p className="max-w-sm text-lg leading-relaxed text-sidebar-foreground/80">
          Sua agenda deixa de depender de conversas soltas.
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-sidebar-foreground/60">
          Catálogo, horários e confirmações em um só lugar para prestadores que
          atendem pelo link público e WhatsApp.
        </p>
      </div>

      {/* Mini agenda card — fictional, showing the product's value */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-5 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
          Hoje
        </p>
        <ul className="space-y-2.5">
          <li className="flex items-baseline gap-3">
            <span className=" text-sm tabular-nums text-sidebar-foreground/70">
              09:00
            </span>
            <span className="text-sm text-sidebar-foreground/90">
              Corte masculino
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className=" text-sm tabular-nums text-sidebar-foreground/70">
              10:30
            </span>
            <span className="text-sm text-sidebar-foreground/90">
              Revisão preventiva
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className=" text-sm tabular-nums text-sidebar-foreground/70">
              14:00
            </span>
            <span className="text-sm text-sidebar-foreground/90">
              Limpeza de pele
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Mobile brand header — compact version shown above the auth card on small screens.
 */
export function AuthMobileBrand() {
  return (
    <div className="space-y-1">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        AgendaZap
      </h1>
      <p className="text-sm text-muted-foreground">
        Organize serviços, horários e confirmações.
      </p>
    </div>
  );
}
