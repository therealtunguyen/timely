# Stack Research

**Domain:** Email notifications + calendar export additions to existing scheduling app
**Milestone:** v1.1 Notifications & Export
**Researched:** 2026-02-28
**Confidence:** HIGH

---

## Context: What Already Exists

The following are installed and validated in v1.0. Do NOT re-research or re-introduce them:

| Already in Use | Version | Notes |
|----------------|---------|-------|
| `resend` | ^6.9.2 | Sending magic link emails; `resend.emails.send()` pattern established |
| `@react-email/components` | ^1.0.7 | Email template components; `MagicLinkEmail` template pattern established |
| `next` | ^16.1.6 | App Router; Route Handlers for all email sends |
| `date-fns` | ^4.1.0 | Date math |
| `date-fns-tz` | ^3.2.0 | Timezone conversion (UTC ↔ IANA) |
| `zod` | ^4.3.6 | Input validation at all API boundaries |
| `@upstash/ratelimit` | ^2.0.8 | Rate limiting (already on magic-link, pin-verify, event-create) |
| `lucide-react` | ^0.574.0 | Icons |
| `sonner` | ^2.0.7 | Toast notifications |
| All shadcn/ui base components | — | button, card, input, label, drawer, alert-dialog, etc. |

This milestone adds exactly one new library and uses one existing Resend API method not yet used.

---

## New Additions for v1.1

### 1. Calendar File Generation

**Use `ical-generator` v10.x.**

```bash
npm install ical-generator
```

**Why ical-generator over `ics`:**

| Criterion | ical-generator | ics |
|-----------|---------------|-----|
| Last published | 3 months ago (v10.0.0, Oct 2025) | Over a year ago (v3.8.1) |
| Open issues | ~1 | ~34 |
| Weekly downloads | ~331K | ~391K |
| ESM support | Yes — `import ical from 'ical-generator'` | Yes |
| Active maintenance | Yes | Stale |
| Breaking change risk | Low (stable v10) | Higher (unmaintained) |

The `ics` package has higher download volume but is effectively abandoned. With 34 open issues and no updates in over a year, it is a maintenance risk. `ical-generator` v10 is actively maintained, has ESM imports, and produces RFC 5545-compliant output.

**IMPORTANT: `ical-generator` v10 breaking change.** The old CommonJS `require('ical-generator')` no longer works directly. Use ESM: `import ical from 'ical-generator'`. The `save()`, `saveSync()`, `serve()`, `toBlob()`, and `toURL()` methods were removed. Use `calendar.toString()` to produce the iCal string.

**How it integrates in a Next.js Route Handler:**

```typescript
// src/app/api/events/[id]/calendar/route.ts
import ical from 'ical-generator'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // ... fetch event from DB ...

  const calendar = ical({ name: 'Timely' })
  calendar.createEvent({
    start: confirmedSlot,                  // JS Date (UTC)
    end: endSlot,                          // confirmedSlot + 30 min
    summary: event.title,
    description: event.description ?? undefined,
    timezone: event.timezone,              // IANA string
  })

  return new Response(calendar.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="timely-${event.id}.ics"`,
    },
  })
}
```

This is a plain `Response` (not `NextResponse.json`) — required for non-JSON content types.

---

### 2. Resend Batch Email API

**No new library needed — already installed as `resend` ^6.9.2.**

The batch API is a method on the existing SDK: `resend.batch.send()`.

**Why batch over individual `resend.emails.send()` calls:**

- Participant notification (time confirmed) sends to N participants simultaneously
- Calling `resend.emails.send()` in a loop is N sequential HTTP round-trips to Resend
- `resend.batch.send()` sends all N emails in one HTTP call
- Limit: up to 100 emails per batch call (Timely events max ~10-30 participants — well within limit)

**API pattern:**

```typescript
import { Resend } from 'resend'
import { renderAsync } from '@react-email/components'
import { TimeConfirmedEmail } from '@/emails/time-confirmed-email'

const resend = new Resend(process.env.RESEND_API_KEY)

