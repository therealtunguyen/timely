---
phase: 03-availability-grid-mobile-first
plan: 01
subsystem: api
tags: [zustand, drizzle, neon-http, availability, state-management, api-routes]

# Dependency graph
requires:
  - phase: 02-participant-identity-and-pin-system
    provides: getSession(), DB-backed session model, participants table, schema.ts

provides:
  - Zustand v5 grid state store (useGridStore) with selectedSlots, savedSlots, isDirty, paintSlot, setTimezone, initFromSaved, reset
  - GET /api/availability — returns participant's existing slots as UTC ISO strings
  - POST /api/availability — atomically replaces all slots via db.batch() + updates submittedAt

affects: [03-availability-grid-mobile-first/03-02, 03-availability-grid-mobile-first/03-03, 03-availability-grid-mobile-first/03-04]

# Tech tracking
tech-stack:
  added: [zustand@5.0.11]
  patterns:
    - Zustand client store (no server-only import) — importable in client components
    - db.batch() for atomic delete+insert in neon-http driver (no transaction() support)
    - paintSlot(key, mode) explicit mode parameter — drag gesture determines mode from first cell
    - setTimezone() clears selectedSlots — prevents stale UTC keys after tz change
    - GET availability returns 200 + empty slots for unauthenticated users (not 401)
    - POST availability validates eventId against session.eventId — prevents cross-event slot injection

key-files:
  created:
    - src/lib/stores/grid-store.ts
    - src/app/api/availability/route.ts
  modified:
    - package.json (zustand added to dependencies)
    - package-lock.json

key-decisions:
  - "GET /api/availability returns { slots: [] } with 200 (not 401) for unauthenticated users — grid loads empty state gracefully"
  - "db.batch() used (not db.transaction()) — neon-http driver does not support transactions"
  - "paintSlot takes explicit mode parameter ('add' | 'remove') — cleaner than toggle for drag-to-paint"
  - "setTimezone clears selectedSlots per locked tz-change decision — prevents stale UTC slot keys"

patterns-established:
  - "Zustand store: no server-only, importable in client components, Set<string> for slot tracking"
  - "API route auth: getSession() with no args for cookie-scoped session lookup"
  - "db.batch() atomic pattern: always delete first, conditionally insert after"

requirements-completed: [GRID-07, GRID-08, TIME-02, TIME-03]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 3 Plan 01: Zustand Grid Store and Availability API Routes Summary

**Zustand v5 grid state store with Set-based slot tracking, plus GET/POST /api/availability using db.batch() atomic replace semantics for neon-http**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T14:31:01Z
- **Completed:** 2026-02-18T14:33:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed Zustand v5 and created `src/lib/stores/grid-store.ts` with all required store interface: selectedSlots Set, savedSlots Set, timezone, isSaving, paintSlot(key, mode), setTimezone (clears slots), initFromSaved, isDirty(), reset()
- Created `src/app/api/availability/route.ts` with GET (returns slots or empty array for unauthed) and POST (atomically replaces slots via db.batch(), updates submittedAt + timezone)
- All TypeScript type checks pass; both endpoints verified at runtime against dev server

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Zustand and create grid Zustand store** - `7af88f1` (feat)
2. **Task 2: Create GET and POST /api/availability route handlers** - `e6798e5` (feat)

## Files Created/Modified
- `src/lib/stores/grid-store.ts` — Zustand v5 client store; exports useGridStore with full grid selection state management
- `src/app/api/availability/route.ts` — GET returns participant slots (or [] for unauthed); POST atomically replaces slots via db.batch() + updates participant submittedAt/timezone
- `package.json` — added zustand@5.0.11 to dependencies
- `package-lock.json` — updated lockfile with zustand install

## Decisions Made
- GET returns 200 + `{ slots: [] }` for unauthenticated users (not 401) — grid component loads in empty state without forcing auth
- POST validates `eventId` from request body against `session.eventId` — returns 403 on mismatch to prevent cross-event slot injection
- db.batch() used (not db.transaction()) — neon-http driver uses HTTP transport, no transaction support
- setTimezone() always clears selectedSlots — prevents stale UTC keys after timezone change (locked decision from planning)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Grid store (`useGridStore`) ready for import in client grid component (Phase 3 Plan 02+)
- GET /api/availability ready for client-side data fetching on grid mount
- POST /api/availability ready for save flow (will be called from grid save button)
- All data foundation for Phase 3 grid rendering is in place

## Self-Check: PASSED

- FOUND: src/lib/stores/grid-store.ts
- FOUND: src/app/api/availability/route.ts
- FOUND: .planning/phases/03-availability-grid-mobile-first/03-01-SUMMARY.md
- FOUND: commit 7af88f1 (Task 1)
- FOUND: commit e6798e5 (Task 2)
- FOUND: commit 33affb3 (metadata)

---
*Phase: 03-availability-grid-mobile-first*
*Completed: 2026-02-18*
