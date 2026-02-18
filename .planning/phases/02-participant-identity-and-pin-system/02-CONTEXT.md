# Phase 2: Participant Identity and PIN System - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver how a responder claims a name, authenticates with a 4-digit PIN, and recovers access via magic link — all without creating an account. The availability grid (Phase 3) is out of scope; this phase ends with a verified session and the event page showing the correct CTA.

</domain>

<decisions>
## Implementation Decisions

### First-visit identity flow
- Name entry initiated via a vaul-style bottom sheet (slides up from bottom of event page)
- Sheet displays existing participant names so the user can avoid taken names
- Sheet heading: "What's your name?"
- Name conflict error: inline error with a suggestion ("Alex is taken — try Alex2 or a nickname")
- After name is accepted: sheet closes, event page shown briefly with a toast ("Name claimed — now set your PIN"), PIN sheet opens automatically

### PIN setup flow
- PIN sheet heading: "Set a 4-digit PIN" with sub-copy "You'll use this to edit later"
- Separate sheet from name entry (closes → toast → new sheet opens)
- 4 separate OTP-style input boxes
- Digits visible by default (no dots, no show/hide toggle)
- No auto-submit — requires explicit submit button

### PIN verify (return visit)
- Error feedback: shake animation + "Incorrect PIN" message below inputs + fields clear
- "Forgot PIN?" link appears after the first failed attempt (not visible initially)
- Sheet heading: generic "Enter your PIN" (name not repeated in heading)

### Magic link UX
- "Forgot PIN?" surfaces after the first failed attempt
- After email submitted: toast + sheet closes, user returns to event page to wait
- Two distinct invalid-link states: "This link has expired (30-min limit)" vs "This link has already been used"
- After successful magic link consumption: redirect to event page with session active (no forced PIN reset)

### Return visit experience
- Active session detected on event page load: personalized CTA replaces generic one — "Welcome back, [Name] — Edit your availability"
- Expired session (7-day cookie gone): same flow as new visit — name entry → PIN verify
- After successful PIN verify: back to event page with "Edit your availability" CTA active

### Claude's Discretion
- Exact vaul animation timing and sheet snap points
- Toast design and duration
- OTP box focus management and keyboard behaviour across iOS/Android
- Exact button labels beyond what's specified above
- Loading states during API calls

</decisions>

<specifics>
## Specific Ideas

- The two-sheet pattern (name sheet → close → toast → PIN sheet) should feel like one continuous onboarding sequence, not two disconnected steps
- Magic link expiry and used-link messages should each include a CTA to request a new link

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-participant-identity-and-pin-system*
*Context gathered: 2026-02-18*
