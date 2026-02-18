# Phase 3: Availability Grid (Mobile-First) - Research

**Researched:** 2026-02-18
**Domain:** Touch-native drag-to-paint time grid, timezone handling, vaul drawer, Drizzle/Neon persistence
**Confidence:** HIGH (core stack), MEDIUM (vaul edge behaviors), HIGH (date-fns-tz API)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grid Entry Point**
- Grid opens as a vaul full-screen drawer — not a separate page, not inline on the event page
- Separate CTAs on the event page: "Mark your availability" for new participants (post-join), "Edit your availability" for returning participants (already authenticated)
- Drawer header: just a close button (X) — no title, no event context — grid gets maximum vertical space
- Standard vaul drag handle (pill) at the top — drag-to-dismiss is expected behavior
- On desktop: opens as a side panel or centered dialog (not a bottom sheet)
- On close: auto-save triggers automatically — no discard confirmation needed

**Timezone UI**
- Timezone control is hidden by default — auto-detect runs silently on grid open
- A "Wrong timezone?" text link is the only visible affordance — tapping it opens a timezone correction selector
- Link placement: Claude's discretion (least intrusive, still discoverable)
- When the user corrects timezone: grid re-renders immediately with new time labels, all painted selections are cleared (to avoid ambiguity about which timezone they were made in)

**Save Flow**
- Both an explicit button AND auto-save: "Save availability" button in the drawer footer + auto-save triggers on close
- Save button is disabled/greyed when no changes have been made
- After tapping the explicit save button: Sonner toast ("Availability saved") + stay in the grid (user can keep editing)
- When a returning participant opens the grid with pre-filled slots: Sonner toast on open ("Loaded your previous availability")

### Claude's Discretion
- Exact placement of "Wrong timezone?" link within the drawer
- Visual design of selected vs. unselected cells (color, opacity, border)
- Loading/saving state indicators on the save button
- Error handling for failed save attempts

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRID-01 | Responder can mark time slots as available on a visual grid | Custom grid component; cells toggle on pointer contact |
| GRID-02 | Grid supports touch drag-to-paint selection on mobile | Pointer Events API: pointerdown/pointermove/pointerup + setPointerCapture + data-vaul-no-drag on container |
| GRID-03 | Grid uses 30-minute slot granularity | Slot array generated from dayStart/dayEnd with 48 steps max per 24h; each step = 30 min |
| GRID-04 | Touch targets meet minimum 44x44px (Apple HIG) | CSS: min-height: 44px, min-width: 44px per cell; verified at render time |
| GRID-05 | Grid works with both specific-dates and date-range events | Column generation differs by dateMode; range generates dates from rangeStart to rangeEnd (max 14) |
| GRID-06 | Time column is sticky during horizontal scroll | CSS: position: sticky; left: 0 on time column; overflow-x: scroll on grid wrapper |
| GRID-07 | Availability is saved to the database on submission | API route: POST /api/availability; db.batch([delete, insert]) with neon-http batch API |
| GRID-08 | Responder can update their availability on return visits | Load existing slots via GET; pre-fill Zustand selectedSlots Set; batch replaces on save |
| TIME-02 | Participant's timezone is auto-detected via browser | Intl.DateTimeFormat().resolvedOptions().timeZone on grid mount (client-only) |
| TIME-03 | Participant can manually correct their timezone | Intl.supportedValuesOf('timeZone') powers a select dropdown; opened by "Wrong timezone?" link |
| TIME-04 | Grid displays times in each participant's local timezone | toZonedTime() from date-fns-tz converts UTC slot times to participant local for display labels |
| MOBI-04 | All interactive elements are thumb-reachable on mobile | Footer CTA placement; grid fills drawer; 44px min cell height; no content above grid header |
</phase_requirements>

---

## Summary

Phase 3 builds a touch-native drag-to-paint time grid inside a vaul full-screen drawer. The core interaction is a custom grid component — no third-party grid library — using the Pointer Events API exclusively for drag-to-paint. The hardest technical problems are: (1) preventing vaul's drag-to-dismiss from interfering with the grid's internal drag gesture, (2) handling the neon-http driver's transaction limitations when saving slots, and (3) generating correct time labels across both specific-date and date-range event types.

