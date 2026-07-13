import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
        <AgendaiLogo size="sm" className="justify-center" />
        <span className="mx-auto mt-8 grid size-12 place-items-center rounded-lg bg-primary-soft text-primary">
          <SearchX className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          O endereço pode estar incorreto ou esta página não está mais disponível.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para o início
          </Link>
        </Button>
      </section>
    </main>
  );
}
