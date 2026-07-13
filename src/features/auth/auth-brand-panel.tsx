import { AgendaiLogo } from "@/components/brand/agendai-logo";

export function AuthBrandPanel() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        <AgendaiLogo size="lg" variant="light" />
        <p className="max-w-sm text-lg leading-relaxed text-white/80">
          Sua agenda deixa de depender de conversas soltas.
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-white/60">
          Catálogo, horários e confirmações em um só lugar para prestadores que
          atendem pelo link público e WhatsApp.
        </p>
      </div>

      <div className="rounded-lg border border-white/15 bg-white/10 px-5 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">
          Hoje
        </p>
        <ul className="space-y-2.5">
          <li className="flex items-baseline gap-3">
            <span className="text-sm tabular-nums text-white/70">
              09:00
            </span>
            <span className="text-sm text-white/90">
              Corte masculino
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-sm tabular-nums text-white/70">
              10:30
            </span>
            <span className="text-sm text-white/90">
              Revisão preventiva
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-sm tabular-nums text-white/70">
              14:00
            </span>
            <span className="text-sm text-white/90">
              Limpeza de pele
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function AuthMobileBrand() {
  return (
    <div className="space-y-1">
      <AgendaiLogo size="md" />
      <p className="text-sm text-muted-foreground">
        Organize serviços, horários e confirmações.
      </p>
    </div>
  );
}
