# Phase 20 — Data Tables & Responsive Lists

## Summary

Improved all table pages across admin and provider areas with responsive behavior, semantic empty states, standardized row actions, and visual refinements. No business logic, queries, auth, or schemas were changed.

## Changes by layer

### Layer 1: Reusable UI components (3 new files)

| File | Purpose |
|---|---|
| `src/components/ui/empty-state.tsx` | Empty state with string-based icon, title, description, optional action slot. Icons: boxes, calendar, clock, folder, scroll, search, tag, users. |
| `src/components/ui/row-actions.tsx` | Standardized row action buttons with label, href/onClick, and variant. |
| `src/components/ui/list-toolbar.tsx` | Filter/search toolbar wrapper with responsive grid layout. |

### Layer 2: TableContainer applied to all table pages

All `<Table>` components are now wrapped in `<TableContainer>`, which provides horizontal scroll on narrow viewports and consistent rounded border styling.

| Page | Status |
|---|---|
| `/admin/tenants` | Already in `tenant-table.tsx` (shared TanStack component) |
| `/admin/subscriptions` | Already in `subscription-table.tsx` |
| `/admin/plans` | Already in `plan-table.tsx` |
| `/admin/audit-logs` | Applied inline in page |
| `/app/services` | Applied inline in page |
| `/app/services/categories` | Applied inline in page |
| `/app/customers` | Already in `customer-table.tsx` |
| `/app/appointments` | Already in `appointment-table.tsx` |
| `/app/availability` | Applied inline in page |
| `/app/availability/blocks` | Applied inline in page |

### Layer 3: Responsive column visibility

Non-essential columns are hidden on mobile via `hidden md:table-cell` class:

| Page | Always visible (mobile) | Hidden on mobile |
|---|---|---|
| `/admin/tenants` | Negócio, Status, Ações | Responsável, WhatsApp, Segmento, Cidade/UF, Plano, Assinatura, Vencimento, Criado em |
| `/admin/subscriptions` | Prestador, Status, Ações | Plano, Ciclo, Valor, Início, Vencimento, Último pagamento, Forma |
| `/admin/plans` | Plano, Status, Ações | Mensal, Anual, WhatsApp, Link público, Prestadores |
| `/admin/audit-logs` | Data/hora, Evento, Ações | Ator, Tenant, Descrição, IP |
| `/app/services` | Nome, Status, Ações | Categoria, Duração, Preço, Agendamento, Confirmação, Ordem |
| `/app/services/categories` | Nome, Serviços, Status, Ações | Descrição, Ordem |
| `/app/customers` | Nome, Status, Ações | Telefone, E-mail, Agendamentos, Criado em |
| `/app/appointments` | Data/hora, Cliente, Status, Ações | Telefone, Serviço, Origem, Valor estimado, Criado em |
| `/app/availability` | Dia, Início, Fim, Status, Ações | Intervalo |
| `/app/availability/blocks` | Início, Fim, Ações | Motivo, Criado por |

### Layer 4: Mobile card views (4 pages)

Critical pages have `md:hidden` card layouts alongside the `hidden md:block` desktop table:

- `/app/appointments` — Card per appointment: customer name, service, status badge, date+time, origin, "Ver" action
- `/app/customers` — Card per customer: name, phone, status badge, "Ver" action
- `/admin/tenants` — Card per tenant: name+slug, status badge, subscription badge, view/edit/suspend actions
- `/admin/audit-logs` — Uses responsive columns (no separate cards needed for log entries)

### Layer 5: Empty states (8 pages)

Replaced all `"Nenhum X cadastrado."` strings with `<EmptyState>`:

| Page | Icon | Title | Action |
|---|---|---|---|
| Services | `boxes` | Nenhum serviço cadastrado | Link to `/app/services/new` |
| Categories | `folder` | Nenhuma categoria cadastrada | Link to `/app/services/categories/new` |
| Customers | `users` | Nenhum cliente encontrado | Link to `/app/customers/new` |
| Appointments | `calendar` | Nenhum agendamento encontrado | Link to `/app/appointments/new` |
| Availability | `clock` | Nenhum horário configurado | Link to `/app/availability/new` |
| Blocks | `calendar` | Nenhum bloqueio cadastrado | None |
| Admin tenants | `users` | Nenhum prestador cadastrado | Link to `/admin/tenants/new` |
| Audit logs | `scroll` | Nenhum registro encontrado | None |

### Layer 6: Filter layouts (2 pages)

- `/app/appointments` — Filter form wrapped in `<ListToolbar>`
- `/admin/audit-logs` — Filter form wrapped in `<ListToolbar>`

### Layer 7: Standardized badges

- `/admin/audit-logs` — Event type now rendered with `<Badge variant="secondary">`
- `/admin/plans` — WhatsApp/Link columns use `<Badge variant="success">` for "Sim" and `<Badge variant="secondary">` for "Não"
- Row action buttons use `variant="ghost" size="sm"` consistently

## Patterns established

### String-based icon serialization
Both `EmptyState` and `ProviderMetricCard` use string-based icon names (not React components) for Server→Client Component boundary compatibility. The pattern:
1. Define a `const` array of literal icon names
2. Export a union type from it
3. Map strings to lucide components internally in the client component
4. Pass strings from server components

### TanStack Table responsive hiding
Column definitions use `meta: { className: "hidden md:table-cell" }`. Both `<TableHead>` and `<TableCell>` read from `header.column.columnDef.meta` / `cell.column.columnDef.meta` to apply the class.

### Mobile-first table/card pattern
```
<div className="space-y-3 md:hidden">    <!-- Mobile cards -->
<div className="hidden md:block">        <!-- Desktop table -->
```

## Business rules preserved
- All auth (requireTenantAccess, requireSuperAdmin, requireProviderManager, requireProviderOperator)
- All tenant isolation (queries scoped by tenantId/context)
- All permissions and subscription enforcement
- All server actions (create, edit, toggle status, delete)
- All Zod validations
- All filter query params

## Files modified (14)

### Reusable table components (5)
- `src/components/tables/tenant-table.tsx`
- `src/components/tables/subscription-table.tsx`
- `src/components/tables/plan-table.tsx`
- `src/components/tables/customer-table.tsx`
- `src/components/tables/appointment-table.tsx`

### Admin pages (2)
- `src/app/(admin)/admin/tenants/page.tsx`
- `src/app/(admin)/admin/audit-logs/page.tsx`

### Provider pages (6)
- `src/app/(provider)/app/services/page.tsx`
- `src/app/(provider)/app/services/categories/page.tsx`
- `src/app/(provider)/app/customers/page.tsx`
- `src/app/(provider)/app/appointments/page.tsx`
- `src/app/(provider)/app/availability/page.tsx`
- `src/app/(provider)/app/availability/blocks/page.tsx`

### New files (4)
- `src/components/ui/empty-state.tsx`
- `src/components/ui/row-actions.tsx`
- `src/components/ui/list-toolbar.tsx`
- `docs/design/data-tables-responsive-lists.md`

## Validation

```
pnpm typecheck  ✓ (0 errors)
pnpm lint      ✓ (0 errors, 0 warnings)
pnpm test       ✓ (180 passed, 16 files)
pnpm build      ✓ (63 routes compiled)
```
