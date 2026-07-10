# Provider Operations UX — AgendaZap

**Phase 22 — Provider Operations UX**
**Date:** 2026-06-29

---

## Objective

Melhorar a experiência operacional do prestador dentro do painel do AgendaZap, transformando formulários técnicos e CRUDs em rotinas guiadas de operação do negócio, com seções visuais, microcopy humana e help callouts contextuais.

---

## Screens reviewed (18)

| Route | Description |
|---|---|
| `/app/settings` | Dados do negócio — identidade, contato, descrição |
| `/app/services` | Listagem de serviços do catálogo |
| `/app/services/new` | Novo serviço com formulário em seções |
| `/app/services/[id]` | Detalhe do serviço com custom fields renomeados |
| `/app/services/[id]/edit` | Edição de serviço |
| `/app/services/categories` | Categorias de serviços |
| `/app/services/categories/new` | Nova categoria |
| `/app/services/categories/[id]/edit` | Edição de categoria |
| `/app/customers` | Listagem de clientes |
| `/app/customers/new` | Novo cliente |
| `/app/customers/[id]` | Detalhe do cliente com histórico |
| `/app/customers/[id]/edit` | Edição de cliente |
| `/app/appointments` | Agenda com filtros |
| `/app/appointments/new` | Novo agendamento manual |
| `/app/appointments/[id]` | Detalhe do agendamento |
| `/app/appointments/[id]/edit` | Edição de agendamento |
| `/app/availability` | Horários de atendimento |
| `/app/availability/blocks` | Bloqueios de agenda |

---

## New components

| Component | Path | Purpose |
|---|---|---|
| `OperationFormSection` | `src/features/provider-operations/operation-form-section.tsx` | Visual section divider for provider forms with title, optional description, and children |
| `HelpCallout` | `src/features/provider-operations/help-callout.tsx` | Subtle blue contextual help block for decision points in forms |
| `SharedLabelConstants` | `src/features/provider-operations/shared-label-constants.ts` | Human-readable labels for bookingMode, priceType, appointment origin and status |

---

## Forms reorganized

### ServiceForm (`src/components/forms/service-form.tsx`)

Reorganized from flat grid into 4 sections:

1. **Identificação do serviço** — name, category, description
2. **Tempo e preço** — duration, position, priceType, priceValue
3. **Como o cliente agenda** — bookingMode with HelpCallout explaining each mode, manual confirmation
4. **Informações adicionais** — internal notes

bookingMode options now use human labels from `BOOKING_MODE_LABELS`:
- `DIRECT` → "Confirmação imediata"
- `REQUIRES_CONFIRMATION` → "Precisa de confirmação"
- `INFORMATIONAL` → "Apenas informativo"

priceType options now use human labels from `PRICE_TYPE_LABELS`:
- `FIXED` → "Preço fixo"
- `STARTING_AT` → "A partir de"
- `ON_REQUEST` → "Sob consulta"
- `HIDDEN` → "Não mostrar preço"

### ProviderSettingsForm (`src/components/forms/provider-settings-form.tsx`)

Reorganized from single flat grid into 3 sections:

1. **Identidade do negócio** — business name, responsible name
2. **Contato e localização** — email, WhatsApp, segment, city, state, address
3. **Descrição pública** — business description with guidance text

### CustomerForm (`src/components/forms/customer-form.tsx`)

Reorganized into 2 sections:

1. **Dados do cliente** — name, phone, email
2. **Observações internas** — notes with explanation that they don't appear to the customer

### AppointmentForm (`src/components/forms/appointment-form.tsx`)

Reorganized from flat grid into 5 sections:

1. **Cliente** — customer selection
2. **Serviço** — service selection
3. **Data e horário** — startsAt, calculatedEnd, status, estimatedPrice with guidance + HelpCallout about conflicts
4. **Observações** — customer notes and internal notes
5. **Encaixe** — allowOutsideAvailability with guidance text

### ServiceCategoryForm (`src/components/forms/service-category-form.tsx`)

Added section with contextual description explaining categories as catalog organization.

### AvailabilityRuleForm (`src/components/forms/availability-rule-form.tsx`)

