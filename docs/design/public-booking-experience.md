# Public Booking Experience — AgendaZap

**Phase 18 — Public Booking Experience Redesign**
**Date:** 2026-06-29

---

## Objective

Redesenhar a experiência pública de agendamento do AgendaZap — o link público que o prestador compartilha com seus clientes. É a principal superfície comercial do produto e o que justifica o valor pago pelo SaaS.

---

## Screens redesigned

| Route | Description |
|---|---|
| `/[tenantSlug]` | Home page pública do prestador — hero + serviços |
| `/[tenantSlug]/services` | Listagem completa de serviços por categoria |
| `/[tenantSlug]/book` | Formulário de agendamento com stepper visual |
| `/[tenantSlug]/book/confirm` | Confirmação com ConfirmationStamp |

---

## New components

| Component | Path | Purpose |
|---|---|---|
| `PublicShell` | `src/features/public-booking/public-shell.tsx` | Consistent layout wrapper: off-white background, max-w-5xl, responsive padding |
| `PublicHero` | `src/features/public-booking/public-hero.tsx` | Business hero card: name in Lora, badges, description, CTAs |
| `ServiceCard` | `src/features/public-booking/service-card.tsx` | Improved service card: name, description, duration+price, booking mode badge, "Agendar" button |
| `BookingStepper` | `src/features/public-booking/booking-stepper.tsx` | Visual step indicator: Serviço → Horário → Dados |
| `BookingConfirmationCard` | `src/features/public-booking/booking-confirmation-card.tsx` | Confirmation card with ConfirmationStamp, summary, custom values, back button |

## Modified components

| Component | Path | Changes |
|---|---|---|
| `PublicBookingForm` | `src/features/public-booking/public-booking-form.tsx` | Alert for errors; improved auth banners; "Confirmar horário" button copy; custom fields grouped under label |
| `PublicCustomerAuthForms` | `src/features/public-booking/public-customer-auth-forms.tsx` | Alert for errors; cleaner card titles |
| `PublicUnavailablePage` | `src/features/public-booking/public-unavailable.tsx` | CalendarOff icon; centered card with shadow |

---

## Design decisions

### Typography

- **Lora (`font-display`):** used only for the business name in `PublicHero` (desktop hero title).
- **Inter (`font-sans`):** all body text, labels, service names, stepper labels, confirmation text.
- **JetBrains Mono (``):** not used in the public booking flow (no technical data exposed to customers).

### Color usage

| Element | Color |
|---|---|
| Primary CTA ("Agendar horário", "Agendar", "Confirmar horário") | Deep green (`--primary`) |
| Secondary CTA ("Ver serviços", "Voltar") | Outline |
| Destructive/errors | Alert destructive |
| Info/visitante anônimo | Alert info |
| Warning/admin logado | Alert warning |
| ConfirmationStamp | Brand terracota (`--brand-terra`) |
| Success (DIRECT booking mode) | Badge success |
| Info (REQUIRES_CONFIRMATION) | Badge info |
| Secondary (INFORMATIONAL) | Badge secondary |

### Booking mode labels

Human-readable labels replace the internal Prisma enum keys:

| Internal | Public label |
|---|---|
| `DIRECT` | Confirmação imediata |
| `REQUIRES_CONFIRMATION` | Aguarda confirmação |
| `INFORMATIONAL` | Contato para combinar |

### Stepper

Three steps shown only on the booking page:

```
① Serviço → ② Horário → ③ Dados
```

- Step circle: green filled when current, green check when completed
- Connector: shown only between steps on sm+
- No routing control — purely presentational

### ConfirmationStamp usage

The stamp appears on the confirmation page with contextual tone:
- `CONFIRMED` / `IN_PROGRESS` / `FINISHED` → tone `"confirmed"`
- `REQUESTED` / `WAITING_INFO` → tone `"received"`

---

## Business rules preserved

- **Tenant isolation:** all queries scoped by `tenantSlug`
- **Subscription enforcement:** `isTenantBookableForPublicLink()` and `canCreatePublicAppointmentForTenant()` unchanged
- **PublicLinkEnabled:** enforced by existing policy
- **CUSTOMER auth:** login/register via `public-customer-auth.ts` preserved
- **redirectTo:** preserved for auth forms and logout
- **Super Admin/provider blocking:** admin accounts cannot confirm public bookings
- **Appointment creation:** origin `PUBLIC_LINK`, `createdByUserId = null`
- **Custom fields:** same schema and payload, just better visual grouping
- **Availability:** same slot calculation, no client-side slot logic
- **Blocks/conflicts:** unchanged
- **Status:** `publicStatusForBookingMode()` unchanged

## What was NOT changed

- Prisma schema or migrations
- Endpoint Typebot API
- Auth actions or session logic
- Subscription policy
- Onboarding wizard

---

## Limitations (out of scope)

- No logo upload, custom branding, or domain customization
- No payment integration
- No customer-side cancellation or rescheduling
- No marketplace or global provider search
- No dark mode
- No WhatsApp Cloud API (only Typebot integration)

---

## Phase 24 updates

In Phase 24 (Public Experience Conversion Redesign), the public booking experience was refined with more human, contextual design:

- **Home page:** 5-section structure — Hero, HowItWorks, Featured Services, All Services, Footer
- **Services page:** Compact header with category-aware grouping via `ServiceCategorySection`
- **ServiceCard:** Booking-mode-aware CTAs, featured variant, Clock icon for duration
- **PublicBookingForm:** Submit button text aligned to booking mode
- **New components:** `PublicFooter`, `ServiceCategorySection`. O antigo `PublicHowItWorks` foi removido em ajuste mobile-first posterior para priorizar a lista de serviços.

See [Public Experience Conversion Redesign](./public-experience-conversion-redesign.md) for full details.

---

## Related

- [Public Experience Conversion Redesign](./public-experience-conversion-redesign.md) — Phase 24 — conversion-focused refinement
- [Visual Identity](./visual-identity.md)
- [Design System Foundation](./design-system-foundation.md)
- [Auth Experience](./auth-experience.md)
- [Subscription Enforcement](../technical/subscription-enforcement.md)
