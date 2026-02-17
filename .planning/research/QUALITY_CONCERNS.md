# Quality & Concerns: Timely

**Domain:** Anonymous event scheduling web app (accountless, PIN-based identity)
**Researched:** 2026-02-17
**Overall confidence:** HIGH (security/auth patterns), MEDIUM (mobile perf specifics), HIGH (privacy/GDPR framework)

---

## Table of Contents

1. [Security: PIN Brute Force & Storage](#1-security-pin-brute-force--storage)
2. [Privacy & GDPR](#2-privacy--gdpr)
3. [Timezone & DST Edge Cases](#3-timezone--dst-edge-cases)
4. [Concurrency: Simultaneous Submissions](#4-concurrency-simultaneous-submissions)
5. [Event Lifecycle & Data Cleanup](#5-event-lifecycle--data-cleanup)
6. [Mobile Performance: Availability Grids](#6-mobile-performance-availability-grids)
7. [Link Sharing: URL Design & Open Graph](#7-link-sharing-url-design--open-graph)
8. [Abuse Prevention: Spam & Inappropriate Content](#8-abuse-prevention-spam--inappropriate-content)
9. [Browser Compatibility & Touch Events](#9-browser-compatibility--touch-events)
10. [Offline Handling](#10-offline-handling)
11. [Phase-Specific Warning Matrix](#11-phase-specific-warning-matrix)
12. [Sources](#12-sources)

---

## 1. Security: PIN Brute Force & Storage

**Severity: CRITICAL**

### The Core Problem

A 4-digit PIN has exactly 10,000 possible values. Without protection, an attacker can enumerate all values programmatically in seconds. The identity model (name + PIN) is the only barrier to impersonating a responder and overwriting their availability. This is the highest-severity security concern in the entire application.

### PIN Storage

**Do not store PINs in plaintext.** A 4-digit PIN is so low-entropy that no hashing algorithm makes it safe against offline dictionary attacks — all 10,000 values can be hashed and compared in milliseconds. The protection must be rate limiting on the verification endpoint, not algorithmic strength.

Recommended approach:
- Hash PINs with **Argon2id** (preferred over bcrypt in 2025) using `argon2` npm package
- Use a per-event salt stored alongside the hash (standard with Argon2id)
- Argon2id parameters: `memoryCost: 65536` (64MB), `timeCost: 3`, `parallelism: 1` — these slow each verification attempt to ~100-300ms which is acceptable for legitimate use and costly for brute force
- The critical insight: hashing protects the database dump scenario, rate limiting protects the live API scenario. Both are required.

### Brute Force Protection

Implement at the API route level before PIN verification logic runs:

**Strategy: Per-event, per-name lockout with sliding window**

```
Key: ratelimit:verify:{eventId}:{normalizedName}
Limit: 5 failed attempts
Window: 15 minutes
Lockout: Block for 30 minutes after limit exceeded
```

Using **Upstash Redis** + `@upstash/ratelimit` is the recommended implementation for Next.js App Router — it works in Edge runtime, serverless functions, and supports sliding window algorithm. Free tier is sufficient for this scale.

Additional layers:
- Return `429 Too Many Requests` with `Retry-After` header on rate limit hit
- Do NOT distinguish "wrong PIN" from "name not found" in error messages (timing and message oracle attacks)
- Consider a global per-IP rate limit on the verify endpoint (e.g., 20 attempts/5 minutes across all events) as a secondary defense
- Log failed attempts (without the PIN itself) for monitoring

### Magic Link Fallback Security

The magic link (email) fallback bypasses PIN verification entirely — this is by design, but requires:
- Short-lived tokens (15-30 minutes expiry)
- Single-use tokens (delete or invalidate on first use)
- Tokens stored as hashed values in DB (SHA-256 is sufficient since tokens are random, not low-entropy)
- Rate limit email sending per event to prevent email flooding (e.g., 3 magic links per email per hour)

---

## 2. Privacy & GDPR

**Severity: HIGH** (legal exposure if EU users are expected)

### What Timely Stores

| Data Item | Classification | Notes |
|-----------|---------------|-------|
| Event title | Potentially personal | Could contain personal info ("Alice and Bob's meeting") |
| Responder name | Personal data (GDPR Art. 4) | Self-provided, not verified |
| PIN hash | Pseudonymous personal data | Low risk but is derived from user input |
| Availability selections | Behavioral data, linked to name | Timestamp of submission |
| Email address (magic link) | Personal data (GDPR Art. 4) | Only collected if user requests magic link |
| IP address (logs) | Personal data if retained | Standard web logs |

### GDPR Position

**Is Timely subject to GDPR?** If any EU residents use the app, yes. Even a US-hosted app serving EU users falls under GDPR scope.

**Key principle: Data minimization.** Only collect what is necessary.

Recommendations:
- Do NOT collect IP addresses beyond what infrastructure logs automatically (do not store them in the application database)
- Email addresses for magic links: store only the hash (SHA-256) for verification; send the actual email but don't store it permanently — or store with a clear TTL matching the magic link expiry (30 minutes, then purge)
- Add a simple privacy notice at event creation: "Availability data is stored temporarily and deleted after [X days]"
- Event creators should be informed of data processing at creation time

### Data Retention Policy

Recommended automatic cleanup schedule:

| Trigger | Action | Rationale |
|---------|--------|-----------|
| Event is 30 days past last candidate date | Delete all event data | Meetings don't keep being relevant |
| Event is 90 days old with no responses | Delete | Stale, abandoned events |
| Event is 180 days old regardless | Delete | Hard outer limit |
| Magic link token | Delete immediately after use OR at 30-min TTL | Minimize email exposure |

Implement this as a scheduled job (cron via Vercel Cron Jobs or a simple database query at startup). A nightly cleanup job is sufficient.

### Right to Erasure

Since there are no accounts, implementing formal GDPR deletion requests is complex. Mitigations:
- Allow the event creator (via event management link) to delete an entire event and all response data
- Allow individual responders (with PIN verification) to delete only their own availability entry
- Document retention policy prominently so users understand data is time-limited

---

## 3. Timezone & DST Edge Cases

**Severity: HIGH** (silent data corruption risk)

### The Core Problem

Timely stores time slots that represent "I'm free at 2pm." If Alice is in New York and Bob is in London, "2pm" means completely different UTC times. If the system conflates local times without timezone context, the heatmap shows false overlap.

### Recommended Storage Model

**Store everything as UTC instants + user's IANA timezone at capture time.**

Schema approach:
```
availability_slot:
  utc_start: timestamptz  -- the exact UTC moment
  utc_end: timestamptz    -- the exact UTC moment
  local_tz: text          -- e.g., "America/New_York" (IANA identifier)
```

Do NOT use timezone abbreviations (PST, EST, CET) — they are ambiguous and do not capture DST correctly. Use IANA identifiers exclusively.

**At display time:** Convert all UTC instants to each viewer's local timezone for display. The heatmap should show UTC overlap reinterpreted per viewer.

### DST Transition Edge Cases

**Spring forward (clocks skip):** If a time slot at 2:00 AM local is created in a spring-forward zone, that wall clock time does not exist. Mitigation: Use a timezone-aware library (Luxon or `Intl.DateTimeFormat`) to validate slots on creation. Reject or warn on ambiguous/non-existent times.

**Fall back (clocks repeat):** 1:30 AM local occurs twice. If a user marks availability at "1:30 AM," which one? Mitigation: Always store UTC — the JavaScript `Date` object and browser APIs handle this correctly if you capture `Date.now()` at selection time rather than reconstructing from wall-clock text.

**Future DST rule changes:** Governments occasionally change DST rules. Stored UTC timestamps are safe; stored local times become incorrect. This is another reason to store UTC.

### Practical Implementation Advice

- Detect user timezone at page load with `Intl.DateTimeFormat().resolvedOptions().timeZone` — this is reliable across modern browsers
- Show the detected timezone to the user and allow correction (a simple dropdown is sufficient, do not attempt geolocation)
- When a creator sets date ranges, store the "intent" as a timezone-naive date (`2026-03-15`) plus the creator's timezone, then generate UTC slots from that combination
- Use **Luxon** (preferred over Moment.js which is deprecated, and over date-fns-tz which has a more limited API) for all timezone arithmetic on the server

---

## 4. Concurrency: Simultaneous Submissions

**Severity: MEDIUM**

### The Problem

For an event with 8 responders, it's plausible that 3-4 people fill out availability simultaneously after the creator shares the link. Two concurrent writes to the same responder's availability could cause data corruption.

### Risk Analysis for Timely's Model

The identity model (name + PIN) provides natural partitioning: each responder's data is keyed by `(eventId, responderName)`. As long as the same person doesn't submit from two devices simultaneously, concurrent writes from different responders don't conflict.

**Actual risk:** A user submitting from two browser tabs (unlikely but possible).

**Not a risk:** Two different responders submitting at the same time — they write to different rows.

### Recommended Approach

Use **upsert semantics** for availability submissions:

```sql
INSERT INTO availability (event_id, responder_id, slot_id, available)
VALUES (...)
ON CONFLICT (event_id, responder_id, slot_id)
DO UPDATE SET available = EXCLUDED.available, updated_at = NOW();
```

This is naturally idempotent. The last write wins, which is correct behavior for a single user submitting their availability. No optimistic locking needed.

For the PIN verification + availability update flow, wrap in a transaction:
1. Verify PIN (read)
2. Write availability update
3. Commit

PostgreSQL's MVCC ensures this is safe without explicit locking for this use case.

**No WebSocket / real-time sync is needed for v1.** The project correctly deferred this. A page refresh to see updated heatmap is acceptable.

---

## 5. Event Lifecycle & Data Cleanup

**Severity: MEDIUM**

### Event States

Define explicit event states to prevent confusion:

| State | Description | UI Behavior |
|-------|-------------|-------------|
| `collecting` | Event active, accepting responses | Show availability grid |
| `decided` | Creator picked a time | Show the chosen time prominently |
| `expired` | Past retention window | Show "this event has expired" page (not 404) |
| `deleted` | Creator or admin deleted it | Return 410 Gone |

### Creator Access

The creator needs a way to manage their event (view responses, pick a time, delete). Options:
- **Creator magic link** embedded in the original creation confirmation page — treat as a session token stored in a cookie for that browser session, plus email link for return access
- Store a `creator_token` (random, hashed) with the event row
- Do NOT use the event ID alone for creator access — the event ID is public (it's in the share URL)

### Orphaned Events

Events can be orphaned if:
- Creator shares a link but nobody responds
- Creator loses their management link
- The event dates pass without anyone deciding

These should be cleaned up by the retention policy described in Section 2. No manual intervention needed.

### Storage Growth Estimates

Rough calculation for planning:
- Event row: ~500 bytes
- Responder row: ~200 bytes
- Availability rows: (responders) × (time slots) × ~100 bytes each
- A 7-person event with 14 date options × 16 time slots = 1,568 availability rows ≈ 157KB per event
- 10,000 active events ≈ 1.5GB

This is manageable with standard Postgres hosting. The scheduled cleanup job keeps growth bounded. No specialized storage solution needed for v1.

---

## 6. Mobile Performance: Availability Grids

**Severity: HIGH** (core UX, primary surface of the app)

### The Problem

An availability grid for a 2-week range with hourly slots is potentially `14 days × 16 hours = 224 cells`. On mobile, this is a large interactive surface that must handle touch drag-to-select (the primary UX gesture). Low-end Android devices (2-3GB RAM, slower single-core performance) are real targets for this audience.

### Cell Count Scenarios

| Scenario | Days | Time Slots/Day | Total Cells |
|----------|------|----------------|-------------|
| Small (specific dates, narrow window) | 5 | 8 | 40 |
| Typical | 7 | 12 | 84 |
| Large (date range, full day) | 14 | 16 | 224 |
| Stress (max range) | 30 | 24 | 720 |

Up to ~224 cells: render all cells, no virtualization needed. Beyond that, consider limiting the UI rather than virtualizing (cap date ranges at 14 days for v1).

### Rendering Approach

- Implement the grid as a CSS Grid layout, not an HTML `<table>` — CSS Grid is universally supported (96%+ globally) and performs better for interactive touch surfaces
- Each cell should be a `<div>` with `touch-action: none` to prevent scroll interference during drag selection
- Use `pointer events` rather than `touch events` — the Pointer Events API unifies mouse, touch, and stylus, is supported in all modern browsers including iOS Safari 13.4+, and avoids the complexity of the Touch Events API
- For drag-to-select: capture `pointerdown` on the grid container, track `pointermove`, apply selection state, release on `pointerup` or `pointercancel`

### Performance Recommendations

- Do NOT use React state for individual cell hover/selection during drag — this causes hundreds of re-renders per drag gesture. Use a ref-based approach where you mutate DOM class names directly during the drag, then commit to React state on `pointerup`
- Avoid `box-shadow` on cells (GPU compositing overhead on low-end devices) — use `background-color` changes only
- Use `will-change: background-color` sparingly and only during active drag interaction, removing it after
- The entire grid should be a single scrollable container if it overflows — use `overflow-x: auto` on a wrapper, not `overflow: hidden` + manual scroll logic

### Touch Target Sizing

- Minimum touch target: 44×44 CSS pixels (Apple HIG) / 48×48 dp (Material Design)
- For a 224-cell grid on a 375px wide screen, this is tight. Cells will be approximately `(375 / 14) ≈ 27px` wide — below minimum tap target
- Solution: Allow horizontal scroll (cells at comfortable size ~48px wide) rather than squishing cells to fit
- Alternatively, limit grid columns and use a weekly view (scroll between weeks)

---

## 7. Link Sharing: URL Design & Open Graph

**Severity: MEDIUM**

### URL Structure

Event URLs should be:
- Short enough to share in group chats without wrapping
- Opaque enough that they can't be guessed (security by obscurity as a secondary layer)
- Human-readable enough that people recognize it as the right link

Recommended format: `timely.app/e/[nanoid-8-char]`

Nanoid with 8 characters (default alphabet, ~64 chars) gives `64^8 ≈ 281 trillion` possibilities — effectively unguessable. URL is ≈ 30 characters total. Fits cleanly in SMS, WhatsApp, Signal.

Avoid: sequential integers (`/event/1234`), UUIDs (too long for casual sharing), anything that leaks creation order.

### Open Graph Tags

Next.js App Router supports dynamic OG metadata via `generateMetadata()` — server-rendered, which is required because Facebook/WhatsApp crawlers do not execute JavaScript.

Recommended tags per event page:
```
og:title: "Join [Event Name] - Timely"
og:description: "Mark your availability for [Creator]'s event. [N] people have responded."
og:image: Dynamic OG image (Next.js ImageResponse via /api/og)
og:type: "website"
twitter:card: "summary"
```

**Dynamic OG image** is high-value: generate a branded card with event name and response count using `@vercel/og` (built on Satori). This dramatically improves click-through when shared in iMessage, WhatsApp, Slack.

Keep OG image generation fast (<500ms) — cache generated images by event ID using Vercel's Edge Cache. Use `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.

### Deep Linking Considerations

- The share URL should land directly on the availability form, not a splash page
- Pre-fill the event context (title, dates, who has responded) so the responder understands immediately what they're being asked to do
- Store event ID in URL, not in a cookie — links must be shareable across devices

---

## 8. Abuse Prevention: Spam & Inappropriate Content

**Severity: MEDIUM** (low probability, manageable impact)

### Event Creation Spam

Without any friction, a bot can create thousands of events. Storage fills, legitimate users see degraded performance.

**Recommended mitigations (in order of implementation priority):**

1. **IP-based rate limit on event creation:** 5 events per IP per hour, 20 per day. Using Upstash Redis sliding window. Cover both IPv4 and IPv6 (treat /64 as a unit for IPv6).

2. **Event count display:** Show "X events created today" nowhere publicly — don't give signal to spammers about success.

3. **ALTCHA or hCaptcha** on the event creation form as a last resort if abuse occurs. ALTCHA is privacy-respecting (proof-of-work, no tracking) and has a free tier. Avoid reCAPTCHA (Google tracking, poor UX, GDPR concerns).

4. **Honeypot field** in the creation form — a hidden input that bots fill but humans don't. Zero UX cost, catches naive bots.

### Inappropriate Event Names/Descriptions

This is a small-group scheduling app. Abuse here is low-probability (events require a link to access, they're not publicly listed). Content moderation infrastructure is not warranted for v1.

Mitigations proportionate to risk:
- Character limits: event name ≤ 100 characters, description ≤ 500 characters
- Basic server-side validation to prevent XSS (sanitize all text input on output, not on input — use a library like `DOMPurify` for any HTML rendering or just render as text via React's default escaping)
- Abuse report mechanism: a simple "Report this event" link that emails the operator — sufficient for v1

### Responder Name Squatting

Within an event, a bad actor could claim a specific name (e.g., "Alice") before Alice can, then Alice gets a "name already taken" error. The PIN model mitigates this: if the name is taken, the attacker needs to know the real Alice's PIN to overwrite her data, but they can't — their name claim is locked to their PIN.

This is acceptable behavior. Document it clearly: "Names are first-come, first-served within an event."

---

## 9. Browser Compatibility & Touch Events

**Severity: MEDIUM**

### Baseline Support Targets

Target: **browsers from the last 3 years** for full support. Graceful degradation for older.

| Browser | Version | Notes |
|---------|---------|-------|
| iOS Safari | 15+ | Pointer Events supported since iOS 13. CSS Grid fully supported. |
| Chrome (Android) | 90+ | Full support for all features. |
| Firefox (Android) | 120+ | Background Sync not supported — implement fallback. |
| Samsung Internet | 14+ | Full support. |
| Chrome (desktop) | 90+ | Primary development target. |
| Safari (desktop) | 15+ | CSS `gap` in Grid supported since Safari 12. |

### Pointer Events vs. Touch Events

**Use Pointer Events exclusively.** The Touch Events API has been mostly superseded.

- Pointer Events are supported in iOS Safari 13.4+, all Chromium browsers, Firefox 59+
- iOS Safari had a long-standing bug where `pointermove` didn't fire during touch drags — this was fixed in iOS 13. If you need to support iOS 12 (very rare), add a Touch Events fallback
- The `touch-action` CSS property works with Pointer Events to control scroll behavior during drag interactions

### CSS Feature Usage

All proposed CSS features are safe for the target baseline:
- CSS Grid: 97%+ global support, no polyfill needed
- CSS Custom Properties: 97%+ global support
- `gap` in flexbox: 93%+ — check if using in flexbox specifically; safe in Grid
- `backdrop-filter` (for frosted glass effects if desired): ~90% — use with `@supports` check

### Known Safari Quirks

- Safari does not support `scrollbar-gutter` — design scrollable areas to account for this
- Safari's scroll bounce (rubber-band) can interfere with drag-to-select on the grid. Apply `overscroll-behavior: none` to the grid container
- iOS Safari adds a `300ms` click delay on elements without `touch-action: manipulation` — apply this to all interactive elements

---

## 10. Offline Handling

**Severity: LOW** (v1 scope — but handle gracefully)

### What Happens When Connectivity Drops

The primary risk: a user fills out the entire availability grid, hits submit, and loses connectivity. Their work is lost. This is a significant frustration for a core user action.

### Recommended v1 Approach

**Not a full PWA with service workers** — that's overkill for v1 and has significant implementation complexity (Background Sync not supported in Firefox/Safari, per 2025 research).

Instead:
1. **Detect offline state** with `navigator.onLine` and the `offline`/`online` events
2. **Save form state to `localStorage`** continuously as the user makes selections (debounced to every 2 seconds)
3. **On submit, if offline:** show a persistent banner "You're offline. Your selections are saved. We'll submit when you reconnect." Then automatically submit when `online` event fires
4. **On page load:** check `localStorage` for unsaved state for this event, restore if found — handles the "closed the tab by accident" case too

This is ~50 lines of code and covers the primary pain point without service worker complexity.

### What to Not Implement in v1

- Background Sync (limited browser support, complex setup)
- IndexedDB for offline storage (overkill, `localStorage` is sufficient for this data shape)
- Conflict resolution (if another device submitted in the meantime) — last-write-wins is fine

---

## 11. Phase-Specific Warning Matrix

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| PIN verification endpoint | No rate limiting → brute force | CRITICAL | Implement Upstash Redis rate limit before launch |
| PIN storage | Plaintext or weak hashing | CRITICAL | Argon2id from day 1 |
| Timezone handling | Storing local times without IANA zone | HIGH | Design schema with UTC + IANA zone before writing first row |
| Availability grid (mobile) | Cell size too small for touch, re-render storms | HIGH | Pointer Events + ref-based selection from the start |
| Event URLs | Sequential/guessable IDs | HIGH | Use nanoid at event creation |
| Magic link tokens | Long-lived or reusable tokens | HIGH | 30-min TTL, single-use, stored as hash |
| Data retention | No cleanup → storage growth, GDPR risk | MEDIUM | Implement cron job in same phase as event creation |
| Open Graph images | Missing → poor share UX | MEDIUM | Add OG tags in first deployment, dynamic image later |
| Event creation spam | No limits → storage exhaustion | MEDIUM | IP rate limit in same phase as creation endpoint |
| Offline submission | Lost work on connectivity drop | LOW | localStorage autosave, implement in availability phase |
| DST transitions | Edge case in time slot generation | MEDIUM | Test with Luxon, use UTC storage |
| Safari scroll interference | Rubber-band scroll breaks drag | MEDIUM | `overscroll-behavior: none` on grid |

---

## 12. Sources

**Security & Rate Limiting:**
- [Rate Limiting Next.js API Routes using Upstash Redis](https://upstash.com/blog/nextjs-ratelimiting)
- [Argon2 vs bcrypt vs. scrypt: which hashing algorithm is right for you?](https://stytch.com/blog/argon2-vs-bcrypt-vs-scrypt/)
- [Rate Limiting Strategies: HackerOne](https://www.hackerone.com/blog/rate-limiting-strategies-protecting-your-api-ddos-and-brute-force-attacks)
- [Cloudflare Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)

**Privacy & GDPR:**
- [GDPR Compliance for Apps: A 2025 Guide](https://gdprlocal.com/gdpr-compliance-for-apps/)
- [GDPR Anonymous Analytics](https://hoop.dev/blog/gdpr-anonymous-analytics-precise-insights-without-python/)

**Timezone:**
- [Time, Timezones, and Timestamps — the least boring, most dangerous part of your stack](https://www.caduh.com/blog/time-timezones-and-timestamps)
- [Best practices for timestamps and time zones in databases](https://www.tinybird.co/blog/database-timestamps-timezones)
- [Storing times for human events](https://lobste.rs/s/shckuc/storing_times_for_human_events)

**Concurrency:**
- [PostgreSQL Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
- [Optimistic Locking in PostgreSQL](https://reintech.io/blog/implementing-optimistic-locking-postgresql)

**Mobile Performance:**
- [React Table Libraries: Mobile-First Performance Guide](https://www.reactlibraries.com/blog/react-table-libraries-mobile-first-performance-guide)
- [Touch events | Can I use](https://caniuse.com/touch)

**Open Graph / Link Sharing:**
- [Dynamic OG Images in Next.js](https://www.f22labs.com/blogs/boost-site-engagement-with-dynamic-open-graph-images-in-next-js/)
- [Getting Started: Metadata and OG images | Next.js](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

**Abuse Prevention:**
- [ALTCHA - Next-Gen Captcha and Spam Protection](https://altcha.org/)
- [Google Search Central: Prevent User-Generated Spam](https://developers.google.com/search/docs/monitor-debug/prevent-abuse)

**Offline:**
- [Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)
- [Advanced PWA Playbook: Offline, Push & Background Sync](https://rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/)
