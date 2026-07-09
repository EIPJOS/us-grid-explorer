# US Grid Explorer Design System

This document captures the visual system currently implemented in the app shell and the main content views. It is meant to be the source of truth for future layout and component work.

## 1) System overview

The site uses a compact dark UI built from:

- a single shared font stack (`Inter` + system fallbacks),
- a small set of CSS variables in `src/styles.css`,
- component-level hardcoded sizes for typography, spacing, and icon placement,
- 8px card/panel radii with 1px borders,
- lime as the primary accent and blue as the secondary accent.

There is not a full tokenized design system yet. Most measurements are hardcoded per component, but the site is visually consistent because the same values repeat throughout the shell, map panels, and content pages.

## 2) Iconography

### Library

- Package: `lucide-react`
- Installed version: `^0.468.0`
- Style: outline/monoline icons with rounded terminals
- Default stroke width: `2`
- Explicit exception: the brand mark uses `Zap` with `strokeWidth={2.6}`

### Standard icon sizes by context

| Context | Icon(s) | Size | Stroke width | Notes |
|---|---:|---:|---:|---|
| Brand mark | `Zap` | 18px | 2.6 | Rendered inside the 36x36 lime brand square |
| Top nav items | `Map`, `MapPinned`, `Database`, `Radio`, `Newspaper`, `BarChart3`, `BookOpen` | 16px | 2 | Inline with the section label |
| Trust link | `ShieldCheck` | 14px | 2 | Used in the top-right trust center link |
| Feed tabs | `Bell`, `ListFilter`, `Library` | 16px | 2 | Used in the Feeds tab strip |
| Feed summary cards | `Activity`, `Landmark`, `Database`, `Newspaper` | 18px | 2 | Centered inside 31px icon chips |
| Feed card metadata | `MapPin` | 13px | 2 | Inline in location metadata |
| Feed card links | `ExternalLink` | 11px or 13px | 2 | Used for source/document links and "Read original" |
| Feed card empty/detail actions | `X`, `Server`, `Zap` | 17px to 24px | 2 | Close button, detail heading, and empty state |
| Grid Signals header/status | `Clock3`, `RefreshCw`, `AlertCircle`, `Activity`, `Radio` | 13px to 18px | 2 | Status chip, refresh, chart title, cards |
| Selection panel | `MapPin`, `Server`, `Zap`, `X` | 20px / 17px / 24px | 2 | Feature icon, empty-state icon, close button |
| Learn view | `BookOpen`, `Sparkles`, `Network`, `Zap`, `Database`, `Radio`, `Server`, `CheckCircle2`, `Circle`, `ArrowRight` | 16px to 17px | 2 | Used in lessons and story cards |

### Icon source files to preserve as the "correct" style

- `src/App.jsx` - top navigation, brand, trust link, release badge
- `src/components/GridSignalsView.jsx` - status cluster, refresh button, signal cards
- `src/components/DataCenterWatchView.jsx` - Feeds header, tab strip
- `src/components/DataCenterWatchStats.jsx` - summary cards
- `src/components/DataCenterWatchCard.jsx` - feed card metadata and links
- `src/components/SelectionPanel.jsx` - floating detail panel icon language
- `src/components/LearnView.jsx` - lesson/story card icon language

## 3) Shapes, borders, and elevation

### Corner radius

| Element | Radius | Where used |
|---|---:|---|
| Brand mark square | 8px | `.brand-mark` |
| App cards / panels | 8px | `.floating-panel`, `.watch-card`, `.analysis-card`, `.lesson-content`, `.story-card`, `.region-grid button`, `.view-metric`, `.area-card`, etc. |
| Inputs / selects / small buttons | 6px to 7px | Search bars, filter controls, small action buttons |
| Pills / tags / badges | 999px | Release badge, type pills, topic chips, status pills, coverage note |
| Tiny secondary controls | 5px | Some segmented controls such as the area radius toggle |

### Border widths

