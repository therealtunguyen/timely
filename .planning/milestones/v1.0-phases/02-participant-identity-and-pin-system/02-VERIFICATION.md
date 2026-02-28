---
phase: 02-participant-identity-and-pin-system
verified: 2026-02-20T00:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "New visitor join flow — enter name + PIN on event page, reload, confirm recognized"
    expected: "Session cookie persists; event page shows 'Welcome back, [Name]' CTA without re-entering credentials"
    why_human: "Session cookie behavior and server-side session lookup require a live browser + DB"
  - test: "PIN rate limiting — enter wrong PIN 5 times for same participant"
    expected: "6th attempt returns 429 with 'Too many attempts. Try again in 15 minutes' message"
    why_human: "Rate limit window (Upstash Redis) requires live credentials and timing"
  - test: "Magic link end-to-end — request link, click email, verify session restored"
    expected: "Event page shows 'Welcome back, [Name]' CTA; clicking the same link again shows 'already used' page"
    why_human: "Requires live Resend delivery and real email client; cannot be verified by static analysis"
  - test: "Magic link error pages — visit /e/[id]/magic?error=expired, ?error=used, ?error=invalid"
    expected: "Each renders a distinct, friendly heading and 'Request a new link' CTA — not a 500 or blank screen"
    why_human: "Requires live app routing to confirm searchParams-driven conditional rendering"
---

# Phase 2: Participant Identity and PIN System — Verification Report

