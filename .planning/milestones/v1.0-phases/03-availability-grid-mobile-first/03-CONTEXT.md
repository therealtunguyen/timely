# Phase 3: Availability Grid (Mobile-First) - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A touch-native drag-to-paint time grid where authenticated participants mark their available slots and save to the database. Return visits pre-fill existing selections. This phase delivers the grid UI, timezone handling, and DB persistence — not heatmaps or aggregated views (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Grid Entry Point
- Grid opens as a **vaul full-screen drawer** — not a separate page, not inline on the event page
- **Separate CTAs** on the event page: "Mark your availability" for new participants (post-join), "Edit your availability" for returning participants (already authenticated)
- Drawer header: **just a close button (X)** — no title, no event context — grid gets maximum vertical space
- Standard **vaul drag handle** (pill) at the top — drag-to-dismiss is expected behavior
- On **desktop**: opens as a side panel or centered dialog (not a bottom sheet)
- On **close**: auto-save triggers automatically — no discard confirmation needed

### Timezone UI
- Timezone control is **hidden by default** — auto-detect runs silently on grid open
- A **"Wrong timezone?" text link** is the only visible affordance — tapping it opens a timezone correction selector
- Link placement: Claude's discretion (least intrusive, still discoverable)
- When the user corrects timezone: **grid re-renders immediately** with new time labels, **all painted selections are cleared** (to avoid ambiguity about which timezone they were made in)

### Save Flow
- **Both** an explicit button AND auto-save: "Save availability" button in the drawer footer + auto-save triggers on close
- Save button is **disabled/greyed** when no changes have been made
- After tapping the explicit save button: **Sonner toast** ("Availability saved") + **stay in the grid** (user can keep editing)
- When a returning participant opens the grid with pre-filled slots: **Sonner toast on open** ("Loaded your previous availability")

### Claude's Discretion
- Exact placement of "Wrong timezone?" link within the drawer
- Visual design of selected vs. unselected cells (color, opacity, border)
- Loading/saving state indicators on the save button
- Error handling for failed save attempts

</decisions>

<specifics>
## Specific Ideas

- The grid drawer should feel like opening a focused task — stripped down to just the grid. No distractions.
- Auto-save on close means the X button is effectively "done" — no separate confirmation flow needed.
- The "Wrong timezone?" link is a safety net, not a prominent feature — most users won't need it.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-availability-grid-mobile-first*
*Context gathered: 2026-02-18*
