---
name: ui-ux-frontend-basics
description: >-
  Applies practical UI/UX guidelines when designing or polishing frontend pages
  and components: visual hierarchy, spacing, typography, color, states, icons,
  shadows, and overlays. Distinguishes marketing/landing surfaces from dense
  in-app UI. Use when building or reviewing layouts, styling, component polish,
  accessibility of interactive states, hero sections, dashboards, forms, cards,
  or when the user asks for better design, hierarchy, whitespace, or “make it
  look less like a spreadsheet.”
---

# UI/UX basics for frontend pages and components

Use this skill when implementing or refining **layout, visual hierarchy, spacing, typography, color, and interaction feedback**. It is **framework-agnostic**; map guidelines to the project’s design tokens, CSS variables, or component library.

## 1. Classify the surface (then apply the right checklist)

**Default:** infer from context. **If ambiguous,** ask one short question before deep styling work:

> “Should this read mainly as **marketing/landing** (conversion, storytelling) or **dense in-app UI** (efficiency, data)? If both, which band wins above the fold?”

**Always state the assumption** in one line when giving recommendations, e.g. *“Assumption: dense in-app UI — capping display type and prioritizing scanability.”*

### Strong signals for **marketing / landing**

- Routes or sections named like: `landing`, marketing home, portfolio hero, `about`, public showcase pages.
- Content: hero, long-form story, social proof, big CTAs, SEO blocks.
- Goal: emotional clarity and **few** focal points per viewport.

### Strong signals for **dense / in-app**

- Chat UI, settings, tables, filters, multi-field forms, data-heavy lists.
- Goal: **information density**, predictable rhythm, minimal display type.

### **Hybrid**

- Marketing block **inside** an app shell (banner + tool below).
- **Rule of thumb:** apply **marketing** rules to the promotional band only; apply **dense** rules to everything else (alignment, type scale, spacing).

---

## 2. Work in this order

1. **Structure & grouping** — What belongs together? (containers, sections, related controls.)
2. **Hierarchy** — What is the single primary focal point per section?
3. **Whitespace & spacing scale** — Rhythm between groups vs within groups.
4. **Typography** — Roles (display, title, body, caption), not one-off sizes.
5. **Color** — Brand primary + semantic states; avoid decorative rainbow.
6. **States & feedback** — Default, hover, active, disabled, focus, loading, error, empty.
7. **Refinement** — Icons aligned to text, shadows/overlays that support content, micro-feedback where actions need confirmation.

---

## 3. Universal principles (compact)

### Signifiers & affordances

- **Grouping** implies relationship; lack of grouping implies independence.
- **Selection** should read clearly (container, border, tint, or check) vs unselected.
- **Disabled** reads as lower contrast and non-interactive; do not rely on color alone.
- Use **hover/focus/active** so interactive elements feel responsive; tooltips for non-obvious actions (with keyboard access where applicable).

### Visual hierarchy

- Contrast in **size, weight, color, and position** creates order—not one magic rule.
- **Images** help scanning when the subject is the “hero” entity (product, place, person).
- **Price or primary metric:** often emphasized (size, weight, or brand accent)—still must meet contrast/accessibility rules.

### Layout: grid vs whitespace

- **12-column / fixed gaps** are **guides**, especially for custom marketing pages—perfect column alignment is optional.
- **Repeating** layouts (cards, blog grids, galleries) benefit from grids for **responsive** behavior (e.g. fewer columns on tablet/mobile).
- **Whitespace** and **grouping** usually matter more than forcing every element to the grid.

### Spacing scale

- Prefer a **small set of spacing steps** (often 4px-based multiples) so halving/doubling stays consistent.
- **Larger gaps between sections** than within a label+control pair.

### Typography

- **One sans-serif family** is enough for most product UIs; add a second only with a clear reason.
- **Display / large headings:** slightly **tighter letter-spacing** and **line-height ~1.1–1.2** often look more intentional than default browser looseness.
- **Limit distinct font sizes** per surface:
  - **Marketing:** more steps allowed but still bounded (avoid a unique size per line).
  - **Dense UI:** keep **large type rare**; body and UI labels dominate (often nothing much above ~24px except rare emphasis).

### Color

- Start from **one primary (brand)**; derive **tints/shades** for surfaces, borders, and text on colored backgrounds → builds a **ramp** for chips, charts, and states.
- **Semantic color** (success, warning, error, info) should **mean** something—prefer purpose over decoration.
- Common associations (flexible by culture/product): blue → trust/link; red → danger/urgency; yellow/amber → caution; green → success.

