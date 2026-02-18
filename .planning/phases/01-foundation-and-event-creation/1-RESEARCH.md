# Phase 1: Foundation and Event Creation - Research

**Researched:** 2026-02-18
**Domain:** Next.js 15 App Router, Drizzle ORM + Neon Postgres, Upstash rate limiting, OG image generation, mobile-first UI with Tailwind v4 + shadcn/ui
**Confidence:** HIGH

---

## Summary

Phase 1 is a project scaffolding and data-layer phase. The core deliverables are: a working Next.js 15 project wired to Neon Postgres via Drizzle ORM and deployed to Vercel; a full database schema; a create-event form; and a public event page with Open Graph metadata for link previews. The decisions made here — schema shape, UTC storage, route structure, rate limiting approach — are locked for all future phases.

The technology stack is firmly decided in prior research and in the project's prior-decisions list. The research task is therefore to verify the exact APIs, confirm current versions and compatibility, identify precise gotchas, and produce code patterns the planner can use verbatim in task definitions. No major technology choices remain open for Phase 1.

The most significant implementation risks in Phase 1 are: (1) Next.js 15's breaking change where `params` is now a Promise — every dynamic route must `await params`; (2) Tailwind v4's CSS-first configuration which differs substantially from v3 (no `tailwind.config.js`); and (3) the OG image generation approach — `ImageResponse` is imported from `next/og` in the App Router, not from `@vercel/og` directly, which is a common source of confusion.

