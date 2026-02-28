# Architecture Research

**Domain:** Group scheduling app — v1.1 Notifications & Calendar Export
**Researched:** 2026-02-28
**Confidence:** HIGH — all integration points derived from direct codebase inspection

---

## Context: What Already Exists

This document answers integration questions for v1.1 against the shipped v1.0 codebase. The existing architecture works as follows:

- **Route Handlers** handle all API calls (auth endpoints need HTTP status codes for 401/429)
- **Server Actions** handle mutations that live inside authenticated creator context (`confirmTime`, `deleteEvent`)
- **Resend + React Email** already wired for magic link emails — pattern is established and working
- **Neon HTTP driver** means `db.batch()` for atomics; no `db.transaction()` support
- **participants.email** column already exists in schema (nullable); it is currently only written when a magic link is requested

The v1.0 `participants` table already has the email column. The `events` table does NOT have a `creatorEmail` column. That is the primary schema addition needed.

---

## Standard Architecture

### System Overview

```
Browser (React)
    │
    ├─ POST /api/events          ← add creatorEmail field
    ├─ POST /api/participants/join  ← add optional email field
    ├─ POST /api/availability    ← add "all responded" check + conditional notify
    ├─ Server Action: confirmTime  ← add bulk participant notification send
    └─ GET  /api/events/[id]/calendar.ics  ← NEW Route Handler
         │
         ▼
    Next.js App Router (Vercel / Node)
         │
         ├─ src/lib/notifications.ts  ← NEW: shared email dispatch helpers
         ├─ src/emails/               ← NEW: 2 email templates
         └─ src/lib/schema.ts         ← MODIFIED: add creatorEmail + allRespondedAt
              │
              ▼
         Neon Postgres + Drizzle ORM
              │
              └─ Resend (email delivery)
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| `src/lib/schema.ts` | DB schema definitions | Modified — add 2 columns to events |
| `src/app/api/events/route.ts` | Event creation POST handler | Modified — accept + store creatorEmail |
| `src/app/api/participants/join/route.ts` | Participant join POST handler | Modified — accept + store optional email |
| `src/app/api/availability/route.ts` | Save availability POST handler | Modified — trigger "all responded" check |
| `src/lib/actions/confirm-time.ts` | Server Action: creator confirms slot | Modified — send participant notifications |
| `src/lib/notifications.ts` | Resend dispatch helpers | New — reusable email send functions |
| `src/emails/all-responded-email.tsx` | Email: all responded notification to creator | New |
| `src/emails/time-confirmed-email.tsx` | Email: confirmed time notification to participants | New |
| `src/app/api/events/[id]/calendar.ics/route.ts` | .ics file Route Handler | New |
| `src/app/e/[id]/page.tsx` | Event page | Modified — add calendar export UI block |
| `src/components/create-event-form.tsx` | Home page event creation form | Modified — add optional email input |
| `src/components/identity/pin-sheet.tsx` or `name-sheet.tsx` | Participant join UI | Modified — add optional email input |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── events/
│   │   │   ├── route.ts              # Modified: accept creatorEmail
│   │   │   └── [id]/
│   │   │       └── calendar.ics/
│   │   │           └── route.ts      # New: .ics download handler
│   │   ├── availability/
│   │   │   └── route.ts              # Modified: all-responded check after POST
│   │   └── participants/
│   │       └── join/
│   │           └── route.ts          # Modified: accept + store participant email
│   └── e/[id]/
│       └── page.tsx                  # Modified: calendar export UI after confirmed status
├── emails/
│   ├── magic-link-email.tsx          # Existing
│   ├── all-responded-email.tsx       # New
│   └── time-confirmed-email.tsx      # New
├── lib/
│   ├── schema.ts                     # Modified: creatorEmail + allRespondedAt on events
│   ├── notifications.ts              # New: sendAllRespondedEmail, sendTimeConfirmedEmail
│   └── actions/
│       └── confirm-time.ts           # Modified: send participant emails after DB update
└── components/
    ├── create-event-form.tsx          # Modified: optional email field
    ├── calendar-export.tsx            # New: .ics button + Google Calendar link
    └── identity/
        └── pin-sheet.tsx              # Modified: optional email input after PIN setup
```

### Structure Rationale

- **`src/lib/notifications.ts`:** Centralizes all Resend calls so `availability/route.ts` and `confirm-time.ts` import the same function signatures. Avoids duplicating `new Resend(...)` instantiation and `from:` address config.
- **`src/app/api/events/[id]/calendar.ics/route.ts`:** A Route Handler, not a Server Action, because .ics download requires setting `Content-Type: text/calendar` and `Content-Disposition` response headers — not achievable from a Server Action.
- **`src/emails/`:** Follows the established React Email pattern from `magic-link-email.tsx`. Keep all email templates here.

