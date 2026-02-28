# Phase 5: Polish and Launch Readiness - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the app for real-world use by strangers: implement abuse prevention (rate limiting, honeypot, auto-expiry, manual delete), fulfill data obligations (privacy notice, GDPR-adjacent erasure), design all off-happy-path states (empty states, error states), and verify cross-browser/accessibility readiness. No new user-facing features — this phase makes existing features safe and polished for launch.

</domain>

<decisions>
## Implementation Decisions

### Privacy notice — placement
- Two-touch approach: a brief inline note directly below the create-event submit button, plus a full /privacy page
- Footer on all pages should link to /privacy

### Privacy notice — inline copy
- Data-focused, factual tone: "Events and all responses expire automatically after 30 days. No accounts required."
- No marketing language — just the facts

### Privacy notice — /privacy page structure
- Standard structured sections: data collected, how it's stored, retention policy (30-day auto-expiry), your rights (delete via creator token flow), and a contact method
- Plain English throughout — no legalese
- Contact method: Claude's discretion (pick what makes sense for a no-account tool)

### Creator delete — access point
- Separate /e/[id]/manage page — not cluttering the public event page
- A "Manage event" link visible only when the creator cookie is present on the event page

### Creator delete — confirmation UX
- Simple confirmation dialog: "Delete this event? This cannot be undone." with Cancel / Delete buttons
- No type-to-confirm required — the confirmation dialog is sufficient for this app's tone

### Creator delete — post-deletion
- Redirect to / (home / create-event page) after deletion
- Show a toast: "Event deleted."

### Creator delete — cookie loss
- Accepted v1 limitation: if creator loses their cookie (incognito, device switch, manual clear), they lose manage access
- Document this clearly on the /e/[id]/manage page: "If you've lost access, events expire automatically in 30 days."
- No recovery path in this phase

### Claude's Discretion
- Empty state copy and visual design for all off-path screens (no-responses-yet, event-not-found, expired-event, link-already-used, rate-limit screens)
- Error state copy for all error paths
- Exact accessibility audit scope and ARIA label patterns
- Contact method format on /privacy page
- Honeypot field implementation detail

</decisions>

<specifics>
## Specific Ideas

- The inline privacy note should feel like fine print, not a warning — low visual weight, honest, brief
- /e/[id]/manage is a creator-only utility page, not part of the main user flow — it can be simple and functional

</specifics>

<deferred>
## Deferred Ideas

- Creator link in URL (e.g. /e/[id]?creator=[token]) to re-set cookie after loss — future phase or v1.1 improvement. Option A from STATE.md Open Questions: one Route Handler to re-set cookie from ?creator= query param, one line on confirm page.

</deferred>

---

*Phase: 05-polish-and-launch-readiness*
*Context gathered: 2026-02-19*
