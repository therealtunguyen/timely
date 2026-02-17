# Timely

## What This Is

A mobile-first web app that helps small groups (4-10 people) find a meeting time without the back-and-forth. Responders mark their availability on a shared calendar, a heatmap reveals the overlap, and the creator picks the best time. No accounts needed — just a link, a name, and a PIN.

## Core Value

Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Creator can create an event with a title, description, and candidate dates (specific dates or a date range)
- [ ] Creator gets a shareable link to distribute via group chat
- [ ] Responders enter a unique name and set a 4-digit PIN to claim their identity
- [ ] Responders mark their availability on a calendar/time grid view
- [ ] Responders can edit their availability later using their name + PIN
- [ ] Magic link (email) fallback for responders who forget their PIN or switch devices
- [ ] Heatmap-style overlap view shows when the most people are free
- [ ] Creator can see who has and hasn't responded
- [ ] Creator can pick/confirm the winning time
- [ ] Entire experience is mobile-first with a minimal, warm aesthetic
- [ ] Works without accounts, app installs, or signups

### Out of Scope

- Native mobile apps — web-first, mobile-responsive is the play
- Calendar integrations (Google Calendar, iCal sync) — v1 is manual availability entry
- Notifications (email/SMS when everyone responds) — v1 is check-the-link
- Recurring events — v1 is one-off scheduling
- OAuth/social login — names + PINs are the identity model
- Real-time collaboration (live cursors, WebSocket updates) — page refresh is fine for v1
- Payment/premium tiers — free for now

## Context

- Existing tools (Doodle, When2meet) solve this problem but feel dated, clunky, and hostile on mobile
- The opportunity is in the experience — same core functionality, dramatically better feel
- Target users are friend groups, small teams, study groups coordinating casual meetups
- No existing user base — greenfield build
- The "flexible" time selection model (creator chooses specific dates OR a date range) adds complexity but matches real use cases

## Constraints

- **Tech stack**: React ecosystem (React/Next.js) — familiar territory, large ecosystem
- **Platform**: Mobile-first responsive web app — no app store distribution
- **Identity model**: Name + PIN per event, magic link fallback — no traditional auth system
- **Aesthetic**: Minimal and warm — whitespace, soft colors, calm feel (think Linear, Cal.com)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No accounts, name + PIN identity | Minimizes friction — anyone can respond in seconds | — Pending |
| Heatmap overlap (not auto-pick) | Keeps creator in control, simpler to build, more transparent | — Pending |
| React/Next.js stack | User preference, large ecosystem, good for mobile-first web | — Pending |
| Flexible date selection (specific dates OR range) | Matches real scheduling scenarios — sometimes you have dates in mind, sometimes you don't | — Pending |
| Magic link as PIN fallback | Handles forgotten PINs and device switches without adding full auth | — Pending |

---
*Last updated: 2026-02-17 after initialization*
