import { typebotError, typebotOk, TYPEFBOT_ERROR_CODES } from "@/features/typebot/typebot-responses";
import { getTypebotAppointment, getTypebotTenant, validateTypebotTenant } from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; appointmentId: string }> },
) {
  const { tenantSlug, appointmentId } = await params;
  const guard = await guardTypebotEndpoint(_request, tenantSlug, "appointment-detail");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const appointment = await getTypebotAppointment(tenant.id, appointmentId);

  if (!appointment) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.APPOINTMENT_NOT_FOUND,
      "Agendamento não encontrado.",
    );
  }

  return typebotOk({
    appointment: {
      id: appointment.id,
      status: appointment.status,
      origin: appointment.origin,
      serviceName: appointment.serviceName,
      customerName: appointment.customerName,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      priceText: appointment.priceText,
    },
  });
}
