# Technology Research: Timely

**Project:** Timely — group availability scheduling (no-account, PIN-based)
**Researched:** 2026-02-17
**Overall Confidence:** HIGH (most claims verified against official docs or multiple sources)

---

## 1. Next.js: App Router vs Pages Router

**Recommendation: App Router (Next.js 15)**

### Verdict

Use the App Router. It is the official forward direction for Next.js, and as of Next.js 15 the rough edges from the 13/14 era are mostly resolved. Pages Router will be maintained but receives no new features.

### Why App Router Fits Timely

- **Server Components by default** — event data fetching (loading an event page, rendering the heatmap server-side) happens without client JS overhead. Ideal for the shareable link flow where responders arrive cold.
- **Server Actions** — form submissions (creating an event, saving availability) map cleanly to Server Actions instead of requiring a separate `/api` route. Less boilerplate, built-in CSRF protection.
- **Nested layouts** — a single `EventLayout` can wrap creator and responder views without re-mounting navigation.
- **React 19 compatibility** — concurrent features, `useOptimistic` for the availability grid, `useFormStatus` for submit states.

### Performance Caveat

Community benchmarks show Pages Router has ~2.5x higher request throughput in raw SSR benchmarks (GitHub discussion #67048). For Timely's traffic profile (small groups, infrequent bursts) this difference is irrelevant. Choose App Router for the DX and feature access.

### Packages

```bash
npx create-next-app@latest timely --typescript --tailwind --app
# Ships Next.js 15, React 19, TypeScript 5
```

---

## 2. Database

**Recommendation: Neon (serverless Postgres) + Drizzle ORM**

### Database: Neon

Neon is serverless Postgres with scale-to-zero. Vercel Postgres is powered by Neon under the hood; using Neon directly gives you more pricing control and portability.

**Why Neon over alternatives:**

| Option | Why Not |
|--------|---------|
| PlanetScale (MySQL) | MySQL quirks, schema change workflow overkill for this scale |
| Turso (SQLite/libSQL) | Edge replication is nice but SQLite has friction with complex JSON queries; Postgres ecosystem is richer |
| Supabase | Full platform with auth, storage, etc. — brings overhead Timely doesn't need since we're not using their auth |
| Vercel KV (Redis) | Not relational; heatmap overlap calculations benefit from SQL aggregation |

**Free tier (verified 2026-02-17 at neon.com/pricing):**
- 100 CU-hours/month per project
- 0.5 GB storage per project
- Scale-to-zero after 5 minutes idle
- 10 branches per project
- Sufficient for development and early production traffic

**Serverless connection:** Use `@neondatabase/serverless` (HTTP driver) — avoids TCP connection pool exhaustion in serverless functions.

```bash
npm install @neondatabase/serverless
```

### ORM: Drizzle

Drizzle is a TypeScript-first, SQL-adjacent ORM with first-class Neon support. Official tutorial exists at orm.drizzle.team/docs/tutorials/drizzle-nextjs-neon.

**Why Drizzle over Prisma:**
- No separate query engine binary — pure JS, works in Edge runtime
- Drizzle's query syntax is closer to SQL, making the heatmap aggregation queries readable
- Smaller bundle footprint
- Neon HTTP driver integration is first-class

**Why Drizzle over raw SQL:**
- Type-safe queries (schema → TypeScript types)
- Migration tooling via `drizzle-kit`
- Schema-as-code stays in the repo

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### Schema sketch (key tables)

```typescript
// events: id, slug, title, timezone, date_range or specific_dates[], expires_at
// availability: event_id, responder_name, pin_hash, slots (jsonb or normalized rows)
// magic_links: token, event_id, responder_name, expires_at, used_at
```

Store availability as a JSONB column for the slot grid (fast writes, easy to read back per-responder). Compute the heatmap overlap in the application layer or with a simple SQL count over normalized rows — benchmark both at schema design time.

---

## 3. Hosting and Deployment

**Recommendation: Vercel Hobby → Pro as needed**

Vercel is the natural choice for a Next.js project. The Hobby plan is sufficient for Timely at launch.

**Hobby plan limits (verified against vercel.com/docs/plans/hobby, 2026):**
- Serverless Functions: 60-second timeout
- Edge Functions: 25-second streaming start
- Cron jobs: once per day maximum
- 10 million Edge Requests/month

**Timely's needs vs limits:**
- No heavy cron jobs required (magic link expiry can be lazy-deleted on access)
- Serverless function timeout is not an issue for availability reads/writes
- Edge Requests are more than sufficient for a small-group scheduling tool

**Domain:** Custom domain works on Hobby. Use Vercel's automatic SSL.

**If traffic grows:** Upgrade to Vercel Pro ($20/month). Neon's pricing also scales smoothly.

**Alternative considered:** Railway or Render. Both are viable but require more DevOps thought for a Next.js app that benefits from Vercel's edge network and Next.js-specific optimizations. Vercel is the correct default.

---

## 4. Email Service (Magic Links)

**Recommendation: Resend**

### Why Resend

- **React Email integration** — write magic link emails as React components using `@react-email/components`. Consistent with the project's React stack. No Mustache/Handlebars templates.
- **Next.js SDK** — first-class support; official guides target Next.js.
- **Free tier (verified 2026-02-17 at resend.com/pricing):** 3,000 emails/month, 1 custom domain, 100 emails/day cap. Well above Timely's needs.
- **Developer experience** — clean REST API, good docs, TypeScript types.

### Why Not Postmark

Postmark has better deliverability reputation and sub-second delivery times, which matters for high-stakes auth flows. For Timely's use case (magic link fallback, not primary auth), Resend's deliverability is adequate and the DX advantage is decisive.

### Magic Link Flow (no accounts)

1. Responder enters name + 4-digit PIN — primary auth, no email needed
2. If responder loses PIN: enter name + email → receive magic link → link sets a session cookie scoped to that event
3. Resend sends a simple transactional email from your domain

```bash
npm install resend @react-email/components
```

**Email volume estimate:** For 4-10 person groups, even at 1,000 events/month with 20% magic-link fallback rate, that's ~2,000 emails/month — within free tier.

---

## 5. Styling Approach

**Recommendation: Tailwind CSS v4 + CSS custom properties for the warm palette**

### Tailwind CSS v4

Tailwind v4 reached stable release in 2025 and is the current version. Key changes vs v3:

- **CSS-first config** — theme is defined in CSS with `@theme` instead of `tailwind.config.js`. Cleaner, fewer files.
- **No manual content array** — automatic class detection.
- **`@import "tailwindcss"`** replaces `@tailwind` directives.
- **5x faster full builds, 100x faster incremental** (Oxide engine).
- Works with Next.js 15 via `@tailwindcss/postcss`.

```bash
npm install tailwindcss @tailwindcss/postcss
```

**Warm aesthetic implementation:**

Define the palette in `globals.css` using Tailwind v4's CSS theme:

```css
@import "tailwindcss";

@theme {
  --color-warm-50: oklch(98% 0.01 60);
  --color-warm-100: oklch(95% 0.02 60);
  --color-warm-500: oklch(70% 0.12 60);
  --color-warm-900: oklch(20% 0.04 60);
  --color-accent: oklch(65% 0.18 30); /* amber-orange */

  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --radius-ui: 0.5rem;
}
```

Use `oklch()` color space for perceptually uniform warm tones. This is how Linear and Cal.com achieve their clean palettes — not by using a preset Tailwind palette, but custom values.

### No CSS Modules

Avoid CSS Modules for this project. Tailwind utility classes cover 95% of needs. Reserve `@layer components` for truly complex, repeated patterns (e.g., the availability grid cell style).

---

## 6. Component Library

**Recommendation: shadcn/ui (with Radix UI primitives underneath)**

### Why shadcn/ui

- **Code ownership** — components are copied into your project, not a black-box dependency. You can adjust the warm aesthetic without fighting a component library's opinion.
- **Tailwind-native** — v4 compatible. shadcn components are utility-class-based.
- **Radix primitives underneath** — Dialog, Popover, Select, Tooltip etc. all have correct ARIA roles and keyboard navigation for free.
- **Zero runtime overhead** — no CSS-in-JS, no runtime theme object.
- **Active in 2026** — most widely adopted headless+styled component system for React projects.

### What to pull from shadcn/ui

```bash
npx shadcn@latest add button input dialog tooltip
```

- `Button` — CTA actions (Create event, Submit availability)
- `Input` — name, PIN entry fields
- `Dialog` / `Sheet` — mobile-friendly modals (time slot details, confirm)
- `Tooltip` — hover state on heatmap cells
- `Badge` — showing responder count
- `Skeleton` — loading states for the grid

### What to build custom

- **Availability grid** — shadcn has no time-grid component; build this yourself (see Section 7)
- **Heatmap color scale** — pure CSS + Tailwind custom colors; no library needed

### Font

Use **Inter Variable** (`@fontsource-variable/inter`) — same font as Linear. Slightly warmer than system-ui on Windows.

```bash
npm install @fontsource-variable/inter
```

---

## 7. Availability Grid UI

**Recommendation: Build custom with pointer events; do not use react-schedule-selector**

### Why Not react-schedule-selector

The `react-schedule-selector` package (bibekg/react-schedule-selector) is **abandoned**. Last commit: December 2022. Last release: May 2018 (v1.1.0). 13 open issues, 19 unmerged PRs. Built with styled-components (adds runtime overhead, conflicts with Tailwind). Do not use.

The `react-draggable-selector` package (lerrybe/react-draggable-selector) is also minimally maintained (last release August 2023, 18 GitHub stars) with no confirmed touch support. Do not use.

### Custom Grid Implementation

The availability grid is Timely's core UI and should be owned directly. It is not complex to implement:

**Approach:** CSS Grid layout + Pointer Events API

```typescript
// Pointer events give you unified mouse + touch in a single handler
// onPointerDown → start selection, set "painting" state
// onPointerEnter (on each cell) → toggle cell if painting
// onPointerUp (on document) → end selection
// onPointerCancel → reset

const [painting, setPainting] = useState<'select' | 'deselect' | null>(null);
const [selected, setSelected] = useState<Set<string>>(new Set());

const handleCellPointerDown = (cellId: string) => {
  const next = selected.has(cellId) ? 'deselect' : 'select';
  setPainting(next);
  toggleCell(cellId, next);
};

const handleCellPointerEnter = (cellId: string) => {
  if (painting) toggleCell(cellId, painting);
};
```

**Mobile considerations:**
- Set `touch-action: none` on the grid container to prevent scroll interference during drag
- Use `onPointerDown`/`onPointerEnter` instead of mouse or touch events
- Pointer capture (`element.setPointerCapture(event.pointerId)`) keeps events firing even when finger leaves a cell boundary

**Grid structure:**

```
Columns: one per day (or date)
Rows: one per time slot (e.g., 15-minute increments)
Cells: ~30px × 30px minimum (thumb-friendly)
```

**State shape:**

```typescript
type SlotId = `${dateISO}T${HH:MM}`; // e.g. "2026-03-15T14:00"
type Availability = Record<string, Set<SlotId>>; // name → selected slots
```

### Heatmap Overlay

When displaying aggregated availability (creator view), map responder count → color intensity:

```typescript
const heatColor = (count: number, total: number): string => {
  const ratio = count / total;
  // Use oklch() for perceptually uniform interpolation
  // 0 → warm-100 (near white), 1 → accent-500 (saturated amber)
};
```

### Libraries That Are Acceptable Helpers

- **`date-fns`** — date arithmetic for generating the grid headers (time slots, date columns). Stable, tree-shakeable, no dependencies.
- **`@internationalized/date`** — (from Adobe's React Aria) for timezone-aware date handling if timezone support is required in v1.

```bash
npm install date-fns
```

---

## 8. State Management

**Recommendation: React built-in state + Zustand for grid selection state**

### Rationale

Timely is not a complex app. Most state is server-derived (event data, existing availability). Only the availability grid has genuinely interactive local state that benefits from a store.

**Use React built-in (`useState`, `useReducer`) for:**
- Form inputs (name, PIN, event title/dates)
- UI state (loading, modal open/close)
- Fetched data (pass as props from Server Components)

**Use Zustand for:**
- The painting/selection state of the availability grid (drag gesture across cells)
- The in-progress availability set before submission
- Undo/redo history for cell selection (nice-to-have)

Zustand is preferred over Jotai here because the grid selection state is tightly coupled (painting mode, current selection, total slot list) and maps naturally to a single store slice. Jotai's atomic model adds indirection without benefit for this use case.

```bash
npm install zustand
```

**No React Query / SWR needed initially.** Next.js App Router's `fetch` with caching covers data fetching. Add SWR if client-side polling for new responders becomes a requirement.

---

## 9. Additional Libraries

### Form Validation

**`zod`** for schema validation on both server (Server Actions) and client.

```bash
npm install zod
```

### PIN Hashing

**`bcryptjs`** (pure JS, no native addon) for hashing the 4-digit PIN before storage. A 4-digit PIN is low-entropy; store the hash and use bcrypt's timing-safe comparison.

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### Token Generation (Magic Links)

**`crypto.randomBytes`** from Node.js built-in — no package needed. Generate a 32-byte hex token, store hash in DB, send raw token in URL.

### Date/Time

**`date-fns`** for date arithmetic in grid generation. Avoid `moment` (unmaintained, large bundle).

### Animations

**`tailwindcss-animate`** (ships with shadcn/ui) for entry/exit transitions. Do not add Framer Motion — it's heavy and unnecessary for the warm-minimal aesthetic.

---

## 10. TypeScript Configuration

Use **strict mode**. With Drizzle, Zod, and Server Actions, the type chain from DB schema → API → UI is valuable. Do not loosen TypeScript to make development faster.

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"]
  }
}
```

---

## Full Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js (App Router) | 15.x | Server Components, Server Actions, Vercel-native |
| Language | TypeScript | 5.x | Type safety across DB → UI |
| Database | Neon (serverless Postgres) | current | Scale-to-zero, free tier, Postgres ecosystem |
| ORM | Drizzle ORM | 0.x | Lightweight, Edge-compatible, type-safe |
| Hosting | Vercel | — | Native Next.js, free Hobby plan |
| Email | Resend | current | React Email templates, 3k/mo free |
| Styling | Tailwind CSS v4 | 4.x | CSS-first config, fast builds |
| Components | shadcn/ui | current | Code-owned, Tailwind-native, Radix underneath |
| State | Zustand | 5.x | Grid selection state only |
| Forms | Zod | 3.x | Schema validation both sides |
| Dates | date-fns | 4.x | Tree-shakeable, no deps |
| Font | Inter Variable | — | Warm, clean, matches Linear/Cal.com aesthetic |

---

## Installation Sequence

```bash
# 1. Scaffold
npx create-next-app@latest timely --typescript --tailwind --app --src-dir

