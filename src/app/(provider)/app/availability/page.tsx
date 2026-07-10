import {
  ProviderAvailabilityView,
  type AvailabilityRuleRow,
  type ScheduleBlockRow,
} from "@/features/provider-availability/provider-availability-view";
import { requireProviderManager } from "@/features/auth/permissions";
import { formatTime } from "@/lib/formatters";
import {
  changeAvailabilityRuleStatusAction,
  createAvailabilityRuleAction,
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  updateAvailabilityRuleAction,
  updateScheduleBlockAction,
} from "@/server/actions/provider-actions";
import {
  getProviderSchedulingDefaults,
  listAvailabilityRules,
  listScheduleBlocks,
} from "@/server/repositories/provider-repository";

export const metadata = { title: "Horários" };

type AvailabilitySearchParams = {
  tab?: string;
  panel?: string;
  ruleId?: string;
  blockId?: string;
  mode?: string;
  success?: string;
};

function mapRule(
  rule: Awaited<ReturnType<typeof listAvailabilityRules>>[number],
): AvailabilityRuleRow {
  return {
    id: rule.id,
    weekday: rule.weekday,
    startTime: formatTime(rule.startTime),
    endTime: formatTime(rule.endTime),
    slotIntervalMinutes: rule.slotIntervalMinutes,
    isActive: rule.isActive,
  };
}

function mapBlock(
  block: Awaited<ReturnType<typeof listScheduleBlocks>>[number],
): ScheduleBlockRow {
  return {
    id: block.id,
    startsAt: block.startsAt.toISOString(),
    endsAt: block.endsAt.toISOString(),
    reason: block.reason,
    createdByName: block.createdBy.name,
  };
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<AvailabilitySearchParams>;
}) {
  const context = await requireProviderManager();
  const params = await searchParams;
  const [rows, blocks, schedulingDefaults] = await Promise.all([
    listAvailabilityRules(context.tenantId).then((items) => items.map(mapRule)),
    listScheduleBlocks(context.tenantId).then((items) => items.map(mapBlock)),
    getProviderSchedulingDefaults(context.tenantId),
  ]);
  const selectedRule =
    params.ruleId ? (rows.find((rule) => rule.id === params.ruleId) ?? null) : null;
  const selectedBlock =
    params.blockId
      ? (blocks.find((block) => block.id === params.blockId) ?? null)
      : null;
  const activeTab = params.tab === "blocks" ? "blocks" : "availability";
  const panelMode =
    params.panel === "new"
      ? "create"
      : params.panel === "block-new"
        ? "block-create"
        : selectedBlock && params.mode === "edit"
          ? "block-edit"
          : selectedRule && params.mode === "edit"
            ? "edit"
            : "none";

  return (
    <ProviderAvailabilityView
      rows={rows}
      blocks={blocks}
      selectedRule={selectedRule}
      selectedBlock={selectedBlock}
      activeTab={activeTab}
      panelMode={panelMode}
      defaultSlotInterval={schedulingDefaults?.defaultSlotInterval ?? 30}
      success={params.success}
      createAction={createAvailabilityRuleAction}
      updateAction={updateAvailabilityRuleAction}
      statusAction={changeAvailabilityRuleStatusAction}
      createBlockAction={createScheduleBlockAction}
      updateBlockAction={updateScheduleBlockAction}
      deleteBlockAction={deleteScheduleBlockAction}
    />
  );
}
