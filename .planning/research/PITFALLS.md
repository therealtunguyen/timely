# Pitfalls Research

**Domain:** Email notifications and calendar export for a no-account scheduling app (Timely v1.1)
**Researched:** 2026-02-28
**Confidence:** HIGH

This document focuses exclusively on pitfalls that arise when *adding* email notifications and calendar export to an existing system — not general web development mistakes.

---

## Critical Pitfalls

### Pitfall 1: Race Condition on the "All Responded" Trigger

**What goes wrong:**

Two participants submit their availability within milliseconds of each other. Both requests read the current count of `submittedAt IS NOT NULL` participants, both see N-1 submitted out of N total, both conclude "this submission completes the set," and both fire a notification email to the creator. The creator receives duplicate "everyone has responded" emails.

**Why it happens:**

The trigger logic is: "after saving availability, count how many participants have submitted, compare to total participant count, if equal → send email." In a serverless environment each Vercel function invocation is independent. Without a database-level lock or atomic flag, the check-then-act sequence is not safe under concurrent execution. The Neon HTTP driver does not support `db.transaction()` — `db.batch()` is sequential but not isolated against concurrent *requests*.

**Relevant code context:**

The current `POST /api/availability` route already uses `db.batch()` for atomic slot replacement, but the notification trigger will be added *after* the batch completes as a separate query. That separate query is the race surface.

**How to avoid:**

Add a `notifiedAllResponded boolean DEFAULT false` column to the `events` table. Use an `UPDATE events SET notified_all_responded = true WHERE id = $1 AND notified_all_responded = false RETURNING id` query immediately before sending the email. Only send if the `RETURNING` clause returns a row (i.e., the update succeeded, meaning this invocation won the race). This is a compare-and-swap using Postgres UPDATE semantics — the database engine serializes concurrent updates to the same row, making exactly one winner.

**Warning signs:**

- Creator reports receiving 2+ "everyone has responded" emails
- Test with two browser tabs submitting simultaneously; if both trigger the notification, the flag is missing

**Phase to address:** Email collection and "all responded" notification phase (Phase 1 of v1.1)

---

### Pitfall 2: Resend Domain Restriction Blocks All Real-World Notifications

**What goes wrong:**

Notifications are built and tested against `onboarding@resend.dev` (already in use for magic links). Everything passes internal testing. Feature ships. Zero participant notification emails are delivered to real users, because Resend restricts unverified accounts to sending only to the account owner's verified address.

**Why it happens:**

Resend's restriction is: without a verified custom domain, you can only send to your own registered email address. The magic link flow works today only because `atunguye25@gmail.com` is the verified owner address. Any other recipient address silently fails or returns a domain error. The PROJECT.md already notes: "Resend magic link emails only deliver to verified address (atunguye25@gmail.com) until timely.app domain is verified at resend.com/domains."

Notifications are useless if they can only reach the account owner. The feature appears functional in the developer's own testing and then fails for all real users.

**How to avoid:**

Verify the custom domain at `resend.com/domains` *before* building or shipping any notification feature. The DNS records (SPF, DKIM, DMARC) must be added to the domain registrar and propagated. This is a prerequisite step, not a configuration detail. Once the domain is verified, change the `from` address in all email sends from `onboarding@resend.dev` to a custom address (e.g., `notifications@timely.app`). Also ensure DMARC is configured — Gmail and Yahoo have required it since 2024 and Resend's own deliverability tools flag its absence as a critical issue.

**Warning signs:**

- During local development, emails only arrive at the account owner's address
- Resend dashboard shows 0 delivered vs. attempted for other addresses
- Any Resend API error containing `"domain"` or `"not verified"`

**Phase to address:** Domain verification is a prerequisite — address in the very first task of v1.1 before writing any notification code

---

### Pitfall 3: ICS File Uses Local Timestamps Without Timezone Context (Silent Wrong-Time Bug)

**What goes wrong:**

The `.ics` file is generated with `DTSTART:20260315T140000` (no `Z` suffix, no `TZID` parameter). The RFC 5545 specification calls this "floating time" — a time with no timezone context. Every calendar application that imports the file interprets it as the *user's local time*, not the event's intended timezone. A participant in Tokyo opens a file for a meeting confirmed at 2 PM New York time and their calendar shows 2 PM JST — 14 hours wrong.

