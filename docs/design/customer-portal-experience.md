# Design - Customer Portal Experience

## Objective

Describe the user experience design of the customer portal at `/cliente`, where logged-in `CUSTOMER` users manage their profile, view appointment history, and review completed services. The portal uses a compact, focused layout — deliberately simpler than the provider/admin dashboards.

---

## Layout structure

### Compact header

The customer header is minimal compared to `DashboardShell`:

- **Desktop**: Logo "AgendaZap" in Lora font on the left, horizontal nav links (Meus agendamentos, Perfil), user name + logout button on the right
- **Mobile**: Logo centered at top, nav links as a bottom row with `border-t`, user name + logout inline

The layout uses `max-w-5xl` (narrower than admin `max-w-7xl`) with responsive horizontal padding (`px-4 sm:px-6 lg:px-8`).

### Visual identity

- Background: `bg-background` (matches the rest of the app)
- Typography: Headings use `font-display` (Lora), body text uses the default sans-serif
- Cards: Standard `Card`/`CardHeader`/`CardContent` pattern consistent with the rest of the app
- Spacing: `space-y-6` or `space-y-8` vertical rhythm

---

## Pages

### 1. Home (`/cliente`)

**Purpose**: Welcome dashboard — the first thing a CUSTOMER sees after login.

**Sections** (top to bottom):

1. **Greeting card**: Avatar (image or initials in a colored circle) + "Olá, {name}" + "Editar perfil" button
2. **Quick stats**: 3 cards in a grid — Total de agendamentos, Próximos, Concluídos
3. **Next appointment card**: 
   - Service name, tenant name, status badge
   - Date/time with Clock icon
   - "Ver detalhes" link
4. **Empty states**:
   - First-time customer (no appointments ever): Calendar icon, "Você ainda não tem agendamentos", explanation of how appointments appear
   - No upcoming (all finished/canceled): "Sem agendamentos futuros" with link to history
5. **CTA row**: "Ver agendamentos" primary button

**Status badges**: Color-coded — success (green) for FINISHED, destructive (red) for CANCELED/NO_SHOW, warning (amber) for IN_PROGRESS, outline (neutral) for others.

### 2. Profile (`/cliente/perfil`)

**Purpose**: Edit personal information and upload a profile photo.

**Sections**:

1. **Avatar card**: 
   - Left: 80px circle showing the user's photo or initials (first 2 name parts, uppercase)
   - Right: File input + submit button. Shows "Enviar foto" if no avatar, "Alterar foto" if one exists
   - Helper text: "JPEG, PNG ou WebP. Máximo 2 MB."
   - Spinner during upload: "Enviando..."
2. **Profile form**:
   - Name (text input, required, 2-100 chars)
   - Phone (tel input, required, 8-30 chars)
   - Email (disabled input, muted styling — read-only notice)
   - Submit button: "Salvar perfil" / "Salvando perfil..." with spinner
3. **Success alert**: Green banner on successful save ("Perfil atualizado")

### 3. Appointment history (`/cliente/agendamentos`)

**Purpose**: List all appointments grouped by status.

**Groups** (displayed in tabs or sections):

1. **Próximos**: Active appointments (not FINISHED, not canceled)
2. **Histórico**: FINISHED appointments
3. **Cancelados**: All canceled states (CANCELED_BY_CUSTOMER, CANCELED_BY_PROVIDER, NO_SHOW)

**Appointment cards** show:
- Service name (bold)
- Tenant name (muted)
- Date/time (Clock icon)
- Status badge
- Origin badge (PÚBLICO / WHATSAPP / MANUAL)
- Review indicator: gold star ★ if reviewed, "Disponível para avaliar" badge if FINISHED and unreviewed
- "Ver detalhes" link to appointment detail

**Empty state**: "Nenhum agendamento encontrado" when a group is empty.

### 4. Appointment detail (`/cliente/agendamentos/[id]`)

**Purpose**: View full appointment details and submit a review for completed services.

**Sections**:

1. **Summary card**: Definition list (`<dl>`) grid showing:
   - Prestador, Serviço, Data e hora, Duração, Status, Origem, Preço, Modo de agendamento
