# Admin Experience — AgendaZap

**Phase 21 — Admin Experience Redesign**
**Date:** 2026-06-29

---

## Objective

Redesenhar a experiência administrativa do AgendaZap para o Super Admin, transformando o painel de um conjunto de CRUDs técnicos em um cockpit de operação da plataforma SaaS multiempresa.

---

## Screens redesigned

| Route | Description |
|---|---|
| `/admin/dashboard` | Cockpit operacional — hero, health row, attention list, recent activity |
| `/admin/tenants/[id]` | Detalhe do prestador — header com status, ações agrupadas, resumo operacional |
| `/admin/typebot-simulator` | Simulador com contexto via PageHeading |
| `/admin/layout` | Admin shell com subtitle "Administração da plataforma" |

## Screens refinadas (visual)

| Route | Changes |
|---|---|
| `/admin/tenants` | Já refinado na Phase 20 |
| `/admin/subscriptions` | Já refinado na Phase 20 |
| `/admin/plans` | Já refinado na Phase 20 |
| `/admin/audit-logs` | Já refinado na Phase 20 |
| `/admin/tenants/[id]/typebot-credentials` | Mantido (já bem estruturado) |
| `/admin/tenants/[id]/templates` | Mantido (já bem estruturado) |

---

## New components

| Component | Path | Purpose |
|---|---|---|
| `AdminDashboardHero` | `src/features/admin-dashboard/admin-dashboard-hero.tsx` | Hero card with platform health status, provider count, plan count, "Novo prestador" CTA |
| `AdminMetricCard` | `src/features/admin-dashboard/admin-metric-card.tsx` | Compact metric card with icon, label, value, and tone (default/success/warning/destructive) |
| `AdminAttentionList` | `src/features/admin-dashboard/admin-attention-list.tsx` | Sorted list of tenants needing operational attention (past_due, suspended, canceled) |
| `AdminRecentActivity` | `src/features/admin-dashboard/admin-recent-activity.tsx` | Recent audit log events with critical/destructive highlighting and tenant links |
| `AdminConstants` | `src/features/admin-dashboard/admin-constants.ts` | Shared constants: icon names, health labels, severity sorting, badge variants |

---

## Repository changes

### `getAdminDashboardMetrics()` enhanced

Added three new query dimensions:

1. **`tenantsNeedingAttention`** — Top 10 tenants with past_due/suspended/canceled subscriptions or suspended tenant status. Sorted by recency.
2. **`recentAuditLogs`** — Last 8 audit log entries with tenant name. Ordered by recency.
3. **`upcomingExpirationsCount`** — Count of active/trial subscriptions expiring within 7 days.
4. **`platformHealth`** — Derived status: `"healthy"`, `"warning"` (upcoming expirations), or `"critical"` (past_due, suspended, canceled).

No existing queries, policies, or schemas were altered — only new queries were added.

---

## Dashboard layout

The admin dashboard now follows operational priority:

1. **Hero** — "Operação da plataforma" in Lora, platform health badge (success/warning/destructive), provider count, plan count, "Novo prestador" CTA
2. **Health row (4 cards)** — Prestadores ativos (success), Assinaturas vencidas (destructive when >0), Tenants suspensos (destructive when >0), Vencimentos próximos (warning when >0)
3. **Secondary metrics (4 cards)** — Total de prestadores, Receita mensal prevista, Assinaturas ativas, Trials ativos
4. **Two-column main area** — Left: attention list (tenants with issues), Right: recent activity (audit logs)
5. **Mobile** — All cards stack vertically; two columns collapse to one

### Visual hierarchy

| Element | Color |
|---|---|
| Hero title | Foreground (Lora display) |
| Healthy badge | Badge success |
| Warning badge | Badge warning |
| Critical badge | Badge destructive |
| Metric card (default) | Neutral icon bg |
| Metric card (success) | Green icon bg + green value |
| Metric card (warning) | Mustard icon bg + mustard value |
| Metric card (destructive) | Red icon bg + red value |
| Critical audit events | Badge destructive |
| Normal audit events | Badge secondary |
| Primary CTA | Terracotta (`--primary`) |

---

## Tenant detail page

The detail page was restructured from a flat grid of cards into a hierarchical operational view:

