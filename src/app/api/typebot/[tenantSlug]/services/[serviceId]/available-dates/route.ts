import { typebotAvailableDatesQuerySchema } from "@/features/typebot/typebot-availability-schemas";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  getTypebotAvailableDates,
  getTypebotTenant,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; serviceId: string }> },
) {
  const { tenantSlug, serviceId } = await params;
  const guard = await guardTypebotEndpoint(
    request,
    tenantSlug,
    "available-dates",
  );
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const url = new URL(request.url);
  const parsed = typebotAvailableDatesQuerySchema.safeParse({
    startDate: url.searchParams.get("startDate"),
    days: url.searchParams.get("days"),
  });
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Período de consulta inválido.",
    );
  }

  const result = await getTypebotAvailableDates(tenant.id, serviceId, {
    startDate: parsed.data.startDate,
    days: parsed.data.days,
  });
  if (!result.service) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.SERVICE_NOT_FOUND,
      "Serviço não encontrado ou indisponível.",
    );
  }

  return typebotOk({
    dates: result.dates,
    nextStartDate: result.nextStartDate,
  });
}
