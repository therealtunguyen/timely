# Timely

## What This Is

A mobile-first web app that helps small groups (4-10 people) find a meeting time without the back-and-forth. Responders mark their availability on a shared drag-to-paint grid, a heatmap reveals the overlap, and the creator picks the best time. No accounts needed — just a link, a name, and a PIN. Deployed at https://timely-cyan-three.vercel.app.

## Core Value

Finding a time that works for everyone should feel effortless — share a link, mark your times, see the overlap.

## Current Milestone: v1.1 Notifications & Export

**Goal:** Close the loop after scheduling — notify participants and make it easy to add the confirmed time to a calendar.

**Target features:**
- Optional email collection at event creation (creator) and participant join
- Creator email notification when all participants have submitted availability
- Participant email notifications when creator confirms a time
- .ics download and Google Calendar link on confirmed event page

## Requirements

### Validated

- ✓ Creator can create an event with a title, description, and candidate dates (specific dates or a date range) — v1.0
- ✓ Creator gets a shareable link to distribute via group chat — v1.0
- ✓ Responders enter a unique name and set a 4-digit PIN to claim their identity — v1.0
- ✓ Responders mark their availability on a calendar/time grid view — v1.0
- ✓ Responders can edit their availability later using their name + PIN — v1.0
- ✓ Magic link (email) fallback for responders who forget their PIN or switch devices — v1.0
- ✓ Heatmap-style overlap view shows when the most people are free — v1.0
- ✓ Creator can see who has and hasn't responded — v1.0
- ✓ Creator can pick/confirm the winning time — v1.0
- ✓ Entire experience is mobile-first with a minimal, warm aesthetic — v1.0
- ✓ Works without accounts, app installs, or signups — v1.0

### Active

- [ ] Creator can optionally provide their email when creating an event
- [ ] Participant can optionally provide their email when joining an event
- [ ] Creator receives email when all current participants have submitted their availability
- [ ] Participants with an email on file receive a notification when the creator confirms a time
- [ ] User can download a .ics calendar file for a confirmed event
- [ ] User can add a confirmed event to Google Calendar via a one-click link

### Out of Scope

- Native mobile apps — web-first, mobile-responsive is the play
- Real-time collaboration (live cursors, WebSocket updates) — page refresh is fine
- Recurring events — one-off scheduling only
- OAuth/social login — names + PINs are the identity model
- Payment/premium tiers — free for now
- Multi-language / i18n — English only

## Context

- v1.0 shipped 2026-02-28, deployed to Vercel
- Stack: Next.js 16 (App Router), Neon Postgres, Drizzle ORM, Tailwind v4, shadcn/ui, Zustand, Upstash Redis, Resend
- ~5,469 TypeScript/TSX LOC across 159 files
- Known limitation: Resend magic link emails only deliver to verified address (atunguye25@gmail.com) until timely.app domain is verified at resend.com/domains
- Creator cookie is persistent (30-day) — lost on incognito/device switch; no recovery path exists
- iOS Safari full smoke test still pending (app deployed, test not yet completed)

## Constraints

- **Tech stack**: React/Next.js — familiar territory, large ecosystem
- **Platform**: Mobile-first responsive web app — no app store distribution
- **Identity model**: Name + PIN per event, magic link fallback — no traditional auth
- **Aesthetic**: Minimal and warm — whitespace, soft colors, calm feel
- **Email delivery**: Resend domain must be verified at resend.com/domains before notifications reach non-owner addresses

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No accounts, name + PIN identity | Minimizes friction — anyone can respond in seconds | ✓ Good — works smoothly, no signup drop-off |
| Heatmap overlap (not auto-pick) | Keeps creator in control, simpler, more transparent | ✓ Good — creator confirm flow works well |
| React/Next.js stack | User preference, large ecosystem, good for mobile-first web | ✓ Good — App Router + Server Components clean for this pattern |
| Flexible date selection (specific dates OR range) | Matches real scheduling scenarios | ✓ Good — both modes work; range capped at 14 days for UX |
| Magic link as PIN fallback | Handles forgotten PINs without full auth | ✓ Good — flow complete; blocked by Resend domain until verified |
| Drizzle ORM (not Prisma) | Edge-compatible, no native binary, first-class Neon support | ✓ Good — db.batch() works well for atomic slot replace |
| Argon2id memoryCost: 65536 | OWASP 2025 recommendation | ✓ Good — serverExternalPackages required in next.config.ts |
| Row-per-slot availability storage | Simple GROUP BY for heatmap; partial updates trivial | ✓ Good — 21,600 rows max is fine at this scale |
| Custom grid (no library) | All existing libraries abandoned or broken | ✓ Good — Pointer Events API + touch-action:none works reliably |
| Server-side heatmap aggregation | Simpler; no data leakage risk | ✓ Good — SQL GROUP BY clean and performant |
| DB-backed opaque sessions (not JWTs) | JWTs cannot be revoked; magic link must supersede sessions | ✓ Good — single SESSION_COOKIE constant, no hardcoded strings |
| SECR-03 expiry: 30 days from creation | Approximation of "30 days after last candidate date" | ✓ Resolved — updated from 37 days to exact 30 days |

---
*Last updated: 2026-02-28 after v1.1 milestone start*
