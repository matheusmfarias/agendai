# Design System Foundation — AgendaZap

**Phase 16 — Visual Identity & Design System Foundation**
**Date:** 2026-06-26

---

## Overview

This document describes the design system foundation implemented in Phase 16. It covers tokens, components, typography, and usage guidelines. For the visual direction and rationale, see [Visual Identity](./visual-identity.md).

---

## Tokens

All tokens are defined in `src/app/globals.css` as CSS custom properties under `:root`, then registered in Tailwind v4's `@theme inline` block. This makes them available as Tailwind utility classes (e.g., `bg-primary`, `text-muted-foreground`, `border-border`).

### Color tokens

#### Surface & text (background, foreground, card, popover)

| Token | CSS Variable | Usage |
|---|---|---|
| `background` | `--background` | Page background |
| `foreground` | `--foreground` | Primary text |
| `card` | `--card` | Card, modal, sheet backgrounds |
| `card-foreground` | `--card-foreground` | Text on cards |
| `popover` | `--popover` | Popover, dropdown backgrounds |
| `popover-foreground` | `--popover-foreground` | Text on popovers |

#### Primary (terracotta)

| Token | CSS Variable | Usage |
|---|---|---|
| `primary` | `--primary` | Primary buttons, links, active states |
| `primary-foreground` | `--primary-foreground` | Text on primary backgrounds |

#### Secondary (warm stone)

| Token | CSS Variable | Usage |
|---|---|---|
| `secondary` | `--secondary` | Secondary buttons, subtle backgrounds |
| `secondary-foreground` | `--secondary-foreground` | Text on secondary backgrounds |

#### Muted (paper variation)

| Token | CSS Variable | Usage |
|---|---|---|
| `muted` | `--muted` | Muted backgrounds, zebra striping |
| `muted-foreground` | `--muted-foreground` | Secondary text, captions, metadata |

#### Accent (terracotta light)

| Token | CSS Variable | Usage |
|---|---|---|
| `accent` | `--accent` | Hover states, subtle highlights |
| `accent-foreground` | `--accent-foreground` | Text on accent backgrounds |

#### Semantic

| Token | CSS Variable | Usage |
|---|---|---|
| `destructive` | `--destructive` | Error, destructive actions |
| `destructive-foreground` | `--destructive-foreground` | Text on destructive |
| `success` | `--success` | Success, active, completed |
| `success-foreground` | `--success-foreground` | Text on success |
| `warning` | `--warning` | Warnings, attention needed |
| `warning-foreground` | `--warning-foreground` | Text on warning |
| `info` | `--info` | Informational states |
| `info-foreground` | `--info-foreground` | Text on info |

#### Borders & inputs

| Token | CSS Variable | Usage |
|---|---|---|
| `border` | `--border` | All borders (default) |
| `input` | `--input` | Input borders |
| `ring` | `--ring` | Focus rings |

#### Sidebar (deep green)

| Token | CSS Variable | Usage |
|---|---|---|
| `sidebar` | `--sidebar` | Sidebar background |
| `sidebar-foreground` | `--sidebar-foreground` | Sidebar text |
| `sidebar-primary` | `--sidebar-primary` | Sidebar primary (logo, icons) |
| `sidebar-primary-foreground` | `--sidebar-primary-foreground` | Text on sidebar primary |
| `sidebar-accent` | `--sidebar-accent` | Sidebar hover/active |
| `sidebar-accent-foreground` | `--sidebar-accent-foreground` | Text on sidebar accent |
| `sidebar-border` | `--sidebar-border` | Sidebar internal borders |
| `sidebar-ring` | `--sidebar-ring` | Sidebar focus rings |

### Shadow tokens

| Token | CSS Variable | Value |
|---|---|---|
| Card | `--shadow-card` | `0 1px 2px oklch(0.18 0.005 70 / 4%), 0 2px 6px oklch(0.18 0.005 70 / 5%)` |
| Elevated | `--shadow-elevated` | `0 2px 4px oklch(0.18 0.005 70 / 4%), 0 4px 12px oklch(0.18 0.005 70 / 6%)` |

