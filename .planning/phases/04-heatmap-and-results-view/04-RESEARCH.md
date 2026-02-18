# Phase 4: Heatmap and Results View - Research

**Researched:** 2026-02-18
**Domain:** Heatmap visualization, availability aggregation, creator confirm-time flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Heatmap color scale
- Smooth gradient: each slot's color is continuously interpolated from lightest (#FAF7F4) to darkest (#7C4A0E) based on its exact count relative to the event's peak count — no discrete steps
- Empty slots (zero responses): subtle off-white or muted border treatment to visually distinguish from filled slots — makes the heatmap "pop" against empties
- Own-slot indicator: when a viewer has their own availability saved, a subtle personal indicator (dot, check, or inner border) layers on top of the heatmap color for their own marked cells
- Heatmap is public — unauthenticated visitors with the event link see the full heatmap (aggregate counts only, no names exposed)

#### Best-time callout
- Positioned above the grid — seen first on page load
- Shows top 1 slot only: date, time range, and "X of Y people free"
- Empty state (no responses yet): visible section with placeholder text "Waiting for responses" — section always present, not hidden
- Tapping the callout: creator-only action — opens the confirm-time bottom sheet directly. Non-creator visitors receive no tap action on the callout.

#### Tap-a-name interaction
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HEAT-01 | Aggregated availability displays as a color heatmap | Drizzle GROUP BY + count() query; inline style color interpolation via lerpColor() utility |
| HEAT-02 | Heatmap uses an accessible warm color scale (no red-green) | WCAG verified: #7C4A0E vs white = 7.39:1 (AAA). Amber/brown scale has no red-green reliance. |
| HEAT-03 | Creator can see which participants have responded | participants table query with submittedAt != null; Server Component data fetch |
| HEAT-04 | Tapping a participant name highlights their specific slots | Zustand store for selectedNames; availability data per participant loaded at page time; intersection computed client-side |
| HEAT-05 | Best overlapping times are visually prominent | BestTimeCallout component fed from top-1 heatmap slot (DESC count ORDER BY LIMIT 1) |
| HEAT-06 | Creator can confirm/lock a final meeting time | Server Action updates events.confirmedSlot + events.status; revalidatePath flushes Server Component cache; vaul bottom sheet for UI |
</phase_requirements>

---

## Summary

Phase 4 lays the results layer on top of the existing availability grid. The heatmap itself is a display concern: the existing `GridCell` component gains a `backgroundColor` prop computed from a `lerpColor()` utility that maps `count/peakCount` to the `#FAF7F4` → `#7C4A0E` amber scale. Inline `style` is mandatory because Tailwind cannot generate arbitrary runtime colors. The aggregation query is a simple Drizzle `GROUP BY slotStart` with `count()` on the availability table, filtered by `eventId` — the schema already has an index on `(eventId, slotStart)` for this exact purpose.

The tap-a-name interaction requires a new lightweight Zustand store (`heatmapStore`) that tracks which participant names are selected. When names are selected, the grid switches from showing heatmap colors to showing intersection highlighting: slots where all selected participants are free glow at full opacity; others dim. The per-participant slot data is loaded server-side at page render time and passed as a prop to the client component — no additional fetches needed for name selection.

The confirm-time flow is the only mutation in this phase. The "creator" concept currently has no database column — the events table has no `creatorId`. This is the most significant architectural gap discovered in research: Phase 4 must add a `creatorId` column to the events table and set it at event creation time. The confirm action itself is a Server Action (per the auth split decision) that sets `events.confirmedSlot` and `events.status = 'confirmed'`, then calls `revalidatePath` to refresh the Server Component. The vaul library (v1.1.2) is already installed and used; a new controlled Drawer.Root for the confirm sheet follows the existing pattern exactly.