---

## Architectural Patterns

### Pattern 1: "All Responded" Check Inside POST /api/availability

**What:** After saving slots in the existing `POST /api/availability` handler, run a count query to check if every current participant has a non-null `submittedAt`. If yes, and if the creator has an email and `allRespondedAt` is still null, send the notification and stamp `allRespondedAt`.

**When to use:** The check belongs here because this is the only place that transitions a participant from "not submitted" to "submitted". It already updates `submittedAt` on the participant row, so the check is naturally co-located.

**Why not a separate action or webhook:** Timely has no background job queue and no event bus. Adding a separate trigger mechanism would require infrastructure that doesn't exist. The synchronous check after the DB update is the right fit for this scale.

**Trade-offs:**
- Adds one extra query per availability save (count of unsubmitted participants) — negligible at this scale
- If email send fails, the slot save still succeeds (fire-and-forget is acceptable here; the creator is not blocked if Resend has a transient error)

**Example:**

```typescript
// src/app/api/availability/route.ts — after the db.batch() and submittedAt update

// "All responded" notification gate
const event = await db.query.events.findFirst({ where: eq(events.id, session.eventId) })

if (event && event.creatorEmail && !event.allRespondedAt) {
  const unsubmitted = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.eventId, session.eventId),
        isNull(participants.submittedAt)
      )
    )

  if (unsubmitted.length === 0) {
    // All participants have submitted — stamp flag and send email
    await db
      .update(events)
      .set({ allRespondedAt: new Date() })
      .where(eq(events.id, session.eventId))

    // Fire-and-forget — do not await; slot save already succeeded
    sendAllRespondedEmail({
      creatorEmail: event.creatorEmail,
      eventTitle: event.title,
      eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/e/${session.eventId}`,
      participantCount: /* total count fetched above */,
    }).catch((err) => console.error('[notifications] all-responded email failed:', err))
  }
}
```

### Pattern 2: Idempotency via DB Timestamp Flag (`allRespondedAt`)

**What:** Add `allRespondedAt timestamp` column to the `events` table. The "all responded" notification is sent only once: when the flag is null at check time and all participants have submitted. The flag is set to the current timestamp immediately before sending.

**When to use:** Whenever a notification must fire exactly once despite multiple possible triggers (e.g., participant A saves → all responded → send; then participant A edits and saves again → still all responded but flag is already set → skip).

**Why DB flag over Redis key:** Timely already uses Neon as the source of truth for all event state. A DB column is simpler to query alongside the event row, survives Redis evictions, and doesn't require a separate TTL strategy. Redis keys with TTL would be wrong here — the flag must persist for the lifetime of the event.

**Why not a `notificationSentAt` column:** `allRespondedAt` is semantically richer — it records when the threshold was crossed, which is useful for debugging and future features (e.g., "all responded X hours ago").

**Trade-offs:**
- Requires a migration to add the column
- The check is a DB read on every availability save — one lightweight query, acceptable

### Pattern 3: Confirmed-Time Notification in Server Action

**What:** In the existing `confirmTime` Server Action, after the `db.update` that sets `confirmedSlot` and `status = 'confirmed'`, fetch all participants with non-null emails and send the confirmed-time notification to each.

**When to use:** This is the correct location because `confirmTime` is already the authoritative mutation for the "confirmed" transition. The notification is part of the same semantic operation, not a side effect to route elsewhere.

**Why Server Action is fine here (unlike PIN verification):** The confirmed-time notification does not need an HTTP status code — it is initiated by the creator via a client component, not via a direct HTTP API call that needs 401/429 semantics. The Server Action pattern (`'use server'`) is appropriate.

**Fire-and-forget strategy:** Do not `await` the email sends inside the Server Action. If Resend fails transiently, the event is still confirmed and the creator should not see an error. Log failures server-side.

**Example:**

```typescript
// src/lib/actions/confirm-time.ts — after the db.update

// Fetch participants with email for confirmed-time notifications
const eligibleParticipants = await db
  .select({ email: participants.email, name: participants.name })
  .from(participants)
  .where(
    and(
      eq(participants.eventId, eventId),
      isNotNull(participants.email)
    )
  )

