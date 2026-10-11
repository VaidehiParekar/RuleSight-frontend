# RuleSight frontend: current design

This describes the UI on branch `enhance--fronted-design` (commit `1020125`) of the `RuleSight-frontend` repo. It replaces the older "Aubergine & Parchment" spec. The CSS header comment and `brand-mark.tsx` still use that old name, but the rules that apply now are the HR Portal-style navy, brand-blue and cyan ones listed below.

The companion file `rulesight-app.html` is the whole app built into one self-contained page. It uses mock data and hash routing, and the fonts are inlined. Open it in a browser, or give it to Claude Code as a visual reference.

Source of truth: `src/styles/index.css` (about 3,900 lines). The "Modern fintech layer" that starts at about line 2747 overrides the older base rules above it.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite 8, TypeScript 6 |
| Routing | `react-router` v8 (`createBrowserRouter`); `/login` is public, every other route sits behind `RequireSession` |
| Data | TanStack Query 5; `VITE_USE_MOCKS=true` (the default) serves `src/mocks` (built from `backend/demo_data`) |
| Styling | One global stylesheet, `src/styles/index.css`, with plain class names. Tailwind v4 is imported only for the `@theme` token bridge. |
| Charts | Recharts 3 (donut, stacked priority bars, metric bars), plus hand-built CSS meters and bars |
| Motion | framer-motion on the sign-in page; CSS keyframes elsewhere |
| Icons | lucide-react, mostly at 15 to 19 px |
| Forms | Native inputs wrapped in `Field` (label, hint and error wired up with `aria-describedby`) |

---

## 2. Design tokens

All colours are CSS custom properties on `:root`, written in OKLCH. Dark mode applies when the OS prefers it (`@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`) or when the user chooses it (`:root[data-theme="dark"]`). An explicit `data-theme="light"` wins over the OS. The choice is stored in `localStorage["rulesight-theme"]` and applied before first paint by an inline script in `index.html`.

### 2.1 Brand primitives

| Token | Light and dark | Use |
|---|---|---|
| `--navy` | `oklch(0.31 0.062 240)` | Brand gradient start |
| `--navy-foreground` | `oklch(0.98 0.005 240)` | Text on navy and the gradient |
| `--cyan` | `oklch(0.75 0.126 213)` | Signature accent: active-nav bar, brand mark, hero lines |
| `--gradient-brand` | `linear-gradient(120deg, navy 0%, brand-blue 62%, cyan 130%)` | Sign-in hero |

### 2.2 Surfaces and text

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.975 0.005 240)` (cool off-white) | `oklch(0.19 0.03 250)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.24 0.035 248)` |
| `--sunken` | `oklch(0.955 0.008 240)` | `oklch(0.23 0.035 248)` |
| `--raised` (dialogs, toasts, popovers) | `oklch(1 0 0)` | `oklch(0.27 0.04 248)` |
| `--foreground` | `oklch(0.24 0.035 250)` | `oklch(0.96 0.006 240)` |
| `--muted` | `oklch(0.52 0.024 250)` | `oklch(0.72 0.02 245)` |
| `--border` | `oklch(0.9 0.012 240)` | `oklch(1 0 0 / 12%)` |
| `--input` (control borders) | `oklch(0.84 0.014 240)` | `oklch(1 0 0 / 18%)` |

### 2.3 Interactive

| Token | Light | Dark |
|---|---|---|
| `--primary` (brand blue) | `oklch(0.53 0.128 240.5)` | `oklch(0.68 0.12 235)` |
| `--primary-hover` | `oklch(0.45 0.115 241)` | `oklch(0.76 0.1 235)` |
| `--primary-foreground` | `oklch(0.99 0.005 240)` | `oklch(0.19 0.03 250)` |
| `--primary-tint` (hover rows, active filter) | `oklch(0.93 0.03 225)` | `oklch(0.32 0.05 240)` |
| `--accent` | `oklch(0.55 0.11 215)` | `oklch(0.75 0.126 213)` |
| `--accent-strong` | `oklch(0.75 0.126 213)` | `oklch(0.6 0.12 213)` |
| `--highlight` / `--highlight-foreground` | `oklch(0.9 0.06 213)` / foreground | `oklch(0.4 0.08 213)` / foreground |
| `--ring` (focus outline) | = primary | = primary |

### 2.4 Sidebar (navy in both themes)

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.28 0.058 243)` | `oklch(0.16 0.03 250)` |
| `--sidebar-foreground` | `oklch(0.86 0.02 240)` | same |
| `--sidebar-accent` (hover and active row) | `oklch(0.36 0.07 240)` | `oklch(0.28 0.058 243)` |
| `--sidebar-border` | `oklch(0.36 0.05 240)` | `oklch(1 0 0 / 10%)` |

