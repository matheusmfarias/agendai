import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logoutAction } from "@/features/auth/auth-actions";

export const metadata = {
  title: "Acesso não permitido",
};

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="place-items-center">
          <span className="mb-3 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="size-6" />
          </span>
          <CardTitle className="text-xl">Acesso não permitido</CardTitle>
          <CardDescription>
            Sua conta não tem permissão para abrir esta área.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutAction}>
            <Button type="submit" className="w-full">
              Voltar ao login
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
