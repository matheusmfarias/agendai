import { z } from "zod";

import { typebotError, typebotOk, TYPEFBOT_ERROR_CODES, assertNoMojibake } from "@/features/typebot/typebot-responses";
import { BusinessError, getTypebotTenant, identifyCustomer, validateTypebotTenant } from "@/features/typebot/typebot-service";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import { createAuditLog } from "@/features/audit/audit-log-service";

const bodySchema = z.object({
  phone: z.string().trim().min(8, "Informe o telefone."),
  name: z.string().trim().min(2, "Informe o nome.").max(200),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
});

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
    return typebotError(TYPEFBOT_ERROR_CODES.VALIDATION_ERROR, "Payload inválido.");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return typebotError(TYPEFBOT_ERROR_CODES.VALIDATION_ERROR, "Revise os campos informados.");
  }

  // Defensive: reject mojibake from wrong client encoding (e.g. PowerShell defaulting to Windows-1252)
  const badField = assertNoMojibake({
    name: parsed.data.name,
    email: parsed.data.email ?? null,
  });
  if (badField) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "O texto enviado contém caracteres inválidos. Envie os dados em UTF-8.",
    );
  }

  try {
    const { customer, session } = await identifyCustomer(
      tenant.id,
      parsed.data,
    );

    await createAuditLog({
      tenantId: tenant.id,
      actorType: "TYPEBOT",
      eventType: "TYPEBOT_CUSTOMER_IDENTIFIED",
      description: `Cliente identificado via Typebot: ${customer.name}.`,
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
      session: {
        id: session.id,
        status: String(session.status),
      },
    });
  } catch (error) {
    if (error instanceof BusinessError) {
      return typebotError(error.code, error.message);
    }
    throw error;
  }
}
