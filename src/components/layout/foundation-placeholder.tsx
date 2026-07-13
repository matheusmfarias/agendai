import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

type FoundationPlaceholderProps = {
  title: string;
  description: string;
};

export function FoundationPlaceholder({
  title,
  description,
}: FoundationPlaceholderProps) {
  return (
    <>
      <PageHeading title={title} description={description} />
      <Card className="max-w-3xl border-dashed bg-card/80">
        <CardHeader className="space-y-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Construction className="size-5" />
          </div>
          <CardTitle>Area planejada para evolucao do MVP</CardTitle>
          <CardDescription>
            Esta rota ja esta protegida, integrada ao layout e reservada para
            uma funcionalidade administrativa futura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-2xl border bg-background p-4">
            <p className="font-semibold text-foreground">Status atual</p>
            <p className="mt-1">
              Ainda não há fluxo operacional completo nesta área. As regras
              reais continuam nas telas ativas de admin, prestador, cliente e
              link público.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">
              <ArrowLeft className="size-4" />
              Voltar ao dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
