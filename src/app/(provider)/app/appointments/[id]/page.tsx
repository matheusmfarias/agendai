import { redirect } from "next/navigation";

export default async function AppointmentDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;
  const paramsToKeep = new URLSearchParams({ appointmentId: id });

  if (success) {
    paramsToKeep.set("success", success);
  }

  redirect(`/app/appointments?${paramsToKeep.toString()}`);
}