**Primary recommendation:** Build the heatmap as a thin layer over the existing GridCell (add `heatmapColor` + `dimmed` + `isOwn` props), use a new `heatmapStore` for tap-a-name state, add `creatorId` to the events schema (migration required), and implement confirm-time as a Server Action with `revalidatePath`.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | GROUP BY heatmap aggregation query | Already chosen; `count()` + `groupBy()` is the exact query pattern for this feature |
| @neondatabase/serverless | 1.0.2 | Neon HTTP driver for DB queries | Already chosen; neon-http is the production driver |
| zustand | 5.0.11 | `heatmapStore` for selected participant names | Already used for `gridStore`; same pattern |
| vaul | 1.1.2 | Confirm-time bottom sheet drawer | Already installed and used in `availability-drawer.tsx` |
| motion/react (framer-motion) | 12.34.1 | Opacity fade on name selection toggle | Already installed; used in `pin-sheet.tsx` |
| date-fns + date-fns-tz | 4.1.0 + 3.2.0 | Format best-time slot for display | Already used throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.574.0 | Icons in best-time callout and participant list | Already used throughout; `Check`, `Users`, `Clock` icons |
| next/cache | (Next.js built-in) | `revalidatePath` after confirm mutation | Required after Server Action mutates DB |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline style `backgroundColor` | Tailwind arbitrary `bg-[#...]` class | Tailwind scans source at build time — dynamic hex strings will not generate CSS. Inline style is the only correct approach for runtime-computed colors. |
| New Zustand store for heatmap state | Extend `gridStore` | `gridStore` is tightly coupled to availability editing state and resets on drawer close. Heatmap state is independent and persistent across the page. Separate store is cleaner. |
| Server Action for confirm mutation | Route Handler | Decisions locked: Route Handlers for auth, Server Actions for mutations. Confirm-time is an internal mutation. |
| `Promise.all()` parallel DB queries | Sequential await | Parallel fetch is faster; heatmap data, participants, and best slot can all be fetched simultaneously in the Server Component. |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended File Structure (additions to existing)

```
src/
├── app/
│   └── e/[id]/
│       └── page.tsx              # Extended with heatmap data fetch (Server Component)
├── components/
│   └── availability/
│       ├── grid-cell.tsx         # Extended with heatmapColor + dimmed + isOwn props
│       ├── availability-grid.tsx # Extended to accept heatmap data + tap-a-name props
│       ├── heatmap-grid.tsx      # NEW: read-only heatmap variant of the grid
│       ├── best-time-callout.tsx # NEW: "Best time" card above the grid
│       ├── participant-list.tsx  # NEW: names list with tap-to-filter + response status
│       └── confirm-time-sheet.tsx # NEW: vaul Drawer for creator confirm flow
├── lib/
│   ├── stores/
│   │   └── heatmap-store.ts      # NEW: selectedNames Set + slot intersection logic
│   ├── actions/
│   │   └── confirm-time.ts       # NEW: 'use server' Server Action for confirming slot
│   └── schema.ts                 # MODIFIED: add creatorId column to events table
```

### Pattern 1: Drizzle Heatmap Aggregation Query

**What:** `GROUP BY slotStart` with `count()` to produce slot → participant count mapping.
**When to use:** In the Server Component page fetch — runs at request time, not client-side.

```typescript
// Source: Drizzle ORM official docs https://orm.drizzle.team/docs/select
// and https://orm.drizzle.team/docs/guides/count-rows
import { count, desc, eq } from 'drizzle-orm'
import { availability } from '@/lib/schema'

// Returns array of { slotStart: Date, count: number } ordered by count DESC
const heatmapData = await db
  .select({
    slotStart: availability.slotStart,
    count: count(),
  })
  .from(availability)
  .where(eq(availability.eventId, eventId))
  .groupBy(availability.slotStart)
  .orderBy(desc(count()))

// Build a Map for O(1) lookup by slot key
const heatmapMap = new Map(
  heatmapData.map(row => [row.slotStart.toISOString(), row.count])
)
const peakCount = heatmapData[0]?.count ?? 0
const totalParticipants = existingParticipants.length  // from separate query
```

**Best-time slot** (HEAT-05): `heatmapData[0]` is already the top slot after `orderBy(desc(count()))`.

### Pattern 2: Runtime Hex Color Interpolation (No Dependencies)

**What:** Pure JS linear interpolation between two hex colors. Applied at render time via inline `style`.
**Why no library:** The calculation is 10 lines. No additional dependency needed for this.

