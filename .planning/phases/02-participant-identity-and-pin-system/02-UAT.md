---
status: complete
phase: 02-participant-identity-and-pin-system
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-02-20T00:00:00Z
updated: 2026-02-20T01:00:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. New visitor join flow
expected: Open event page, see two-button split CTA. Tap "Mark my availability" → NameSheet slides up → enter name + Continue → PinSheet slides up → enter 4-digit PIN + Confirm → page reloads with "Welcome back, [Name]" CTA
result: pass

### 2. Name conflict detection
expected: Open the NameSheet again (or in a new incognito window), type the same name you just registered. Instead of proceeding to PIN setup, an inline "Edit as [name] instead" button appears — tapping it switches to PIN verify mode for that name.
result: pass

### 3. Return visitor PIN verify
expected: In an incognito window (no session), open the same event page. Tap "Already joined? Edit my availability" → NameSheet opens → enter your existing name → PinSheet opens in verify mode (heading says "Enter your PIN" not "Create your PIN") → enter correct PIN → page reloads with "Welcome back, [Name]" CTA.
result: pass

### 4. Wrong PIN — shake animation + Forgot PIN reveal
expected: In PIN verify mode, enter an incorrect 4-digit PIN. The PIN input boxes shake visually. An error message appears. After at least one failed attempt, "Forgot your PIN?" text or link becomes visible (it was not visible before the failure).
result: pass

### 5. PIN rate limiting lockout
expected: Enter the wrong PIN 5 times for the same participant name (in the same session or close together). On the 5th or 6th attempt, a lockout message appears — something like "Too many attempts" or "Try again in 15 minutes" — and further PIN entries are blocked temporarily.
result: pass

### 6. Session survives page reload
expected: After successfully joining (name + PIN), do a hard page reload (Cmd+Shift+R or Ctrl+Shift+R). The page should still show the "Welcome back, [Name]" CTA — you should NOT be asked to re-enter your name or PIN.
result: pass

### 7. Magic link request flow
expected: In PIN verify mode, after seeing "Forgot your PIN?", tap it. A MagicLinkSheet slides up with an email input. Enter an email and tap "Send magic link". A success confirmation appears (something like "Check your email" or "Link sent"). No crash or error.
result: pass

### 8. Magic link error pages
expected: Visit the following URLs and confirm each shows a clear, friendly error page (not a 500 or blank screen) with a "Request a new link" CTA:
  - https://timely-cyan-three.vercel.app/e/[any-event-id]/magic?error=expired → "This link has expired"
  - https://timely-cyan-three.vercel.app/e/[any-event-id]/magic?error=used → "This link has already been used"
  - https://timely-cyan-three.vercel.app/e/[any-event-id]/magic?error=invalid → "This link is invalid"
result: pass

### 9. Magic link email delivery and consumption
expected: Using the email atunguye25@gmail.com (the only address that works on the free Resend tier), request a magic link. Open the email, click the link. You should be redirected back to the event page with a session — the "Welcome back, [Name]" CTA appears without entering a PIN. Clicking the same link again shows the "already used" error page.
result: pass
note: Fixed by switching from: address to onboarding@resend.dev (commit 2bc975c)

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all tests passed]
