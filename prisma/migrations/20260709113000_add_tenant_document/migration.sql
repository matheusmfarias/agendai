CREATE TYPE "TenantDocumentType" AS ENUM ('CPF', 'CNPJ');

ALTER TABLE "tenants"
  ADD COLUMN "document_type" "TenantDocumentType",
  ADD COLUMN "document_number" TEXT;

CREATE INDEX "tenants_document_number_idx" ON "tenants"("document_number");