if (eligibleParticipants.length > 0) {
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${eventId}`
  // Fire-and-forget — confirmation already committed
  Promise.all(
    eligibleParticipants.map((p) =>
      sendTimeConfirmedEmail({
        to: p.email!,
        participantName: p.name,
        eventTitle: event.title,
        confirmedSlot: new Date(slotStart),
        eventUrl,
        eventTimezone: event.timezone,
      })
    )
  ).catch((err) => console.error('[notifications] confirmed-time email(s) failed:', err))
}
```

### Pattern 4: .ics Generation as Route Handler

**What:** A dedicated Route Handler at `GET /api/events/[id]/calendar.ics` generates and returns a valid iCalendar (.ics) file. The confirmed slot data is fetched from the DB, formatted per RFC 5545, and returned with appropriate headers.

**When to use:** Always use a Route Handler (not Server Action) when the response requires custom HTTP headers — in this case `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="event.ics"`.

**Library:** Use the `ics` npm package (maintained, RFC 5545 compliant, no native binaries). It generates a valid VEVENT string from a plain object. No alternatives needed — `ics` is the standard choice for Next.js + Node.

**Trade-offs:**
- Route Handler is publicly accessible — no auth required. Anyone with the event ID can download the .ics. This is correct behavior (the event is already public once you have the link).
- Must validate that `event.status === 'confirmed'` and `event.confirmedSlot` is non-null before generating; return 404 otherwise.

**Example:**

```typescript
// src/app/api/events/[id]/calendar.ics/route.ts
import { createEvent } from 'ics'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const event = await db.query.events.findFirst({ where: eq(events.id, params.id) })

  if (!event || event.status !== 'confirmed' || !event.confirmedSlot) {
    return new Response('Not found', { status: 404 })
  }

  const slot = event.confirmedSlot
  const { error, value } = createEvent({
    title: event.title,
    description: event.description ?? undefined,
    start: [slot.getUTCFullYear(), slot.getUTCMonth() + 1, slot.getUTCDate(),
            slot.getUTCHours(), slot.getUTCMinutes()],
    startInputType: 'utc',
    duration: { minutes: 30 },
  })

  if (error || !value) {
    return new Response('Failed to generate calendar file', { status: 500 })
  }

  return new Response(value, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(event.title)}.ics"`,
    },
  })
}
```

---

## Data Flow

### "All Responded" Notification Flow

```
Participant saves availability
    ↓
POST /api/availability
    ↓
db.batch() — delete old slots, insert new slots
    ↓
db.update participants.submittedAt = now()
    ↓
Check: event.creatorEmail set? AND event.allRespondedAt null?
    │
    ├── NO → return { success: true }
    │
    └── YES → COUNT participants WHERE submittedAt IS NULL
                  │
                  ├── count > 0 → return { success: true }  (not everyone done yet)
                  │
                  └── count = 0 → db.update events.allRespondedAt = now()
                                  → sendAllRespondedEmail() [fire-and-forget]
                                  → return { success: true }
```

### Confirmed-Time Notification Flow

```
Creator clicks "Confirm this time" in ConfirmTimeSheet
    ↓
confirmTime(eventId, slotStart) [Server Action]
    ↓
Verify creator cookie matches event.creatorToken
    ↓
db.update events SET confirmedSlot, status='confirmed'
    ↓
Fetch participants WHERE email IS NOT NULL
    ↓
Promise.all(sendTimeConfirmedEmail x N) [fire-and-forget]
    ↓
revalidatePath(`/e/${eventId}`)
    ↓
return { success: true }
```

### .ics Download Flow

```
User on confirmed event page clicks "Download .ics"
    ↓
Browser navigates to GET /api/events/[id]/calendar.ics
    ↓
Route Handler fetches event from DB
    ↓
Validates: status='confirmed' AND confirmedSlot NOT NULL
    ↓
ics.createEvent() generates RFC 5545 VCALENDAR string
    ↓
Response(value, { 'Content-Type': 'text/calendar', 'Content-Disposition': 'attachment' })
    ↓
Browser downloads file as [event-title].ics
```

### Google Calendar Link Flow

```
Confirmed event page renders
    ↓
Server Component computes Google Calendar URL from confirmedSlot
    ↓
URL: https://calendar.google.com/calendar/render?action=TEMPLATE
     &text=[title]&dates=[start/end in UTC]&details=[description]
    ↓
Rendered as anchor tag with target="_blank"
    ↓
