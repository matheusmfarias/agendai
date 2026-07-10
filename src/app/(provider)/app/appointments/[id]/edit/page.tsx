import { redirect } from "next/navigation";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/appointments?appointmentId=${id}`);
}
