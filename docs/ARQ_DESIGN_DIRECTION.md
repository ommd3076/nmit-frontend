# arQ — Design Direction & Reference Matrix
*Logistics Intelligence & Dispatch Command Center*

---

## 1. Executive Summary & Brand Identity

**Brand Name:** `arQ` (lowercase `a`, lowercase `r`, uppercase `Q`).
**Product Class:** Real-time logistics dispatch intelligence, fleet routing, and SLA risk mitigation platform.
**Aesthetic Anchor:** Premium glass minimalism + Swiss-inspired information hierarchy + Apple-grade tactile precision + industrial logistics credibility.

arQ balances mathematical rigor (exact solvers, QUBO formulations, VQC/GBDT models) with operational dispatch speed. The user interface eschews decorative tech tropes (neon halos, purple/blue AI gradients, fake floating orbs) in favor of crisp typography, layered translucent materials, high-density scannable data layouts, and interactive geospatial mapping.

---

## 2. Authoritative Dribbble Reference Analysis

### Reference Matrix

| Reference | Title / URL | Core Inspiration Taken | Intentionally Omitted |
|---|---|---|---|
| **Ref A** | **Vanta Ride**<br>`dribbble.com/shots/27476428` | Floating glass control sheets over geospatial canvas; trip leg timelines; compact vehicle/driver indicator cards; warm amber accent for priority/urgency. | Consumer ride-hailing idioms (fare quotes, passenger tipping, destination discovery); mobile-only swipe actions. |
| **Ref B** | **AI Logistics Dashboard** *(Primary Structural Reference)*<br>`dribbble.com/shots/25699116` | Three-column command-center topology: left navigation rail, central hero map with floating status pills, right contextual operations & telemetry drawer; global fleet health metrics. | Low-contrast grey text; decorative un-clickable radar charts; simulated "Live" pulses that don't match data freshness. |
| **Ref C** | **Logistic Dashboard** *(Primary Visual Refinement)*<br>`dribbble.com/shots/27159747` | Soft off-white canvas (`#F6F8F5`); multi-tier border radii (24px panels, 16px cards, 10px controls); hairline borders (`rgba(16,24,40,0.06)`); calm whitespace rhythm. | Overly large marketing headlines; single generic border-radius on all elements; excessive drop-shadows. |
| **Ref D** | **Logistics Dashboard** *(Primary Operations Reference)*<br>`dribbble.com/shots/27715509` | Forest green (`#205A46`) + muted mint (`#A8DBC9`) + graphite (`#17231F`) semantic palette; dense tabular shipment & stop data with inline status chips; route completion progress bars. | Unlabeled colored dots; cluttered dense spreadsheets without hierarchy; non-responsive column layouts. |
| **Ref E** | **Logistics Driver Mobile App**<br>`dribbble.com/shots/26720769` | High-contrast touch target buttons (min 44px); bold tabular stop sequence badges; high-legibility dark ink for outdoors. | Full mobile auth/onboarding flows (deferred to Phase D mobile work). |

---

## 3. Saved Fieldnotes Archive Integration (`visual-ref-saved-fieldnotes.html`)

An exhaustive extraction of the 238 curated bookmarks in `assets/visual-ref-saved-fieldnotes.html` yields the following design principles applied to arQ:

### 3.1 Classification & Curated Patterns

1. **Dashboards & Data-Dense Applications**
   - *Inspirations:* `@himanshubuildss`, `@amananimates` (Refero Styles, Mobbin, Land-book, Navbar Gallery, Footer.design).
   - *Application in arQ:* High-density tables with fixed column alignment, sticky table headers, inline stop-level risk meters, and clear active row indicators.

2. **Mapping & Mobility**
   - *Inspirations:* Dark/light vector map styling, OpenFreeMap Positron integration, real road polyline geometry with vehicle turn markers and numbered stop clusters.
   - *Application in arQ:* Seamless MapLibre GL JS integration with automatic style fallback to SVG graph plots for synthetic coordinates (Solomon benchmark).

