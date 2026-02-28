---
phase: 04-heatmap-and-results-view
plan: "02"
subsystem: ui
tags: [zustand, heatmap, color-interpolation, motion, grid-cell, react]

# Dependency graph
requires:
  - phase: 03-availability-grid-mobile-first
    provides: GridCell component (grid-cell.tsx) used as base for heatmap extension
provides:
  - slotColor() sqrt-interpolated hex color function (HEATMAP_LIGHT to HEATMAP_DARK)
  - useHeatmapStore Zustand store with selectedNames, toggleName, clearNames, intersectionSlots
  - Extended GridCell supporting both edit mode (isSelected) and heatmap mode (heatmapColor)
affects: [04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server data as function args: participantSlots passed to intersectionSlots() at call time, not stored in Zustand"
    - "Inline style for runtime colors: style={{ backgroundColor: heatmapColor }} — never dynamic Tailwind class"
    - "Dual-mode component: single GridCell handles edit mode (isSelected) and heatmap mode (heatmapColor) via conditional branch"
    - "Sqrt interpolation for perceptual color spread: t = sqrt(count/peak) makes low counts visually distinct"

key-files:
  created:
    - src/lib/heatmap-color.ts
    - src/lib/stores/heatmap-store.ts
  modified:
    - src/components/availability/grid-cell.tsx

key-decisions:
  - "participantSlots passed as function arg to intersectionSlots() rather than stored in Zustand — server data stays as props"
  - "inline style for backgroundColor (not dynamic Tailwind class) — Tailwind v4 scans at build time, cannot generate runtime hex strings"
  - "sqrt interpolation (not linear) for perceptual color spread across small participant counts (2-10)"
  - "Missing participant treated as empty Set in intersectionSlots() — prevents show-all-slots bug when participant has no data"

patterns-established:
  - "Dual-mode GridCell: heatmapColor prop undefined = edit mode, defined = heatmap mode with motion.div"
  - "motion.div animate prop for opacity transitions — avoids CSS transition on dynamically-set inline styles"

requirements-completed:
  - HEAT-01
  - HEAT-02
  - HEAT-04

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 4 Plan 02: Heatmap Primitives Summary

**sqrt-interpolated amber heatmap color utility, Zustand tap-a-name store with intersection logic, and dual-mode GridCell with motion opacity and personal indicator**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-18T23:24:21Z
- **Completed:** 2026-02-18T23:25:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- slotColor() function with sqrt perceptual interpolation between #FAF7F4 (empty) and #7C4A0E (peak), verified manually (slotColor(0,5)='#FAF7F4', slotColor(5,5)='#7c4a0e')
- useHeatmapStore with selectedNames Set, toggleName (immutable updates), clearNames, and intersectionSlots() that treats missing participants as empty Set to prevent show-all-slots bug
- Extended GridCell to handle both edit mode (existing, unchanged) and heatmap mode (motion.div with inline backgroundColor, opacity dimming, isOwn personal indicator, aria-label)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create heatmap color utility and Zustand store** - `d1204b4` (feat)
2. **Task 2: Extend GridCell with heatmap display props** - `4b0c88f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/heatmap-color.ts` - Pure TS color utility: slotColor(), HEATMAP_LIGHT, HEATMAP_DARK constants, hexToRgb/lerpColor helpers
- `src/lib/stores/heatmap-store.ts` - Zustand v5 store for tap-a-name UI: selectedNames Set, toggleName, clearNames, intersectionSlots(participantSlots)
- `src/components/availability/grid-cell.tsx` - Extended with heatmapColor, isOwn, dimmed, count, totalParticipants, dateLabel, timeLabel props; motion.div for heatmap mode

## Decisions Made
- participantSlots passed as function argument to intersectionSlots() — server-fetched data stays as React props, not duplicated in client Zustand store
- inline style for backgroundColor (not `bg-[${heatmapColor}]`) — Tailwind v4 cannot generate dynamic class names at runtime
- sqrt interpolation for perceptual color spread — makes 2 vs 3 people visually distinct even when peak is 10
- Missing participant key treated as empty Set — prevents intersection from silently returning all slots

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three heatmap primitives ready for Plan 03 (HeatmapGrid composition) and Plan 04 (results view)
- slotColor() pre-computed in parent, passed as heatmapColor prop — follows established inline-style pattern
- useHeatmapStore ready for tap-a-name name pills and intersection highlighting
- GridCell edit mode completely backward-compatible — AvailabilityGrid unaffected

## Self-Check: PASSED

- src/lib/heatmap-color.ts — FOUND
- src/lib/stores/heatmap-store.ts — FOUND
- src/components/availability/grid-cell.tsx — FOUND
- .planning/phases/04-heatmap-and-results-view/04-02-SUMMARY.md — FOUND
- Commit d1204b4 (Task 1) — FOUND
- Commit 4b0c88f (Task 2) — FOUND

---
*Phase: 04-heatmap-and-results-view*
*Completed: 2026-02-19*
