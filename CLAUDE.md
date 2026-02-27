# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint (next lint)

# Database (Drizzle ORM)
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly to DB (dev only)
npm run db:studio    # Open Drizzle Studio (local DB explorer)
```

No automated test suite — verification is manual UAT documented in `.planning/phases/*/`.

## Environment Variables

Copy `.env.local.example` to `.env.local`. All six vars are required:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon Console → Connection string (pooled) |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → REST API |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; Vercel URL in prod |

## Architecture

**Timely** is a scheduling app where participants mark availability on a shared grid and a heatmap reveals the overlap. No accounts — identity is name + 4-digit PIN, with magic link email fallback.

### Stack
- **Next.js 16** (App Router), **React 19**, **TypeScript 5.9**, **Tailwind CSS 4**
- **Neon** (serverless Postgres) + **Drizzle ORM** with `@neondatabase/serverless` HTTP driver
- **Zustand 5** for client UI state (grid selection, heatmap filters)
- **shadcn/ui** (New York style) + Lucide icons
- **Resend** + **React Email** for magic link emails
- **Upstash Redis** + `@upstash/ratelimit` for rate limiting
- **Vercel** deployment with a daily 3 AM UTC cron (`/api/cron/expire-events`)

### Route Structure

```
src/app/
├── page.tsx                    # Home — event creation form
├── e/[id]/
│   ├── page.tsx               # Main event page (grid + heatmap + participants)
│   ├── confirm/page.tsx       # Creator confirms winning time
│   ├── manage/page.tsx        # Event management (creator only)
│   └── magic/page.tsx         # Magic link consumption
├── api/
│   ├── events/route.ts        # POST: create event
│   ├── availability/route.ts  # GET/POST: fetch/save slots
│   ├── participants/
│   │   ├── join/              # POST: register name+PIN
│   │   ├── verify-pin/        # POST: authenticate (rate-limited)
│   │   ├── check-name/        # POST: name availability check
│   │   └── magic-link/        # request/ + consume/
│   └── cron/expire-events/    # GET: daily cleanup job
└── privacy/page.tsx
```

### Database Schema (`src/lib/schema.ts`)

Six tables with cascade deletes from `events`:
- `events` — title, dateMode, timezone, status, confirmedSlot, expiresAt
- `eventDates` — candidate dates for "specific_dates" mode
- `participants` — name (unique per event), pinHash (Argon2id), email (nullable, purged)
- `availability` — one row per 30-min slot per participant (slotStart UTC, isAvailable bool)
- `sessions` — opaque 64-char tokens, 7-day TTL, scoped to eventId
- `magicTokens` — SHA-256-hashed one-time tokens, 30-min TTL

### Auth Model

**No OAuth or JWTs.** Three mechanisms:

1. **PIN auth** — Argon2id (memoryCost: 65536 per OWASP 2025); verified at `/api/participants/verify-pin`; rate-limited with 15-min cooldown
2. **Session cookies** — `timely_session` httpOnly cookie; DB-backed opaque tokens scoped to eventId
3. **Magic links** — One-time email tokens via Resend; bypass PIN entirely; 30-min TTL

Creator access uses a separate `timely_creator_${eventId}` cookie.

**Key rule:** Auth endpoints are Route Handlers (not Server Actions) because they need HTTP status codes (401, 429) for proper rate limit responses.

### Key Patterns

**Server vs Client split** — Server Components fetch data; Client Components handle interactivity. Zustand stores (`useGridStore`, `useHeatmapStore`) manage UI state only — no persistence.

**UTC everywhere** — All timestamps stored in UTC. Timezone conversions happen client-side with `date-fns-tz`. Participant and event timezones stored as IANA strings.

**Atomic batches** — Use `db.batch()` for multi-step writes (Neon HTTP driver doesn't support transactions).

**Rate limiting** — `src/lib/rate-limit.ts` wraps Upstash. Applied to: PIN verification (5 attempts / 15 min), magic link requests (3 / 30 min), event creation.

**Argon2 config** — `@node-rs/argon2` requires `serverExternalPackages: ['@node-rs/argon2']` in `next.config.ts` to avoid WASM bundling errors.

**Flash toasts** — Stored in a non-httpOnly cookie (`timely_toast`) for post-redirect display via Sonner.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
