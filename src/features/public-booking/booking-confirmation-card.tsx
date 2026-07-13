import Link from "next/link";

import { ConfirmationStamp } from "@/components/brand/confirmation-stamp";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/features/appointments/appointment-status";
import type { AppointmentStatus } from "@/generated/prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";

/**
 * Booking confirmation card for the memorable ending of the booking flow.
 *
 * Uses ConfirmationStamp as the signature visual element.
 * The stamp tone maps to the booking outcome:
 *   - CONFIRMED / IN_PROGRESS / FINISHED → "confirmed"
 *   - REQUESTED / WAITING_INFO → "received"
 *   - CANCELED_* / NO_SHOW → not shown (edge case outside scope)
 */

const BOOKING_OUTCOME_HEADINGS = {
  DIRECT: "Agendamento confirmado",
  REQUIRES_CONFIRMATION: "Solicitação enviada",
  INFORMATIONAL: "Solicitação enviada",
} as const;

type BookingMode = keyof typeof BOOKING_OUTCOME_HEADINGS;

interface ConfirmationCustomValue {
  id: string;
  customField: { label: string };
  value: string;
}

interface BookingConfirmationCardProps {
  appointment: {
    status: AppointmentStatus;
    startsAt: Date | string;
    customerNotes: string | null;
    tenant: { name: string; publicDisplayName?: string | null; slug: string };
    service: { name: string; bookingMode: BookingMode };
    customerUser: { name: string } | null;
    customValues: ConfirmationCustomValue[];
  };
}

function stampTone(status: AppointmentStatus) {
  switch (status) {
    case "CONFIRMED":
    case "IN_PROGRESS":
    case "FINISHED":
      return "confirmed" as const;
    case "REQUESTED":
    case "WAITING_INFO":
      return "received" as const;
    default:
      return "confirmed" as const;
  }
}

export function BookingConfirmationCard({
  appointment,
}: BookingConfirmationCardProps) {
  const tone = stampTone(appointment.status);
  const heading =
    BOOKING_OUTCOME_HEADINGS[appointment.service.bookingMode] ??
    "Agendamento recebido";
  const tenantName =
    appointment.tenant.publicDisplayName || appointment.tenant.name;

  return (
    <Card className="w-full max-w-2xl mx-auto text-center">
      <CardHeader className="place-items-center pb-4">
        <div className="mb-4">
          <ConfirmationStamp tone={tone} />
        </div>
        <CardTitle className="text-2xl font-semibold">{heading}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {tenantName}
        </p>
      </CardHeader>

      <CardContent className="space-y-6 text-left">
        {/* Appointment summary */}
        <div className="rounded-lg border bg-muted/30 px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Resumo do agendamento
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Serviço</dt>
              <dd className="font-medium text-foreground">
                {appointment.service.name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data e hora</dt>
              <dd className="font-medium text-foreground">
                {formatDateTime(appointment.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd><AppointmentStatusBadge status={appointment.status} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium text-foreground">
                {appointment.customerUser?.name ?? "Cliente"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Customer notes */}
        {appointment.customerNotes ? (
          <div className="rounded-lg border px-5 py-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              Observações enviadas
            </h3>
            <p className="text-sm text-muted-foreground">
              {appointment.customerNotes}
            </p>
          </div>
        ) : null}

        {/* Custom field values */}
        {appointment.customValues.length ? (
          <div className="rounded-lg border px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Informações enviadas
            </h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {appointment.customValues.map((item) => (
                <div key={item.id}>
                  <dt className="text-muted-foreground">
                    {item.customField.label}
                  </dt>
                  <dd className="font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {/* Back to provider */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/cliente/agendamentos">
              Ver meus agendamentos
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/${appointment.tenant.slug}`}>
              Voltar ao prestador
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
