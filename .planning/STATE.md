# State: Timely

*Project memory. Updated at the end of every session.*

---

## Project Reference

**Core value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

**Current focus:** v1.1 Notifications & Export

**Milestone:** v1.1 — Notifications & Export (in planning)

**Stack:** Next.js 16 (App Router) + Neon Postgres + Drizzle ORM + Vercel + Resend + Tailwind v4 + shadcn/ui + Zustand (grid only) + Upstash Redis (rate limiting)

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 — Notifications & Export |
| Phase | Not started (defining requirements) |
| Plan | — |
| Status | Defining requirements |
| Last activity | 2026-02-28 — Milestone v1.1 started |

**Progress:**
[██████████] 100%
[██████████] 100%
Phase 1 [x]  Phase 2 [x]  Phase 3 [x]  Phase 4 [x]  Phase 5 [x]
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases complete | 4 / 5 |
| Plans complete | 16 / ~16 |
| Requirements shipped | 50 / 41 (EVNT-01–07, TIME-01–04, MOBI-01–04, IDEN-01–09, SECR-01–03, GRID-01–08, HEAT-01–06) |
| Sessions logged | 18 |
| Phase 04 P03 | 2 | 2 tasks | 3 files |
| Phase 04 P04 | 2 | 2 tasks | 4 files |
| Phase 05 P01 | 2 | 2 tasks | 3 files |
| Phase 05 P05 | 2 | 2 tasks | 7 files |
| Phase 05 P02 | 2 | 2 tasks | 4 files |
| Phase 05-polish-and-launch-readiness P03 | 2 | 2 tasks | 6 files |
| Phase 05-polish-and-launch-readiness P04 | 2 | 2 tasks | 3 files |
| Phase 05-polish-and-launch-readiness P06 | 5 | 2 tasks | 0 files |

### Execution History

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-foundation-and-event-creation P01 | 7 min | 2 | 20 |
| 01-foundation-and-event-creation P02 | 2 min | 2 | 9 |
| 01-foundation-and-event-creation P03 | 3 min | 2 | 4 |
| 01-foundation-and-event-creation P04 | 0 min | 1 | 0 |
| 02-participant-identity-and-pin-system P01 | 3 min | 2 | 12 |
| 02-participant-identity-and-pin-system P02 | 2 min | 2 | 5 |
| 02-participant-identity-and-pin-system P03 | 2 min | 2 | 4 |
| 02-participant-identity-and-pin-system P04 | 2 min | 2 | 3 |
| 03-availability-grid-mobile-first P01 | 2 min | 2 | 4 |
| 03-availability-grid-mobile-first P02 | 2 min | 2 | 4 |
| 03-availability-grid-mobile-first P03 | 8 min | 2 | 3 |
| 03-availability-grid-mobile-first P04 | 15 min | 2 | 2 |
| 04-heatmap-and-results-view P01 | 1 min | 2 | 2 |
| 05-polish-and-launch-readiness P01 | 2 min | 2 | 3 |
| 05-polish-and-launch-readiness P05 | 2 min | 2 | 7 |

---

## Accumulated Context

### Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| ORM: Drizzle (not Prisma) | Edge-compatible, no native binary, first-class Neon support | 2026-02-17 |
| Argon2id memoryCost: 65536 (64MB) | OWASP 2025 recommendation; higher than minimum but justified at this scale | 2026-02-17 |
| Magic link TTL: 30 minutes | Magic links bypass PIN entirely — shorter TTL is the safer default | 2026-02-17 |
| Auth split: Route Handlers for auth, Server Actions for mutations | Auth flows need standard HTTP status codes (401, 429) and edge rate limiting | 2026-02-17 |
| Date library: date-fns + date-fns-tz (not Luxon) | Already pulling date-fns for grid headers; one date library is enough | 2026-02-17 |
| Session model: DB-backed opaque tokens (not JWTs) | JWTs cannot be revoked; magic link must be able to supersede a session | 2026-02-17 |
| Availability storage: row-per-slot | Simple GROUP BY for heatmap; partial updates trivial; 21,600 rows max is fine | 2026-02-17 |
| Grid: custom build (no third-party library) | All existing libraries are abandoned or broken | 2026-02-17 |
| Grid: Pointer Events API exclusively | Unified mouse + touch; `touch-action: none` prevents Safari scroll conflict | 2026-02-17 |
| Heatmap: server-side aggregation via SQL GROUP BY | Simpler; no data leakage risk from sending all slot data to client | 2026-02-17 |
| Date range max: 14 days for v1 | Grid performance and UX clarity; 30-day range is unwieldy on mobile | 2026-02-17 |
| OG image: dynamic via next/og (not @vercel/og) | next/og is the canonical Next.js import; edge-compatible; @vercel/og is legacy | 2026-02-18 |
| Rate limiting service: Upstash Redis | Serverless-compatible, Next.js SDK exists, free tier sufficient for launch | 2026-02-17 |
| Timezone picker: auto-detect + manual correction dropdown | Don't trust silent auto-detect; let users fix wrong detection | 2026-02-17 |
| Manual Next.js scaffold | create-next-app refused capital-letter directory "Timely" — manual tsconfig/next.config/postcss setup used | 2026-02-18 |
| drizzle.config.ts env loading | Loads .env.local explicitly via dotenv config({path:'.env.local'}) — dotenv/config defaults to .env only | 2026-02-18 |
| shadcn @layer base body override | Fixed to use warm palette variables (--color-warm-bg) instead of shadcn's bg-background/text-foreground | 2026-02-18 |
| Route Handler (not Server Action) for event creation | Server Actions do not cleanly expose raw request headers; IP extraction for rate limiting requires NextRequest | 2026-02-18 |
| Date serialization as YYYY-MM-DD via .toISOString().split('T')[0] | Never use toLocaleDateString() — it is locale-dependent and produces incorrect date strings | 2026-02-18 |
| generateMetadata omits images array | Next.js file convention (opengraph-image.tsx) auto-populates og:image; manual images array creates duplicate OG tags | 2026-02-18 |
| Neon HTTP driver is edge-compatible | drizzle-orm/neon-http uses HTTP (not WebSocket/TCP) — safe to use in Edge runtime OG image generation | 2026-02-18 |
| Phase 1 verification checkpoint approved by human | All 8 verification steps passed — create flow, event page, mobile layout, OG image, rate limiting, UTC storage, 404 handling | 2026-02-18 |
| serverExternalPackages for @node-rs/argon2 | Required to prevent Next.js WASM bundling error on native addon | 2026-02-18 |
| Drizzle relations in separate relations.ts | Merged into db singleton; keeps schema.ts focused on table definitions only | 2026-02-18 |
| buildMagicUrl routes to /api/participants/magic-link/consume | Route Handler validates token then redirects — not a UI page | 2026-02-18 |
| check-name always returns 200 (never 409) | Taken name is routing signal for returning user, not an error — UI routes to PIN verify sheet | 2026-02-18 |
| Rate limit before DB/hash work in verify-pin | Argon2id is slow by design; reject rate-limited requests before hash computation begins | 2026-02-18 |
| magic-link/request returns 200 even when participant not found | Prevents enumeration of valid participant names by timing or status code difference | 2026-02-18 |
| InputOTP render prop not available — use InputOTPSlot index props | The installed input-otp version uses OTPInputContext for slot state; no render prop exists | 2026-02-18 |
| Sheet orchestrator pattern for JoinFlow | JoinFlow owns all activeSheet state; child sheets are purely presentational with callback props — single drop-in for event page | 2026-02-18 |
| Magic error page has no notFound() guard | Invalid eventId renders error UI with CTA back to /e/[id]; consume handler validates eventId before redirect | 2026-02-18 |
| JoinFlow placed outside max-w-lg layout wrapper | Vaul drawer portals mount to document.body — placement in server component has no visual impact | 2026-02-18 |
| GET /api/availability returns 200 + empty slots when unauthenticated | Grid loads in empty state without forcing auth; 401 would break the unauthenticated grid view | 2026-02-18 |
| db.batch() (not db.transaction()) for atomic slot replace | neon-http driver uses HTTP transport — no transaction support; batch() is the correct atomic primitive | 2026-02-18 |
| paintSlot explicit mode param ('add' or 'remove') | Drag gesture sets mode from first cell touched — explicit mode is cleaner than toggle for drag-to-paint | 2026-02-18 |
| CSS grid: time labels inlined in grid (not TimeColumn component) | CSS grid requires label cells as siblings of data cells for column alignment — TimeColumn exists as standalone component | 2026-02-18 |
| TimezoneSelector closes on selection | setIsOpen(false) after setTimezone() for clean UX flow | 2026-02-18 |
- [Phase 03]: Derived dirty boolean (not isDirty() closure) to ensure reactive Save button updates in AvailabilityDrawer
- [Phase 03]: saveInProgress ref prevents double-save on vaul onOpenChange double-fire (issue #345)
- [Phase 03 P04]: Lazy-initialize Resend client inside POST handler (not module scope) — prevents build-time throw when RESEND_API_KEY absent
- [Phase 03 P04]: Drawer.Title uses VisuallyHidden.Root from @radix-ui/react-visually-hidden — screen reader accessibility without visible heading
- [Phase 03 P04]: Phase 3 human verification approved — all 6 test scenarios passed (touch drag-to-paint, save/reload, timezone, 14-day grid, 44px targets, auto-save)
- [Phase 04-heatmap-and-results-view]: creatorToken stored as nullable text (no default) — pre-Phase-4 events have NULL; old events cannot use confirm-time UI (acceptable)
- [Phase 04-heatmap-and-results-view]: Cookie name timely_creator_{eventId} (per-event) — prevents cross-event creator impersonation
- [Phase 04-heatmap-and-results-view]: generateId() (nanoid 10-char) reused for creatorToken — consistent ID generation pattern across the codebase
- [Phase 04-02]: participantSlots passed as function arg to intersectionSlots() rather than stored in Zustand — server data stays as props
- [Phase 04-02]: inline style for backgroundColor (not dynamic Tailwind class) — Tailwind v4 scans at build time, cannot generate runtime hex strings
- [Phase 04-02]: sqrt interpolation for perceptual color spread across small participant counts (2-10 people)
- [Phase 04]: Number() coercion on heatmapMap counts — Neon HTTP driver returns count() as string from Postgres
- [Phase 04]: BestTimeCallout always renders — warm empty state when no responses (not hidden)
- [Phase 04]: ParticipantList disables non-responder chips — no slot data to intersect on
- [Phase 04]: HeatmapResultsClient thin client wrapper owns confirmOpen state — keeps event page as pure Server Component
- [Phase 04]: ConfirmTimeSheet mounted at page level (via HeatmapResultsClient) as a sibling — not nested inside AvailabilityDrawer (research pitfall #6)
- [Phase 04]: CTA section hidden when event.status === 'confirmed' — grid is read-only after confirmation
- [Phase 04]: Creator cookie (timely_creator_{id}) is a persistent cookie (37-day maxAge) — survives tab/browser close but NOT incognito sessions, different devices, or manual cookie clears. If lost, creator cannot confirm a time.
- [Phase 05-05]: tabIndex strategy for heatmap: first cell per row gets tabIndex=0 (in tab order), remaining cells get tabIndex=-1 (focusable but not in tab order) — avoids 300+ tab stops for a 14-day grid
- [Phase 05-05]: AvailabilityGrid edit mode gets only role=grid container (no role=row/gridcell on cells) — drag-to-paint canvas semantics do not benefit from full ARIA data grid structure
- [Phase 05-05]: focus-visible: (not focus:) for all interactive rings — shows ring only during keyboard nav, not on mouse click
- [Phase 05-01]: CRON_SECRET fail-closed — undefined env var produces 'Bearer undefined' which never matches a real auth header; cron endpoint returns 401 safely without CRON_SECRET set
- [Phase 05-01]: Vercel Hobby cron schedule 0 3 * * * (once daily 3am UTC) — Hobby plan only allows once-per-day execution
- [Phase 05-01]: CASCADE DELETE on all FK constraints handles full event sweep in one Drizzle query (no batch loops)
- [Phase 05]: Flash cookie uses random UUID suffix to prevent stale toast re-display on page refresh
- [Phase 05]: deleteEvent redirect() at top level outside any try/catch — framework exception must not be swallowed
- [Phase 05]: Flash cookie httpOnly:false — client JS (FlashToast useEffect) must read via document.cookie
- [Phase 05]: Honeypot check runs after rate limit but before Zod validation — bots counted against rate limit, DB/hash work skipped
- [Phase 05]: Privacy page uses GitHub Issues as contact method — appropriate for developer-built no-account tool
- [Phase 05]: Manage page soft no-access (not notFound()) when creator cookie absent — per SECR-03 cookie-loss user decision
- [Phase 05]: Footer: Privacy link only in root layout footer — appropriate for no-account scheduling tool
- [Phase 05]: FlashToast placed before Toaster in root layout — Sonner must be initialized before FlashToast useEffect fires
- [Phase 05]: iOS Safari smoke test deferred to Vercel deploy — project not yet deployed; test requires live URL
- [Phase 05]: SECR-04 confirmed by code inspection (not live test) — local dev lacks Upstash credentials; wiring verified correct

### Open Questions

| Question | Options | Status |
|----------|---------|--------|
| Argon2id native addon on Vercel | `@node-rs/argon2` installed and configured with serverExternalPackages — verify on actual Vercel deploy | Partially resolved — will confirm at deploy |
| Upstash free tier limits | Verify current limits cover expected verification volume before committing | Unresolved — check Phase 2 |
| GDPR right-to-erasure mechanism | Creator token for manual deletion + 30-day auto-expiry — concrete policy needed before launch | Deferred to Phase 5 |
| Creator cookie loss | If creator used incognito, switched device, or cleared cookies, they lose confirm-time access. Options: (A) creator link with token in URL shown on /confirm page, (B) creator code shown at creation, (C) accept limitation. Option A is lowest friction — one Route Handler to re-set cookie from ?creator= query param, one line on confirm page. | Unresolved — decide before Phase 5 |

### Todos

- [x] Verify `argon2` npm package works on Vercel's Node.js runtime before starting Phase 2 PIN implementation (using @node-rs/argon2 with serverExternalPackages)
- [ ] Confirm Upstash free tier request limits before starting Phase 2 rate limiting
- [x] Decide on creator authentication mechanism — resolved: Route Handler with IP-based rate limiting, no session on creation
- [ ] Decide on creator cookie loss recovery strategy before Phase 5 (creator link vs creator code vs accept limitation) — see Open Questions

### Known Risks

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| PIN brute force | CRITICAL | Argon2id hashing + Upstash rate limiting (5 attempts/15 min) | Utilities built in Phase 2 Plan 01 |
| UTC timezone data corruption | HIGH | Schema review before first write; server-side conversion via date-fns-tz | Schema complete — enforced in Plan 01 |
| Touch grid failure on iOS Safari | HIGH | Pointer Events + touch-action:none + ref-based DOM mutation during drag | Implemented in Phase 3 Plan 02 |
| GDPR exposure | HIGH | 30-day auto-expiry, email purge after TTL, privacy notice | Planned for Phase 5 |
| Magic link token misimplementation | HIGH | SHA-256 hash only in DB, 30-min TTL, single-use enforced by used_at | Utilities built in Phase 2 Plan 01 |
| Creator loses confirm access | MEDIUM | Cookie is persistent (37-day) — survives tab close. Lost on incognito/device switch/cookie clear. No recovery path exists today. Mitigate with creator link in Phase 5. | Unresolved — planned for Phase 5 |

---

## Session Log

| Session | Date | Phase | What Happened |
|---------|------|-------|---------------|
| 1 | 2026-02-17 | Setup | Project initialized, requirements defined, research completed, roadmap created |
| 2 | 2026-02-18 | Phase 1 Plan 01 | Scaffolded Next.js 16, Tailwind v4 warm palette, shadcn/ui, Drizzle schema (6 tables), pushed to Neon |
| 3 | 2026-02-18 | Phase 1 Plan 02 | POST /api/events route handler with Upstash rate limiting, Zod validation, CreateEventForm, DatePicker, /e/[id]/confirm page |
| 4 | 2026-02-18 | Phase 1 Plan 03 | Public event page at /e/[id] with generateMetadata, skeleton loading, dynamic OG image (Edge runtime, next/og) |
| 5 | 2026-02-18 | Phase 1 Plan 04 | Human verification checkpoint passed — all 8 steps approved. Phase 1 complete. Advancing to Phase 2. |
| 6 | 2026-02-18 | Phase 2 Plan 01 | Phase 2 infrastructure: @node-rs/argon2, resend, react-email, motion installed; argon2/auth/magic-tokens/rate-limiters/email template built; shadcn drawer/input-otp/sonner added |
| 7 | 2026-02-18 | Phase 2 Plan 02 | Five participant auth Route Handlers: check-name, join, verify-pin, magic-link/request, magic-link/consume — all IDEN and SECR requirements implemented |
| 8 | 2026-02-18 | Phase 2 Plan 03 | Four identity UI client components: JoinFlow orchestrator, NameSheet, PinSheet (shake animation, Forgot PIN reveal), MagicLinkSheet — complete two-sheet onboarding and PIN recovery flow |
| 9 | 2026-02-18 | Phase 2 Plan 04 | Wired JoinFlow into event page (session-aware CTA), added magic link error page at /e/[id]/magic, mounted Sonner Toaster in root layout — Phase 2 integration complete |
| 10 | 2026-02-18 | Phase 2 Plan 05 | Human verification checkpoint — Tests 1–4 and 6 passed; post-checkpoint UX fixes: two-button new-vs-returning CTA, inline "Edit as [name] instead" button. Tests 5 and 7 deferred pending RESEND_API_KEY. Phase 2 complete. |
| 11 | 2026-02-18 | Phase 3 Plan 01 | Installed Zustand v5, created useGridStore with Set-based slot tracking, built GET/POST /api/availability with db.batch() atomic replace — grid data foundation complete |
| 12 | 2026-02-18 | Phase 3 Plan 02 | Built GridCell (44px touch target, data-slot-key), AvailabilityGrid (Pointer Events drag-to-paint, touch-none, data-vaul-no-drag, fromZonedTime), TimezoneSelector (Intl.supportedValuesOf dropdown) — core grid UI interaction layer complete |
| 13 | 2026-02-18 | Phase 3 Plan 03 | Built AvailabilityDrawer (vaul bottom/right drawer, auto-save on close, load-on-open toast, timezone auto-detect) and AvailabilityCTA; wired drawer into event page replacing static href CTA — drawer integration complete |
| 14 | 2026-02-18 | Phase 3 Plan 04 | Human verification checkpoint — all 6 test scenarios passed (touch drag-to-paint, save/reload persistence, timezone display and correction, 14-day grid, 44px touch targets, auto-save on close). Fixed production build (lazy Resend init), VisuallyHidden Drawer.Title accessibility, Sonner toast 3s duration. Phase 3 complete. |
| 15 | 2026-02-18 | Phase 4 Plan 01 | Added nullable creator_token column to events table (drizzle-kit push to Neon), POST /api/events generates creatorToken and sets httpOnly timely_creator_{id} cookie — HEAT-06 creator identity foundation complete. |
| 16 | 2026-02-19 | Phase 4 Plan 03 | Built HeatmapGrid (read-only CSS grid, slotColor() per cell, tap-a-name dim effect, Number() coercion for Neon counts), BestTimeCallout (always-visible, warm empty state, creator confirm affordance), ParticipantList (responded-first sort, tap-a-name toggleName(), disabled chips for non-responders). |
| 17 | 2026-02-19 | Phase 4 Plan 04 | Integration layer: confirmTime Server Action (creator cookie verification, revalidatePath), ConfirmTimeSheet vaul bottom sheet, HeatmapResultsClient thin client wrapper, event page refactored with Promise.all parallel fetch — full heatmap results view shipped end-to-end. |
| 18 | 2026-02-19 | Phase 5 Plan 05 | Accessibility audit: ARIA grid role hierarchy on HeatmapGrid (role=grid/row/rowheader/columnheader/gridcell), keyboard Enter/Space on BestTimeCallout confirm, orange focus-visible rings on all interactive buttons. SECR-03 accessibility requirement complete. |
| 18 | 2026-02-19 | Phase 5 Plan 01 | SECR-03: vercel.json daily cron (0 3 * * * UTC) + GET /api/cron/expire-events route handler with Bearer auth and Drizzle CASCADE DELETE — automatic event expiry complete. |
| 19 | 2026-02-19 | Phase 5 Plan 02 | Creator delete infrastructure: shadcn AlertDialog, deleteEvent Server Action (cookie verification + cascade delete + flash cookie), DeleteEventButton (AlertDialog confirmation dialog), FlashToast (reads timely_flash_toast_* cookies on mount, fires Sonner, clears cookie). |
| 20 | 2026-02-19 | Phase 5 Plan 04 | Creator manage page at /e/[id]/manage (cookie identity gate, delete UI, soft no-access fallback), "Manage event" link on event page (isCreator-gated), root layout footer with /privacy link, FlashToast + Toaster co-mounted in layout — full creator-delete-and-toast flow wired end-to-end. |

---

| 21 | 2026-02-19 | Phase 5 Plan 06 | Final verification: SECR-04 rate limiting confirmed by code inspection; iOS Safari smoke test deferred to Vercel deployment. Phase 5 complete — all five done-when criteria confirmed (four verified in code; smoke test pending deploy). |
| 22 | 2026-02-19 | Deployment | Deployed to Vercel. All env vars set (DATABASE_URL, UPSTASH_REDIS_REST_URL/TOKEN, CRON_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL). Live smoke tests passed: home 200, /privacy 200, /e/fake 200 (not-found UI), cron 401 without auth, cron {"deleted":0} with auth. FlashToast bug fixed (usePathname dependency + remove double-encode). Resend from-address limitation noted — magic links only deliver to atunguye25@gmail.com until domain verified. |

*State initialized: 2026-02-17*
*Last updated: 2026-02-19 — Deployed to https://timely-cyan-three.vercel.app. All env vars set in Vercel. Resend domain verification pending before magic links reach non-owner emails.*