The database persistence pattern is `db.batch([delete all participant slots, insert new slots])` using Drizzle's batch API with neon-http — this is an implicit transaction that rolls back all writes if any fail. The current project uses `drizzle-orm/neon-http`, which does NOT support `db.transaction()`, but DOES support `db.batch()` — this is the correct atomic approach for replace-all slot saves.

Timezone handling uses two established patterns: `Intl.DateTimeFormat().resolvedOptions().timeZone` for auto-detect (HIGH confidence, universally supported) and `date-fns-tz` v3's `fromZonedTime`/`toZonedTime` for UTC conversion on save and local display on load. Zustand is not yet installed in the project; it must be added.

**Primary recommendation:** Build the grid as a standalone client component with `data-vaul-no-drag` on the grid container to prevent drawer interference. Use `setPointerCapture` on pointerdown and `document.elementFromPoint` in pointermove to find cells under the dragging finger. Save with `db.batch()`, not `db.transaction()`.

---

## Standard Stack

### Core (already installed unless noted)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vaul | ^1.1.2 | Full-screen drawer container for grid | Already in project; decisions locked it |
| date-fns | ^4.1.0 | Date arithmetic, formatting slot labels | Already in project; project-wide date library |
| date-fns-tz | ^3.2.0 | UTC/local conversion; fromZonedTime, toZonedTime | Already in project; v3.2 supports date-fns v4 |
| sonner | ^2.0.7 | Toast notifications for save confirmation | Already in project; Toaster mounted in layout.tsx |
| zustand | ^5.0.x | Grid selection state (not installed yet) | Locked in stack decisions; lightweight, no provider needed |
| drizzle-orm | ^0.45.1 | Batch API for atomic delete+insert | Already in project; db.batch() confirmed with neon-http |
| Tailwind v4 | ^4.1.18 | Grid layout, sticky column, touch targets | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.574.0 | X close button icon in drawer header | Already installed |
| Pointer Events API | native | Drag-to-paint gesture | Built-in; no library needed |
| Intl API | native | Auto-detect timezone, list valid timezones | Built-in; Intl.supportedValuesOf('timeZone') for selector |

### Alternatives NOT Used (locked decisions)

| Instead of | Could Use | Why Locked Out |
|------------|-----------|---------------|
| Custom grid (Pointer Events) | react-use-gesture, use-spring | Decision locked to custom + Pointer Events API only |
| vaul drawer | separate page route | Decision locked to drawer |
| date-fns-tz | Luxon, @date-fns/tz | Decision locked to date-fns + date-fns-tz |

**Installation (Zustand only — everything else already installed):**
```bash
npm install zustand
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── availability/
│   │       └── route.ts          # POST (save), GET (load existing)
│   └── e/
│       └── [id]/
│           └── page.tsx          # Updated: CTAs trigger drawer
├── components/
│   ├── availability/
│   │   ├── availability-drawer.tsx    # vaul Drawer wrapper (full screen)
│   │   ├── availability-grid.tsx      # Grid DOM + drag logic (data-vaul-no-drag)
│   │   ├── time-column.tsx            # Sticky left column with 30-min labels
│   │   ├── grid-cell.tsx              # Single 30-min cell (44x44px min)
│   │   ├── timezone-selector.tsx      # "Wrong timezone?" + Intl.supportedValuesOf select
│   │   └── save-button.tsx            # Footer save button with disabled/loading states
│   └── identity/
│       └── participant-actions.tsx    # Updated: add "Mark my availability" drawer trigger
└── lib/
    └── stores/
        └── grid-store.ts             # Zustand store for grid state
```

### Pattern 1: vaul Full-Screen Drawer (Mobile = Bottom, Desktop = Right)

**What:** vaul drawer with `snapPoints={[1]}` for full screen on mobile. On desktop, `direction="right"` with explicit width styling gives a side panel feel.

**When to use:** This phase only — grid requires maximum vertical space.

