# Provider Dashboard Experience — AgendaZap

**Phase 19 — Provider Dashboard & App Shell Redesign**
**Date:** 2026-06-29

---

## Objective

Redesenhar o dashboard do prestador para transformá-lo de uma página administrativa genérica com métricas de mesmo peso em uma central de operação diária clara, hierárquica e útil.

---

## Screens redesigned

| Route | Description |
|---|---|
| `/app/dashboard` | Dashboard principal do prestador — hero operacional, status, agenda, canais, métricas |
| Shell components | Sidebar, header, shell — refinados visualmente (compartilhados com admin) |

---

## New components

| Component | Path | Purpose |
|---|---|---|
| `ProviderDashboardHero` | `src/features/provider-dashboard/provider-dashboard-hero.tsx` | Hero card with business name (Lora), location, status badge, contextual CTA |
| `ProviderSubscriptionNotice` | `src/features/provider-dashboard/provider-subscription-notice.tsx` | Subscription warning with semantic Alert variants per warning level |
| `ProviderOnboardingCard` | `src/features/provider-dashboard/provider-onboarding-card.tsx` | Onboarding card with left border accent; SKIPPED state rendered as outline |
| `ProviderTodayCard` | `src/features/provider-dashboard/provider-today-card.tsx` | Today's agenda: time in JetBrains Mono, customer + service, origin badge |
| `ProviderNextAppointments` | `src/features/provider-dashboard/provider-next-appointments.tsx` | Future appointments list with date/time, customer, service, status badge, origin badge, empty state with CTA |
| `ProviderChannelStatus` | `src/features/provider-dashboard/provider-channel-status.tsx` | Three channels (link público, WhatsApp/Typebot, painel manual) with ready/pending/blocked indicators |
| `ProviderMetricCard` | `src/features/provider-dashboard/provider-metric-card.tsx` | Compact metric: icon, label, value; optional link |
| `ProviderConstants` | `src/features/provider-dashboard/provider-constants.ts` | Shared badge variant mappings and labels: origin, status |

## Modified components

| Component | Path | Changes |
|---|---|---|
| Dashboard page | `src/app/(provider)/app/dashboard/page.tsx` | Complete restructure: hero → alerts → two-column (appointments \| channels) → metrics; removed PageHeading and 12-metric grid |
| Provider layout | `src/app/(provider)/app/layout.tsx` | Passes `subtitle="Painel do prestador"` to DashboardShell |
| Provider repository | `src/server/repositories/provider-repository.ts` | Added `slug`, `city`, `state`, `plan.publicLinkEnabled`, `plan.whatsappEnabled`, `_count.availabilityRules`, `_count.typebotCredentials` |
| Appointment repository | `src/server/repositories/appointment-repository.ts` | Upcoming query switched from `include` to `select` with `origin` field |
| `DashboardShell` | `src/components/layout/dashboard-shell.tsx` | Optional `subtitle` prop; explicit `bg-background` |
| `DashboardSidebar` | `src/components/layout/dashboard-sidebar.tsx` | "AgendaZap" name now uses `font-display` (Lora) |
| `DashboardHeader` | `src/components/layout/dashboard-header.tsx` | Optional `subtitle` prop replaces hardcoded "Fundação operacional do AgendaZap"; defaults to "Painel de gestão" |
| `PageHeading` | `src/components/layout/page-heading.tsx` | Optional `useDisplayFont` prop for Lora titles; defaults to false |

---

## Design decisions

### Layout hierarchy

The dashboard now follows operational priority:

1. **Hero** — Business name in Lora, city/state badge, operational status, contextual CTA
2. **Status alerts** — Tenant suspension, subscription warnings, onboarding card — ordered by severity
3. **Main area (desktop 2-col)** — Left 2/3: today's agenda + next appointments; Right 1/3: channel status + compact metrics
4. **Mobile** — All cards stack vertically in priority order

### Contextual CTA logic

The hero button changes based on the provider's state:
- Onboarding not completed → "Continuar configuração" → `/app/onboarding`
- Subscription BLOCKED → "Ver situação da assinatura" → `/app/subscription`
- Everything ready → "Novo agendamento" → `/app/appointments/new`
- Fallback → "Ver agenda" → `/app/appointments`

### Typography

- **Lora (`font-display`):** Business name in hero card, "AgendaZap" in sidebar
- **Inter (`font-sans`):** All body text, labels, headings
- **JetBrains Mono (``):** Times and dates (tabular-nums) in appointment lists

### Color usage

| Element | Color |
|---|---|
| Hero business name | Foreground (Lora) |
| Operational ready badge | Badge success |
| Pending/onboarding badge | Badge warning |
| Restricted badge | Badge destructive |
| Primary CTA | Deep green (`--primary`) |
| SKIPPED onboarding CTA | Outline |
| WARNING subscription | Alert warning |
| CRITICAL/BLOCKED subscription | Alert destructive |
| Channel ready dot | `--success` |
| Channel pending dot | `--warning` |
| Channel blocked dot | `--destructive` |
| Status CONFIRMED | Badge success |
| Status REQUESTED | Badge info |
| Status WAITING_INFO | Badge warning |
| Origin PUBLIC_LINK | Badge info |
| Origin WHATSAPP | Badge success |
| Origin MANUAL_PANEL | Badge secondary |

### Appointment list improvements

Replaced generic table with scannable lists:
- Today's appointments: time (left, mono), customer + service, origin badge
- Future appointments: date + time, customer + service, status badge, origin badge
- Each item clickable (links to `/app/appointments/[id]`)

### Channel status

Three channels shown with visual status indicators:
- **Link público:** ready (green check) when has services + availability + subscription allows
- **WhatsApp/Typebot:** informational only; "Configurado pela plataforma" or "Ainda não configurado"
- **Painel manual:** always ready

### Empty states

Each card has a useful empty state with actionable CTA:
- No appointments today → "Os agendamentos de hoje aparecerão aqui conforme forem marcados."
- No upcoming appointments → "Criar agendamento manual" button

---

## Business rules preserved

- **Tenant isolation:** All queries scoped by `context.tenantId` via `requireTenantAccess()`
- **Subscription enforcement:** Uses `getProviderSubscriptionWarning()` and `getSubscriptionPolicy()` — no policy changes
- **Onboarding:** Card visibility per status (COMPLETED→hidden); links to `/app/onboarding` preserved
- **Permissions:** OWNER/ADMIN/MEMBER behavior unchanged via `requireTenantAccess()`
- **Logout:** `logoutAction` in `DashboardHeader` unchanged
- **All navigation links preserved:** Dashboard, Agenda, Serviços, Clientes, Horários, Configurações, Assinatura
- **Real data only:** No mock or filler data

## What was NOT changed

- Prisma schema or migrations
- Typebot API endpoints
- Subscription policy module
- Onboarding wizard logic or checklist service
- Appointment creation
- Public link or booking flow
- CUSTOMER flow

---

## Limitations (out of scope)

- No redesign of data tables (agenda, services, customers)
- No pagination, search, or sorting
- No visual calendar
- No drag-and-drop scheduling
- No Google Calendar integration
- No WhatsApp Cloud API (only Typebot)
- No auto-billing or payment integration
- No logo upload
- No per-tenant theming
- No dark mode

---

## Related

- [Visual Identity](./visual-identity.md)
- [Design System Foundation](./design-system-foundation.md)
- [Auth Experience](./auth-experience.md)
- [Public Booking Experience](./public-booking-experience.md)
- [Subscription Enforcement](../technical/subscription-enforcement.md)
- [Provider Onboarding](../technical/provider-onboarding.md)