### Radius tokens

| Token | Value | Usage |
|---|---|---|
| `--radius` | `0.75rem` (12px) | Default — cards, modals |
| `--radius-sm` | `calc(var(--radius) - 4px)` (8px) | Smaller elements |
| `--radius-md` | `calc(var(--radius) - 2px)` (10px) | Buttons, inputs |
| `--radius-lg` | `0.75rem` (12px) | Large cards |
| `--radius-xl` | `calc(var(--radius) + 4px)` (16px) | Extra large |

### Typography tokens

| Token | CSS Variable | Font stack |
|---|---|---|
| `--font-sans` | `font-sans` | Inter, ui-sans-serif, system-ui, -apple-system, sans-serif |
| `--font-display` | `font-display` | Lora, Georgia, ui-serif, serif |
| `--` | `` | JetBrains Mono, ui-monospace, monospace |

---

## Components

### Button (`src/components/ui/button.tsx`)

CVA-based component with 6 variants and 3 sizes.

**Variants:**

| Variant | Usage | Visual |
|---|---|---|
| `default` | Primary actions | Terracotta fill, white text, subtle shadow |
| `secondary` | Secondary actions | Warm stone background, dark warm text |
| `outline` | Tertiary actions, navigation | Border, transparent background |
| `ghost` | Subtle actions, icon buttons | No border, hover shows accent background |
| `destructive` | Dangerous actions | Red fill, white text, subtle shadow |
| `quiet` | Minimal emphasis, links | Muted text, underline on hover |

**Sizes:** `default` (h-10), `sm` (h-9), `icon` (size-10)

**Focus:** All variants show `ring-2 ring-ring ring-offset-2` on focus-visible.

**Disabled:** `opacity-50` with `pointer-events-none`.

### Card (`src/components/ui/card.tsx`)

Multi-part card component: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.

**Visual:** White background, rounded-xl, warm beige border, subtle asymmetric shadow (`var(--shadow-card)`).

**Spacing:** `py-6` on Card, `px-6` on CardHeader/CardContent. Internal gap between header and content is `gap-6` via flex-col.

### Badge (`src/components/ui/badge.tsx`)

CVA-based component with 7 variants.

| Variant | Usage | Background | Text |
|---|---|---|---|
| `default` | Primary status | `bg-primary` | `text-primary-foreground` |
| `secondary` | Neutral category | `bg-secondary` | `text-secondary-foreground` |
| `outline` | Low emphasis | Transparent | `text-foreground` |
| `destructive` | Error, canceled | `bg-destructive` | `text-destructive-foreground` |
| `warning` | Attention, pending | `bg-warning/15` | `text-warning-foreground` |
| `success` | Active, done | `bg-success/15` | `text-success` |
| `info` | Informational | `bg-info/15` | `text-info` |

**Important:** Badge variants no longer use hardcoded Tailwind colors (`amber-100`, `emerald-100`). All variants use semantic tokens.

### Alert (`src/components/ui/alert.tsx`)

Bordered box component with 5 variants.

| Variant | Usage | Border | Background | Text |
|---|---|---|---|---|
| `default` | General info | `border-border` | `bg-muted/50` | `text-foreground` |
| `success` | Success feedback | `border-success/30` | `bg-success/10` | `text-success` |
| `destructive` | Error feedback | `border-destructive/30` | `bg-destructive/5` | `text-destructive` |
| `warning` | Warning feedback | `border-warning/40` | `bg-warning/10` | `text-warning-foreground` |
| `info` | Informational | `border-info/30` | `bg-info/10` | `text-info` |

### Input (`src/components/ui/input.tsx`)

