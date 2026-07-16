import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  getTypebotCustomFields,
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
    "custom-fields",
  );
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const fields = await getTypebotCustomFields(tenant.id, serviceId);
  if (!fields) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.SERVICE_NOT_FOUND,
      "Esse serviço não está disponível no momento.",
    );
  }

  return typebotOk({ fields });
}
