---
phase: 02-participant-identity-and-pin-system
plan: "01"
subsystem: auth
tags: [argon2, resend, react-email, rate-limiting, drizzle, session, magic-link]

# Dependency graph
requires:
  - phase: 01-foundation-and-event-creation
    provides: schema.ts with sessions/participants/magicTokens tables, rate-limit.ts with Upstash setup

provides:
  - Argon2id PIN hashing utilities (hashPin/verifyPin) with OWASP 2025 settings
  - Session reader (getSession) with async Next.js 15 cookies and event-scoped validation
  - Magic token generator (generateMagicToken/buildMagicUrl/hashTokenForLookup) with SHA-256 hashing
  - Rate limiters for PIN verification (5/15min) and magic links (3/30min)
  - Magic link email template (React Email component with Resend)
  - Drizzle ORM relations for sessions/participants/magicTokens
  - shadcn drawer, input-otp, sonner components

affects:
  - 02-02 (participant registration API uses hashPin and pinVerifyRatelimit)
  - 02-03 (magic link API uses generateMagicToken, buildMagicUrl, magicLinkRatelimit, MagicLinkEmail)
  - 02-04 (session API uses getSession, SESSION_COOKIE)
  - 02-05 (participant identity UI uses drawer, input-otp, sonner)

# Tech tracking
tech-stack:
  added:
    - "@node-rs/argon2 — Argon2id hashing (native Node addon, configured in serverExternalPackages)"
    - "resend — transactional email delivery"
    - "@react-email/components — email template primitives"
    - "motion — animation library (available for Phase 2 UI)"
    - "vaul (via shadcn drawer) — drawer component"
    - "input-otp — OTP/PIN input component"
    - "sonner — toast notification system"
  patterns:
    - "server-only guard on all auth/crypto modules to prevent accidental client-side import"
    - "SHA-256 hash stored in DB; raw token sent in email only — token never persists in plaintext"
    - "Drizzle relations defined in separate relations.ts, merged into db schema object"
    - "Sliding window rate limiting for all auth endpoints (not fixed window)"

key-files:
  created:
    - src/lib/argon2.ts
    - src/lib/auth.ts
    - src/lib/magic-tokens.ts
    - src/lib/relations.ts
    - src/emails/magic-link-email.tsx
    - src/components/ui/drawer.tsx
    - src/components/ui/input-otp.tsx
    - src/components/ui/sonner.tsx
  modified:
    - next.config.ts
    - src/lib/rate-limit.ts
    - src/lib/db.ts
    - .env.local.example
    - package.json

key-decisions:
  - "serverExternalPackages for @node-rs/argon2 required to prevent Next.js WASM bundling error"
  - "Drizzle relations in separate relations.ts file, not inlined in schema.ts — keeps schema clean"
  - "async cookies() call in auth.ts — required by Next.js 15 cookies API"
  - "buildMagicUrl points at /api/participants/magic-link/consume (not a UI page) — server handles redirect after consumption"

patterns-established:
  - "server-only: All crypto/auth modules import 'server-only' as first line"
  - "Token security: raw tokens only in email/URL, SHA-256 hash only in DB"
  - "Rate limiting: slidingWindow used exclusively (not fixedWindow) to prevent boundary bypass"

requirements-completed: [IDEN-05, IDEN-06, IDEN-08, IDEN-09, SECR-01, SECR-02]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 2 Plan 01: Phase 2 Infrastructure Summary

**Argon2id PIN hashing, DB-backed session reader, magic link token generation, rate limiters (PIN + magic link), React Email template, and shadcn drawer/input-otp/sonner components — all server-only infrastructure for Phase 2 auth flows**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T09:07:22Z
- **Completed:** 2026-02-18T09:10:27Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Installed @node-rs/argon2, resend, @react-email/components, motion; configured next.config.ts serverExternalPackages to prevent native addon bundling error
- Built five server-only utility modules: argon2 helpers, session reader, magic token generator, updated rate limiters, email template
- Created Drizzle ORM relations (sessions/participants/magicTokens) in separate relations.ts and merged into db singleton
- Added shadcn drawer, input-otp, sonner components for Phase 2 UI work

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages, update next.config.ts, add shadcn components** - `f083238` (chore)
2. **Task 2: Build lib utilities — argon2, auth, magic-tokens, rate-limiters, email template** - `6be1190` (feat)

