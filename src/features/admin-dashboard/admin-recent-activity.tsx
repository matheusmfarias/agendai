"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/formatters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditLogEntry = {
  id: string;
  eventType: string;
  actorType: string;
  description: string;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
  } | null;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AdminRecentActivityProps = {
  logs: AuditLogEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCriticalEvent(eventType: string): boolean {
  return /SUSPEND|CANCEL|REVOKE|BLOCK/i.test(eventType);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminRecentActivity({ logs }: AdminRecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Atividade recente</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/audit-logs">
            Ver todos <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length ? (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          isCriticalEvent(log.eventType)
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {log.eventType}
                      </Badge>
                      {log.tenant && (
                        <Link
                          href={`/admin/tenants/${log.tenant.id}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {log.tenant.name}
                        </Link>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {log.description}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="calendar"
            title="Nenhum evento recente"
            description="As ações administrativas e operacionais aparecerão aqui conforme a plataforma for utilizada."
          />
        )}
      </CardContent>
    </Card>
  );
}
