# Public Experience Conversion Redesign — AgendaZap

**Phase 24 — Public Experience Conversion Redesign**
**Date:** 2026-06-29

---

## Objective

Refinar a experiência pública de agendamento para ser mais humana, contextual e conversora — um redesign da camada de apresentação das páginas públicas (`/[tenantSlug]`, `/[tenantSlug]/services`, `/[tenantSlug]/book`, `/[tenantSlug]/book/confirm`) sem alterar regras de negócio, consultas ou ações do servidor.

---

## What changed

### New components

| Component | Path | Purpose |
|---|---|---|
| `PublicHowItWorks` | Removido em ajuste mobile-first posterior | O fluxo foi simplificado para evitar bloco explicativo grande antes dos serviços |
| `PublicFooter` | `src/features/public-booking/public-footer.tsx` | Rodapé contextual com nome do negócio, localização, WhatsApp e links rápidos |
| `ServiceCategorySection` | `src/features/public-booking/service-category-section.tsx` | Agrupamento visual de serviços por categoria com título e grade responsiva |

### Redesigned components

| Component | Path | Changes |
|---|---|---|
| `PublicHero` | `src/features/public-booking/public-hero.tsx` | Removido "Agendamento online" genérico; substituído por segmento do negócio (se existir). Nome em Lora 3xl/4xl. Descrição contextual (ou fallback seguro). Row de localização/WhatsApp com ícones. CTAs: "Agendar um serviço" (primary) + "Ver serviços" (outline). Linha decorativa verde no topo. |
| `ServiceCard` | `src/features/public-booking/service-card.tsx` | Labels de booking mode humanizados ("Confirma na hora", "Aguarda confirmação", "Sob consulta"). CTAs contextuais por booking mode. Variante `featured` com tipografia maior e botão primary. Preço e duração como metadata row. Ícone Clock para duração. Divisor entre metadados e CTA. |
| `PublicBookingForm` | `src/features/public-booking/public-booking-form.tsx` | Botão de submit alinhado ao booking mode: "Confirmar horário" (DIRECT), "Solicitar agendamento" (REQUIRES_CONFIRMATION), "Enviar solicitação" (INFORMATIONAL). Loading text contextual por modo. |
| `PublicHero` | `src/features/public-booking/public-hero.tsx` | Removido "Agendamento online" genérico. Nome do negócio em Lora. CTAs contextuais. Linha decorativa. |

### Redesigned pages

#### `/[tenantSlug]` — Home page

Estrutura em 5 seções:
1. **Hero** — contexto do negócio, CTAs principais
2. **Como funciona** — 4 passos visuais com ícones
3. **Serviços em destaque** — primeiros 4 serviços com variante `featured` (ou "Serviços disponíveis" se < 4)
4. **Todos os serviços por categoria** — agrupados com `ServiceCategorySection`
5. **Footer** — dados do negócio, links rápidos, atribuição sutil

Comportamento por quantidade de serviços:
- ≥ 4 serviços: seção de destaque + seção completa por categoria
- < 4 mas > 0: "Serviços disponíveis" sem tratamento featured
- 0 serviços: card de estado vazio

#### `/[tenantSlug]/services` — Listagem completa

- Cabeçalho compacto: nome do negócio + título "Serviços" + subtítulo + botão voltar
- Listagem por categoria usando `ServiceCategorySection`
- Footer com `PublicFooter`

#### `/[tenantSlug]/book` — Agendamento

- Cabeçalho com nome do negócio + nome do serviço selecionado
- Stepper visual (Serviço → Horário → Dados)
- Seleção de serviço em cards com badges de booking mode
- Formulário com botão de submit alinhado ao booking mode

#### `/[tenantSlug]/book/confirm` — Confirmação

- Já bem estruturado desde a Phase 18; sem alterações significativas
- `BookingConfirmationCard` com headings contextuais por booking mode
- ConfirmationStamp, resumo do agendamento, observações, campos personalizados

---

## Design decisions

### Booking mode labels

Labels públicos humanizados (consistentes com ServiceCard):

| Internal | Public label | Badge variant |
|---|---|---|
| `DIRECT` | Confirma na hora | success |
| `REQUIRES_CONFIRMATION` | Aguarda confirmação | info |
| `INFORMATIONAL` | Sob consulta | secondary |

### Booking mode CTAs

CTAs contextuais que definem expectativa correta:

| Mode | Card CTA | Form submit |
|---|---|---|
| `DIRECT` | Escolher horário | Confirmar horário |
| `REQUIRES_CONFIRMATION` | Solicitar agendamento | Solicitar agendamento |
| `INFORMATIONAL` | Ver detalhes | Enviar solicitação |

### HowItWorks flow

4 passos numerados com ícones e descrições breves:
1. **Search** — Escolha o serviço desejado na lista de atendimentos disponíveis.
2. **Clock** — Escolha um horário livre que funcione para você.
3. **ListChecks** — Confirme seus dados e envie a solicitação de agendamento.
4. **CalendarCheck** — Acompanhe a confirmação do seu horário.

Grid responsiva: 2 colunas em sm, 4 colunas em lg.

### Footer design

- Nome do negócio em Lora (font-display)
- Row de localização e WhatsApp com ícones
- Links rápidos: "Ver serviços" + "Agendar"
- Atribuição sutil: "Agendamento online via AgendaZap"
- Separado visualmente do PublicShell (borda superior, bg-card)

### Hero simplification

- **Removido:** "Agendamento online" como eyebrow (genérico), badge de endereço (sobrecarga de informação)
- **Adicionado:** segmento como badge contextual, linha decorativa verde no topo, row de localização/WhatsApp
- **Mantido:** nome em Lora, descrição, CTAs

---

## Business rules preserved

- **Tenant isolation:** todas as consultas continuam escopadas por `tenantSlug`
- **Subscription enforcement:** `isTenantBookableForPublicLink()` e `canCreatePublicAppointmentForTenant()` inalterados
- **PublicLinkEnabled:** aplicado pela política existente
- **CUSTOMER auth:** login/register via `public-customer-auth.ts` preservado
- **redirectTo:** preservado para forms de auth e logout
- **Super Admin/provider blocking:** contas admin não podem confirmar agendamentos públicos
- **Appointment creation:** `origin = PUBLIC_LINK`, `createdByUserId = null`
- **Custom fields:** mesmo schema e payload
- **Availability:** mesmo cálculo de slots, sem lógica client-side
- **Blocks/conflicts:** inalterados
- **Status:** `publicStatusForBookingMode()` inalterado

## What was NOT changed

- Prisma schema, migrations
- Server actions, auth actions, session logic
- Subscription policy, tenant isolation
- API Typebot endpoints
- Onboarding wizard
- Provider dashboard (admin/app)

---

## Limitations (out of scope)

- No logo upload, custom branding, or domain customization
- No payment integration
- No customer-side cancellation or rescheduling
- No marketplace or global provider search
- No dark mode
- No WhatsApp Cloud API (only Typebot integration)

---

## Related

- [Public Booking Experience](./public-booking-experience.md) — Phase 18 — original public booking redesign
- [Booksy-inspired Public UX](./booksy-inspired-public-ux.md) — premium public/customer refinement
- [Visual Identity](./visual-identity.md) — color tokens, typography, personality
- [Design System Foundation](./design-system-foundation.md) — CSS tokens, Tailwind v4, shadcn/ui
- [Microcopy, Empty States & Error States](./microcopy-empty-error-states.md) — success/error/loading messages, confirmation dialogs
