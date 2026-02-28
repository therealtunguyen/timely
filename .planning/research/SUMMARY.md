# Project Research Summary

**Project:** Timely — v1.1 Notifications & Calendar Export
**Domain:** Email notifications + calendar export additions to an existing no-account group scheduling app
**Researched:** 2026-02-28
**Confidence:** HIGH

---

## Executive Summary

Timely v1.1 closes the scheduling loop by notifying participants when a time is confirmed and giving them one-click calendar export. The research is additive: the existing v1.0 stack (Next.js App Router, Neon/Drizzle, Resend + React Email, Zustand, shadcn/ui) handles all v1.1 requirements with exactly one new dependency (`ical-generator` v10). The recommended approach is to wire two email triggers (all-responded to creator, confirmed-time to participants), add a `.ics` Route Handler, compute a Google Calendar URL inline, and collect email addresses at event creation and participant join — all as opt-in fields that never block the no-account core flow.

The primary risk is not technical: Resend restricts unverified accounts to the owner's own email address. All participant notifications will silently fail in production until the custom domain is verified at resend.com/domains. This is a hard prerequisite that must be completed before writing any notification code. The second risk is a race condition on the "all responded" trigger under concurrent serverless requests — prevented with a one-column DB migration (`allRespondedAt timestamp`) used as a Postgres compare-and-swap lock. Both risks have clear, low-cost mitigations; neither requires architectural rethinking.

The implementation is well-scoped. No auth changes, no new UI paradigms, no new infrastructure beyond one npm package. The entire milestone can be structured as three sequential phases: (1) Resend domain verification as an ops prerequisite, (2) schema migration + email collection + notification triggers, and (3) calendar export UI. The build order within phases is dictated by the dependency graph: schema before API, API before UI.

---

## Key Findings

### Recommended Stack

The v1.0 stack requires no replacement libraries. The only new dependency is `ical-generator` v10 (ESM-only, actively maintained, 331K weekly downloads) — preferred over the stale `ics` package (abandoned 1+ year, 34 open issues). The existing `resend` ^6.9.2 SDK already provides `resend.batch.send()` for bulk participant notifications (up to 100 per call, one HTTP round-trip). Google Calendar URL construction requires no library — pure string interpolation with `encodeURIComponent` and `URLSearchParams`.

See [STACK.md](.planning/research/STACK.md) for full version compatibility table and integration code samples.

**Core technologies for v1.1:**
- `ical-generator` v10: RFC 5545 iCal file generation — use `import ical from 'ical-generator'` (ESM only); `calendar.toString()` replaces removed `serve()`/`save()` methods
- `resend.batch.send()`: bulk participant email dispatch — one HTTP call for all participants; `attachments` not supported in batch (surface `.ics` as a page download link instead)
- `URLSearchParams`: Google Calendar add-event URL — no external library; undocumented but stable for 10+ years; test with special characters in titles

**Critical constraint:** `ical-generator` v10 dropped `require()` — must use ESM `import`. Do not use CommonJS require or the old `ics` package.

### Expected Features

All six v1.1 features are classified P1 (must-have). There are no P2 items in scope — the research identified a clean MVP boundary with no ambiguity about what to build.

See [FEATURES.md](.planning/research/FEATURES.md) for edge case analysis, email content checklist, and competitor comparison table.

**Must have (table stakes):**
- Optional creator email field on create-event form — gates "all responded" notification
- Optional participant email field on join form — gates confirmed-time notification; never blocks join
- "All responded" email to creator — fires once when all current participants have `submittedAt` set; guarded by `allRespondedAt` idempotency flag
- "Confirmed time" email to participants with email on file — fires on creator confirm action; shows time in participant's timezone
- "Download .ics" button on confirmed event page — Route Handler serving `text/calendar` response
- "Add to Google Calendar" link on confirmed event page — constructed from `confirmedSlot` + event title, no server dependency

**Should have (differentiators within v1.1):**
- Confirmed email shows time in participant's own timezone with UTC offset appended — `date-fns-tz` already available
- `.ics` includes `DESCRIPTION` with event description + back-link URL — free to add per VEVENT spec
- Email subject line includes the confirmed date: "[Event Title] is confirmed for [date]"

