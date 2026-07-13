import { Alert } from "@/components/ui/alert";

// ---------------------------------------------------------------------------
// Contexto do recurso — permite diferenciar o mesmo código (ex.: "created")
// quando usado por páginas diferentes (serviços, clientes, agendamentos etc.).
// ---------------------------------------------------------------------------

export type SuccessAlertContext =
  | "tenant"
  | "plan"
  | "service"
  | "category"
  | "availability"
  | "block"
  | "customer"
  | "appointment"
  | "subscription"
  | "settings"
  | "field"
  | "user";

// ---------------------------------------------------------------------------
// Mensagens específicas por código.
// ---------------------------------------------------------------------------

const SPECIFIC_MESSAGES: Record<string, string> = {
  payment: "Pagamento registrado com sucesso.",
  expiration: "Vencimento alterado com sucesso.",
  "owner-created": "Acesso do responsável criado com sucesso.",
  "password-reset": "Senha do responsável redefinida com sucesso.",
  "field-created": "Campo personalizado criado com sucesso.",
  "field-updated": "Campo personalizado atualizado com sucesso.",
  "field-status": "Status do campo personalizado atualizado.",
  "service-created": "Serviço cadastrado com sucesso.",
  "service-updated": "Serviço atualizado com sucesso.",
  "service-status": "Status do serviço atualizado.",
  "category-created": "Categoria criada. Agora cadastre o primeiro serviço.",
  "category-updated": "Categoria atualizada com sucesso.",
  "category-status": "Status da categoria atualizado.",
  "block-created": "Bloqueio de agenda criado com sucesso.",
  "block-updated": "Bloqueio de agenda atualizado com sucesso.",
  "block-deleted": "Bloqueio de agenda removido com sucesso.",
};

// ---------------------------------------------------------------------------
// Mensagens compostas: código + contexto.
// ---------------------------------------------------------------------------

const CONTEXT_MESSAGES: Record<string, string> = {
  // ── Criado ──────────────────────────────────────────────────────────
  "created_tenant": "Prestador cadastrado com sucesso.",
  "created_plan": "Plano cadastrado com sucesso.",
  "created_service": "Serviço cadastrado com sucesso.",
  "created_category": "Categoria cadastrada com sucesso.",
  "created_availability": "Horário de atendimento cadastrado com sucesso.",
  "created_customer": "Cliente cadastrado com sucesso.",
  "created_appointment": "Agendamento criado com sucesso.",

  // ── Atualizado ───────────────────────────────────────────────────────
  "updated_tenant": "Prestador atualizado com sucesso.",
  "updated_plan": "Plano atualizado com sucesso.",
  "updated_service": "Serviço atualizado com sucesso.",
  "updated_category": "Categoria atualizada com sucesso.",
  "updated_availability": "Horário de atendimento atualizado com sucesso.",
  "updated_subscription": "Assinatura atualizada com sucesso.",
  "updated_settings": "Perfil atualizado com sucesso.",
  "updated_customer": "Cliente atualizado com sucesso.",
  "updated_appointment": "Agendamento atualizado com sucesso.",

  // ── Status alterado ─────────────────────────────────────────────────
  "status_tenant": "Status do prestador atualizado.",
  "status_service": "Status do serviço atualizado.",
  "status_category": "Status da categoria atualizado.",
  "status_availability": "Status do horário atualizado.",
  "status_subscription": "Status da assinatura atualizado.",
  "status_customer": "Status do cliente atualizado.",
  "status_appointment": "Status do agendamento atualizado.",
};

// ---------------------------------------------------------------------------
// Fallbacks para códigos genéricos quando não há contexto.
// ---------------------------------------------------------------------------

const GENERIC_FALLBACKS: Record<string, string> = {
  created: "Registro criado com sucesso.",
  updated: "Alterações salvas com sucesso.",
  status: "Status atualizado com sucesso.",
};

// ---------------------------------------------------------------------------

type SuccessAlertProps = {
  /** Código de sucesso vindo da query string (?success=...). */
  code?: string;
  /**
   * Contexto do recurso — permite diferenciar mensagens para o mesmo código.
   * Ex.: "created" + "service" → "Serviço cadastrado com sucesso."
   */
  context?: SuccessAlertContext;
};

export function SuccessAlert({ code, context }: SuccessAlertProps) {
  if (!code) return null;

  const contextualKey = context ? `${code}_${context}` : undefined;
  const message =
    (contextualKey ? CONTEXT_MESSAGES[contextualKey] : undefined) ??
    SPECIFIC_MESSAGES[code] ??
    GENERIC_FALLBACKS[code];

  if (!message) return null;

  return (
    <Alert variant="success" className="mb-6">
      {message}
    </Alert>
  );
}