**Key props to use:**
```typescript
// Source: https://vaul.emilkowal.ski/api
<Drawer.Root
  open={open}
  onOpenChange={(isOpen) => {
    if (!isOpen) {
      // Auto-save triggers HERE — fires when drawer starts closing
      handleAutoSave()
    }
    setOpen(isOpen)
  }}
  snapPoints={[1]}           // Full screen on mobile
  direction="bottom"         // Mobile: bottom sheet. Override on desktop via CSS breakpoint
  dismissible={true}         // Drag handle closes drawer (triggers onOpenChange)
  scrollLockTimeout={300}    // ms before drawer re-enables drag after scroll
>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      {/* drag handle pill auto-renders at top for direction=bottom */}
      <div data-vaul-no-drag>
        {/* EVERYTHING inside grid gets data-vaul-no-drag to prevent drag-to-dismiss conflict */}
        <AvailabilityGrid />
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

**CRITICAL — `data-vaul-no-drag`:** Place on the grid container element. Without this, the user dragging to paint cells will trigger vaul's drag-to-dismiss. Verified from vaul issue #241 and PR #250.

**Desktop override:** Use a CSS media query or Tailwind `md:` prefix to set `direction="right"` on larger screens. The shadcn drawer component pattern pairs a drawer (mobile) with a dialog (desktop) using `useMediaQuery`. This phase can use a simpler approach: conditionally set the `direction` prop.

### Pattern 2: Drag-to-Paint Grid with Pointer Events

**What:** The grid tracks which cells are "painted" during a single drag gesture. Mid-drag state lives in a ref (not React state) to avoid re-renders. React state is committed only when the gesture ends.

**When to use:** Exclusively for the grid component. This is the critical performance pattern.

**Implementation:**

```typescript
// Source: MDN Pointer Events docs + verified pattern
// The grid wrapper ref — receives pointer events
const gridRef = useRef<HTMLDivElement>(null)

// Ref for drag state — never triggers re-render mid-drag
const isDragging = useRef(false)
const dragMode = useRef<'add' | 'remove'>('add') // determined by first cell state

function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
  // Capture so pointermove fires even when finger moves outside grid
  e.currentTarget.setPointerCapture(e.pointerId)
  isDragging.current = true

  const cell = getCellFromPoint(e.clientX, e.clientY)
  if (!cell) return

  // First cell touched determines whether this gesture adds or removes
  dragMode.current = selectedSlots.has(cell.slotKey) ? 'remove' : 'add'
  paintCell(cell.slotKey)
}

function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
  if (!isDragging.current) return

  // Use clientX/Y + elementFromPoint to find cell under finger
  // Required because pointer is captured on the container, not the individual cells
  const cell = getCellFromPoint(e.clientX, e.clientY)
  if (cell) paintCell(cell.slotKey)
}

function handlePointerUp() {
  isDragging.current = false
  // Commit: sync ref-based painted cells to Zustand store
  commitDragToStore()
}

// Finds a grid cell DOM element at a screen coordinate
function getCellFromPoint(x: number, y: number): GridCell | null {
  const el = document.elementFromPoint(x, y)
  // Cell elements carry data-slot-key attribute
  const slotKey = el?.closest('[data-slot-key]')?.getAttribute('data-slot-key')
  return slotKey ? parseSlotKey(slotKey) : null
}
```

**touch-action: none on grid container:**
```css
/* Tailwind: */
<div className="touch-none" data-vaul-no-drag ...>
```
Without `touch-action: none`, the browser intercepts touch events for scrolling before Pointer Events fire, breaking drag-to-paint on iOS.

### Pattern 3: Slot Key Convention

**What:** A string key uniquely identifies each 30-minute slot. Used as the Set key in Zustand and as the `slotStart` UTC timestamp sent to the API.

**Format:** ISO 8601 UTC string — `"2026-03-15T14:00:00.000Z"`

This doubles as the database value — no conversion needed at save time.

```typescript
// Generate all slot keys for the grid
function generateSlotKeys(dates: string[], dayStart: number, dayEnd: number, tz: string): string[] {
  // Source: date-fns-tz v3 docs + date-fns v4 docs
  const slots: string[] = []
  for (const date of dates) {
    for (let hour = dayStart; hour < dayEnd; hour++) {
      for (const minute of [0, 30]) {
        // Construct local datetime string, then convert to UTC
        const localStr = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
        const utcDate = fromZonedTime(localStr, tz)  // date-fns-tz v3
        slots.push(utcDate.toISOString())
      }
    }
  }
  return slots
}
```

### Pattern 4: Zustand Grid Store

**What:** Isolated store for grid state. Not app-wide — scoped to the drawer lifecycle.

```typescript
// Source: zustand.docs.pmnd.rs/apis/create
// src/lib/stores/grid-store.ts
import { create } from 'zustand'

