# arQ — Design System Specification
*Aesthetic: Glass Minimalism + Swiss Precision + Tactile Industrial Dispatch*

---

## 1. Brand Identity & Foundations

### 1.1 Brand Name
- **arQ** (exact casing: lowercase `a`, lowercase `r`, uppercase `Q`).
- Tagline / Architecture: `QML-01 · Logistics Intelligence & Dispatch Command Center`.

### 1.2 Core Design Principles
1. **Legibility Beats Expression:** Every visual property (border, blur, color, badge) encodes operational information rather than decoration.
2. **Tactile Hierarchy via Layered Glass:** Translucent layers distinguish interactive controls from background canvas, with strict `@supports not (backdrop-filter)` solid fallbacks.
3. **Tabular Numerals & Time Standard:** All durations, timestamps, and SLA penalties use `font-variant-numeric: tabular-nums` and explicit `IST` timezone labels.
4. **Honest Data States:** No metric is displayed without a provenance badge identifying its computational source.

---

## 2. Color System & Semantic Tokens

| Token Name | Hex / CSS Value | Semantic Role | WCAG Contrast |
|---|---|---|---|
| `--arq-canvas` | `#F6F8F5` | Primary off-white paper canvas | 15.2:1 against ink |
| `--arq-glass` | `rgba(255, 255, 255, 0.75)` | Translucent floating rails and filters | High contrast on canvas |
| `--arq-glass-strong` | `rgba(255, 255, 255, 0.92)` | Data inspection panels, drawers, modals | 14.8:1 against ink |
| `--arq-ink-primary` | `#15211D` | Headlines, primary metrics, high contrast | AA / AAA compliant |
| `--arq-ink-secondary` | `#68756F` | Metadata, unit labels, table headers | 4.6:1 against glass |
| `--arq-graphite` | `#17231F` | Dark interaction buttons, active states | AA compliant |
| `--arq-forest` | `#205A46` | Primary brand accent, on-time status | AA compliant |
| `--arq-mint` | `#A8DBC9` | Accent tint, completed stop fills | Visual indicator |
| `--arq-sage` | `#D9E6DC` | Structural divider lines, grid borders | Subdued neutral |
| `--arq-amber` | `#D78A45` | Medium SLA risk, warning alerts | 4.5:1 against glass |
| `--arq-red` | `#C6534C` | Critical SLA violation risk, cancellations | 4.8:1 against glass |
| `--route-1` | `#2F5BEA` | Primary Route 1 (Cobalt Blue) | High visibility on basemap |
| `--route-2` | `#0F8B8D` | Route 2 (Teal) | High visibility |
| `--route-3` | `#D78A45` | Route 3 (Warm Amber) | High visibility |
| `--route-4` | `#8E3BD1` | Route 4 (Purple) | High visibility |
| `--route-5` | `#C6534C` | Route 5 (Red / Delay) | High visibility |
| `--route-6` | `#205A46` | Route 6 (Forest Green) | High visibility |

---

## 3. Typography & Numerals

- **Primary Font Family:** `Inter Variable`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Display Weights:**
  - Extra Bold (`font-extrabold` / `font-black`, 800/900): System headings, vehicle callsigns, total penalty values.
  - Semi-Bold (`font-semibold`, 600): Table headers, card labels, active navigation items.
  - Medium (`font-medium`, 500): Time windows, addresses, body prose.
  - Normal (`font-normal`, 400): Supporting annotations, legal disclaimers.
- **Tabular Figures:** Applied universally via `.tabular-nums` (`font-variant-numeric: tabular-nums`) to prevent jittering when counters, elapsed timers, or GPS coordinates update.

---

## 4. Elevation, Radii & Glass Surfaces

```css
/* Glass Minimalism Panel */
.glass-panel {
  background: var(--arq-glass);
  border: 1px solid var(--arq-glass-border-outer);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.05);
}

/* Glass Strong Panel for Data-Heavy Views */
.glass-panel-strong {
  background: var(--arq-glass-strong);
  border: 1px solid var(--arq-glass-border-outer);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 2px 6px rgba(16, 24, 40, 0.04), 0 12px 32px rgba(16, 24, 40, 0.08);
}
```

### Corner Geometry
- Container panels: `24px` to `28px` (`rounded-3xl`).
- Operational cards & drawers: `16px` to `18px` (`rounded-2xl`).
- Buttons, inputs, search boxes: `10px` to `12px` (`rounded-xl` / `rounded-full`).
- Badges and status pills: `999px` (`rounded-full`).

---

## 5. Motion Tokens

Enforces Emil Kowalski design engineering principles (`emil-design-eng`):
- **Duration:** 150ms–200ms for interaction feedback (hover, click, active toggle).
- **Easing:** `ease-out` for entrances; instant response on releases.
- **Compositor Isolation:** Animate only `transform` and `opacity`. Never animate `width`, `height`, `margin`, or `padding`.
- **Reduced Motion:** Automatic CSS override disables all transitions when `prefers-reduced-motion: reduce` is active.