### 2.5 Semantic status

| Tone | Fg light | Bg light | Fg dark | Bg dark |
|---|---|---|---|---|
| critical | `oklch(0.56 0.205 22)` | `oklch(0.95 0.03 22)` | `oklch(0.7 0.17 22)` | `oklch(0.3 0.07 22)` |
| warning | `oklch(0.6 0.15 62)` | `oklch(0.96 0.045 75)` | `oklch(0.78 0.14 70)` | `oklch(0.3 0.06 62)` |
| success | `oklch(0.55 0.135 152)` | `oklch(0.95 0.04 152)` | `oklch(0.72 0.14 152)` | `oklch(0.3 0.06 152)` |
| neutral | = muted | `oklch(0.945 0.01 240)` | = muted | `oklch(0.29 0.04 248)` |

Priority mapping: **P1 → critical, P2 → warning, P3 → neutral.**

### 2.6 Data visualisation

- **Sequential (blue ramp)**, `--seq-1` to `--seq-5`. Light: `0.9/0.04/235`, `0.8/0.08/235`, `0.68/0.11/238`, `0.53/0.128/240.5`, `0.38/0.09/242`. Dark runs the other way, from `0.32` up to `0.82` lightness.
- **Categorical (graph node types)**:
  - `--cat-clause`: brand blue
  - `--cat-obligation`: cyan `0.68 0.126 213`
  - `--cat-control`: violet `0.45 0.09 285`, or `0.65` in dark
  - `--cat-evidence`: amber `0.71 0.155 62`
  - `--cat-gap`: critical red
- Chart code reads these tokens at runtime through `hooks/use-css-colors.ts`, so Recharts follows the theme.

### 2.7 Elevation

- `--shadow`: `0 1px 2px navy/6%, 0 8px 24px -12px navy/18%` on cards, KPIs, sheets and dialogs. Dark uses black at 30% and 50%.
- `--shadow-float`: `0 24px 60px -28px navy/50%` for hover lift on KPIs and dashboard cards.
- The command palette uses `0 24px 60px -20px rgb(15 23 42 / .35)`.

---

## 3. Typography

- **Family**: **Ubuntu** (300, 400, 500, 700) for everything, including the "serif" slots, plus **Ubuntu Mono** (400, 700) for IDs, codes, scores and `kbd`. The fonts are self-hosted in `public/fonts/*.woff2` with latin and latin-ext subsets and `font-display: swap`. No third-party font host is used.
- **Body**: 14px/1.55, `font-variant-numeric: tabular-nums`, antialiased.
- **Scale (modern layer)**:

| Element | Size / weight / tracking |
|---|---|
| `h1` (page title) | 24px / 700 / -0.02em, line-height 1.25 |
| `h2` (card title) | 15px / 600 / -0.015em |
| `h3` | 15px / 600 |
| `.eyebrow` | 12px / 500, **sentence case**, no tracking (was uppercase) |
| KPI number | 28px / 700 / -0.02em |
| Donut centre number | 28px / 600 |
| Table header | 12px / 500, sentence case, transparent background |
| Nav group label | 11px / 500, sentence case |
| Status pill | 11px / 500 |
| Sign-in hero `h1` | `clamp(34px, 3.6vw, 48px)` / 700 / -0.03em |
| Sign-in card `h2` | 26px / 700 |

- **Voice**: sentence case everywhere, plain and specific. Eyebrows follow the pattern "Area · qualifier", for example "Exposure register · sorted by risk score".

---

## 4. Shape, spacing, motion

