# Roadmap: Timely

**Project:** Mobile-first group availability scheduler
**Core value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.
**Target:** v1.0.0
**Requirements:** 41 total, 41 mapped, 0 orphans

---

## Current Milestone: v1.0.0

## Phases

- [ ] **Phase 1: Foundation and Event Creation** - Project scaffolding, database schema, and the create-event flow that produces a shareable link
- [x] **Phase 2: Participant Identity and PIN System** - Name + PIN identity model with session cookies and magic link fallback
- [ ] **Phase 3: Availability Grid (Mobile-First)** - Drag-to-paint grid with touch-native interaction, timezone handling, and DB persistence
- [ ] **Phase 4: Heatmap and Results View** - Aggregated overlap display, per-person highlighting, and creator confirm-time flow
- [ ] **Phase 5: Polish and Launch Readiness** - Data retention, abuse prevention, error states, OG images, and accessibility audit

---

## Phase Details

### Phase 1: Foundation and Event Creation

**Goal:** A creator can build an event and share a working link that renders a real page.

**Depends on:** None

**Requirements:** EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07, TIME-01, MOBI-01, MOBI-02, MOBI-03

**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Next.js 15 scaffold, Tailwind v4 warm palette, Drizzle schema + Neon wiring
- [ ] 01-02-PLAN.md — Create-event form, POST /api/events Route Handler with rate limiting, confirmation page
- [ ] 01-03-PLAN.md — Public event page (/e/[id]), OG image, skeleton loading state
- [ ] 01-04-PLAN.md — End-to-end verification checkpoint

**Delivers:**
- Next.js 15 project wired to Neon Postgres via Drizzle ORM, deployed to Vercel
- Full database schema: events, participants, availability slots, sessions, magic tokens
- Create-event form (title, description, specific dates OR date range, time window)
- Event stored with nanoid(10) ID; all slot timestamps UTC from the start
- Shareable `/e/[nanoid]` URL generated on creation
- Basic event page rendering title, description, and candidate date list
- Open Graph metadata tags + dynamic OG image via `next/og` for group chat previews
- Rate-limited event creation endpoint (blocks spam at the source)
- Warm minimal aesthetic applied: `#FAF8F5` background, Inter font, mobile-first layout, skeleton loading states

**Done when:**
1. Creator fills out the form, submits, and lands on a confirmation page with a copyable link
2. Opening the link on a phone shows the event name, dates, and a "Mark your availability" CTA — no broken layout, no layout shifts
3. Pasting the event URL into iMessage or WhatsApp renders a preview card with the event title
4. The database schema stores all timestamps as UTC and uses nanoid IDs — no sequential integers, no local times
5. Submitting the creation form 10+ times rapidly returns rate-limit errors before new events are created

---

### Phase 2: Participant Identity and PIN System

**Goal:** A responder can claim a name, set a PIN, and return later to edit — all without creating an account.

**Depends on:** Phase 1 (event page must exist before anyone can join)

**Requirements:** IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-07, IDEN-08, IDEN-09, SECR-01, SECR-02

**Plans:** 5 plans

Plans:
- [ ] 02-01-PLAN.md — Install packages, next.config.ts patch, lib utilities (argon2, auth, magic-tokens, rate-limiters), email template, shadcn components
- [ ] 02-02-PLAN.md — API Route Handlers: claim-name, verify-pin, magic-link/request, magic-link/consume
- [ ] 02-03-PLAN.md — Identity UI components: JoinFlow orchestrator, NameSheet, PinSheet, MagicLinkSheet
- [ ] 02-04-PLAN.md — Wire JoinFlow into event page, add Sonner toasts, magic link error page
- [ ] 02-05-PLAN.md — Human verification checkpoint (7 test scenarios)

**Delivers:**
- Name entry flow with per-event uniqueness check (case-insensitive)
- 4-digit PIN entry UI (OTP-style inputs) hashed with Argon2id at `memoryCost: 65536`
- DB-backed session token issued as `httpOnly SameSite=Lax` cookie after verification; 7-day expiry
- PIN verify Route Handler with Upstash Redis rate limiting (5 failed attempts per 15-min window per event+name)
- Magic link request form: takes email, sends Resend-delivered link, stores SHA-256 hash only
- Magic link consumption Route Handler: validates hash, checks expiry (30 min), marks `used_at`, issues session cookie
- Magic link email addresses purged after token expiry — not persisted
- Return-visit flow: name entry → PIN → session restored → "Edit your availability" CTA

