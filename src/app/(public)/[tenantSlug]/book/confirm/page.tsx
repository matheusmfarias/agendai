import {
  getPublicBookingConfirmation,
} from "@/features/public-booking/public-booking-service";
import { publicBookingConfirmationSchema } from "@/features/public-booking/public-booking-schemas";
import { getCurrentUser } from "@/features/auth/permissions";
import { BookingConfirmationCard } from "@/features/public-booking/booking-confirmation-card";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Agendamento confirmado",
};

export default async function TenantBookConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const [{ tenantSlug }, { appointmentId }] = await Promise.all([
    params,
    searchParams,
  ]);

  const parsed = publicBookingConfirmationSchema.safeParse({
    tenantSlug,
    appointmentId,
  });
  if (!parsed.success) {
    return <PublicUnavailablePage />;
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/${tenantSlug}/book/confirm?appointmentId=${appointmentId}`;
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
  }
  if (String(user.globalRole) !== "CUSTOMER") {
    return <PublicUnavailablePage />;
  }

  const appointment = await getPublicBookingConfirmation(
    parsed.data.tenantSlug,
    parsed.data.appointmentId,
    user.id,
  );

  if (!appointment) {
    return <PublicUnavailablePage />;
  }

  return (
    <PublicShell>
      <BookingConfirmationCard appointment={appointment} />
    </PublicShell>
  );
}