**Primary recommendation:** Scaffold with `create-next-app` using the recommended defaults (TypeScript, Tailwind, ESLint, App Router, Turbopack), then immediately wire in Drizzle + Neon before writing any application code. Establish UTC-only timestamp discipline and nanoid IDs in the schema before any insert code is written — retrofitting this later is painful.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVNT-01 | Creator can create an event with a title and optional description | Server Action + Zod validation on the create-event form; title required, description optional nullable text column |
| EVNT-02 | Creator can select specific dates as candidate days | `react-day-picker` v9 in `mode="multiple"` renders an inline multi-select calendar; selected dates stored as `EventDate` rows |
| EVNT-03 | Creator can select a date range instead of specific dates | `react-day-picker` v9 in `mode="range"` renders a range selector; stored as `range_start`/`range_end` on the event row with `date_mode = 'date_range'` |
| EVNT-04 | Creator can set the time window for each day (e.g., 9am-9pm) | `day_start`/`day_end` integer columns (hour 0-23) on the events table; select inputs on the form |
| EVNT-05 | Creator receives a shareable link after event creation | Server Action returns event ID; redirect to `/e/[nanoid]` confirmation page with copyable link |
| EVNT-06 | Event URLs use short nanoid codes (e.g., /e/v4tXk2mRpq) | `nanoid(10)` from the `nanoid` npm package; stored as primary key `text` column; route at `app/e/[id]/page.tsx` |
| EVNT-07 | Event page renders with Open Graph metadata for link previews in group chats | `generateMetadata` export in `app/e/[id]/page.tsx` for title/description tags; `opengraph-image.tsx` file convention with `ImageResponse` from `next/og` for dynamic OG image |
| TIME-01 | All availability is stored as UTC in the database | `timestamp({ withTimezone: true })` on all time columns in Drizzle schema; day_start/day_end stored as integers (UTC hour offsets computed at display time); this is enforced at schema level |
| MOBI-01 | All screens are mobile-first responsive | `create-next-app` with Tailwind v4; all components default mobile layout, `md:` breakpoint for desktop adjustments; `min-h-dvh` for viewport height |
| MOBI-02 | UI uses warm minimal aesthetic (#FAF8F5 background, soft palette) | Tailwind v4 CSS-first `@theme` block in `globals.css` defines custom warm colors; `#FAF8F5` background set on `body`; never use raw `#FFFFFF` as page background |
| MOBI-03 | Loading states use skeleton screens, not spinners | shadcn/ui `Skeleton` component (`npx shadcn@latest add skeleton`); shimmer animation via CSS gradient; wrap async data with React `Suspense` + loading skeleton |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | Framework — App Router, Server Actions, Route Handlers | Official Vercel product; App Router is the forward direction; Server Components reduce client JS |
| React | 19.x | UI runtime | Ships with Next.js 15; `useFormStatus`, `useOptimistic` stable |
| TypeScript | 5.x | Type safety | Ships with `create-next-app`; strict mode required |
| Drizzle ORM | 0.x (latest) | Database ORM | Edge-compatible, no native binary, first-class Neon HTTP driver support, SQL-adjacent query syntax |
| `@neondatabase/serverless` | latest | Neon HTTP driver | Avoids TCP connection pool exhaustion in serverless; required for Drizzle neon-http adapter |
| drizzle-kit | latest | Migration CLI | Companion to Drizzle ORM; `drizzle-kit generate` + `drizzle-kit migrate` |
| Tailwind CSS | 4.x | Styling | CSS-first configuration via `@theme`; ships with `create-next-app` defaults |
| `@tailwindcss/postcss` | 4.x | PostCSS integration | Required for Tailwind v4 in Next.js |
| shadcn/ui | latest (Tailwind v4 compatible) | Component library | Code-owned components; Radix primitives for accessibility; Tailwind v4 fully supported as of 2025 |
| `nanoid` | 5.x | Short ID generation | 118-byte pure ESM; `nanoid(10)` gives ~73 bits entropy; URL-safe; type definitions included |
| `zod` | 3.x | Schema validation | Validates form inputs server-side in Server Actions and client-side for real-time feedback |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.x (first-class tz support) | Date arithmetic | Generating slot series, formatting display dates, computing date ranges |
| `date-fns-tz` | 3.x | Timezone conversion | Server-side UTC conversion: `fromZonedTime()` and `toZonedTime()`; use when converting creator's "9am in America/New_York" to UTC slot timestamps |
| `react-day-picker` | 9.x | Calendar date picker | Supports `mode="multiple"` for specific dates and `mode="range"` for date ranges; ~5kb; accessible; unstyled by default |
| `@upstash/ratelimit` | latest | Rate limiting | Serverless-compatible; Fixed Window / Sliding Window / Token Bucket; used in event creation Route Handler |
| `@upstash/redis` | latest | Redis client for Upstash | HTTP-based; works in Edge and Node.js; required peer dependency for `@upstash/ratelimit` |
| `@fontsource-variable/inter` | latest | Inter Variable font | Zero CLS, no external font request; self-hosted via Next.js font system OR fontsource |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has native binary (not Edge-compatible); heavier bundle; Drizzle wins for Neon serverless |
| `react-day-picker` | Custom calendar | DayPicker v9 is actively maintained, accessible, lightweight; not worth building custom for date selection |
| Upstash Redis | In-memory rate limiting | In-memory state does not survive serverless function cold starts; Upstash persists across invocations |
| `nanoid` | `uuid` | UUIDs are 36 chars and ugly in URLs; nanoid(10) is URL-safe and shorter |
| Tailwind v4 | Tailwind v3 | v4 is the current standard; CSS-first config is cleaner; v3 is in maintenance mode |

### Installation

```bash
# 1. Scaffold
npx create-next-app@latest timely --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

# 2. Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# 3. Validation
npm install zod

# 4. Dates
npm install date-fns date-fns-tz

# 5. IDs
npm install nanoid

# 6. Date picker
npm install react-day-picker

# 7. Rate limiting
npm install @upstash/ratelimit @upstash/redis

# 8. shadcn/ui init (after Tailwind is set up)
npx shadcn@latest init
npx shadcn@latest add button input label textarea skeleton card

# 9. Font (if using fontsource instead of next/font)
npm install @fontsource-variable/inter
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — Inter font, warm bg, global styles
│   ├── globals.css             # Tailwind v4 @import + @theme warm palette
│   ├── page.tsx                # Home/landing — event creation form
│   └── e/
│       └── [id]/
│           ├── page.tsx        # Public event page — title, dates, CTA
│           ├── opengraph-image.tsx  # Dynamic OG image (file convention)
│           └── loading.tsx     # Skeleton loading state
├── components/
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   ├── create-event-form.tsx   # Multi-step event creation form (client component)
│   ├── date-picker.tsx         # react-day-picker wrapper (client component)
│   └── event-page-skeleton.tsx # Skeleton for event page loading
├── lib/
│   ├── db.ts                   # Drizzle + Neon singleton
│   ├── schema.ts               # Drizzle schema definitions
│   ├── id.ts                   # nanoid(10) wrapper
│   ├── rate-limit.ts           # Upstash Ratelimit instance
│   └── validations.ts          # Zod schemas for event creation
└── actions/
    └── events.ts               # createEvent Server Action
```

### Pattern 1: Next.js 15 Dynamic Route — Async Params

**What:** In Next.js 15, `params` in dynamic routes is a Promise. Both `page.tsx` and `generateMetadata` must `await params`.

**When to use:** Every dynamic route (`app/e/[id]/page.tsx`).

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// app/e/[id]/page.tsx

import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params  // MUST await in Next.js 15
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  })
  if (!event) return { title: 'Event not found' }
  return {
    title: event.title,
    description: event.description ?? `Join ${event.title} — mark your availability`,
    openGraph: {
      title: event.title,
      description: event.description ?? `Join ${event.title} — mark your availability`,
      type: 'website',
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params  // MUST await in Next.js 15
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  })
  if (!event) notFound()
  // render...
}
```

### Pattern 2: Drizzle ORM + Neon Singleton

**What:** Create one Drizzle instance per process, export it as a module singleton.

**When to use:** Import `db` everywhere database access is needed.

```typescript
// Source: https://orm.drizzle.team/docs/connect-neon
// src/lib/db.ts

