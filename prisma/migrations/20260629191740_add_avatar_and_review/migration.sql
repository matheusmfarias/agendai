-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_file_key" TEXT,
ADD COLUMN     "avatar_url" TEXT;

-- CreateTable
CREATE TABLE "appointment_reviews" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_reviews_appointment_id_key" ON "appointment_reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_reviews_tenant_id_idx" ON "appointment_reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "appointment_reviews_customer_user_id_idx" ON "appointment_reviews"("customer_user_id");

-- AddForeignKey
ALTER TABLE "appointment_reviews" ADD CONSTRAINT "appointment_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reviews" ADD CONSTRAINT "appointment_reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reviews" ADD CONSTRAINT "appointment_reviews_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
