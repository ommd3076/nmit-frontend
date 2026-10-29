---
name: tokens-glass-light
description: Use before writing any colour, blur, radius, spacing or type value.
---
# Tokens: glass minimalism, light

The brief (Ojus, Oct 29) asks for "glass minimalism, light" like dribbble.com/shots/27159747-Logistic-Dashboard. **The brief overrides the earlier anti-slop ban on glass.** We could not open that shot (Dribbble bot challenge), so these values are our own, built to the brief.

## Colour
| Token | Value | Use |
|---|---|---|
| --bg | #eef1f4 | page (light cool neutral) |
| --bg-tint | radial soft #dfe7f0 → #eef1f4 | behind glass only |
| --glass | rgba(255,255,255,.62) | panels |
| --glass-strong | rgba(255,255,255,.82) | panels holding body text |
| --glass-border | rgba(255,255,255,.7) + 1px rgba(16,24,40,.06) outer | panel edge |
| --ink | #0f1720 | text |
| --muted | #4a5565 | secondary text (≥4.5:1 on --glass-strong over --bg) |
| --accent | #2f5bea | primary action, selection |
| --risk-low/med/high | #1f8a4c / #b26b00 / #c62828 | always with a text label |
| --map-route-1..6 | #2f5bea #0f8b8d #b26b00 #8e3bd1 #c62828 #2b7a0b | vehicle routes |
Kept from the old visual ref: focus ring 3px, offset 3px; `.sr-only`.

## Glass
```css
.glass{background:var(--glass);border:1px solid var(--glass-border);border-radius:14px;
  backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);
  box-shadow:0 1px 2px rgba(16,24,40,.06),0 8px 24px rgba(16,24,40,.06)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .glass{background:#fbfcfd}}
@media (prefers-reduced-transparency:reduce){.glass{background:#fbfcfd;backdrop-filter:none}}
```
- Text sits on --glass-strong or solid; check contrast against the worst background behind it.
- No glass on tables of numbers or on the map (map gets a solid panel edge). Max 2 blur layers stacked.
- RN: `expo-blur` BlurView only on the tab bar and one header; elsewhere solid `rgba(255,255,255,.9)`. Android blur is costly; keep `intensity` ≤ 40 and test on a low-end device.

## Type, space, radius
Inter (OFL) or system-ui; sizes 12/14/16/20/28; `tabular-nums` for numbers. Spacing 4-base: 4/8/12/16/24/32. Radius 14 panels, 10 controls, 999 pills.
