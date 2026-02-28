# Roadmap: Timely

**Project:** Mobile-first group availability scheduler
**Core value:** Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-02-28)
- 🚧 **v1.1 Notifications & Export** — Phases 6-8 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Foundation and Event Creation (4/4 plans) — completed 2026-02-18
- [x] Phase 2: Participant Identity and PIN System (5/5 plans) — completed 2026-02-18
- [x] Phase 3: Availability Grid (Mobile-First) (4/4 plans) — completed 2026-02-18
- [x] Phase 4: Heatmap and Results View (5/5 plans) — completed 2026-02-19
- [x] Phase 5: Polish and Launch Readiness (6/6 plans) — completed 2026-02-19

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

---

### 🚧 v1.1 Notifications & Export (In Progress)

**Milestone Goal:** Close the scheduling loop — notify participants when a time is confirmed and give everyone one-click calendar export.

## Phases

- [ ] **Phase 6: Resend Domain Verification** - Verify custom domain in Resend so notification emails reach any recipient
- [ ] **Phase 7: Email Collection and Notifications** - Schema migration, optional email inputs, and both notification triggers
- [ ] **Phase 8: Calendar Export** - .ics download and Google Calendar link on confirmed event page

## Phase Details

### Phase 6: Resend Domain Verification
**Goal**: Notification emails can be delivered to any recipient address, not just the account owner
**Depends on**: Nothing (ops prerequisite for Phase 7)
**Requirements**: INFRA-01
**Success Criteria** (what must be TRUE):
  1. Resend dashboard shows custom domain as verified with green status
  2. SPF, DKIM, and DMARC DNS records are propagated and passing Resend's checks
  3. A test email sent via Resend using the verified domain `from:` address is received in the inbox of a non-owner email address
  4. The `from:` address in all existing Resend sends is updated to `notifications@[verified-domain]`
**Plans**: TBD

### Phase 7: Email Collection and Notifications
**Goal**: Users can optionally provide an email address and receive notifications at the right moments in the scheduling lifecycle
**Depends on**: Phase 6
**Requirements**: EMAIL-01, EMAIL-02, NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. Creator can enter an optional email address on the create-event form, and omitting it never blocks event creation
  2. Participant can enter an optional email address on the join form, and omitting it never blocks joining
  3. Creator receives exactly one email when all current participants have submitted their availability (fires once even if availability is later edited)
  4. Each participant with an email on file receives a confirmation email showing the confirmed time in their own timezone when the creator confirms
  5. Participant email addresses are purged from the database after the confirmed-time notification sends
**Plans**: TBD

### Phase 8: Calendar Export
**Goal**: Users can add a confirmed event to their calendar with one action from the confirmed event page
**Depends on**: Phase 7
**Requirements**: EXPRT-01, EXPRT-02
**Success Criteria** (what must be TRUE):
  1. A "Download .ics" button appears on the confirmed event page and triggers a browser file download of a valid RFC 5545 calendar file
  2. The downloaded .ics file imports correctly into Google Calendar, Apple Calendar, and Outlook with the correct event title, time (UTC), and description
  3. An "Add to Google Calendar" link on the confirmed event page opens Google Calendar pre-filled with the event title, time, and a back-link URL
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Event Creation | v1.0 | 4/4 | Complete | 2026-02-18 |
| 2. Participant Identity and PIN System | v1.0 | 5/5 | Complete | 2026-02-18 |
| 3. Availability Grid (Mobile-First) | v1.0 | 4/4 | Complete | 2026-02-18 |
| 4. Heatmap and Results View | v1.0 | 5/5 | Complete | 2026-02-19 |
| 5. Polish and Launch Readiness | v1.0 | 6/6 | Complete | 2026-02-19 |
| 6. Resend Domain Verification | v1.1 | 0/TBD | Not started | - |
| 7. Email Collection and Notifications | v1.1 | 0/TBD | Not started | - |
| 8. Calendar Export | v1.1 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-02-17*
*Last updated: 2026-02-28 — v1.1 roadmap added (Phases 6-8)*