2. **Customer notes card**: Shows notes submitted during booking (or "Nenhuma observação")
3. **Custom field values card**: Shows field labels and their submitted values (or "Nenhuma informação adicional")
4. **Review section** (conditional):
   - **FINISHED + no review**: Review form with 5 clickable stars, comment textarea (1000 chars max), submit button
   - **FINISHED + has review**: Read-only review display — gold stars, comment, date. "Avaliação enviada. Obrigado pelo retorno." card
   - **Not FINISHED**: "Aguardando conclusão" card — explains that review will be available after the appointment is completed

**Star rating interaction**:
- 5 Star icons displayed horizontally
- Hover preview: stars turn gold (`fill-yellow-400`) on hover (shows what rating would be set)
- Click: sets the rating
- Selected rating persists visually

---

## Mobile responsiveness

All pages use responsive patterns established in the codebase:
- `grid gap-4 sm:grid-cols-2` or `sm:grid-cols-3` for stat grids
- `flex-col sm:flex-row` for header/greeting sections
- `sm:hidden` / `sm:flex` for navigation visibility
- Cards stack vertically on mobile, side-by-side on desktop
- Buttons remain full-width where appropriate on small screens

---

## Microcopy

| Context | Text |
|---|---|
| Home greeting | "Olá, {name}" |
| Profile heading | "Perfil" |
| Profile description | "Seus dados pessoais usados nos agendamentos." |
| Avatar description | "Uma foto ajuda os prestadores a te reconhecerem." |
| Avatar helper | "JPEG, PNG ou WebP. Máximo 2 MB." |
| Avatar button (no photo) | "Enviar foto" |
| Avatar button (has photo) | "Alterar foto" |
| Avatar pending | "Enviando..." |
| Profile button | "Salvar perfil" |
| Profile pending | "Salvando perfil..." |
| Email readonly | "O e-mail não pode ser alterado." |
| Appointments heading | "Meus agendamentos" |
| Appointments description | "Histórico completo dos seus agendamentos." |
| Empty appointments | "Nenhum agendamento encontrado" |
| First-time empty | "Você ainda não tem agendamentos" |
| First-time description | "Quando você agendar um serviço pelo link público de um prestador, ele aparecerá aqui." |
| No upcoming | "Sem agendamentos futuros" |
| No upcoming description | "Todos os seus agendamentos foram concluídos ou cancelados." |
| Review available | "Disponível para avaliar" |
| Review heading | "Sua avaliação" |
| Review submit | "Enviar avaliação" |
| Review pending | "Enviando..." |
| Review sent | "Avaliação enviada. Obrigado pelo retorno." |
| Awaiting completion | "Aguardando conclusão" |
| Awaiting description | "Você poderá avaliar este atendimento após a conclusão." |
| Provider review heading | "Avaliação do cliente" |
| CUSTOMER banner | "Você está agendando como {name}" |

---

## Empty states

1. **First-time customer** (no appointments ever): Calendar icon, encouraging message, explanation of the public booking flow
2. **No upcoming appointments** (all concluded): Informational message + link to view history
3. **No appointments in a filtered group**: "Nenhum agendamento encontrado"
4. **No avatar**: Colored circle with initials (first 2 name parts, uppercase)
5. **No review (awaiting)**: "Aguardando conclusão" with explanation
6. **No customer notes**: "Nenhuma observação"
7. **No custom fields**: "Nenhuma informação adicional"

---

## Loading states

- **Profile save**: "Salvando perfil..." with LoaderCircle spinner
- **Avatar upload**: "Enviando..." with LoaderCircle spinner
- **Review submission**: "Enviando..." with LoaderCircle spinner
- **Page transitions**: Handled by Next.js App Router (server-rendered)

---

## Accessibility

- All form inputs have associated `<Label>` elements
- Required fields marked with `*`
- Error messages associated with their inputs via `FieldError` components
- Color is not the only indicator of status — badges include text labels
- `alt` text on avatar images (user's name)
- Keyboard-navigable star rating (native radio/button behavior via `onClick`)

---

## Phase 27 / Booksy-inspired refinement

The customer portal is now treated as a continuation of the public booking
experience, not as an administrative dashboard.

Changes:

- `/cliente` and `/cliente/agendamentos` use lighter, more consumer-facing cards.
- Public pages expose "Entrar", "Minha conta" and "Meus agendamentos" entry points.
- Finished appointments can show "Agendar novamente" when the service and category are still active.
- Rebooking only links back to the public booking flow; it never creates an appointment automatically.
- Appointment detail keeps internal notes, audit events and administrative metadata hidden.

Related: [Booksy-inspired Public UX](./booksy-inspired-public-ux.md).