- Height: `h-10`
- Border: `border-input`, rounded-md
- Background: `bg-background` (was `bg-transparent` — now uses background so it's visible on muted surfaces)
- Focus: `border-primary/40` + `ring-2 ring-ring/20`
- Placeholder: `text-muted-foreground`
- Disabled: `opacity-50 bg-muted/50 cursor-not-allowed`

### Select, Textarea

Same styling pattern as Input.

### Checkbox (`src/components/ui/checkbox.tsx`)

- Size: `size-4`
- Accent color: `accent-primary` (terracotta)
- Focus: `ring-2 ring-ring/20 ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`

### TableContainer (`src/components/ui/table-container.tsx`)

Responsive wrapper for tables. Wraps a `<Table>` with `overflow-x-auto` so wide tables scroll horizontally instead of breaking the layout.

```tsx
<TableContainer>
  <Table>...</Table>
</TableContainer>
```

The existing `<Table>` component already includes an inner `overflow-x-auto` wrapper. `TableContainer` adds a border and rounded corners around the scrollable area.

### Label (`src/components/ui/label.tsx`)

Radix-based label with:
- Flex row with gap for inline checkboxes
- `text-sm font-medium leading-none`
- Peer-disabled states

---

## Typography usage

### Inter (body — default)

100% of body text. Automatically applied via `body { font-family: var(--font-sans) }` in globals.css.

### Lora (display)

Use sparingly via `font-display` class:
- PageHeading titles (future redesign)
- Provider name on `/[tenantSlug]`
- `ConfirmationStamp` component

### JetBrains Mono (utility/data)

Use via `` class:
- API tokens in typebot credentials page
- Time values in tables
- Appointment codes/IDs

---

## Accessibility baseline

- **Focus visible:** All interactive elements show a visible focus ring (`focus-visible:ring-2`) using the terracotta `--ring` token.
- **Contrast:** The palette maintains WCAG AA contrast ratios for text:
  - Foreground on background: ~13:1
  - Primary on white: ~4.5:1
  - Muted text on background: ~5:1
- **Reduced motion:** `ConfirmationStamp` respects `prefers-reduced-motion`:
  - `motion-safe:-rotate-3` for the stamp rotation
- **Disabled states:** All form elements use consistent `opacity-50` with `cursor-not-allowed`.
- **Screen reader:** `sr-only` text on icon-only buttons (existing pattern).

---

## How to apply in next phases

### Phase 17+ — Screen redesigns

When redesigning specific screens:
1. Do NOT introduce new color values. Use existing tokens only.
2. Use `font-display` (Lora) only for page-level titles and the provider name.
3. Use `ConfirmationStamp` only in booking confirmation and onboarding completion.
4. Use `TableContainer` for any new table page.
5. Use the `warning` and `info` Alert variants instead of inline Tailwind classes.

### Adding new components

When adding new UI components:
1. Use `--border` for borders (not hardcoded gray).
2. Use `--ring` for focus rings (not hardcoded blue).
3. Use semantic tokens for status colors (`--success`, `--warning`, `--destructive`, `--info`).
4. Define CVA variants following the pattern of existing components.

---

## Dark mode

A `.dark` block exists in `globals.css` with token values mapped for dark mode, but dark mode is **not yet implemented** in the product. It will be activated in a future phase.

---

## Related

- [Visual Identity](./visual-identity.md) — concept, personality, palette rationale
- [Provider Dashboard Experience](./provider-dashboard-experience.md) — provider shell and dashboard redesign
- [Data Tables & Responsive Lists](./data-tables-responsive-lists.md) — table components and responsive patterns
- [Admin Experience](./admin-experience.md) — admin cockpit redesign
- [Provider Operations UX](./provider-operations-ux.md) — provider form sections, microcopy, and help callouts
- [Public Experience Conversion Redesign](./public-experience-conversion-redesign.md) — Phase 24 — refined public booking pages
- [Microcopy, Empty States & Error States](./microcopy-empty-error-states.md) — success/error/loading messages, confirmation dialogs, empty states, and enum labels
- [Frontend Diagnostic](../diagnostics/diagnostico-frontend-2026-06-26.md) — problems that motivated this work
- [Screen Inventory](../diagnostics/inventario-telas-2026-06-26.md) — all screens and redesign priorities
