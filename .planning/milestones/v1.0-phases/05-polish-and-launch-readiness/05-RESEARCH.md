# Phase 5: Polish and Launch Readiness - Research

**Researched:** 2026-02-19
**Domain:** Abuse prevention, data obligations, empty/error states, accessibility, cross-browser
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Privacy notice — placement
- Two-touch approach: a brief inline note directly below the create-event submit button, plus a full /privacy page
- Footer on all pages should link to /privacy

#### Privacy notice — inline copy
- Data-focused, factual tone: "Events and all responses expire automatically after 30 days. No accounts required."
- No marketing language — just the facts

#### Privacy notice — /privacy page structure
- Standard structured sections: data collected, how it's stored, retention policy (30-day auto-expiry), your rights (delete via creator token flow), and a contact method
- Plain English throughout — no legalese
- Contact method: Claude's discretion (pick what makes sense for a no-account tool)

#### Creator delete — access point
- Separate /e/[id]/manage page — not cluttering the public event page
- A "Manage event" link visible only when the creator cookie is present on the event page

#### Creator delete — confirmation UX
- Simple confirmation dialog: "Delete this event? This cannot be undone." with Cancel / Delete buttons
- No type-to-confirm required — the confirmation dialog is sufficient for this app's tone

#### Creator delete — post-deletion
- Redirect to / (home / create-event page) after deletion
- Show a toast: "Event deleted."

#### Creator delete — cookie loss
- Accepted v1 limitation: if creator loses their cookie (incognito, device switch, manual clear), they lose manage access
- Document this clearly on the /e/[id]/manage page: "If you've lost access, events expire automatically in 30 days."
- No recovery path in this phase

### Claude's Discretion
- Empty state copy and visual design for all off-path screens (no-responses-yet, event-not-found, expired-event, link-already-used, rate-limit screens)
- Error state copy for all error paths
- Exact accessibility audit scope and ARIA label patterns
- Contact method format on /privacy page
- Honeypot field implementation detail

### Deferred Ideas (OUT OF SCOPE)
- Creator link in URL (e.g. /e/[id]?creator=[token]) to re-set cookie after loss — future phase or v1.1 improvement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SECR-03 | Events auto-expire 30 days after the last candidate date | Vercel Cron Job (daily, Hobby-plan compatible) triggers a Route Handler that calls `db.delete(events).where(lt(events.expiresAt, new Date()))`. Cascade delete on all child tables already defined in schema. `expiresAt` column already exists on events table. |
| SECR-04 | Event creation endpoint is rate-limited to prevent spam | Already fully implemented in Phase 1 Plan 02: `eventCreationRatelimit` in `src/lib/rate-limit.ts`, applied in `src/app/api/events/route.ts`. No additional work needed — verification step only. |
</phase_requirements>

---

## Summary

Phase 5 covers six distinct workstreams: (1) event auto-expiry via Vercel Cron, (2) creator-initiated manual delete, (3) honeypot spam prevention on event creation, (4) privacy notice placement and /privacy page, (5) empty and error state design across all off-path screens, and (6) an accessibility audit pass. Most workstreams are additive — they layer new files or small additions onto what already exists. The one cross-cutting concern is the toast-after-redirect pattern for "Event deleted." which requires the cookie-based approach since `redirect()` in a Server Action discards any in-flight state.

SECR-04 (rate limiting on event creation) is already complete from Phase 1. It needs only a verification step. SECR-03 (auto-expiry) requires a new `vercel.json` cron configuration and a Route Handler at `/api/cron/expire-events` — the schema already has `expiresAt` on the events table and CASCADE DELETE on all child tables, so the deletion itself is a single Drizzle statement. The Hobby plan limits crons to once per day, which is acceptable: events accumulate within a 37-day window and daily sweeps are sufficient.

The creator delete flow requires a new `/e/[id]/manage` Server Component page, a Server Action that verifies the creator cookie, deletes the event (cascading to all children), clears the creator cookie, and redirects to `/`. Because `redirect()` terminates execution, the "Event deleted." toast must be conveyed via a short-lived cookie that a layout-level component reads on the next render and fires the Sonner toast. This pattern is the standard solution for toast-after-redirect in Next.js App Router.

**Primary recommendation:** Use Vercel Cron + Drizzle `lt(events.expiresAt, now)` for SECR-03; cookie-based toast for the delete redirect; shadcn AlertDialog for the confirmation dialog; `focus-visible:` Tailwind classes throughout for accessibility rings; `not-found.js` segment files for event-not-found and expired-event states.

---

## Standard Stack