import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

### Pattern 3: Drizzle Schema (Timely tables)

**What:** Define all Phase 1 tables in a single schema file using Drizzle's `pgTable`, `pgEnum`, and column types.

**When to use:** Source of truth for all database structure. Run `drizzle-kit generate` after any schema change, then `drizzle-kit migrate` to apply.

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
// src/lib/schema.ts

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const dateModeEnum = pgEnum('date_mode', ['specific_dates', 'date_range'])
export const eventStatusEnum = pgEnum('event_status', ['open', 'closed', 'confirmed'])

export const events = pgTable('events', {
  id: text('id').primaryKey(),                          // nanoid(10) — set in application code
  title: text('title').notNull(),
  description: text('description'),
  dateMode: dateModeEnum('date_mode').notNull(),
  rangeStart: timestamp('range_start', { withTimezone: true }),
  rangeEnd: timestamp('range_end', { withTimezone: true }),
  dayStart: integer('day_start').notNull().default(9),  // UTC hour
  dayEnd: integer('day_end').notNull().default(21),     // UTC hour
  timezone: text('timezone').notNull(),                  // IANA tz e.g. "America/New_York"
  status: eventStatusEnum('status').notNull().default('open'),
  confirmedSlot: timestamp('confirmed_slot', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const eventDates = pgTable('event_dates', {
  id: text('id').primaryKey(),                          // nanoid(10)
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),                         // ISO date string "YYYY-MM-DD"
  sortOrder: integer('sort_order').notNull(),
})

export const participants = pgTable('participants', {
  id: text('id').primaryKey(),                          // nanoid(10)
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pinHash: text('pin_hash').notNull(),
  email: text('email'),
  timezone: text('timezone'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('participants_event_name_idx').on(table.eventId, table.name),
])

export const availability = pgTable('availability', {
  id: text('id').primaryKey(),                          // nanoid(10)
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  slotStart: timestamp('slot_start', { withTimezone: true }).notNull(),  // UTC
  isAvailable: boolean('is_available').notNull().default(true),
}, (table) => [
  uniqueIndex('availability_participant_slot_idx').on(table.participantId, table.slotStart),
  index('availability_event_slot_idx').on(table.eventId, table.slotStart),
])

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),                          // nanoid(10)
  token: text('token').notNull().unique(),              // 32-byte random hex — httpOnly cookie value
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const magicTokens = pgTable('magic_tokens', {
  id: text('id').primaryKey(),                          // nanoid(10)
  tokenHash: text('token_hash').notNull().unique(),     // SHA-256 of raw token (stored); raw sent in email
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
})
```

### Pattern 4: Server Action for Event Creation

**What:** Server Action that validates input with Zod, generates a nanoid, inserts the event, and redirects to the event page.

**When to use:** The create-event form `action` prop.

```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
// src/actions/events.ts
'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events, eventDates } from '@/lib/schema'
import { createEventSchema } from '@/lib/validations'
import { nanoid } from 'nanoid'

export async function createEvent(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = createEventSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { title, description, dateMode, specificDates, rangeStart, rangeEnd,
          dayStart, dayEnd, timezone } = parsed.data

  const id = nanoid(10)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 37) // 30 days after last candidate date (approximated at creation)

  await db.insert(events).values({
    id,
    title,
    description: description || null,
    dateMode,
    rangeStart: rangeStart ? new Date(rangeStart) : null,
    rangeEnd: rangeEnd ? new Date(rangeEnd) : null,
    dayStart: Number(dayStart),
    dayEnd: Number(dayEnd),
    timezone,
    expiresAt,
  })

  if (dateMode === 'specific_dates' && specificDates) {
    const dates = JSON.parse(specificDates as string) as string[]
    await db.insert(eventDates).values(
      dates.map((date, i) => ({ id: nanoid(10), eventId: id, date, sortOrder: i }))
    )
  }

  redirect(`/e/${id}`)
}
```

### Pattern 5: Rate Limiting with Upstash

**What:** IP-based rate limiting on the event creation Route Handler using Upstash Redis sliding window.

**When to use:** Event creation endpoint only. Phase 5 adds honeypot + additional hardening.

```typescript
// Source: https://upstash.com/blog/nextjs-ratelimiting
// src/lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const eventCreationRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),          // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 requests per minute per identifier
  analytics: true,
})
```

```typescript
// Usage in a Route Handler (POST /api/events) or via middleware
// src/app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { eventCreationRatelimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success, limit, remaining, reset } = await eventCreationRatelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating another event.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    )
  }
  // proceed with event creation...
}
```

**Note on Server Actions vs Route Handlers for rate limiting:** The phase's prior decisions specify "Server Actions for data mutations; Route Handlers for auth endpoints." However, rate limiting IP-based requests requires access to `NextRequest` headers, which Server Actions do not expose cleanly. The recommended pattern for EVNT-07/SECR-04 is: use a Route Handler (`POST /api/events`) for event creation (to get IP from `x-forwarded-for` for rate limiting), not a Server Action. Alternatively, use Next.js Middleware for rate limiting at the edge before the Server Action even runs.

### Pattern 6: Dynamic OG Image via File Convention

**What:** `opengraph-image.tsx` placed next to the event page generates a dynamic OG image for each event. `ImageResponse` is imported from `next/og` — NOT from `@vercel/og` directly.

**When to use:** Fulfills EVNT-07. Runs on the Edge runtime at request time for crawlers.

```typescript
// Source: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
// src/app/e/[id]/opengraph-image.tsx