**Phase Goal:** A responder can claim a name, set a PIN, and return later to edit — all without creating an account.
**Verified:** 2026-02-20T00:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                      | Status     | Evidence                                                                                        |
|----|-----------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| 1  | A new visitor can enter a name and PIN and be recognized on a return visit without an account             | VERIFIED   | join/route.ts: hashPin() + db.insert(participants) + db.insert(sessions) + Set-Cookie; UAT Test 1 passed by human |
| 2  | Entering the wrong PIN 5 times triggers a lockout (429); further attempts blocked for 15 minutes         | VERIFIED   | verify-pin/route.ts: pinVerifyRatelimit.limit() called before DB/hash work; slidingWindow(5, '15 m'); UAT Test 5 passed |
| 3  | A responder who forgot their PIN can request a magic link, click it, and regain access                    | VERIFIED   | magic-link/request stores SHA-256 hash only; consume validates hash + expiry + usedAt; UAT Tests 7, 8, 9 passed |
| 4  | Clicking a used magic link shows "already used" error page (not 500 or blank)                            | VERIFIED   | consume/route.ts: `if (magicToken.usedAt !== null) → redirect to ?error=used`; magic/page.tsx renders `used` state |
| 5  | Two responders attempting the same name on the same event — one gets a conflict, the other is accepted    | VERIFIED   | check-name and join both use `sql\`lower(${participants.name}) = ${name.toLowerCase()}\``; UAT Test 2 passed |
| 6  | The database contains no plaintext PINs — all PINs are Argon2id hashed                                   | VERIFIED   | join/route.ts line 60: `const pinHash = await hashPin(pin)`; only pinHash inserted, never raw pin; argon2.ts memoryCost: 65536 |
| 7  | Email addresses are purged after magic link consumption (not persisted)                                   | VERIFIED   | consume/route.ts: `db.update(participants).set({ email: null })` called on both expiry path (line 45) and success path (line 58) |
| 8  | Session cookie is httpOnly, SameSite=Lax, 7-day expiry                                                   | VERIFIED   | join/route.ts lines 86-93, verify-pin/route.ts lines 90-96, consume/route.ts lines 77-83: all set `httpOnly: true, sameSite: 'lax', secure: production` |
| 9  | Return visit: PIN verify flow (not new PIN setup) when name already exists                                | VERIFIED   | name-sheet calls check-name; status:'exists' → JoinFlow.handleNameExists() → activeSheet='pin-verify' → PinSheet mode='verify' |
| 10 | Magic link token is never returned in HTTP response — only delivered via email URL                        | VERIFIED   | magic-link/request/route.ts line 92: comment "rawToken is deliberately NOT returned"; line 93: returns `{ success: true }` only |
| 11 | Event page reads session server-side and presents personalized CTA for authenticated visitors             | VERIFIED   | e/[id]/page.tsx: `getSession(id)` called in server component; conditional render of "Welcome back, [Name]" vs JoinFlow island |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact                                                    | Min Lines | Actual Lines | Status   | Details                                                                                            |
|-------------------------------------------------------------|-----------|--------------|----------|----------------------------------------------------------------------------------------------------|
| `src/lib/argon2.ts`                                         | —         | 17           | VERIFIED | `server-only` guard; `hashPin/verifyPin` using `@node-rs/argon2`; memoryCost: 65536, timeCost: 3  |
| `src/lib/auth.ts`                                           | —         | 48           | VERIFIED | `server-only` guard; `getSession(eventId?)` using async `cookies()` + Drizzle relational query    |
| `src/lib/magic-tokens.ts`                                   | —         | 27           | VERIFIED | `server-only` guard; `generateMagicToken()`, `buildMagicUrl()`, `hashTokenForLookup()` with Node crypto |
| `src/lib/relations.ts`                                      | —         | (exists)     | VERIFIED | Drizzle ORM relations for sessions/participants/magicTokens — required for `with: { participant }` queries |
| `src/lib/rate-limit.ts`                                     | —         | 30           | VERIFIED | `pinVerifyRatelimit` slidingWindow(5, '15 m'); `magicLinkRatelimit` slidingWindow(3, '30 m')       |
| `src/emails/magic-link-email.tsx`                           | —         | (exists)     | VERIFIED | React Email component used in magic-link/request with warm palette styling                         |
| `src/components/ui/drawer.tsx`                              | —         | (exists)     | VERIFIED | shadcn Drawer wrapping vaul; used by all identity sheets                                           |
| `src/components/ui/input-otp.tsx`                           | —         | (exists)     | VERIFIED | shadcn OTP input with `InputOTPSlot index={N}` API (no render prop)                               |
| `src/components/ui/sonner.tsx`                              | —         | (exists)     | VERIFIED | Sonner toast component; Toaster mounted in root layout                                             |
| `src/app/api/participants/check-name/route.ts`              | —         | 50           | VERIFIED | POST; case-insensitive lower() lookup; always 200 with `{status:'available'}` or `{status:'exists'}` |
| `src/app/api/participants/join/route.ts`                    | —         | 95           | VERIFIED | POST; hashPin → insert participant → insert session → Set-Cookie (httpOnly, SameSite=Lax, 7-day)  |
| `src/app/api/participants/verify-pin/route.ts`              | —         | 99           | VERIFIED | POST; rate limit before DB work; Argon2id verifyPin; session issue on success                     |
| `src/app/api/participants/magic-link/request/route.ts`      | —         | 94           | VERIFIED | POST; rate limit 3/30min; hash-only DB storage; Resend delivery; 200 even when name not found     |
| `src/app/api/participants/magic-link/consume/route.ts`      | —         | 86           | VERIFIED | GET; hash lookup; usedAt check; expiry check; email purge on both paths; session issue; redirect  |
| `src/components/identity/join-flow.tsx`                     | —         | 106          | VERIFIED | Orchestrator: 5-state machine (`none/name/pin-setup/pin-verify/magic-link`); 350ms transition delay |
| `src/components/identity/name-sheet.tsx`                    | —         | (exists)     | VERIFIED | Vaul drawer; check-name POST; routes to `onNameClaimed` or `onNameExists` on status               |
| `src/components/identity/pin-sheet.tsx`                     | —         | (exists)     | VERIFIED | 4x `InputOTPSlot index={N}`; useAnimation shake on failure; showForgotPin revealed after first failure |
| `src/components/identity/magic-link-sheet.tsx`              | —         | (exists)     | VERIFIED | Vaul drawer; email input; magic-link/request POST; 429 handling; state reset on close             |
| `src/app/e/[id]/magic/page.tsx`                             | —         | 59           | VERIFIED | ERROR_STATES map for `expired/used/invalid`; each with distinct heading, body, and "Request a new link" CTA |
| `src/app/e/[id]/page.tsx`                                   | 60        | (modified)   | VERIFIED | `getSession(id)` + parallel existingNames fetch; personalized CTA for session; JoinFlow island mount |
| `src/app/layout.tsx`                                        | —         | (modified)   | VERIFIED | `<Toaster position="top-center" />` from `@/components/ui/sonner` added to root layout            |