```typescript
// Source: established linear interpolation math; no library needed
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from)
  const [r2, g2, b2] = hexToRgb(to)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  const r = lerp(r1, r2).toString(16).padStart(2, '0')
  const g = lerp(g1, g2).toString(16).padStart(2, '0')
  const b = lerp(b1, b2).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

const HEATMAP_LIGHT = '#FAF7F4'
const HEATMAP_DARK = '#7C4A0E'

// For a slot with count=3, peakCount=5:
// t = 3/5 = 0.6, but sqrt gives better visual spread for small N
// Recommendation: use sqrt(t) for gradients with 2–10 participants
// sqrt spreads the middle counts apart visually, making the map readable
function slotColor(count: number, peak: number): string {
  if (count === 0 || peak === 0) return HEATMAP_LIGHT
  const t = Math.sqrt(count / peak)  // sqrt for perceptual spread
  return lerpColor(HEATMAP_LIGHT, HEATMAP_DARK, t)
}

// Usage in GridCell:
// <div style={{ backgroundColor: slotColor(count, peakCount) }} ... />
```

**Interpolation formula recommendation (Claude's Discretion):** Use `sqrt(t)` instead of linear `t`. With 5 participants, linear interpolation compresses low counts (1 person looks almost identical to 2 people). Square root spreads the lower counts apart, making the "temperature map" feel work better across typical 2–10 participant ranges.

### Pattern 3: Heatmap Zustand Store for Tap-a-Name

**What:** Tracks selected participant names and intersection state client-side.
**When to use:** Tap-a-name toggle; drives GridCell `dimmed` prop.

```typescript
// Source: Zustand docs https://zustand.docs.pmnd.rs/ + existing gridStore pattern in project
import { create } from 'zustand'

interface ParticipantSlots {
  [participantName: string]: Set<string>  // UTC ISO slot keys
}

interface HeatmapStore {
  selectedNames: Set<string>
  toggleName: (name: string) => void
  // Computed: Set of slot keys where ALL selected participants are free
  intersectionSlots: (participantSlots: ParticipantSlots) => Set<string>
}

export const useHeatmapStore = create<HeatmapStore>((set, get) => ({
  selectedNames: new Set(),
  toggleName: (name) => set((s) => {
    const next = new Set(s.selectedNames)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return { selectedNames: next }
  }),
  intersectionSlots: (participantSlots) => {
    const { selectedNames } = get()
    if (selectedNames.size === 0) return new Set()
    const [first, ...rest] = [...selectedNames]
    let result = new Set(participantSlots[first] ?? [])
    for (const name of rest) {
      const slots = participantSlots[name] ?? new Set()
      result = new Set([...result].filter(s => slots.has(s)))
    }
    return result
  },
}))
```

**Key design:** `participantSlots` is passed as argument (not stored) because it comes from Server Component props. The store only owns UI state (`selectedNames`).

### Pattern 4: vaul Controlled Bottom Sheet for Confirm-Time

**What:** Creator-only vaul Drawer opened programmatically (via `open` state) on callout tap.
**When to use:** Only when `isCreator` is true AND a best slot exists.

```typescript
// Source: vaul v1.1.2 TypeScript types + existing availability-drawer.tsx in project
import { Drawer } from 'vaul'

// Usage pattern from existing code in src/components/availability/availability-drawer.tsx:
// Drawer.Root with open={open} onOpenChange={setOpen}
// Drawer.Portal > Drawer.Overlay + Drawer.Content

<Drawer.Root open={confirmOpen} onOpenChange={setConfirmOpen} direction="bottom">
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-[#FAF8F5] p-6">
      <Drawer.Title className="text-lg font-semibold text-[#1C1A17]">
        Confirm this time?
      </Drawer.Title>
      {/* Slot info + participant count + Confirm button */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### Pattern 5: Server Action for Confirm Mutation

**What:** `'use server'` function that sets `confirmedSlot` and `status='confirmed'` on the event, then revalidates.
**When to use:** Called from the confirm-time sheet's "Confirm this time" button.

```typescript
// Source: Next.js docs https://nextjs.org/docs/app/getting-started/updating-data
// File: src/lib/actions/confirm-time.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function confirmTime(eventId: string, slotStart: string): Promise<{ error?: string }> {
  const session = await getSession(eventId)
  if (!session) return { error: 'Unauthorized' }

  // Verify caller is creator
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event) return { error: 'Event not found' }
  if (event.creatorId !== session.participantId) return { error: 'Forbidden' }

  await db
    .update(events)
    .set({
      confirmedSlot: new Date(slotStart),
      status: 'confirmed',
    })
    .where(eq(events.id, eventId))

  revalidatePath(`/e/${eventId}`)
  return {}
}
```

### Pattern 6: Parallel Server Component Data Fetch

**What:** All heatmap data fetched in parallel at request time. No client-side data fetching needed for the read-only heatmap.
**When to use:** In the event page Server Component.

```typescript
// Source: Next.js docs https://nextjs.org/docs/app/getting-started/fetching-data
// In src/app/e/[id]/page.tsx:

