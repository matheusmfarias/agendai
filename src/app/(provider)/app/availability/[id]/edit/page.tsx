import { redirect } from "next/navigation";

export default async function EditAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/availability?ruleId=${id}&mode=edit`);
}
