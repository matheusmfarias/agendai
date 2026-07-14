BEGIN;

ALTER TYPE "WhatsAppMessageType" ADD VALUE 'APPOINTMENT_REQUESTED';

ALTER TABLE "whatsapp_connections"
ADD COLUMN "send_appointment_requested" BOOLEAN NOT NULL DEFAULT true;

COMMIT;
