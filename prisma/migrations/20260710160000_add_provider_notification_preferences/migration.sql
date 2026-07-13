CREATE TABLE "provider_notification_preferences" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "panel_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
  "public_booking_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "cancellation_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "reschedule_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "payment_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "provider_notification_preferences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "provider_notification_preferences"
  ADD CONSTRAINT "provider_notification_preferences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_notification_preferences"
  ADD CONSTRAINT "provider_notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "provider_notification_preferences_tenant_id_user_id_key"
  ON "provider_notification_preferences"("tenant_id", "user_id");
CREATE INDEX "provider_notification_preferences_user_id_idx"
  ON "provider_notification_preferences"("user_id");
