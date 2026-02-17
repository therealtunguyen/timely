# UX / Design Research: Timely

**Domain:** Mobile-first group scheduling, no-account availability grid
**Researched:** 2026-02-17
**Overall confidence:** HIGH (core patterns), MEDIUM (specific color decisions), HIGH (competitor analysis)

---

## 1. Competitor Landscape: What Exists and What Fails

### When2meet

**The canonical reference.** Everyone knows the interaction model — drag over cells to paint availability, green shows group overlap. But the implementation is deeply flawed on mobile:

- The mobile site is a pixel-for-pixel copy of the desktop layout. No responsive adaptation.
- The availability grid uses fine-grained 15-minute cells that are impossible to hit accurately with a finger.
- Drag-to-select relies on mousemove events, which don't map cleanly to touch. Accidental scrolls constantly interrupt selection.
- The visual design is circa-2006: no whitespace, flat green/pink coloring, no hierarchy.
- No save indicator — users don't know if changes persisted.
- Color scheme (red/green) is inaccessible to red-green colorblind users (~8% of men).

**What to steal:** The core interaction concept — paint cells by dragging — is highly learnable and fast. The mechanic is right; the execution is wrong.

### Doodle

- Mobile-optimized layout, responsive.
- Uses a simpler date poll model (not a time grid), which sidesteps the touch-drag problem entirely.
- The interface has become cluttered with ads and account-gate prompts.
- "Modern but cluttered" is the dominant user critique.
- Better on mobile precisely because it avoids fine-grained grid interaction.

**What to steal:** Account-free flow clarity, guided UX for poll creation.

### Crab.fit