---

### Key Link Verification

| From                                            | To                                               | Via                                                | Status  | Details                                                                                     |
|-------------------------------------------------|--------------------------------------------------|----------------------------------------------------|---------|---------------------------------------------------------------------------------------------|
| `src/lib/argon2.ts`                             | `@node-rs/argon2`                                | `import { hash, verify } from '@node-rs/argon2'`  | WIRED   | Line 2; `serverExternalPackages` in next.config.ts prevents bundling error                  |
| `src/lib/auth.ts`                               | `src/lib/schema.ts` (sessions)                   | `db.query.sessions.findFirst({ with: { participant } })` | WIRED | Lines 35-38; relational query requires relations.ts to be merged into db singleton          |
| `src/lib/magic-tokens.ts`                       | Node.js `crypto`                                 | `import { createHash, randomBytes } from 'crypto'`| WIRED   | Line 2; all hashing is SHA-256 via Node crypto — no third-party crypto dependency          |
| `src/app/api/participants/join/route.ts`         | `src/lib/argon2.ts`                              | `hashPin(pin)`                                    | WIRED   | Line 60: `const pinHash = await hashPin(pin)` before db.insert                              |
| `src/app/api/participants/verify-pin/route.ts`   | `src/lib/rate-limit.ts`                          | `pinVerifyRatelimit.limit(rateLimitKey)`           | WIRED   | Lines 34-47: rate limit called before any DB or hash work                                   |
| `src/app/api/participants/verify-pin/route.ts`   | `src/lib/argon2.ts`                              | `verifyPin(pin, participant.pinHash)`              | WIRED   | Line 62: Argon2id verification only reached after rate limit passes                         |
| `src/app/api/participants/magic-link/request/route.ts` | `src/lib/magic-tokens.ts`                  | `generateMagicToken()` + `buildMagicUrl()`        | WIRED   | Lines 60, 79: token generated server-side; rawToken sent only in email URL                  |
| `src/app/api/participants/magic-link/consume/route.ts` | `src/lib/magic-tokens.ts`                  | `hashTokenForLookup(rawToken)`                    | WIRED   | Line 24: raw token from URL params hashed for DB lookup — never compared plaintext          |
| `src/app/api/participants/magic-link/consume/route.ts` | `src/lib/schema.ts` (participants)         | `db.update(participants).set({ email: null })`    | WIRED   | Lines 45-47 (expiry path) and 58-60 (success path): SECR-02 email purge in both branches   |
| `src/components/identity/join-flow.tsx`          | `src/components/identity/name-sheet.tsx`         | `<NameSheet open={activeSheet === 'name'} .../>`  | WIRED   | Lines 79-87: NameSheet driven by JoinFlow state; callbacks route to pin-setup or pin-verify |
| `src/components/identity/join-flow.tsx`          | `src/components/identity/pin-sheet.tsx`          | `<PinSheet open={...} mode={...} .../>`           | WIRED   | Lines 88-95: mode='setup' or 'verify' determined by activeSheet state                       |
| `src/components/identity/join-flow.tsx`          | `src/components/identity/magic-link-sheet.tsx`   | `<MagicLinkSheet open={activeSheet === 'magic-link'} .../>` | WIRED | Lines 97-103: MagicLinkSheet activated on handleForgotPin callback                |
| `src/app/e/[id]/page.tsx`                        | `src/lib/auth.ts`                                | `getSession(id)`                                  | WIRED   | Server component calls getSession; passes `sessionParticipantName` to JoinFlow island       |
| `src/app/e/[id]/page.tsx`                        | `src/components/identity/join-flow.tsx`          | `<JoinFlow eventId={id} .../>`                    | WIRED   | JoinFlow rendered as client island; mounts Vaul portals to document.body                   |
| `src/app/layout.tsx`                             | `src/components/ui/sonner.tsx`                   | `<Toaster position="top-center" />`               | WIRED   | Sonner Toaster in root layout; available app-wide for all toast notifications               |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                            | Status               | Evidence                                                                                                            |
|-------------|------------|----------------------------------------------------------------------------------------|----------------------|---------------------------------------------------------------------------------------------------------------------|
| IDEN-01     | 02-02, 02-03 | Participant name uniqueness per event (case-insensitive)                             | SATISFIED            | check-name and join both use `sql\`lower(${participants.name}) = ${name.toLowerCase()}\`` — DB-enforced case-insensitive |
| IDEN-02     | 02-02, 02-03 | Name availability check endpoint (read-only, always 200)                             | SATISFIED            | check-name/route.ts: no DB write; always 200 with `{status:'available'}` or `{status:'exists'}`                    |
| IDEN-03     | 02-02, 02-03 | Case-insensitive name enforcement across all lookups                                 | SATISFIED            | All five Route Handlers use `lower()` SQL function; not `eq(participants.name, name)` which would be case-sensitive |
| IDEN-04     | 02-02, 02-03 | PIN-based authentication with return visit flow                                      | SATISFIED            | join issues session on first visit; verify-pin issues session on return; PinSheet mode prop drives UI              |
| IDEN-05     | 02-01, 02-02 | Argon2id PIN hashing with OWASP 2025 settings                                        | SATISFIED            | argon2.ts: memoryCost: 65536 (64MB), timeCost: 3, parallelism: 1; `@node-rs/argon2` in serverExternalPackages      |
| IDEN-06     | 02-02, 02-04 | Session cookie issued after join and verify-pin; 7-day expiry; httpOnly              | SATISFIED            | Both handlers: `response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', expires: expiresAt })` |
| IDEN-07     | 02-02, 02-03 | Rate limiting on PIN verification (5 attempts / 15-min window)                       | SATISFIED            | verify-pin/route.ts: `pinVerifyRatelimit.limit()` called before DB/hash; slidingWindow(5, '15 m'); 429 with Retry-After: 900 |
| IDEN-08     | 02-02, 02-03 | Magic link request + consume flow (email delivery, single-use, 30-min TTL)           | SATISFIED            | request stores SHA-256 hash only; consume validates hash + expiry + usedAt; session issued on success              |
| IDEN-09     | 02-04       | Magic link error page with distinct messages for all failure states                   | SATISFIED            | magic/page.tsx: ERROR_STATES map with `expired`, `used`, `invalid` — each distinct heading + body + CTA            |
| SECR-01     | 02-01, 02-02 | No plaintext PINs anywhere — all hashing happens server-side                         | SATISFIED            | join/route.ts: `hashPin(pin)` called before any DB write; raw PIN string never stored or returned                  |
| SECR-02     | 02-02       | Email addresses purged after magic link expiry or consumption                         | SATISFIED            | consume/route.ts: `db.update(participants).set({ email: null })` in BOTH the expiry branch (line 45) and success branch (line 58) |

