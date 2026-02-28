---
phase: 05-polish-and-launch-readiness
plan: 01
subsystem: infra
tags: [vercel-cron, drizzle-orm, neon, nextjs, route-handler]

# Dependency graph
requires:
  - phase: 01-foundation-and-event-creation
    provides: events table with expiresAt column and CASCADE DELETE FK constraints

provides:
  - vercel.json cron schedule (daily at 3am UTC) calling /api/cron/expire-events
  - GET /api/cron/expire-events route handler with Bearer token auth and expired event deletion

affects:
  - deploy (must set CRON_SECRET in Vercel project settings before deployment)
  - privacy/gdpr (auto-expiry satisfies 30-day data retention requirement)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel Cron: vercel.json crons[] array with path + schedule fields"
    - "Cron auth: Authorization: Bearer CRON_SECRET header check — fail-closed (undefined secret == no match)"

key-files:
  created:
    - vercel.json
    - src/app/api/cron/expire-events/route.ts
  modified:
    - .env.local.example

key-decisions:
  - "CRON_SECRET fail-closed: process.env.CRON_SECRET undefined produces 'Bearer undefined' which never matches real auth headers — endpoint safely returns 401 if env var not set"
  - "Cron schedule 0 3 * * *: once daily at 3am UTC — Vercel Hobby plan only supports once-per-day crons"
  - "Drizzle lt(events.expiresAt, new Date()): JS Date evaluated at request time — avoids raw SQL while remaining accurate"
  - "CASCADE DELETE handles all child rows: eventDates, participants, availability, sessions, magicTokens deleted automatically — no batch loops needed"

patterns-established:
  - "Cron route handlers are GET (not POST) — Vercel Cron sends GET requests"
  - "Auth check before any DB work — reject unauthorized requests before expensive operations"

requirements-completed: [SECR-03]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 5 Plan 01: Automatic Event Expiry via Vercel Cron Summary

**Vercel Cron job (daily 3am UTC) deletes expired events via authenticated GET endpoint using Drizzle lt() and Postgres CASCADE DELETE**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T05:16:43Z
- **Completed:** 2026-02-19T05:18:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `vercel.json` with Hobby-plan-compatible daily cron schedule (`0 3 * * *`) targeting `/api/cron/expire-events`
- Created `GET /api/cron/expire-events` route handler with fail-closed Bearer token auth (401 without correct `CRON_SECRET` header)
- Expired events (and all child rows via CASCADE DELETE) swept in a single Drizzle query — no application-level loops
- Added `CRON_SECRET` documentation to `.env.local.example` with generation instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create vercel.json with daily cron schedule** - `7452c04` (chore)
2. **Task 2: Create /api/cron/expire-events Route Handler** - `8a2171d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `vercel.json` - Vercel Cron config scheduling GET /api/cron/expire-events once daily at 3am UTC
- `src/app/api/cron/expire-events/route.ts` - GET Route Handler: verifies CRON_SECRET Bearer token, deletes events where expiresAt < now(), returns `{ deleted: N, ids: [...] }`
- `.env.local.example` - Added CRON_SECRET placeholder with generation instructions

## Decisions Made

- Cron schedule `0 3 * * *` (once daily at 3am UTC) — Vercel Hobby plan limitation prevents sub-daily schedules; 3am UTC is low-traffic window
- `process.env.CRON_SECRET` undefined produces `'Bearer undefined'` — this never matches a real auth header, so endpoint fails closed without env var set
- `lt(events.expiresAt, new Date())` with JS `Date()` — evaluated at request time in JS runtime; consistent and avoids raw SQL
- All child record deletion handled by Postgres CASCADE DELETE on FK constraints (eventDates, participants, availability, sessions, magicTokens) — no application-level batch loops needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled clean, curl tests confirmed 401 without auth header and 401 with wrong secret.

## User Setup Required

**CRON_SECRET must be configured manually in Vercel before deployment:**

1. Generate a random secret: `openssl rand -hex 32`
2. Add to Vercel Dashboard -> Project -> Settings -> Environment Variables: `CRON_SECRET=<generated-value>`
3. Add the same value to `.env.local` for local testing: `CRON_SECRET=<generated-value>`
4. Verify locally: `curl -H "Authorization: Bearer <value>" http://localhost:3000/api/cron/expire-events`
   - Expected: `{"deleted":N,"ids":[...]}`

## Next Phase Readiness

- SECR-03 complete — automatic event expiry implemented and scheduled
- CRON_SECRET env var must be set in Vercel project settings before first deployment for cron to function
- Remaining Phase 5 plans can proceed: creator cookie recovery (Phase 5 Plan 02+) and any other launch-readiness items

---
*Phase: 05-polish-and-launch-readiness*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: vercel.json
- FOUND: src/app/api/cron/expire-events/route.ts
- FOUND: .planning/phases/05-polish-and-launch-readiness/05-01-SUMMARY.md
- FOUND commit: 7452c04 (chore: vercel.json cron schedule)
- FOUND commit: 8a2171d (feat: expire-events route handler)
