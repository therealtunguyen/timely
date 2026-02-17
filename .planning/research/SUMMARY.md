# Research Summary: Timely

**Project:** Timely — mobile-first group availability scheduler
**Domain:** No-account web scheduling tool (When2meet replacement)
**Researched:** 2026-02-17
**Confidence:** HIGH

---

## 1. Stack Decision

**Final stack:** Next.js 15 (App Router) + Neon Postgres + Drizzle ORM + Vercel + Resend + Tailwind v4 + shadcn/ui

The two researchers agreed on nearly everything except ORM. TECHNOLOGY.md recommends **Drizzle**; ARCHITECTURE.md recommends **Prisma**. Winner: **Drizzle**.

Reason: Drizzle is Edge-compatible, has no separate query engine binary, and has first-class Neon HTTP driver support. ARCHITECTURE.md's Prisma argument rests on "cold-start performance isn't a concern" — true, but Drizzle also wins on bundle size, SQL proximity, and the Neon integration being officially documented end-to-end. The readable-schema argument for Prisma doesn't apply when the team is TypeScript-fluent. Drizzle wins.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15, App Router | Server Components + Server Actions; Vercel-native |
| Database | Neon (serverless Postgres) | Scale-to-zero, free tier, Postgres ecosystem |
| ORM | Drizzle | Edge-compatible, lightweight, Neon first-class support |
| Hosting | Vercel Hobby | Native Next.js, sufficient for launch |
| Email | Resend | React Email templates, 3k/mo free, Next.js SDK |
| Styling | Tailwind v4 | CSS-first config, 5x faster builds |
| Components | shadcn/ui + Radix | Code-owned, Tailwind-native, correct ARIA out of box |
| State | Zustand (grid only) | Grid drag state only; everything else is React built-in |
| Validation | Zod | Schema validation on both server and client |
| Dates | date-fns + date-fns-tz | Tree-shakeable; tz arithmetic on server |

One additional library not in the template: **`vaul`** for mobile bottom-sheet drawers (from the shadcn author — purpose-built for this pattern).

---

## 2. Critical Architecture Decisions

These are hard or expensive to change after data exists. Decide once, commit early.

**1. UTC storage for all slots.** Every `slot_start` is a UTC timestamptz. Timezone is a display concern only. Violating this is silent data corruption. Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to detect, IANA strings (never abbreviations) to store the viewer's zone.

**2. Row-per-slot availability model.** Each marked slot is one DB row `(event_id, participant_id, slot_start)`. Not a bitmask, not JSONB blob. This enables simple heatmap aggregation via `GROUP BY slot_start` and makes partial updates trivial. At max scale (30 participants, 720 slots) this is 21,600 rows — trivial for Postgres.

**3. Opaque DB-backed session tokens, not JWTs.** After PIN verification, issue a random 32-byte token stored in the database, sent as an `httpOnly` `SameSite=Lax` cookie. JWTs cannot be revoked (critical when a magic link supersedes a session). Session lasts 7 days or until event expiry.

**4. nanoid(10) for event IDs.** Short (fits in SMS), URL-safe, ~73 bits of entropy. The public event URL (`/e/[nanoid]`) is the access mechanism — never sequential integers (guessable) or full UUIDs (ugly).

**5. Route Handlers for auth, Server Actions for mutations.** PIN verification, magic link generation/consumption use Route Handlers — they need standard HTTP status codes (401, 429) and are rate-limitable at the edge. Availability saves and event creation can use Server Actions. ARCHITECTURE.md recommended Route Handlers for everything; TECHNOLOGY.md leaned Server Actions — the split-by-concern is the right call.

---

## 3. Key Risks

Ordered by severity. The first two must be implemented before launch, not added later.

**1. PIN brute force (CRITICAL).** 10,000 possible PINs = brute-forceable in seconds with no protection. Mitigation: Argon2id hashing (slows offline attacks) + Upstash Redis rate limiting on verify endpoint (5 failed attempts per 15-min window per event+name). Both layers required. Do not launch without rate limiting. Note: QUALITY_CONCERNS.md recommends `memoryCost: 65536` (64MB); ARCHITECTURE.md recommends `memoryCost: 19456` (OWASP minimum). Use **65536** — the higher cost is the OWASP 2025 recommendation and the performance hit is acceptable at this scale.