**Orphaned requirements for Phase 2:** None. All 11 requirements (IDEN-01 through IDEN-09, SECR-01, SECR-02) are claimed by plans and have supporting evidence.

---

### Anti-Patterns Found

| File                                                              | Line   | Pattern                                           | Severity | Impact                                                                                               |
|-------------------------------------------------------------------|--------|---------------------------------------------------|----------|------------------------------------------------------------------------------------------------------|
| `src/app/api/participants/magic-link/request/route.ts`            | 80     | Resend client instantiated inside POST handler (not module scope) | Info | Intentional — lazy init prevents build-time throw when RESEND_API_KEY absent from .env.local; no performance concern at serverless scale |

No blocker anti-patterns found. No `return null`, empty handlers, unimplemented stubs, or plaintext PIN/token storage detected.

**Security note — enumeration prevention:** `magic-link/request` returns `{ success: true, status: 200 }` even when the participant name is not found. This prevents timing or status-code based enumeration of valid participant names — verified correct in route.ts line 52-54.

---

### Human Verification Results

All 9 UAT tests passed (see `02-UAT.md`). Key human-verified behaviors:

| Test | Scenario | Result |
|------|----------|--------|
| 1 | New visitor join flow — name + PIN → session cookie → "Welcome back" CTA on reload | Pass |
| 2 | Name conflict detection — existing name routes to "Edit as [name] instead" | Pass |
| 3 | Return visitor PIN verify flow — correct PIN → session restored | Pass |
| 4 | Wrong PIN — shake animation + "Forgot your PIN?" reveal after failure | Pass |
| 5 | PIN rate limiting lockout — 5 wrong attempts → "Too many attempts" message | Pass |
| 6 | Session survives hard page reload | Pass |
| 7 | Magic link request flow — email input → "Check your email" toast | Pass |
| 8 | Magic link error pages — expired/used/invalid all render correctly | Pass |
| 9 | Magic link delivery + consumption — email received, link clicked, session restored; re-click shows "already used" | Pass (fixed: from-address switched to `onboarding@resend.dev`, commit `2bc975c`) |

