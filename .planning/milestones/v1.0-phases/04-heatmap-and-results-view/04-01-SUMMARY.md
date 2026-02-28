---
phase: 04-heatmap-and-results-view
plan: "01"
subsystem: database
tags: [drizzle, neon, postgres, cookies, httponly, nanoid]

# Dependency graph
requires:
  - phase: 01-foundation-and-event-creation
    provides: events table schema and POST /api/events route handler
provides:
  - events table creator_token nullable column (Neon DB migrated)
  - POST /api/events sets httpOnly timely_creator_{id} cookie on creation
  - creatorToken stored in DB matches cookie value for isCreator checks
affects:
  - 04-heatmap-and-results-view (HEAT-06 confirm-time flow reads cookie to identify creator)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Creator identity via nanoid token stored in DB + matching httpOnly cookie — no participant record needed"
    - "Nullable column for backward compat — pre-Phase-4 rows have NULL, isCreator returns false"

key-files:
  created: []
  modified:
    - src/lib/schema.ts
    - src/app/api/events/route.ts

key-decisions:
  - "creatorToken stored as nullable text (no default) — explicit NULL for pre-Phase-4 events; acceptable that old events cannot use confirm-time UI"
  - "Cookie name timely_creator_{eventId} — per-event scoping prevents cross-event creator impersonation"
  - "maxAge 37 days (60*60*24*37) matches event expiry window"
  - "generateId() (nanoid 10-char) reused for creatorToken — consistent ID generation utility"

patterns-established:
  - "Creator identification: Option C (token in DB + httpOnly cookie) — no participant record, no session lookup"

requirements-completed:
  - HEAT-06

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 4 Plan 01: Creator Identity Token Summary

**Nullable creator_token column added to events table and httpOnly timely_creator_{id} cookie set on POST /api/events for stateless creator identification**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-18T23:24:15Z
- **Completed:** 2026-02-18T23:25:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `creatorToken: text('creator_token')` nullable column to events schema after confirmedSlot
- Ran `drizzle-kit push` — creator_token column now exists in Neon DB
- POST /api/events generates creatorToken = generateId(), stores it in DB, and returns httpOnly `timely_creator_{id}` cookie
- npm run build exits 0 — no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add creatorToken to events schema and run migration** - `0d0602e` (feat)
2. **Task 2: Set creator cookie in /api/events on event creation** - `7597b80` (feat)

## Files Created/Modified
- `src/lib/schema.ts` - Added nullable `creatorToken: text('creator_token')` column to events table; drizzle-kit push applied migration to Neon
- `src/app/api/events/route.ts` - Generate creatorToken alongside id, insert into DB, set httpOnly cookie on 201 response

## Decisions Made
- creatorToken is nullable with no default — pre-Phase-4 events retain NULL and will not be eligible for the confirm-time flow (acceptable per research pitfall #5)
- Cookie name is `timely_creator_{eventId}` (per-event) rather than a single creator cookie — prevents cross-event creator assertion
- Cookie maxAge set to 37 days matching event expiry (30-day window + 7-day buffer)
- Used existing `generateId()` utility (nanoid 10 chars, ~73 bits entropy) for creatorToken

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Creator identity foundation is complete. HEAT-06 can now check `cookies().get('timely_creator_{id}')` and compare against `event.creatorToken` to gate confirm-time UI.
- Any event created after this plan will have a non-null creator_token and a matching httpOnly cookie set in the user's browser.
- Pre-Phase-4 events (creator_token = NULL) will correctly show no confirm-time UI — no migration of existing data needed.

---
*Phase: 04-heatmap-and-results-view*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: src/lib/schema.ts (contains creatorToken)
- FOUND: src/app/api/events/route.ts (contains timely_creator_)
- FOUND: 04-01-SUMMARY.md
- FOUND: commit 0d0602e (Task 1 — schema migration)
- FOUND: commit 7597b80 (Task 2 — creator cookie)
