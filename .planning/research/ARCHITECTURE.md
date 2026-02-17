# Architecture Patterns

**Project:** Timely
**Domain:** Group availability scheduling (When2meet competitor)
**Researched:** 2026-02-17
**Confidence:** HIGH for data model and security; MEDIUM for heatmap storage tradeoffs

---

## Recommended Architecture

Timely is a stateful CRUD application with a light computation layer (heatmap aggregation). It maps cleanly to a monolithic Next.js deployment with a single PostgreSQL database. No microservices, no separate backends — the Next.js app handles everything through API Route Handlers.

```
Browser (React)
    │
    │ HTTP (JSON)
    ▼
Next.js App Router (Vercel / Node)
    ├── app/  (pages, layouts)
    ├── app/api/  (Route Handlers — REST-style)
    └── lib/  (data access, hashing, tokens)
        │
        │ Prisma ORM
        ▼
PostgreSQL (Neon / Supabase)
```

### Why Not tRPC

tRPC is excellent but adds a layer of complexity that doesn't pay off here. Timely has a small, stable API surface (create event, respond, edit availability, verify PIN, generate/consume magic link). These endpoints will also need to be callable from public share links — bare URL-based. tRPC's RPC convention adds friction at the URL layer.

Use **Next.js Route Handlers** (REST-style). Simple, cacheable, works with any client (browser, curl, future mobile app). The API surface is small enough that manual typing is trivial.

**Server Actions** are appropriate only for form mutations inside authenticated sessions. Timely's PIN verification flow is stateful per request, so Route Handlers win for clarity and debuggability.

---

## Data Model

### Core Entities

```
Event
  id              String   @id (nanoid, 10 chars)
  title           String
  description     String?
  creator_name    String
  creator_email   String?
  date_mode       Enum     (SPECIFIC_DATES | DATE_RANGE)
  range_start     DateTime?  // used when date_mode = DATE_RANGE
  range_end       DateTime?
  slot_duration   Int      @default(30)  // minutes per time slot
  day_start       Int      @default(9)   // hour of day (0–23)
  day_end         Int      @default(21)
  timezone        String   // IANA tz e.g. "America/New_York"
  status          Enum     (OPEN | CLOSED | CONFIRMED)
  confirmed_slot  DateTime?
  created_at      DateTime @default(now())
  expires_at      DateTime  // auto-cleanup after N days

  dates           EventDate[]
  participants    Participant[]

Participant
  id              String   @id @default(cuid2())
  event_id        String
  name            String   // display name, unique per event
  pin_hash        String   // argon2id hash of 4-digit PIN
  email           String?  // optional, for magic link
  timezone        String?  // participant's local timezone
  submitted_at    DateTime?
  created_at      DateTime @default(now())

  event           Event
  availability    Availability[]
  magic_tokens    MagicToken[]

  @@unique([event_id, name])  // names unique within event

EventDate
  id              String   @id @default(cuid2())
  event_id        String
  date            Date     // specific date (DATE_RANGE generates these at render time OR stores expanded)
  sort_order      Int

  event           Event
  // NOTE: see "Date Range Expansion" below

Availability
  id              String   @id @default(cuid2())
  participant_id  String
  event_id        String   // denormalized for query efficiency
  slot_start      DateTime // UTC, precise slot start
  is_available    Boolean  @default(true)

  participant     Participant
  event           Event

  @@unique([participant_id, slot_start])  // one record per slot per participant
  @@index([event_id, slot_start])         // heatmap queries scan by event

MagicToken
  id              String   @id @default(cuid2())
  token           String   @unique  // 32-byte random hex, hashed for storage
  token_hash      String   // SHA-256 of the raw token (stored; raw sent in email)
  participant_id  String
  event_id        String
  created_at      DateTime @default(now())
  expires_at      DateTime  // 24 hours
  used_at         DateTime?  // null = still valid; set on consumption

  participant     Participant
```

### Design Rationale

**Availability as rows, not a bitmask.** A bitfield/bitmask approach stores each participant's availability as a single integer column, querying via bitwise operations. This is memory-efficient but has significant downsides: it becomes unreadable, is hard to migrate if slot duration changes, and makes partial updates painful. For Timely's scale (≤10 participants, ≤100 slots), individual rows are the right call. The `@@index([event_id, slot_start])` index makes heatmap aggregation a single GROUP BY query.