User clicks → Google Calendar opens pre-filled in new tab
```

### Key Data Flows

1. **Email address collection (creator):** `CreateEventForm` → `POST /api/events` → stored in `events.creatorEmail`. Optional field; null if not provided.
2. **Email address collection (participant):** `PinSheet` (after PIN setup success, before redirect) → `POST /api/participants/join` (add email param) — OR as a secondary step in the join flow. See UX note below.
3. **Idempotency check:** Every `POST /api/availability` reads `events.allRespondedAt`. If already set, the notification block is skipped entirely with no extra queries.

---

## Schema Changes

### Modified: `events` table

Add two columns:

```typescript
// src/lib/schema.ts
export const events = pgTable('events', {
  // ... existing columns ...
  creatorEmail: text('creator_email'),                                    // NEW — nullable, for "all responded" notification
  allRespondedAt: timestamp('all_responded_at', { withTimezone: true }), // NEW — idempotency flag; null = not yet notified
})
```

Migration command: `npm run db:generate && npm run db:migrate`

### Unchanged: `participants` table

The `email` column already exists as `text('email')` (nullable). No schema change needed. The join flow (`/api/participants/join`) needs to accept and store the email if provided.

---

## Integration Points

### Modified Files

| File | Change | Rationale |
|------|--------|-----------|
| `src/lib/schema.ts` | Add `creatorEmail`, `allRespondedAt` to events | Required for idempotent "all responded" notification |
| `src/app/api/events/route.ts` | Accept optional `creatorEmail` in POST body | Persist creator email at event creation |
| `src/lib/validations.ts` | Add optional `creatorEmail: z.string().email().optional()` to createEventSchema | Validate email format |
| `src/app/api/participants/join/route.ts` | Accept optional `email` in POST body, store on participant row | Collect email at join time |
| `src/app/api/availability/route.ts` | After submittedAt update, run all-responded check | Trigger creator notification |
| `src/lib/actions/confirm-time.ts` | After db.update, fetch participant emails and send notifications | Trigger participant notifications |
| `src/components/create-event-form.tsx` | Add optional email input field | Collect creator email |
| `src/components/identity/pin-sheet.tsx` | Add optional email input after PIN setup (mode='setup') | Collect participant email |
| `src/app/e/[id]/page.tsx` | Add CalendarExport component when status='confirmed' | Expose .ics and Google Cal links |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/notifications.ts` | `sendAllRespondedEmail()` and `sendTimeConfirmedEmail()` — shared Resend wrappers |
| `src/emails/all-responded-email.tsx` | React Email template for creator notification |
| `src/emails/time-confirmed-email.tsx` | React Email template for participant notification |
| `src/app/api/events/[id]/calendar.ics/route.ts` | .ics download Route Handler |
| `src/components/calendar-export.tsx` | Client component: .ics download button + Google Calendar link |

---

## Build Order

Dependencies flow downward — each item can only be built once items above it are complete.

```
1. Schema migration
   └── Add creatorEmail + allRespondedAt to events table
       (participants.email already exists — no change)

2. Email templates (no deps — pure React components)
   ├── src/emails/all-responded-email.tsx
   └── src/emails/time-confirmed-email.tsx

3. Notification helpers (depends on: email templates)
   └── src/lib/notifications.ts
       sendAllRespondedEmail(), sendTimeConfirmedEmail()

4. Email collection — backend (depends on: schema migration)
   ├── src/lib/validations.ts — add creatorEmail to createEventSchema
   ├── POST /api/events — accept + store creatorEmail
   └── POST /api/participants/join — accept + store participant email

5. "All responded" trigger (depends on: schema migration + notification helpers)
   └── POST /api/availability — all-responded check after submittedAt update

6. Confirmed-time trigger (depends on: notification helpers)
   └── src/lib/actions/confirm-time.ts — send participant emails after confirm

7. .ics Route Handler (no auth deps — public endpoint)
   └── GET /api/events/[id]/calendar.ics

8. UI changes (depends on: backend changes above)
   ├── src/components/create-event-form.tsx — optional creatorEmail field
   ├── src/components/identity/pin-sheet.tsx — optional email field post-PIN-setup
   └── src/components/calendar-export.tsx — .ics + Google Calendar links

9. Wire calendar export into event page (depends on: CalendarExport component)
   └── src/app/e/[id]/page.tsx — render CalendarExport when status='confirmed'
```

---

## Anti-Patterns

### Anti-Pattern 1: Using Redis for the "All Responded" Idempotency Key

**What people do:** Store a Redis key like `timely:all-responded:{eventId}` to track whether the notification was sent.

**Why it's wrong:** Redis keys have TTLs and can be evicted. If the key expires and a participant later edits their availability, the notification fires a second time. The event's `allRespondedAt` column in Postgres persists for the full lifetime of the event with no eviction risk.

**Do this instead:** DB column `allRespondedAt timestamp` on the events table. Null = not yet sent. Stamped once, never cleared.

