import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import { typebotServicesQuerySchema } from "@/features/typebot/typebot-service-schemas";
import {
  buildServicesText,
  getTypebotServices,
  getTypebotTenant,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "services");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = typebotServicesQuerySchema.safeParse({
    categoryId: searchParams.get("categoryId"),
  });
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Categoria inválida.",
    );
  }

  const services = await getTypebotServices(
    tenant.id,
    parsed.data.categoryId,
  );
  return typebotOk({ services, text: buildServicesText(services) });
}
