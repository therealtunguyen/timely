# State: Timely

*Project memory. Updated at the end of every session.*

---

## Project Reference

**Core value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

**Current focus:** Phase 2 — Participant Identity and PIN System

**Stack:** Next.js 16 (App Router) + Neon Postgres + Drizzle ORM + Vercel + Resend + Tailwind v4 + shadcn/ui + Zustand (grid only) + Upstash Redis (rate limiting)

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.0.0 |
| Phase | 2 — Participant Identity and PIN System |
| Plan | None started |
| Status | Not started |
| Blocking issues | None |

**Progress:**
```
[██████████░░░░░░░░░░] 25%
Phase 1 [x]  Phase 2 [ ]  Phase 3 [ ]  Phase 4 [ ]  Phase 5 [ ]
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases complete | 1 / 5 |
| Plans complete | 4 / ~16 |
| Requirements shipped | 11 / 41 (EVNT-01–07, TIME-01, MOBI-01, MOBI-02, MOBI-03) |
| Sessions logged | 5 |

### Execution History

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-foundation-and-event-creation P01 | 7 min | 2 | 20 |
| 01-foundation-and-event-creation P02 | 2 min | 2 | 9 |
| 01-foundation-and-event-creation P03 | 3 min | 2 | 4 |
| 01-foundation-and-event-creation P04 | 0 min | 1 | 0 |

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

### Open Questions

| Question | Options | Status |
|----------|---------|--------|
| Argon2id native addon on Vercel | `argon2` npm requires native addon — verify Vercel Node.js runtime compatibility; fallback is `bcryptjs` | Unresolved — check Phase 2 |
| Upstash free tier limits | Verify current limits cover expected verification volume before committing | Unresolved — check Phase 2 |
| GDPR right-to-erasure mechanism | Creator token for manual deletion + 30-day auto-expiry — concrete policy needed before launch | Deferred to Phase 5 |

### Todos

- [ ] Verify `argon2` npm package works on Vercel's Node.js runtime before starting Phase 2 PIN implementation
- [ ] Confirm Upstash free tier request limits before starting Phase 2 rate limiting
- [x] Decide on creator authentication mechanism — resolved: Route Handler with IP-based rate limiting, no session on creation

### Known Risks

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| PIN brute force | CRITICAL | Argon2id hashing + Upstash rate limiting (5 attempts/15 min) | Planned for Phase 2 |
| UTC timezone data corruption | HIGH | Schema review before first write; server-side conversion via date-fns-tz | Schema complete — enforced in Plan 01 |
| Touch grid failure on iOS Safari | HIGH | Pointer Events + touch-action:none + ref-based DOM mutation during drag | Planned for Phase 3 |
| GDPR exposure | HIGH | 30-day auto-expiry, email purge after TTL, privacy notice | Planned for Phase 5 |
| Magic link token misimplementation | HIGH | SHA-256 hash only in DB, 30-min TTL, single-use enforced by used_at | Planned for Phase 2 |

---

## Session Log

| Session | Date | Phase | What Happened |
|---------|------|-------|---------------|
| 1 | 2026-02-17 | Setup | Project initialized, requirements defined, research completed, roadmap created |
| 2 | 2026-02-18 | Phase 1 Plan 01 | Scaffolded Next.js 16, Tailwind v4 warm palette, shadcn/ui, Drizzle schema (6 tables), pushed to Neon |
| 3 | 2026-02-18 | Phase 1 Plan 02 | POST /api/events route handler with Upstash rate limiting, Zod validation, CreateEventForm, DatePicker, /e/[id]/confirm page |
| 4 | 2026-02-18 | Phase 1 Plan 03 | Public event page at /e/[id] with generateMetadata, skeleton loading, dynamic OG image (Edge runtime, next/og) |
| 5 | 2026-02-18 | Phase 1 Plan 04 | Human verification checkpoint passed — all 8 steps approved. Phase 1 complete. Advancing to Phase 2. |

---

*State initialized: 2026-02-17*
*Last updated: 2026-02-18 — Completed 01-foundation-and-event-creation/01-04-PLAN.md — Phase 1 complete*
