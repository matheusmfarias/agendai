ALTER TYPE "WhatsAppMessageType" ADD VALUE 'APPOINTMENT_COMPLETED';

ALTER TABLE "whatsapp_connections"
ADD COLUMN "send_appointment_completed" BOOLEAN NOT NULL DEFAULT true;
