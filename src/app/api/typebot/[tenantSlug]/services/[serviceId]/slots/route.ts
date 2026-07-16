import { typebotSlotsQuerySchema } from "@/features/typebot/typebot-availability-schemas";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  buildSlotsText,
  getTypebotSlots,
  getTypebotTenant,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; serviceId: string }> },
) {
  const { tenantSlug, serviceId } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "slots");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = typebotSlotsQuerySchema.safeParse({
    date: searchParams.get("date"),
    days: searchParams.get("days"),
    period: searchParams.get("period"),
  });
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Data ou período de consulta inválido.",
    );
  }

  const { service, slots } = await getTypebotSlots(tenant.id, serviceId, {
    date: parsed.data.date,
    days: parsed.data.days,
    period: parsed.data.period,
  });

  if (!service) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.SERVICE_NOT_FOUND,
      "Serviço não encontrado ou indisponível.",
    );
  }

  if (!slots.length) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.NO_SLOTS_AVAILABLE,
      "Nenhum horário disponível para este serviço nos próximos dias.",
    );
  }

  return typebotOk({
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
    },
    slots,
    text: buildSlotsText(slots),
  });
}
