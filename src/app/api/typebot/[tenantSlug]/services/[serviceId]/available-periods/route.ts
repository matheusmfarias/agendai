import { typebotAvailablePeriodsQuerySchema } from "@/features/typebot/typebot-availability-schemas";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  getTypebotAvailablePeriods,
  getTypebotTenant,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; serviceId: string }> },
) {
  const { tenantSlug, serviceId } = await params;
  const guard = await guardTypebotEndpoint(
    request,
    tenantSlug,
    "available-periods",
  );
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = typebotAvailablePeriodsQuerySchema.safeParse({
    date: searchParams.get("date"),
  });
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Data inválida.",
    );
  }

  const result = await getTypebotAvailablePeriods(
    tenant.id,
    serviceId,
    parsed.data.date,
  );
  if (!result.service) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.SERVICE_NOT_FOUND,
      "Serviço não encontrado ou indisponível.",
    );
  }

  return typebotOk({ periods: result.periods });
}