**`slot_start` as UTC DateTime.** Each slot is stored as an absolute UTC timestamp, never as "hour 9 on date X" in a local timezone. This sidesteps participant timezone confusion entirely: whatever timezone a participant marks, we convert to UTC before storage. Display converts back from UTC to each viewer's local timezone.

**Event ID as nanoid (10 chars).** A 10-character nanoid (A–Za–z0–9) gives ~73 bits of entropy — effectively zero collision risk at Timely's scale, and it produces short shareable URLs like `/event/v4tXk2mRpq`. Avoid sequential IDs (guessable) and full UUIDs (ugly in URLs).

**EventDate for specific-dates mode.** When the creator picks specific dates, they are stored as `EventDate` rows. For date-range mode, the available dates are computed at query time from `range_start`/`range_end` rather than pre-expanded — this keeps the schema clean and avoids storing potentially large date sets.

---

## Event URL Scheme

```
/event/[eventId]              → public availability view / respond form
/event/[eventId]/results      → heatmap results view (link shared by creator)
/event/[eventId]/admin        → creator view (confirm time, see response status)
```

Use a **10-character nanoid** for `eventId`. This is:
- Short enough to share by voice or screenshot
- Long enough to be collision-resistant
- URL-safe without encoding

Do NOT use slugs (collision-prone, requires uniqueness enforcement, slower lookup) or full UUIDs (36 characters, ugly). Nanoid wins on all axes for this use case.

```typescript
// lib/id.ts
import { nanoid } from 'nanoid';

export const generateEventId = () => nanoid(10);
// Output: "v4tXk2mRpq"
```

---

## Availability Grid Data Structure

### Storage

Each time slot a participant marks as available or unavailable is stored as a single `Availability` row with a `slot_start` UTC DateTime. This is a **sparse positive** model — only available slots are stored (absent = unavailable), though storing explicit boolean allows "I explicitly marked unavailable" vs "I never responded" distinction if needed.

For a 7-day event with 30-minute slots from 9am–9pm, that is:
- 7 days × 24 slots/day = 168 slots per participant
- 10 participants × 168 = 1,680 rows max per event

This is trivially small. Row-per-slot is the right choice.

### Heatmap Computation

Compute heatmaps **server-side at query time**. For Timely's scale, a single SQL query suffices:

```sql
SELECT
  slot_start,
  COUNT(*) AS available_count,
  COUNT(DISTINCT p.id) FILTER (WHERE a.id IS NULL) AS not_responded_count
FROM generate_series(
  $event_start, $event_end, interval '30 minutes'
) AS slot_start
LEFT JOIN availability a ON a.slot_start = slot_start AND a.event_id = $event_id
LEFT JOIN participants p ON p.event_id = $event_id
GROUP BY slot_start
ORDER BY slot_start;
```

Or more pragmatically with Prisma/Drizzle using a `groupBy`:

```typescript
// lib/heatmap.ts
export async function computeHeatmap(eventId: string) {
  const slots = await db.availability.groupBy({
    by: ['slot_start'],
    where: { event_id: eventId, is_available: true },
    _count: { participant_id: true },
    orderBy: { slot_start: 'asc' },
  });
  return slots; // [{ slot_start: Date, _count: { participant_id: 4 } }]
}
```

Return the raw slot counts to the client. The client maps counts to color intensity for the heatmap visualization. This is appropriate because color rendering belongs in the UI layer.

