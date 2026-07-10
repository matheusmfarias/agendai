"use client";

import { Boxes, CalendarDays, Clock, FolderOpen, ScrollText, Search, Tag, UsersRound, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Icon names — serializable across Server→Client boundary.
// ---------------------------------------------------------------------------

export const EMPTY_STATE_ICON_NAMES = [
  "boxes",
  "calendar",
  "clock",
  "folder",
  "scroll",
  "search",
  "tag",
  "users",
] as const;

export type EmptyStateIconName = (typeof EMPTY_STATE_ICON_NAMES)[number];

const ICONS: Record<EmptyStateIconName, LucideIcon> = {
  boxes: Boxes,
  calendar: CalendarDays,
  clock: Clock,
  folder: FolderOpen,
  scroll: ScrollText,
  search: Search,
  tag: Tag,
  users: UsersRound,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type EmptyStateProps = {
  icon: EmptyStateIconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
