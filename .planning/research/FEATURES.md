# Feature Research: Email Notifications and Calendar Export

**Domain:** Scheduling / group availability — notifications and calendar export milestone (v1.1)
**Researched:** 2026-02-28
**Confidence:** HIGH (core feature behaviors); MEDIUM (edge case handling conventions)

---

## Context

This research is scoped to the two new feature areas in Timely v1.1:

1. **Email notifications** — "all responded" trigger to creator; "confirmed time" trigger to participants
2. **Calendar export** — .ics file download and Google Calendar link on the confirmed-event page

The existing system (v1.0) already has:
- Resend + React Email for magic link delivery
- Participants table with nullable `email` column and `submittedAt` timestamp
- Events table with `status` (`open`/`closed`/`confirmed`) and `confirmedSlot` (UTC timestamp)
- Event `timezone` (IANA string) and per-participant `timezone` (IANA string)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email notification when creator confirms time | Every scheduling tool (Calendly, Doodle, FindTime) sends a confirmation; participants expect to hear back after submitting | LOW | Single email per confirmed participant; fire-and-forget; already have Resend wired up |
| Confirmed event email includes the exact date/time in participant's timezone | Transactional email best practice 2025: "if you know the recipient's timezone, display time in their zone" | LOW | Participant `timezone` is already stored; use `date-fns-tz` to format |
| Confirmed event email includes event title | Users need to know which event was confirmed | LOW | Already in events table |
| .ics file download on confirmed event page | Standard "save to calendar" UX on every event confirmation page; power users expect it | LOW | Single-event VEVENT; no recurrence needed |
| Google Calendar link on confirmed event page | Dominant calendar platform; one-click add is expected | LOW | Construct URL client-side; no server dependency |
| Email notification to creator when all current participants have responded | Closes the loop so creator knows it's time to pick a time; FindTime / Doodle Pro behavior | MEDIUM | "All responded" trigger has edge cases — see below |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Confirmed email includes direct link back to the confirmed event page | Lets participant immediately add to calendar or see who else is attending | LOW | Just append `${APP_URL}/e/${eventId}` to email body |
| Multiple calendar options presented side by side (Google + .ics) | Mobile users often prefer Google link; desktop users prefer .ics download; offering both removes friction | LOW | Two buttons, no dependencies; `calendar-link` npm package handles both |
| Confirmed email shows time in participant's own timezone with UTC offset appended | "Tuesday March 15 at 3:00 PM ET (UTC-5)" — removes any ambiguity for travel/remote scenarios | LOW | Already have both timezones (event + participant); trivial with `date-fns-tz` |
| .ics includes event description and a back-link URL | If the event has a description, include it; add the Timely event URL as `URL:` field | LOW | Already optional in VEVENT spec; free to include |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Send email every time a new participant submits availability | "Keep the creator in the loop" | Notification spam for events with 8 participants generates 8 emails; creator unsubscribes from Timely domain, harming deliverability for everyone | One email only when ALL current participants have responded; creator can check the event page at any time |
| Automatic calendar invite (METHOD:REQUEST) sent to all participants | Enterprise scheduling norm | Requires ATTENDEE fields with all emails; Outlook auto-adds as tentative without user consent; triggers spam filters; wrong for a tool where participants self-select | Offer passive "add to your calendar" options (link + download) on the confirmed page; let participants opt in |
| Unsubscribe / notification preferences UI | Looks professional | Adds a new data model (preferences), a new route, and GDPR complexity for a tool with no accounts; users already opted in by providing email | Keep it simple: email footer note "you received this because you provided your email to this event"; no management UI needed for v1.1 |
| Send reminder email to participants who have not yet responded | Reduces no-response rate | Requires tracking "notified at" state per participant; creates re-notification loops if new participants join after reminder sent; complex with no-account identity model | Creator can share the event link again manually; out of scope for v1.1 |
| Yahoo Calendar / Outlook.com / Office 365 separate links | More platform coverage | Each additional link adds button clutter; .ics download already works for Outlook desktop and Apple Calendar | Google link + .ics covers 95%+ of users; add others in v2 if requested |