interface GridStore {
  selectedSlots: Set<string>          // Set of UTC ISO slot keys
  savedSlots: Set<string>             // Last saved state (for dirty check)
  timezone: string                    // IANA string
  isSaving: boolean
  setSelectedSlots: (slots: Set<string>) => void
  toggleSlot: (slotKey: string) => void
  setTimezone: (tz: string) => void
  setSaving: (saving: boolean) => void
  initFromSaved: (savedSlots: string[], tz: string) => void
  isDirty: () => boolean
  reset: () => void
}

export const useGridStore = create<GridStore>((set, get) => ({
  selectedSlots: new Set(),
  savedSlots: new Set(),
  timezone: '',
  isSaving: false,
  setSelectedSlots: (slots) => set({ selectedSlots: slots }),
  toggleSlot: (key) => set((s) => {
    const next = new Set(s.selectedSlots)
    if (next.has(key)) next.delete(key); else next.add(key)
    return { selectedSlots: next }
  }),
  setTimezone: (tz) => set({ timezone: tz, selectedSlots: new Set() }), // Clear on TZ change
  setSaving: (isSaving) => set({ isSaving }),
  initFromSaved: (savedSlots, tz) => {
    const slotSet = new Set(savedSlots)
    set({ selectedSlots: slotSet, savedSlots: slotSet, timezone: tz })
  },
  isDirty: () => {
    const { selectedSlots, savedSlots } = get()
    if (selectedSlots.size !== savedSlots.size) return true
    for (const s of selectedSlots) if (!savedSlots.has(s)) return true
    return false
  },
  reset: () => set({ selectedSlots: new Set(), savedSlots: new Set(), isSaving: false }),
}))
```

**Important:** Zustand stores are module-level singletons. For a grid that opens/closes repeatedly, call `reset()` when the drawer closes (in the `onOpenChange` handler) to avoid stale state on re-open.

### Pattern 5: API Route for Saving (Atomic Delete + Insert)

**What:** POST `/api/availability` — replaces all slots for a participant atomically using `db.batch()`.

**CRITICAL: use `db.batch()`, NOT `db.transaction()`.**

The project uses `drizzle-orm/neon-http`. This driver does NOT support `db.transaction()` (interactive transactions). It DOES support `db.batch()`, which executes multiple statements in a single HTTP call as an implicit transaction. Source: Drizzle batch docs + Neon serverless docs.

```typescript
// src/app/api/availability/route.ts
import { db } from '@/lib/db'
import { availability } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { generateId } from '@/lib/id'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Validate: array of UTC ISO strings
  const slots: string[] = body.slots ?? []

  // Atomic: delete existing + insert new in one batch call
  // db.batch() is supported by neon-http; db.transaction() is NOT
  await db.batch([
    db.delete(availability).where(eq(availability.participantId, session.participantId)),
    ...(slots.length > 0
      ? [db.insert(availability).values(
          slots.map(slotStart => ({
            id: generateId(),
            participantId: session.participantId,
            eventId: session.eventId,
            slotStart: new Date(slotStart),
            isAvailable: true,
          }))
        )]
      : [])
  ])

  // Update participant.submittedAt timestamp
  // (do this as a separate call — batch can't mix read and chained writes easily)
  await db.update(participants)
    .set({ submittedAt: new Date() })
    .where(eq(participants.id, session.participantId))

  return NextResponse.json({ success: true })
}
```

### Pattern 6: Timezone Handling

**Auto-detect (client, on grid mount):**
```typescript
// Source: MDN Intl.DateTimeFormat.resolvedOptions()
const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
// Returns IANA string e.g. "America/Chicago" — never an abbreviation
```

**Timezone selector (Intl.supportedValuesOf):**
```typescript
// Source: MDN Intl.supportedValuesOf
// Returns all browser-supported IANA timezone identifiers
const allTimezones = Intl.supportedValuesOf('timeZone')
// Chrome 99+, Firefox 91+, Safari 15.4+ — verified broadly supported
// Filter or group by region for usability
```

**Converting participant local time to UTC for storage:**
```typescript
// Source: date-fns-tz v3 changelog (v3.0.0 renamed API)
import { fromZonedTime } from 'date-fns-tz'
// fromZonedTime = renamed from zonedTimeToUtc in v3.0.0