## Files Created/Modified

- `next.config.ts` - Added serverExternalPackages: ['@node-rs/argon2'] to prevent WASM bundling error
- `src/lib/argon2.ts` - hashPin/verifyPin using @node-rs/argon2 with OWASP 2025 settings (64MB memoryCost, timeCost 3)
- `src/lib/auth.ts` - getSession() reading timely_session cookie, DB lookup with expiry + eventId scope
- `src/lib/magic-tokens.ts` - generateMagicToken(), buildMagicUrl(), hashTokenForLookup() using Node crypto
- `src/lib/relations.ts` - Drizzle ORM relations for sessions/participants/magicTokens tables
- `src/lib/db.ts` - Updated to merge schema and relations for db.query relational API
- `src/lib/rate-limit.ts` - Added pinVerifyRatelimit (5/15min sliding) and magicLinkRatelimit (3/30min sliding)
- `src/emails/magic-link-email.tsx` - React Email component for magic link delivery with warm palette styling
- `src/components/ui/drawer.tsx` - shadcn Drawer component (wraps vaul internally)
- `src/components/ui/input-otp.tsx` - shadcn OTP/PIN input component
- `src/components/ui/sonner.tsx` - shadcn toast notification component
- `.env.local.example` - Added RESEND_API_KEY with source comment

## Decisions Made

- `serverExternalPackages` configuration required for @node-rs/argon2 — Next.js attempts to bundle native addons for browser without this, causing resolution errors
- Drizzle relations placed in `src/lib/relations.ts` (separate from schema.ts) to keep schema file clean and focused on table definitions only
- `await cookies()` used in auth.ts — Next.js 15 made the cookies API async; synchronous access was removed
- `buildMagicUrl` routes to `/api/participants/magic-link/consume` not a UI page — the Route Handler handles token validation and then redirects to the UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created Drizzle relations.ts for db.query relational API**
- **Found during:** Task 2 (building auth.ts)
- **Issue:** `db.query.sessions.findFirst({ with: { participant: true } })` requires Drizzle relations to be defined and registered — without them, the relational query builder has no knowledge of joins
- **Fix:** Created `src/lib/relations.ts` with sessionsRelations, participantsRelations, magicTokensRelations; updated `src/lib/db.ts` to spread both schema and relations into the db instance
- **Files modified:** src/lib/relations.ts (created), src/lib/db.ts (updated)
- **Verification:** TypeScript compiles clean, build exits 0
- **Committed in:** 6be1190 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for the auth.ts relational query to function correctly. The plan mentioned creating relations.ts as a possibility but treated it as conditional — it is actually required for the session query to work.

## Issues Encountered

None beyond the Drizzle relations requirement documented above.

## User Setup Required

`RESEND_API_KEY` added to `.env.local.example`. When deploying, obtain key from Resend Dashboard -> API Keys and add to Vercel environment variables.

## Next Phase Readiness

- All server-side utility modules are in place for Plans 02-04
- Plan 02 can now implement participant registration (POST /api/events/[id]/participants) using hashPin, pinVerifyRatelimit
- Plan 03 can implement magic link request + consume routes using generateMagicToken, magicLinkRatelimit, MagicLinkEmail
- Plan 04 can implement session management using getSession, SESSION_COOKIE
- Plan 05 can build the identity UI using drawer, input-otp, sonner components
- No blockers

---
*Phase: 02-participant-identity-and-pin-system*
*Completed: 2026-02-18*

## Self-Check: PASSED

All created files confirmed present. All task commits confirmed in git log.

| Check | Result |
|-------|--------|
| src/lib/argon2.ts | FOUND |
| src/lib/auth.ts | FOUND |
| src/lib/magic-tokens.ts | FOUND |
| src/lib/relations.ts | FOUND |
| src/emails/magic-link-email.tsx | FOUND |
| src/components/ui/drawer.tsx | FOUND |
| src/components/ui/input-otp.tsx | FOUND |
| src/components/ui/sonner.tsx | FOUND |
| 02-01-SUMMARY.md | FOUND |
| Commit f083238 (Task 1) | FOUND |
| Commit 6be1190 (Task 2) | FOUND |
