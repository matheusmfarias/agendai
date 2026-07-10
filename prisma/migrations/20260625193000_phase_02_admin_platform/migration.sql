-- A Phase 02 gerencia uma assinatura vigente por prestador.
-- O histórico de alterações e pagamentos permanece preservado em audit_logs.
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