const utcDate = fromZonedTime('2026-03-15T09:00:00', 'America/Chicago')
// → Date object in UTC: 2026-03-15T15:00:00.000Z (CST = UTC-6)
```

**Converting UTC DB slot to local time for grid display labels:**
```typescript
// Source: date-fns-tz v3 changelog (v3.0.0 renamed API)
import { toZonedTime, format } from 'date-fns-tz'
// toZonedTime = renamed from utcToZonedTime in v3.0.0

const localDate = toZonedTime(new Date('2026-03-15T15:00:00.000Z'), 'America/Chicago')
const label = format(localDate, 'h:mm a', { timeZone: 'America/Chicago' })
// → "9:00 AM"
```

### Pattern 7: Grid Layout (CSS)

The grid has two axes: time (rows, 30-min slots) and dates (columns). The time column must be sticky during horizontal scroll.

```typescript
// Outer wrapper: horizontal scroll container
<div className="overflow-x-auto">
  {/* Grid table: CSS grid with auto columns per date */}
  <div
    className="grid touch-none"
    style={{
      gridTemplateColumns: `80px repeat(${dates.length}, minmax(64px, 1fr))`,
      minWidth: `${80 + dates.length * 64}px`
    }}
    data-vaul-no-drag
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
  >
    {/* Time column header: sticky */}
    <div className="sticky left-0 z-10 bg-background" />
    {/* Date headers across top */}
    {dates.map(date => <DateHeader key={date} date={date} />)}

    {/* Slots: one row per 30-min increment */}
    {slotTimes.map(slot => (
      <>
        {/* Sticky time label */}
        <div className="sticky left-0 z-10 bg-background text-xs">{slot.label}</div>
        {/* Cells across all date columns */}
        {dates.map(date => (
          <GridCell
            key={`${date}-${slot.key}`}
            data-slot-key={`${date}T${slot.utcKey}`}
            className="min-h-[44px] min-w-[44px] ..."
            isSelected={selectedSlots.has(computeSlotKey(date, slot, timezone))}
          />
        ))}
      </>
    ))}
  </div>
