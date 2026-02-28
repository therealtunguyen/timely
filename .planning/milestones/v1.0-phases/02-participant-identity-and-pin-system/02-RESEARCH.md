# Phase 2: Participant Identity and PIN System - Research

**Researched:** 2026-02-18
**Domain:** Passwordless identity, PIN hashing, session cookies, magic links, bottom-sheet UI
**Confidence:** HIGH (core stack verified via official docs and Context7; animation library note below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**First-visit identity flow**
- Name entry initiated via a vaul-style bottom sheet (slides up from bottom of event page)
- Sheet displays existing participant names so the user can avoid taken names
- Sheet heading: "What's your name?"
- Name conflict error: inline error with a suggestion ("Alex is taken — try Alex2 or a nickname")
- After name is accepted: sheet closes, event page shown briefly with a toast ("Name claimed — now set your PIN"), PIN sheet opens automatically

**PIN setup flow**
- PIN sheet heading: "Set a 4-digit PIN" with sub-copy "You'll use this to edit later"
- Separate sheet from name entry (closes → toast → new sheet opens)
- 4 separate OTP-style input boxes
- Digits visible by default (no dots, no show/hide toggle)
- No auto-submit — requires explicit submit button

**PIN verify (return visit)**
- Error feedback: shake animation + "Incorrect PIN" message below inputs + fields clear
- "Forgot PIN?" link appears after the first failed attempt (not visible initially)
- Sheet heading: generic "Enter your PIN" (name not repeated in heading)

**Magic link UX**
- "Forgot PIN?" surfaces after the first failed attempt
- After email submitted: toast + sheet closes, user returns to event page to wait
- Two distinct invalid-link states: "This link has expired (30-min limit)" vs "This link has already been used"
- After successful magic link consumption: redirect to event page with session active (no forced PIN reset)

**Return visit experience**
- Active session detected on event page load: personalized CTA replaces generic one — "Welcome back, [Name] — Edit your availability"
- Expired session (7-day cookie gone): same flow as new visit — name entry → PIN verify
- After successful PIN verify: back to event page with "Edit your availability" CTA active

### Claude's Discretion
- Exact vaul animation timing and sheet snap points
- Toast design and duration
- OTP box focus management and keyboard behaviour across iOS/Android
- Exact button labels beyond what's specified above
- Loading states during API calls

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IDEN-01 | Responder enters a unique name (per event) to participate | DB has `uniqueIndex('participants_event_name_idx')` already; name-entry sheet pattern documented below |
| IDEN-02 | Responder sets a 4-digit PIN when first joining | shadcn `input-otp` component with `maxLength={4}` and `REGEXP_ONLY_DIGITS` pattern covers this |
| IDEN-03 | Name uniqueness is enforced per event (case-insensitive) | Route Handler does `lower(name)` comparison or catches Postgres unique-constraint error; see Pitfall #3 |
| IDEN-04 | Responder can return and edit availability using name + PIN | Session cookie read in Server Component drives CTA switch; PIN verify Route Handler re-issues session |
| IDEN-05 | PIN is hashed with Argon2id before storage | `@node-rs/argon2` with `memoryCost: 65536` + `serverExternalPackages` config; verified API below |
| IDEN-06 | PIN verification is rate-limited (5 attempts per 15-min window) | Upstash `Ratelimit.slidingWindow(5, '15 m')` with compound key `eventId:name`; pattern established |
| IDEN-07 | Responder can request a magic link (email) if PIN is forgotten | Resend SDK in Route Handler; `@react-email/components` for template; SHA-256 hash-only storage |
| IDEN-08 | Magic links expire after 30 minutes and are single-use | `expiresAt` + `usedAt` columns already in schema; consumption Route Handler checks both |
| IDEN-09 | Session persists via httpOnly cookie after successful PIN verification | `(await cookies()).set()` in Route Handler; `httpOnly: true, sameSite: 'lax', maxAge: 604800` |
| SECR-01 | No personal data stored beyond name, optional email, and availability | Email stored only on `participants.email`; purge on token expiry via scheduled deletion or cleanup |
| SECR-02 | Magic link email addresses are not persisted after token expiry | Separate cleanup: NULL out `participants.email` after `magic_tokens.expiresAt` passes |
</phase_requirements>

---

## Summary

Phase 2 is an identity-without-accounts system: participants claim a name, set a PIN, and get a DB-backed session cookie. The tech stack is entirely determined by prior decisions — Drizzle/Neon (already wired), Upstash Redis (already wired), plus three new additions: `@node-rs/argon2` for PIN hashing, `resend` for magic-link email, and `vaul` (via shadcn Drawer) for the bottom-sheet UI.

The schema is already fully defined in `src/lib/schema.ts` — `participants`, `sessions`, and `magicTokens` tables exist with the correct columns. No schema migration work is needed for the core identity flow; the implementation is purely Route Handlers, Client Components, and DB queries.

The critical complexity lives in four areas: (1) the sequenced two-sheet UX (name → PIN) that must feel like one onboarding flow, (2) Argon2id configuration with `serverExternalPackages` to avoid bundling issues, (3) the rate-limiter key design (`eventId:name` compound key, not IP), and (4) the magic-link hash-only storage pattern with email purge after expiry.

**Primary recommendation:** Build in this order — schema is done, so go directly to Route Handlers (claim-name, verify-pin, request-magic-link, consume-magic-link), then wire up the Client Component sheets, then update the event page Server Component to read the session cookie and show the correct CTA.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vaul` (via shadcn Drawer) | 1.1.2 | Bottom sheet that slides up from screen bottom | Already shadcn-integrated; shadcn wraps vaul and exposes `Drawer`, `DrawerContent`, etc. |
| `@node-rs/argon2` | latest | Argon2id PIN hashing | No node-gyp, no postinstall, WASM fallback; OWASP-recommended; smaller than `argon2` (476KB vs 3.7MB) |
| `resend` | latest | Transactional email for magic links | Already in decision set; first-class Next.js Route Handler support |
| `input-otp` (via shadcn) | latest | 4-digit OTP-style PIN input boxes | shadcn `input-otp` component wraps this; handles focus, keyboard, paste natively |
| `sonner` (via shadcn) | latest | Toast notifications | shadcn's recommended toast replacement; replaces deprecated `toast` component |
| `motion` | 12.x | Shake animation on PIN verify failure | React 19-compatible successor to framer-motion; `npm install motion`, imports from `motion/react` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-email/components` | latest | React-based magic-link email template | Use alongside `resend` to build typesafe, renderable email components |
| `@upstash/ratelimit` | 2.0.8 (already installed) | PIN verify rate limiting | Already installed; create a second `Ratelimit` instance for PIN attempts |
| `@upstash/redis` | 1.36.2 (already installed) | Redis client for rate limiter | Already installed; `Redis.fromEnv()` reads env vars automatically |
| `drizzle-orm` | 0.45.1 (already installed) | All DB queries | Already installed and wired |
| `zod` | 4.3.6 (already installed) | Request body validation | Already installed; add schemas for name-claim and pin payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@node-rs/argon2` | `argon2` (node-argon2) | `argon2` requires `outputFileTracingIncludes` config on Vercel for prebuilt binaries; `@node-rs/argon2` avoids this with its own WASM/native approach |
| `motion` | Custom CSS keyframes | Motion provides imperative control (`animate()` on error trigger) and resets cleanly; CSS-only shake requires class add/remove timing hacks |
| `sonner` | Custom toast | Sonner is now shadcn's canonical choice; deprecated `toast` component should not be used |

### Installation
```bash
npm install @node-rs/argon2 resend @react-email/components motion
```

Then add shadcn components:
```bash
npx shadcn@latest add drawer input-otp sonner
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── participants/
│   │       ├── claim-name/route.ts      # POST: validate name uniqueness, create participant row
│   │       ├── verify-pin/route.ts      # POST: verify PIN, issue session cookie
│   │       ├── magic-link/
│   │       │   ├── request/route.ts     # POST: generate + email magic link
│   │       │   └── consume/route.ts     # GET: validate hash, mark used, issue session, redirect
│   │       └── session/route.ts         # GET: read session cookie, return participant identity
│   └── e/[id]/
│       └── page.tsx                     # Updated: read session cookie, show correct CTA
├── components/
│   ├── identity/
│   │   ├── join-flow.tsx               # Orchestrates name-sheet → toast → pin-sheet sequence
│   │   ├── name-sheet.tsx              # DrawerContent with name form
│   │   ├── pin-sheet.tsx               # DrawerContent with OTP input (setup + verify modes)
│   │   └── magic-link-sheet.tsx        # DrawerContent with email form for PIN recovery
│   └── ui/
│       ├── drawer.tsx                  # (added by shadcn)
│       ├── input-otp.tsx               # (added by shadcn)
│       └── sonner.tsx                  # (added by shadcn)
├── lib/
│   ├── auth.ts                         # getSession(cookieStore): looks up sessions table
│   ├── argon2.ts                       # hashPin() and verifyPin() wrappers
│   ├── magic-tokens.ts                 # generateMagicToken(), hashToken(), buildMagicUrl()
│   └── rate-limit.ts                   # Add pinVerifyRatelimit alongside eventCreationRatelimit
└── emails/
    └── magic-link-email.tsx            # React Email component for the magic link email
```

### Pattern 1: Sequenced Two-Sheet Flow

**What:** Two separate bottom sheets (name entry, then PIN setup) that open sequentially. State managed by a parent `JoinFlow` Client Component.

**When to use:** Whenever the UX requires two distinct confirmation steps that must feel continuous.

**Implementation approach:**
```typescript
// Source: Vaul API docs (vaul.emilkowal.ski/api) + shadcn Drawer docs
'use client'
import { useState } from 'react'
import { toast } from 'sonner'

type Step = 'name' | 'pin' | 'idle'

export function JoinFlow({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<Step>('name')
  const [claimedName, setClaimedName] = useState<string>('')

  // Drawer open state derived from step
  const nameOpen = step === 'name'
  const pinOpen = step === 'pin'

  async function handleNameClaimed(name: string) {
    setClaimedName(name)
    // Close name sheet first
    setStep('idle')
    // Show toast, then open pin sheet after brief delay
    toast('Name claimed — now set your PIN')
    await new Promise(r => setTimeout(r, 400))  // let sheet close animation finish
    setStep('pin')
  }

  return (
    <>
      <NameSheet open={nameOpen} onOpenChange={(o) => !o && setStep('idle')}
        onNameClaimed={handleNameClaimed} eventId={eventId} />
      <PinSheet open={pinOpen} onOpenChange={(o) => !o && setStep('idle')}
        name={claimedName} eventId={eventId} mode="setup" />
    </>
  )
}
```

### Pattern 2: Vaul/shadcn Drawer (Controlled State)

**What:** Controlled bottom sheet using `open` / `onOpenChange` props. shadcn wraps Vaul's `Drawer.Root`.

**When to use:** Whenever drawer open/close state must be controlled programmatically (not just via a trigger button).

**Key props on `<Drawer>`:**
```typescript
// Source: vaul.emilkowal.ski/api
<Drawer
  open={open}                    // boolean — controlled open state
  onOpenChange={setOpen}         // (open: boolean) => void
  dismissible={true}             // allow swipe-down / click-outside to close (default: true)
  direction="bottom"             // default — slides up from bottom
  repositionInputs={true}        // repositions when soft keyboard appears (default: true) — IMPORTANT for mobile PIN entry
  onAnimationEnd={(open) => {}}  // fires after open/close animation completes — use for sequencing
>
  <DrawerContent>...</DrawerContent>
</Drawer>
```

**Note on vaul maintenance status:** The vaul GitHub README contains a note that the repo is unmaintained. However, the shadcn Drawer component bundles vaul 1.1.2 internally and the shadcn team maintains the wrapper. Use shadcn's `Drawer` component (not raw `vaul`), and the maintenance risk is absorbed by shadcn. Do NOT import directly from `vaul` — import from `@/components/ui/drawer`.

### Pattern 3: Argon2id Hashing

**What:** Hash PINs with `@node-rs/argon2` at OWASP-recommended memory cost.

**When to use:** Any PIN or password stored in DB.

```typescript
// Source: @node-rs/argon2 README (github.com/napi-rs/node-rs)
import { hash, verify, Algorithm } from '@node-rs/argon2'

export async function hashPin(pin: string): Promise<string> {
  return hash(pin, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 65536,   // 64 MiB — OWASP 2025 recommendation (locked decision)
    timeCost: 3,
    parallelism: 1,
  })
}

export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  return verify(hash, pin, {
    algorithm: Algorithm.Argon2id,
  })
}
```

**Required next.config.ts change:**
```typescript
// Source: Next.js 15 docs (nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
const nextConfig: NextConfig = {
  serverExternalPackages: ['@node-rs/argon2'],
}
```

Without `serverExternalPackages`, Next.js tries to bundle `@node-rs/argon2` for the client, triggering a WASM resolution error (`@node-rs/argon2-wasm32-wasi` not found).

### Pattern 4: Session Cookie in Route Handler

**What:** Set an `httpOnly SameSite=Lax` cookie after successful PIN verify or magic-link consumption.

```typescript
// Source: Next.js 15 official docs (nextjs.org/docs/app/api-reference/functions/cookies)
import { cookies } from 'next/headers'
import { generateId } from '@/lib/id'

