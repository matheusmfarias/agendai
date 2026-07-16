CREATE TABLE "whatsapp_sent_message_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "external_message_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_sent_message_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_sent_message_receipts_tenant_id_external_message_id_key"
  ON "whatsapp_sent_message_receipts"("tenant_id", "external_message_id");

CREATE INDEX "whatsapp_sent_message_receipts_connection_id_tenant_id_created_at_idx"
  ON "whatsapp_sent_message_receipts"("connection_id", "tenant_id", "created_at");

ALTER TABLE "whatsapp_sent_message_receipts"
  ADD CONSTRAINT "whatsapp_sent_message_receipts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_sent_message_receipts"
  ADD CONSTRAINT "whatsapp_sent_message_receipts_connection_tenant_fkey"
  FOREIGN KEY ("connection_id", "tenant_id")
  REFERENCES "whatsapp_connections"("id", "tenant_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
