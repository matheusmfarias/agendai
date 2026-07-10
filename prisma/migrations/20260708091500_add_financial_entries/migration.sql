-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('REVENUE', 'EXPENSE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinancialPaymentMethod" AS ENUM ('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID,
    "customer_id" UUID,
    "service_id" UUID,
    "type" "FinancialEntryType" NOT NULL,
    "status" "FinancialEntryStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "entry_date" TIMESTAMPTZ(3) NOT NULL,
    "due_date" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "payment_method" "FinancialPaymentMethod",
    "category" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_idx" ON "financial_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_entry_date_idx" ON "financial_entries"("tenant_id", "entry_date");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_status_idx" ON "financial_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_type_idx" ON "financial_entries"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "financial_entries_appointment_id_idx" ON "financial_entries"("appointment_id");

-- CreateIndex
CREATE INDEX "financial_entries_customer_id_idx" ON "financial_entries"("customer_id");

-- CreateIndex
CREATE INDEX "financial_entries_service_id_idx" ON "financial_entries"("service_id");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
