-- CreateTable
CREATE TABLE "appointment_custom_values" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "custom_field_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_custom_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_custom_values_appointment_id_idx" ON "appointment_custom_values"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_custom_values_custom_field_id_idx" ON "appointment_custom_values"("custom_field_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_custom_values_appointment_id_custom_field_id_key" ON "appointment_custom_values"("appointment_id", "custom_field_id");

-- AddForeignKey
ALTER TABLE "appointment_custom_values" ADD CONSTRAINT "appointment_custom_values_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_custom_values" ADD CONSTRAINT "appointment_custom_values_custom_field_id_fkey" FOREIGN KEY ("custom_field_id") REFERENCES "custom_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