1. **Header** — Business name (Lora), slug, status badges (tenant + subscription), location/segment, quick actions (Edit, Suspend/Reactivate, Cancel)
2. **Two-column** — Business data (full info) + Subscription card (plan, status, expiration, manage link)
3. **Administrative actions** — Template, Typebot credentials, audit logs, password reset — grouped in a dedicated card
4. **User responsible** — Full user info with access creation when missing
5. **Two-column secondary** — Appointments placeholder + Quick links (public link, admin appointments)
6. **Logs** — Recent audit log entries with event type badges

### Actions preserved

- Editar prestador ✓
- Suspend/Reativar/Cancelar ✓
- Acesso do responsável ✓
- Redefinir senha ✓
- Aplicar template ✓
- Credenciais Typebot ✓
- Gerenciar assinatura ✓
- Ver logs do prestador ✓
- Link público ✓

---

## Admin shell

- Added `subtitle="Administração da plataforma"` to admin layout
- Sidebar label remains "Admin da plataforma" (shown in sidebar header)
- Header subtitle now reads "Administração da plataforma" instead of generic "Painel de gestão"
- Provider shell unchanged (uses `subtitle="Painel do prestador"`)

---

## What was preserved

- **Auth:** `requireSuperAdmin()` in admin layout — unchanged
- **Tenant CRUD:** All creation, editing, status changes — unchanged
- **Subscription management:** Manual payments, expiration changes, status toggles — unchanged
- **Plan CRUD:** Creation, editing, activation/deactivation — unchanged
- **Audit logs:** Immutable recording of all administrative actions — unchanged
- **Typebot API:** All endpoints, credential management, simulator — unchanged
- **Templates:** Segment template application (idempotent) — unchanged
- **Server actions:** All existing server actions — unchanged
- **Zod validations:** All schemas — unchanged
- **Subscription enforcement:** No policy changes
- **Provider dashboard:** No changes to `/app/dashboard` or provider shell

---

## What was NOT implemented (out of scope)

- Cobrança automática ou gateway de pagamento
- Notificações ou alertas em tempo real
- Relatórios financeiros complexos
- Gráficos avançados
- Exportação de dados
- Bulk actions (ações em lote)
- Nova política de assinatura
- Alterações no Prisma schema ou migrations
- Novos endpoints Typebot
- Impersonate / login como tenant
- Dark mode

---

## Patterns

### String-based icon serialization
`AdminMetricCard` uses string-based icon names (`AdminMetricIconName`) — same pattern as `EmptyState` and `ProviderMetricCard` for Server→Client boundary compatibility.

### Severity sorting
`sortTenantsBySeverity()` in admin-constants.ts orders tenants by subscription urgency: PAST_DUE (0) → SUSPENDED (1) → CANCELED (2) → others (3).

### Platform health derivation
Health status is derived from metrics on the server side — no additional queries, no complex rules:
- Any past_due/suspended → `critical`
- Upcoming expirations → `warning`
- Otherwise → `healthy`

---

## Files created (5)

- `src/features/admin-dashboard/admin-constants.ts`
- `src/features/admin-dashboard/admin-metric-card.tsx`
- `src/features/admin-dashboard/admin-dashboard-hero.tsx`
- `src/features/admin-dashboard/admin-attention-list.tsx`
- `src/features/admin-dashboard/admin-recent-activity.tsx`

---

## Files modified (4)

- `src/server/repositories/admin-dashboard-repository.ts` — Added attention list, recent logs, upcoming expirations, platform health
- `src/app/(admin)/admin/dashboard/page.tsx` — Complete redesign as operational cockpit
- `src/app/(admin)/admin/tenants/[id]/page.tsx` — Restructured with header, grouped actions, better hierarchy
- `src/app/(admin)/admin/layout.tsx` — Added subtitle
- `src/app/(admin)/admin/typebot-simulator/page.tsx` — Added PageHeading with context

---

## Documentation created

- `docs/design/admin-experience.md` (this file)

---

## Validations

```
pnpm typecheck  ✓ (0 errors)
pnpm lint      ✓ (0 errors, 0 warnings)
pnpm test       ✓ (180 passed, 16 files)
pnpm build      ✓ (63 routes compiled)
```
