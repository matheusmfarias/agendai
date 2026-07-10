CREATE TABLE "financial_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "accepted_methods" JSONB NOT NULL DEFAULT '["PIX","CASH","CREDIT_CARD","DEBIT_CARD","BANK_TRANSFER"]',
    "revenue_categories" JSONB NOT NULL DEFAULT '["Atendimento","Produtos","Ajuste manual"]',
    "expense_categories" JSONB NOT NULL DEFAULT '["Insumos","Comissões","Aluguel","Marketing","Outros"]',
    "manual_control" BOOLEAN NOT NULL DEFAULT true,
    "pay_at_location" BOOLEAN NOT NULL DEFAULT true,
    "require_checkout" BOOLEAN NOT NULL DEFAULT false,
    "allow_partial_payments" BOOLEAN NOT NULL DEFAULT false,
    "default_due_days" INTEGER NOT NULL DEFAULT 2,
    "reminder_template" TEXT NOT NULL DEFAULT 'Olá, {cliente}! Lembrete do pagamento pendente de {valor} referente a {serviço}.',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "financial_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_settings_tenant_id_key" ON "financial_settings"("tenant_id");

ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