</div>
```

### Anti-Patterns to Avoid

- **Using React state mid-drag:** Every `setState` during `pointermove` triggers a re-render. At 60fps drag, this causes lag and dropped touches. Use refs during drag; commit to Zustand on `pointerup`.
- **Using `db.transaction()` with neon-http:** It is not supported. Always use `db.batch()` for atomic operations on the existing neon-http driver.
- **Forgetting `data-vaul-no-drag`:** Without it, a slow vertical drag on the grid activates vaul's dismiss gesture. The grid feels broken on mobile.
- **Forgetting `touch-action: none`:** Without this Tailwind class (`touch-none`) on the grid container, iOS Safari intercepts vertical swipes as page scroll before Pointer Events fire, making drag-to-paint unreliable.
- **Using `setPointerCapture` on individual cells:** Capture must be set on the parent container so `pointermove` fires even when the finger moves between cells. Individual cell capture breaks cross-cell painting.
- **Storing timezone as abbreviation (CST, EST):** These are ambiguous and not IANA strings. Always store the full IANA string (e.g., "America/Chicago"). The participants table has a `timezone` column for this.
- **Not calling `reset()` on drawer close:** The Zustand store is a module singleton. If the drawer closes without resetting, re-opening shows stale selected slots before the new data loads.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | sonner (already installed) | Edge cases in animation, stacking, dismiss |
| Timezone detection | IP geolocation, user forms | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Zero-latency, accurate, universally supported |
| Timezone list | Hardcoded array | `Intl.supportedValuesOf('timeZone')` | Browser-native, always current |
| UTC conversion | Manual offset arithmetic | `fromZonedTime` from date-fns-tz | DST transitions, edge cases, off-by-one hours |
| Pointer capture | Custom event delegation | `element.setPointerCapture(e.pointerId)` | Native browser API, handles multi-touch correctly |
| Atomic DB writes | Sequential delete + insert | `db.batch([delete, insert])` | If insert fails without batch, you have no data; with batch it rolls back |

**Key insight:** The timezone math is the most dangerous hand-roll target. DST transitions mean a simple offset subtraction is wrong for ~2 hours/year in affected zones. `fromZonedTime` handles the ambiguous "fall back" hour correctly.

---

## Common Pitfalls

### Pitfall 1: Vaul Drag Intercepts Grid Drag
**What goes wrong:** User starts dragging to paint cells; vaul interprets the gesture as drag-to-dismiss and pulls the drawer down.
**Why it happens:** Vaul listens to `pointerdown`/`pointermove` on the entire drawer content. The grid's pointer events fire but vaul's listeners also fire.
**How to avoid:** Place `data-vaul-no-drag` on the grid container div. This attribute tells vaul to skip drag handling for events originating from this element. Confirmed merged in vaul PR #250.
**Warning signs:** Grid works on desktop (mouse) but fails on mobile (touch); drawer wobbles when painting cells.

### Pitfall 2: iOS Safari Rubber-Band Scroll Breaking Grid
**What goes wrong:** The grid scrolls the page instead of painting cells on vertical drag. Or the page bounces/rubber-bands during painting.
**Why it happens:** Without `touch-action: none`, iOS Safari handles touch events for scroll before Pointer Events fire. The `pointerdown` event fires but `pointermove` is cancelled by the browser's scroll handler.
**How to avoid:** `touch-action: none` (Tailwind: `touch-none`) on the grid container. Additionally, the vaul drawer itself handles page scroll locking, but the grid container still needs its own CSS.
**Warning signs:** Works on Android/Chrome but not iOS Safari; cells paint intermittently.

### Pitfall 3: Neon HTTP Driver Transaction Failure
**What goes wrong:** Code calls `db.transaction()` which throws at runtime: transaction not supported with HTTP driver.
**Why it happens:** The project uses `drizzle-orm/neon-http` (see `src/lib/db.ts`). The HTTP driver only supports `db.batch()`, not `db.transaction()`.
**How to avoid:** Use `db.batch([...])` for all multi-step atomic operations. The batch API is explicitly supported by neon-http and provides implicit transaction semantics.
**Warning signs:** `TypeError` or runtime error mentioning "transaction not supported"; data partially saves then fails.

### Pitfall 4: Zustand Store Stale State on Re-Open
**What goes wrong:** User opens grid, makes selections, closes (auto-saves), opens again — sees ghost selections from previous session before fetch completes.
**Why it happens:** Zustand store is a module singleton. State persists between drawer open/close cycles.
**How to avoid:** Call `useGridStore.getState().reset()` synchronously in the `onOpenChange(false)` handler, before or after auto-save. Then when the drawer re-opens, the grid starts empty while fresh data loads.
**Warning signs:** Slots appear selected even before the API load completes on second open.

### Pitfall 5: date-fns-tz v3 Function Name Mismatch
**What goes wrong:** Code imports `zonedTimeToUtc` or `utcToZonedTime` from date-fns-tz and gets "is not a function" or import error.
**Why it happens:** date-fns-tz v3.0.0 renamed the API: `zonedTimeToUtc` → `fromZonedTime`, `utcToZonedTime` → `toZonedTime`. The old names no longer exist.
**How to avoid:** Always use `fromZonedTime` (UTC conversion) and `toZonedTime` (local display) from date-fns-tz. The project has v3.2.0 installed.
**Warning signs:** Import errors at build time; incorrect conversions (off by hours).

### Pitfall 6: Timezone Clearing Not Triggered on Manual Change
**What goes wrong:** User corrects timezone; grid re-labels times but previous selections stay, causing data ambiguity (slot "9am" was painted in EST but now displays as CST, so it's actually a different UTC time).
**Why it happens:** The locked decision says: "all painted selections are cleared" on timezone change. If the store update only changes `timezone` but not `selectedSlots`, selections persist in the wrong timezone.
**How to avoid:** The `setTimezone` action in the Zustand store MUST also clear `selectedSlots: new Set()`. The store pattern above implements this correctly.
**Warning signs:** Selections persist through a timezone change; saved UTC slots don't match what the user expected.

### Pitfall 7: `elementFromPoint` Returns null at Grid Boundaries
**What goes wrong:** Fast diagonal drags near the grid edges return `null` from `document.elementFromPoint`, causing missed cell paints.
**Why it happens:** The pointer (captured on the container) can report coordinates outside the grid's visual boundary while still dragging. `elementFromPoint` hits a non-cell element.
**How to avoid:** Guard with `if (!cell) return` in `handlePointerMove`. Cells at boundaries still fire, just fast moves at the very edge may miss one cell — acceptable UX.
**Warning signs:** Cells near the edges don't paint during fast diagonal sweeps.

### Pitfall 8: Vaul `onOpenChange` Called Twice
**What goes wrong:** Auto-save fires twice when the user closes the drawer.
**Why it happens:** Known vaul issue (#345) where `onOpenChange` can be called twice in certain close scenarios (click outside + animation end).
**How to avoid:** Guard the auto-save with a ref: `const saveInProgress = useRef(false)`. Set it before calling save, unset on completion. Check before triggering.
**Warning signs:** Duplicate API calls on close; "Availability saved" toast fires twice.

---

## Code Examples

Verified patterns from official sources and current project conventions:

### Grid Cell Visual States (Claude's Discretion)
```typescript
// Recommended: brand orange for selected, subtle border for unselected
// Matches the existing event page color palette (--[#E8823A] is primary CTA color)
<div
  data-slot-key={slotKey}
  className={cn(
    "min-h-[44px] min-w-[44px] border-b border-r border-[#E5DDD4] cursor-pointer select-none",
    isSelected
      ? "bg-[#E8823A] border-[#D4722E]"
      : "bg-white hover:bg-[#F3EFE9]"
  )}