**Done when:**
1. A responder enters a name and PIN on a phone, submits, and is recognized as that participant on a subsequent visit with no account required
2. Entering the wrong PIN 5 times in 15 minutes triggers a lockout message — further attempts are blocked
3. A responder who forgot their PIN can request a magic link, click it within 30 minutes, and regain access — clicking it again after use shows an "expired link" message
4. Two responders attempting the same name on the same event — one gets a conflict error, the other's name is accepted
5. The database contains no plaintext PINs and no email addresses after magic link expiry

---

### Phase 3: Availability Grid (Mobile-First)

**Goal:** A responder can paint their available times on a touch-native grid and save to the database.

**Depends on:** Phase 2 (availability saves must be authenticated via session cookie)

**Requirements:** GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06, GRID-07, GRID-08, TIME-02, TIME-03, TIME-04, MOBI-04

**Delivers:**
- Visual time grid: days as columns, 30-min slots as rows, scroll-based navigation
- Touch drag-to-paint selection using Pointer Events API exclusively; `touch-action: none` on the grid container; ref-based DOM mutation during drag (no React state mid-drag)
- Minimum 44x44px touch targets on all interactive cells (Apple HIG compliance)
- Time column sticky during horizontal scroll so the time label never disappears
- Grid renders correctly for both specific-date events and date-range events
- Timezone: browser auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`; dropdown to manually correct; all slots converted to UTC server-side before insert via `date-fns-tz`
- Grid displays times in the participant's local timezone (stored IANA string, never abbreviation)
- Submission saves availability as one row per selected slot `(event_id, participant_id, slot_start UTC)`
- Return visits load existing selections so editing is additive, not a full reset

**Done when:**
1. A responder on an iPhone can drag across multiple time slots in one gesture and the cells paint without triggering page scroll or rubber-band bounce
2. A responder submits their availability, closes the browser, returns with the same name + PIN, and sees their previously marked slots pre-filled
3. A responder in a non-US timezone sees the grid labeled in their local time; the stored data in the database is UTC
4. The grid handles a 14-day date-range event without layout breakage or performance degradation
5. All interactive grid cells pass a 44px minimum touch target check

---

### Phase 4: Heatmap and Results View

**Goal:** Everyone — creator and responders — can see when the most people are free, and the creator can lock in a time.

**Depends on:** Phase 3 (availability data must exist to aggregate)

**Requirements:** HEAT-01, HEAT-02, HEAT-03, HEAT-04, HEAT-05, HEAT-06

**Delivers:**
- Heatmap overlay on the grid: slot background color driven by participant count, server-computed via `GROUP BY slot_start`
- Warm amber color scale (accessible — no red/green): `#FAF7F4` (0 people) through `#7C4A0E` (peak)
- Accessibility labels on each cell: "3 of 5 people available 10:00–10:30 AM Tuesday"
- Participant response list: shows who has responded vs. who hasn't, with response counts
- Tap-a-name mode: tapping a participant's name highlights only their marked slots on the grid
- Best-time callout: top 1–3 slots with highest overlap count are surfaced prominently
- Creator confirm-time flow: `vaul` bottom sheet on mobile slides up with the selected slot, participant count, and a "Confirm this time" button
- Confirmed state: event page shows the locked time prominently; grid enters read-only mode

**Done when:**
1. Opening the event page with submissions from three participants shows a heatmap — darker cells where more people are free
2. Tapping "Sarah" in the participant list highlights only Sarah's slots without reloading the page
3. The "Best time" section surfaces the slot with the most overlap — visually distinct from the rest of the grid
4. The creator taps a cell, the bottom sheet slides up showing who's free, taps "Confirm" — the event page now displays the confirmed meeting time
5. A colorblind user can distinguish heatmap intensity levels (no red-green reliance; contrast verified)

---

### Phase 5: Polish and Launch Readiness

**Goal:** The app handles real-world abuse, data obligations, edge cases, and unhappy paths — ready for strangers to use.

**Depends on:** Phase 4 (all features complete before hardening)

