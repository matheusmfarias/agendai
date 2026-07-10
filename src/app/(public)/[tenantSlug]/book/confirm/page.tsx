import {
  getPublicBookingConfirmation,
} from "@/features/public-booking/public-booking-service";
import { BookingConfirmationCard } from "@/features/public-booking/booking-confirmation-card";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";

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
  const { tenantSlug } = await params;
  const { appointmentId } = await searchParams;

  if (!appointmentId) {
    return <PublicUnavailablePage />;
  }

  const appointment = await getPublicBookingConfirmation(
    tenantSlug,
    appointmentId,
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
