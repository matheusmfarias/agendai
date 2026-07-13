import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";

import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/config/brand";

export const metadata = {
  title: "Agenda online para pequenos negócios",
  description: brand.metadata.description,
};

const features = [
  {
    title: "Agenda organizada",
    description: "Horários, bloqueios e confirmações em uma rotina simples.",
    icon: CalendarCheck2,
  },
  {
    title: "Link público",
    description: "Seu cliente escolhe serviço e horário sem troca infinita de mensagens.",
    icon: CheckCircle2,
  },
  {
    title: "WhatsApp-first",
    description: "Pensado para pequenos prestadores que já vendem e atendem pelo WhatsApp.",
    icon: MessageCircle,
  },
  {
    title: "Gestão do negócio",
    description: "Clientes, serviços, financeiro e relatórios no mesmo painel.",
    icon: BarChart3,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <AgendaiLogo size="md" />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1fr)] lg:px-8 lg:py-24">
        <div>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Organize sua agenda. Encante seus clientes. Faça seu negócio crescer.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            O Agendaí centraliza serviços, horários, clientes e confirmações para
            prestadores que precisam de uma agenda simples, confiável e sempre à mão.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 px-5">
              <Link href="/login">Começar agora</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link href="#recursos">Conhecer recursos</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <Image
            src="/brand/agendai-hero-devices.png"
            alt="Agenda online em notebook e celular"
            width={1536}
            height={1024}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] h-full w-full object-cover object-[68%_center]"
          />
        </div>
      </section>

      <section
        id="recursos"
        className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardContent className="p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-md bg-primary-soft text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-display text-lg font-semibold">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