**Requirements:** SECR-03, SECR-04

**Delivers:**
- Event auto-expiry: cron job or Vercel Scheduled Function deletes events and all associated data 30 days after the last candidate date
- Magic link email addresses purged at token expiry (already in Phase 2 — verified complete here)
- Creator-token-based right to delete event manually (satisfies practical GDPR erasure for "no accounts" apps)
- IP-based rate limiting on event creation endpoint (Upstash Redis, distinct from PIN rate limiting)
- Honeypot field on event creation form to block naive bots
- All empty states written and designed: no-responses-yet view, event-not-found page, expired-event page, link-already-used page, rate-limit error screens
- All error states handled gracefully with copy that tells the user what to do next
- Accessibility audit: keyboard navigation, focus rings, ARIA labels on grid and heatmap cells, screen reader pass on main flows
- Privacy notice surfaced at event creation (minimal, honest, plain language)
- Smoke test pass on: iOS Safari, Chrome Android, desktop Chrome, desktop Firefox

**Done when:**
1. An event created today is gone from the database 30 days after its last candidate date — no manual intervention required
2. A bot-like script submitting the creation form rapidly is blocked by rate limiting before creating more than a handful of events
3. Visiting `/e/[expired-nanoid]` shows a clear "This event has expired" page — not a 500 or blank screen
4. A keyboard-only user can navigate the full create-event flow and the availability grid without a mouse
5. The app passes a manual smoke test on iOS Safari: create event, join as participant, mark availability, view heatmap, confirm time

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Event Creation | 4/4 | Complete | 2026-02-18 |
| 2. Participant Identity and PIN System | 5/5 | Complete | 2026-02-18 |
| 3. Availability Grid (Mobile-First) | 0/? | Not started | - |
| 4. Heatmap and Results View | 0/? | Not started | - |
| 5. Polish and Launch Readiness | 0/? | Not started | - |

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVNT-01 | Phase 1 | Pending |
| EVNT-02 | Phase 1 | Pending |
| EVNT-03 | Phase 1 | Pending |
| EVNT-04 | Phase 1 | Pending |
| EVNT-05 | Phase 1 | Pending |
| EVNT-06 | Phase 1 | Pending |
| EVNT-07 | Phase 1 | Pending |
| IDEN-01 | Phase 2 | Pending |
| IDEN-02 | Phase 2 | Pending |
| IDEN-03 | Phase 2 | Pending |
| IDEN-04 | Phase 2 | Pending |
| IDEN-05 | Phase 2 | Pending |
| IDEN-06 | Phase 2 | Pending |
| IDEN-07 | Phase 2 | Pending |
| IDEN-08 | Phase 2 | Pending |
| IDEN-09 | Phase 2 | Pending |
| GRID-01 | Phase 3 | Pending |
| GRID-02 | Phase 3 | Pending |
| GRID-03 | Phase 3 | Pending |
| GRID-04 | Phase 3 | Pending |
| GRID-05 | Phase 3 | Pending |
| GRID-06 | Phase 3 | Pending |
| GRID-07 | Phase 3 | Pending |
| GRID-08 | Phase 3 | Pending |
| HEAT-01 | Phase 4 | Pending |
| HEAT-02 | Phase 4 | Pending |
| HEAT-03 | Phase 4 | Pending |
| HEAT-04 | Phase 4 | Pending |
| HEAT-05 | Phase 4 | Pending |
| HEAT-06 | Phase 4 | Pending |
| TIME-01 | Phase 1 | Pending |
| TIME-02 | Phase 3 | Pending |
| TIME-03 | Phase 3 | Pending |
| TIME-04 | Phase 3 | Pending |
| MOBI-01 | Phase 1 | Pending |
| MOBI-02 | Phase 1 | Pending |
| MOBI-03 | Phase 1 | Pending |
| MOBI-04 | Phase 3 | Pending |
| SECR-01 | Phase 2 | Pending |
| SECR-02 | Phase 2 | Pending |
| SECR-03 | Phase 5 | Pending |
| SECR-04 | Phase 5 | Pending |

**v1 requirements:** 41 total / 41 mapped / 0 orphans

---

*Roadmap created: 2026-02-17*
*Last updated: 2026-02-18 — Phase 2 planned (5 plans)*