### Light mode: depth

- **Shadows:** favor **softer** shadows (lower opacity, more blur). Cards often need **less** than floating layers (menus, dialogs).
- If **shadow is the first thing** noticed, reduce it.

### Dark mode

- Avoid **harsh light borders** on dark surfaces; prefer subtle separators.
- **Depth** often comes from **slightly lighter surfaces** above darker backgrounds, not heavy shadows.
- **Saturate/brighten** accents carefully; dim noisy chips and balance text contrast.

### Icons

- Default icons **too large** is common; align icon box to **cap height / line-height** of the paired text (e.g. 24px line-height → ~24px icon).
- **Ghost** nav rows: text + icon behaving as a button; background appears on hover/active.

### Buttons & touch targets

- **Primary + secondary** pairs: filled primary + ghost/outline secondary is a common pattern.
- **Padding heuristic:** horizontal padding often ~**2×** vertical padding for pill-shaped buttons (tune per design system).

### Interaction feedback

- **Buttons:** default, hover, active/pressed, disabled; add **loading** when the action is async.
- **Inputs:** **focus** ring, **error** border + message; optional warning for non-blocking issues.
- **System:** loading, empty, and success states for lists and async flows.

### Micro-interactions

- Use short motion or a small confirmation (e.g. “Copied”) when the user needs **proof** the action succeeded—beyond hover/press alone.

### Imagery + text (heroes, cards)

- Prefer **gradient scrims** (image → readable text) over flattening the photo with an opaque slab—unless intentional.
- Optional: **progressive blur** + gradient for a modern hero—keep text contrast WCAG-compliant.

---

## 4. Checklist — marketing / landing

- [ ] One **clear focal point** per major section (headline OR visual, not competing equals).
- [ ] **Section spacing** clearly larger than **intra-group** spacing.
- [ ] **Type ramp** is limited; display styles use tuned **line-height / tracking**.
- [ ] **CTA hierarchy:** one obvious primary action per viewport when possible.
- [ ] **Hero/media:** readable text over imagery (gradient/scrim), not illegible contrast.
- [ ] **Responsive:** grid simplifies on smaller breakpoints; content does not feel cramped.
- [ ] **Motion** (if any) supports understanding—does not distract from the CTA.

---

## 5. Checklist — dense / in-app

- [ ] **Scan paths** clear: labels, values, and actions align predictably.
- [ ] **No unnecessary display sizes**; hierarchy stays in the “UI” range.
- [ ] **Tables/cards:** zebra or row hover, truncation, and headers readable without shouting.
- [ ] **Forms:** consistent label+control spacing; errors next to fields or announced accessibly.
- [ ] **Density toggles** (if applicable): respect user preference; do not rely on tiny hit targets.
- [ ] **Every interactive element** has hover/focus at minimum; disabled looks disabled.
- [ ] **Loading/skeleton/empty** states designed, not accidental blank space.

---

## 6. Anti-patterns (quick)

- Same font size for **everything** (spreadsheet aesthetic).
- **Decorative** color with no semantic role.
- **Oversized** icons next to body text.
- **Heavy** shadows on every card.
- Interactive widgets **without** focus styles (keyboard users blocked).
- **Micro-motion** with no purpose or blocking repeated tasks.

---

## 7. Map to this repo (portfolio / `apps/web`)

Use when working in **this** codebase.

| Signal | Typical location | Notes |
|--------|------------------|--------|
| Marketing / portfolio home | `apps/web/src/app/page.tsx`, `components/hero-section.tsx`, `about-section.tsx`, `projects-section.tsx`, `contact-section.tsx` | Tailwind + shadcn-style primitives; dark theme tokens in `globals.css`. |
| Hacker News product UI | `apps/web/src/app/hackernews/`, related `components/` | Chat and showcase surfaces; citation lists and metadata panels lean **dense UI**. |
| Shared chrome | `components/site-header.tsx` | Match existing spacing and link patterns. |

When unsure which surface you are in, **infer from the file path** and state that assumption.

---

## 8. Research habit (any project)

When stuck on a section (pricing, FAQ, dashboard toolbar), **reference real shipped UIs** in the same category—competitors or pattern libraries—and copy **structure and hierarchy**, not pixels blindly.