**2. Timezone data corruption (HIGH).** If any code stores a local time without a timezone reference, heatmap overlap calculations silently produce wrong results. Mitigation: schema review before first data write; server-side conversion to UTC before insert; `date-fns-tz` for all server-side timezone math.

**3. Touch interaction failure on mobile (HIGH).** This is Timely's primary UX differentiator. If the drag-to-select grid breaks on iOS Safari, the product fails its core promise. Mitigation: Pointer Events API exclusively, `touch-action: none` on the grid container, `overscroll-behavior: none` to suppress Safari rubber-band scroll. Use ref-based DOM mutation during drag (not React state) to prevent re-render storms.

**4. GDPR exposure (HIGH).** If EU users participate, stored names + emails + availability patterns are personal data. Mitigation: event auto-deletion at 30 days post-last-date, magic link email addresses stored with 30-min TTL only, privacy notice at creation. "No accounts" reduces exposure but doesn't eliminate it.

**5. Magic link token misimplementation (HIGH).** Tokens that are reusable or long-lived become a persistent backdoor that bypasses PIN entirely. Mitigation: 30-min expiry (not 24 hours — QUALITY_CONCERNS.md is more conservative and correct for a low-stakes app), single-use enforced by `used_at` timestamp, stored as SHA-256 hash (raw token sent in email only).

---

## 4. Design Foundation

**Aesthetic:** Warm minimal. Linear's spatial discipline + a warmer palette. Not playful, not corporate. Calm and capable.

**Background:** `#FAF8F5` (warm off-white). Never pure `#FFFFFF` as the page background — this single decision eliminates the clinical feel.

**Brand color:** `#E8823A` (warm orange). Used for CTAs, selected grid cells, active states.

**Heatmap scale** (accessible — no red-green):
```
0 people:  #FAF7F4  →  1: #FDE8C8  →  2: #FBCA7A  →  3: #F5A623  →  4: #C47A1E  →  peak: #7C4A0E
```

**Typography:** Inter (all body/UI). Optional: Instrument Serif or Lora italic for the event name display — one serif moment adds character. Font weights: 400, 500, 600 only.

**Grid cells:** Minimum 44x44px touch target (Apple HIG). 30-minute slot granularity for MVP (not 15-min — cells too small for reliable touch). Allow horizontal scroll on the grid rather than squishing columns.

**Key component: `vaul` bottom sheet** for creator confirm-time flow on mobile. Slides up from bottom, drag-to-dismiss, thumb-reachable CTAs.

---

## 5. Open Questions

These are unresolved and need decisions during phase planning.

| Question | Options | Recommendation |
|----------|---------|----------------|
| Magic link TTL | 15 min vs 30 min vs 24 hr | 30 min; revisit if user complaints |
| Heatmap: server-side or client-side count computation | Server (SQL GROUP BY) vs client (JS reduce) | Server-side; simpler, no data leakage risk |
| Date range max length | 14 days vs 30 days | 14 days for v1 (grid performance, UX clarity) |
| Creator authentication mechanism | Session cookie only vs creator magic link | Creator magic link stored on creation confirmation page; session cookie as primary |
| OG image generation | Static template vs dynamic per-event | Dynamic via `@vercel/og`; high click-through value when shared in group chats |
| Rate limiting service | Upstash Redis vs in-memory vs Cloudflare | Upstash Redis (serverless-compatible, has Next.js SDK, free tier sufficient) |
| Timezone picker | Auto-detect only vs dropdown correction | Auto-detect + allow user correction (dropdown); don't trust detect silently |

---

## 6. Consensus vs Conflicts

**Researchers agreed on:**
- Next.js 15 App Router
- Neon for Postgres
- Vercel for hosting
- Tailwind v4 + shadcn/ui
- Custom availability grid (no third-party library — all abandoned or broken)
- Pointer Events API for touch drag
- UTC storage for all timestamps
- Row-per-slot availability model
- Argon2id for PIN hashing
- Rate limiting is non-negotiable
- No JWT for sessions or magic links
- nanoid for event IDs