**Why it happens:**

Generating local timestamps is the path of least resistance when writing ICS from scratch. The UTC conversion step is easy to forget, and floating-time files pass basic validation (they are syntactically correct per RFC 5545). The bug only appears when a participant's timezone differs from the event's timezone — which is the common case for group scheduling.

The app already stores all timestamps in UTC (`confirmedSlot` is a `timestamp with timezone`). The error occurs at generation time, not at storage time.

**How to avoid:**

Two safe options:

1. **UTC with Z suffix (simplest):** Use `DTSTART:20260315T190000Z` (always UTC, always `Z`). Calendar apps render this correctly in the viewer's local time. No VTIMEZONE block needed. Preferred when the event has a fixed point in time.

2. **TZID with VTIMEZONE block (RFC-correct):** Use `DTSTART;TZID=America/New_York:20260315T140000` and include a `VTIMEZONE` block for `America/New_York`. Requires a VTIMEZONE generator library (`@touch4it/ical-timezones` or `timezones-ical-library`). Use this when displaying the time in the event's canonical timezone matters more than simplicity.

For Timely, option 1 (UTC with Z suffix) is the correct default — it's unambiguous, always correct, and doesn't require a VTIMEZONE database. Use `ical-generator` (npm) which defaults to UTC output and handles the `Z` suffix correctly when no timezone is specified.

**Warning signs:**

- ICS files with `DTSTART:` that does not end in `Z` and has no `TZID=` parameter
- Calendar import shows wrong time when tested from a timezone different from the event creator's
- Participants in different countries report different event times after importing

**Phase to address:** Calendar export phase — verify UTC Z-suffix output before shipping `.ics` download

---

### Pitfall 4: Google Calendar URL Breaks on Special Characters in Event Title or Description

**What goes wrong:**

An event titled "Dev sync: Q1 planning & roadmap (Tyler's)" generates a Google Calendar URL where the `text=` parameter contains `:`  `&` and `'` characters. An unencoded `&` terminates the parameter early. The resulting Google Calendar pre-fill either shows a truncated title, a garbled description, or silently drops fields. Users click "Add to Google Calendar" and see the wrong event data.

**Why it happens:**

The Google Calendar add-event URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...`) is an undocumented feature with no official SDK. Developers construct it by string interpolation rather than using `encodeURIComponent()` on each value. The `&` separator in the URL query string means any unescaped `&` in a parameter value corrupts the entire URL.

The `dates` parameter has its own format: `YYYYMMDDTHHmmSSZ/YYYYMMDDTHHmmSSZ`. Passing an ISO 8601 string (`2026-03-15T19:00:00Z`) directly does not work — the hyphens and colons must be stripped. The confirmed slot UTC timestamp from the database must be reformatted, not just passed through.

**How to avoid:**

Always use `encodeURIComponent()` on every parameter value. Never use template literals with raw field values for URL construction. For the dates parameter, strip hyphens and colons from the ISO string (`new Date(confirmedSlot).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'`). Compute the end time (confirmedSlot + event duration) and include both start and end — Google Calendar requires both or the link fails. Use the `ctz` parameter set to the event's IANA timezone string so the calendar renders the time in the event's timezone.

**Warning signs:**

- Google Calendar link drops to a blank pre-fill form (title missing)
- Event shows the wrong date/time after opening the link
- Description is truncated at a `&` or `:` character

**Phase to address:** Calendar export phase — test with event titles containing `&`, `'`, `:`, `(`, `)`, and non-ASCII characters before shipping

---

### Pitfall 5: "All Responded" Fires Then New Participants Join — Stale Notification State

**What goes wrong:**

The event has 5 participants. All 5 submit. The notification fires: "Everyone has responded — pick a time!" The creator sees the email and notes 5 responses. Meanwhile, a 6th participant joins (the event is still open), submits their availability, and no further notification is sent. The creator picks a time based on 5 responses, missing participant 6. Alternatively, participant 6 joins but hasn't submitted yet and no notification fires for the partial new state.

**Why it happens:**

