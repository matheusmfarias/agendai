CREATE TYPE "WhatsAppProviderType" AS ENUM ('EVOLUTION', 'META_CLOUD');
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'AWAITING_QR', 'CONNECTED', 'DEGRADED', 'ERROR');
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'RETRYING', 'FAILED', 'CANCELED');
CREATE TYPE "WhatsAppMessageType" AS ENUM ('APPOINTMENT_CONFIRMED');

CREATE UNIQUE INDEX "appointments_id_tenant_id_key" ON "appointments"("id", "tenant_id");

CREATE TABLE "whatsapp_connections" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "provider" "WhatsAppProviderType" NOT NULL DEFAULT 'EVOLUTION',
  "external_id" TEXT,
  "instance_name" TEXT NOT NULL,
  "phone_number" TEXT,
  "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "send_appointment_confirmation" BOOLEAN NOT NULL DEFAULT false,
  "connected_at" TIMESTAMPTZ(3),
  "disconnected_at" TIMESTAMPTZ(3),
  "last_healthy_at" TIMESTAMPTZ(3),
  "last_error_code" TEXT,
  "last_error_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_message_outbox" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "appointment_id" UUID,
  "connection_id" UUID NOT NULL,
  "type" "WhatsAppMessageType" NOT NULL,
  "recipient_phone" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "template_version" INTEGER NOT NULL DEFAULT 1,
  "idempotency_key" TEXT NOT NULL,
  "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3),
  "external_message_id" TEXT,
  "last_error_code" TEXT,
  "last_error_at" TIMESTAMPTZ(3),
  "queued_at" TIMESTAMPTZ(3),
  "processing_at" TIMESTAMPTZ(3),
  "sent_at" TIMESTAMPTZ(3),
  "failed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "whatsapp_message_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_message_outbox_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "whatsapp_message_outbox_template_version_check" CHECK ("template_version" > 0)
);

CREATE UNIQUE INDEX "whatsapp_connections_tenant_id_key" ON "whatsapp_connections"("tenant_id");
CREATE UNIQUE INDEX "whatsapp_connections_instance_name_key" ON "whatsapp_connections"("instance_name");
CREATE UNIQUE INDEX "whatsapp_connections_id_tenant_id_key" ON "whatsapp_connections"("id", "tenant_id");
CREATE INDEX "whatsapp_connections_tenant_id_status_idx" ON "whatsapp_connections"("tenant_id", "status");
CREATE UNIQUE INDEX "whatsapp_message_outbox_tenant_id_idempotency_key_key" ON "whatsapp_message_outbox"("tenant_id", "idempotency_key");
CREATE INDEX "whatsapp_message_outbox_status_next_attempt_at_idx" ON "whatsapp_message_outbox"("status", "next_attempt_at");
CREATE INDEX "whatsapp_message_outbox_tenant_id_created_at_idx" ON "whatsapp_message_outbox"("tenant_id", "created_at");
CREATE INDEX "whatsapp_message_outbox_appointment_id_idx" ON "whatsapp_message_outbox"("appointment_id");
CREATE INDEX "whatsapp_message_outbox_connection_id_tenant_id_idx" ON "whatsapp_message_outbox"("connection_id", "tenant_id");

ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_outbox" ADD CONSTRAINT "whatsapp_message_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_outbox" ADD CONSTRAINT "whatsapp_message_outbox_connection_tenant_fkey" FOREIGN KEY ("connection_id", "tenant_id") REFERENCES "whatsapp_connections"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_outbox" ADD CONSTRAINT "whatsapp_message_outbox_appointment_tenant_fkey" FOREIGN KEY ("appointment_id", "tenant_id") REFERENCES "appointments"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
