ALTER TYPE "GlobalRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "user_id" UUID;

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "customers_user_id_idx"
  ON "customers"("user_id");

CREATE INDEX IF NOT EXISTS "customers_tenant_id_user_id_idx"
  ON "customers"("tenant_id", "user_id");

ALTER TABLE "appointments"
  ALTER COLUMN "created_by_user_id" DROP NOT NULL;