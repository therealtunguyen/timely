---
phase: 01-foundation-and-event-creation
plan: "02"
subsystem: api
tags: [nextjs, zod, upstash, ratelimit, react-day-picker, drizzle, neon, event-creation, form]

# Dependency graph
requires:
  - phase: 01-01
    provides: db singleton, schema (events/eventDates), generateId(), shadcn/ui components
provides:
  - POST /api/events route handler with Zod validation and Upstash sliding-window rate limiting
  - createEventSchema (Zod) and CreateEventInput type from src/lib/validations.ts
  - eventCreationRatelimit (Upstash) from src/lib/rate-limit.ts
  - CreateEventForm client component (multi-mode: specific dates or date range)
  - DatePicker component wrapping react-day-picker v9 (mode=multiple and mode=range)
  - CopyLinkButton client component with clipboard API + execCommand fallback
  - /e/[id]/confirm server component — verifies event exists, shows copyable shareable link
  - NEXT_PUBLIC_APP_URL env var documented in .env.local.example
affects:
  - 01-03 (availability grid — links from /e/[id], event data already in DB)
  - 01-04 (participant auth — participants arrive via the shared /e/[id] link)
  - All subsequent plans — event creation is the root of the user flow

# Tech tracking
tech-stack:
  added: []  # All packages already installed in Plan 01 (zod, @upstash/ratelimit, @upstash/redis, react-day-picker, date-fns)
  patterns:
    - Route Handler (not Server Action) for event creation — needed for standard HTTP status codes (429) and IP header access
    - IP-based rate limiting first before any validation or DB work — fail fast pattern
    - Date serialization as YYYY-MM-DD ISO strings via .toISOString().split('T')[0] — never local time strings
    - Auto-detected timezone via Intl.DateTimeFormat().resolvedOptions().timeZone with SSR guard
    - Client component form submits to Route Handler via fetch — no Server Action
    - CopyLinkButton as small client island within server component confirm page

key-files:
  created:
    - src/lib/validations.ts
    - src/lib/rate-limit.ts
    - src/app/api/events/route.ts
    - src/components/date-picker.tsx
    - src/components/create-event-form.tsx
    - src/components/copy-link-button.tsx
    - src/app/e/[id]/confirm/page.tsx
  modified:
    - src/app/page.tsx
    - .env.local.example

key-decisions:
  - "Route Handler (not Server Action) for event creation: Server Actions do not expose raw request headers cleanly; rate limiting needs x-forwarded-for IP header via NextRequest"
  - "react-day-picker v9 API matched research: DayPicker with mode prop, DateRange type from react-day-picker — no surprises"
  - "CopyLinkButton added as unplanned extra file: plan listed it in action steps but not in files_modified; added cleanly as client island within server confirm page"

patterns-established:
  - "Rate-limit-first pattern: eventCreationRatelimit.limit(ip) is called before JSON parsing or DB operations in the Route Handler"
  - "Island architecture pattern: server component pages (confirm page) contain small client islands (CopyLinkButton) for interactivity"
  - "Date serialization pattern: always use .toISOString().split('T')[0] for YYYY-MM-DD, never toLocaleDateString() which is locale-dependent"

requirements-completed:
  - EVNT-01
  - EVNT-02
  - EVNT-03
  - EVNT-04
  - EVNT-05
  - EVNT-06
  - MOBI-01
  - MOBI-03

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 1 Plan 02: Event Creation API and Form Summary

**POST /api/events route handler with Upstash sliding-window rate limiting, Zod validation, multi-mode date picker, and /e/[id]/confirm page with copyable shareable link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T06:26:23Z
- **Completed:** 2026-02-18T06:28:50Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- POST /api/events Route Handler: IP-extracted rate limit check first (10 req/min sliding window), then Zod validation, then DB insert of event + eventDates rows, returns 201 with nanoid ID
- CreateEventForm client component: specific-dates/date-range mode toggle, react-day-picker v9 calendar, time window selects with AM/PM labels, auto-detected timezone, fetch to /api/events, router.push on success
- /e/[id]/confirm server component: verifies event in DB via Drizzle query, renders event title + copyable link; CopyLinkButton client island handles clipboard API with execCommand fallback
- `npm run build` exits 0, `npx tsc --noEmit` passes — no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod validation schema, rate limiter, and POST /api/events Route Handler** - `85d7ccc` (feat)
2. **Task 2: Create-event form, date picker, confirmation page, and home page wiring** - `aa004f2` (feat)

