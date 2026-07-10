import { notFound } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { requireProviderManager } from "@/features/auth/permissions";
import { getProviderOnboardingChecklist } from "@/features/onboarding/onboarding-checklist-service";
import { listSegmentTemplates } from "@/features/segment-templates/segment-template-service";
import { prisma } from "@/lib/prisma";

import { OnboardingWizard } from "./client";

export const metadata = { title: "Configuração inicial" };

export default async function OnboardingPage() {
  const context = await requireProviderManager();
  const tenantId = context.tenantId;

  // Load tenant basic data
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      responsibleName: true,
      email: true,
      whatsapp: true,
      segment: true,
      city: true,
      state: true,
      address: true,
      description: true,
      slug: true,
      onboardingStatus: true,
    },
  });
  if (!tenant) notFound();

  const [checklist, templates] = await Promise.all([
    getProviderOnboardingChecklist(tenantId),
    Promise.resolve(listSegmentTemplates()),
  ]);

  return (
    <>
      <PageHeading
        title="Configuração inicial"
        description="Complete os passos para começar a receber agendamentos."
      />

      <OnboardingWizard
        tenant={tenant}
        templates={templates}
        initialChecklist={checklist}
      />
    </>
  );
}
