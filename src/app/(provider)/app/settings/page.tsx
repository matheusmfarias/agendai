import { ProviderSettingsForm } from "@/components/forms/provider-settings-form";
import { NotificationSoundSettings } from "@/features/provider-notifications/components/provider-notification-center";
import { PageHeading } from "@/components/layout/page-heading";
import { ModulePage } from "@/components/layout/module-page";
import { SuccessAlert } from "@/components/layout/success-alert";
import { requireProviderManager } from "@/features/auth/permissions";
import { updateProviderSettingsAction } from "@/server/actions/provider-actions";
import { getProviderSettings } from "@/server/repositories/provider-repository";

export const metadata = { title: "Configurações do negócio" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const context = await requireProviderManager();
  const tenant = await getProviderSettings(context.tenantId);
  const { success } = await searchParams;
  if (!tenant) return null;

  return (
    <ModulePage>
      <PageHeading
        title="Configurações do negócio"
        description="Centralize perfil público, regras de agendamento, comunicação e dados da conta."
      />
      <SuccessAlert code={success} context="settings" />
      <ProviderSettingsForm
        action={updateProviderSettingsAction}
        tenantSlug={tenant.slug}
        tenantStatus={tenant.status}
        subscription={
          tenant.subscription
            ? {
                status: tenant.subscription.status,
                expiresAt: tenant.subscription.expiresAt?.toISOString() ?? null,
                planName: tenant.subscription.plan.name,
                publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
                whatsappEnabled: tenant.subscription.plan.whatsappEnabled,
              }
            : null
        }
        account={{
          responsibleName: context.user.name,
          email: context.user.email,
        }}
        defaultValues={{
          name: tenant.name,
          publicLinkActive: tenant.publicLinkActive,
          publicDisplayName: tenant.publicDisplayName ?? "",
          logoUrl: tenant.logoUrl ?? "",
          responsibleName: tenant.responsibleName,
          email: tenant.email,
          whatsapp: tenant.whatsapp,
          segment: tenant.segment,
          city: tenant.city,
          state: tenant.state,
          postalCode: tenant.postalCode ?? "",
          neighborhood: tenant.neighborhood ?? "",
          address: tenant.address ?? "",
          addressComplement: tenant.addressComplement ?? "",
          googleMapsUrl: tenant.googleMapsUrl ?? "",
          serviceLocation:
            tenant.serviceLocation === "CUSTOMER_ADDRESS" ||
            tenant.serviceLocation === "BOTH"
              ? tenant.serviceLocation
              : "BUSINESS_ADDRESS",
          timezone:
            tenant.timezone === "America/Manaus" ||
            tenant.timezone === "America/Cuiaba" ||
            tenant.timezone === "America/Rio_Branco"
              ? tenant.timezone
              : "America/Sao_Paulo",
          locale: "pt-BR",
          currency: "BRL",
          weekStartsOn: tenant.weekStartsOn,
          timeFormat: tenant.timeFormat === "12H" ? "12H" : "24H",
          defaultAppointmentDuration: tenant.defaultAppointmentDuration,
          defaultSlotInterval: tenant.defaultSlotInterval,
          minBookingNoticeMinutes: tenant.minBookingNoticeMinutes,
          maxBookingAdvanceDays: tenant.maxBookingAdvanceDays,
          allowCustomerCancellation: tenant.allowCustomerCancellation,
          allowCustomerRescheduling: tenant.allowCustomerRescheduling,
          cancellationNoticeHours: tenant.cancellationNoticeHours,
          confirmationMessageTemplate: tenant.confirmationMessageTemplate,
          reminderMessageTemplate: tenant.reminderMessageTemplate,
          cancellationMessageTemplate: tenant.cancellationMessageTemplate,
          enableAutomaticReminders: tenant.enableAutomaticReminders,
          reminderLeadHours: tenant.reminderLeadHours,
          description: tenant.description ?? "",
        }}
      />
      <NotificationSoundSettings />
    </ModulePage>
  );
}