3. **Glassmorphism & Advanced Surfaces**
   - *Inspirations:* `@tobiadonadon_` (Anti-generic AI app skills), `@shipper_now` (epstein.md rules against excessive blur/gradients), `mengto/progressive-blur`.
   - *Application in arQ:* Restricted two-tier translucency: `--glass` (`rgba(255,255,255,0.72)`) for navigation/floating rails and `--glass-strong` (`rgba(255,255,255,0.88)`) for text-heavy inspection panels. Strict `@supports not (backdrop-filter)` fallback to solid `#FFFFFF`.

4. **Typography & Color Hierarchy**
   - *Inspirations:* Swiss typographic discipline, `@ericzakariasson/scandinavian-design`, `@karpathy`.
   - *Application in arQ:* Inter Variable with `font-variant-numeric: tabular-nums` across all timestamps, penalties (₹), and SLA margins. No all-caps shout text; sentence case for source badges and operational tags.

5. **Micro-interactions & Motion**
   - *Inspirations:* Emil Kowalski's design-engineering rules (`emil-design-eng`), `fixing-motion-performance`, Motion for React (`motion/react`).
   - *Application in arQ:* Fast, quiet, tactile interactions (150–200ms `ease-out`); only compositor properties (`transform`, `opacity`) animated; zero layout thrashing; strict adherence to `prefers-reduced-motion`.

6. **Anti-Slop & Honest Provenance**
   - *Inspirations:* `@hardikpandya/stop-slop`, `anthropics/frontend-design`, `honest-data-states`.
   - *Application in arQ:* Every metric displays an explicit provenance badge (`Validated`, `Exact (enumeration)`, `QpiAI Opt · local solver`, `Simulated · held-out run`, or `Preview`). No fabricated AI claims.

---

## 4. Visual Token Architecture

### 4.1 Color System

| Semantic Role | Token Name | Value | Purpose |
|---|---|---|---|
| Canvas Background | `--arq-canvas` | `#F6F8F5` | Calming off-white paper neutral |
| Surface Translucent | `--arq-glass` | `rgba(255, 255, 255, 0.72)` | Floating sidebars and filter bars |
| Surface Solid / Strong | `--arq-glass-strong` | `rgba(255, 255, 255, 0.88)` | Primary data cards, modal drawers |
| Primary Ink | `--arq-ink-primary` | `#15211D` | Headlines, primary metrics, high contrast |
| Secondary Ink | `--arq-ink-secondary` | `#68756F` | Metadata, unit labels, table headers |
| Deep Graphite | `--arq-graphite` | `#17231F` | Selected row borders, dark badges |
| Forest Green | `--arq-forest` | `#205A46` | Primary brand accent, on-time status, verified badge |
| Muted Mint | `--arq-mint` | `#A8DBC9` | Success tint, active stop fill, light badges |
| Soft Sage | `--arq-sage` | `#D9E6DC` | Subtle borders, hover backgrounds |
| Warm Amber | `--arq-amber` | `#D78A45` | Medium delay risk, warning notices |
| Alert Red | `--arq-red` | `#C6534C` | High SLA breach risk, job failure, severe delays |
| Route Palette 1–6 | `--route-1`...`--route-6` | `#2F5BEA`, `#0F8B8D`, `#D78A45`, `#8E3BD1`, `#C6534C`, `#205A46` | Distinct multi-vehicle path identification |

### 4.2 Elevation, Geometry & Blur

- **Panel Radii:** `24px` for outer container modules; `16px` for internal operational cards; `10px` for buttons, inputs, and chips.
- **Borders:** `1px solid rgba(21, 33, 29, 0.08)` outer border + inner highlight `inset 0 1px 0 rgba(255, 255, 255, 0.8)`.
- **Blur:** `backdrop-filter: blur(16px) saturate(140%)`.
- **Shadows:** Multi-layer soft ambient shadows: `0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)`.
