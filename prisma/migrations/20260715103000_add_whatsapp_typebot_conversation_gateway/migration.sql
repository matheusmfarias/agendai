CREATE TYPE "WhatsAppInboundMessageStatus" AS ENUM (
  'PENDING',
  'QUEUED',
  'PROCESSING',
  'RETRYING',
  'PROCESSED',
  'IGNORED',
  'FAILED'
);

ALTER TABLE "tenants"
  ADD COLUMN "typebot_public_id" TEXT;

ALTER TABLE "typebot_sessions"
  ADD COLUMN "external_session_id" TEXT,
  ADD COLUMN "active_phone" TEXT,
  ADD COLUMN "handoff_until" TIMESTAMPTZ(3),
  ADD COLUMN "ended_at" TIMESTAMPTZ(3);

CREATE TABLE "whatsapp_inbound_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "message_id" TEXT NOT NULL,
  "sender_phone" TEXT NOT NULL,
  "message_text" TEXT NOT NULL,
  "status" "WhatsAppInboundMessageStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3),
  "typebot_session_id" TEXT,
  "response_text" TEXT,
  "fallback_sent_at" TIMESTAMPTZ(3),
  "last_error_code" TEXT,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_at" TIMESTAMPTZ(3),
  "processed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "whatsapp_inbound_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_typebot_public_id_key"
  ON "tenants"("typebot_public_id");
CREATE UNIQUE INDEX "typebot_sessions_external_session_id_key"
  ON "typebot_sessions"("external_session_id");
CREATE UNIQUE INDEX "typebot_sessions_tenant_id_active_phone_key"
  ON "typebot_sessions"("tenant_id", "active_phone");
CREATE UNIQUE INDEX "typebot_sessions_id_tenant_id_key"
  ON "typebot_sessions"("id", "tenant_id");
CREATE UNIQUE INDEX "whatsapp_inbound_messages_tenant_id_message_id_key"
  ON "whatsapp_inbound_messages"("tenant_id", "message_id");
CREATE INDEX "whatsapp_inbound_messages_status_next_attempt_at_idx"
  ON "whatsapp_inbound_messages"("status", "next_attempt_at");
CREATE INDEX "whatsapp_inbound_messages_tenant_id_sender_phone_received_at_idx"
  ON "whatsapp_inbound_messages"("tenant_id", "sender_phone", "received_at");
CREATE INDEX "whatsapp_inbound_messages_connection_id_tenant_id_idx"
  ON "whatsapp_inbound_messages"("connection_id", "tenant_id");

ALTER TABLE "whatsapp_inbound_messages"
  ADD CONSTRAINT "whatsapp_inbound_messages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_inbound_messages"
  ADD CONSTRAINT "whatsapp_inbound_messages_connection_tenant_fkey"
  FOREIGN KEY ("connection_id", "tenant_id")
  REFERENCES "whatsapp_connections"("id", "tenant_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
