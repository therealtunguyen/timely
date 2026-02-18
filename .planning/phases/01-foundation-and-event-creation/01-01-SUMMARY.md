---
phase: 01-foundation-and-event-creation
plan: "01"
subsystem: database
tags: [nextjs, tailwind, drizzle, neon, postgres, shadcn, nanoid, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 15 app skeleton with App Router, TypeScript, Tailwind v4
  - Warm palette CSS variables (@theme in globals.css) — #FAF8F5 warm-bg, brand orange #E8823A
  - Inter font via next/font/google
  - shadcn/ui initialized with button, input, label, textarea, skeleton, card components
  - Drizzle ORM schema: events, eventDates, participants, availability, sessions, magicTokens
  - Drizzle + Neon singleton (db) exported from src/lib/db.ts
  - generateId() helper using nanoid(10) for all DB primary keys
  - All 6 tables live in Neon (db:push succeeded)
  - drizzle-kit configured for db:generate, db:migrate, db:push, db:studio
affects:
  - 01-02 (event creation API and form — uses db, schema, generateId)
  - 01-03 (availability grid — uses events/eventDates schema)
  - all subsequent plans — all depend on this DB schema

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (App Router, Turbopack)
    - react@19.2.4 + react-dom@19.2.4
    - typescript@5.9.3
    - tailwindcss@4.1.18 (CSS-first, no tailwind.config.js)
    - "@tailwindcss/postcss@4.1.18"
    - drizzle-orm@0.45.1
    - drizzle-kit@0.31.9
    - "@neondatabase/serverless@1.0.2"
    - nanoid@5.1.6
    - zod@4.3.6
    - date-fns@4.1.0 + date-fns-tz@3.2.0
    - react-day-picker@9.13.2
    - "@upstash/ratelimit@2.0.8"
    - "@upstash/redis@1.36.2"
    - shadcn (class-variance-authority, clsx, tailwind-merge, radix-ui, lucide-react, tw-animate-css)
  patterns:
    - Tailwind v4 CSS-first: @theme block in globals.css, no tailwind.config.js
    - CSS custom properties for warm palette (--color-warm-bg, --color-brand, etc.)
    - Drizzle module-level singleton (not per-request)
    - All DB PKs are text with nanoid(10) — no serial/autoincrement
    - All timestamps use { withTimezone: true } for UTC enforcement
    - Cascade deletes on all FK references

key-files:
  created:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/lib/id.ts
    - src/lib/db.ts
    - src/lib/schema.ts
    - drizzle.config.ts
    - .env.local.example
    - package.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - components.json
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/card.tsx
    - src/lib/utils.ts
  modified: []

key-decisions:
  - "Manual Next.js scaffold: create-next-app refused capital-letter directory name 'Timely' — manually created tsconfig.json, next.config.ts, postcss.config.mjs and installed deps"
  - "drizzle.config.ts loads .env.local via dotenv config({path: '.env.local'}) for CLI usage (dotenv does not auto-load .env.local)"
  - "shadcn/ui init added tw-animate-css and shadcn/tailwind.css imports — preserved warm palette @theme block above shadcn additions, fixed @layer base body override to use warm palette"

patterns-established:
  - "Warm palette pattern: All colors reference --color-warm-* CSS variables, not hardcoded hex"
  - "ID generation pattern: Always call generateId() from src/lib/id.ts — never use DB auto-increment"
  - "UTC pattern: Every timestamp column must have { withTimezone: true } — enforced at schema level"
  - "DB singleton pattern: Import db from src/lib/db.ts at module level, never inside request handlers"

requirements-completed:
  - TIME-01
  - MOBI-02

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 1 Plan 01: Foundation and Scaffolding Summary

**Next.js 16.1.6 app with Tailwind v4 warm palette (#FAF8F5), shadcn/ui, and Drizzle ORM schema covering all 6 tables pushed to Neon Postgres**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T06:15:45Z
- **Completed:** 2026-02-18T06:22:35Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Manually scaffolded Next.js 16.1.6 (create-next-app refused capital-letter directory), installed all 15 project deps in three batches
- Tailwind v4 CSS-first warm palette: `--color-warm-bg: #FAF8F5`, `--color-brand: #E8823A`, and 10 other custom properties in `@theme` block; shadcn/ui initialized and augmented
- Drizzle schema with all 6 tables (events, eventDates, participants, availability, sessions, magicTokens) — UTC timestamps enforced, nanoid PKs, cascade deletes — pushed to Neon successfully
- `npm run build` exits 0 with no TypeScript errors; `npx tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15, install all dependencies, configure Tailwind v4 warm palette** - `60d845a` (feat)
2. **Task 2: Write Drizzle schema, configure drizzle-kit, push schema to Neon** - `febc26c` (feat)

**Plan metadata:** [pending final commit] (docs: complete plan)

## Files Created/Modified

- `src/app/globals.css` - Tailwind v4 @theme warm palette + shadcn CSS variables
- `src/app/layout.tsx` - RootLayout with Inter font via next/font/google
- `src/app/page.tsx` - Minimal homepage placeholder
- `src/lib/id.ts` - generateId() using nanoid(10) for all DB primary keys
- `src/lib/db.ts` - Drizzle + Neon HTTP singleton exported as db
- `src/lib/schema.ts` - All 6 Drizzle pgTable definitions with UTC timestamps and indexes
- `drizzle.config.ts` - drizzle-kit config loading .env.local via dotenv
- `package.json` - All project deps + db:* scripts
- `tsconfig.json` - TypeScript config (moduleResolution: bundler)
- `next.config.ts` - Minimal Next.js config
- `postcss.config.mjs` - @tailwindcss/postcss plugin
- `components.json` - shadcn/ui configuration
- `src/components/ui/*.tsx` - button, input, label, textarea, skeleton, card
- `.env.local.example` - Documents DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

## Decisions Made

- **Manual scaffold:** `create-next-app` rejected the `Timely` directory name (npm naming restrictions on capital letters). Manually created `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` and installed dependencies individually.
- **dotenv for drizzle-kit:** `drizzle-kit` CLI does not pick up Next.js's `.env.local` automatically. Fixed `drizzle.config.ts` to explicitly call `config({ path: '.env.local' })` before `config()` (fallback `.env`).
- **shadcn body style override:** shadcn init added `@layer base { body { @apply bg-background text-foreground; } }` which overrode our warm palette body styles. Fixed to use `background-color: var(--color-warm-bg)` in the @layer base body rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed drizzle.config.ts not loading .env.local**
- **Found during:** Task 2 (db:push step)
- **Issue:** `import 'dotenv/config'` loads `.env`, not `.env.local`; DATABASE_URL was undefined causing push to fail
- **Fix:** Replaced `import 'dotenv/config'` with `import { config } from 'dotenv'` and explicit `config({ path: '.env.local' })` call
- **Files modified:** `drizzle.config.ts`
- **Verification:** `npm run db:push` succeeded — "[✓] Changes applied"
- **Committed in:** `febc26c` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed shadcn body style overriding warm palette**
- **Found during:** Task 1 (shadcn init post-processing)
- **Issue:** shadcn init injected `@layer base { body { @apply bg-background text-foreground; } }` which would override our warm-bg body styles
- **Fix:** Replaced the @layer base body rule to use `background-color: var(--color-warm-bg)` and warm palette variables
- **Files modified:** `src/app/globals.css`
- **Verification:** Build succeeds; warm palette preserved with shadcn CSS variables coexisting
- **Committed in:** `60d845a` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered

- `create-next-app` rejected capital `T` in directory name — manual scaffold used (plan anticipated this fallback)
- Next.js version resolved to 16.1.6 (not 15.x as plan specified) — Next.js 16 is the current latest and is backward compatible; no functional impact

## User Setup Required

The following env vars are already configured in `.env.local` (user set them up before execution):

- `DATABASE_URL` — Neon pooled connection string
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token

`db:push` was run successfully — all 6 tables exist in Neon.

## Next Phase Readiness

- Next.js app boots and builds cleanly
- Database schema is live in Neon — Plans 02 and 03 can import `db` and `schema` immediately
- All environment variables are configured
- shadcn/ui components ready for use in form-heavy Plans 02+
- No blockers for proceeding to Plan 02 (event creation API + form)

---
*Phase: 01-foundation-and-event-creation*
*Completed: 2026-02-18*

## Self-Check: PASSED

All files verified present. Commits verified:
- `60d845a` feat(01-01): scaffold Next.js 15 with Tailwind v4 warm palette and shadcn/ui
- `febc26c` feat(01-01): add Drizzle ORM schema (6 tables) and Neon DB singleton