---

### Commits Verified

All commits documented in SUMMARYs exist in git history:

| Commit  | Plan | Description                                                                            |
|---------|------|----------------------------------------------------------------------------------------|
| f083238 | 02-01 | chore: install @node-rs/argon2, resend, react-email, motion; add shadcn components    |
| 6be1190 | 02-01 | feat: build argon2, auth, magic-tokens, rate-limiters, email template, relations       |
| 33fca4f | 02-02 | feat: check-name, join, verify-pin Route Handlers                                      |
| ed33162 | 02-02 | feat: magic-link/request and magic-link/consume Route Handlers                         |
| 3bc31f5 | 02-03 | feat: JoinFlow orchestrator and NameSheet                                              |
| 720e6d9 | 02-03 | feat: PinSheet and MagicLinkSheet                                                      |
| 8455420 | 02-04 | feat: wire JoinFlow into event page and add Sonner to root layout                      |
| cd99e7e | 02-04 | feat: magic link error page at /e/[id]/magic                                           |
| 8448470 | 02-05 | fix: split new-vs-returning flows into two distinct buttons                            |
| 960988a | 02-05 | fix: inline "Edit as [name] instead" button on name conflict                           |
| 2bc975c | post  | fix(magic-link): use onboarding@resend.dev as sender until timely.app domain verified |

---

## Summary

Phase 2 goal is achieved. Every artifact exists, is substantive (not a stub), and is wired to the components that depend on it. The participant identity flow is end-to-end: name entry → PIN setup/verify → session cookie → event page reads session → personalized CTA.

All 11 phase requirements (IDEN-01 through IDEN-09, SECR-01, SECR-02) have supporting implementation evidence and were confirmed passing in a 9-test human UAT session. Security properties verified by code inspection: no plaintext PINs in any code path, email addresses purged in both branches of magic link consumption, rate limiting applied before compute-intensive work (Argon2id hash), and token hash stored in DB while raw token sent only in email.

The one post-UAT fix (Resend from-address → `onboarding@resend.dev`) was committed in `2bc975c` and confirmed working in UAT Test 9.

---

_Verified: 2026-02-20T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
