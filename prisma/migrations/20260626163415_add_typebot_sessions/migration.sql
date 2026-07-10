-- CreateEnum
CREATE TYPE "TypebotSessionStatus" AS ENUM ('STARTED', 'IDENTIFIED', 'SELECTING_SERVICE', 'SELECTING_SLOT', 'WAITING_CONFIRMATION', 'APPOINTMENT_CREATED', 'ABANDONED');

-- CreateTable
CREATE TABLE "typebot_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "last_service_id" UUID,
    "last_appointment_id" UUID,
    "status" "TypebotSessionStatus" NOT NULL DEFAULT 'STARTED',
    "metadata" JSONB,
    "last_interaction_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "typebot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "typebot_sessions_tenant_id_idx" ON "typebot_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "typebot_sessions_phone_idx" ON "typebot_sessions"("phone");

-- CreateIndex
CREATE INDEX "typebot_sessions_tenant_id_phone_idx" ON "typebot_sessions"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "typebot_sessions_customer_id_idx" ON "typebot_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "typebot_sessions_last_interaction_at_idx" ON "typebot_sessions"("last_interaction_at");

-- AddForeignKey
ALTER TABLE "typebot_sessions" ADD CONSTRAINT "typebot_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "typebot_sessions" ADD CONSTRAINT "typebot_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
