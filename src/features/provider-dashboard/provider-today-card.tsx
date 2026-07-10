"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";

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

type TodayAppointment = {
  id: string;
  startsAt: Date;
  status: string;
  origin: string;
  customer: { name: string };
  service: { name: string };
};

type ProviderTodayCardProps = {
  appointments: TodayAppointment[];
  todayCount: number;
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProviderTodayCard({
  appointments,
  todayCount,
}: ProviderTodayCardProps) {
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Agenda de hoje</CardTitle>
          <p className="text-xs capitalize text-muted-foreground">
            {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {todayCount > 0 ? (
            <Badge variant="secondary">{todayCount} hoje</Badge>
          ) : null}
          <Button asChild variant="outline" size="sm" className="hidden sm:flex">
            <Link href="/app/appointments">Abrir agenda</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {appointments.length ? (
          <ul className="divide-y divide-border">
            {appointments.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/app/appointments/${appt.id}`}
                  className="grid gap-2 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:px-2"
                >
                  <span className=" text-base font-semibold tabular-nums text-primary sm:text-sm">
                    {formatTime(appt.startsAt)}
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

                  <span className="flex items-center justify-between gap-2 sm:justify-end">
                    <Badge
                      variant={
                        STATUS_BADGE_VARIANT[
                          appt.status as AppointmentStatus
                        ] ?? "default"
                      }
                      className="shrink-0"
                    >
                      {STATUS_SHORT_LABELS[appt.status as AppointmentStatus] ??
                        appt.status}
                    </Badge>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-muted-foreground">
                <Clock className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Nenhum agendamento hoje
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Quando houver horários marcados para hoje, eles aparecem aqui
                  em ordem de atendimento.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
