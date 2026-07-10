-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "onboarding_completed_at" TIMESTAMPTZ(3),
ADD COLUMN     "onboarding_skipped_at" TIMESTAMPTZ(3),
ADD COLUMN     "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED';