import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'  // OG image generation runs at edge

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params   // Next.js 15: await params
  const event = await db.query.events.findFirst({ where: eq(events.id, id) })

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FAF8F5',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 600, color: '#1C1A17', marginBottom: 24 }}>
          {event?.title ?? 'Event'}
        </div>
        <div style={{ fontSize: 28, color: '#6B6158' }}>
          {event?.description ?? 'Mark your availability'}
        </div>
        <div style={{ marginTop: 48, fontSize: 22, color: '#E8823A' }}>
          timely.app
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**CSS limitation:** `ImageResponse` only supports flexbox and a subset of CSS. No CSS Grid. All layout must use `display: flex`.

### Pattern 7: Tailwind v4 CSS-First Warm Palette

**What:** Define the warm palette in `globals.css` using Tailwind v4's `@theme` directive. No `tailwind.config.js` needed.

**When to use:** Replace Tailwind v3 config file. Required for all custom colors.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Warm off-white background — never #FFFFFF as page bg */
  --color-warm-bg: #FAF8F5;
  --color-warm-surface: #FFFFFF;
  --color-warm-surface-subtle: #F3EFE9;
  --color-warm-border: #E5DDD4;
  --color-warm-border-strong: #C4B8AA;

  --color-warm-text: #1C1A17;
  --color-warm-text-secondary: #6B6158;
  --color-warm-text-disabled: #A89E94;

  --color-brand: #E8823A;
  --color-brand-hover: #D4722E;
  --color-brand-subtle: #FDF0E6;

  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

