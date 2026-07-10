"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/formatters";
import {
  getStatusBadgeVariant,
  SUBSCRIPTION_STATUS_LABELS,
  TENANT_STATUS_LABELS,
} from "@/lib/status";

import { sortTenantsBySeverity } from "./admin-constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AttentionTenant = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  subscription?: {
    id: string;
    status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED";
    expiresAt: string;
    plan: { name: string };
  } | null;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AdminAttentionListProps = {
  tenants: AttentionTenant[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminAttentionList({ tenants }: AdminAttentionListProps) {
  const sorted = sortTenantsBySeverity(tenants);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Prestadores que exigem atenção</CardTitle>
          {sorted.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {sorted.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length ? (
          <ul className="divide-y">
            {sorted.map((tenant) => (
                <li key={tenant.id}>
                  <Link
                    href={`/admin/tenants/${tenant.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{tenant.name}</p>
                        <Badge
                          variant={getStatusBadgeVariant(tenant.status)}
                          className="text-xs"
                        >
                          {TENANT_STATUS_LABELS[tenant.status]}
                        </Badge>
                        {tenant.subscription && (
                          <Badge
                            variant={getStatusBadgeVariant(
                              tenant.subscription.status,
                            )}
                            className="text-xs"
                          >
                            {SUBSCRIPTION_STATUS_LABELS[tenant.subscription.status]}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tenant.subscription
                          ? `${tenant.subscription.plan.name} · Vencimento ${formatDate(tenant.subscription.expiresAt)}`
                          : "Sem assinatura"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <EmptyState
            icon="users"
            title="Nenhum prestador exigindo atenção"
            description="Quando houver assinaturas vencidas, suspensões ou pendências operacionais, elas aparecerão aqui."
          />
        )}
      </CardContent>
    </Card>
  );
}
