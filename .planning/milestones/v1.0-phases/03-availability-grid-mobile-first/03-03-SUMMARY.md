---
phase: 03-availability-grid-mobile-first
plan: "03"
subsystem: ui
tags: [vaul, zustand, sonner, next.js, react, tailwind]

# Dependency graph
requires:
  - phase: 03-02
    provides: AvailabilityGrid, GridCell, TimezoneSelector — grid interaction layer
  - phase: 03-01
    provides: GET/POST /api/availability route handlers, useGridStore

provides:
  - AvailabilityDrawer component — vaul container with full save lifecycle
  - AvailabilityCTA component — thin client wrapper for event page integration
  - Event page wired to drawer (no more static href link for session-active CTA)

affects:
  - 03-04-PLAN.md (visual verification checkpoint — tests this drawer end-to-end)
  - Phase 5 (heatmap / results view)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Derived dirty boolean from Set comparison (avoids stale closure in useGridStore)
    - saveInProgress ref guard for vaul onOpenChange double-fire (issue #345)
    - Auto-detect timezone on drawer open via Intl.DateTimeFormat().resolvedOptions().timeZone
    - direction state set on mount (window.innerWidth check) — avoids SSR mismatch
    - Server component computes gridDates for both dateMode types before passing to client island

key-files:
  created:
    - src/components/availability/availability-drawer.tsx
    - src/components/availability/availability-cta.tsx
  modified:
    - src/app/e/[id]/page.tsx

key-decisions:
  - "Derived dirty boolean (not isDirty() closure) to ensure reactive Save button updates"
  - "saveInProgress ref prevents double-save on vaul onOpenChange double-fire"
  - "direction state initialized on mount (not SSR) to avoid hydration mismatch"

patterns-established:
  - "Client island pattern: server component computes data, passes to thin 'use client' wrapper"
  - "Store reset on drawer close prevents stale slot state on re-open"

requirements-completed:
  - GRID-07
  - GRID-08
  - TIME-02
  - TIME-03

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 3 Plan 03: Availability Grid — Drawer Integration Summary

**Vaul full-screen availability drawer (mobile bottom / desktop right panel) with auto-save, load-on-open toasts, and timezone auto-detect wired into the event page**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T14:42:08Z
- **Completed:** 2026-02-18T14:50:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AvailabilityDrawer: full-screen vaul drawer (bottom on mobile, 480px right panel on desktop), close-only header, scrollable grid area, save button (disabled when not dirty), auto-save on close, store reset on close, timezone auto-detect on open, loads existing slots with toast
- AvailabilityCTA: thin client component that wraps AvailabilityDrawer with dynamic label ("Mark your availability" vs "Welcome back, {name} — Edit your availability")
- Event page updated: replaced static `<a href="/e/[id]/availability">` with AvailabilityCTA drawer trigger; server-side gridDates computation for both dateMode types (capped at 14 days for date_range); submittedAt query for hasSubmitted CTA label

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AvailabilityDrawer with vaul, load/save lifecycle, and timezone auto-detect** - `0229f7c` (feat)
2. **Task 2: Wire AvailabilityDrawer into the event page CTAs** - `4c81989` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified
- `src/components/availability/availability-drawer.tsx` - Vaul drawer with full save lifecycle (176 lines)
- `src/components/availability/availability-cta.tsx` - Thin client wrapper for event page integration
- `src/app/e/[id]/page.tsx` - Replaced session CTA anchor with AvailabilityCTA, added gridDates + hasSubmitted logic

## Decisions Made
- **Derived dirty boolean** instead of `isDirty()` closure: `selectedSlots.size !== savedSlots.size || [...selectedSlots].some(...)` subscribes to Zustand state reactively — `isDirty()` in JSX would capture a stale closure
- **saveInProgress ref** guards against vaul's known double-fire on `onOpenChange` (issue #345) — prevents duplicate POST on drawer close
- **direction state initialized on mount** (not SSR) to avoid React hydration mismatch between server and client window width
- **auto-save before reset** in `handleOpenChange`: dirty check uses the derived boolean, auto-saves if true, then calls `reset()` to clear store

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Pre-existing build failure (out of scope):** `npm run build` fails with `Missing API key. Pass it to the constructor new Resend("re_123")` on the magic-link/request route. This is a known blocker from Phase 2 (RESEND_API_KEY not set in environment). TypeScript compilation (`npx tsc --noEmit`) passes clean. Dev server works. Logged to `deferred-items.md`.

## User Setup Required

None — no new external service configuration required.

## Next Phase Readiness
- AvailabilityDrawer is fully integrated and ready for human visual verification in Plan 04 checkpoint
- The complete user flow (join → session → open drawer → mark slots → save) is implemented end-to-end
- Remaining blocker before production build: set RESEND_API_KEY in Vercel environment variables

---
*Phase: 03-availability-grid-mobile-first*
*Completed: 2026-02-18*