body {
  background-color: var(--color-warm-bg);
  color: var(--color-warm-text);
  font-family: var(--font-sans);
  min-height: 100dvh;  /* dvh not vh — avoids mobile browser chrome issue */
}
```

### Pattern 8: Drizzle Kit Configuration

**What:** `drizzle.config.ts` wires drizzle-kit to the schema and database.

```typescript
// drizzle.config.ts (root of project)
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

```json
// Add to package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Anti-Patterns to Avoid

- **Importing `ImageResponse` from `@vercel/og`:** In Next.js 15 App Router, import from `next/og`. The `@vercel/og` package is not needed as a separate dependency — Next.js bundles it.
- **Accessing `params` synchronously in Next.js 15:** `params` is a Promise. Accessing `params.id` without `await` causes a runtime error. Always `const { id } = await params`.
- **Using `timestamp()` without `withTimezone: true`:** Without the flag, Postgres stores `TIMESTAMP WITHOUT TIME ZONE`, which is ambiguous. Always use `{ withTimezone: true }` for all time columns.
- **Using sequential integer primary keys for events:** Guessable IDs allow enumeration of all events. `nanoid(10)` is the correct choice — set the ID in application code, not via DB auto-increment.
- **Using `100vh` for full-height layouts on mobile:** Use `100dvh` (dynamic viewport height) — `100vh` is taller than the visible area on mobile when the browser's address bar is visible.
- **Configuring Tailwind via `tailwind.config.js` with v4:** Tailwind v4 uses CSS-first configuration. The `tailwind.config.js` pattern is v3. Use `@theme` in `globals.css`.
- **Creating multiple Drizzle/Neon instances:** Each serverless function invocation that imports `db.ts` reuses the module-level singleton. Instantiating inside request handlers creates a new connection on every request.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range calendar UI | Custom calendar grid | `react-day-picker` v9 | Accessibility, keyboard navigation, ARIA roles — extremely hard to get right |
| Rate limiting counter | Redis INCR + TTL logic | `@upstash/ratelimit` | Sliding window algorithm, race condition safety, analytics built-in |
| OG image rendering | HTML→image conversion | `ImageResponse` from `next/og` | Uses Satori + resvg internally; handles font loading, text wrapping |
| CSS skeleton shimmer | Custom animation | `shadcn/ui Skeleton` | Pre-built shimmer using Tailwind animate; consistent with design system |
| Database migrations | Raw SQL files | `drizzle-kit generate + migrate` | Tracks schema snapshots, generates SQL diffs, rollback-safe |

**Key insight:** Phase 1's hardest UI problem is the date picker — both multi-select and range modes. `react-day-picker` v9 handles both with a single package. The accessibility requirements (keyboard nav, ARIA, screen reader labels) alone make custom implementation unjustifiable.

---

## Common Pitfalls

### Pitfall 1: Next.js 15 Async Params Breaking Change

**What goes wrong:** Code written for Next.js 14 that accesses `params.id` directly throws at runtime in Next.js 15.
**Why it happens:** Next.js 15 made `params` (and `searchParams`) Promises to better support async data loading.
**How to avoid:** Always `const { id } = await params` in both `generateMetadata` and page components.
**Warning signs:** TypeScript will flag `params.id` as potentially undefined if types are correct — use `params: Promise<{ id: string }>`.

### Pitfall 2: ImageResponse CSS Limitations

**What goes wrong:** Using `display: grid`, `gap`, `position: sticky`, or other non-supported CSS in an `opengraph-image.tsx` causes silent fallback or misrendering.
**Why it happens:** `ImageResponse` uses Satori which only supports flexbox and a subset of CSS.
**How to avoid:** Use only `display: flex`, `flexDirection`, `alignItems`, `justifyContent`, `fontSize`, `fontWeight`, `color`, `margin`, `padding`, `background` in OG image JSX.
**Warning signs:** OG image appears blank or incorrectly laid out; no error thrown.

### Pitfall 3: Tailwind v4 vs v3 Configuration Conflict

**What goes wrong:** Adding a `tailwind.config.js` or using `@tailwind base/components/utilities` in `globals.css` alongside Tailwind v4 causes conflicts or no output.
**Why it happens:** Tailwind v4 is CSS-first. The old config file and directive syntax are v3 patterns.
**How to avoid:** Use `@import "tailwindcss"` and `@theme {}` in `globals.css`. No config file. PostCSS plugin is `@tailwindcss/postcss`.
**Warning signs:** Tailwind classes have no effect; build produces no CSS output.

### Pitfall 4: Rate Limiting State Lost Between Serverless Invocations

**What goes wrong:** In-memory rate limiting (e.g., a `Map` in module scope) resets on every cold start, allowing unlimited requests across different function instances.
**Why it happens:** Serverless functions are stateless — no shared memory between invocations.
**How to avoid:** Use Upstash Redis for all rate limiting state. The HTTP-based Upstash client works from any serverless environment.
**Warning signs:** Rate limiting appears to work locally but not in production; users can spam event creation.

### Pitfall 5: UTC Storage Discipline Broken at Insert

**What goes wrong:** Creator's "9am" is stored as a local time string instead of a UTC timestamp, causing heatmap aggregation across timezones to show incorrect overlaps.
**Why it happens:** Date input values from HTML forms are local-time strings (e.g., "2026-03-15"). Without explicit conversion, inserting them directly stores local time.
**How to avoid:** Use `date-fns-tz`'s `fromZonedTime(localDate, timezone)` server-side to convert before any DB insert. The `day_start`/`day_end` integer columns store UTC hours — compute them from the creator's timezone at event creation time.
**Warning signs:** Participants in different timezones see inconsistent slot times; the availability heatmap shows wrong peak times.

### Pitfall 6: shadcn/ui Not Initialized Before Component Add

**What goes wrong:** Running `npx shadcn@latest add button` before `npx shadcn@latest init` fails or installs to wrong location.
**Why it happens:** `init` creates `components.json` which tells shadcn where to put components.
**How to avoid:** Always run `npx shadcn@latest init` first; it sets up `components/ui/` directory and configures the path aliases.
**Warning signs:** Components install to unexpected directories; imports fail.

---

## Code Examples

Verified patterns from official sources:

### Zod Schema for Event Creation

```typescript
// Source: Official Zod docs + project requirements
// src/lib/validations.ts