### Core (all already installed — no new dependencies except AlertDialog)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | `db.delete().where(lt(...))` for expiry sweep | Already chosen; `lt()` is the correct operator for timestamp comparison |
| @upstash/ratelimit | 2.0.8 | Event creation rate limit — already implemented | Already in use; SECR-04 is done |
| next/navigation `redirect` | Next.js 16.1.6 | Redirect after delete Server Action | Built-in; must be called outside try/catch |
| next/headers `cookies` | Next.js 16.1.6 | Read creator cookie in Server Action; write flash-toast cookie | Built-in async API; `await cookies()` required in Next.js 15+ |
| sonner | 2.0.7 | Toast for "Event deleted." post-redirect | Already installed and rendering via `<Toaster>` in layout |
| shadcn AlertDialog | (via radix-ui) | Confirmation dialog for delete | **New install required**: `npx shadcn@latest add alert-dialog` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns `lt` / `new Date()` | 4.1.0 | Drizzle `lt(events.expiresAt, new Date())` in cron handler | Already installed; use drizzle-orm's `lt` operator, not date-fns |
| lucide-react | 0.574.0 | Icons for empty states (e.g., `Calendar`, `Clock`, `AlertCircle`) | Already installed |
| next/notFound | Built-in | Trigger not-found.tsx for expired/missing events | Already used in event page |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron | Upstash QStash | QStash is more reliable (retry logic, guaranteed delivery) but adds complexity; Vercel Cron is zero-config and sufficient for daily sweep |
| shadcn AlertDialog | vaul bottom sheet (already installed) | AlertDialog is more semantically correct for destructive confirmations (ARIA `alertdialog` role, blocks background); vaul is for non-blocking drawers |
| Cookie-based flash toast | searchParams toast message | Cookie persists across redirects without URL pollution; searchParams appear in browser history and can re-trigger on refresh |
| `not-found.tsx` file | Conditional render in page.tsx | `not-found.tsx` returns correct 404 HTTP status automatically; conditional render would return 200 |

**Installation:**
```bash
npx shadcn@latest add alert-dialog
```

---

## Architecture Patterns

### Recommended File Structure (additions to existing)

```
src/
├── app/
│   ├── layout.tsx              # MODIFIED: add footer with /privacy link + FlashToast reader
│   ├── not-found.tsx           # NEW: global 404 page (unmatched routes)
│   ├── privacy/
│   │   └── page.tsx            # NEW: /privacy page (Server Component)
│   ├── api/
│   │   └── cron/
│   │       └── expire-events/
│   │           └── route.ts    # NEW: GET handler for Vercel Cron
│   └── e/
│       └── [id]/
│           ├── page.tsx        # MODIFIED: add "Manage event" link when isCreator
│           └── manage/
│               └── page.tsx    # NEW: /e/[id]/manage — creator-only utility page
├── components/
│   ├── flash-toast.tsx         # NEW: client component that reads flash cookie + fires toast
│   └── ui/
│       └── alert-dialog.tsx    # NEW: shadcn AlertDialog component
├── lib/
│   └── actions/
│       └── delete-event.ts     # NEW: 'use server' Server Action for delete
vercel.json                     # NEW: cron job configuration
```

### Pattern 1: Vercel Cron Job for Event Expiry (SECR-03)

**What:** A daily GET Route Handler at `/api/cron/expire-events` secured by `CRON_SECRET`. Deletes all events where `expiresAt < now`. CASCADE DELETE on foreign keys handles all child records automatically.

**When to use:** This is the only cron endpoint in the project. Runs once daily.

**vercel.json:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/expire-events",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Important:** Hobby plan supports 100 cron jobs per project (not 2 — an earlier search result was incorrect; the official Vercel limits page shows 100). Minimum interval is once per day. The schedule `0 3 * * *` (3am UTC) will fire within the 3:00-3:59am window on Hobby.

**Route Handler:**
```typescript
// Source: Vercel Cron docs https://vercel.com/docs/cron-jobs/manage-cron-jobs
// File: src/app/api/cron/expire-events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  // 1. Verify the request comes from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Delete all expired events (CASCADE handles participants, availability, sessions, magic tokens)
  const deleted = await db
    .delete(events)
    .where(lt(events.expiresAt, new Date()))
    .returning({ id: events.id })

  return NextResponse.json({
    deleted: deleted.length,
    ids: deleted.map(r => r.id),
  })
}
```

**Environment variable required:** `CRON_SECRET` — a random string of at least 16 characters, set in Vercel project settings. Also set locally in `.env.local` for manual testing.

**Cascade behavior:** The schema already defines `onDelete: 'cascade'` on all foreign keys pointing to `events.id`:
- `eventDates.eventId` → cascade
- `participants.eventId` → cascade
- `availability.eventId` → cascade
- `sessions.eventId` → cascade
- `magicTokens.eventId` → cascade

A single `db.delete(events).where(lt(events.expiresAt, new Date()))` eliminates all related data in one statement. No batch processing needed at launch-scale.

**Local testing:** Hit `http://localhost:3000/api/cron/expire-events` directly with `Authorization: Bearer <your-CRON_SECRET>` header. Cron invocations in production do NOT follow redirects.

### Pattern 2: Creator Delete — Server Action + Cookie Flash Toast

