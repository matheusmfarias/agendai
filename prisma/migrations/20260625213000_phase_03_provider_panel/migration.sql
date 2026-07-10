CREATE TYPE "PriceType" AS ENUM ('FIXED', 'STARTING_AT', 'ON_REQUEST', 'HIDDEN');
CREATE TYPE "BookingMode" AS ENUM ('DIRECT', 'REQUIRES_CONFIRMATION', 'INFORMATIONAL');
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

ALTER TABLE "tenants"
ADD COLUMN "address" TEXT,
ADD COLUMN "description" TEXT;

CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price_type" "PriceType" NOT NULL,
    "price_value" DECIMAL(10,2),
    "booking_mode" "BookingMode" NOT NULL,
    "requires_manual_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_fields" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "slot_interval_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_blocks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_fields_service_id_key_key" ON "custom_fields"("service_id", "key");
CREATE INDEX "service_categories_tenant_id_idx" ON "service_categories"("tenant_id");
CREATE INDEX "service_categories_tenant_id_position_idx" ON "service_categories"("tenant_id", "position");
CREATE INDEX "services_tenant_id_idx" ON "services"("tenant_id");
CREATE INDEX "services_category_id_idx" ON "services"("category_id");
CREATE INDEX "services_tenant_id_position_idx" ON "services"("tenant_id", "position");
CREATE INDEX "custom_fields_tenant_id_idx" ON "custom_fields"("tenant_id");
CREATE INDEX "custom_fields_service_id_idx" ON "custom_fields"("service_id");
CREATE INDEX "custom_fields_service_id_position_idx" ON "custom_fields"("service_id", "position");
CREATE INDEX "availability_rules_tenant_id_idx" ON "availability_rules"("tenant_id");
CREATE INDEX "availability_rules_tenant_id_weekday_idx" ON "availability_rules"("tenant_id", "weekday");
CREATE INDEX "schedule_blocks_tenant_id_idx" ON "schedule_blocks"("tenant_id");
CREATE INDEX "schedule_blocks_tenant_id_starts_at_idx" ON "schedule_blocks"("tenant_id", "starts_at");
CREATE INDEX "schedule_blocks_created_by_user_id_idx" ON "schedule_blocks"("created_by_user_id");

ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
