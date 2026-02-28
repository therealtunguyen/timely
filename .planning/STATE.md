# State: Timely

*Project memory. Updated at the end of every session.*

---

## Project Reference

**Core value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

**Current focus:** v1.1 Notifications & Export — Phase 6: Resend Domain Verification

**Milestone:** v1.1 — Notifications & Export (roadmap complete, ready to plan Phase 6)

**Stack:** Next.js 16 (App Router) + Neon Postgres + Drizzle ORM + Vercel + Resend + Tailwind v4 + shadcn/ui + Zustand (grid only) + Upstash Redis (rate limiting)

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 — Notifications & Export |
| Phase | 6 of 8 (Resend Domain Verification) |
| Plan | — |
| Status | Ready to plan Phase 6 |
| Last activity | 2026-02-28 — v1.1 roadmap created (Phases 6-8) |

**v1.0 Progress (complete):**
[██████████] 100% — Phases 1-5 shipped 2026-02-28

**v1.1 Progress:**
[░░░░░░░░░░] 0% — Phase 6 not started

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1.0 phases complete | 5 / 5 |
| v1.0 plans complete | 24 / 24 |
| v1.1 phases complete | 0 / 3 |
| v1.1 plans complete | 0 / TBD |

---

## Accumulated Context

### Key Decisions (v1.1 scope)

| Decision | Rationale |
|----------|-----------|
| INFRA-01 as standalone Phase 6 | Resend domain restriction is a production blocker — not a QA concern. Must be complete before any notification code is written or tested end-to-end. |
| EMAIL + NOTF grouped in Phase 7 | Schema migration, email collection inputs, and both notification triggers form a single dependency chain: schema → API → triggers. Cannot split without partial state. |
| EXPRT-01 + EXPRT-02 in Phase 8 | Calendar export only depends on `event.confirmedSlot` (v1.0 column). Independent of notification logic; sequential ordering chosen for safer integration testing. |
| ical-generator v10 (not ics package) | `ics` package abandoned 1+ year, 34 open issues. `ical-generator` v10 actively maintained, ESM-only import required. |
| DB timestamp flag for "all responded" idempotency | `UPDATE events SET all_responded_at = NOW() WHERE id = $1 AND all_responded_at IS NULL RETURNING id` — only send email if RETURNING returns a row. Redis TTL eviction can re-enable duplicates; never use Redis for this. |
| Fire-and-forget email dispatch | Email latency must not block availability save response. Both triggers called without await after core DB write completes. |

### Blockers / Concerns

- **Phase 6 (INFRA-01):** Resend domain must be verified before Phase 7 work can be end-to-end tested. During Phase 7 development, emails will only reach the account owner address (atunguye25@gmail.com).
- **Phase 7:** `ical-generator` v10 is ESM-only — verify `import ical from 'ical-generator'` works in a Next.js 16 Route Handler before building out the full implementation. May need `serverExternalPackages` entry (precedent: `@node-rs/argon2`).

### Pending Todos

- [ ] Confirm Upstash free tier request limits before starting Phase 2 rate limiting (carried from v1.0)
- [ ] Decide on creator cookie loss recovery strategy (carried from v1.0)

---

## Session Log (v1.1)

| Session | Date | Phase | What Happened |
|---------|------|-------|---------------|
| 23 | 2026-02-28 | Planning | v1.1 milestone started — requirements defined, research completed, roadmap created (Phases 6-8) |

---

*State initialized: 2026-02-17*
*Last updated: 2026-02-28 — v1.1 roadmap created. Ready to plan Phase 6 (Resend Domain Verification).*