**What:** `/e/[id]/manage` is a Server Component that reads the creator cookie, renders a "Delete this event" button. The button triggers a Server Action that verifies the creator cookie, deletes the event, sets a flash toast cookie, clears the creator cookie, and redirects to `/`.

**The redirect-toast problem:** `redirect()` throws a framework exception that terminates the Server Action. Any Sonner `toast()` call is client-side and never reached. The solution is a short-lived cookie that a layout-level Client Component reads on the next page render and fires the toast.

```typescript
// Source: Next.js Server Actions docs + buildui.com flash toast pattern
// File: src/lib/actions/delete-event.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function deleteEvent(eventId: string): Promise<void> {
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${eventId}`)?.value

  // Silent fail if no cookie — manage page will have already blocked the UI
  if (!creatorToken) redirect('/')

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event || event.creatorToken !== creatorToken) redirect('/')

  // Delete event (CASCADE handles all children)
  await db.delete(events).where(eq(events.id, eventId))

  // Clear creator cookie
  cookieStore.delete(`timely_creator_${eventId}`)

  // Set flash cookie for toast on next render
  // Random ID prevents stale toasts from re-displaying on refresh
  const toastId = crypto.randomUUID()
  cookieStore.set(`timely_flash_toast_${toastId}`, 'Event deleted.', {
    path: '/',
    maxAge: 60,      // 60 seconds — consumed on first render
    httpOnly: false, // Must be readable by client-side JS in FlashToast component
    sameSite: 'lax',
  })

  redirect('/')
}
```

**FlashToast client component** reads cookies on mount and fires Sonner toast:
```typescript
// File: src/components/flash-toast.tsx
'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function FlashToast() {
  useEffect(() => {
    // Find and consume all flash toast cookies
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name?.startsWith('timely_flash_toast_')) {
        toast(decodeURIComponent(value ?? ''))
        // Delete cookie by expiring it
        document.cookie = `${name}=; path=/; max-age=0`
      }
    }
  }, [])

  return null
}
```

**Add to layout.tsx:**
```typescript
// src/app/layout.tsx — add alongside existing <Toaster>
import { FlashToast } from '@/components/flash-toast'

// In body:
<FlashToast />
<Toaster position="top-center" />
```

**Important:** `redirect()` must be called outside try/catch because it throws a special Next.js exception. The delete and redirect above call `redirect()` at the top level of the action — this is correct.

### Pattern 3: /e/[id]/manage Page

**What:** A Server Component that:
1. Reads `timely_creator_{id}` cookie from the request
2. Fetches the event from DB
3. If not creator (cookie mismatch or missing): renders a "not authorized" message rather than notFound() — this is softer UX than a hard 404
4. If creator: renders the manage UI with delete button + cookie loss disclaimer

```typescript
// File: src/app/e/[id]/manage/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { DeleteEventButton } from '@/components/delete-event-button'

export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${id}`)?.value

  const event = await db.query.events.findFirst({ where: eq(events.id, id) })
  if (!event) redirect('/') // Event doesn't exist at all

  const isCreator = !!(event.creatorToken && creatorToken && event.creatorToken === creatorToken)

  if (!isCreator) {
    // Show cookie-loss message, not 404
    return (
      <main className="min-h-dvh px-4 py-10">
        {/* No manage access UI */}
      </main>
    )
  }

  return (
    <main className="min-h-dvh px-4 py-10">
      {/* Event title, delete button, cookie loss disclaimer */}
    </main>
  )
}
```

**DeleteEventButton** is a 'use client' component that wraps the shadcn AlertDialog and calls the `deleteEvent` Server Action on confirm.

### Pattern 4: Honeypot Field on Event Creation Form

**What:** A hidden text field named with a legitimate-sounding name (e.g., `website` or `last_name`). Bots fill it; humans don't see it. Server validates the field is empty.

**Hiding approach:** Use CSS class, NOT `type="hidden"` and NOT inline style. Modern bots skip `type="hidden"` fields but fill visible text inputs. Hide with a CSS class:

```css
/* In globals.css */
.hp-field {
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
  tabindex: -1;
}
```

**In create-event-form.tsx:**
```tsx
{/* Honeypot — hidden from humans, filled by bots */}
<input
  type="text"
  name="website"
  className="hp-field"
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
/>
```

**In the API route handler (src/app/api/events/route.ts):**
```typescript
// After parsing form body, before any DB work:
const body = await req.json()
if (body.website && body.website !== '') {
  // Bot detected — return success to avoid telegraphing detection
  // Return a fake 201 with a fake event ID to confuse bots
  return NextResponse.json({ id: 'bot-rejected' }, { status: 201 })
}
```

**Notes:**
- The form is currently a React client component sending JSON. The honeypot field value will be included in the JSON body if the user fills it. The server checks `body.website` after parsing JSON.
- Return a fake success (not 429 or 400) — bots that check for failures will retry; bots that see success move on.
- `tabIndex={-1}` prevents keyboard users from accidentally focusing the field.
- `autoComplete="off"` is insufficient alone — use `autoComplete="one-time-code"` to prevent browser autofill.