const [
  heatmapData,
  participantsWithSlots,
  session,
] = await Promise.all([
  // Aggregated counts per slot
  db.select({ slotStart: availability.slotStart, count: count() })
    .from(availability)
    .where(eq(availability.eventId, id))
    .groupBy(availability.slotStart)
    .orderBy(desc(count())),

  // Each participant's individual slots (for tap-a-name intersection)
  db.select({
    name: participants.name,
    slotStart: availability.slotStart,
    submittedAt: participants.submittedAt,
  })
    .from(participants)
    .leftJoin(availability, eq(participants.id, availability.participantId))
    .where(eq(participants.eventId, id)),

  // Auth check
  getSession(id),
])
```

### Anti-Patterns to Avoid

- **Dynamic Tailwind classes for colors:** `bg-[${computedHexColor}]` will NOT work — Tailwind scans source at build time. Always use `style={{ backgroundColor: computedHexColor }}`.
- **Client-side heatmap data fetch:** Don't fetch heatmap data from a client component. The data is static per request — fetch it in the Server Component and pass as props.
- **Storing participantSlots in Zustand:** The slot data is server-fetched and large. Keep it as React props; only put `selectedNames` (a Set of strings) in the store.
- **Using `db.transaction()` with neon-http:** The neon-http driver does not support transactions. Use `db.batch()` for atomic operations (though the confirm update is a single statement and needs no batching).
- **Concatenating Tailwind class strings at runtime:** `cn('bg-[#' + hex + ']')` will not work. Inline styles only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet drawer | Custom CSS/JS slide-up div | `vaul` (already installed) | Handles swipe-to-close, accessibility, scroll lock, iOS overscroll — dozens of edge cases |
| Opacity fade on name selection | Manual CSS transition with useEffect | `motion/react` `animate={{ opacity }}` (already installed) | Declarative, handles interruptions, already used in project |
| Cache invalidation after confirm | `router.refresh()` | `revalidatePath` in Server Action | Server Action + revalidatePath flushes full Server Component cache including all parallel fetches |
| Creator identity via localStorage | LocalStorage with event ID key | `creatorId` in events table | localStorage is cleared by browser; unreliable across sessions and browsers |

**Key insight:** All needed libraries are already installed. Phase 4 is entirely about composition of existing tools, not new dependencies.

---

## Schema Gap: Creator Identity

**This is the most significant pre-existing gap for Phase 4.** The `events` table currently has no `creatorId` column. The CONTEXT.md requires creator-only actions (tapping best-time callout opens confirm sheet; confirm-time mutation restricted to creator). Without a `creatorId`, it is impossible to know if the current session user created the event.

**The current schema:**
```typescript
// src/lib/schema.ts — events table (no creatorId)
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  // ... no creatorId field
  status: eventStatusEnum('status').notNull().default('open'),
  confirmedSlot: timestamp('confirmed_slot', { withTimezone: true }),
  // ...
})
```

**Required addition:**
```typescript
// Add to events table:
creatorId: text('creator_id'),  // nullable for backward compat with existing events
```

**Required migration:** `drizzle-kit generate` then `drizzle-kit migrate` (or `push` for dev).

**Required change in event creation:** The `/api/events` route creates events, but the creator is currently not a participant (they haven't joined). Two viable approaches:

**Option A (recommended):** Store `creatorId` as a participant ID — but the creator hasn't joined yet at creation time. Alternatively, store the creator's browser fingerprint or session token. This is complex.

**Option B (simpler — recommended):** Create a creator participant record automatically when the event is created, store their `participantId` as `creatorId`. The creator joins with a special "creator" PIN or magic link mechanism. However, Phase 4 description says editing availability is out of scope.

**Option C (simplest — recommended for Phase 4):** Store a `creatorToken` (random secret) in the events table, set a `timely_creator_{eventId}` httpOnly cookie at event creation time, and verify server-side. No participant record needed. The creator token never expires with the event (or has the same 37-day expiry). This requires zero changes to the participants flow.

**Recommendation:** Use Option C. Add `creatorToken text('creator_token')` to the events table. Set a cookie `timely_creator_{eventId}` at event POST response time. In the Server Component, check this cookie to determine `isCreator`. This is the lowest-change path that avoids restructuring the identity model.

---

## Common Pitfalls

### Pitfall 1: Runtime Tailwind Color Classes Don't Work
**What goes wrong:** Developer writes `className={\`bg-[\${lerpColor(...)}]\`}` — the cell renders with no background color.
**Why it happens:** Tailwind CSS v4 (this project uses v4 via `@tailwindcss/postcss`) scans source files at build time to generate CSS. A class string assembled at runtime is never seen by the scanner.
**How to avoid:** Always use `style={{ backgroundColor: lerpColor(light, dark, t) }}` for dynamic colors. Use className only for static Tailwind classes.
**Warning signs:** Color not appearing in browser; no matching CSS rule in DevTools.

### Pitfall 2: `count()` Returns String, Not Number
**What goes wrong:** Comparison `row.count > 0` always true even for zero-count rows (there won't be zero-count rows from GROUP BY, but `row.count` being a string breaks math).
**Why it happens:** Drizzle's `count()` function returns `SQL<number>` but the Neon driver may return the value as a string from Postgres.
**How to avoid:** Always coerce: `Number(row.count)` or use `+row.count`. Verify by logging the raw DB response in dev.
**Warning signs:** `peakCount` is `"5"` (string) instead of `5` (number); interpolation produces `NaN`.

### Pitfall 3: Missing Index on `(eventId, slotStart)`
**What goes wrong:** GROUP BY heatmap query is slow on large events.
**Why it happens:** Without the index, Postgres does a full table scan on availability.
**How to avoid:** The schema already defines `index('availability_event_slot_idx').on(table.eventId, table.slotStart)` — verify this index exists in production after migration.
**Warning signs:** Slow page loads; high DB query time in Neon console.

### Pitfall 4: `db.transaction()` Not Available on Neon HTTP
**What goes wrong:** `await db.transaction(async tx => { ... })` throws at runtime.
**Why it happens:** The `neon-http` driver (`drizzle-orm/neon-http`) does not support transactions. Only `neon-serverless` (WebSocket driver) does.
**How to avoid:** The confirm mutation is a single `db.update()` call — no atomicity concern. If future code needs multiple atomic operations, use `db.batch([...])` which the project already uses.
**Warning signs:** Runtime error mentioning "transaction not supported".

### Pitfall 5: Creator Identity Not Set on Existing Events
**What goes wrong:** After adding `creatorId` (or `creatorToken`) column, existing events have `NULL` in that field. Creator-only actions fail to identify the creator.
**Why it happens:** Migration adds the column as nullable; existing rows stay `NULL`.
**How to avoid:** Make `isCreator` logic explicit: `if (event.creatorToken && creatorCookie === event.creatorToken)`. For events with `NULL` `creatorToken`, `isCreator` is always false — this is acceptable for events created before Phase 4.
**Warning signs:** Creator sees non-creator UI on their own event.

### Pitfall 6: vaul `Drawer.Content` Inside Scroll Container
**What goes wrong:** The confirm-time sheet appears but cannot be scrolled or interacted with properly on mobile.
**Why it happens:** Vaul uses `data-vaul-no-drag` to prevent the grid's pointer capture from interfering. The confirm sheet, however, is a new Drawer.Root — it needs to be rendered as a Portal sibling to the page, not inside the existing availability drawer.
**How to avoid:** Mount `<ConfirmTimeSheet>` as a sibling at the page level, not nested inside any other drawer or scroll container.
**Warning signs:** Sheet doesn't slide up on mobile; dismisses immediately when tapped.

### Pitfall 7: Intersection Produces Wrong Results with Empty Participant Data
**What goes wrong:** A participant with zero slots selected shows as "available everywhere" in the intersection.
**Why it happens:** If `participantSlots[name]` is an empty Set, the intersection of any Set with an empty Set is empty — the intersection correctly shows nothing. But if `participantSlots[name]` is `undefined` (participant has no rows in the DB query), the code must explicitly treat it as an empty Set.
**How to avoid:** In the store's `intersectionSlots`: `const slots = participantSlots[name] ?? new Set()`.
**Warning signs:** Selecting a name with no availability shows ALL slots highlighted.

---

## Code Examples

### Heatmap-Aware GridCell Extension

```typescript
// Source: project's existing grid-cell.tsx + color interpolation research
// Extended GridCell props for heatmap mode:
interface GridCellProps {
  slotKey: string
  isSelected?: boolean           // Edit mode: user's own selection
  // Heatmap mode props:
  heatmapColor?: string         // Pre-computed hex color string (inline style)
  isOwn?: boolean               // Current user has this slot marked
  dimmed?: boolean              // Tap-a-name: this slot is not in intersection
  count?: number                // For aria-label
  peakCount?: number            // For aria-label
  totalParticipants?: number    // For aria-label
  dateLabel?: string            // For aria-label
  timeLabel?: string            // For aria-label
}

// Aria label for HEAT-02 accessibility:
// aria-label={`${count} of ${totalParticipants} people available ${timeLabel} ${dateLabel}`}
```

### SQL Heatmap Query (Drizzle)

```typescript
// Source: Drizzle ORM docs https://orm.drizzle.team/docs/select
import { count, desc, eq } from 'drizzle-orm'
import { availability } from '@/lib/schema'

const heatmapRows = await db
  .select({
    slotStart: availability.slotStart,
    participantCount: count(),
  })
  .from(availability)
  .where(eq(availability.eventId, eventId))
  .groupBy(availability.slotStart)
  .orderBy(desc(count()))

// Map for O(1) lookup: "2026-03-15T14:00:00.000Z" -> 3
const heatmapMap = new Map<string, number>(
  heatmapRows.map(r => [r.slotStart.toISOString(), Number(r.participantCount)])
)
const peakCount = heatmapRows.length > 0 ? Number(heatmapRows[0].participantCount) : 0
const bestSlot = heatmapRows[0] ?? null  // For HEAT-05 best-time callout
```

### Server Action for Confirm

```typescript
// Source: Next.js docs https://nextjs.org/docs/app/getting-started/updating-data
// File: src/lib/actions/confirm-time.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function confirmTime(
  eventId: string,
  slotStart: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${eventId}`)?.value

  if (!creatorToken) return { success: false, error: 'Unauthorized' }

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event) return { success: false, error: 'Not found' }
  if (event.creatorToken !== creatorToken) return { success: false, error: 'Forbidden' }

  await db
    .update(events)
    .set({ confirmedSlot: new Date(slotStart), status: 'confirmed' })
    .where(eq(events.id, eventId))

  revalidatePath(`/e/${eventId}`)
  return { success: true }
}
```

### Motion Fade for Tap-a-Name Dim Effect

```typescript
// Source: motion.dev https://motion.dev/docs/react-animation
// Existing usage in project: src/components/identity/pin-sheet.tsx
import { motion } from 'motion/react'

