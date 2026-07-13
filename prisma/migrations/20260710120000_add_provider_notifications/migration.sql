CREATE TABLE "provider_notifications" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "recipient_user_id" UUID,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" UUID,
  "action_url" TEXT,
  "read_at" TIMESTAMPTZ(3),
  "archived_at" TIMESTAMPTZ(3),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "provider_notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "provider_notifications"
  ADD CONSTRAINT "provider_notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_notifications"
  ADD CONSTRAINT "provider_notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "provider_notifications_tenant_id_created_at_idx"
  ON "provider_notifications"("tenant_id", "created_at");
CREATE INDEX "provider_notifications_tenant_id_read_at_idx"
  ON "provider_notifications"("tenant_id", "read_at");
CREATE INDEX "provider_notifications_tenant_id_type_idx"
  ON "provider_notifications"("tenant_id", "type");
CREATE INDEX "provider_notifications_recipient_user_id_idx"
  ON "provider_notifications"("recipient_user_id");
