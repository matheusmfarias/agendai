-- CreateTable
CREATE TABLE "typebot_credentials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "typebot_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "typebot_credentials_tenant_id_idx" ON "typebot_credentials"("tenant_id");

-- CreateIndex
CREATE INDEX "typebot_credentials_token_prefix_idx" ON "typebot_credentials"("token_prefix");

-- AddForeignKey
ALTER TABLE "typebot_credentials" ADD CONSTRAINT "typebot_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
