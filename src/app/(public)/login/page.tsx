import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, LogOut } from "lucide-react";

import { LoginForm } from "@/components/forms/login-form";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/auth-actions";
import { AuthBrandPanel, AuthMobileBrand } from "@/features/auth/auth-brand-panel";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthLayout } from "@/features/auth/auth-layout";
import { getCurrentUser } from "@/features/auth/permissions";

export const metadata = {
  title: "Entrar",
};

function safeRedirectPath(value: string | undefined) {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function CustomerAlreadyLoggedIn() {
  return (
    <AuthCard
      title="Você já está conectado"
      description="Continue para seus agendamentos ou saia para entrar com outra conta."
    >
      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href="/cliente/agendamentos">
            <CalendarDays className="size-4" />
            Ir para meus agendamentos
          </Link>
        </Button>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" />
            Sair
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();

  if (user) {
    if (user.globalRole === "SUPER_ADMIN") {
      redirect("/admin/dashboard");
    }

    if (String(user.globalRole) !== "CUSTOMER") {
      redirect("/app/dashboard");
    }

    // CUSTOMER: redirect to safe return path, otherwise show already-logged-in page
    const params = await searchParams;
    const returnTo = safeRedirectPath(params.redirectTo);
    if (returnTo) {
      redirect(returnTo);
    }

    return (
      <AuthLayout
        brandPanel={<AuthBrandPanel />}
        mobileBrand={<AuthMobileBrand />}
      >
        <CustomerAlreadyLoggedIn />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      brandPanel={<AuthBrandPanel />}
      mobileBrand={<AuthMobileBrand />}
    >
      <AuthCard
        title="Entrar no Agendaí"
        description="Acesse sua área para administrar agendas, serviços e atendimentos."
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