The "all responded" trigger is evaluated against the participant count at the moment of submission. It fires once. There is no mechanism to re-evaluate when new participants join or to retract the "complete" state when the participant count changes after the notification sent.

This is a business logic problem, not a technical one, but the implementation choice determines whether it's a pitfall or a feature.

**How to avoid:**

Accept and document the limitation explicitly: the "all responded" notification means "all participants who had joined at that moment have responded." Consider adding clarifying copy to the email: "All 5 participants who have joined so far have submitted their availability." Do not re-notify on every subsequent join-and-submit cycle — this creates notification spam for active events. The correct UX resolution is that the creator can see the heatmap update in real time (on page refresh) regardless of email notifications. The email is a convenience signal, not the source of truth.

If re-notification is desired in a future milestone, implement a 24-hour cooldown: fire at most one "all responded" email per 24-hour window.

**Warning signs:**

- Creator picks a time without checking if new participants have joined
- The "who has responded" list in the notification email is outdated by the time the creator reads it

**Phase to address:** "All responded" notification phase — document the limitation in code comments and in the notification email copy itself

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing participant email without explicit consent checkbox | Simpler form — no extra UI element | GDPR exposure if EU users participate; no audit trail of consent | Never if EU market is a goal |
| Sending notifications synchronously in the Route Handler | No queue infrastructure needed | Resend API timeout (default 5s) causes the availability save to fail if Resend is slow | Acceptable for MVP; move to background if p99 save latency degrades |
| Generating .ics in a Server Component (download link) | Simple; no API route needed | Server memory spike for large descriptions; cannot set `Content-Disposition` header easily | Prefer a Route Handler for file downloads |
| Hardcoding event duration (e.g., 1 hour) in the Google Calendar link | No additional schema changes | Confirmed slot has no duration in the current schema; hardcoded duration misleads for short events | Never — compute or derive from the event's grid hours |
| Skipping the `notified_all_responded` flag and relying on participant count check alone | No migration needed | Duplicate notification emails under concurrent load (serverless race condition) | Never — the flag is a one-column migration |
| Using `onboarding@resend.dev` as the from address for notifications | Works during development | Resend blocks delivery to non-owner addresses; all production notifications silently fail | Development only |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Resend | Using `onboarding@resend.dev` from address in production | Verify custom domain first; use `notifications@timely.app` (or similar) once DNS propagates |
| Resend | No plain-text fallback in React Email templates | All email templates must include both HTML and plain-text versions; Gmail clips HTML > 102KB |
| Resend | Enabling click tracking on notification emails | Disable click tracking — modified link URLs trigger spam filters and break magic links |
| Resend | Creating a new `Resend` client instance per request | Instantiate once at module level or use a singleton; creating per-request wastes cold-start time |
| Google Calendar URL | Passing raw ISO timestamp to `dates=` parameter | Strip hyphens/colons: `20260315T190000Z`, not `2026-03-15T19:00:00Z` |
| Google Calendar URL | Not including both start and end in `dates=` | Google Calendar requires `start/end` format; a start-only link silently creates an all-day event |
| Google Calendar URL | Omitting `ctz` parameter | Without `ctz`, Google Calendar renders in the viewer's local time, which may not match the event timezone |
| ical-generator | Passing timezone-aware timestamps without a VTIMEZONE generator | Either use UTC+Z (no VTIMEZONE needed) or pair with `@touch4it/ical-timezones` to generate a valid VTIMEZONE block |
| ical-generator | Generating ICS inside a Server Component | ICS must be served as a file download with `Content-Type: text/calendar` and `Content-Disposition: attachment`; use a Route Handler |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous Resend API call inside availability save Route Handler | Availability save latency spikes when Resend is slow; user sees slow "Saving..." spinner | Wrap in try-catch; if Resend fails, log and continue — don't fail the save | At any scale if Resend has an outage |
| Querying all participants to count "all submitted" on every availability save | N+1 query pattern; slow for large events | Single `SELECT COUNT(*)` query with WHERE clause; already O(1) for the target 4-10 participant scale | Not a problem at Timely's scale; keep simple |
| Sending confirmation emails to all participants synchronously in one Route Handler | Creator confirm triggers N simultaneous Resend API calls; Vercel function timeout | Cap at 10 participants per event (already the target scale); fire-and-forget with `Promise.allSettled()` — never `Promise.all()` | If event size grows beyond 20 participants |
| Generating ICS file on every page load (Server Component fetch) | Repeated computation for the same confirmed slot | Generate once in a Route Handler; the confirmed slot is immutable after confirmation | Not an issue at target scale; avoid premature optimization |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing participant email in plaintext with no purge policy | GDPR violation; email exposed if DB is compromised | Purge email after notification is sent (confirmed slot notification) or at event expiry; never retain longer than needed |
| Accepting the email address at join time without rate-limiting the join endpoint | Allows enumeration of valid email addresses via the join form | Apply existing participant join rate limiting; do not return different error messages for "email already used" vs. "name taken" |
| Using the email address as a verification factor (e.g., "does this email match the one on file?") | Emails are not secrets — anyone who knows a participant's email could impersonate them | Never use email alone as auth; email is a notification address only, not a credential |
| Including raw personal data (names, emails) in Resend webhook payloads or logs | Data leak via third-party log aggregator | Log event IDs and participant IDs only; never log email addresses |
| Letting participants opt in to "email me when the time is confirmed" but not honoring unsubscribe | CAN-SPAM / GDPR violation | Transactional notifications for a specific event the participant joined do not require unsubscribe under CAN-SPAM, but best practice is to include a note: "You received this because you joined [event]." Include a "don't notify me" option if volume grows. |
| Email stored on `participants` table has no expiry/purge after confirmed slot notification sends | Retaining PII beyond its useful life | After sending confirmed-slot notification, null-out the email field immediately: `UPDATE participants SET email = NULL WHERE id = $1` |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Making email required at join | Kills the "no account needed" value prop; drop-off increases | Email is strictly optional with clear "optional" label; never gate submission on email |
| Not explaining why email is collected at join | Users suspicious of email field on a no-signup app | Inline helper text: "Optional — we'll notify you when a time is confirmed." No mention of marketing. |
| Sending "all responded" notification before the participant has actually saved (optimistic trigger) | Notification arrives before the creator can see the data | Only trigger after the DB write succeeds, never before |
| .ics download with filename `calendar.ics` | Unhelpful filename in user's Downloads folder | Use event title in filename: `${slugify(eventTitle)}.ics`; sanitize for filesystem safety |
| Google Calendar link opens to a blank form because the URL was too long | User confused; loses context | Keep `details` parameter short (< 500 chars); Google Calendar has no published URL length limit but browsers enforce ~2000 chars |
| Showing "Add to Google Calendar" and "Download .ics" as equally prominent options | Users on iOS use Apple Calendar (not Google); users on Android use Google Calendar | Show both; label clearly; consider device detection to reorder |
| Notification email contains only "A time has been confirmed" with no date | User must click through to the app to see the time | Include the confirmed date and time (in the event's timezone) and the participant's own timezone conversion directly in the email body |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Email notifications:** Verify that the Resend `from` address uses the verified custom domain — not `onboarding@resend.dev` — before testing with any non-owner email address.
- [ ] **"All responded" trigger:** Verify the `notified_all_responded` flag (or equivalent) exists in the schema and is checked atomically before every send.
- [ ] **ICS download:** Open the generated `.ics` file in three separate apps (Apple Calendar, Google Calendar import, Outlook) to verify the time appears correctly in each.
- [ ] **ICS download:** Verify `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="..."` headers are set on the Route Handler response.
- [ ] **Google Calendar link:** Test with an event title containing `&`, `'`, `:`, and emoji. Verify the Google Calendar pre-fill shows the correct, untruncated title.
- [ ] **Google Calendar link:** Verify the `dates=` parameter uses the stripped format (`20260315T190000Z`) not the ISO format (`2026-03-15T19:00:00Z`).
- [ ] **Email optional field:** Verify the join flow submits successfully with no email provided — the field must be truly optional at the API level, not just visually.
- [ ] **Email purge:** After confirmed-slot notification sends, verify participant email fields are nulled out in the database.
- [ ] **Late joiner:** Confirm that a participant who joins after the "all responded" email has fired can still submit availability and their data appears in the heatmap (the notification is informational only, not a gate).
- [ ] **Notification email:** Verify the confirmed time appears in the email in the event's timezone (not UTC) with the timezone label explicitly shown.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate "all responded" emails sent | LOW | Add `notified_all_responded` flag retroactively via migration; no user data affected |
| Notifications going to wrong address (owner only) due to unverified domain | MEDIUM | Verify domain, update `from` address in code, re-send to users who missed their notification manually if feasible |
| ICS files with floating time (wrong timezone for participants) | LOW | Fix the ICS generation logic; regenerate link on the confirmed event page; no DB changes needed |
| Google Calendar links broken for special character titles | LOW | Fix URL encoding; no data or schema changes needed |
| Email addresses stored past their useful life | MEDIUM | Run a one-time cleanup query to null email fields on closed/confirmed events; add automated purge to the existing cron job |
| "All responded" notification sent before event was actually complete (off-by-one) | LOW | Notification is informational; no functional breakage; fix the count query and deploy |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Race condition on "all responded" trigger | Phase 1: Email collection + "all responded" notification | Test with two concurrent submissions; verify creator receives exactly one email |
| Resend domain restriction | Prerequisite task before any notification code | Resend dashboard shows custom domain as "Verified"; test notification reaches a non-owner address |
| ICS floating time / wrong timezone | Phase 2: Calendar export | Import generated .ics in Apple Calendar and Google Calendar from a different timezone machine; verify time is correct |
| Google Calendar URL encoding | Phase 2: Calendar export | Test with adversarial event titles; verify Google Calendar pre-fill shows correct data |
| Late joiner after "all responded" fires | Phase 1: Email collection + "all responded" notification | Document in email copy; manually test: fire trigger, add new participant, verify heatmap still updates |
| Email stored past purge deadline | Phase 1: Email collection + "all responded" notification | After confirmed-slot notification send, query DB and verify email column is NULL |
| Click tracking on notification emails | Phase 1: First notification implementation | Resend dashboard send configuration; verify tracking disabled in client instantiation |
| No plain-text email version | Phase 1: First notification implementation | Inspect raw email source; verify `text/plain` part exists alongside `text/html` |

---

## Sources

- Resend deliverability documentation: https://resend.com/docs/dashboard/emails/deliverability-insights
- Resend top 10 deliverability tips: https://resend.com/blog/top-10-email-deliverability-tips
- RFC 5545 iCalendar specification: https://datatracker.ietf.org/doc/html/rfc5545
- RFC 5545 VTIMEZONE component: https://icalendar.org/iCalendar-RFC-5545/3-6-5-time-zone-component.html
- ical-generator npm library (GitHub): https://github.com/sebbo2002/ical-generator
- timezones-ical-library: https://github.com/add2cal/timezones-ical-library
- @touch4it/ical-timezones: https://github.com/touch4it/ical-timezones
- Google Calendar add-event URL parameters (community documentation): https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md
- Google Calendar URL guide (Dylan Beattie): https://dylanbeattie.net/2021/01/12/adding-events-to-google-calendar-via-a-link.html
- Idempotency patterns for notifications: https://blog.jonathanoliver.com/idempotency-patterns/
- Race condition prevention strategies: https://www.aha.io/engineering/articles/off-to-the-races-3-ways-to-avoid-race-conditions
- Resend domain restriction (GitHub issue): https://github.com/resend/resend-node/issues/454
- GDPR email compliance 2025: https://gdpr.eu/email-encryption/
- Outlook ICS timezone bug (Microsoft Q&A): https://learn.microsoft.com/en-us/answers/questions/813150/outlook-desktop-not-reading-standards-compliant-ic
- Neon serverless driver transaction support: https://neon.com/docs/serverless/serverless-driver
- Timely PROJECT.md (known Resend domain limitation): project-local context
- Timely schema.ts (participants.email field, confirmedSlot): project-local context
- Timely `src/app/api/availability/route.ts` (db.batch() pattern, concurrency surface): project-local context

---

*Pitfalls research for: Timely v1.1 — email notifications and calendar export*
*Researched: 2026-02-28*
