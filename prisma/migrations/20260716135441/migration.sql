-- AlterTable
ALTER TABLE "whatsapp_sent_message_receipts" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "whatsapp_sent_message_receipts_connection_id_tenant_id_created_" RENAME TO "whatsapp_sent_message_receipts_connection_id_tenant_id_crea_idx";

-- RenameIndex
ALTER INDEX "whatsapp_sent_message_receipts_tenant_id_external_message_id_ke" RENAME TO "whatsapp_sent_message_receipts_tenant_id_external_message_i_key";