---

## "All Responded" Trigger: Edge Cases and Design Decisions

This is the highest-complexity behavioral decision in v1.1. The trigger must be well-defined to avoid duplicate emails, missed emails, or confusing behavior.

### What "All Responded" Means

Definition: every participant who has **joined** the event (has a row in `participants`) also has a non-null `submittedAt` timestamp (set when they last saved availability via `POST /api/availability`).

SQL check: `SELECT COUNT(*) FROM participants WHERE event_id = $1 AND submitted_at IS NULL` returns 0.

### Edge Cases and Recommended Handling

| Edge Case | What Happens | Recommended Behavior |
|-----------|--------------|---------------------|
| Creator has no email | Creator skipped email field at creation | No notification sent; silently skip — not an error |
| Zero participants have joined | Event has no participants row yet | Do not trigger; avoid divide-by-zero logic |
| Only one participant joins and submits | Count is 1, all have submitted | Trigger fires — correct; small groups are valid |
| New participant joins AFTER the "all responded" email was already sent | Previously: all had submitted. Now: count of unsubmitted increases from 0 to 1 | Do NOT re-trigger on subsequent "all responded" completions; the first fire is sufficient. Track a flag: add `notifiedAllRespondedAt` timestamp column to `events` table. Only fire if `notifiedAllRespondedAt IS NULL`. |
| Participant edits and re-saves availability after the email was sent | `submittedAt` gets updated; still all submitted | No new email; the flag already fired |
| Participant with no email submits (most participants) | Irrelevant for this trigger — the trigger is about submission count, not email presence | Correct; email presence is only relevant for the confirmed-time notification |
| Event is already `confirmed` or `closed` when last person submits | Creator already picked a time | Do not send "all responded" email if `events.status != 'open'` |
| Creator is also a participant | If creator joined as a participant, their submission counts | Standard behavior; no special case needed |

### Implementation Pattern

Fire the "all responded" check **inside** `POST /api/availability` after updating `submittedAt`. This is the only place that changes submission state.

```
POST /api/availability:
  1. Batch-replace availability slots
  2. Update participant.submittedAt
  3. Query: are there any participants with submittedAt IS NULL for this event?
  4. Query: is events.notifiedAllRespondedAt IS NULL and status = 'open'?
  5. If both yes: send email AND set events.notifiedAllRespondedAt = NOW()
     (Do steps 4-5 atomically to avoid double-send on concurrent submits)
```

