---
phase: 05-polish-and-launch-readiness
plan: "04"
subsystem: ui
tags: [next.js, server-component, cookie, flash-toast, footer]

# Dependency graph
requires:
  - phase: 05-02
    provides: deleteEvent Server Action, DeleteEventButton AlertDialog, FlashToast component

provides:
  - Creator-only manage page at /e/[id]/manage with delete UI and cookie-loss disclaimer
  - "Manage event" link on event page visible only to cookie-verified creator
  - Footer with /privacy link on all pages via root layout
  - FlashToast mounted in root layout enabling post-redirect toast display

affects:
  - 05-06 (final launch readiness — manage flow is part of complete creator UX)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component cookie check for creator identity gate on manage page
    - Soft no-access message pattern (not notFound()) for cookie-loss edge case
    - Root layout footer for sitewide /privacy link
    - FlashToast + Sonner Toaster co-located in root layout for post-redirect toasts

key-files:
  created:
    - src/app/e/[id]/manage/page.tsx
  modified:
    - src/app/e/[id]/page.tsx
    - src/app/layout.tsx

key-decisions:
  - "Manage page uses soft no-access message (not notFound()) when creator cookie absent — per prior user decision SECR-03"
  - "Nonexistent event ID on manage page redirects to / (not 404) — event may have been deleted"
  - "Footer is minimal: Privacy link only, no additional nav — consistent with single-purpose tool aesthetic"
  - "FlashToast placed before Toaster in layout — render order ensures Sonner is mounted before FlashToast fires toasts"

patterns-established:
  - "Creator identity gate: read timely_creator_{id} cookie, compare to event.creatorToken — same pattern as event page isCreator check"
  - "Soft no-access: return friendly JSX instead of notFound() when feature requires auth state that may have been lost"

requirements-completed:
  - SECR-03

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 5 Plan 04: Creator Manage Page and Layout Polish Summary

**Creator-only /e/[id]/manage page with delete flow, isCreator-gated "Manage event" link on event page, sitewide footer with /privacy, and FlashToast mounted in root layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T05:22:49Z
- **Completed:** 2026-02-19T05:24:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- New manage page at `/e/[id]/manage`: verifies creator cookie, renders delete UI with `DeleteEventButton` and cookie-loss disclaimer, shows friendly no-access message (not 404) when cookie absent, redirects to `/` when event not found
- "Manage event" link added to event page header, conditionally rendered only when `isCreator === true`
- Root layout updated: `flex flex-col min-h-dvh` on body, `flex-1` wrapper for children, footer with Privacy link, `FlashToast` and `Toaster` both mounted — enabling end-to-end delete-and-redirect-with-toast flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /e/[id]/manage page (creator-only utility)** - `d04728d` (feat)
2. **Task 2: Wire Manage link on event page + add footer and FlashToast to layout** - `c817cd1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/e/[id]/manage/page.tsx` - Creator-only manage page: cookie identity check, delete UI, soft no-access fallback
- `src/app/e/[id]/page.tsx` - Added Link import + isCreator-conditional "Manage event" link in event header
- `src/app/layout.tsx` - Added Link + FlashToast imports, flex layout on body, footer with /privacy, FlashToast before Toaster

## Decisions Made

- Manage page uses soft no-access message (not `notFound()`) when creator cookie is absent — consistent with prior user decision that cookie loss should show helpful message about auto-expiry
- Nonexistent event ID redirects to `/` rather than triggering 404 — event may have been deleted, redirect is friendlier
- Footer is minimal: Privacy link only — appropriate for a no-account, single-purpose scheduling tool
- `FlashToast` placed before `Toaster` in layout DOM order — Sonner must be initialized before `FlashToast`'s `useEffect` fires

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full creator-delete flow is complete: event page → "Manage event" link → manage page → Delete button → AlertDialog → confirm → redirect to `/` → "Event deleted." toast
- Manage page shows no-access message when creator cookie is absent (not 404)
- Footer with Privacy link appears on all pages
- `npx tsc --noEmit` passes with zero errors
- Remaining: Phase 5 Plan 06 (final launch readiness check)

## Self-Check: PASSED

- manage/page.tsx: FOUND
- event page.tsx: FOUND
- layout.tsx: FOUND
- 05-04-SUMMARY.md: FOUND
- Commit d04728d: FOUND
- Commit c817cd1: FOUND

---
*Phase: 05-polish-and-launch-readiness*
*Completed: 2026-02-19*