### Pattern 5: not-found.tsx for Event Pages

**What:** Next.js App Router `not-found.tsx` files render when `notFound()` is called in the same route segment. The event page already calls `notFound()` when the event doesn't exist in DB.

**Current state:** The event page at `src/app/e/[id]/page.tsx` calls `notFound()` if the event is not found. This falls through to Next.js default 404 page. Phase 5 adds a styled `not-found.tsx`.

**Two cases to handle:**
1. **Event not found** (event ID never existed or was deleted): `src/app/e/[id]/not-found.tsx` — triggered by `notFound()` in the event page
2. **Expired event**: The event exists in DB but `expiresAt` has passed. The current page doesn't check expiry — it will show the event UI with stale data. Phase 5 must add an expiry check in the event page Server Component that calls `notFound()` (or renders a dedicated expired UI).

**Recommendation:** Add expiry check to the event page; call `notFound()` if `event.expiresAt < new Date()`. The same `not-found.tsx` handles both cases with appropriate copy:

```typescript
// In src/app/e/[id]/not-found.tsx
import Link from 'next/link'

export default function EventNotFound() {
  return (
    <main className="min-h-dvh px-4 py-20 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[#1C1A17]">
            This event isn't available
          </h1>
          <p className="text-[#6B6158] leading-relaxed">
            It may have expired (events last 30 days) or the link might be incorrect.
          </p>
        </div>
        <Link href="/" className="...">Create a new event</Link>
      </div>
    </main>
  )
}
```

**Global not-found.tsx** at `src/app/not-found.tsx` handles all other unmatched routes.

### Pattern 6: Accessibility Audit — ARIA on Heatmap Grid

**What:** The heatmap grid is the most complex interactive element. It uses a custom div-based layout, not a native `<table>`. ARIA roles are required.

**Required ARIA pattern for the heatmap grid:**
```tsx
<div
  role="grid"
  aria-label="Availability heatmap"
  aria-rowcount={totalRows}
  aria-colcount={totalCols}
>
  {/* Header row */}
  <div role="row">
    <div role="columnheader" aria-label="Time">Time</div>
    {dates.map(date => (
      <div key={date} role="columnheader" aria-label={format(date, 'EEEE, MMMM d')}>
        {/* date label */}
      </div>
    ))}
  </div>
  {/* Data rows */}
  {timeSlots.map((slot, rowIdx) => (
    <div key={slot} role="row" aria-rowindex={rowIdx + 2}>
      <div role="rowheader">{format(slot, 'h:mm a')}</div>
      {dates.map((date, colIdx) => {
        const count = heatmapMap[slotKey] ?? 0
        return (
          <div
            key={slotKey}
            role="gridcell"
            aria-colindex={colIdx + 2}
            aria-label={`${count} of ${totalParticipants} available at ${timeLabel} on ${dateLabel}`}
            aria-readonly="true"
            tabIndex={0}
            style={{ backgroundColor: slotColor(count, peakCount) }}
          />
        )
      })}
    </div>
  ))}
</div>
```

**Keyboard navigation for read-only grid:** Since the heatmap is read-only (not an editable data grid), full arrow-key navigation is not required. However, `tabIndex={0}` on each cell allows keyboard users to tab through and read the `aria-label`. For a 14-day × 24-hour grid (336 cells), tabbing through every cell is excessive. Recommended: make only the first cell in each column tabbable (`tabIndex={0}`) and the rest `tabIndex={-1}`, relying on the `aria-label` on the grid container to convey structure.

**Focus rings:** All interactive elements (buttons, links, form inputs) need visible focus rings. Use `focus-visible:ring-2 focus-visible:ring-[#E8823A] focus-visible:ring-offset-2` Tailwind classes. The `focus-visible:` prefix ensures rings appear only during keyboard navigation, not on mouse click.

### Pattern 7: Privacy Notice

**Inline note below submit button (create-event-form.tsx):**
```tsx
{/* After the submit button */}
<p className="text-xs text-[#A89E94] text-center">
  Events and all responses expire automatically after 30 days. No accounts required.{' '}
  <Link href="/privacy" className="underline underline-offset-2 hover:text-[#6B6158]">
    Privacy
  </Link>
</p>
```

**Footer in layout.tsx:**
```tsx
<footer className="mt-auto px-4 py-6 text-center">
  <Link href="/privacy" className="text-xs text-[#A89E94] hover:text-[#6B6158] underline underline-offset-2">
    Privacy
  </Link>
</footer>
```