**Atomicity note:** Neon HTTP driver does not support `db.transaction()` — use `db.batch()` for the "check and set flag" step, or accept the small race window on concurrent final submissions (extremely unlikely in practice at Timely's scale).

---

## Confirmed-Time Email: Content Checklist

Based on transactional email best practices (Postmark, MailerSend, 2025 recommendations).

### Required Content

| Field | Source | Format |
|-------|--------|--------|
| Event title | `events.title` | As-is |
| Confirmed date + time in participant's timezone | `events.confirmedSlot` (UTC) + `participants.timezone` | "Tuesday, March 15, 2026 at 3:00 PM ET" |
| UTC offset or timezone label | derived from `participants.timezone` | "(UTC-5)" or "Eastern Time" appended |
| Link back to the event page | `${APP_URL}/e/${eventId}` | Clickable button |
| Event description (if present) | `events.description` | Include only if non-null |

### Subject Line

"[Event Title] is confirmed for [date]"
Example: "Team sync is confirmed for Tuesday, March 15"

Keep short — mobile clients truncate at ~50 characters.

### Optional but Recommended

- Brief one-line: "You provided your email when joining this event" (implicit unsubscribe transparency)
- No agenda, no "reply to confirm" CTA — this is a notification, not a meeting request

### What Not to Include

- Do not list all other participants by name (privacy concern — participant A can now see participant B's name and email was collected)
- Do not include "add to calendar" as an attachment inside the email — offer it on the web page instead (see .ics delivery below)

---

## .ics File: Required vs Optional Fields

Based on RFC 5545 (iCalendar specification). Source: [icalendar.org](https://icalendar.org/iCalendar-RFC-5545/3-6-1-event-component.html)

### Required VEVENT Fields

| Field | Value | Notes |
|-------|-------|-------|
| `DTSTAMP` | Current timestamp in UTC | `YYYYMMDDTHHmmssZ` format |
| `UID` | Globally unique identifier | Use `${eventId}@timely-cyan-three.vercel.app` |
| `DTSTART` | Confirmed slot start time | UTC: `YYYYMMDDTHHmmssZ`; or local with `TZID=` param |

### Strongly Recommended Fields

| Field | Value | Notes |
|-------|-------|-------|
| `DTEND` | Start + event duration | Timely doesn't track duration; use start + 1 hour as default; alternatively omit and use `DURATION:PT1H` |
| `SUMMARY` | Event title | Maps to "event name" in all calendar apps |

### Optional but High-Value Fields

| Field | Value | Notes |
|-------|-------|-------|
| `DESCRIPTION` | Event description + Timely event URL | Plain text only in standard .ics |
| `URL` | `${APP_URL}/e/${eventId}` | Clickable in most calendar apps |
| `STATUS` | `CONFIRMED` | Signals to calendar apps this is definitive |
| `TRANSP` | `OPAQUE` | Marks time as busy (standard for a confirmed meeting) |

### Fields to Omit for v1.1

| Field | Why Omit |
|-------|----------|
| `ORGANIZER` | Would expose creator email in downloadable file |
| `ATTENDEE` | Same privacy concern; also wrong use case (this is a passive download, not an invite) |
| `METHOD:REQUEST` | Turns it into an invite, not a save-to-calendar; triggers Outlook auto-add behavior |
| `RRULE` | No recurrence in Timely |
| `LOCATION` | Timely doesn't collect location |

### Minimum Valid .ics

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Timely//EN
BEGIN:VEVENT
UID:{eventId}@timely-cyan-three.vercel.app
DTSTAMP:{currentUtc}
DTSTART:{confirmedSlotUtc}
DTEND:{confirmedSlotUtc + 1hr}
SUMMARY:{eventTitle}
DESCRIPTION:{eventDescription}\nEvent page: {APP_URL}/e/{eventId}
URL:{APP_URL}/e/{eventId}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
```

**CRLF note:** RFC 5545 requires `\r\n` line endings. Most calendar apps forgive `\n` only, but be spec-compliant.

---

## Google Calendar Link: Exact Format

Source: [Dylan Beattie's implementation guide](https://dylanbeattie.net/2021/01/12/adding-events-to-google-calendar-via-a-link.html)

### Base URL

```
https://calendar.google.com/calendar/u/0/r/eventedit
```

### Parameters

| Parameter | Value | Format |
|-----------|-------|--------|
| `text` | Event title | URL-encoded |
| `dates` | Start/end times separated by `/` | `YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ` |
| `details` | Event description + back-link | URL-encoded; supports basic HTML |
| `location` | (omit for v1.1 — Timely has no location data) | — |

### Example

```
https://calendar.google.com/calendar/u/0/r/eventedit
  ?text=Team%20sync
  &dates=20260315T150000Z/20260315T160000Z
  &details=Event%20page%3A%20https%3A%2F%2Ftimely-cyan-three.vercel.app%2Fe%2Fabc123
```

### Duration Default

Timely does not collect meeting duration. Default to 1 hour (start + 3600 seconds) for both the .ics DTEND and the Google Calendar end time. This is the industry convention when duration is unknown.

---

## Library Recommendation: `calendar-link`

**Package:** `calendar-link` (npm) — [github.com/AnandChowdhary/calendar-link](https://github.com/AnandChowdhary/calendar-link)
**Version:** v2.11.0 (released June 2025 — actively maintained)
**Stars:** 620

This package generates both the Google Calendar URL and an ICS string from a single event object. Eliminates hand-rolling both the URL construction and RFC 5545 string formatting.

```typescript
import { google, ics } from 'calendar-link'

const event = {
  uid: `${eventId}@timely-cyan-three.vercel.app`,
  title: eventTitle,
  description: `${eventDescription}\n\nEvent page: ${APP_URL}/e/${eventId}`,
  start: confirmedSlot,     // Date object or ISO 8601 string (UTC)
  duration: [1, 'hour'],    // Default 1-hour duration
}

const googleUrl = google(event)   // Full Google Calendar add-event URL
const icsContent = ics(event)     // RFC 5545 compliant .ics string
```

**Confidence:** MEDIUM-HIGH — package is actively maintained and widely used; verify CRLF compliance of its .ics output before shipping (some parsers are strict).

**Alternative:** Hand-roll the .ics string (trivial for a single non-recurring event) if you want zero new dependencies. The Google Calendar URL can also be constructed manually from the format above.

---

## .ics Delivery: Email Attachment vs Web Page Download

Based on industry analysis (AddEvent, Ortto, LetsCal, 2025):

### Recommendation: Web Page Download Only (Not Email Attachment)

| Method | Pros | Cons |
|--------|------|------|
| .ics in email attachment | Outlook auto-adds tentative placeholder | Triggers spam filters; mobile download UX is poor; Apple Mail does not auto-apply |
| .ics download button on web page | Clean UX; works on all platforms; user controls when to add | Requires user to navigate to the page |
| Google Calendar link on web page | One-click; no file download; mobile-friendly | Google-only (but Google is dominant) |

**Decision:** Do not attach .ics to the confirmation email. Instead:
1. Include a link back to the confirmed event page in the email
2. On the confirmed event page, show both a "Download .ics" button and an "Add to Google Calendar" button
3. "Download .ics" serves the file with `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="timely-event.ics"`

This matches Calendly's and Doodle's confirmed-event page pattern.

---

## Feature Dependencies

```
[Creator email field at event creation]
    └──enables──> ["All responded" notification to creator]

[Participant email field at join]
    └──enables──> ["Confirmed time" notification to participants]

[events.confirmedSlot set by creator]
    └──enables──> ["Confirmed time" notification to participants]
    └──enables──> [Calendar export (.ics + Google link)]

[events.notifiedAllRespondedAt column (new)]
    └──prevents──> [Duplicate "all responded" emails]

[participants.submittedAt (existing)]
    └──drives──> ["All responded" trigger logic]
```

### Dependency Notes

- **"All responded" notification requires creator email:** Creator must have provided email at creation. If field is blank, skip silently.
- **"Confirmed time" notification requires participant emails:** Only participants with non-null email receive this. Participants who joined without email simply don't get a notification — no error.
- **Calendar export requires confirmedSlot:** Only render the export UI when `event.status === 'confirmed'` and `event.confirmedSlot` is non-null. This already exists in the schema.
- **`notifiedAllRespondedAt` is a new schema column:** Required to prevent duplicate notifications when the event reaches "all responded" state more than once (due to new joiners). Needs a DB migration.

---

## MVP Definition

### Launch With (v1.1)

Minimum scope to close the scheduling loop and deliver the milestone goal.

- [x] Optional creator email field on create-event form
- [x] Optional participant email field on join form
- [x] "All responded" email to creator — fires once when all current participants have submitted; guarded by `notifiedAllRespondedAt` flag
- [x] "Confirmed time" email to all participants with email on file — fires on creator confirm action; includes time in participant's timezone
- [x] "Download .ics" button on confirmed event page — served as `text/calendar` response from a Route Handler
- [x] "Add to Google Calendar" link on confirmed event page — constructed from `confirmedSlot` + event title

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Resend webhook to track delivery failure — add after Timely's domain is verified at resend.com/domains
- [ ] Outlook.com / Yahoo Calendar links — if user research shows meaningful demand
- [ ] Reminder email to creator N days after event creation if no participants have responded — adds complexity; defer

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] "New participant joined" email to creator — spam-prone; needs notification preferences first
- [ ] Notification preferences / unsubscribe management — requires new data model
- [ ] ICS attachment inside confirmation email — marginal benefit given web-page download; Outlook spam risk

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Participant email field at join | HIGH (enables confirmed-time notify) | LOW (add field to existing join form + schema) | P1 |
| Creator email field at creation | HIGH (enables all-responded notify) | LOW (add field to existing create form + schema) | P1 |
| "Confirmed time" email to participants | HIGH (closes the scheduling loop) | LOW (fire on confirm action; use existing Resend) | P1 |
| "All responded" email to creator | MEDIUM (nice to know; creator can check page) | MEDIUM (trigger logic + idempotency flag + new schema column) | P1 |
| Google Calendar link on confirmed page | HIGH (one-click; most users on Google) | LOW (URL construction; no server needed) | P1 |
| .ics download on confirmed page | MEDIUM (power users / non-Google users) | LOW (generate string server-side; Route Handler) | P1 |
| Outlook / Yahoo calendar links | LOW (niche at Timely's target group size) | LOW (calendar-link package handles it) | P3 |
| ICS in confirmation email as attachment | LOW (better UX via web page download) | MEDIUM (Resend attachment + spam risk) | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Doodle (paid) | Calendly | FindTime (MS) | Timely v1.1 |
|---------|---------------|----------|----------------|-------------|
| Creator "all responded" notification | Yes (paid only) | N/A (1:1 booking) | Yes, per-vote | Once, on completion |
| Participant confirmed-time notification | Yes | Yes | Yes | Yes |
| .ics download on confirmation | Yes | Yes | Yes (Outlook native) | Yes |
| Google Calendar link | Yes | Yes | Via .ics | Yes |
| Notification preferences | Yes | Yes | Outlook settings | No (v1.1) |
| ICS in email | Yes | Yes | Yes | No (web page only) |

Timely's no-account model makes notification preferences impractical at v1.1. The web-page-only calendar export is a deliberate simplification, not a gap.

---

## Sources

- [RFC 5545 VEVENT Component Fields — icalendar.org](https://icalendar.org/iCalendar-RFC-5545/3-6-1-event-component.html)
- [Google Calendar URL Parameters — Dylan Beattie](https://dylanbeattie.net/2021/01/12/adding-events-to-google-calendar-via-a-link.html)
- [calendar-link npm package — GitHub](https://github.com/AnandChowdhary/calendar-link)
- [ICS Files vs Add to Calendar Links — AddEvent](https://www.addevent.com/blog/stop-using-confusing-ics-files-heres-how-to-improve-attendance-rates-with-add-to-calendar-links)
- [Transactional Email Best Practices 2026 — Postmark](https://postmarkapp.com/guides/transactional-email-best-practices)
- [Meeting Confirmation Email Content — WP Amelia](https://wpamelia.com/meeting-confirmation-email-templates/)
- [Microsoft Scheduling Poll (FindTime) Notification Behavior — Microsoft Support](https://support.microsoft.com/en-us/office/scheduling-poll-organizer-dashboard-5c7de584-9472-4ca5-be44-9a5af400a339)
- [Resend Attachments API Documentation](https://resend.com/docs/api-reference/emails/send-email)

---

*Feature research for: Timely v1.1 — Email Notifications and Calendar Export*
*Researched: 2026-02-28*
