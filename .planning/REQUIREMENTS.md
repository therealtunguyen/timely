# Requirements: Timely

**Defined:** 2026-02-28
**Core Value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

## v1.1 Requirements

Requirements for the Notifications & Export milestone.

### EMAIL — Email Collection

- [ ] **EMAIL-01**: Creator can optionally enter their email when creating an event
- [ ] **EMAIL-02**: Participant can optionally enter their email when joining an event (never blocks join if omitted)

### NOTF — Notifications

- [ ] **NOTF-01**: Creator receives an email when all current participants have submitted their availability (fires once, idempotent)
- [ ] **NOTF-02**: Participants with an email on file receive a confirmation email when the creator confirms a time (time shown in participant's own timezone)
- [ ] **NOTF-03**: Participant email is purged from the database after the confirmed-time notification sends

### EXPRT — Calendar Export

- [ ] **EXPRT-01**: User can download a `.ics` calendar file for a confirmed event (RFC 5545-compliant, UTC timestamps)
- [ ] **EXPRT-02**: User can add a confirmed event to Google Calendar via a one-click link

### INFRA — Infrastructure

- [ ] **INFRA-01**: Resend custom domain is verified so notification emails reach any recipient address

## v1.1 Future Requirements

Features considered but deferred:

### Notifications (future)

- **NOTF-F01**: Reminder email to participants who have not yet responded
- **NOTF-F02**: Notification preferences / unsubscribe UI
- **NOTF-F03**: Resend delivery failure webhooks and retries

### Calendar Export (future)

- **EXPRT-F01**: Outlook.com / Yahoo Calendar add links
- **EXPRT-F02**: `.ics` attachment inside confirmation email

## Out of Scope

| Feature | Reason |
|---------|--------|
| ICS attachment in email | `resend.batch.send()` does not support `attachments`; web page download is cleaner and avoids spam filters |
| Calendar auto-invite (METHOD:REQUEST) | Triggers Outlook auto-add without user consent; anti-feature |
| Email on every new participant join | Spam-prone; defeats the "effortless" core value |
| Notification on every availability edit | Noise; only first submission matters |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 6 | Pending |
| EMAIL-01 | Phase 7 | Pending |
| EMAIL-02 | Phase 7 | Pending |
| NOTF-01 | Phase 7 | Pending |
| NOTF-02 | Phase 7 | Pending |
| NOTF-03 | Phase 7 | Pending |
| EXPRT-01 | Phase 8 | Pending |
| EXPRT-02 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial v1.1 definition*