Added section with HelpCallout explaining slot interval calculation: "Com intervalo de 30 minutos, o cliente verá opções como 09:00, 09:30 e 10:00."

---

## Microcopy improvements

### Page descriptions

| Page | Before | After |
|---|---|---|
| Services list | "Gerencie o catálogo de serviços do seu negócio." | "Gerencie os atendimentos que você oferece. Eles aparecem no link público e no WhatsApp quando estão ativos." |
| Services new | "Cadastre um item no catálogo." | "Cadastre um atendimento no catálogo. Quando ativo, ele aparece no link público e no WhatsApp." |
| Categories | "Organize os serviços do catálogo." | "Agrupe serviços parecidos para facilitar a escolha do cliente no link público." |
| Categories empty | "Use categorias para organizar seus serviços no catálogo." | "Crie categorias como 'Manutenção', 'Estética' ou 'Consultas' — qualquer divisão que faça sentido para seu atendimento." |
| Customers | "Cadastre clientes e consulte seu histórico no prestador." | "Clientes aparecem aqui quando você cria agendamentos ou quando eles usam seu link público." |
| Appointments | "Consulte e mantenha os agendamentos do prestador." | "Acompanhe quem está agendado, confirme agendamentos e gerencie os atendimentos do dia a dia." |
| Availability | "Configure as faixas semanais recorrentes." | "Defina quando seus clientes podem encontrar horários disponíveis no link público e WhatsApp." |
| Blocks | "Registre períodos sem atendimento." | "Use bloqueios para impedir agendamentos em períodos específicos, como folgas, feriados ou compromissos." |
| Settings | "Configurações do negócio" / "Atualize os dados exibidos…" | "Dados do negócio" / "Essas informações ajudam seus clientes a reconhecerem seu negócio no link público e nos agendamentos." |

### Custom fields renamed

| Before | After |
|---|---|
| "Campos personalizados" | "Informações que o cliente deve preencher" |
| "Informações que poderão ser solicitadas ao cliente futuramente." | "Use esses campos para pedir dados importantes antes do atendimento, como preferências ou observações." |

---

## Visual hierarchy

Forms now follow a consistent pattern:

1. `OperationFormSection` with `fieldset`/`legend` semantics
2. Section title in `text-sm font-semibold`
3. Optional description in `text-xs text-muted-foreground`
4. Fields in responsive grid (`grid gap-5 md:grid-cols-2`)
5. 8px vertical spacing between sections (`space-y-8`)

HelpCallout uses:
- `border-blue-200 bg-blue-50 text-blue-800` — subtle blue tone
- `rounded-md border px-4 py-3 text-sm` — compact, doesn't dominate

---

## Shared label constants

All human-readable labels are centralized in `src/features/provider-operations/shared-label-constants.ts`:

- `BOOKING_MODE_LABELS` — Confirmação imediata / Precisa de confirmação / Apenas informativo
- `BOOKING_MODE_HELP` — Explanations for each booking mode
- `PRICE_TYPE_LABELS` — Preço fixo / A partir de / Sob consulta / Não mostrar preço
- `PRICE_TYPE_HELP` — Explanations for each price type
- `PROVIDER_ORIGIN_LABELS` — Link público / WhatsApp / Painel manual / Admin
- `PROVIDER_STATUS_LABELS` — Todos os status de agendamento em linguagem humana

These are used by `ServiceForm` and available for future use in appointment detail and listing pages.

---

## What was preserved

- **Auth:** All `requireProviderManager()`, `requireProviderOperator()`, `requireProviderAccess()` — unchanged
- **Tenant isolation:** All queries scoped by `context.tenantId` — unchanged
- **Permissions:** OWNER/ADMIN/MEMBER rules — unchanged
- **Subscription enforcement:** No policy changes
- **Onboarding:** Flow untouched
- **Server actions:** All existing server actions — unchanged
- **Zod validations:** All schemas — unchanged
- **Custom fields:** Schema, payload, keys — unchanged
- **Booking mode:** All three modes preserved, only labels changed
- **Price type:** All four types preserved, only labels changed
- **Appointment state machine:** All transitions preserved
- **Availability:** All rules, calculations, conflicts — unchanged
- **Schedule blocks:** All rules, validations — unchanged
- **Typebot API:** All endpoints — unchanged
- **Public booking:** All links and pages — unchanged
- **Prisma schema:** No changes
- **Migrations:** None created