/>
```

### Auto-Detect Timezone on Mount
```typescript
// Run client-side only — useEffect or useMemo with typeof window check
useEffect(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  useGridStore.getState().setTimezone(tz)
}, [])
```

### Date Range Column Generation
```typescript
import { eachDayOfInterval, format } from 'date-fns'
// Source: date-fns v4 docs

function getGridDates(event: Event): string[] {
  if (event.dateMode === 'specific_dates') {
    return candidateDates  // already sorted ISO strings from DB
  }
  // date_range: generate all days from rangeStart to rangeEnd (max 14)
  const days = eachDayOfInterval({
    start: event.rangeStart!,
    end: event.rangeEnd!,
  })
  return days.map(d => format(d, 'yyyy-MM-dd'))
}
```

### Sonner Toast Usage (already configured)
```typescript
// Source: sonner docs — import toast function, Toaster already in layout.tsx
import { toast } from 'sonner'

// On explicit save success:
toast.success('Availability saved')

// On grid open with pre-filled slots:
toast('Loaded your previous availability', { icon: '✓' })

// On save error (Claude's discretion — error handling):
toast.error('Failed to save. Try again.')
```

### Loading Existing Slots (GET endpoint)
```typescript
// src/app/api/availability/route.ts
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ slots: [] })

  const rows = await db
    .select({ slotStart: availability.slotStart })
    .from(availability)
    .where(eq(availability.participantId, session.participantId))

  return NextResponse.json({
    slots: rows.map(r => r.slotStart.toISOString())
  })
}
```

### Drawer Responsive Direction (Mobile Bottom / Desktop Right)
```typescript
// Use a simple window width check or Tailwind responsive class approach
// The vaul direction prop is set once at render — not CSS-driven
// Pattern: detect breakpoint at mount
const [direction, setDirection] = useState<'bottom' | 'right'>('bottom')
useEffect(() => {
  setDirection(window.innerWidth >= 768 ? 'right' : 'bottom')
}, [])

<Drawer.Root direction={direction} snapPoints={[1]} ...>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `zonedTimeToUtc` / `utcToZonedTime` | `fromZonedTime` / `toZonedTime` | date-fns-tz v3.0.0 (Apr 2024) | Import errors if using old names |
| Mouse events for drag | Pointer Events API | 2020+ | Unified touch/mouse/stylus; no separate touch handlers needed |
| db.transaction() with neon | db.batch() with neon-http | Neon HTTP driver design | batch() IS supported; transaction() is NOT |
| ScrollTop-based sticky | CSS `position: sticky` | CSS3 (widely supported 2018+) | No JS needed for sticky time column |
| Intl.supportedValuesOf polyfills | Native `Intl.supportedValuesOf('timeZone')` | Chrome 99 / Safari 15.4 (2022) | No timezone data bundles needed |

