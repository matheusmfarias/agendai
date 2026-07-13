# Technical - Customer Portal

## Objective

Document the architecture, data flow, and technical decisions behind the customer portal (`/cliente`), which gives `CUSTOMER` users a logged-in area to manage their profile, view appointment history, and review completed services.

---

## Route group: `(customer)`

The customer portal lives in a dedicated route group `src/app/(customer)/` with its own compact layout — it does NOT use `DashboardShell` or any provider/admin layout component.

```
src/app/(customer)/
├── layout.tsx                    # CustomerLayout — requireCustomer() guard, compact header
├── cliente/
│   ├── page.tsx                  # Home dashboard
│   ├── perfil/
│   │   └── page.tsx              # Profile + avatar upload
│   ├── agendamentos/
│   │   ├── page.tsx              # Appointment history list
│   │   └── [id]/
│   │       └── page.tsx          # Appointment detail + review
```

### Reserved slug protection

The segment `cliente` is reserved and cannot be used as a tenant slug. This is enforced at two levels:

1. **Zod validation** (`src/features/tenants/tenant-schemas.ts`): `RESERVED_SLUGS` set includes `"cliente"`, checked via `.refine()` on `slugSchema`.
2. **Middleware proxy** (`src/proxy.ts`): `RESERVED_PUBLIC_SEGMENTS` includes `"cliente"`, preventing Next.js from routing it as a `[tenantSlug]` dynamic segment.

---

## Auth helper: `requireCustomer()`

Located in `src/features/auth/permissions.ts`:

```ts
export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/cliente");
  }
  if (String(user.globalRole) !== "CUSTOMER") {
    redirect("/access-denied");
  }
  return user;
}
```

Behavior:
- **Not authenticated** → redirect to `/login?redirectTo=/cliente` (so they return after login)
- **Authenticated but not CUSTOMER** → redirect to `/access-denied`
- **CUSTOMER** → returns user object (id, name, email, globalRole, avatarUrl)

---

## Data model additions

### User model

Two new optional fields added to the `User` model:

| Field | Type | Purpose |
|---|---|---|
| `avatarUrl` | `String?` | URL path to the uploaded avatar file |
| `avatarFileKey` | `String?` | Internal file key used by the avatar API route |

### AppointmentReview model

New model for customer reviews of completed appointments:

| Field | Type | Constraints |
|---|---|---|
| `id` | `String` | PK, UUID |
| `tenantId` | `String` | FK → Tenant |
| `appointmentId` | `String` | FK → Appointment, `@unique` |
| `userId` | `String` | FK → User (the reviewer) |
| `rating` | `Int` | 1–5 |
| `comment` | `String?` | Optional, max 1000 chars |
| `createdAt` | `DateTime` | Auto |

Indexes: unique on `appointmentId` (one review per appointment).

---

## Repository layer

### `src/server/repositories/customer-portal-repository.ts`

Appointment queries are scoped to the authenticated customer's ownership in
`Appointment.customerUserId`:

| Function | Query pattern |
|---|---|
| `getCustomerProfile(userId)` | `prisma.user.findUnique({ where: { id: userId }, select: { id, name, email, phone, avatarUrl, avatarFileKey } })` |
| `listCustomerAppointments(userId)` | `prisma.appointment.findMany({ where: { customerUserId: userId }, include: { tenant, service, review }, orderBy: { startsAt: "desc" } })` |
| `getCustomerAppointment(userId, appointmentId)` | Same scope but single record; explicitly omits `internalNotes`, `events`, and audit metadata |
| `findReviewByAppointment(appointmentId)` | `prisma.appointmentReview.findUnique({ where: { appointmentId } })` |
| `createAppointmentReview(data)` | `prisma.appointmentReview.create(...)` |
| `updateCustomerProfile(userId, data)` | `prisma.user.update({ where: { id: userId }, data: { name, phone } })` |
| `updateCustomerAvatar(userId, data)` | `prisma.user.update({ where: { id: userId }, data: { avatarUrl, avatarFileKey } })` |

### Data isolation guarantees

- CUSTOMER **only** sees appointments where `appointment.customerUserId === userId`; `Customer.userId` is not an authorization source
- The portal intentionally aggregates the authenticated owner's appointments across tenants; every row retains its own `tenantId` and tenant relation
- The aggregate list does not accept a tenant identifier controlled by the client; tenant scoping is explicit on surfaces that have tenant context, including public confirmation and provider operations
- Detail queries **never** include `internalNotes`, `appointmentEvents`, or audit metadata
- Reviews are verified: only the appointment owner can create a review for it

---

## Server actions

### `src/server/actions/customer-portal-actions.ts`

