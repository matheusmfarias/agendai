import { notFound } from "next/navigation";

import { CustomerAvatarUpload } from "@/components/forms/customer-avatar-upload";
import { CustomerProfileForm } from "@/components/forms/customer-profile-form";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/features/auth/auth-actions";
import { requireCustomer } from "@/features/auth/permissions";
import { CustomerShell } from "@/features/customer-portal/customer-shell";
import {
  updateCustomerAvatarAction,
  updateCustomerProfileAction,
} from "@/server/actions/customer-portal-actions";
import { getCustomerProfile } from "@/server/repositories/customer-portal-repository";

export const metadata = { title: "Perfil" };

function avatarInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await requireCustomer();
  const profile = await getCustomerProfile(user.id);
  if (!profile) notFound();

  const { success } = await searchParams;

  return (
    <CustomerShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Perfil
            </h1>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Sair
              </Button>
            </form>
          </div>
        </div>

        <SuccessAlert code={success} context="settings" />

        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-5 p-4">
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {avatarInitials(profile.name)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <CustomerAvatarUpload
                  action={updateCustomerAvatarAction}
                  hasAvatar={!!profile.avatarUrl}
                />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">
                {profile.name}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <CustomerProfileForm
              defaultValues={{
                name: profile.name,
                phone: profile.phone ?? "",
                email: profile.email,
              }}
              action={updateCustomerProfileAction}
            />
          </CardContent>
        </Card>
      </div>
    </CustomerShell>
  );
}