**Defer (v1.x or v2+):**
- Resend delivery failure webhooks — add after domain verification, not before
- Outlook.com / Yahoo Calendar links — if user research shows demand; `.ics` covers non-Google users adequately
- Notification preferences / unsubscribe UI — requires new data model; no-account model makes this complex; transactional email note in footer is sufficient for v1.1
- Reminder email to participants who have not responded — adds "notified_at" tracking state; defer
- ICS attachment inside confirmation email — `attachments` unsupported in `resend.batch.send()`; web page download is cleaner anyway

**Anti-features to avoid:**
- Email on every new participant join — spam-prone, deliverability risk
- Automatic calendar invite (`METHOD:REQUEST`) — triggers Outlook auto-add without consent

### Architecture Approach

v1.1 adds 5 new files and modifies 9 existing files. The architecture follows established v1.0 patterns throughout: Route Handlers for file responses (`.ics` needs custom headers), Server Actions for mutations (`confirmTime` already owns the confirmed-state transition), and `db.batch()` for atomic multi-step writes. A new `src/lib/notifications.ts` module centralizes all Resend dispatch to avoid instantiating `new Resend()` in multiple places. Email templates go in `src/emails/` following the existing `magic-link-email.tsx` pattern.

See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full data flow diagrams, build order, and anti-pattern documentation.

**Major components:**
1. `src/lib/schema.ts` (modified) — add `creatorEmail text` and `allRespondedAt timestamp` to `events` table; `participants.email` already exists
2. `src/lib/notifications.ts` (new) — `sendAllRespondedEmail()` and `sendTimeConfirmedEmail()` wrappers; single Resend client instance; both called fire-and-forget
3. `src/emails/all-responded-email.tsx` + `src/emails/time-confirmed-email.tsx` (new) — React Email templates following `magic-link-email.tsx` pattern
4. `src/app/api/events/[id]/calendar.ics/route.ts` (new) — public Route Handler; validates `status='confirmed'`; returns `Content-Type: text/calendar` with `Content-Disposition: attachment`
5. `src/components/calendar-export.tsx` (new) — client component with `.ics` download button and Google Calendar anchor tag
6. `src/app/api/availability/route.ts` (modified) — after `submittedAt` update, run idempotent "all responded" check
7. `src/lib/actions/confirm-time.ts` (modified) — after `db.update`, fetch participants with email and fire `sendTimeConfirmedEmail` batch

**Build order (dependency-driven):**
Schema migration → Email templates → Notification helpers → Email collection backend → "All responded" trigger → Confirmed-time trigger → .ics Route Handler → UI changes → Wire into event page

### Critical Pitfalls

See [PITFALLS.md](.planning/research/PITFALLS.md) for full pitfall documentation including recovery strategies and "looks done but isn't" checklist.

1. **Resend domain restriction blocks all production notifications** — Custom domain must be verified at resend.com/domains before any notification code is written. During development, emails only reach the account owner's address. Change `from:` from `onboarding@resend.dev` to `notifications@[domain]` once DNS propagates.

2. **Race condition on "all responded" trigger** — Two concurrent availability saves can both conclude they are the final submission. Prevention: use `UPDATE events SET all_responded_at = NOW() WHERE id = $1 AND all_responded_at IS NULL RETURNING id`. Only send email if `RETURNING` returns a row. Never use Redis for this flag — Redis TTL eviction can re-enable duplicate sends.

3. **ICS floating time (wrong timezone for every participant)** — `DTSTART:20260315T140000` with no `Z` suffix and no `TZID` parameter creates "floating time" per RFC 5545. Every calendar app interprets it as local time. Fix: always use UTC with `Z` suffix (`DTSTART:20260315T190000Z`). `ical-generator` v10 defaults to UTC output correctly.

4. **Google Calendar URL breaks on special characters** — Unencoded `&` in event title terminates the URL parameter early. Always use `encodeURIComponent()` on every parameter value. The `dates=` parameter requires stripped ISO format (`20260315T190000Z`), not `2026-03-15T19:00:00Z`. Always include both start and end — Google Calendar silently creates an all-day event if end is omitted.