export async function POST(req: NextRequest) {
  // ... verify PIN ...

  // Generate session token (32-byte hex)
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  // Store in DB
  await db.insert(sessions).values({
    id: generateId(),
    token,
    participantId,
    eventId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days
  })

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,  // 7 days in seconds
    path: '/',
  })

  return NextResponse.json({ success: true })
}
```

**Read session in Server Component (event page):**
```typescript
// Source: Next.js 15 official docs
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions, participants } from '@/lib/schema'
import { eq, gt } from 'drizzle-orm'

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  const session = await db.query.sessions.findFirst({
    where: (s, { and, eq, gt }) => and(
      eq(s.token, token),
      gt(s.expiresAt, new Date())
    ),
    with: { participant: true },
  })

  return session ?? null
}
```

### Pattern 5: Upstash Rate Limiting — Compound Key

**What:** Rate limit PIN verify attempts per event+participant combination (not per IP).

```typescript
// Source: upstash/ratelimit-js README (github.com/upstash/ratelimit-js)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// In src/lib/rate-limit.ts — add alongside existing eventCreationRatelimit:
export const pinVerifyRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),   // 5 attempts per 15-min window (IDEN-06)
  analytics: true,
  prefix: 'timely:pin-verify',
})

// In Route Handler:
const identifier = `${eventId}:${name.toLowerCase()}`  // compound key — not IP
const { success, remaining } = await pinVerifyRatelimit.limit(identifier)

