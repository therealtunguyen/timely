---
phase: 03-availability-grid-mobile-first
plan: 02
subsystem: ui
tags: [react, zustand, date-fns-tz, pointer-events, css-grid, touch, mobile, tailwind]

# Dependency graph
requires:
  - phase: 03-availability-grid-mobile-first
    plan: 01
    provides: useGridStore with selectedSlots/paintSlot/setTimezone, GET/POST /api/availability

provides:
  - GridCell component with data-slot-key and 44x44px touch target
  - TimeColumn component with sticky left column and time labels
  - AvailabilityGrid: full drag-to-paint grid with Pointer Events API engine
  - TimezoneSelector: "Wrong timezone?" link that reveals Intl.supportedValuesOf dropdown

affects:
  - 03-03 (DrawerShell integration — will import and render AvailabilityGrid + TimezoneSelector)
  - 03-04 (SaveBar integration — reads isDirty from store)
  - 03-05 (Heatmap layer — overlays on AvailabilityGrid)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pointer Events API for unified mouse+touch drag: setPointerCapture on container, elementFromPoint for cell hit-testing"
    - "Ref-based drag state: isDragging and dragMode use useRef — no React setState during active drag"
    - "CSS grid with sticky first column: gridTemplateColumns with 80px time col + repeat(N, minmax(64px, 1fr))"
    - "data-vaul-no-drag attribute on grid container prevents vaul drawer from intercepting vertical grid drags"
    - "fromZonedTime/toZonedTime (date-fns-tz v3) — not deprecated v2 zonedTimeToUtc/utcToZonedTime"

key-files:
  created:
    - src/components/availability/grid-cell.tsx
    - src/components/availability/time-column.tsx
    - src/components/availability/availability-grid.tsx
    - src/components/availability/timezone-selector.tsx
  modified: []

key-decisions:
  - "TimeColumn component built as standalone but grid uses inline sticky time labels — CSS grid requires label cells to be siblings of data cells for column alignment"
  - "TimezoneSelector closes dropdown on selection (setIsOpen(false) after setTimezone()) for clean UX flow"

patterns-established:
  - "GridCell carries data-slot-key attribute — drag handler identifies cells via elementFromPoint + closest('[data-slot-key]') traversal"
  - "Pointer capture on container, not individual cells — ensures pointermove fires even when finger moves outside cell boundaries"
  - "UTC as fallback when timezone not yet detected — re-renders automatically when useGridStore.timezone populates"

requirements-completed:
  - GRID-01
  - GRID-02
  - GRID-03
  - GRID-04
  - GRID-05
  - GRID-06
  - TIME-04
  - MOBI-04

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 3 Plan 02: Core Grid UI Summary

**Drag-to-paint availability grid using Pointer Events API with sticky time column, CSS grid layout, 44px touch targets, and timezone correction dropdown**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T14:36:59Z
- **Completed:** 2026-02-18T14:38:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- GridCell component with `data-slot-key` attribute for hit-testing, 44x44px minimum touch target, warm orange selected state
- AvailabilityGrid: CSS grid drag-to-paint engine with Pointer Events API, `touch-none`, `data-vaul-no-drag`, ref-based drag state, fromZonedTime/toZonedTime (date-fns-tz v3)
- TimezoneSelector: "Wrong timezone?" link that expands to `Intl.supportedValuesOf('timeZone')` select; setTimezone() clears selections

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GridCell and TimeColumn components** - `d336aab` (feat)
2. **Task 2: Create AvailabilityGrid and TimezoneSelector** - `9eb2e51` (feat)

## Files Created/Modified

- `src/components/availability/grid-cell.tsx` - 44px min touch target, data-slot-key attr, brand orange selected / warm hover unselected states
- `src/components/availability/time-column.tsx` - Standalone sticky time column component (for optional external use)
- `src/components/availability/availability-grid.tsx` - Full drag-to-paint grid: CSS grid layout, Pointer Events capture, fromZonedTime slot generation, toZonedTime time labels
- `src/components/availability/timezone-selector.tsx` - Wrong timezone link + Intl.supportedValuesOf dropdown, clears selections on change

## Decisions Made

- TimeColumn component was built as a standalone component per the plan spec, but AvailabilityGrid inlines the sticky time labels directly in the CSS grid DOM structure. This is correct — CSS grid requires time label cells to be siblings of data cells in the same grid container for column alignment to work.
- TimezoneSelector closes the dropdown after selection (`setIsOpen(false)`) to give a clean UX flow after choosing a timezone.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four grid UI components ready for integration into the DrawerShell (Phase 3 Plan 03)
- AvailabilityGrid accepts `dates[]`, `dayStart`, `dayEnd` props — DrawerShell will supply these from event data
- TimezoneSelector reads/writes directly to useGridStore — drop-in component for drawer header area
- Touch grid conflict with vaul resolved via `data-vaul-no-drag` and `touch-none` — no further mitigation needed

---
*Phase: 03-availability-grid-mobile-first*
*Completed: 2026-02-18*

## Self-Check: PASSED

All files present:
- FOUND: src/components/availability/grid-cell.tsx
- FOUND: src/components/availability/time-column.tsx
- FOUND: src/components/availability/availability-grid.tsx
- FOUND: src/components/availability/timezone-selector.tsx
- FOUND: .planning/phases/03-availability-grid-mobile-first/03-02-SUMMARY.md

All commits verified:
- FOUND: d336aab (Task 1 — GridCell and TimeColumn)
- FOUND: 9eb2e51 (Task 2 — AvailabilityGrid and TimezoneSelector)
