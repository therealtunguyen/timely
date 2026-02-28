# Phase 4: Heatmap and Results View - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Aggregate participant availability into a heatmap overlay on the existing grid, surface the best overlap time, provide a tap-a-name view for exploring individual/subgroup availability, and give the creator a flow to lock in a confirmed time. Editing availability, adding participants, and all other features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Heatmap color scale
- Smooth gradient: each slot's color is continuously interpolated from lightest (#FAF7F4) to darkest (#7C4A0E) based on its exact count relative to the event's peak count — no discrete steps
- Empty slots (zero responses): subtle off-white or muted border treatment to visually distinguish from filled slots — makes the heatmap "pop" against empties
- Own-slot indicator: when a viewer has their own availability saved, a subtle personal indicator (dot, check, or inner border) layers on top of the heatmap color for their own marked cells
- Heatmap is public — unauthenticated visitors with the event link see the full heatmap (aggregate counts only, no names exposed)

### Best-time callout
- Positioned above the grid — seen first on page load
- Shows top 1 slot only: date, time range, and "X of Y people free"
- Empty state (no responses yet): visible section with placeholder text "Waiting for responses" — section always present, not hidden
- Tapping the callout: creator-only action — opens the confirm-time bottom sheet directly. Non-creator visitors receive no tap action on the callout.

### Tap-a-name interaction
- Multi-select: multiple names can be tapped simultaneously
- When multiple names are selected, grid shows the **intersection** — only slots where every selected person is free
- Visual treatment when names are selected: matching (intersection) slots glow/stay bright; non-matching slots dim toward near-white — focus effect
- Deselect: tap a name again to toggle it off; no separate "clear all" button — individual toggles only

### Claude's Discretion
- Exact interpolation formula for the gradient (linear, square root, etc.) — pick what reads best across typical 2–10 participant counts
- Exact styling of the personal indicator (dot vs. inner border vs. checkmark)
- Animation/transition on name selection (instant vs. brief fade)
- Confirm-time bottom sheet content (what info to show beyond slot + count)
- Confirmed state display treatment after the creator locks a time

</decisions>

<specifics>
## Specific Ideas

- The heatmap should feel like a continuous temperature map — darker = more people, lighter = fewer — not like a bar chart laid over a grid
- The "Waiting for responses" empty callout should feel warm and expectant, not like an error state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-heatmap-and-results-view*
*Context gathered: 2026-02-18*