if (!success) {
  return NextResponse.json(
    { error: 'Too many attempts. Please wait 15 minutes or use magic link.' },
    { status: 429 }
  )
}
```

### Pattern 6: Magic Link Token — Hash-Only Storage

**What:** Generate a random token, send raw in URL, store only SHA-256 hash in DB.

```typescript
// Source: Node.js crypto docs + MDN SubtleCrypto
import { createHash, randomBytes } from 'crypto'

export function generateMagicToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex')       // 64-char hex string
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function buildMagicUrl(eventId: string, raw: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/e/${eventId}/magic?token=${raw}`
}
```

**Consumption Route Handler:**
```typescript
// GET /api/participants/magic-link/consume?token=<raw>&eventId=<id>
const tokenHash = hashToken(rawToken)

const magicToken = await db.query.magicTokens.findFirst({
  where: (t, { eq }) => eq(t.tokenHash, tokenHash),
})

if (!magicToken) {
  redirect(`/e/${eventId}/magic?error=invalid`)
}
if (magicToken.usedAt) {
  redirect(`/e/${eventId}/magic?error=used`)   // "already used" state
}
if (magicToken.expiresAt < new Date()) {
  redirect(`/e/${eventId}/magic?error=expired`)  // "expired" state
}

// Mark used
await db.update(magicTokens)
  .set({ usedAt: new Date() })
  .where(eq(magicTokens.id, magicToken.id))

// Issue session cookie + redirect to event page
// (same cookie-setting code as PIN verify)
```

### Pattern 7: Email Sending with Resend

**What:** Send magic-link email from a Route Handler using Resend SDK.

```typescript
// Source: resend.com/docs/send-with-nextjs
import { Resend } from 'resend'
import { MagicLinkEmail } from '@/emails/magic-link-email'

const resend = new Resend(process.env.RESEND_API_KEY)

// In request/route.ts:
const { data, error } = await resend.emails.send({
  from: 'Timely <noreply@your-domain.com>',
  to: [email],
  subject: 'Your Timely access link',
  react: MagicLinkEmail({ magicUrl, participantName, eventTitle }),
})

if (error) {
  return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
}
```

**Email purge pattern (SECR-02):**
After `magic_tokens.expiresAt` passes, set `participants.email = NULL`. Options:
1. On-demand: when the consume route finds an expired token, also null out the email
2. Scheduled: a cron route that bulk-nulls expired emails

Option 1 is simpler and sufficient for this phase; add a note that it only triggers if someone clicks an expired link.

### Pattern 8: Shake Animation on PIN Error

**What:** On incorrect PIN, animate the OTP input group with a horizontal shake.

```typescript
// Source: motion.dev/docs/react (Motion for React — successor to Framer Motion)
// Import from 'motion/react' (not 'framer-motion')
'use client'
import { useRef } from 'react'
import { animate } from 'motion'

export function PinInput({ onError }: { onError?: boolean }) {
  const groupRef = useRef<HTMLDivElement>(null)

  async function triggerShake() {
    if (!groupRef.current) return
    await animate(
      groupRef.current,
      { x: [0, -8, 8, -8, 8, -4, 4, 0] },
      { duration: 0.4, easing: 'ease-in-out' }
    )
  }

  // Call triggerShake() after a failed PIN verify response
  // ...
}
```

**Alternative — pure CSS (no extra dependency):**
```css
/* In globals.css — tw-animate-css already installed */
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
.animate-shake { animation: shake 0.5s ease-in-out; }
```

Both approaches work. Use `motion` if you want imperative control after API response. Use CSS keyframe + class toggle if you want zero additional deps. The project already has `tw-animate-css` installed.

### Anti-Patterns to Avoid

- **Auto-submitting the PIN:** The user decision locks no-auto-submit. Do NOT use `onComplete` callback of `InputOTP` to trigger submission.
- **Storing the raw magic-link token:** Only store SHA-256 hash. The raw token lives only in the email URL.
- **Rate-limiting by IP for PIN verify:** IP-based limiting is easily bypassed by VPN. Use `eventId:name` compound key.
- **Using `type="number"` for PIN digits:** Causes browser up/down arrows and incorrect mobile keyboard. Use `inputMode="numeric"` with `type="text"` (which shadcn `input-otp` does correctly).
- **Syncing the session via client-side localStorage:** Session must be DB-backed `httpOnly` cookie only — not accessible to JS.
- **Importing directly from `vaul`:** Import from `@/components/ui/drawer` (shadcn wrapper). Direct vaul imports bypass shadcn's styling and versioning.
- **Calling `cookies()` synchronously:** In Next.js 15, `cookies()` is async. Always `await cookies()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OTP-style PIN inputs | Custom 4x `<input>` with manual focus logic | `shadcn add input-otp` (wraps `input-otp` library) | Focus management on iOS is notoriously tricky; `input-otp` handles paste, backspace, cross-device focus |
| Bottom sheet | Custom CSS slide-up modal | `shadcn add drawer` (wraps vaul) | Vaul handles swipe-to-close, drag resistance, backdrop, scroll-locking, keyboard reposition |
| Argon2id hashing | bcrypt or SHA-256 alone | `@node-rs/argon2` | Argon2id is memory-hard; bcrypt is not; SHA-256 alone is not a password hash |
| Rate limiting storage | In-memory counter, DB counter | `@upstash/ratelimit` with Redis | In-memory resets on cold start; DB counters add latency; Upstash is already wired |
| Toast notifications | Custom positioned div | `shadcn add sonner` | Sonner handles stacking, positioning, accessibility, auto-dismiss; shadcn's current standard |
| Email delivery | SMTP directly | `resend` SDK | Resend handles deliverability, SPF/DKIM, bounce handling; 3-line integration |

**Key insight:** Every "don't hand-roll" item here has known mobile edge cases (focus stealing, scroll locking, keyboard avoidance) that the libraries handle. The cost of getting them wrong is user-visible jank on iOS, which is the primary device for this use case.

---

## Common Pitfalls

### Pitfall 1: WASM Resolution Error from @node-rs/argon2

**What goes wrong:** Next.js tries to bundle `@node-rs/argon2` for the client side and fails with `Module not found: Can't resolve '@node-rs/argon2-wasm32-wasi'`.

**Why it happens:** The hashing function is imported in a module that Next.js considers potentially client-bundled (e.g., missing `'server-only'` guard or `'use client'` directive in an importing parent).

**How to avoid:**
1. Add `serverExternalPackages: ['@node-rs/argon2']` to `next.config.ts`
2. Mark the `src/lib/argon2.ts` module with `import 'server-only'` at the top
3. Only call hash/verify from Route Handlers, never from Client Components

**Warning signs:** Build error mentioning `wasm32-wasi`; bundle analyzer showing argon2 in client chunk.

---

### Pitfall 2: vaul Maintenance Note

**What goes wrong:** Developers import from `vaul` directly and get concerned by the "unmaintained" README note.

**Why it happens:** The vaul library author added a note that they may not actively maintain it. However, the shadcn Drawer component bundles vaul 1.1.2 and the shadcn team manages compatibility.

**How to avoid:** Always use `@/components/ui/drawer` (added by `shadcn add drawer`), never import from `vaul` directly. The shadcn abstraction isolates this risk.

**Warning signs:** Direct `import { Drawer } from 'vaul'` in any file.

---

### Pitfall 3: Case-Insensitive Name Uniqueness

**What goes wrong:** "Alex" and "alex" both pass the uniqueness check and get inserted, violating IDEN-03.

**Why it happens:** The DB unique index is on `(eventId, name)` as stored — case-sensitive by default in Postgres. Postgres unique constraints are case-sensitive unless the column uses a case-insensitive collation or the index is on a function expression.

**How to avoid:** Two options:
1. Normalize name to lowercase before insert AND before lookup: `name.toLowerCase()`. Store lowercase, display as-entered only in the API response.
2. Use `uniqueIndex().on(lower(table.name), table.eventId)` in Drizzle (expression index). The current schema stores the name as entered, so **option 1 (normalize on write)** is simpler and doesn't require schema migration.

**Recommendation:** Normalize to lowercase on write. Return the as-entered version in the API response for display. The current schema uses `uniqueIndex('participants_event_name_idx').on(table.eventId, table.name)` — if names are always lowercased before insert, this index already enforces case-insensitive uniqueness.

**Warning signs:** Two participants with names that differ only by case appearing in the same event.

---

### Pitfall 4: Sheet Sequencing Race Condition

**What goes wrong:** The PIN sheet opens before the name sheet animation fully closes, causing both sheets to appear overlapped.

**Why it happens:** Setting `step = 'pin'` immediately after setting `step = 'idle'` doesn't wait for vaul's close animation to complete.

**How to avoid:** Use `onAnimationEnd` callback from vaul's `Drawer.Root` (fires after animation ends), or use a `setTimeout` with a delay matching the animation duration (~300-400ms). The `onAnimationEnd` prop is cleaner:

```typescript
<Drawer
  open={nameOpen}
  onAnimationEnd={(isOpen) => {
    if (!isOpen && pendingStep === 'pin') {
      setStep('pin')
      setPendingStep(null)
    }
  }}
>
```

**Warning signs:** Two sheets visible simultaneously; flickering during transition.

---

### Pitfall 5: cookies() Async in Next.js 15

**What goes wrong:** `cookies().get('session')` throws a type error or returns a Promise object instead of the cookie value.

**Why it happens:** In Next.js 15, `cookies()` is now an async function. Synchronous access is deprecated (still works but will break in a future version).

**How to avoid:** Always `await cookies()`:
```typescript
const cookieStore = await cookies()
const token = cookieStore.get('session')?.value
```

**Warning signs:** TypeScript type error on `.get()`; session always reads as undefined.

---

### Pitfall 6: Magic Link Token Rate Limiting / Abuse

**What goes wrong:** An attacker can flood the magic-link request endpoint to spam email addresses with magic-link emails.

**Why it happens:** No rate limiting is applied to the magic-link request endpoint.

**How to avoid:** Apply a separate `Ratelimit` instance on the magic-link request endpoint, keyed on `eventId:name` (same compound key pattern, different window — e.g., 3 per 30 minutes).

**Warning signs:** High Resend email volume with no corresponding user activity.

---

### Pitfall 7: Email Not Purged on Expiry

**What goes wrong:** `participants.email` retains the magic-link email address indefinitely even after the magic token expires (violates SECR-02).

**Why it happens:** No explicit purge mechanism is implemented.

**How to avoid:** In the consume route, when the token is found expired, also set `participants.email = NULL`:
```typescript
await db.update(participants)
  .set({ email: null })
  .where(eq(participants.id, magicToken.participantId))
```

This handles the "clicked expired link" path. For the "never clicked" path (link expired without user action), either accept the residual risk (email is never sent to third parties) or add a cleanup route. Document this tradeoff.

---

## Code Examples

Verified patterns from official sources:

### Setting httpOnly Cookie in Route Handler
```typescript
// Source: nextjs.org/docs/app/api-reference/functions/cookies (v16.1.6, 2026-02-11)
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // ... auth logic ...
  const cookieStore = await cookies()  // MUST await in Next.js 15
  cookieStore.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,  // 7 days
    path: '/',
  })
  return NextResponse.json({ success: true })
}
```

### shadcn InputOTP — 4-Digit PIN
```typescript
// Source: ui.shadcn.com/docs/components/input-otp
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

const [pin, setPin] = useState('')

<InputOTP
  maxLength={4}
  pattern={REGEXP_ONLY_DIGITS}
  value={pin}
  onChange={setPin}
  // No onComplete — user must press submit button (locked decision)
>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
  </InputOTPGroup>
</InputOTP>
```

### Upstash Compound Rate Limit Key
```typescript
// Source: github.com/upstash/ratelimit-js README
export const pinVerifyRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'timely:pin-verify',
})

// In Route Handler:
const identifier = `${eventId}:${name.toLowerCase()}`
const { success, remaining, reset } = await pinVerifyRatelimit.limit(identifier)
```

### Resend Magic Link Email
```typescript
// Source: resend.com/docs/send-with-nextjs
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Timely <noreply@timely.app>',
  to: [email],
  subject: 'Your access link for Timely',
  react: MagicLinkEmail({ magicUrl, participantName }),
})
```

### Session Read in Server Component
```typescript
// Source: nextjs.org/docs/app/api-reference/functions/cookies (v16.1.6)
import { cookies } from 'next/headers'

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  const session = token
    ? await db.query.sessions.findFirst({
        where: (s, { and, eq, gt }) => and(
          eq(s.token, token),
          eq(s.eventId, id),
          gt(s.expiresAt, new Date())
        ),
        with: { participant: true },
      })
    : null

  // session?.participant.name → "Welcome back, Alex"
  // session === null → "Mark your availability"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` | `motion` (same team, new package name) | 2024 | Import from `motion/react` not `framer-motion`; React 19-compatible |
| `cookies()` synchronous | `await cookies()` | Next.js 15 (2024) | Must await; sync access deprecated |
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (top-level) | Next.js 15 | Stable, moved out of experimental |
| shadcn `toast` component | `sonner` | 2024 | Original `toast` deprecated in shadcn; use `sonner` |
| `bcrypt` for passwords | `argon2id` | OWASP 2025 | Memory-hard; GPU-resistant; OWASP now explicitly recommends Argon2id |

**Deprecated/outdated:**
- `framer-motion` package name: still works via the npm alias but the canonical package is now `motion`; import from `motion/react`
- shadcn `toast` component: deprecated, replaced by `sonner`
- `experimental.serverComponentsExternalPackages` in `next.config`: renamed to `serverExternalPackages` at top level in Next.js 15

---

## Open Questions

1. **Email purge for the "never-clicked" path**
   - What we know: When a magic link expires and the user never clicks it, `participants.email` remains stored (violates SECR-02 intent)
   - What's unclear: Whether a cron/scheduled cleanup is needed or whether the residual risk is acceptable (email is never sent to third parties; it sits in DB until eventual cleanup)
   - Recommendation: For Phase 2, implement on-demand purge in the consume route (expired link path). Document that a future cleanup cron is needed for SECR-02 full compliance. Flag this in PLAN.md.

2. **Magic link consumption route — page vs. API route**
   - What we know: The consumption endpoint issues a cookie and redirects to the event page. This is a GET request (link in email). Next.js Route Handlers handle GET fine.
   - What's unclear: Whether the consumption should be at `/api/...` (Route Handler) or `/e/[id]/magic` (Page that does server-side logic). Both work.
   - Recommendation: Use a Route Handler at `/api/participants/magic-link/consume` that issues the cookie and then calls `redirect()` from `next/navigation`. This keeps auth logic in Route Handlers (established pattern per prior decisions).

3. **Session token entropy**
   - What we know: `crypto.randomUUID()` produces 122 bits of entropy; two concatenated produce 244 bits.
   - What's unclear: Whether 64-char hex (256 bits from `randomBytes(32)`) is preferred over UUID concatenation.
   - Recommendation: Use `randomBytes(32).toString('hex')` from Node.js `crypto` for a clean 64-char hex token. Simpler and unambiguous.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (nextjs.org/docs/app/api-reference/functions/cookies) — cookies() async API, Route Handler cookie setting, Next.js 15 changes; dated 2026-02-11
- Vaul API docs (vaul.emilkowal.ski/api) — Drawer.Root props: open, onOpenChange, dismissible, repositionInputs, onAnimationEnd, snapPoints
- shadcn Drawer docs (ui.shadcn.com/docs/components/drawer) — subcomponent list, vaul dependency confirmed
- shadcn input-otp docs (ui.shadcn.com/docs/components/input-otp) — InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS, controlled state
- Resend official docs (resend.com/docs/send-with-nextjs) — resend.emails.send() API, Route Handler pattern
- @node-rs/argon2 README (github.com/napi-rs/node-rs/blob/main/packages/argon2/README.md) — hash(), verify(), memoryCost parameter
- Upstash ratelimit README (github.com/upstash/ratelimit-js) — Ratelimit.slidingWindow(), limit() with compound identifiers, prefix configuration
- Next.js serverExternalPackages docs (nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — stable in Next.js 15

### Secondary (MEDIUM confidence)
- Next.js GitHub Discussion #65996 — confirms `@node-rs/argon2-wasm32-wasi` error and resolution (`server-only` + `serverExternalPackages`)
- WebSearch: sonner is shadcn's current canonical toast (multiple sources agree, including Jan 2026 article)
- WebSearch: `motion` (npm package) is the React 19-compatible successor to `framer-motion`; import from `motion/react`

### Tertiary (LOW confidence)
- Email purge "on-demand in consume route" pattern — inferred from schema design and SECR-02 requirement; no official source; flagged as open question
- 400ms delay for sheet sequencing — based on typical CSS transition durations; should be verified against actual vaul animation timing in implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs or GitHub READMEs
- Architecture: HIGH — patterns follow established project conventions (Route Handlers for auth, server-only for sensitive ops)
- Pitfalls: HIGH for WASM error and async cookies (official sources); MEDIUM for sheet sequencing timing (implementation detail)
- vaul maintenance note: MEDIUM — confirmed from GitHub README; risk mitigated by using shadcn wrapper

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (30 days — stable libraries; motion/react import path is the newest change worth re-checking)