5. **Email retained past useful life (GDPR risk)** — After confirmed-slot notification sends, null-out participant email fields: `UPDATE participants SET email = NULL WHERE id = $1`. Never retain PII beyond its notification purpose.

---

## Implications for Roadmap

Based on combined research, the v1.1 milestone maps cleanly to three phases. The ordering is forced by the Resend domain blocker (Phase 0 prerequisite), the schema/trigger dependency chain (Phase 1), and the independence of calendar export from notification logic (Phase 2).

### Phase 0 (Prerequisite): Resend Domain Verification
**Rationale:** The single hardest constraint on the entire milestone is not code — it's DNS propagation. Resend requires a verified custom domain to send to any address other than the account owner. Starting code before this is done means all integration testing will use fake addresses or will fail silently in staging. Complete this before Phase 1.
**Delivers:** Custom domain verified in Resend dashboard; SPF, DKIM, DMARC DNS records propagated; `from:` address updated to `notifications@[domain]` in all sends; confirmed that a non-owner test email address can receive a message
**Avoids:** Pitfall #1 (Resend domain restriction blocks all production notifications)
**Research flag:** Ops task, not a code task — no phase research needed; follow Resend's domain verification guide

### Phase 1: Schema, Email Collection, and Notification Triggers
**Rationale:** Email collection (creator + participant) is the dependency for both notification triggers. The `allRespondedAt` schema column must exist before the trigger logic can be written. Triggers must be in place and tested before calendar export is worth building (confirmed status must be reachable).
**Delivers:** DB migration with `creatorEmail` and `allRespondedAt` on `events`; optional email inputs on create-event form and participant join form; `sendAllRespondedEmail` fires once when all participants have submitted; `sendTimeConfirmedEmail` fires on creator confirm; fire-and-forget pattern protects core saves from email latency
**Addresses features from FEATURES.md:** All four notification features (creator email field, participant email field, all-responded email, confirmed-time email)
**Avoids:** Pitfall #2 (race condition — use DB timestamp compare-and-swap); Pitfall #5 (email purge after notification sends); UX pitfall (email field must be truly optional at API level, not just visually)
**Research flag:** Standard patterns — all integration points derive from direct codebase inspection (HIGH confidence); no research-phase needed

### Phase 2: Calendar Export
**Rationale:** Calendar export is independent of notification logic — it only depends on `event.status === 'confirmed'` and `event.confirmedSlot` being non-null, both of which exist from v1.0. Can be built in parallel with Phase 1 if desired, but sequential ordering is safer for integration testing.
**Delivers:** `GET /api/events/[id]/calendar.ics` Route Handler serving RFC 5545-compliant `.ics` file; Google Calendar add-event link constructed server-side; `CalendarExport` client component with both buttons; rendered on confirmed event page
**Uses from STACK.md:** `ical-generator` v10 (new dependency); `URLSearchParams` for Google Calendar URL (no dependency)
**Implements:** `.ics` Route Handler (not Server Action — requires custom response headers); `CalendarExport` component passed `confirmedSlot` and `eventTitle` as props from Server Component
**Avoids:** Pitfall #3 (ICS floating time — use UTC Z suffix); Pitfall #4 (Google Calendar URL encoding — test with adversarial event titles)
**Research flag:** Standard patterns for file download Route Handlers — no research-phase needed; verify `ical-generator` v10 ESM import works in Next.js 16 App Router before writing production code

### Phase Ordering Rationale

- Domain verification (Phase 0) must precede all notification code because it is the production blocker, not a QA concern
- Schema migration must precede email collection APIs; email collection APIs must precede trigger logic — the dependency chain is linear and forces the build order in Phase 1
- Calendar export (Phase 2) is independent of notification state; the only shared dependency is `events.confirmedSlot`, which is a v1.0 column
- Fire-and-forget email pattern (confirmed by both ARCHITECTURE.md and PITFALLS.md) ensures notification phases do not degrade core availability-save latency
- Single `notifications.ts` module avoids duplicating Resend client instantiation across the two triggers

### Research Flags

