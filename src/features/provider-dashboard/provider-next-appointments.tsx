"use client";

import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AppointmentOrigin,
  AppointmentStatus,
} from "@/generated/prisma/client";
import {
  ORIGIN_LABELS,
  STATUS_BADGE_VARIANT,
  STATUS_SHORT_LABELS,
} from "./provider-constants";

export type UpcomingAppointment = {
  id: string;
  startsAt: Date;
  status: string;
  origin: string;
  customer: { name: string };
  service: { name: string };
};

type ProviderNextAppointmentsProps = {
  appointments: UpcomingAppointment[];
};

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProviderNextAppointments({
  appointments,
}: ProviderNextAppointmentsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Os próximos horários confirmados ou solicitados.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/app/appointments">Ver todos</Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        {appointments.length ? (
          <ul className="divide-y divide-border">
            {appointments.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/app/appointments/${appt.id}`}
                  className="grid gap-2 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[82px_1fr_auto] sm:items-center sm:px-2"
                >
                  <span className="flex items-center gap-2  text-sm tabular-nums text-muted-foreground sm:block">
                    <span className="font-semibold text-foreground">
                      {formatDay(appt.startsAt)}
                    </span>
                    <span className="sm:mt-0.5 sm:block">
                      {formatTime(appt.startsAt)}
                    </span>
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {appt.customer.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {appt.service.name} ·{" "}
                      {ORIGIN_LABELS[appt.origin as AppointmentOrigin] ??
                        appt.origin}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge
                      variant={
                        STATUS_BADGE_VARIANT[
                          appt.status as AppointmentStatus
                        ] ?? "default"
                      }
                    >
                      {STATUS_SHORT_LABELS[appt.status as AppointmentStatus] ??
                        appt.status}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-muted-foreground">
                <CalendarDays className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Nenhum agendamento próximo
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Agendamentos feitos pelo link público, Typebot ou painel
                  aparecerão aqui.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/app/appointments?panel=new">
                    <Plus className="size-4" />
                    Criar manualmente
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