import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  dateMode: z.enum(['specific_dates', 'date_range']),
  specificDates: z.string().optional(),   // JSON array of ISO date strings
  rangeStart: z.string().optional(),      // ISO date string
  rangeEnd: z.string().optional(),        // ISO date string
  dayStart: z.coerce.number().int().min(0).max(23).default(9),
  dayEnd: z.coerce.number().int().min(0).max(23).default(21),
  timezone: z.string().min(1, 'Timezone is required'),
}).refine((data) => {
  if (data.dateMode === 'specific_dates') {
    return data.specificDates && JSON.parse(data.specificDates).length > 0
  }
  if (data.dateMode === 'date_range') {
    return data.rangeStart && data.rangeEnd
  }
  return false
}, { message: 'Date selection is required' })
```

### nanoid ID Helper

```typescript
// Source: https://github.com/ai/nanoid
// src/lib/id.ts

import { nanoid } from 'nanoid'

/** Generate a 10-character URL-safe event ID (~73 bits entropy) */
export const generateId = () => nanoid(10)
```

### Skeleton Loading State

```typescript
// Source: shadcn/ui docs — https://ui.shadcn.com/docs/components/skeleton
// src/components/event-page-skeleton.tsx

import { Skeleton } from '@/components/ui/skeleton'

export function EventPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-8 space-y-4">
      <Skeleton className="h-8 w-3/4" />         {/* Event title */}
      <Skeleton className="h-4 w-full" />         {/* Description line 1 */}
      <Skeleton className="h-4 w-5/6" />         {/* Description line 2 */}
      <div className="pt-4 space-y-2">
        <Skeleton className="h-4 w-1/4" />       {/* "Candidate dates" label */}
        <Skeleton className="h-12 w-full" />      {/* Date chip row */}
        <Skeleton className="h-12 w-full" />      {/* Date chip row */}
        <Skeleton className="h-12 w-full" />      {/* Date chip row */}
      </div>
      <Skeleton className="h-12 w-full mt-6" />  {/* CTA button */}
    </div>
  )
}
```

### Upstash Redis Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

`Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically.