**Researchers disagreed on:**
- **ORM: Prisma (ARCHITECTURE.md) vs Drizzle (TECHNOLOGY.md).** Decision: Drizzle. See Stack Decision above.
- **Argon2id memory cost: 19MB (ARCHITECTURE.md) vs 64MB (QUALITY_CONCERNS.md).** Decision: 64MB. OWASP 2025 recommends 64MB; the architecture doc cited an older minimum.
- **Magic link TTL: 24 hours (ARCHITECTURE.md) vs 30 minutes (QUALITY_CONCERNS.md).** Decision: 30 minutes. Magic links bypass PIN entirely — shorter TTL is the safer default. Users can request a new one.
- **Server Actions vs Route Handlers.** Decision: Split by concern. Route Handlers for all auth flows (PIN verify, magic link). Server Actions for data mutations (availability saves, event creation).
- **Date library: date-fns-tz (ARCHITECTURE.md) vs Luxon (QUALITY_CONCERNS.md).** Decision: date-fns-tz. Already pulling date-fns for grid header generation; adding Luxon for tz math is an unnecessary second date library.

---

## Implications for Roadmap

### Phase 1: Foundation and Event Creation
**Rationale:** Database schema and event creation are the dependency for everything else. Schema decisions (UTC slots, nanoid IDs, Drizzle) are hardest to change later.
**Delivers:** Create-event form, shareable URL, basic event page rendering.
**Must address:** UTC schema from the start, nanoid IDs, event auto-expiry field, rate-limited creation endpoint, OG metadata tags.
**Research flag:** Standard patterns — skip research phase.

### Phase 2: Participant Identity and PIN System
**Rationale:** Name + PIN is the identity model that gates all subsequent features. Must be solid before availability can be saved.
**Delivers:** Name + PIN entry, OTP-style PIN UI, session tokens, magic link request/consume flow, Resend integration.
**Must address:** Argon2id hashing (64MB), Upstash rate limiting on verify endpoint, DB-backed session tokens, 30-min magic link TTL. These are launch-blockers.
**Research flag:** Security patterns are well-documented — but Upstash integration specifics may need a quick implementation check.

### Phase 3: Availability Grid (Mobile-First)
**Rationale:** Core UX surface. Build after identity is stable so saves can be authenticated.
**Delivers:** Drag-to-paint availability grid, touch-native interaction, localStorage autosave for offline resilience, submission to DB.
**Must address:** Pointer Events + `touch-action: none`, ref-based DOM mutation during drag, 44px minimum touch targets, 30-min slot granularity, horizontal scroll with sticky time column.
**Research flag:** Implementation-heavy — no research-phase needed (patterns are documented), but allow extra build time.

### Phase 4: Heatmap and Results View
**Rationale:** Read-only display of aggregated data. Depends on Phase 3 (data must exist).
**Delivers:** Color heatmap overlay, person-highlight mode (tap a name to see their slots), "Best times" callout, creator admin view, confirm-time bottom sheet.
**Must address:** Warm amber heatmap palette (no red-green), accessibility labels on cells, `vaul` bottom sheet for mobile confirm flow.
**Research flag:** Standard patterns — skip research phase.

### Phase 5: Polish and Launch Readiness
**Rationale:** Non-functional requirements that prevent launch: GDPR, abuse prevention, error states, OG images.
**Delivers:** Data retention cron job, IP rate limiting on creation endpoint, honeypot field, dynamic OG images via `@vercel/og`, all empty/error state copy, accessibility audit.
**Must address:** Event auto-deletion schedule, right-to-erasure via creator token, ALTCHA or honeypot.
**Research flag:** GDPR specifics for "no accounts" apps — worth a focused research spike if EU market is explicitly targeted at launch.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Most claims verified against official docs; ORM conflict resolved with clear rationale |
| Architecture | HIGH | Data model and security patterns are well-sourced; heatmap storage tradeoffs MEDIUM |
| UX/Design | HIGH (patterns) / MEDIUM (color specifics) | Competitor analysis solid; exact hex values are design opinions, not facts |
| Security/Quality | HIGH | PIN brute force and GDPR patterns are well-documented; mobile perf specifics MEDIUM |

**Overall: HIGH.** The one genuine gap is GDPR compliance for a "no accounts" app in an EU context — the research covers the framework but not edge cases.

### Gaps to Address

- **GDPR "no accounts" edge cases:** Right-to-erasure with no user identity system needs a concrete policy decision before launch, not just a retention cron job.
- **Argon2id in serverless:** The `argon2` npm package requires native addons. Verify compatibility with Vercel's Node.js runtime before coding the PIN phase. Fallback: `bcryptjs` (pure JS) if native addon fails — lower security but functional.
- **Upstash free tier limits:** Verify current free tier covers expected verification volume before committing to Upstash as the rate limiting solution.

---

*Research completed: 2026-02-17*
*Ready for roadmap: yes*