**Do not cache heatmap data** for v1. With ≤10 participants and ≤168 slots, the query is sub-millisecond. Add Redis caching only if profiling reveals it as a bottleneck (it won't be).

---

## API Design

Use **Next.js App Router Route Handlers** (REST-style). No tRPC, no GraphQL.

### Route Structure

```
POST   /api/events                          → create event, returns { eventId }
GET    /api/events/[eventId]                → fetch event + participant list + heatmap
POST   /api/events/[eventId]/participants   → register name + PIN, returns { participantId, sessionToken }
POST   /api/events/[eventId]/participants/[participantId]/verify  → verify PIN, returns { sessionToken }
GET    /api/events/[eventId]/participants/[participantId]/availability  → get participant's slots
PUT    /api/events/[eventId]/participants/[participantId]/availability  → replace availability slots
POST   /api/events/[eventId]/magic-link     → request magic link (email)
GET    /api/magic/[token]                   → consume magic link, redirect + set session
POST   /api/events/[eventId]/confirm        → creator confirms winning slot
```

### Session Model

Timely is "no accounts" but still needs to know which participant is editing. Use a **short-lived session token** stored in an `httpOnly` cookie:

1. Participant registers name + PIN → server creates `Participant` record, returns a session token (random 32 bytes, stored in a separate `sessions` table or as a signed JWT).
2. Session token is sent as an `httpOnly` cookie with `SameSite=Lax`.
3. Subsequent requests to edit availability include the cookie automatically.
4. Session expires after 7 days (or event expiry, whichever is sooner).

**No JWT for sessions.** A JWT would require the server to trust its own secret and can't be revoked. A database-backed session token is simpler to reason about and can be invalidated immediately (e.g., after magic link consumption).

---

## PIN Hashing and Security

### Algorithm: Argon2id

Use **argon2id**, not bcrypt. Argon2id won the 2015 Password Hashing Competition and is the OWASP 2025 recommendation. It is memory-hard (resists GPU attacks) and has a configurable memory cost.

The fundamental weakness of 4-digit PINs is the keyspace (10,000 combinations). Hashing alone cannot fix this — a motivated attacker with the database can brute-force all 10,000 values offline. Argon2id's memory-hardness makes each attempt expensive enough to matter.

**OWASP recommended minimum parameters:**
```typescript
// lib/pin.ts
import argon2 from 'argon2';

export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 19456,  // 19 MiB (OWASP minimum)
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  return argon2.verify(hash, pin);
}
```

### PIN Security Layers (Defense in Depth)

Because PINs are low entropy, hashing alone is insufficient. Implement ALL of the following:

1. **Rate limiting on PIN verification endpoint:** 5 attempts per 15-minute window per (event_id + participant_name). Use Upstash Rate Limit with Redis for serverless compatibility.
2. **Account lockout after 10 failed attempts:** Lock the participant record and require magic link to unlock.
3. **Never transmit PIN in plaintext after creation:** The PIN is entered once, verified once, and never shown again. Store only the hash.
4. **PIN is per-event:** A PIN on one event gives no access to any other event, even with the same name.

---

## Magic Link Token Lifecycle

```
1. Participant requests magic link (POST /api/events/[eventId]/magic-link)
   - Requires: event_id, participant name
   - If email on file: generate token, email link
   - If no email on file: prompt participant to enter email first

2. Token generation
   - 32 cryptographically random bytes (crypto.getRandomValues or Node crypto.randomBytes)
   - Stored as SHA-256 hash in MagicToken table
   - Raw token sent in URL: /api/magic/[rawToken]
   - Expires in 24 hours

3. Token consumption (GET /api/magic/[rawToken])
   - Hash the incoming token, look up MagicToken by hash
   - Verify: not expired, not yet used, event not closed
   - Mark used_at = now()
   - Create a session for the participant (same session cookie mechanism as PIN flow)
   - Redirect to /event/[eventId] with editing enabled

4. Cleanup
   - Delete expired/used tokens in a scheduled job or lazily on lookup
```

```typescript
// lib/magic-token.ts
import { randomBytes, createHash } from 'crypto';

export function generateMagicToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex'); // 64-char hex string
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
```

**Single-use enforcement:** Setting `used_at` at consumption time is the lock. The lookup query filters on `used_at IS NULL AND expires_at > NOW()`. There is no race condition risk at Timely's scale — but if needed, a database transaction with a SELECT FOR UPDATE would prevent double-consumption.

**Do not use JWT for magic links.** JWTs can't be invalidated and have had numerous implementation vulnerabilities. A database-backed opaque token is the safe, auditable choice.

---

## Timezone Handling

### Strategy: Store UTC, Display Local

**All `slot_start` values in the database are UTC.** There is no ambiguity, no DST confusion, and no "which timezone did this user mean?" problem.

**Timezone responsibilities:**

| Actor | Responsibility |
|-------|---------------|
| Creator | Sets the event timezone (IANA string, e.g. `"America/New_York"`) when creating the event |
| Responder | Browser detects their local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| UI | Displays the grid in the viewer's detected timezone |
| API | Accepts slot selections as UTC DateTime strings (ISO 8601) |
| Heatmap | Aggregated in UTC, rendered in viewer's timezone |

**Creator timezone is the canonical timezone for the event.** The grid is defined in the creator's timezone (day_start = 9am in their zone). Responders see the same absolute time slots converted to their local timezone. This matches how When2meet and Doodle handle it.

**Timezone conversion in the browser:**
```typescript
// Convert a UTC slot_start to display string in viewer's timezone
const display = new Intl.DateTimeFormat('en-US', {
  timeZone: viewerTimezone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(slot_start_utc));
```

**Use `date-fns-tz` for any server-side timezone math** (converting creator's "9am" to UTC when generating slot series). The Temporal API is not yet universally available in Node.js runtimes as of early 2026 — ship with `date-fns-tz` and migrate to Temporal when it stabilizes in the runtime.

---

## ORM: Prisma

Use **Prisma** over Drizzle for this project. Rationale:

- Prisma's schema file is readable without TypeScript knowledge — the `schema.prisma` format is self-documenting and easier to discuss
- `prisma migrate dev` provides reliable, version-controlled migrations with no extra tooling
- Prisma's generated client is fully type-safe and integrates naturally with Next.js App Router
- Timely is NOT a serverless-at-scale application — cold-start performance (Drizzle's primary advantage) is not a concern here

Drizzle would be the choice if deploying to Cloudflare Workers with edge-optimized SQL. Timely deploys to Vercel Node.js functions where Prisma runs fine.

---

## Mobile-First Responsive Architecture

### Layout Strategy

Design for 375px viewport width (iPhone SE) as the baseline. The availability grid is the most mobile-hostile UI element — it must be scrollable and touch-friendly.

**Grid scrolling:** Wrap the time grid in a horizontally scrollable container. Freeze the time axis column using CSS `position: sticky; left: 0`. Date headers scroll with the grid.

```css
.grid-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* iOS momentum scroll */
}

.time-column {
  position: sticky;
  left: 0;
  z-index: 10;
  background: white; /* prevent bleed-through */
}
```

**Touch interaction for availability marking:** Use pointer events, not mouse events. Allow drag-to-select by tracking `pointerdown`, `pointermove`, `pointerup`. This handles both touch and mouse with a single event handler chain.

```typescript
// components/AvailabilityGrid.tsx (pattern)
const [isDragging, setIsDragging] = useState(false);
const [dragValue, setDragValue] = useState<boolean | null>(null); // mark as avail or unavail

const handlePointerDown = (slotId: string) => {
  const currentValue = selectedSlots.has(slotId);
  setDragValue(!currentValue); // toggle direction determined by first cell
  setIsDragging(true);
  toggleSlot(slotId, !currentValue);
};

const handlePointerEnter = (slotId: string) => {
  if (isDragging && dragValue !== null) {
    toggleSlot(slotId, dragValue);
  }
};
```

**Minimum touch target size:** 44px × 44px (Apple HIG minimum). With 30-minute slots displayed at ~44px height and column widths of 48px minimum, this is achievable.

### Tailwind Breakpoints

Use Tailwind CSS with mobile-first breakpoints. No custom breakpoints needed:

```
Default (0px+): mobile layout
sm: (640px+): nothing major changes
md: (768px+): wider grid columns, larger slot cells
lg: (1024px+): optional sidebar layout for results
```

### Performance on Mobile

- Use Next.js `Image` component for any assets
- Avoid large client-side bundles — the availability grid computation runs on the server
- No real-time updates (WebSocket) in v1 — page refresh is the update mechanism
- `loading="eager"` for the event grid (above-fold, primary content)

---

## Component Boundaries

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `app/event/[id]/page.tsx` | Route entry, data fetch | Server component; passes data to client grid |
| `components/AvailabilityGrid` | Touch-interactive slot selection | Client component; manages local state |
| `components/HeatmapGrid` | Read-only color intensity display | Client component; takes pre-computed counts |
| `components/ParticipantForm` | Name + PIN entry, validation | Client component |
| `components/EventCreator` | Multi-step event creation flow | Client component with multi-step state |
| `lib/db.ts` | Prisma client singleton | Server-only |
| `lib/pin.ts` | hashPin, verifyPin | Server-only (argon2) |
| `lib/magic-token.ts` | generateMagicToken, hashToken | Server-only |
| `lib/heatmap.ts` | computeHeatmap | Server-only |
| `lib/id.ts` | generateEventId (nanoid) | Shared |
| `lib/timezone.ts` | UTC conversion helpers | Shared (date-fns-tz) |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Availability as a Bitmask

**What:** Encoding a participant's availability as a single integer where each bit represents a time slot.
**Why bad:** Requires bitwise SQL operators, breaks when slot duration changes, can't easily query "who is free at slot X", makes debugging opaque.
**Instead:** One row per slot per participant with a `slot_start` DateTime column and a covering index.

### Anti-Pattern 2: Storing Times in Local Timezone

**What:** Saving "9:00 AM" without a timezone reference, or using the creator's local offset.
**Why bad:** DST transitions shift slots by an hour; participants in other timezones see incorrect times; queries for overlapping slots require timezone-aware comparisons.
**Instead:** All times stored as UTC ISO 8601 DateTimes. Convert at the display layer.

### Anti-Pattern 3: Using JWT for Session Tokens

**What:** Issuing a JWT after PIN verification and trusting it without a database lookup.
**Why bad:** JWTs cannot be revoked. If a magic link consumes a session, or a participant wants to log out all devices, there's no mechanism. JWTs also encourage storing sensitive state in the token payload (visible base64).
**Instead:** Opaque session tokens stored in the database as `httpOnly` cookies.

### Anti-Pattern 4: Client-Side PIN Comparison

**What:** Sending the stored PIN hash to the browser and comparing there.
**Why bad:** Exposes the hash to the client, enabling offline brute-force with no rate limiting.
**Instead:** PIN verification is always server-side. The client sends the PIN; the server compares against the stored hash and returns success/failure.

### Anti-Pattern 5: Inline Server Actions for Auth Flows

**What:** Using Next.js Server Actions to handle PIN verification or magic link consumption.
**Why bad:** Server Actions are POST-only, don't support proper HTTP status codes for auth failures (401, 403), and are harder to rate-limit at the edge.
**Instead:** Route Handlers for all auth-adjacent operations. Standard HTTP semantics.

---

## Scalability Considerations

| Concern | At 100 events | At 10K events | Notes |
|---------|---------------|---------------|-------|
| Database rows | ~170K availability rows | ~17M rows | Trivial for PostgreSQL |
| Heatmap query | <1ms | <10ms with index | Index on (event_id, slot_start) handles this |
| Event cleanup | Manual or cron | Scheduled deletion via `expires_at` | Events expire after 30 days |
| PIN brute force | Rate limit per IP | Rate limit per IP + Redis distributed | Upstash handles serverless rate limiting |
| Event ID collisions | Negligible | Negligible | 10-char nanoid = 10^18 collision resistance |

Timely will never need horizontal database sharding or microservices. The architecture described above will serve well into the tens of thousands of events without structural changes.

---

## Sources

- tRPC vs REST for Next.js: [Stop building REST APIs for Next.js apps](https://brockherion.dev/blog/posts/stop-building-rest-apis-for-your-next-apps/) (MEDIUM confidence — single post)
- Next.js Server Actions vs Route Handlers: [Vercel official blog](https://nextjs.org/blog/building-apis-with-nextjs) (HIGH confidence — official)
- Server Actions vs Route Handlers patterns: [makerkit.dev](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) (MEDIUM confidence)
- Argon2 vs bcrypt for low-entropy credentials: [Argon2 brute force analysis — identeco.de](https://identeco.de/en/blog/password-hashing-and-brute-force-attacks-on-argon2/) (HIGH confidence — technical analysis)
- OWASP Argon2 parameters: [Argon2 vs bcrypt guide — guptadeepak.com](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) (HIGH confidence — aligns with OWASP guidance)
- Magic link token lifecycle: [Clerk — Secure Auth with Magic Links](https://clerk.com/blog/secure-authentication-nextjs-email-magic-links) (HIGH confidence)
- nanoid / cuid2 collision resistance: [nanoid GitHub](https://github.com/ai/nanoid), [cuid2 GitHub](https://github.com/paralleldrive/cuid2) (HIGH confidence — official repos)
- Timezone handling in JavaScript: [Nylas timezone guide](https://www.nylas.com/blog/how-to-handle-timezones-with-javascript-dev/) (MEDIUM confidence)
- Prisma vs Drizzle 2025: [bytebase.com comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/) (MEDIUM confidence — third party)
- Rate limiting in Next.js: [peerlist.io rate limiting guide](https://peerlist.io/blog/engineering/how-to-implement-rate-limiting-in-nextjs) (MEDIUM confidence)
- Mobile-first Next.js patterns: [clouddevs.com mobile optimization guide](https://clouddevs.com/next/optimizing-for-mobile-devices/) (MEDIUM confidence)