**Contact method recommendation (Claude's discretion):** A GitHub Issues link (`github.com/[username]/timely/issues`) is appropriate for a no-account developer tool. It requires no email handling, no inbox management, and is transparent. Alternative: a plain email address. Recommend the GitHub Issues approach.

### Anti-Patterns to Avoid

- **`type="hidden"` for honeypot field:** Modern bots skip hidden inputs. Use a styled-away visible text field.
- **`redirect()` inside try/catch:** `redirect()` throws an exception — catching it prevents the redirect from working. Always call `redirect()` at the top level of the action, after all operations.
- **Sonner `toast()` directly after `redirect()` in Server Action:** `redirect()` terminates execution. Toast via flash cookie instead.
- **`lt(events.expiresAt, new Date())` vs `sql\`now()\`:** Both work. `new Date()` is evaluated in the JS runtime (Edge, Node) and is consistent. `sql\`now()\`` is evaluated by Postgres. Either is correct; `new Date()` avoids a raw SQL fragment.
- **Making the cron endpoint a Server Action:** Server Actions use POST; Vercel Cron sends GET. Cron endpoints must be Route Handlers.
- **Forgetting to add `CRON_SECRET` to production env:** Without it, `process.env.CRON_SECRET` is `undefined`, and `authHeader !== \`Bearer undefined\`` will reject all cron invocations.
- **Checking `event.expiresAt` only in the cron:** The event page also needs to check expiry and render a "this event has expired" state for events that exist in DB but are past their `expiresAt` (in the window between expiry and next cron sweep).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal with portal, backdrop, focus trap | shadcn `AlertDialog` (install via CLI) | AlertDialog uses Radix primitive with correct `role="alertdialog"`, focus trap, escape-to-close, screen reader support — dozens of a11y edge cases |
| Toast after redirect | Server-sent events / polling | Flash cookie + `FlashToast` client component | Cookie persists across redirects; consumed on next render; zero infrastructure |
| Cron job auth | IP allowlisting | `CRON_SECRET` header check | Vercel sends `Authorization: Bearer ${CRON_SECRET}` — one-line check, no IP list to maintain |
| Focus rings | Custom `::focus` CSS | Tailwind `focus-visible:ring-*` classes | `focus-visible` is the correct modern pseudo-class; shows ring only for keyboard, not mouse |
| Expired event detection | Separate `expired_events` table | Check `events.expiresAt < new Date()` in page Server Component | `expiresAt` already exists on the events table; no additional schema needed |

**Key insight:** Phase 5 is almost entirely composition and configuration. No new data models, no new external services beyond the Vercel Cron mechanism.

---

## Common Pitfalls

### Pitfall 1: Hobby Plan Cron Timing Precision
**What goes wrong:** Developer writes `*/30 * * * *` (every 30 minutes) — deployment fails with error "Hobby accounts are limited to daily cron jobs."
**Why it happens:** Vercel Hobby plan only supports once-per-day cron jobs. Any expression that would trigger more than once per day fails at deployment time.
**How to avoid:** Use `0 3 * * *` (once daily at 3am UTC). Events have a 37-day `expiresAt` window; daily sweeps are more than sufficient.
**Warning signs:** Deployment error mentioning "Hobby accounts are limited to daily cron jobs."

### Pitfall 2: Toast Lost After Redirect
**What goes wrong:** Developer adds `toast('Event deleted.')` in the Server Action right before `redirect('/')` — the toast never appears.
**Why it happens:** `redirect()` throws a Next.js exception that terminates the action. Client-side Sonner toast is never called. Even if it were, the component is unmounted on redirect.
**How to avoid:** Use the flash cookie pattern: set a short-lived cookie in the Server Action, then read and consume it in a Client Component mounted in the root layout.
**Warning signs:** No toast visible after redirect; no errors in console.

### Pitfall 3: `redirect()` Inside try/catch
**What goes wrong:** `redirect()` is called inside a try block; the catch block intercepts the thrown exception and swallows it, preventing the redirect.
**Why it happens:** Next.js `redirect()` throws a special internal exception (a framework control-flow mechanism). Wrapping it in try/catch catches this exception.
**How to avoid:** Perform all fallible operations (DB queries, cookie reads) inside try/catch if needed; call `redirect()` only at the top level after the try/catch completes.
**Warning signs:** Redirect never happens; no error in console; page stays on current route.

### Pitfall 4: Creator Delete Doesn't Clear the Cookie
**What goes wrong:** After deleting an event, the creator cookie `timely_creator_{id}` lingers. If the creator creates a new event with a different ID and the old cookie is still present, there's no functional harm — but it's messy hygiene.
**Why it happens:** Server Actions set/delete cookies via `cookies()` from `next/headers`. Forgetting the delete step.
**How to avoid:** In `deleteEvent` Server Action: after the DB delete, call `cookieStore.delete(\`timely_creator_\${eventId}\`)` before redirect.

### Pitfall 5: Honeypot Field Autofilled by Browser
**What goes wrong:** A legitimate user's browser autofills the honeypot field (password manager, browser autocomplete). The server rejects a real submission as spam.
**Why it happens:** Browser autofill fills any visible text input based on field name heuristics.
**How to avoid:** Set `autoComplete="one-time-code"` on the honeypot input — this value is supported across modern browsers and is semantically nonsensical for a general text field, preventing autofill. Combined with `tabIndex={-1}` and off-screen CSS positioning.

### Pitfall 6: Expired Events Still Visible Before Cron Sweep
**What goes wrong:** An event's `expiresAt` passes, but it remains visible (with potentially stale data) until the next daily cron sweep.
**Why it happens:** The cron only runs once per day. Events can be "expired" but not yet deleted for up to ~24 hours.
**How to avoid:** In the event page Server Component, add an expiry check: `if (event.expiresAt < new Date()) notFound()`. This immediately presents the not-found state to users visiting expired events, regardless of whether the cron has run.

### Pitfall 7: The manage Page Returning 404 for Lost-Cookie Creators
**What goes wrong:** If `/e/[id]/manage` calls `notFound()` when the creator cookie is missing, the page returns a hard 404. A creator who genuinely lost their cookie (incognito session, device switch) sees a confusing 404 instead of a helpful message.
**Why it happens:** Calling `notFound()` is idiomatic for "this doesn't exist" but is wrong for "you don't have access."
**How to avoid:** When the creator cookie is missing or mismatched, render a friendly "manage access not available" UI with the auto-expiry reminder, NOT a 404. Only redirect if the event itself doesn't exist.

### Pitfall 8: ARIA `role="grid"` Requires Correct Row/Cell Hierarchy
**What goes wrong:** Applying `role="grid"` to the heatmap container without adding `role="row"` and `role="gridcell"` to descendants — screen readers announce the container but no cell structure.
**Why it happens:** ARIA roles on the container alone don't propagate to children. Each tier of the grid needs its own role.
**How to avoid:** Follow the ARIA grid pattern exactly: `role="grid"` → `role="row"` → `role="gridcell"` / `role="rowheader"` / `role="columnheader"`. Each `gridcell` needs an `aria-label` that fully describes the cell contents.

---

## Code Examples

Verified patterns from official sources:

### Vercel Cron Route Handler
```typescript
// Source: Vercel Cron docs https://vercel.com/docs/cron-jobs/manage-cron-jobs
// File: src/app/api/cron/expire-events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const deleted = await db
    .delete(events)
    .where(lt(events.expiresAt, new Date()))
    .returning({ id: events.id })

  return NextResponse.json({ deleted: deleted.length })
}
```

### Drizzle Delete with `lt()` Operator
```typescript
// Source: Drizzle ORM docs https://orm.drizzle.team/docs/delete
import { lt } from 'drizzle-orm'
import { events } from '@/lib/schema'

// Delete all events where expiresAt < current time
// CASCADE DELETE on FK constraints handles all child rows automatically
const deleted = await db
  .delete(events)
  .where(lt(events.expiresAt, new Date()))
  .returning({ id: events.id })

console.log(`Expired ${deleted.length} events`)
```

### vercel.json Cron Configuration
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/expire-events",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Delete Event Server Action
```typescript
// Source: Next.js Server Actions docs https://nextjs.org/docs/app/getting-started/updating-data
// File: src/lib/actions/delete-event.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function deleteEvent(eventId: string): Promise<void> {
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${eventId}`)?.value

  if (!creatorToken) redirect('/')

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event || event.creatorToken !== creatorToken) redirect('/')

  await db.delete(events).where(eq(events.id, eventId))
  cookieStore.delete(`timely_creator_${eventId}`)

  // Flash cookie for toast after redirect
  const toastId = crypto.randomUUID()
  cookieStore.set(`timely_flash_toast_${toastId}`, 'Event deleted.', {
    path: '/',
    maxAge: 60,
    httpOnly: false,
    sameSite: 'lax',
  })

  redirect('/')  // Must be outside try/catch — throws framework exception
}
```

### shadcn AlertDialog for Delete Confirmation
```typescript
// Source: shadcn/ui AlertDialog docs https://ui.shadcn.com/docs/components/alert-dialog
// Install: npx shadcn@latest add alert-dialog
// File: src/components/delete-event-button.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteEvent } from '@/lib/actions/delete-event'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteEvent(eventId)
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          {isPending ? 'Deleting...' : 'Delete event'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. All responses will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Honeypot Field Implementation
```typescript
// In src/components/create-event-form.tsx — add inside <form>:
{/* Honeypot field — hidden from humans via CSS, filled by naive bots */}
<input
  type="text"
  name="website"
  className="sr-only"   // Tailwind's screen-reader-only class: off-screen, no dimensions
  tabIndex={-1}
  autoComplete="one-time-code"
  aria-hidden="true"
/>

// In src/app/api/events/route.ts — after parsing body, before rate limit check:
if (body.website && (body.website as string).trim() !== '') {
  // Bot detected — return fake success to avoid telegraphing rejection
  return NextResponse.json({ id: generateId() }, { status: 201 })
}
```

**Note on Tailwind `sr-only`:** This is `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;` — it's visually hidden but the element remains in the DOM. Bots that parse the HTML will see and fill it. Users using a screen reader will hear `aria-hidden="true"` skip it. Users navigating by keyboard cannot reach it due to `tabIndex={-1}`.

### Focus-Visible Rings (Tailwind)
```typescript
// Add to any interactive element that needs an accessible focus ring:
// Buttons:
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8823A] focus-visible:ring-offset-2"

// Links:
className="... focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#E8823A]"
```

### not-found.tsx for Event Segment
```typescript
// Source: Next.js docs https://nextjs.org/docs/app/api-reference/file-conventions/not-found
// File: src/app/e/[id]/not-found.tsx
import Link from 'next/link'

export default function EventNotFound() {
  return (
    <main className="min-h-dvh px-4 py-20 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[#1C1A17]">
            This event isn't available
          </h1>
          <p className="text-[#6B6158] leading-relaxed">
            It may have expired (events last 30 days) or the link might be incorrect.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Create a new event
        </Link>
      </div>
    </main>
  )
}
```

---

## Empty and Error States Inventory

All off-path screens requiring copy and design in Phase 5:

| Screen | Route / Location | Trigger | Recommended Copy |
|--------|-----------------|---------|-----------------|
| No responses yet | `src/app/e/[id]/page.tsx` (existing `BestTimeCallout` empty state) | `participantList.length === 0` | "Waiting for responses — share the link to get started." (already partially implemented per Phase 4 research) |
| Event not found / expired | `src/app/e/[id]/not-found.tsx` | `notFound()` in page.tsx (event null OR `expiresAt` passed) | "This event isn't available. It may have expired (events last 30 days) or the link might be incorrect." |
| Global 404 | `src/app/not-found.tsx` | Unmatched URL | "Page not found. — [Go home]" |
| Magic link expired | `src/app/e/[id]/magic/page.tsx` (already implemented) | `?error=expired` | Already implemented: "This link has expired" |
| Magic link already used | `src/app/e/[id]/magic/page.tsx` (already implemented) | `?error=used` | Already implemented: "This link has already been used" |
| Magic link invalid | `src/app/e/[id]/magic/page.tsx` (already implemented) | `?error=invalid` | Already implemented: "This link is not valid" |
| Rate limit hit (event creation) | `src/components/create-event-form.tsx` (already implemented) | 429 response | Already implemented: "Too many events created. Please wait a minute and try again." |
| Creator cookie lost (manage page) | `src/app/e/[id]/manage/page.tsx` (new) | Cookie missing or mismatched | "Manage access isn't available. If you've lost access, events expire automatically in 30 days." |
| Rate limit hit (PIN verify) | `src/components/identity/pin-sheet.tsx` (existing) | 429 response | Verify existing copy — needs audit |

**Already implemented:** Magic link error states (3 variants), rate limit on event creation form. Phase 5 must add: event not-found/expired, global 404, creator-cookie-lost manage page state.

---

## Cross-Browser Smoke Test Checklist

Phase 5 requires manual verification on 4 platforms:

| Platform | Key Risks to Verify |
|----------|---------------------|
| iOS Safari (18+) | Date picker touch interaction, sticky header scroll behavior, `dvh` units, `position: sticky` in heatmap, vaul drawer swipe-to-close |
| Chrome Android (latest) | Same as iOS Safari; check virtual keyboard pushing layout |
| Desktop Chrome (latest) | Primary development target — should be clean |
| Desktop Firefox (latest) | CSS grid rendering, focus ring appearance, `dvh` support |

**iOS Safari specifics to check:**
- `min-h-dvh` renders correctly (dynamic viewport height, avoids iOS Safari address bar overlap)
- Touch targets are at minimum 44x44px
- Vaul drawer swipe-to-dismiss works (already in use, but verify on real device)
- Date picker (react-day-picker) responds to touch correctly

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `type="hidden"` honeypot | Off-screen visible text field | Industry shift ~2020 | Bots now detect and skip `type="hidden"` — visible CSS-hidden fields catch more bots |
| `focus:ring-*` Tailwind | `focus-visible:ring-*` | Tailwind v3+ | `focus-visible` only shows ring on keyboard navigation, not mouse click — better UX |
| `notFound()` returns 200 for streamed | Returns 404 for non-streamed | Next.js 13+ | Segment-level `not-found.tsx` gets correct 404 HTTP status automatically for non-streamed routes |
| `global-not-found.js` | Experimental in Next.js v15.4 | v15.4.0 | Not needed here — simple `app/not-found.tsx` is sufficient for this app's structure (single root layout) |
| Vercel Cron once/minute (Pro) | Once/day on Hobby | Always | Daily sweeps are architecturally sufficient for a 30-day auto-expiry window |

**Deprecated/outdated:**
- `NEXT_PUBLIC_CRON_SECRET` — should be `CRON_SECRET` (no `NEXT_PUBLIC_` prefix, never exposed to client)
- `cookies().get()` synchronous — now `async` in Next.js 15+: must `await cookies()` first

---

## Open Questions

1. **Should expired events redirect to not-found or render a distinct "expired" page?**
   - What we know: The `not-found.tsx` can handle both missing and expired events with a single message
   - What's unclear: Whether users benefit from knowing specifically that the event expired vs. just "not available"
   - Recommendation: Single `not-found.tsx` with copy that mentions expiry: "It may have expired (events last 30 days) or the link might be incorrect." This covers both cases without needing separate routes.

2. **Where exactly to add the expiry check in the event page?**
   - What we know: `event.expiresAt` exists on the fetched event object
   - What's unclear: Whether to check before or after fetching related data (participant rows, heatmap)
   - Recommendation: Check immediately after fetching the event, before any additional DB queries — avoids wasted queries for expired events: `if (event.expiresAt < new Date()) notFound()`

3. **Is `sr-only` the right CSS approach for the honeypot field?**
   - What we know: `sr-only` hides visually but keeps element in DOM — bots can see and fill it; screen reader users encounter `aria-hidden="true"` which skips it
   - What's unclear: Whether sophisticated bots detect `sr-only` fields specifically
   - Recommendation: `sr-only` is the right approach for this app's threat model (naive bots, not sophisticated adversaries). Rate limiting handles sophisticated actors.

4. **Contact method on /privacy page?**
   - What we know: Claude's discretion — no email inbox management wanted, no accounts
   - Recommendation: GitHub Issues link: "Questions? Open an issue at github.com/[username]/timely." This requires no email handling, is transparent, and appropriate for a developer-built tool. If the repo is private, a plain email address is the fallback.

---

## Sources

### Primary (HIGH confidence)
- Vercel Cron Jobs official docs (https://vercel.com/docs/cron-jobs, https://vercel.com/docs/cron-jobs/manage-cron-jobs, https://vercel.com/docs/cron-jobs/quickstart, https://vercel.com/docs/cron-jobs/usage-and-pricing) — verified: Hobby limit is once/day with hourly precision; CRON_SECRET header pattern confirmed; 100 cron jobs per project
- Vercel Limits official page (https://vercel.com/docs/limits) — confirmed: 100 cron jobs per project on Hobby (not 2 as a secondary search result claimed)
- Next.js 16.1.6 official docs (https://nextjs.org/docs/app/api-reference/file-conventions/not-found) — `not-found.tsx` file convention, HTTP 404 status, global vs. segment level
- Next.js 16.1.6 Server Actions docs (https://nextjs.org/docs/app/getting-started/updating-data) — redirect, cookies, revalidatePath patterns in Server Actions; `redirect()` throws exception
- Drizzle ORM delete docs (https://orm.drizzle.team/docs/delete) — `db.delete().where(lt(...)).returning()` syntax confirmed
- shadcn AlertDialog docs (https://ui.shadcn.com/docs/components/alert-dialog) — component list, install command confirmed
- Project source code — `src/lib/schema.ts` (cascade FK constraints), `src/lib/rate-limit.ts` (SECR-04 already done), `src/app/api/events/route.ts`, `src/app/e/[id]/page.tsx`, `src/lib/actions/confirm-time.ts` examined directly
- WAI-ARIA Grid Pattern (https://www.w3.org/WAI/ARIA/apg/patterns/grid/) — ARIA roles hierarchy for grid/row/gridcell confirmed

### Secondary (MEDIUM confidence)
- buildui.com flash toast pattern (https://buildui.com/posts/toast-messages-in-react-server-components) — cookie-based approach for toast after redirect; cross-verified with Next.js cookies API docs
- CSS-Tricks honeypot article + nikolailehbr.ink honeypot post — `sr-only` vs `type="hidden"` approach for honeypot; `autoComplete="one-time-code"` to prevent browser autofill; `tabIndex={-1}` pattern
- Tailwind CSS `focus-visible:` documentation — confirmed: `focus-visible:ring-*` is the correct pattern for keyboard-only focus rings

### Tertiary (LOW confidence — marked for validation)
- Vercel Hobby plan cron job count: one secondary search result claimed "2 cron jobs" but the official limits page says "100". Use the official limits page number (100). LOW confidence on the secondary claim.
- `sr-only` honeypot effectiveness against sophisticated bots: sourced from community articles, not official research. The claim that sophisticated bots skip `sr-only` fields is plausible but unverified.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed/versioned from package.json; AlertDialog install command from official shadcn docs
- Cron architecture: HIGH — Vercel official docs, multiple pages cross-confirmed
- Delete flow: HIGH — Next.js Server Actions docs + project source code + flash toast pattern from verified secondary source
- Honeypot: MEDIUM — community sources, not official spec; sufficient for this app's threat model
- Accessibility / ARIA: HIGH — W3C WAI-ARIA APG confirmed roles and hierarchy
- Empty states: HIGH — based on direct code inspection of what already exists
- Cross-browser checklist: MEDIUM — based on known platform differences, not automated test results

**Research date:** 2026-02-19
**Valid until:** 2026-03-20 (30 days — all stable libraries; Vercel Cron limits unlikely to change)
