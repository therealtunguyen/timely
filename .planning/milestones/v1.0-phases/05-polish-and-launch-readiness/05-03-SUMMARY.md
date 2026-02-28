---
phase: 05-polish-and-launch-readiness
plan: "03"
subsystem: security-and-legal
tags:
  - honeypot
  - bot-protection
  - privacy
  - not-found
  - error-states
  - expiry
dependency_graph:
  requires:
    - src/components/create-event-form.tsx
    - src/app/api/events/route.ts
    - src/app/e/[id]/page.tsx
  provides:
    - honeypot bot deflection on event creation
    - privacy note and /privacy link in creation form
    - /privacy page with structured data disclosures
    - global 404 not-found page
    - event-segment not-found/expired page
    - expiry enforcement in event Server Component
  affects:
    - src/app/e/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - Honeypot field (sr-only DOM element, tabIndex=-1, aria-hidden)
    - Fake 201 response for bot deflection (silent rejection)
    - Next.js file-convention not-found.tsx (global + segment)
    - notFound() call on expired event to surface segment not-found
key_files:
  created:
    - src/app/privacy/page.tsx
    - src/app/not-found.tsx
    - src/app/e/[id]/not-found.tsx
  modified:
    - src/components/create-event-form.tsx
    - src/app/api/events/route.ts
    - src/app/e/[id]/page.tsx
decisions:
  - Honeypot check runs after rate limit but before Zod validation — bots counted against rate limit, but DB/hash work skipped
  - Fake 201 returns generateId() (already imported) — no dynamic import needed
  - Honeypot field uses autoComplete=one-time-code to prevent browser autofill on real users
  - Privacy page uses GitHub Issues as contact method — appropriate for developer-built no-account tool
  - Global not-found.tsx catches all unmatched routes; event-segment not-found.tsx catches notFound() from event page
metrics:
  duration: "2 min"
  completed: "2026-02-19"
  tasks: 2
  files_modified: 6
---

# Phase 5 Plan 03: Security Hardening and Error States Summary

Honeypot bot deflection, privacy disclosure at creation, /privacy page, global 404 and event not-found pages, and expiry enforcement in the event Server Component.

## What Was Built

### Task 1: Honeypot field + privacy note in create-event form and API route

**`src/components/create-event-form.tsx`:**
- Added `Link` import from `next/link`
- Added `website` state variable (`useState('')`)
- Included `website` in the `handleSubmit` body JSON
- Added sr-only honeypot `<input>` as the first form child (tabIndex=-1, aria-hidden="true", autoComplete="one-time-code")
- Added privacy note paragraph below the submit button with exact copy: "Events and all responses expire automatically after 30 days. No accounts required." with a `/privacy` link

**`src/app/api/events/route.ts`:**
- Added step 3b honeypot check immediately after body parse, before Zod validation
- Casts body to `Record<string, unknown>`, checks `typedBody.website`
- Returns fake `NextResponse.json({ id: generateId() }, { status: 201 })` when honeypot is filled
- Uses the existing static `generateId` import — no dynamic import needed

### Task 2: /privacy page, global 404, event not-found, and expiry check

**`src/app/privacy/page.tsx`** (94 lines, new):
- Server Component with structured sections: What we collect, How it's stored, Automatic expiry, Deleting your event early, No accounts, Questions
- Plain English, no legalese
- Back link to `/` and GitHub Issues contact method
- Proper metadata (title: 'Privacy', description: 'How Timely handles your data.')

**`src/app/not-found.tsx`** (new):
- Global 404 catches all unmatched routes
- "Page not found" heading + "Go home" CTA link to `/`
- Warm palette styling consistent with app design

**`src/app/e/[id]/not-found.tsx`** (new):
- Event segment not-found rendered when `notFound()` is called from the event page
- "This event isn't available" heading
- Explains 30-day expiry and possible incorrect link
- "Create a new event" CTA link to `/`

**`src/app/e/[id]/page.tsx`:**
- Added single expiry check line immediately after `if (!event) notFound()`:
  ```typescript
  if (event.expiresAt < new Date()) notFound()
  ```
- Prevents rendering stale event data before cron job deletes the record

## Verification Results

- `npx tsc --noEmit` passes with no errors (confirmed twice — after each task)
- All required artifacts exist on disk
- Key links verified: honeypot check pattern `typedBody.website`, expiry check `event.expiresAt < new Date()`, privacy link `href="/privacy"`, exact privacy note copy

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `5c72452` | feat(05-03): add honeypot field + privacy note to create-event form and API route |
| Task 2 | `5b86748` | feat(05-03): privacy page, global 404, event not-found, and expiry check |

## Self-Check: PASSED

All 6 files verified on disk. Both commits (5c72452, 5b86748) confirmed in git log.