**Deprecated / not applicable:**
- `zonedTimeToUtc`: removed in date-fns-tz v3, use `fromZonedTime`
- `utcToZonedTime`: removed in date-fns-tz v3, use `toZonedTime`
- `db.transaction()` with neon-http: runtime error; use `db.batch()`
- Touch events directly (`touchstart`, `touchmove`): Replaced by Pointer Events; locked decision requires Pointer Events API exclusively

---

## Open Questions

1. **Vaul `onOpenChange` double-fire in production**
   - What we know: GitHub issue #345 documents it firing twice on outside-click close
   - What's unclear: Whether vaul v1.1.2 fixed this or it persists
   - Recommendation: Add a `saveInProgress` ref guard on the auto-save function; harmless if issue is fixed

2. **Desktop drawer experience (right panel vs dialog)**
   - What we know: Locked decision says "side panel or centered dialog" on desktop
   - What's unclear: Exact implementation — vaul `direction="right"` vs swapping to a shadcn Dialog component on large screens
   - Recommendation: Start with `direction="right"` + Tailwind responsive width; if UX feels wrong, swap to Dialog with `useMediaQuery`. The vaul `direction` approach is simpler to implement and avoids a second component pattern.

3. **`db.batch()` with 0 new slots (clearing all availability)**
   - What we know: `db.batch([delete])` with a single item array is valid per Drizzle docs
   - What's unclear: Whether a user saving zero slots (all deselected) is a valid use case
   - Recommendation: Handle in API — if `slots.length === 0`, batch is just the delete operation. Valid behavior: clears all participant availability.

4. **Vaul scroll-inside-drawer behavior with 14-day grid**
   - What we know: vaul issue #358 documents unreliable drag after scroll on Android; `scrollLockTimeout` defaults to 500ms
   - What's unclear: Whether `scrollLockTimeout={300}` or lower is better for grid UX
   - Recommendation: Test on physical Android device; start with `scrollLockTimeout={300}` and adjust

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM batch API docs (`https://orm.drizzle.team/docs/batch-api`) — confirmed neon-http + batch support
- Neon serverless driver docs (`https://neon.com/docs/serverless/serverless-driver`) — confirmed HTTP driver cannot use interactive transactions
- MDN Pointer Events (`https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events`) — setPointerCapture, touch-action, pointermove patterns
- MDN Intl.DateTimeFormat.resolvedOptions (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions`) — auto-detect timezone
- date-fns-tz CHANGELOG (`https://raw.githubusercontent.com/marnusw/date-fns-tz/master/CHANGELOG.md`) — confirmed v3 rename from zonedTimeToUtc → fromZonedTime
- Vaul API docs (`https://vaul.emilkowal.ski/api`) — onOpenChange, dismissible, direction, snapPoints props
- Vaul snap points docs (`https://vaul.emilkowal.ski/snap-points`) — value=1 for full screen
- Project source: `src/lib/db.ts` — confirmed `drizzle-orm/neon-http` driver
- Project source: `src/lib/schema.ts` — confirmed availability table structure
- Project source: `src/components/ui/drawer.tsx` — confirmed vaul ^1.1.2 in project

### Secondary (MEDIUM confidence)
- Vaul GitHub issue #241 / PR #250 (`https://github.com/emilkowalski/vaul/issues/241`) — data-vaul-no-drag confirmed merged
- Vaul GitHub issue #358 — scrollLockTimeout behavior documented (open issue as of 2024)
- Vaul GitHub issue #345 — onOpenChange double-fire (open issue)
- MDN Intl.supportedValuesOf — Chrome 99+, Safari 15.4+ support for timezone list
- Zustand docs setup with Next.js (`https://zustand.docs.pmnd.rs/guides/nextjs`) — per-component store pattern

### Tertiary (LOW confidence)
- Responsive drawer (mobile bottom / desktop right) — vaul conditional direction pattern is a community pattern, not officially documented as a responsive approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries verified in package.json; date-fns-tz v3 API verified in changelog
- Architecture: HIGH — Pointer Events patterns from MDN; neon-http batch confirmed from official Drizzle + Neon docs
- Pitfalls: HIGH (neon-http transaction), MEDIUM (vaul double-fire, scroll edge cases) — real issues documented in GitHub

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (vaul is unmaintained; date-fns-tz stable; Drizzle actively developed)