| Action | Validation | Side effects |
|---|---|---|
| `updateCustomerProfileAction` | `name`: 2-100 chars, `phone`: 8-30 chars (Zod) | Updates `User`, `revalidatePath("/cliente/perfil")`, redirects with `?success=profile-updated` |
| `updateCustomerAvatarAction` | File type: jpeg/png/webp, size ≤ 2MB | Saves to `storage/uploads/customer-avatars/${userId}-${timestamp}.${ext}`, updates DB, `revalidatePath` |
| `createAppointmentReviewAction` | `appointmentId` valid, `rating` 1-5 int, `comment` optional ≤ 1000 chars | Verifies ownership, FINISHED status, no duplicate. Creates review, redirects with `?success=reviewed-1` |

### Avatar upload flow

1. Client component (`CustomerAvatarUpload`) uses `useActionState` wrapping `updateCustomerAvatarAction`
2. Server action validates file type (extension + MIME check) and size
3. Generates safe filename: `${userId}-${Date.now()}.${ext}` (prevents path traversal, collisions via timestamp)
4. Writes to `storage/uploads/customer-avatars/` via `fs/promises`
5. Updates `User.avatarUrl` and `User.avatarFileKey` in DB
6. Falls back to `User.name` initials when no avatar exists

### Review creation flow

1. Client component (`AppointmentReviewForm`) uses `useTransition` + `useState` for star rating
2. Server action verifies:
   - Appointment exists and belongs to the authenticated customer
   - Status is `FINISHED` (cannot review pending/active/canceled)
   - No existing review (unique constraint on `appointmentId`)
3. Creates `AppointmentReview` record
4. Redirects with `?success=reviewed-1` to prevent double submission on refresh

---

## Avatar API route

### `src/app/api/customer/avatar/[fileKey]/route.ts`

- **Method**: GET
- **Path traversal protection**: `fileKey` validated against `/^[a-zA-Z0-9._-]+$/`
- **Content-Type**: Set dynamically based on file extension (`image/jpeg`, `image/png`, `image/webp`)
- **Caching**: `Cache-Control: public, max-age=86400` (24 hours)
- **File path**: `storage/uploads/customer-avatars/${fileKey}`

---

## Client components

### `CustomerAvatarUpload`
- **Pattern**: `useActionState` (matches existing codebase convention)
- Accepts `action` (server action) and `hasAvatar` (boolean for button label)
- File input accepts `image/jpeg,image/png,image/webp`
- Pending state: `LoaderCircle` spinner + "Enviando..."
- Button labels: "Enviar foto" (no avatar) / "Alterar foto" (has avatar)

### `CustomerProfileForm`
- **Pattern**: `useState` + `useTransition` (matches existing codebase convention)
- Editable: name (text), phone (tel)
- Read-only: email (disabled input with muted styling)
- `FormFeedback` for server-side errors
- Pending state: `LoaderCircle` spinner + "Salvando perfil..." / "Salvar perfil"

### `AppointmentReviewForm`
- **Pattern**: `useState` + `useTransition`
- 5 clickable stars with hover preview (Lucide `Star` icons, `fill-yellow-400`)
- Comment textarea with character counter (max 1000)
- Pending state: `LoaderCircle` spinner + "Enviando..." / "Enviar avaliação"
- Used only when appointment is FINISHED and no review exists

---

## Provider review visibility

In `src/app/(provider)/app/appointments/[id]/page.tsx`, a review card is displayed between the "Observações internas" and "Atualizar status" cards when a review exists. It shows:

- Star rating (★ characters, 1-5)
- Rating number
- Comment text (if provided)
- Review date

The review is read-only for providers — no response or moderation features exist.

---

## Public flow integration

### Login page (`/login`)
- CUSTOMER users already logged in see a "Ir para meus agendamentos" primary button (Link to `/cliente/agendamentos`)
- Secondary logout button available to switch accounts

### Public booking form
- Authenticated CUSTOMER users see a banner with their name, email, and a "Meus agendamentos" link to `/cliente/agendamentos`
- Non-CUSTOMER administrative users see a warning alert (cannot confirm public bookings)

---

## Business rules preserved

All existing rules remain unchanged:
- Session auth (cookie httpOnly, sameSite lax)
- Global roles (SUPER_ADMIN, USER, CUSTOMER separation)
- Tenant isolation (all queries scoped, no cross-tenant access)
- Public booking flow (PUBLIC_LINK origin, createdByUserId=null for anonymous)
- Typebot API endpoints (unchanged)
- Subscription enforcement (unchanged)
- Availability/blocks/conflicts (unchanged)
- Appointment status machine (no new transitions)

---

## Verification

```bash
pnpm typecheck  # tsc --noEmit — 0 errors
pnpm lint       # ESLint — 0 errors, 0 warnings
pnpm test       # Vitest — 180 tests pass (16 files)
pnpm build      # Next.js production build — successful
```

---

## Out of scope

- Customer cancel/reschedule appointments
- Chat, notifications, email, WhatsApp integration
- Public display of reviews, provider response, review moderation
- Average rating aggregation
- Account deletion, LGPD/data erasure
- S3/R2/CDN for avatar storage
- Advanced crop/resize for avatars