- **Radii**: cards, sheets and KPIs 12px; dialogs and the palette 14px; buttons, inputs, icon buttons and nav items 8px; search trigger 10px; status pills and filters 999px; priority chips 6px; sign-in card 24px; role options 14px; sign-in hero `0 48px 48px 0`.
- **Page padding**: 28px on all sides with 48px at the bottom; 16px on mobile. Gaps between cards are 14px.
- **Motion** (all switched off under `prefers-reduced-motion`):
  - `fade-up` (10px rise, 420 to 520ms, `cubic-bezier(.16,1,.3,1)`) on `.page`, on KPIs (staggered 0, 60, 120 and 180ms) and on dashboard sheets (160ms delay).
  - Hover lift: `translateY(-2px)` plus `--shadow-float` on KPIs and dashboard cards.
  - `rise-in` (8px, 180ms) on dialogs and toasts, 140ms on the palette; `slide-in` (16px from the right) on drawers.
  - Sign-in uses framer-motion: staggered rise on the copy, a spring on the card, "breathing" circles and flowing gradient lines in the hero, and hover lift on role options.
- **Focus**: `outline: 2px solid var(--ring); outline-offset: 2px` on every focusable element.

---

## 5. App shell

```
┌──────────────┬───────────────────────────────────────────────────────────────┐
│ ■ RuleSight ⇤│ [≡]  [🔍 Search pages, gaps, obligations   Ctrl K]   (Mock data) [☾ Dark] (PS Priya Sharma ▾) [⎋] │  ← topbar 56px, blurred
│              ├───────────────────────────────────────────────────────────────┤
│ Overview     │  Good morning, Priya · last run …           [Primary action]  │
│  Dashboard   │  Compliance overview                                          │
│ Library      │  One-line scope                                               │
│  Documents   │                                                               │
│  Changes     │  [KPI] [KPI] [KPI] [KPI]                                      │
│ Analysis     │  [ card ............ ] [ card ...... ]                        │
│  Obligations │                                                               │
│  Controls    │                                                               │
│  Gaps     (3)│                                                               │
│  Remediation │                                                               │
│ System       │                                                               │
│  Graph       │                                                               │
│  Agent runs  │                                                               │
│  Audit log   │                                                               │
│ ──────────── │                                                               │
│ Nova Trust…  │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Sidebar (`components/layout/sidebar.tsx`)
- 224px wide, fixed position, navy background (`--sidebar`) in both themes.
- **Brand row** (56px, no bottom border): a cyan square mark with a navy rule through it, "RuleSight" in 16px/600 navy-foreground, and a collapse button (`PanelLeftClose`/`PanelLeftOpen`) aligned right.
- **Nav groups**: Overview (Dashboard); Library (Documents, Changes); Analysis (Obligations, Controls, Gaps, Remediation); System (Graph, Agent runs, Audit log).
- **Nav item**: 34px tall, 8px radius, 500 weight, 17px icon. Hover and active use a `--sidebar-accent` background. Active also gets **`inset 3px 0 0 var(--cyan)`** and navy-foreground text.
- **Gaps badge**: the count of open P1 gaps, shown as a pill with a critical background and light text.
- **Footer**: "Nova Trust Bank" (strong), "Fictional institution", "RBI corpus · 3 documents".
- **Collapsed** (user toggle, or automatic at ≤1100px): 64px wide, icons only, labels in `title` tooltips.

### Topbar (`components/layout/topbar.tsx`)
- 56px tall, sticky, 28px side padding. The background is `--background` at 85% with `backdrop-filter: blur(8px)`.
- Left to right:
  - **Hamburger**, shown only at ≤760px.
  - **Search trigger**: up to 380px wide, 36px tall, 10px radius, card background, "Search pages, gaps, obligations" with a `Ctrl K` `kbd`. At ≤760px it shrinks to a 36px icon button.
  - **Actions**: a "Mock data" warning pill (outlined) when mocks are on; the theme toggle (8px radius, card background, moon or sun icon with "Dark"/"Light"); the actor select (avatar, "Acting as" in small text, the bold name and a chevron, no left border; it is still a transparent native `<select>` layered over the control); and a **Sign out** icon button (`LogOut`) that clears the session and goes to `/login`.

### Command palette (`components/layout/command-palette.tsx`)
- Opens with Ctrl/⌘ K or the search trigger. The backdrop is aligned to the top at 12vh.
- Panel: 620px wide, 14px radius, raised background. The input row is 52px with a search icon, a 15px input and an `Esc` kbd.
- Results: up to 12 rows of 92px group, label and mono hint, across Pages, Gaps (`code · title`, hint = priority) and Obligations (`code · summary`, hint = clause ref). With no query it shows Pages only.
- Arrow keys move, Enter opens, Esc closes. The active row gets a `--primary-tint` background and 8px radius.
- The footer shows the `↑ ↓ move` and `Enter open` hints.

---

## 6. Sign-in (`/login`, `features/auth/login-page.tsx`)

Two equal columns; one column at ≤900px.

- **Hero (left)**:
  - Brand-gradient background, `border-radius: 0 48px 48px 0`, and a soft primary glow.
  - Decoration: a 28px dot grid at 6% opacity, plus animated SVG circles and bezier lines with navy-foreground to cyan gradients.
  - Brand: a 26px mark (light fill, primary rule) and "RuleSight" in 18px/700.
  - Copy: "Regulatory / Compliance Intelligence", then "AI agents read RBI regulations, map them to your controls, and show the evidence behind every gap."
  - Three highlights, each a 38px frosted icon tile (12px radius) with a title and body: **Reads RBI text** (FileSearch), **Maps to your controls** (GitBranch), **Finds and ranks gaps** (ShieldCheck).
  - Footer row above a hairline: "Demo institution: Nova Trust Bank (fictional)" and a "Regulator: RBI" badge with a cyan shield.
  - At ≤900px the hero gets bottom-rounded corners (32px) and hides the highlights and footer.
- **Panel (right)**:
  - Centred glass card: 440px max width, 32px padding, 24px radius, card background at 94% with 16px blur, primary and cyan glow shadows, and a 560px radial primary halo behind it.
  - "Welcome back" eyebrow (primary), "Sign in" h2, and the muted line "Choose who you are…".
  - A role radio list of cards (14px radius). Selected: primary border, tinted background, a 3px primary ring and a check icon.
  - A full-width 48px primary submit, "Continue as {name} →"; the arrow nudges 3px on hover.
  - Note: "Prototype sign-in: there is no password."
- Demo actors: **Priya Sharma, Compliance Officer** (PS) and **Rahul Mehta, Analyst** (RM). The chosen actor is sent as the `X-Actor` header and recorded in the audit log.

---

## 7. Shared components

| Component | File | Look |
|---|---|---|
| `PageFrame` | layout/page-frame.tsx | Eyebrow, then 24px h1, then a muted subtitle (max 80ch); actions aligned right. No bottom rule. Sets `document.title` to "{title} · RuleSight". |
| `Button` | ui/button.tsx | 34px (small 28px), 8px radius, 13px/500. Variants: **primary** (brand fill, small shadow, glow on hover), **secondary** (card background and input border, tint on hover), **ghost**, **accent** (outline), **danger** (critical outline). |
| `IconButton` | ui/button.tsx | 32px square, 8px radius, muted, tint on hover |
| `TextButton` | ui/button.tsx | Primary-coloured 12px/600 inline link button |
| `Sheet` | ui/sheet.tsx | Card background, 1px border, 12px radius, `--shadow` |
| `KpiStrip` | data-display/kpi-strip.tsx | 4-column grid with 14px gaps; each KPI is its own card (16px/18px padding) with a 12px muted label, a 28px/700 number and a 12px muted note; staggered fade-up and hover lift |
| `StatusTag` / `LabelTag` | data-display/status-tag.tsx | Pill, 11px/500, tone background and foreground, optional dot or outline |
| `PriorityChip` | data-display/priority-chip.tsx | 28×21 mono chip, 6px radius, tone background (P1/P2/P3) |
| `Field` + `Input`/`Select`/`Textarea` | ui/field.tsx | 11px/600 muted label; 36px control with input border and 8px radius; hint or error line below; `aria-invalid` gives a critical border |
| `SearchField` | ui/search-field.tsx | 250px (full width on mobile), 34px, icon and input, focus ring |
| `FilterGroup` | ui/filter-group.tsx | Pill toggle buttons, 30px; active = primary text, border and tint |
| `Tabs` | ui/tabs.tsx | Underline tabs; active = primary text and 2px underline |
| `Dialog` | ui/dialog.tsx | 620px (small 460px), raised background, 14px radius; header is eyebrow + 23px title + close; footer has a transparent background, top border and buttons aligned right |
| `ReasonDialog` | ui/reason-dialog.tsx | Small dialog that asks for a required reason (written to the audit log) |
| `Drawer` | ui/drawer.tsx | Right panel up to 520px, raised background, slides in |
| Toasts | feedback/toast-provider.tsx | Bottom-right, 360px, raised card with an icon tinted by tone |
| `LoadingState` / `EmptyState` / `ErrorState` / `QueryView` | feedback/* | Pulse skeleton bars; centred empty message; critical-bordered error with a retry |
| `QuoteBlock` | data-display/quote-block.tsx | Sunken block with a 3px **primary** left border and `0 8px 8px 0` radius, 14.5px/1.65 sans, figcaption meta. No decorative quote mark. |
| `GraphPath` | data-display/graph-path.tsx | Mono breadcrumb chips joined by "→"; the start chip has an obligation-colour inset and the end chip a control-colour inset |
| `EvidenceTable` | data-display/evidence-table.tsx | Bordered evidence cards with a sunken header and a summary line |
| Charts | charts/* | `CoverageDonut` (Recharts pie, 180px with a centre number and legend), `PriorityStackChart` (stacked P1/P2/P3 bars), `MetricBarChart`, `MeterList` (9px meters), `StackedBar`, `PriorityBars`. Recharts tooltips use a raised background, border and 8px radius. |

---

## 8. Screens

The eyebrow and subtitle text below is exactly what the app shows.

### Dashboard (`/`)
- **Eyebrow**: "{Good morning|afternoon|evening}, {first name} · last run …". The title depends on the role: **Compliance overview** for the Compliance Officer, **Analyst review queue** for the Analyst. A primary action sits on the right.
- **Banners**, shown when they apply:
  - "Change intelligence · A regulation changed the exposure"
  - "Source integrity · The system abstained, not guessed"
- **Compliance view**:
  - KPIs: Open P1 gaps, Risk exposure, Remediation (approved/total), Next deadline.
  - Grid: "Coverage composition · Applicable obligations" is a donut of Covered (success), Partial (warning), Insufficient info and Missing (critical), with the covered % in the centre and an icon link to Obligations.
  - "Risk distribution · Gaps by type" is a stacked priority chart.
  - Lower grid: "Priority ledger · Top risks" (risk rows plus a "View all" text button) and the insight card.
- **Analyst view**:
  - KPIs: Needs review, Accepted, Critic retries, Applicability.
  - "Measured quality · Accuracy against answer key" (metric bars).
  - "Review status · Extracted obligations" with Accepted, Edited, Awaiting review and Rejected.
  - "Work queue · Items awaiting your review".

### Documents (`/documents`)
- Eyebrow "Library · {n} documents"; subtitle "Real RBI source text and fictional Nova Trust Bank materials, with provenance kept visible." Primary action: **Upload document**.
- Table sheet titled "Source register · Document corpus" with search. Columns: Title (with mono meta), Type, Version, Status.
- Clicking a row opens a drawer with the details.
- **Pipeline panel**: "Pipeline run …" steps, each with an icon (spinning while running, success, warning on retry, critical on failure), a duration and a note. Conditional steps are indented.
- **Upload dialog** ("Add to corpus · Upload document"):
  - Dashed dropzone, "Drop a PDF, Markdown, text or CSV file · 10 MB maximum".
  - Two-column form: Document type (Regulation/Policy/RCM/Evidence), Regulator (regulations only), Title (full width), Version label, and Supersedes (hint: "Triggers change and impact analysis").
  - Footer buttons: Cancel and **Upload and process**.

### Changes (`/changes`)
- Eyebrow "Change intelligence · obligation-level comparison"; subtitle "What changed between versions, what was withdrawn, and which controls and gaps it affects."
- KPI strip, then a comparison header showing "Earlier version → Later version".
- Change cards, each with tags, a summary and two columns: **Before** (critical left border, removed text struck through) and **After** (success left border, added text tinted). An "Impact" row follows with linked controls and gaps.

### Obligations (`/obligations`)
- Eyebrow "Extraction review · verbatim source beside every field".
- Split view, roughly 1.25fr / 0.75fr (stacks at ≤1280px):
  - Left: a selectable table with search and filters. Columns: Code, Obligation, Criticality (5-bar meter), Coverage, Review. The selected row gets a highlight tint and a 2px primary inset.
  - Right: a sticky source panel, "Source · {clause}", with the verbatim QuoteBlock, a definition list, an edit form, and Accept / Edit / Reject. Reject uses the ReasonDialog.
- `?select={id}` deep-links a row.

### Controls (`/controls`)
- Eyebrow "Control framework · Nova Trust RCM and policies".
- Tabs: **Risk control matrix**, a table of controls; clicking one opens a drawer with "Mapped obligations · n", a QuoteBlock and a GraphPath.
- **Obligation × control · Mapping matrix**: obligation rows against control columns, with centred glyph cells (success, warning, critical and neutral).
- Subtitle note: mappings show the graph path and the critic result, never a confidence score.

### Gaps (`/gaps`)
- Eyebrow "Exposure register · sorted by risk score".
- Table with search, priority/status filter pills and pagination. Columns: Priority chip, Finding (mono code + title), gap type, owner/status, and a risk score.

### Gap trace (`/gaps/:gapId`)
- Eyebrow "Gap trace · clause to remediation".
- Layout: a 760px trace column and a 320px sticky **verdict** panel. They stack at ≤1100px.
- The trace is a vertical timeline with a 2px rail and coloured dots (clause, obligation, control, evidence, gap). Each step shows a mono title, a lede, inline facts, QuoteBlocks, control cards, a Design / Operating assessment grid, evidence, and remediation cards.
- The verdict panel shows:
  - Status
  - Risk total (34px number) with a dotted ledger of factors
  - Verdict actions as full-width buttons; reason-required actions use the ReasonDialog
  - An audit list
- Print styles turn this page into a clean audit-pack page with no chrome.

### Remediation (`/remediation`)
- Eyebrow "Remediation · drafted by agent, approved by people".
- A five-column board (horizontal scroll, columns at least 200px wide). Each column has a sunken header with a count. Items show a priority chip, the action text, meta and a 4px segmented progress bar, and link back to their gap.

### Graph (`/graph`)
- Eyebrow "Knowledge graph · rebuilt from Postgres after each run".
- Canvas sheet with a toolbar: a "Focus gap" select and a legend of node swatches.
- The SVG graph is laid out in columns (Clause, Obligation, Control, Evidence, Gap, Remediation). Nodes have a coloured left bar and a coloured outline; remediation nodes are dashed. The focused path's edges are primary and 1.8px; other nodes fade to 35%.
- A 300px sticky "Path for …" panel sits on the right.

### Agent runs (`/runs`, `/runs/:runId`)
- Eyebrow "Observability · agent_runs". The table lists Run and Status.
- The detail page shows a KPI strip, a node table (Node, Status, duration, tokens) and a Gantt timeline of 14px tracks. Bars use `--seq-3`; running = primary, failed = critical, and retried bars have a warning edge.

### Audit log (`/audit`)
- Eyebrow "Audit log · insert only".
- Search and filters, then a table with columns When (mono), Actor (avatar + name), Action and Entity, with an italic reason line.

### Not found
- PageFrame with the eyebrow "RuleSight", the title "Page not found" and the subtitle "The address does not match any screen."

---

## 9. Responsive breakpoints

| Width | Changes |
|---|---|
| ≤1280px | Obligations split view and trace layout narrow, then stack; the source panel stops being sticky |
| ≤1100px | Sidebar collapses to a 64px icon rail; dashboard grids go to one column; trace, graph and verdict stack; `.hide-md` columns hide |
| ≤900px | Sign-in goes to one column with a compact hero; the donut stacks |
| ≤760px | Sidebar becomes an off-canvas drawer (232px) with a scrim, and the hamburger shows; the search trigger becomes an icon; the theme label, actor name and chevron hide; KPIs go to 2 columns, each with its own border; all form grids go to one column; `.hide-sm` columns hide; page padding drops to 16px |

---

## 10. Accessibility rules in use

- A skip link to `#main-content` on every page.
- Every chart has a text legend and value; nothing relies on colour alone, since priorities also carry the "P1/P2/P3" text.
- Comboboxes and listboxes use `aria-activedescendant` (palette); dialogs use `aria-modal` and restore focus when they close.
- Reduced motion turns off every animation and transition.
- In forced-colours mode, statuses, priorities, active filters and the active nav get a `CanvasText` border.

---

## 11. Known leftovers (worth cleaning up)

- The header comment in `index.css` and the doc comment in `brand-mark.tsx` still say "Aubergine & Parchment" and "Plum square with a cream rule".
- `index.html` `theme-color` metas are still `#FAF5EE` and `#17121C` (the old parchment and plum). They should be the new `--background` values: about `#F5F8FB` light and `#0E1724` dark.
- The ≤760px rules still set the sidebar scrim to `rgb(23 18 28 / .4)`, which is plum; it should be navy.
- The actor select and every `Select` still use the native `<select>` popup, which the browser draws in system colours and which ignores the theme.
