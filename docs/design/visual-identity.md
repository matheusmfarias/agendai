# Visual Identity — AgendaZap

**Phase 16 — Visual Identity & Design System Foundation**
**Date:** 2026-06-26

---

## Concept

> **Agenda física elevada a digital.**

The AgendaZap interface evokes a well-organized agenda or ledger — clear, trustworthy, and close to the daily routine of local service providers. It is not a corporate dashboard. It is not a SaaS template.

---

## Personality

| Trait | Means |
|---|---|
| **Organized** | Clear hierarchy, predictable layout, clean data presentation |
| **Trustworthy** | Warm, grounded colors; stable forms; clear confirmation |
| **Proximal** | Language and visuals that feel close to small business owners — not enterprise |
| **Simple** | One primary action per screen; no visual noise; deliberate white space |
| **Confirmed** | The "carimbo" — a memorable confirmation moment that closes the loop |

---

## Palette

### Base colors

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| Background | `#FAF9F6` | `oklch(0.981 0.004 95)` | Page background — off-white paper |
| Surface | `#FFFFFF` | `oklch(1 0 0)` | Cards, elevated surfaces |
| Foreground | `#1C1C1C` | `oklch(0.18 0.005 70)` | Primary text — near black, warm |
| Muted text | `#6B6B6B` | `oklch(0.47 0.008 80)` | Secondary text, captions |
| Border | `#E5E3DF` | `oklch(0.91 0.01 95)` | Borders, dividers — warm beige |

### Accents

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| Terracotta | `#D44E2B` | `oklch(0.53 0.19 30)` | **Primary accent** — buttons, links, focus rings |
| Deep Green | `#2B5C4A` | `oklch(0.38 0.08 170)` | Sidebar, depth, success states |
| Mustard | `#F4B84A` | `oklch(0.79 0.14 80)` | Warnings, attention, warmth |

### Semantic

| Token | Use |
|---|---|
| Success | Confirmation, active states, completed items |
| Warning | Attention needed, pending review, subscription warnings |
| Info | Informational hints, status notes |
| Destructive | Errors, deletion, blocking, cancellation |

### Why this palette

Terracotta anchors the product in the material world of local trades (clay, leather, tools) without being decorative. Deep green provides depth and trust without the generic "SaaS green" that dominates the market. Mustard adds warmth and attention signals. The off-white paper background softens the interface without being warm-cream nostalgic.

This palette is **not** one of the three AI-generated defaults (cream + terracotta serif display, near-black + acid green, broadsheet hairline rules). The off-white is cooler than the cream cliché, the terracotta is pulled toward rust-red rather than warm orange, and the deep green sidebar replaces the near-black default.

---

## Typography

| Role | Family | Weights | CSS variable | Usage |
|---|---|---|---|---|
| Body | **Inter** | 400, 500, 600 | `--font-sans` | All body text, labels, tables, forms, UI |
| Display | **Lora** | 500, 600, 700 | `--font-display` | Page titles, provider name on public link, confirmation stamp |
| Mono | **JetBrains Mono** | 400 | `--` | Tokens, codes, IDs, time values |

### Rules

- **Inter is the default.** 100% of body text uses Inter. It was already the intended font but wasn't being applied (body was rendering Arial). This is now fixed.
- **Lora is used with restraint.** Only page-level titles, the provider name on the public landing page, and the `ConfirmationStamp` use Lora. This gives Lora the role of a distinctive display face, not a body font.
- **JetBrains Mono is for data.** API tokens, appointment times, codes — anything where precision and alignment matter.

### Typographic scale

| Class | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| Page title | `text-2xl` (1.5rem) | `font-semibold` (600) | `tracking-tight` | PageHeading h1 |
| Section title | `text-xl` (1.25rem) | `font-semibold` (600) | normal | Card titles |
| Card title | `font-semibold` | 600 | `leading-none` | CardTitle |
| Body | `text-sm` (0.875rem) | `font-normal` (400) | normal | Body text, table cells |
| Caption | `text-xs` (0.75rem) | `font-normal` (400) | normal | Detail labels, metadata |
| Data | ` text-sm` | 400 | normal | Tokens, time values, codes |

---

## Signature element — Confirmation Stamp

The **ConfirmationStamp** (`src/components/brand/confirmation-stamp.tsx`) is the single unique visual element of AgendaZap.

It renders as:
- Terracotta-colored text in Lora display
- A dashed border evoking a rubber stamp
- Subtle rotation (~3°) on devices that support motion
- Respects `prefers-reduced-motion` (no rotation when set)

**When to use it:**
- Booking confirmation page (`/[tenantSlug]/book/confirm`)
- Onboarding completion marker

**When NOT to use it:**
- Generic status badges
- Success alerts
- Every confirmation message
- Anywhere it would become decorative and lose meaning

The stamp should appear at most in 2–3 touchpoints in the entire product.

---

## What to avoid

- Generic SaaS green (#22c55e, emerald-500, etc.) as primary accent
- Blue as the only interactive color
- Near-black (`#0a0a0a`) backgrounds for sidebars
- Overly decorative serif body text
- Paper textures, folded corners, literal "agenda" skeuomorphism
- Excessive gradients, glow effects, or shadows
- Animations that don't respect `prefers-reduced-motion`
- Using the ConfirmationStamp outside its designated touchpoints
- Dark mode implementation (planned for later phase)

---

## Related

- [Design System Foundation](./design-system-foundation.md) — tokens, components, usage guidelines
- [Frontend Diagnostic](../diagnostics/diagnostico-frontend-2026-06-26.md) — problems that motivated this direction
- [Screen Inventory](../diagnostics/inventario-telas-2026-06-26.md) — all screens and their priorities