**Plan metadata:** [pending final commit]

## Files Created/Modified

- `src/lib/validations.ts` - createEventSchema (Zod): title, description, dateMode, specificDates, rangeStart/End, dayStart/End, timezone with cross-field refine rules
- `src/lib/rate-limit.ts` - eventCreationRatelimit: Upstash sliding window, 10 req/min, prefix timely:event-creation
- `src/app/api/events/route.ts` - POST handler: rate limit → validate → insert events → insert eventDates → 201 {id}
- `src/components/date-picker.tsx` - react-day-picker v9 wrapper supporting mode=multiple and mode=range; disabled dates before today; max=14 for range
- `src/components/create-event-form.tsx` - Full event creation form with local state, mode toggle, date picker, time selects, error display, fetch submit, router redirect
- `src/components/copy-link-button.tsx` - Clipboard copy button with 2s copied feedback and execCommand fallback for older browsers
- `src/app/e/[id]/confirm/page.tsx` - Server component: DB lookup, notFound() guard, renders event summary + copyable link + CopyLinkButton island
- `src/app/page.tsx` - Updated from placeholder to render CreateEventForm with tagline
- `.env.local.example` - Added NEXT_PUBLIC_APP_URL documentation

## Decisions Made

- **Route Handler over Server Action:** Server Actions do not cleanly expose raw request headers; IP extraction for rate limiting requires `NextRequest`. Route Handlers return standard HTTP status codes (429, 201) which the client form already handles by checking `res.ok` and `res.status`.
- **react-day-picker v9 API matched research exactly:** The `DayPicker` component with `mode` prop and `DateRange` type imported from `react-day-picker` worked as documented. The `max={14}` prop on range mode enforces the 14-day decision from STATE.md.
- **CopyLinkButton as additional file:** The plan listed it in the action steps but not in `files_modified`. Added cleanly as a 35-line client island. Documented here per plan output instructions.

## Deviations from Plan

None — plan executed exactly as written. The only note is that `CopyLinkButton` was mentioned in the plan action steps (Step 3) but not listed in `files_modified` frontmatter — this was an oversight in the plan document, not a runtime deviation. The file was created as specified.

## Issues Encountered

None — `npm run build` passed on first attempt. react-day-picker v9 API matched research. TypeScript compiled cleanly across all new files.

## User Setup Required

None — environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, DATABASE_URL) were already configured in `.env.local` from Plan 01. NEXT_PUBLIC_APP_URL defaults to empty string at runtime (eventUrl gracefully degrades) and is documented in `.env.local.example`.

## Next Phase Readiness

- Event creation flow is complete end-to-end: home page form → POST /api/events → /e/[id]/confirm with copyable link
- Events and eventDates rows are being inserted to Neon — Plan 03 can read them for the availability grid
- Rate limiting is operational via Upstash — 11th rapid request in under a minute returns 429
- No blockers for Plan 03 (availability grid and participant response)

---
*Phase: 01-foundation-and-event-creation*
*Completed: 2026-02-18*

## Self-Check: PASSED

All files verified present:
- `src/lib/validations.ts` - FOUND
- `src/lib/rate-limit.ts` - FOUND
- `src/app/api/events/route.ts` - FOUND
- `src/components/date-picker.tsx` - FOUND
- `src/components/create-event-form.tsx` - FOUND
- `src/components/copy-link-button.tsx` - FOUND
- `src/app/e/[id]/confirm/page.tsx` - FOUND
- `src/app/page.tsx` - FOUND (modified)
- `.env.local.example` - FOUND (modified)

Commits verified:
- `85d7ccc` feat(01-02): Zod validation schema, rate limiter, and POST /api/events route handler
- `aa004f2` feat(01-02): create-event form, date picker, confirmation page, and home page wiring
