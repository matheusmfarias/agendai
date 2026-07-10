import { typebotError, typebotOk, TYPEFBOT_ERROR_CODES } from "@/features/typebot/typebot-responses";
import { getBusinessData, getTypebotTenant, validateTypebotTenant } from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const guard = await guardTypebotEndpoint(_request, tenantSlug, "business");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  return typebotOk({
    tenant: getBusinessData(tenant),
  });
}
