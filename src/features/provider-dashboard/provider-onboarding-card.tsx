"use client";

import Link from "next/link";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

type ProviderOnboardingCardProps = {
  onboardingStatus: string;
};

const ONBOARDING_COPY: Record<
  string,
  { title: string; description: string; cta: string }
> = {
  NOT_STARTED: {
    title: "Complete a configuração inicial",
    description:
      "Configure serviços, horários e revise seu link público para começar a receber agendamentos.",
    cta: "Começar",
  },
  IN_PROGRESS: {
    title: "Continue a configuração inicial",
    description:
      "Você ainda não concluiu todos os passos. Finalize para liberar seu negócio.",
    cta: "Continuar",
  },
  SKIPPED: {
    title: "Retomar configuração inicial",
    description:
      "Você pulou a configuração inicial. Retome quando quiser para revisar serviços e horários.",
    cta: "Retomar",
  },
};

export function ProviderOnboardingCard({
  onboardingStatus,
}: ProviderOnboardingCardProps) {
  const copy = ONBOARDING_COPY[onboardingStatus];
  if (!copy) return null;

  const isSkipped = onboardingStatus === "SKIPPED";

  return (
    <Card
      className={`mb-4 border-l-4 ${
        isSkipped ? "border-l-muted-foreground/30" : "border-l-primary"
      }`}
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`font-semibold ${isSkipped ? "text-foreground" : "text-foreground"}`}>
            {copy.title}
          </p>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Button asChild variant={isSkipped ? "outline" : "default"} size="sm" className="shrink-0">
          <Link href="/app/onboarding">
            <Play className="size-4" />
            {copy.cta}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