# 2. Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# 3. Validation
npm install zod

# 4. Auth utilities
npm install bcryptjs
npm install -D @types/bcryptjs

# 5. Dates
npm install date-fns

# 6. State
npm install zustand

# 7. Email
npm install resend @react-email/components

# 8. shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input dialog tooltip badge skeleton

# 9. Font
npm install @fontsource-variable/inter
```

---

## Decisions Explicitly Deferred

| Decision | Why Deferred |
|----------|-------------|
| Prisma vs Drizzle deeper evaluation | Drizzle is the correct call for Edge compatibility; revisit only if type inference proves limiting |
| React Query / SWR | Add only when real-time responder updates become a feature requirement |
| Framer Motion | Add only if animation requirements grow beyond CSS transitions |
| Internationalization (i18n) | Not in scope for v1; Timely's audience is likely English-first |
| Upstash Redis for rate limiting | Add when magic link endpoint abuse becomes a concern |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|-----------|--------|
| Next.js App Router recommendation | HIGH | Next.js official docs, GitHub discussions |
| Neon free tier limits | HIGH | Verified at neon.com/pricing (2026-02-17) |
| Drizzle + Neon integration | HIGH | Official Drizzle docs, Neon docs |
| Resend free tier | HIGH | Verified at resend.com/pricing (2026-02-17) |
| Tailwind v4 stability | HIGH | Official tailwindcss.com release post |
| shadcn/ui recommendation | HIGH | Multiple 2026 sources, official docs |
| react-schedule-selector abandoned | HIGH | GitHub repo inspection — last commit Dec 2022 |
| Custom grid pointer events approach | MEDIUM | Pattern verified in community articles; implementation detail is project-specific |
| Vercel Hobby plan limits | MEDIUM | Verified against Vercel docs, some limits had conflicting values across sources |

---

## Sources

- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Next.js 15 release notes](https://nextjs.org/blog/next-15)
- [Next.js App Router vs Pages Router — GitHub Discussion #59373](https://github.com/vercel/next.js/discussions/59373)
- [Neon Pricing](https://neon.com/pricing)
- [Drizzle ORM + Neon tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-nextjs-neon)
- [Drizzle ORM + Neon connection guide](https://neon.com/docs/guides/drizzle)
- [Resend Pricing](https://resend.com/pricing)
- [Tailwind CSS v4.0 release post](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS + Next.js install guide](https://tailwindcss.com/docs/guides/nextjs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
- [react-schedule-selector (abandoned)](https://github.com/bibekg/react-schedule-selector)
- [react-draggable-selector (limited maintenance)](https://github.com/lerrybe/react-draggable-selector)
- [React drag-to-select (Joshua Wootonn)](https://www.joshuawootonn.com/react-drag-to-select)