- Standard panel/card border: `1px`
- Active top navigation underline: `2px`
- Focused/important callouts:
  - `3px` left border for the area report header
  - `3px` inset bar for the active lesson item
  - `2px` left border for some warnings/takeaways

### Shadows / elevation

| Element | Shadow |
|---|---|
| Floating map panels | `0 18px 50px rgba(0,0,0,0.3)` |
| Search bar | `0 16px 45px rgba(0,0,0,0.28)` |
| Leaflet tooltips | `0 8px 24px rgba(0,0,0,0.35)` |
| Release dot halo | `0 0 0 5px rgba(255, 158, 79, 0.12)` |
| Active icon dots / glows | `0 0 10px currentColor` or similar small glow treatments |

### Common container forms

- Rounded card: 8px radius, 1px border, dark solid panel background
- Pill: 999px radius, used for badges, chips, filters, and coverage notes
- Segmented control: small-radius inner buttons inside a bordered container
- Map panel: floating blurred panel with 8px radius and stronger shadow

## 4) Typography

### Font family

Declared on `:root` in `src/styles.css`:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Implementation note

Typography is mostly hardcoded per component rather than controlled by a token scale. There are no CSS variables for font sizes or weights today.

### Text scale used in the app

| Context | Size | Weight | Line-height | Notes |
|---|---:|---:|---:|---|
| Top nav labels | inherited (browser default, effectively about 16px) | normal | normal | No explicit size set on the nav buttons |
| Brand title (`US Grid Explorer`) | 15px | bold via `<strong>` | normal | In the top-left brand block |
| Brand subtitle | 10px | normal | normal | Uppercase, letter-spaced |
| Top-right release badge / trust link | 10px-11px | normal | normal | Uppercase, letter-spaced |
| Shared page title (`.view-heading h1`) | 38px | default h1 weight | 1.0 | Main page title used across content views |
| Grid Signals hero title | 38px | default h1 weight | 1.0 | Same shared view-heading treatment |
| Feeds hero title | 38px | default h1 weight | 1.0 | Same shared view-heading treatment |
| Watch hero title (`.watch-hero h1`) | clamp(36px, 5vw, 58px) | default h1 weight | 0.96 | Used only in the Feeds hero variant |
| Section heading (`.watch-section-heading h2`) | 22px | default h2 weight | default | Used under the Feeds tabs |
| Area report heading | 25px | default h2 weight | default | `area-report-header h2` |
| Lesson page title | 31px | default h2 weight | 1.08 | `lesson-content h2` |
| Story card title | 27px | default h2 weight | 1.05 | `story-card h2` |
| Method card title | 22px | default h2 weight | default | `method-card h2` |
| Body copy in card-heavy pages | 12px-15px | normal | 1.45-1.55 | Varies by component; mostly hardcoded |
| Captions / labels | 8px-11px | 700-800 in some contexts | 1.2-1.5 | Usually uppercase with letter spacing |

### Common label treatment

- Uppercase labels use `letter-spacing` between `0.04em` and `0.09em`.
- Muted labels and captions typically use `var(--muted)` or one of the hardcoded muted grays.
- Emphasis usually comes from color and weight, not from large font-size changes.

## 5) Spacing

### Rhythm

The site follows a mostly 4px-derived rhythm, but the actual implementation uses many explicit values. The recurring spacing values you should treat as canonical are:

`4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 30, 32, 34, 36, 38, 39, 40, 42, 44, 45, 48, 50, 56, 58, 66`

### Practical spacing rules

| Context | Spacing used |
|---|---:|
| Top nav icon/text gap | 7px |
| Brand icon/text gap | 10px |
| Topbar horizontal padding | 18px desktop, 10px mobile |
| Footer navigation gap | 14px |
| Card/grid gutters | 8px-10px |
| Dense content padding | 12px-15px |
| Regular card padding | 14px-16px |
| Large hero/card padding | 20px-24px |
| Section margin between blocks | 10px-28px |
| Map-side panel offsets | 18px-20px |

