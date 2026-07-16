ALTER TYPE "WhatsAppMessageType" ADD VALUE 'APPOINTMENT_REMINDER';
ALTER TYPE "WhatsAppMessageType" ADD VALUE 'APPOINTMENT_CANCELED';

ALTER TABLE "whatsapp_message_outbox"
ADD COLUMN "scheduled_for" TIMESTAMPTZ(3);

CREATE INDEX "whatsapp_message_outbox_status_scheduled_for_idx"
ON "whatsapp_message_outbox"("status", "scheduled_for");