### date-fns-tz UTC Conversion

```typescript
// Source: https://www.npmjs.com/package/date-fns-tz
// Converting creator's local time to UTC for storage

import { fromZonedTime, toZonedTime } from 'date-fns-tz'

// Convert "9:00 AM America/New_York" → UTC Date for DB storage
const utcSlotStart = fromZonedTime('2026-03-15 09:00:00', 'America/New_York')
// utcSlotStart: 2026-03-15T14:00:00.000Z

// Convert UTC back to display in a viewer's timezone
const localDate = toZonedTime(utcSlotStart, 'Europe/London')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/og` imported directly | `ImageResponse` from `next/og` | Next.js 13.3+ | `@vercel/og` is bundled in Next.js; no separate install needed |
| `tailwind.config.js` | CSS-first `@theme` in `globals.css` | Tailwind v4 (stable 2025) | No config file; content detection is automatic |
| `params.id` (sync) | `(await params).id` | Next.js 15 | Breaking change; all dynamic routes affected |
| `timestamp()` (no tz) | `timestamp({ withTimezone: true })` | Drizzle best practice | Postgres `TIMESTAMPTZ` vs `TIMESTAMP`; critical for UTC correctness |
| `bcryptjs` for PIN | Argon2id `memoryCost: 65536` | OWASP 2025 recommendation | Argon2id is memory-hard; bcrypt is not; decided in prior decisions |
| `npx shadcn-ui@latest` | `npx shadcn@latest` | shadcn/ui 2024+ | CLI package name changed from `shadcn-ui` to `shadcn` |

**Deprecated/outdated:**
- `react-schedule-selector`: Last commit Dec 2022, unmaintained, styled-components dependency. Do not use.
- `moment.js`: Unmaintained, 67kb. Use `date-fns` instead.
- `@tailwind base; @tailwind components; @tailwind utilities`: v3 directives. In v4, use `@import "tailwindcss"`.

---

## Open Questions

