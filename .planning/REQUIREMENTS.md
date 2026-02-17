# Requirements: Timely

**Defined:** 2026-02-17
**Core Value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

## v1 Requirements

### Event Creation

- [ ] **EVNT-01**: Creator can create an event with a title and optional description
- [ ] **EVNT-02**: Creator can select specific dates as candidate days
- [ ] **EVNT-03**: Creator can select a date range instead of specific dates
- [ ] **EVNT-04**: Creator can set the time window for each day (e.g., 9am-9pm)
- [ ] **EVNT-05**: Creator receives a shareable link after event creation
- [ ] **EVNT-06**: Event URLs use short nanoid codes (e.g., `/e/v4tXk2mRpq`)
- [ ] **EVNT-07**: Event page renders with Open Graph metadata for link previews in group chats

### Participant Identity

- [ ] **IDEN-01**: Responder enters a unique name (per event) to participate
- [ ] **IDEN-02**: Responder sets a 4-digit PIN when first joining
- [ ] **IDEN-03**: Name uniqueness is enforced per event (case-insensitive)
- [ ] **IDEN-04**: Responder can return and edit availability using name + PIN
- [ ] **IDEN-05**: PIN is hashed with Argon2id before storage
- [ ] **IDEN-06**: PIN verification is rate-limited (5 attempts per 15-min window)
- [ ] **IDEN-07**: Responder can request a magic link (email) if PIN is forgotten
- [ ] **IDEN-08**: Magic links expire after 30 minutes and are single-use
- [ ] **IDEN-09**: Session persists via httpOnly cookie after successful PIN verification

### Availability Grid

- [ ] **GRID-01**: Responder can mark time slots as available on a visual grid
- [ ] **GRID-02**: Grid supports touch drag-to-paint selection on mobile
- [ ] **GRID-03**: Grid uses 30-minute slot granularity
- [ ] **GRID-04**: Touch targets meet minimum 44x44px (Apple HIG)
- [ ] **GRID-05**: Grid works with both specific-dates and date-range events
- [ ] **GRID-06**: Time column is sticky during horizontal scroll
- [ ] **GRID-07**: Availability is saved to the database on submission
- [ ] **GRID-08**: Responder can update their availability on return visits

### Heatmap & Results

- [ ] **HEAT-01**: Aggregated availability displays as a color heatmap
- [ ] **HEAT-02**: Heatmap uses an accessible warm color scale (no red-green)
- [ ] **HEAT-03**: Creator can see which participants have responded
- [ ] **HEAT-04**: Tapping a participant name highlights their specific slots
- [ ] **HEAT-05**: Best overlapping times are visually prominent
- [ ] **HEAT-06**: Creator can confirm/lock a final meeting time

### Timezone Handling

- [ ] **TIME-01**: All availability is stored as UTC in the database
- [ ] **TIME-02**: Participant's timezone is auto-detected via browser
- [ ] **TIME-03**: Participant can manually correct their timezone
- [ ] **TIME-04**: Grid displays times in each participant's local timezone

### Mobile Experience

- [ ] **MOBI-01**: All screens are mobile-first responsive
- [ ] **MOBI-02**: UI uses warm minimal aesthetic (off-white background, soft palette)
- [ ] **MOBI-03**: Loading states use skeleton screens, not spinners
- [ ] **MOBI-04**: All interactive elements are thumb-reachable on mobile

### Security & Privacy

- [ ] **SECR-01**: No personal data stored beyond name, optional email (for magic links), and availability
- [ ] **SECR-02**: Magic link email addresses are not persisted after token expiry
- [ ] **SECR-03**: Events auto-expire 30 days after the last candidate date
- [ ] **SECR-04**: Event creation endpoint is rate-limited to prevent spam

## v2 Requirements

### Notifications

- **NOTF-01**: Creator receives email when all participants have responded
- **NOTF-02**: Participants receive email when a final time is confirmed
- **NOTF-03**: Reminder email for participants who haven't responded

### Calendar Integration

- **CALC-01**: Confirmed time can be exported as .ics file
- **CALC-02**: Google Calendar add link for confirmed time
- **CALC-03**: Optional calendar import to pre-fill availability

### Enhanced Features

- **ENHC-01**: Recurring event scheduling
- **ENHC-02**: "If needed" availability marking (maybe/yes distinction)
- **ENHC-03**: Real-time updates via WebSocket when others submit availability
- **ENHC-04**: Comment thread on event page for coordination

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | Web-first, mobile-responsive covers the use case |
| User accounts / OAuth | Name + PIN identity model is the core design choice |
| Payment / premium tiers | Free for v1, monetization deferred |
| Admin dashboard | No admin needed for a link-sharing tool |
| Real-time collaboration | Page refresh is sufficient for v1 |
| Video/voice integration | Out of domain — this is scheduling, not meeting |
| Multi-language / i18n | English only for v1 |

## Traceability

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

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after initial definition*