### Common layout values

- Main content max width: `1440px`
- Learn page max width: `1280px`
- Feed grid columns: `repeat(3, minmax(0, 1fr))` on desktop; collapses to 1 column on mobile
- Grid Signals metrics row: 7 cards on desktop
- Feed stats row: 5 blocks on desktop

## 6) Color tokens

### CSS variables from `:root`

| Token | Value | Primary use |
|---|---|---|
| `--bg` | `#080b12` | App shell background |
| `--panel` | `rgba(16, 21, 32, 0.94)` | Floating translucent panels |
| `--panel-solid` | `#111723` | Solid cards, content panels, sheets |
| `--line` | `rgba(166, 184, 221, 0.17)` | Borders and separators |
| `--text` | `#f4f7ff` | Primary text |
| `--muted` | `#96a1b9` | Secondary text, labels, muted captions |
| `--lime` | `#dfff3f` | Primary accent, active states, brand square |
| `--blue` | `#7d9fff` | Secondary accent, info cues |

### Repeated hardcoded colors

| Color | Common usage |
|---|---|
| `#090c13` / `#090d14` | Alternate page/map backgrounds |
| `#0c111b` | Inputs, selects, button fills, chart cards |
| `#111607` | Text on lime buttons / brand mark text |
| `#cfd8e8`, `#dce4f2`, `#e2e8f3`, `#f3f6fc` | Stronger light text on dark cards |
| `#7f8ba3`, `#79859b`, `#738098` | Muted neutrals for axes, labels, timestamps |
| `#66e5a5` | Success / connected status dot |
| `#ff9e4f` | Release badge dot / warning warmth |
| `#ff6257`, `#ffaaa4` | Error / unavailable states |
| `#ffad75` | Positive trend / warm accent |
| `#65d7af` | Downward / favorable trend |
| `#aebeff` | Secondary link text and chips |

### State and interaction rules

- Primary action / active: lime background, dark text
- Secondary interactive elements: dark panel fill with line border
- Success / connected: green dot and halo
- Warning / unavailable: red/orange message bar
- Hover: lime or brighter text on links; subtle background lift on cards

## 7) Reference components that best represent the original style

If another tool needs one "golden" reference for each pattern, use these:

1. Global shell / navigation
   - `src/App.jsx`
   - `src/styles.css` (`.topbar`, `.brand`, `.topbar nav`, `.release-badge`, `.app-footer`)

2. Canonical page header and status block
   - `src/components/GridSignalsView.jsx`
   - `src/styles.css` (`.view-heading`, `.signal-status`, `.region-grid`, `.signal-main-grid`, `.method-card`)

3. Canonical content-card system
   - `src/components/DataCenterWatchView.jsx`
   - `src/components/DataCenterWatchStats.jsx`
   - `src/components/DataCenterWatchFilters.jsx`
   - `src/components/DataCenterWatchCard.jsx`
   - `src/components/DataCenterSourceLibrary.jsx`
   - `src/styles.css` (`.watch-*`)

4. Canonical floating map panel / detail sheet
   - `src/components/SelectionPanel.jsx`
   - `src/styles.css` (`.floating-panel`, `.selection-panel`, `.source-card`, `.detail-heading`)

5. Secondary content patterns
   - `src/components/AreaReportView.jsx` and `src/styles.css` (`.area-*`)
   - `src/components/LearnView.jsx` and `src/styles.css` (`.lesson-*`, `.story-*`)

## 8) Practical guidance for future changes

- Keep the 8px card radius and 1px border as the default shape language.
- Keep iconography outline-only unless a filled shape is intentionally used as a background chip.
- Use lime for the most important state and blue for secondary informational cues.
- Prefer the page header pattern from Grid Signals and the card rhythm from Feeds when adding new sections.
- If a new component needs a token, add it to `src/styles.css` first instead of inventing a one-off value.