1. **Rate limiting: Server Action vs Route Handler**
   - What we know: Prior decisions say "Server Actions for mutations" but rate limiting requires `x-forwarded-for` IP header access
   - What's unclear: Whether Next.js middleware is the preferred layer for rate limiting (runs before Server Actions), or whether a Route Handler wrapper is cleaner
   - Recommendation: Use a Route Handler (`POST /api/events`) for the event creation endpoint to allow clean IP extraction and rate limit header injection. Alternatively, implement rate limiting in `middleware.ts` at the edge for the `/api/events` path — this is the most architecturally clean approach and is supported by Upstash's edge rate limit documentation.

2. **`drizzle-kit push` vs `generate + migrate` for development**
   - What we know: `drizzle-kit push` applies schema changes directly without generating SQL files; `generate + migrate` produces versioned SQL migration files
   - What's unclear: Which to use during rapid Phase 1 development (before production launch)
   - Recommendation: Use `drizzle-kit push` during active development (faster iteration). Switch to `generate + migrate` before deploying to production (versioned, reproducible migrations). The schema is the source of truth in either case.

3. **Upstash free tier limits for development**
   - What we know: Upstash Redis free tier exists; `@upstash/ratelimit` is the recommended library
   - What's unclear: Current free tier request limits (not verified in this research session)
   - Recommendation: Create an Upstash account and verify free tier before committing to the billing model. As of 2025, the free tier includes 10,000 commands/day which is sufficient for development.

---

## Sources

### Primary (HIGH confidence)

- [Next.js 15 Metadata and OG Images — Official Docs](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — `generateMetadata`, `opengraph-image.tsx` file convention, `ImageResponse` import path
- [Next.js 15 create-next-app CLI Reference](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — all flags including `--src-dir`, `--app`, `--typescript`, `--tailwind`
- [Next.js 15 Dynamic APIs are Asynchronous](https://nextjs.org/docs/messages/sync-dynamic-apis) — `params` is a Promise, must be awaited
- [Drizzle ORM + Neon Connection Guide](https://orm.drizzle.team/docs/connect-neon) — `neon-http` driver, singleton pattern, package install
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) — `pgTable`, `pgEnum`, `timestamp({ withTimezone: true })`, `text`, `integer`, `boolean`
- [Drizzle ORM Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration) — `uniqueIndex`, `index`, `references`
- [Tailwind CSS v4 Release Post](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config, `@theme`, `@import "tailwindcss"`, `@tailwindcss/postcss`
- [shadcn/ui Tailwind v4 Docs](https://ui.shadcn.com/docs/tailwind-v4) — confirmed v4 compatibility, `data-slot` attributes, tailwindcss-animate deprecation

### Secondary (MEDIUM confidence)

- [Upstash Rate Limiting Blog Post — Official Upstash](https://upstash.com/blog/nextjs-ratelimiting) — sliding window, `Redis.fromEnv()`, IP-based identifier, 429 response pattern
- [Neon Connect Next.js Guide](https://neon.com/docs/guides/nextjs) — `DATABASE_URL` format, `@neondatabase/serverless` driver, `force-dynamic` for fresh data
- [React DayPicker v9 Range Mode](https://daypicker.dev/selections/range-mode) — `mode="range"`, `mode="multiple"`, v9 API; confirmed actively maintained
- [date-fns-tz npm (v4)](https://www.npmjs.com/package/@date-fns/tz) — `fromZonedTime`, `toZonedTime` API

### Tertiary (LOW confidence)

- Community tutorials on Next.js 15 + Drizzle + Neon integration patterns — consistent with official docs but not independently verified
- Upstash free tier request limits — referenced but not verified against current pricing page during this research session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against official docs; versions confirmed
- Architecture: HIGH — Next.js 15 patterns from official docs; Drizzle patterns from official docs
- Pitfalls: HIGH — async params change is official Next.js 15 breaking change; Tailwind v4 config change is documented; UTC pitfall is a known PostgreSQL issue
- Rate limiting: MEDIUM — Upstash pattern verified from official Upstash blog; specific IP extraction details may vary between deployment environments

**Research date:** 2026-02-18
**Valid until:** 2026-08-18 (stable; re-verify if Next.js 16 releases or Drizzle ORM hits 1.0)