// In HeatmapGrid cell rendering:
<motion.div
  animate={{ opacity: dimmed ? 0.25 : 1 }}
  transition={{ duration: 0.15 }}   // Brief — Claude's discretion: 150ms feels responsive
  style={{ backgroundColor: heatmapColor }}
  aria-label={...}
>
  {isOwn && <div className="absolute inset-[3px] rounded-sm border-2 border-white/70" />}
</motion.div>
```

**Personal indicator recommendation (Claude's Discretion):** Inner border (`border-2 border-white/70` at 3px inset from cell edge). It is visible regardless of the cell's background color (dark or light), doesn't require absolute positioning of a dot that might be hidden by the border, and works cleanly at the 44px minimum cell height.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side heatmap fetch (useEffect) | Server Component parallel fetch | App Router (Next.js 13+) | Heatmap data arrives with HTML — no loading flash |
| Discrete color steps (5 shades) | Continuous interpolation | This phase | Matches "temperature map" feel; no step artifacts |
| `framer-motion` import | `motion/react` import | Motion v11 | Same library; `motion` package re-exports framer-motion |
| `db.transaction()` | `db.batch()` for neon-http | neon-http driver design | Transactions require WebSocket driver; batch is HTTP-compatible |

**Deprecated/outdated in this project:**
- `zonedTimeToUtc` from date-fns-tz: removed in v3. Use `fromZonedTime` (already correct in existing code).
- `utcToZonedTime` from date-fns-tz: removed in v3. Use `toZonedTime` (already correct in existing code).

---

## Open Questions

1. **Creator identity mechanism — Option C (creatorToken cookie) confirmed, but event creation route needs updating**
   - What we know: The `/api/events` route currently sets no cookie. It returns `{ id }` and redirects to `/e/{id}/confirm`. A `creatorToken` must be added to the events table and a `timely_creator_{id}` httpOnly cookie must be set in the same response.
   - What's unclear: The cookie's `path` should be `/e/${id}` (scoped) or `/` (global). Scoping to `/e/${id}` prevents the cookie from being sent to unrelated routes, which is cleaner.
   - Recommendation: Set cookie with `path: '/'` for simplicity. The server always validates against `event.creatorToken` regardless.

2. **Heatmap visible to unauthenticated users (public) — page.tsx needs to handle both session and no-session**
   - What we know: The heatmap shows aggregate counts (no names) to all visitors. The page already has an unauthenticated path (shows `ParticipantActions`). The heatmap should appear for ALL visitors.
   - What's unclear: The existing page conditionally renders `AvailabilityCTA` or `ParticipantActions`. The heatmap section must render unconditionally (no session required).
   - Recommendation: Render `BestTimeCallout` and `HeatmapGrid` and `ParticipantList` at the top of the page for all visitors. Keep the existing CTA section below for participation. The `ownSlots` prop to the grid is empty Set for unauthenticated visitors (no session).

3. **Participant list ordering for response status (HEAT-03)**
   - What we know: The requirement says show who has responded vs. who hasn't. The `participants.submittedAt` field tracks this (`null` = not submitted).
   - What's unclear: Sort order — responded first? Alphabetical?
   - Recommendation: Responded participants first (submittedAt not null), then not-yet-responded. Within each group, alphabetical by name. This makes response status scannable at a glance.

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM official docs (https://orm.drizzle.team/docs/select, https://orm.drizzle.team/docs/guides/count-rows) — `groupBy`, `count()`, `orderBy(desc(...))`, `limit()` syntax verified
- Next.js 16.1.6 official docs (https://nextjs.org/docs/app/getting-started/updating-data) — Server Actions, `revalidatePath`, `cookies()` API; doc version matches installed next version
- Project source code — existing `availability-drawer.tsx`, `grid-cell.tsx`, `schema.ts`, `grid-store.ts`, `pin-sheet.tsx` examined directly
- vaul v1.1.2 TypeScript types (node_modules/vaul/dist/index.d.ts) — controlled Drawer.Root confirmed
- WCAG contrast calculation — computed locally: #7C4A0E vs #FFFFFF = 7.39:1 (AAA pass), #7C4A0E vs #FAF7F4 = 6.92:1 (AAA pass)
- Drizzle aggregate functions (node_modules/drizzle-orm/sql/functions/aggregate.d.ts) — `count()` returns `SQL<number>` confirmed

### Secondary (MEDIUM confidence)
- motion/react docs (https://motion.dev/docs/react-animation) — `animate={{ opacity }}` + `transition={{ duration }}` pattern for fade
- Tailwind CSS v4 behavior (https://github.com/tailwindlabs/tailwindcss/discussions/) — confirmed dynamic class strings cannot be used for runtime-computed colors; inline style required

### Tertiary (LOW confidence — noted for validation)
- Neon HTTP driver transaction limitation: stated as established project knowledge (`db.batch()` already used in codebase for this reason), confirmed by existing code comments
- `count()` returning string from Postgres: common ORM gotcha; should be verified in dev with `console.log(typeof row.participantCount)` during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and versioned from package.json + node_modules
- Architecture: HIGH — patterns verified against official docs and existing project code
- Heatmap query: HIGH — Drizzle select/groupBy/count/orderBy verified from official docs and type signatures
- Color interpolation: HIGH — math verified with local computation; Tailwind limitation verified from official discussions
- Creator identity gap: HIGH — schema examined directly; gap is confirmed
- vaul bottom sheet: HIGH — v1.1.2 types read directly from node_modules
- Pitfalls: MEDIUM — most from direct code analysis; `count()` string type gotcha is LOW (flag for dev verification)

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (30 days — stable libraries, no fast-moving areas)
