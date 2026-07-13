CREATE UNIQUE INDEX "provider_notifications_tenant_id_type_entity_id_key"
  ON "provider_notifications"("tenant_id", "type", "entity_id");