---

## What was NOT implemented (out of scope)

- Calendário visual
- Drag and drop
- Remarcação pelo cliente
- Cancelamento pelo cliente
- Pagamento / cobrança
- Notificações / alertas
- Integração Google Agenda
- Upload de logo
- Temas por tenant
- Novas permissões
- Alterações de Prisma / migrations
- Novos endpoints
- Nova máquina de status de agendamento
- Alteração de disponibilidade / bloqueios

---

## Patterns

### Form section pattern

```tsx
<OperationFormSection
  title="Identificação do serviço"
  description="Nome, categoria e descrição que aparecerão no link público e no WhatsApp."
>
  <div className="grid gap-5 md:grid-cols-2">
    {/* fields */}
  </div>
</OperationFormSection>
```

### Help callout pattern

```tsx
<HelpCallout>
  Com intervalo de 30 minutos, o cliente verá opções como 09:00, 09:30
  e 10:00 no link público e WhatsApp.
</HelpCallout>
```

### Human labels pattern

```tsx
import { BOOKING_MODE_LABELS } from "@/features/provider-operations/shared-label-constants";

// In select:
{Object.entries(BOOKING_MODE_LABELS).map(([value, label]) => (
  <option key={value} value={value}>{label}</option>
))}
```

---

## Files created (3)

- `src/features/provider-operations/operation-form-section.tsx`
- `src/features/provider-operations/help-callout.tsx`
- `src/features/provider-operations/shared-label-constants.ts`

---

## Files modified (24)

**Form components (5):**
- `src/components/forms/service-form.tsx` — Section reorganization, human labels, HelpCallout
- `src/components/forms/provider-settings-form.tsx` — Section reorganization, better microcopy
- `src/components/forms/customer-form.tsx` — Section reorganization, better labels
- `src/components/forms/appointment-form.tsx` — Section reorganization, HelpCallout, guidance text
- `src/components/forms/service-category-form.tsx` — Section with catalog context
- `src/components/forms/availability-rule-form.tsx` — Section, HelpCallout about intervals

**Provider pages (18):**
- `src/app/(provider)/app/settings/page.tsx` — Title "Dados do negócio", better description
- `src/app/(provider)/app/services/page.tsx` — Better description
- `src/app/(provider)/app/services/new/page.tsx` — Better description
- `src/app/(provider)/app/services/[id]/page.tsx` — Custom fields renamed, description improved
- `src/app/(provider)/app/services/[id]/edit/page.tsx` — Better description
- `src/app/(provider)/app/services/categories/page.tsx` — Better description, empty state
- `src/app/(provider)/app/services/categories/new/page.tsx` — Better description
- `src/app/(provider)/app/services/categories/[id]/edit/page.tsx` — Better description
- `src/app/(provider)/app/customers/page.tsx` — Better description
- `src/app/(provider)/app/customers/new/page.tsx` — Better description
- `src/app/(provider)/app/customers/[id]/page.tsx` — Better header with status
- `src/app/(provider)/app/customers/[id]/edit/page.tsx` — Better description
- `src/app/(provider)/app/appointments/page.tsx` — Better description
- `src/app/(provider)/app/appointments/new/page.tsx` — Better description
- `src/app/(provider)/app/appointments/[id]/page.tsx` — Better card titles, data display
- `src/app/(provider)/app/appointments/[id]/edit/page.tsx` — Better description
- `src/app/(provider)/app/availability/page.tsx` — Better description
- `src/app/(provider)/app/availability/new/page.tsx` — Better description
- `src/app/(provider)/app/availability/[id]/edit/page.tsx` — Better description
- `src/app/(provider)/app/availability/blocks/page.tsx` — Better description, empty state

---

## Documentation created

- `docs/design/provider-operations-ux.md` (this file)

---

## Validations

```
pnpm typecheck  ✓ (0 errors)
pnpm lint      ✓ (0 errors, 0 warnings)
pnpm test       ✓ (180 passed, 16 files)
pnpm build      ✓ (63 routes compiled)
```
