import { createAuditLog } from "@/features/audit/audit-log-service";
import { typebotCustomerIdentificationSchema } from "@/features/typebot/typebot-customer-schemas";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import {
  assertNoMojibake,
  typebotError,
  typebotOk,
  TYPEFBOT_ERROR_CODES,
} from "@/features/typebot/typebot-responses";
import {
  BusinessError,
  confirmTypebotCustomer,
  createTypebotCustomer,
  getTypebotTenant,
  lookupTypebotCustomer,
  validateTypebotTenant,
} from "@/features/typebot/typebot-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "identify");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Payload inválido.",
    );
  }

  const parsed = typebotCustomerIdentificationSchema.safeParse(body);
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Revise os campos informados.",
    );
  }
  const badField = assertNoMojibake({
    name: "name" in parsed.data ? parsed.data.name : null,
    email: "email" in parsed.data ? parsed.data.email : null,
  });
  if (badField) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "O texto enviado contém caracteres inválidos. Envie os dados em UTF-8.",
    );
  }

  try {
    if (parsed.data.action === "LOOKUP") {
      const result = await lookupTypebotCustomer(tenant.id, parsed.data.phone);
      const response = {
        lookup: {
          status: result.status,
          customerName: result.customer?.name ?? null,
          requiresConfirmation: result.status === "FOUND",
          requiresName: result.status !== "FOUND",
        },
        session: {
          id: result.session.id,
          status: String(result.session.status),
        },
      };
      return typebotOk(response);
    }

    const { customer, session } = parsed.data.action === "CONFIRM"
      ? await confirmTypebotCustomer(tenant.id, parsed.data.sessionId)
      : await createTypebotCustomer(tenant.id, {
          sessionId: parsed.data.sessionId,
          name: parsed.data.name,
          email: parsed.data.email || undefined,
          rejectedExisting: parsed.data.rejectedExisting,
        });

    await createAuditLog({
      tenantId: tenant.id,
      actorType: "TYPEBOT",
      eventType: "TYPEBOT_CUSTOMER_IDENTIFIED",
      description: `Cliente identificado via Typebot (${parsed.data.action.toLowerCase()}).`,
      metadata: {
        tenantId: tenant.id,
        customerId: customer.id,
        sessionId: session.id,
      },
    });

    return typebotOk({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      session: { id: session.id, status: String(session.status) },
    });
  } catch (error) {
    if (error instanceof BusinessError) {
      return typebotError(error.code, error.message);
    }
    throw error;
  }
}
