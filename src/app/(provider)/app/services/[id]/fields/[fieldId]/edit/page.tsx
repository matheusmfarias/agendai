import { redirect } from "next/navigation";

export default async function EditCustomFieldPage({
  params,
}: {
  params: Promise<{ id: string; fieldId: string }>;
}) {
  const { id, fieldId } = await params;
  redirect(`/app/services?serviceId=${id}&fieldId=${fieldId}`);
}
