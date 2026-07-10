CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "financial_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "customer_id" UUID,
    "service_id" UUID,
    "amount_in_cents" INTEGER NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "payment_method" "FinancialPaymentMethod" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_payments_tenant_id_idx" ON "financial_payments"("tenant_id");
CREATE INDEX "financial_payments_entry_id_idx" ON "financial_payments"("entry_id");
CREATE INDEX "financial_payments_tenant_id_paid_at_idx" ON "financial_payments"("tenant_id", "paid_at");
CREATE INDEX "financial_payments_customer_id_idx" ON "financial_payments"("customer_id");
CREATE INDEX "financial_payments_service_id_idx" ON "financial_payments"("service_id");

ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "financial_payments" (
    "id",
    "tenant_id",
    "entry_id",
    "customer_id",
    "service_id",
    "amount_in_cents",
    "paid_at",
    "payment_method",
    "notes",
    "created_at"
)
SELECT
    gen_random_uuid(),
    "tenant_id",
    "id",
    "customer_id",
    "service_id",
    "amount_in_cents",
    COALESCE("paid_at", "entry_date"),
    COALESCE("payment_method", 'OTHER'::"FinancialPaymentMethod"),
    'Pagamento migrado automaticamente do lançamento já pago.',
    "created_at"
FROM "financial_entries"
WHERE "status" = 'PAID';