// Build per-recipient email objects
const emails = participantsWithEmail.map((p) => ({
  from: 'Timely <notifications@yourdomain.com>',
  to: [p.email],
  subject: `${event.title} is confirmed!`,
  react: TimeConfirmedEmail({
    participantName: p.name,
    eventTitle: event.title,
    confirmedSlot: event.confirmedSlot,
    eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/e/${event.id}`,
  }),
}))

// One HTTP call to Resend for all participants
await resend.batch.send(emails)
```

**Caveat:** The `attachments` and `tags` fields are not supported in batch calls. This is fine for Timely — neither is needed for notification emails. Do not attach .ics files via `attachments`; surface the download link in the email body instead.

**React Email template compatibility:** `react:` prop works in batch entries the same way as in `resend.emails.send()`. The existing `MagicLinkEmail` pattern is the template to follow for new email templates.

---

### 3. Google Calendar Link (No Library)

**Build the URL server-side from string interpolation. No library needed.**

The Google Calendar "add event" URL format is:

```
https://calendar.google.com/calendar/r/eventedit?text=TITLE&dates=START/END&details=DESCRIPTION&ctz=TIMEZONE
```

Where:
- `text` = URL-encoded event title
- `dates` = `YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ` (UTC, Z suffix)
- `details` = URL-encoded description (optional)
- `ctz` = IANA timezone string (optional; Google converts display, not the time itself)

**Implementation — pure string construction, no dependency:**

```typescript
function buildGoogleCalendarUrl(event: {
  title: string
  confirmedSlot: Date   // UTC
  timezone: string      // IANA
  description?: string | null
}): string {
  const start = event.confirmedSlot
  const end = new Date(start.getTime() + 30 * 60 * 1000)  // +30 min

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')  // YYYYMMDDTHHMMSSZ

  const params = new URLSearchParams({
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ctz: event.timezone,
    ...(event.description ? { details: event.description } : {}),
  })

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}
```

**Warning:** The Google Calendar URL format is undocumented and could change without notice. It has been stable for 10+ years and is universally used, but it is not an official API. No SLA exists. The risk is LOW for a scheduling tool — if it breaks, replace the URL pattern.

---

## No New shadcn/ui Components Required

The v1.1 UI surfaces (export buttons, "add to calendar" links) are served by components already installed:

| UI Need | Existing Component | Notes |
|---------|-------------------|-------|
| "Download .ics" button | `button` (already installed) | Standard Button with `asChild` or `onClick` download trigger |
| "Add to Google Calendar" button | `button` (already installed) | Renders as `<a href={gcalUrl} target="_blank">` |
| Email opt-in input at join/create | `input` + `label` (already installed) | Standard text input, email type |
| Notification status indicator | No new component needed | Text + Lucide `CheckCircle` icon suffices |

The confirmed event page where export appears is an existing page. No new drawers, dialogs, or sheets needed for export — two buttons placed inline with existing content.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `ics` npm package | Unmaintained (1+ year stale), 34 open issues | `ical-generator` v10 |
| Looping `resend.emails.send()` for notifications | N sequential Resend API calls; slow, fragile | `resend.batch.send()` |
| `.ics` attachment in notification email | `attachments` not supported in `resend.batch.send()` | Link to `/api/events/[id]/calendar` download endpoint in email body |
| External "Add to Calendar" widget libraries (addtocalendar.com, etc.) | External dependency, tracking, unnecessary weight | Build Google Calendar URL inline; .ics covers all other calendars |
| `@vercel/og` or image generation | Not needed for this milestone | N/A |
| Separate email queue service (Bull, BullMQ, etc.) | Overkill at this scale; Vercel cron + Resend batch is sufficient | `resend.batch.send()` called from confirm-time Server Action |

---

## Email Delivery Constraint (Carry-Forward from v1.0)

**The Resend domain is not verified.** Currently `from:` is `onboarding@resend.dev` (Resend sandbox domain). Notification emails cannot reach arbitrary recipients until `timely.app` (or whichever domain is used) is verified at resend.com/domains.

**Action required before v1.1 ships:** Verify domain in Resend dashboard. Once verified:
- Change `from:` to `Timely <notifications@yourdomain.com>` in all email sends
- Sender domain authentication (SPF + DKIM) is configured automatically by Resend

This is an ops task, not a code task, but it is the v1.1 launch blocker.

---

## Installation

```bash
# Only new dependency for v1.1
npm install ical-generator

# No other new dependencies needed
```

---

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `ical-generator` | ^10.0.0 | ESM only — use `import ical from 'ical-generator'`. Do NOT use `require()`. |
| `resend` | ^6.9.2 (already installed) | `resend.batch.send()` is available in the current version |
| `@react-email/components` | ^1.0.7 (already installed) | `react:` prop works in batch entries same as single sends |

---

## Sources

- [ical-generator npm trends vs ics](https://npmtrends.com/ical-generator-vs-ics) — download volume, maintenance activity comparison
- [ical-generator GitHub (sebbo2002)](https://github.com/sebbo2002/ical-generator) — v10.0.0 release, ESM-only import, `toString()` API, removed methods
- [ics GitHub (adamgibbons)](https://github.com/adamgibbons/ics) — confirmed 1+ year stale, 34 open issues
- [Resend Batch Emails blog post](https://resend.com/blog/introducing-the-batch-emails-api) — `resend.batch.send()` method, 100 email limit, `attachments` not supported
- [Google Calendar event URL format](https://dylanbeattie.net/2021/01/12/adding-events-to-google-calendar-via-a-link.html) — URL parameters, date format, timezone handling (MEDIUM confidence — undocumented Google feature)
- Existing codebase analysis — confirmed `resend` ^6.9.2, `@react-email/components` ^1.0.7, all shadcn/ui components present

---

*Stack research for: Timely v1.1 Notifications & Export*
*Researched: 2026-02-28*
