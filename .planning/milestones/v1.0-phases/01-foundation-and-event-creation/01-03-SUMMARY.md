---
phase: 01-foundation-and-event-creation
plan: "03"
subsystem: ui
tags: [nextjs, og-image, skeleton, drizzle, neon, edge-runtime, mobile, seo]

# Dependency graph
requires:
  - phase: 01-01
    provides: Drizzle db singleton, schema (events, eventDates), shadcn/ui Skeleton component
  - phase: 01-02
    provides: Event creation POST route — creates events that this page renders
provides:
  - Public event page at /e/[id] — title, description, candidate dates, time window, CTA
  - generateMetadata export on event page — OG tags for iMessage/WhatsApp/Slack previews
  - Skeleton loading state via loading.tsx + EventPageSkeleton component (no spinner)
  - Dynamic OG image (1200x630 PNG) at /e/[id]/opengraph-image via Edge runtime
  - notFound() for missing event IDs — correct 404 behavior
affects:
  - 01-04 (availability grid — shares /e/[id] route, CTA links to /e/[id]/join)
  - Phase 2 (auth — /e/[id]/join will require participant auth)
  - Phase 5 (OG image enhancement — custom fonts, participant count overlay)

# Tech tracking
tech-stack:
  added:
    - next/og (ImageResponse) — built into Next.js, no new package required
  patterns:
    - Next.js 15+ params-as-Promise pattern: const { id } = await params in both generateMetadata and page component
    - Edge runtime OG image: export const runtime = 'edge' in opengraph-image.tsx
    - File convention OG images: opengraph-image.tsx in same directory auto-wires og:image URL
    - Skeleton screens (not spinners): loading.tsx wraps EventPageSkeleton — MOBI-03 pattern
    - Drizzle edge query pattern: db.query.events.findFirst() works in Edge runtime via neon-http driver

key-files:
  created:
    - src/app/e/[id]/page.tsx
    - src/app/e/[id]/loading.tsx
    - src/app/e/[id]/opengraph-image.tsx
    - src/components/event-page-skeleton.tsx
  modified: []

key-decisions:
  - "OG image uses next/og ImageResponse (not @vercel/og) with runtime='edge' — Neon HTTP driver is edge-compatible so DB query works in Edge runtime"
  - "generateMetadata does not manually set images array — Next.js file convention (opengraph-image.tsx) auto-populates og:image; avoids URL duplication"
  - "EventPageSkeleton mirrors real page layout (title, description, dates, time window, CTA) to prevent layout shift when content loads"
  - "CTA links to /e/[id]/join (future Phase 2 endpoint) — placeholder link that returns 404 until Phase 2 ships"

patterns-established:
  - "OG image pattern: opengraph-image.tsx in route directory with runtime='edge', size, contentType exports — auto-wires without manual metadata"
  - "Skeleton-first loading: all data-fetching pages have a matching loading.tsx using skeleton components — never spinners"
  - "Edge DB query pattern: neon-http driver (drizzle-orm/neon-http) enables db.query.* in Edge runtime functions"

requirements-completed:
  - EVNT-07
  - MOBI-01
  - MOBI-03

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 1 Plan 03: Public Event Page Summary