### Anti-Pattern 2: Awaiting Email Sends in the Critical Path

**What people do:** `await sendAllRespondedEmail(...)` inside `POST /api/availability`, making the client wait for Resend's HTTP round-trip before receiving `{ success: true }`.

**Why it's wrong:** Resend's API call adds 200-500ms latency to every successful save. If Resend is down, availability saves appear to fail from the user's perspective. The email is not part of the core transaction — the slot save should not be held hostage to it.

**Do this instead:** Fire-and-forget with `.catch()` for server-side logging. `sendEmail(...).catch(err => console.error(err))` — the save succeeds regardless.

### Anti-Pattern 3: Generating .ics in a Server Action

**What people do:** Use a Server Action to generate .ics content and return it as a data URL or blob URL from the client.

**Why it's wrong:** Server Actions cannot set response headers. The `Content-Type: text/calendar` and `Content-Disposition: attachment` headers are required for the browser to treat the response as a file download rather than navigation.

**Do this instead:** Route Handler at `/api/events/[id]/calendar.ics`. The browser navigates to this URL directly (anchor `href`), which triggers the download via the response headers.

### Anti-Pattern 4: Blocking the Confirm Action on Email Delivery

**What people do:** Await all participant email sends before returning from `confirmTime`, so the creator sees an error if any email fails.

**Why it's wrong:** If participant B provided an invalid email address, the creator's confirm action appears to fail — even though the event was confirmed. Participant notification failure should never roll back a confirmed event.

**Do this instead:** Fire-and-forget the `Promise.all(sends)`. Log failures. The event is confirmed whether emails deliver or not.

### Anti-Pattern 5: Collecting Participant Email in a Separate API Call Post-Join

**What people do:** Create a second endpoint (e.g., `POST /api/participants/email`) and call it after the join flow completes.

**Why it's wrong:** Adds a second network round-trip and a second point of failure. The email field is already in the `participants` table and the join endpoint already creates the row.

**Do this instead:** Add `email?: string` to the existing `/api/participants/join` POST body schema. The email is stored in the same DB write that creates the participant.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Resend | `new Resend(process.env.RESEND_API_KEY).emails.send(...)` | Already wired; reuse same pattern. From address must match verified domain. |
| Neon Postgres | Drizzle ORM via `@neondatabase/serverless` HTTP driver | No changes to DB connection. `db.batch()` for atomic multi-step writes. |
| Vercel Cron | `/api/cron/expire-events` runs daily at 3 AM UTC | No change needed — expired events are cleaned up before notification data matters. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `availability/route.ts` → `notifications.ts` | Direct import, async call | Fire-and-forget; no return value needed |
| `confirm-time.ts` (Server Action) → `notifications.ts` | Direct import, async call | Fire-and-forget; revalidatePath still runs |
| `calendar-export.tsx` → `/api/events/[id]/calendar.ics` | Browser anchor href navigation | No JS fetch needed; browser handles download |
| `e/[id]/page.tsx` → `CalendarExport` | Server Component → Client Component props | Pass `confirmedSlot` (string) and `eventTitle` as props |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k events | Current architecture handles everything. Fire-and-forget email is fine. |
| 1k-100k events | Email volume becomes a concern; batch sends if Resend rate limits apply. Still no background queue needed. |
| 100k+ events | Consider Vercel Background Functions or a job queue (e.g., Trigger.dev) to decouple email from the request path. |

### Scaling Priorities

1. **First bottleneck:** Resend rate limits if many events confirm simultaneously. Mitigation: use Resend's batch email API (`resend.batch.send([...])`) once it's needed.
2. **Second bottleneck:** The all-responded count query runs on every availability save. At high volume, add a partial index on `participants(eventId) WHERE submittedAt IS NULL`.

---

## Sources

- Direct codebase inspection of v1.0 shipped code (HIGH confidence)
- Resend documentation for batch sends: https://resend.com/docs/api-reference/emails/send-batch-emails (MEDIUM confidence — verified pattern exists)
- `ics` npm package README: https://github.com/adamgibbons/ics (HIGH confidence — established package, RFC 5545 compliant)
- Google Calendar URL scheme: https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md (MEDIUM confidence — community-maintained, widely used)
- RFC 5545 iCalendar format: https://tools.ietf.org/html/rfc5545 (HIGH confidence — official standard)
- Next.js Route Handler response headers: https://nextjs.org/docs/app/api-reference/file-conventions/route (HIGH confidence — official docs)

---
*Architecture research for: Timely v1.1 — Email Notifications & Calendar Export*
*Researched: 2026-02-28*