- Open source, free, genuinely good grid interface.
- Uses an orange accent (#F79E00) with a clean minimal base — closest current competitor to Timely's target aesthetic.
- Has a live-updating heatmap.
- Grid creation flow: name event → click-drag calendar for dates → drag time range → share link.
- Has an Android app, indicating mobile was considered.
- The grid itself still suffers from touch-scroll conflict on mobile.

**What to steal:** Color warmth, open aesthetic, live update model.

### Rallly

- Clean, modern, multi-color accent system (indigo, pink, teal).
- Fully responsive, hamburger nav on mobile.
- Uses Inter/system fonts for readability.
- Touch-sized buttons and interactive elements.
- More of a date-poll tool (Doodle-style) than a time grid tool.
- UI/UX is well-reviewed; behavior differs between mobile and desktop configs.

**What to steal:** Polished mobile responsiveness, clean typography hierarchy.

### Timeful (formerly Schej)

- Emphasizes "clean, modern UI that works on desktop and mobile."
- Color-coded results view with clear group availability display.
- Positions itself explicitly against When2meet's dated feel.
- Limited public detail on the grid touch implementation.

**Key competitor gap:** None of the current tools do mobile-native touch-paint-select well. This is Timely's primary UX opportunity.

---

## 2. The Availability Grid: Touch Interaction

### The Core Problem

Desktop drag-to-select uses `mousemove`. Mobile needs `pointermove` or `touchmove`. The conflict: single-finger drag on mobile defaults to page scroll. This is why When2meet and every clone is broken on touch.

### Recommended Approach: Pointer Events API

Use the **Pointer Events API** (`onPointerDown`, `onPointerMove`, `onPointerUp`) not Touch Events. Pointer events unify mouse, touch, and stylus into one model.

```typescript
// On the grid container
onPointerDown={handleDragStart}
onPointerMove={handleDragMove}
onPointerUp={handleDragEnd}
```

**Critical CSS:** Add `touch-action: none` to the grid element to prevent the browser from intercepting touch events for scroll.

```css
.availability-grid {
  touch-action: none;
  user-select: none;
}
```

**Critical JS:** Call `element.setPointerCapture(pointerId)` on `pointerdown`. This ensures all subsequent pointer events route to your element even if the finger moves outside it — essential for smooth drag across cells.

### Paint-Bucket State Machine

The drag interaction is a state machine, not just event tracking:

1. `pointerdown` on a cell: Record the cell's current state (available/unavailable). Record `paintMode` = opposite of current state. Capture pointer.
2. `pointermove`: For each cell the pointer enters, apply `paintMode`. Do NOT toggle — maintain consistent paint direction for the entire drag.
3. `pointerup`: Release capture. Commit state.

This prevents the jarring "flicker" you get when toggling on every cell touch.

### Minimum Touch Target Size

WCAG 2.5.5 requires 44x44px minimum touch targets. For a time grid showing 30-minute slots across 7 days, cells will be tight. Two approaches:

**Option A — Coarser grid (recommended for MVP):** Use 30-minute slots minimum. At 7 days across a mobile screen (~360px wide), each cell is ~51px wide. Comfortable. Height at 44px per row. Total grid height for 12 hours = 1056px — scrollable.

**Option B — Fine grid with visual/touch separation:** Display cells visually at 15min but snap touch hits to 30min blocks. More complex, defer.

### Scroll vs. Select Conflict

Because `touch-action: none` disables scroll on the grid, the grid must fit in a scrollable container. Two sub-scrolls:

- **Horizontal:** Time-of-day labels fixed on left; date columns scroll right (if many dates).
- **Vertical:** Time-of-day axis; hours scroll vertically.

Alternatively: Constrain the grid to a fixed visible window (e.g., show 8 hours at a time with a time-range toggle) to avoid needing grid-internal scroll on mobile. This is simpler and recommended for MVP.

### Two-Finger Scroll Fallback

If the user has `touch-action: none` on the grid, they lose scroll within it. Implement a **"scroll mode vs. select mode"** toggle — a small lock/brush icon in the corner. Default to select mode. This is a known pattern used by map apps (Google Maps uses this for embedded maps: "Use two fingers to scroll the map").

---

## 3. Heatmap Visualization

### Color Approach

**Do not use red-to-green.** Red-green colorblindness affects ~8% of men. This is the exact palette When2meet uses and it's inaccessible.

**Recommended warm palette: white → amber → deep orange/brown**

```
0 respondents:  #FAF7F4  (warm white / background)
1 respondent:   #FDE8C8  (pale amber)
2 respondents:  #FBCA7A  (warm amber)
3 respondents:  #F5A623  (golden orange)
4+ respondents: #C47A1E  (deep amber-brown)
Peak:           #7C4A0E  (dark warm brown)
```

This palette:
- Works on warm cream backgrounds without feeling clinical.
- Is readable by users with deuteranopia (red-green colorblindness).
- Communicates warmth and "this is a good time" naturally (warm = sunny = good).
- Looks intentional and designed, not a default heatmap.

### Accessibility: Beyond Color

Per WCAG 1.4.1, color alone cannot convey meaning. Add secondary encoding:

- **Opacity/saturation progression** (partially redundant with color, but helps).
- **Number label** on each cell showing respondent count when group is small (4-10 people). At small group sizes, "3/7" is more informative than a color shade anyway.
- **Pattern overlay** for a "high contrast mode" toggle: add subtle diagonal stripes to high-availability cells.
- **Aria-label on each cell:** `"Tuesday 3pm: 5 of 7 people available"`.

### Heatmap vs. Individual View

Two modes the heatmap display should support:

1. **Heatmap mode (default):** Aggregate overlap view. All respondents' data shown as intensity.
2. **Person-highlight mode:** Tap a respondent's name in the sidebar to see only their availability highlighted. Essential for "who's available at 3pm specifically?"

### Creator "Best Time" Callout

After heatmap renders, automatically surface the top 2-3 candidate time slots with a subtle highlight ring and a "Best" badge. This reduces cognitive load — the creator shouldn't have to scan the whole grid.

---

## 4. Mobile Calendar / Date Picker (Event Creation)

### Two Event Types

**Specific dates:** Creator picks individual dates (not a range). Useful for "let's meet one of these three Tuesdays."

**Date range:** Creator picks a start and end date; the app generates all days in between. Useful for "anytime in the next 2 weeks."

### Recommended Interaction

Use a **tap-to-select multi-date calendar** for specific dates. Grid of weeks, tap cells to toggle. No drag needed — individual date selection doesn't benefit from drag.

For date range: standard two-tap range select (tap start, tap end, range fills in). React DayPicker (`daypicker.dev`) handles both modes cleanly and is lightweight.

**Library: React DayPicker** — actively maintained, lightweight (~5kb), supports multi-select and range modes, fully accessible, unstyled by default (easy to theme).

Do NOT use Mobiscroll (paid license required for commercial use) or react-dates (AirBnB, largely unmaintained).

### Mobile-Specific Calendar UX

- Full-width calendar on mobile (no popover, inline display).
- Show 1 month at a time; swipe or tap chevrons to navigate months.
- Minimum 44px touch target per day cell.
- Clear "selected" state: filled circle, brand color.
- Disabled past dates shown in muted gray (#D1C9BF or similar).
- Limit: allow selection of up to 30 days to prevent overwhelming respondents.

---

## 5. The Name + PIN Entry Flow

### Design Philosophy

The name + PIN flow replaces account creation. It must feel like the **lightest possible commitment** — "just tell us your name, pick something you'll remember."

### Screen Structure

Single focused screen, not a multi-step wizard:

```
[Event Name shown at top for context]

Your name
[_________________________]

Create a PIN (4 digits)
[  ] [  ] [  ] [  ]

                [Join →]

Already joined? [Enter PIN to edit]
```

### Key UX Decisions

**Name field first, PIN second.** Name is familiar; PIN feels less weird after they've already typed their name.

**Auto-focus the name field** on page load. No extra tap to start typing.

**PIN input: Use 4 separate single-character inputs**, not a standard password field. Each input is 1 digit wide (large, square, ~56px), auto-advances to next on input, auto-focuses previous on backspace. This matches OTP input patterns users know from 2FA flows. Trigger the numeric keyboard on mobile: `inputMode="numeric"` not `type="number"` (avoid spinners).

**"Already joined" flow:** Collapsed by default. Show a small "Edit my availability" link below the form. Expands to show just a PIN field with their name pre-filled (if browser has it cached in localStorage).

**Validation:** Real-time, not on submit. Name: max 30 chars, no special characters needed. PIN: exactly 4 digits.

**Error copy that doesn't blame the user:**
- Wrong PIN: "That PIN doesn't match — try again, or contact the event creator."
- Name taken: "That name is already in use for this event. Try a variation, like 'Tyler B'."

**Magic link fallback:** Show a subtle "Trouble with your PIN? Get a link by email" option below the form. Don't make this prominent — most users won't need it.

### Session Persistence

After successful entry, store `{ eventId, name, pinHash }` in `localStorage`. On return visits to the same event URL, auto-fill name and skip PIN if session matches. Show a small "Welcome back, [Name]!" dismissible banner.

---

## 6. Visual Design System

### Aesthetic Direction

Target: **warm minimal**. Think Linear's discipline (generous whitespace, strong typographic hierarchy, no gratuitous decoration) applied to a warmer, friendlier palette. Less "productivity SaaS cold gray", more "nice coffee shop menu."

Not cute/playful. Not corporate. Calm, capable, inviting.

### Color Palette

```
Background:        #FAF8F5  (warm off-white, not pure white)
Surface:           #FFFFFF  (cards, modals)
Surface Subtle:    #F3EFE9  (sidebar, secondary areas)
Border:            #E5DDD4  (dividers, input borders)
Border Strong:     #C4B8AA  (focused inputs, emphasis borders)

Text Primary:      #1C1A17  (near-black, warm undertone)
Text Secondary:    #6B6158  (muted text, captions)
Text Disabled:     #A89E94  (placeholders, disabled states)

Brand:             #E8823A  (warm orange — CTAs, selected states, brand moments)
Brand Hover:       #D4722E  (slightly darker for hover)
Brand Subtle:      #FDF0E6  (light orange tint for backgrounds)

Heatmap 0:         #FAF7F4  (matches background)
Heatmap 1:         #FDE8C8
Heatmap 2:         #FBCA7A
Heatmap 3:         #F5A623
Heatmap 4:         #C47A1E
Heatmap 5 (peak): #7C4A0E

Success:           #3D8A4E  (confirmation, done states)
Success Subtle:    #EBF5EE
Error:             #C0392B
Error Subtle:      #FDECEA
```

**Do not use pure white (#FFFFFF) as the page background.** The warm off-white (#FAF8F5) is softer and eliminates the clinical feel. This single decision does enormous work.

### Typography

**Primary: Inter** — the safe, excellent choice. Screen-optimized, extremely well-hinted, available via `next/font` with zero layout shift. Use Inter for all body and UI text.

**Display (optional): Instrument Serif or Lora** — for the event title displayed on the response page. A single serif headline in a warm, humanist face makes the page feel designed rather than assembled. Keep to one weight (Regular italic for the event name itself could be elegant).

**Type Scale (Tailwind-compatible):**

```
xs:   12px / 16px line-height  — captions, timestamps
sm:   14px / 20px              — secondary text, labels
base: 16px / 24px              — body, inputs
lg:   18px / 28px              — subheadings
xl:   24px / 32px              — section headers
2xl:  32px / 40px              — page titles
3xl:  48px / 56px              — hero (homepage only)
```

**Font weights:** 400 (Regular) and 500 (Medium) only. 600 (Semibold) for CTAs and headings. Avoid 700+ — it reads as shouting on a minimal layout.

**Letter spacing:** Slightly tracked out on uppercase labels: `tracking-wide` (0.05em). Normal tracking everywhere else.

### Spacing System

Use Tailwind's default 4px base scale. Key landmarks:

- **4px (1):** Internal padding within tight components (badge padding)
- **8px (2):** Gap between related inline elements
- **12px (3):** Input padding, small card padding
- **16px (4):** Default component padding, list item spacing
- **24px (6):** Section internal padding
- **32px (8):** Between sections on mobile
- **48px (12):** Major section breaks on desktop
- **64px (16):** Hero/top-of-page breathing room

### Border Radius

```
sm:  4px   — inputs, small badges
md:  8px   — cards, buttons, modals
lg:  12px  — large cards, sheet panels
xl:  16px  — bottom sheets on mobile
full: 9999px — pill tags, avatars
```

Avoid rounded-none (too corporate) and rounded-3xl+ (too playful).

### Shadows

Minimal, warm-tinted:

```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(100, 60, 10, 0.08),
            0 4px 12px rgba(100, 60, 10, 0.05);

/* Elevated modal */
box-shadow: 0 8px 32px rgba(100, 60, 10, 0.12),
            0 2px 8px rgba(100, 60, 10, 0.06);
```

Use warm-tinted shadows (brown-ish undertone) not cool gray shadows. The difference is subtle but makes the design cohesive.

---

## 7. Micro-Interactions and Transitions

### Principles

**Fast feedback, not flashy animation.** The target is 150-250ms for immediate feedback (button presses, cell paints), 250-350ms for state transitions (page section reveals, sheet opens). Nothing over 400ms unless it's a full-page navigation.

**Easing:** Use `ease-out` for elements entering the screen (starts fast, settles). Use `ease-in` for elements leaving (starts slow, accelerates out). Use `ease-in-out` for position changes.

**Respect `prefers-reduced-motion`.** Wrap all animations in a media query check. Provide instant transitions as the fallback.

### Cell Paint Feedback

When a cell is painted (touched/dragged):

- Immediate color change (no animation — latency would feel broken).
- Subtle `scale(0.95)` on first touch for 100ms then back to `scale(1)` — a quick "press" feel.
- No ripple effects (Material Design pattern, doesn't fit the aesthetic).

### Button Interactions

- `hover`: Background darkens 8% (`Brand Hover`), 150ms ease.
- `active/pressed`: `scale(0.97)` + slight background darken, 80ms.
- `disabled`: 40% opacity, `cursor: not-allowed`.

### Loading States

**Skeleton screens, not spinners.** Match the skeleton layout to the actual content layout precisely. Use a shimmer animation (gradient sweeping left-to-right) in the warm palette:

```css
background: linear-gradient(
  90deg,
  #F3EFE9 25%,
  #E8E0D5 50%,
  #F3EFE9 75%
);
background-size: 200% 100%;
animation: shimmer 1.4s ease-in-out infinite;
```

Skeletons for: availability grid (show grid lines), respondent list (show name-placeholder rows), heatmap (show grid with neutral background).

**Spinner use:** Only for actions with unknown completion time (submitting the event creation form). Use a small 20px spinner in the brand color, centered in the button.

### Page Transitions (Next.js)

Keep page transitions minimal. A gentle `opacity: 0 → 1` fade over 200ms on route change. Do not use slide transitions on the main content — they create spatial confusion on mobile.

Bottom sheets (for confirming a time slot, showing respondent details) should slide up from the bottom: `translateY(100%) → translateY(0)` over 300ms ease-out.

### Form Validation Feedback

- Inline, below the field, appears after the user has left the field (not while typing).
- Error: small red text (#C0392B), 13px, with a subtle border color change on the input to `#C0392B`.
- Success: green checkmark icon inline with the field, no text needed.

---

## 8. Empty, Loading, and Error States

### Empty State: No Responses Yet

Shown on the creator's view when no one has responded:

```
[Subtle illustration — calendar with a question mark, warm tones]

Waiting for responses

Share the link with your group to get started.
Nobody has marked their availability yet.

[Copy link button]
```

Keep illustrations simple — a single-color line drawing works better than colorful illustrations at this scale.

### Empty State: You Haven't Marked Availability

Shown to a new respondent who lands on the event:

```
Mark when you're available

Tap and drag on the grid to show when you can meet.
Your availability will appear alongside the group.

↓
[The grid, with a gentle pulse animation on first visible cell to draw attention]
```

### Loading State: Heatmap Computing

Brief (usually <500ms for small groups). Show a neutral grid skeleton with a shimmer. If it takes longer than 800ms, add "Calculating availability overlap..."

### Error States

**Event not found (404 for the link):**
```
This event link isn't valid

It may have been deleted or the link is incorrect.
Check with the person who invited you.

[Create your own event →]
```

**Network error when submitting:**
```
Couldn't save your availability

Check your connection and try again.
Your selections are still here.

[Try again]
```

**PIN mismatch:**
```
Wrong PIN

That PIN doesn't match what was set for [Name].
Try again, or use the magic link option.

[Try again]  [Send me a link]
```

### Error State Principles

1. Always explain what happened (not just "Error").
2. Always give a next action.
3. Never lose user input — selections should survive network errors.
4. Tone: calm and direct, not apologetic ("Couldn't save" not "Oops! Something went wrong").

---

## 9. Mobile-First Layout Specifics

### Viewport and Scroll

- Set `min-height: 100dvh` (dynamic viewport height) not `100vh` — avoids the mobile browser chrome issue where `100vh` is too tall and content hides under the address bar.
- The availability grid is the one component that needs careful scroll handling. Everything else follows normal document flow.

### Navigation

No persistent navbar. This is a focused tool, not an app with sections to navigate. At most: the event name at the top with a share button.

### Bottom Sheet Pattern

For confirming a meeting time (creator action), use a bottom sheet rather than a modal:

- Slides up from the bottom edge.
- Covers 60-70% of screen height.
- Has a drag handle at top for dismissal.
- Stays within thumb reach for all CTAs.

React component: build custom using `dialog` element with bottom-anchored positioning, or use `vaul` (drawer library for React, from Emil Kowalski — the same person who made shadcn). Vaul is specifically designed for mobile-first bottom drawers.

### Touch Target Audit

Before shipping, every interactive element must be audited:
- Buttons: minimum 44x44px.
- Grid cells: minimum 44px height (width depends on column count — may need to limit to 5-6 days visible at once on mobile).
- Respondent name chips in the sidebar: minimum 36px tall is acceptable here (secondary UI).
- Link-style actions: minimum 44px tap area using padding even if visual appearance is smaller.

---

## 10. Accessibility Checklist

- [ ] Heatmap color scale does not rely on red-green contrast.
- [ ] All heatmap cells have `aria-label` with numeric count.
- [ ] Grid cells are keyboard-navigable (arrow keys to move, Space to toggle).
- [ ] PIN inputs have `aria-label="PIN digit 1"` through `"PIN digit 4"`.
- [ ] Error messages are announced via `role="alert"` or `aria-live="assertive"`.
- [ ] Focus ring is visible and styled (not browser default — use brand color outline).
- [ ] Color contrast: all text meets WCAG AA (4.5:1 for normal, 3:1 for large).
- [ ] `prefers-reduced-motion` applied to all CSS animations.
- [ ] All interactive elements are reachable by keyboard.
- [ ] Screen reader can access the availability summary without parsing the visual grid (provide a text summary: "6 of 8 people are free on Tuesday March 4 from 2–3pm").

---

## 11. Key Differentiators for Timely (vs. Competitors)

| Feature | When2meet | Doodle | Crab.fit | **Timely** |
|---|---|---|---|---|
| Mobile touch grid | Broken | N/A (date poll) | Broken | **Native pointer events, works** |
| Aesthetic | 2006-era | Cluttered | Minimal/orange | **Warm, polished** |
| Accounts required | No | No (limited) | No | **No** |
| Heatmap accessibility | No (red/green) | N/A | Unknown | **Yes (warm palette + labels)** |
| Name + PIN UX | No PIN | No PIN | No PIN | **OTP-style PIN, graceful** |
| Empty states | None | Basic | Basic | **Designed and helpful** |

---

## Sources

- When2meet mobile critique: [SavvyCal When2meet Guide](https://savvycal.com/articles/when2meet/) | [Timeful Doodle vs When2meet](https://timeful.app/blog/doodle-vs-when2meet/)
- Competitor analysis: [Calday When2meet vs Doodle](https://calday.com/blog/when2meet-vs-doodle) | [Crab.fit](https://crab.fit/) | [Rallly](https://rallly.co/)
- Touch drag implementation: [React Drag to Select — Joshua Wootonn](https://www.joshuawootonn.com/react-drag-to-select) | [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | [Draggable Objects — Amit Patel](https://www.redblobgames.com/making-of/draggable/)
- Accessibility for heatmaps: [Smashing Magazine — Accessibility-First Chart Design](https://www.smashingmagazine.com/2022/07/accessibility-first-approach-chart-visual-design/) | [WCAG 1.4.1 Color](https://wcag.dock.codes/documentation/wcag141/)
- Linear design system: [Linear Brand Guidelines](https://linear.app/brand) | [How We Redesigned Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) | [Linear Style](https://linear.style/)
- Cal.com design: [Cal.com Colors](https://design.cal.com/basics/colors)
- Typography: [Vercel Geist](https://vercel.com/geist/typography) | [Best Fonts 2025 — Shakuro](https://shakuro.com/blog/best-fonts-for-web-design)
- Micro-interactions: [Micro-interactions 2025 — Stan Vision](https://www.stan.vision/journal/micro-interactions-2025-in-web-design) | [Motion UI Trends — Beta Soft](https://www.betasofttechnology.com/motion-ui-trends-and-micro-interactions/)
- Empty/error states: [UI Best Practices Loading/Error/Empty — LogRocket](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) | [Empty States — Toptal](https://www.toptal.com/designers/ux/empty-state-ux-design)
- Date picker: [React DayPicker](https://daypicker.dev/) | [Time Picker UX — Eleken](https://www.eleken.co/blog-posts/time-picker-ux)
- Touch conflict prevention: [interact.js touch-action issue](https://github.com/taye/interact.js/issues/595) | [Drag and Drop UX — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)
