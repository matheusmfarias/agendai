import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import {
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  getTypebotCategories,
  getTypebotTenant,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "categories");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  return typebotOk({ categories: await getTypebotCategories(tenant.id) });
}