Phases requiring deeper research during planning:
- **Phase 0 (Resend domain verification):** Not a code research question — consult Resend documentation for DNS record requirements specific to the domain registrar being used. Verify DMARC policy (Gmail + Yahoo required it since 2024).

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Schema + notification triggers):** All integration points verified against v1.0 codebase directly. Drizzle ORM patterns, Neon `db.batch()` atomics, Resend SDK usage — all HIGH confidence from direct codebase inspection.
- **Phase 2 (Calendar export):** RFC 5545 is a published standard. `ical-generator` v10 API is well-documented. Google Calendar URL format is community-stable for 10+ years. Route Handler file response pattern is official Next.js documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new dependency (`ical-generator` v10); all others verified in shipped v1.0 codebase. ESM-only import is a confirmed v10 breaking change. |
| Features | HIGH | Table stakes features are industry-standard (Calendly, Doodle, FindTime patterns). Edge cases for "all responded" trigger fully documented. Anti-features clearly reasoned. |
| Architecture | HIGH | All integration points derived from direct inspection of v1.0 source code. Build order forced by dependency graph. Pattern choices (fire-and-forget, DB flag, Route Handler for file) are well-reasoned. |
| Pitfalls | HIGH | Race condition prevention, ICS timezone correctness, and URL encoding issues are well-sourced. Resend domain restriction is a known, documented Resend constraint. |

**Overall confidence: HIGH**

### Gaps to Address

- **`ical-generator` v10 + Next.js 16 App Router ESM compatibility:** v10 is ESM-only. Next.js App Router handles ESM packages correctly but verify the import works in a Route Handler before building out the full `.ics` implementation. The `serverExternalPackages` pattern (already used for `@node-rs/argon2`) may be needed.
- **Google Calendar URL length limit for long event descriptions:** Browsers enforce ~2000 character URL limits. Keep the `details` parameter short (< 500 chars). No published Google Calendar URL length limit exists — test empirically with long descriptions.
- **`Promise.allSettled()` vs `Promise.all()` for participant email batch:** PITFALLS.md recommends `Promise.allSettled()` to prevent one bad email address from silently cancelling all others. ARCHITECTURE.md uses `Promise.all()`. Use `Promise.allSettled()` — a failed email to participant B must not prevent delivery to participant C.
- **Email purge timing for "all responded" creator email:** Research specifies purging participant email after confirmed-slot notification. No guidance on whether to purge creator email. Decision needed: purge `creatorEmail` after all-responded notification sends, or retain for future milestone features (e.g., reminder emails). Recommend: retain until event expires (simpler) unless GDPR scope includes EU users at launch.

---

## Sources

### Primary (HIGH confidence)
- `ical-generator` GitHub (sebbo2002) — v10.0.0 release notes, ESM import, `toString()` API, removed methods
- Resend Batch Emails blog post — `resend.batch.send()` method, 100 email limit, `attachments` not supported in batch
- RFC 5545 iCalendar specification (IETF) — VEVENT required fields, DTSTART UTC Z suffix, floating time definition
- Next.js Route Handler documentation — custom response headers, non-JSON content types
- v1.0 codebase direct inspection — `participants.email` column exists; `events` schema; `db.batch()` pattern; `resend` ^6.9.2 installed
- Resend domain restriction (GitHub issue #454) — confirmed restriction to owner address without domain verification

### Secondary (MEDIUM confidence)
- Google Calendar URL format (Dylan Beattie, community docs) — `dates=` format, `ctz` parameter, `text`/`details` encoding — undocumented feature, stable for 10+ years
- `calendar-link` npm package (v2.11.0) — evaluated as alternative to hand-rolling; recommended in FEATURES.md as optional simplification
- Resend deliverability tips blog — DMARC requirement, click tracking warning, plain-text fallback
- Idempotency patterns for notifications (Jonathan Oliver) — compare-and-swap DB flag pattern
- Transactional email best practices 2025 (Postmark) — confirmed-time email content checklist

### Tertiary (LOW confidence)
- Google Calendar URL length limits — no published specification; browser 2000-char limit applies; test empirically
- GDPR compliance for no-account apps — framework covered; EU-specific edge cases not fully resolved

---

*Research completed: 2026-02-28*
*Ready for roadmap: yes*