**Public event page at /e/[id] with Drizzle data fetch, dynamic OG image (Edge runtime, next/og), skeleton loading state, and generateMetadata for iMessage/WhatsApp link previews**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T06:31:50Z
- **Completed:** 2026-02-18T06:34:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `/e/[id]/page.tsx`: async Server Component with `generateMetadata` (title, description, openGraph, twitter tags), Drizzle query for event + eventDates, `notFound()` on missing ID, mobile-safe `min-h-dvh` layout with candidate dates, time window, and "Mark your availability" CTA
- `opengraph-image.tsx`: Edge runtime dynamic OG image (1200x630 PNG) using `ImageResponse` from `next/og` — fetches event title/description from Neon via Drizzle neon-http driver (edge-compatible), warm palette (#FAF8F5/#E8823A/#1C1A17), renders correctly in Next.js build
- `loading.tsx` + `EventPageSkeleton`: skeleton loading state matching real page layout — no spinner (MOBI-03), no layout shift when content loads

## Task Commits

Each task was committed atomically:

1. **Task 1: Event page with generateMetadata and skeleton loading state** - `ccd609e` (feat)
2. **Task 2: Dynamic OG image via opengraph-image.tsx file convention** - `755fd1d` (feat)

**Plan metadata:** [pending final commit] (docs: complete plan)

## Files Created/Modified

- `src/app/e/[id]/page.tsx` — Public event page: generateMetadata + async Server Component, Drizzle fetch, notFound, date rendering, CTA
- `src/app/e/[id]/loading.tsx` — Next.js Suspense fallback: renders EventPageSkeleton (satisfies MOBI-03)
- `src/app/e/[id]/opengraph-image.tsx` — Edge runtime OG image: ImageResponse 1200x630, exports size/contentType/runtime='edge'
- `src/components/event-page-skeleton.tsx` — Skeleton component: title, description, 3 date slots, time window, CTA button skeletons

## Decisions Made

- **`next/og` not `@vercel/og`**: `ImageResponse` is now built into `next/og` — importing from `@vercel/og` is a legacy pattern that still works but is redundant. Using canonical import path.
- **No manual `images` array in generateMetadata**: Next.js file convention automatically creates the `og:image` URL from `opengraph-image.tsx` in the same directory. Manually setting `images` would create duplicate OG tags.
- **Neon HTTP driver is edge-compatible**: The `drizzle-orm/neon-http` driver uses HTTP rather than WebSocket/TCP connections, making it safe to use in Edge runtime functions including OG image generation.
- **Skeleton mirrors real layout**: EventPageSkeleton includes a skeleton for the time window section (added beyond plan spec) to better match the actual page and prevent any layout shift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added time window skeleton to EventPageSkeleton**
- **Found during:** Task 1 (EventPageSkeleton creation)
- **Issue:** Plan template showed skeleton for title, description, dates, and CTA — but the real event page also renders a time window section. Without it, there would be layout shift when content loads.
- **Fix:** Added `<Skeleton className="h-12 w-full rounded-xl" />` row between dates and CTA in EventPageSkeleton
- **Files modified:** `src/components/event-page-skeleton.tsx`
- **Verification:** Skeleton matches real page section count — no layout shift
- **Committed in:** `ccd609e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — layout correctness)
**Impact on plan:** Minor enhancement to skeleton fidelity. No scope creep.

## Issues Encountered

None — both tasks executed cleanly. TypeScript clean, `npm run build` exits 0 on first attempt.

**Edge runtime + Drizzle:** The `db.query.events.findFirst()` call in `opengraph-image.tsx` works on Edge runtime because `drizzle-orm/neon-http` uses HTTP (not WebSocket/TCP). Build verified — route shows as `ƒ (Dynamic)` in build output.

**OG image preview:** Verified at `http://localhost:3000/e/[id]/opengraph-image` in dev — returns 1200x630 PNG. Build shows `/e/[id]/opengraph-image` as a dynamic route.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/e/[id]` is live and renders event data from Neon — ready for Phase 1 Plan 04 (availability grid at `/e/[id]/join`)
- OG metadata in place — pasting event URL into iMessage/WhatsApp will trigger scraper to fetch `/e/[id]/opengraph-image`
- The CTA "Mark your availability" links to `/e/[id]/join` which will be built in Plan 04
- Skeleton loading satisfies MOBI-03 — no follow-up work needed on loading states for this route

---
*Phase: 01-foundation-and-event-creation*
*Completed: 2026-02-18*

## Self-Check: PASSED

All files verified present:
- FOUND: `src/app/e/[id]/page.tsx`
- FOUND: `src/app/e/[id]/loading.tsx`
- FOUND: `src/app/e/[id]/opengraph-image.tsx`
- FOUND: `src/components/event-page-skeleton.tsx`
- FOUND: `.planning/phases/01-foundation-and-event-creation/01-03-SUMMARY.md`

Commits verified:
- `ccd609e` feat(01-03): add public event page with generateMetadata and skeleton loading
- `755fd1d` feat(01-03): add dynamic OG image for event link previews
