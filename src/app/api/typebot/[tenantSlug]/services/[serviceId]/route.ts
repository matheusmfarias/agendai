import { typebotError, typebotOk, TYPEFBOT_ERROR_CODES } from "@/features/typebot/typebot-responses";
import { buildCustomFieldsText, getTypebotServiceDetail, getTypebotTenant, validateTypebotTenant } from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; serviceId: string }> },
) {
  const { tenantSlug, serviceId } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "service-detail");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const serviceDetail = await getTypebotServiceDetail(tenant.id, serviceId);

  if (!serviceDetail) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.SERVICE_NOT_FOUND,
      "Esse serviço não está disponível no momento.",
    );
  }

  return typebotOk({
    service: serviceDetail,
    customFieldsText: buildCustomFieldsText(serviceDetail.customFields),
  });
}
