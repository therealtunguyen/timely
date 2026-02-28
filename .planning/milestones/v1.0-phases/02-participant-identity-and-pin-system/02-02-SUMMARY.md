---
phase: 02-participant-identity-and-pin-system
plan: "02"
subsystem: auth
tags: [route-handlers, participants, pin, magic-link, rate-limiting, argon2, session, drizzle]

# Dependency graph
requires:
  - phase: 02-participant-identity-and-pin-system
    plan: "01"
    provides: hashPin/verifyPin, generateMagicToken/buildMagicUrl/hashTokenForLookup, pinVerifyRatelimit/magicLinkRatelimit, SESSION_COOKIE, MagicLinkEmail, Drizzle relations

provides:
  - POST /api/participants/check-name — read-only name availability, always 200 ({status:'available'} or {status:'exists'})
  - POST /api/participants/join — participant + session creation in one operation, 201 + Set-Cookie
  - POST /api/participants/verify-pin — rate-limited Argon2id PIN check, 200 + Set-Cookie on success
  - POST /api/participants/magic-link/request — rate-limited magic link generation, Resend delivery, hash-only DB storage
  - GET /api/participants/magic-link/consume — token validation, single-use + expiry checks, session issue, email purge

affects:
  - 02-03 (magic-link UI page needs the consume redirect error states: invalid/used/expired)
  - 02-04 (session validation built on sessions table populated by join/verify-pin/consume)
  - 02-05 (participant identity UI calls these five endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All name uniqueness queries use sql`lower(${participants.name}) = ${name.toLowerCase()}` — case-insensitive enforcement without DB collation change"
    - "Rate limiting applied before DB work — fail fast on rate limit before any hash computation"
    - "check-name always returns 200 (never 409) — taken name is routing signal not error"
    - "Email stored temporarily on participants.email, purged immediately on magic link consumption or expiry"
    - "rawToken never returned in HTTP response — only delivered via email URL"

key-files:
  created:
    - src/app/api/participants/check-name/route.ts
    - src/app/api/participants/join/route.ts
    - src/app/api/participants/verify-pin/route.ts
    - src/app/api/participants/magic-link/request/route.ts
    - src/app/api/participants/magic-link/consume/route.ts
  modified: []

key-decisions:
  - "check-name always returns 200 — 409 would mean 'error', but a taken name just means returning user → different flow"
  - "Rate limit before DB/hash work in verify-pin — Argon2id is intentionally slow; don't waste compute on rate-limited requests"
  - "magic-link/request returns 200 even when participant not found — prevents enumeration of valid names"
  - "Email purged on both expiry path and success path in consume — two distinct code branches both call the purge"

patterns-established:
  - "read-only availability check endpoint (check-name) — never a DB write, always 200 with routing status"
  - "atomic participant + session creation (join) — no partial state (participant without session)"

requirements-completed: [IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-07, IDEN-08]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 2 Plan 02: Participant Auth Route Handlers Summary

**Five participant auth Route Handlers implementing name checking, new-user join, PIN verification, magic link request, and magic link consumption — all security operations (hashing, rate limiting, token validation, email purge) live server-side**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T09:14:35Z
- **Completed:** 2026-02-18T09:16:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created three core auth handlers: check-name (read-only availability), join (participant + session creation), verify-pin (rate-limited Argon2id check)
- Created two magic link handlers: request (rate-limited, Resend delivery, hash-only storage) and consume (token validation, single-use, email purge)
- All five handlers use `sql\`lower(...)\`` for case-insensitive name enforcement
- TypeScript compiles clean across all five new files

## Task Commits

Each task was committed atomically:

1. **Task 1: check-name, join, and verify-pin Route Handlers** - `33fca4f` (feat)
2. **Task 2: magic-link/request and magic-link/consume Route Handlers** - `ed33162` (feat)

## Files Created/Modified

- `src/app/api/participants/check-name/route.ts` — POST handler: validates name uniqueness (case-insensitive), read-only, returns 200 {status:'available'} or 200 {status:'exists'}
- `src/app/api/participants/join/route.ts` — POST handler: validates name + PIN together, inserts participant and session, issues session cookie (201)
- `src/app/api/participants/verify-pin/route.ts` — POST handler: rate-limited PIN check using pinVerifyRatelimit (5/15min), Argon2id verification, session cookie on success
- `src/app/api/participants/magic-link/request/route.ts` — POST handler: rate-limited (3/30min), stores SHA-256 hash only, sends Resend email with react component
- `src/app/api/participants/magic-link/consume/route.ts` — GET handler: token hash lookup, expiry + usedAt checks, session creation, email purge, redirects to /e/[id]

## Decisions Made

- `check-name` always returns 200 — using 409 for a taken name would signal "error" but a taken name means "returning user, route to PIN verify sheet". HTTP status conveys semantics, not just success/failure.
- Rate limiting applied before any DB or Argon2id work in `verify-pin` — Argon2id with 64MB memoryCost is intentionally slow; no benefit to starting hash work on requests that will be rejected anyway.
- `magic-link/request` returns 200 even when participant not found — returning 404 would let attackers enumerate which names exist in an event.
- Email purge happens in both paths of `consume` (expiry branch AND success branch) — the two code branches diverge after expiry check, so both need the purge call independently.

## Deviations from Plan

None — plan executed exactly as written. All five Route Handlers implemented verbatim from plan specifications. TypeScript compiled clean on first attempt.

## Requirements Shipped

- IDEN-01: participant name uniqueness per event (case-insensitive via lower())
- IDEN-02: name availability check endpoint (check-name)
- IDEN-03: case-insensitive name enforcement (lower() SQL in all queries)
- IDEN-04: PIN-based authentication (join + verify-pin)
- IDEN-05: Argon2id PIN hashing (hashPin from argon2.ts)
- IDEN-06: session cookie issuance on join + verify-pin
- IDEN-07: rate limiting on PIN verification (5/15min, 429 on 6th attempt)
- IDEN-08: magic link request + consume flow
- SECR-01: no plaintext PINs anywhere in code paths
- SECR-02: email purge on magic link consumption and expiry

---
*Phase: 02-participant-identity-and-pin-system*
*Completed: 2026-02-18*

## Self-Check: PASSED

All created files confirmed present. All task commits confirmed in git log.

| Check | Result |
|-------|--------|
| src/app/api/participants/check-name/route.ts | FOUND |
| src/app/api/participants/join/route.ts | FOUND |
| src/app/api/participants/verify-pin/route.ts | FOUND |
| src/app/api/participants/magic-link/request/route.ts | FOUND |
| src/app/api/participants/magic-link/consume/route.ts | FOUND |
| 02-02-SUMMARY.md | FOUND |
| Commit 33fca4f (Task 1) | FOUND |
| Commit ed33162 (Task 2) | FOUND |
