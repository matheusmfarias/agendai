import { redirect } from "next/navigation";

type BlocksSearchParams = {
  panel?: string;
  blockId?: string;
  mode?: string;
  success?: string;
};

export default async function ScheduleBlocksPage({
  searchParams,
}: {
  searchParams: Promise<BlocksSearchParams>;
}) {
  const params = await searchParams;
  const nextParams = new URLSearchParams({ tab: "blocks" });

  if (params.panel === "new") nextParams.set("panel", "block-new");
  if (params.blockId) nextParams.set("blockId", params.blockId);
  if (params.mode) nextParams.set("mode", params.mode);
  if (params.success) nextParams.set("success", params.success);

  redirect(`/app/availability?${nextParams.toString()}`);
}
