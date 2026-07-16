-- AlterTable
ALTER TABLE "whatsapp_inbound_messages" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "whatsapp_inbound_messages_tenant_id_sender_phone_received_at_id" RENAME TO "whatsapp_inbound_messages_tenant_id_sender_phone_received_a_idx";
