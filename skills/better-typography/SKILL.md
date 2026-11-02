---
name: better-typography
description: "Sets and reviews how text renders, from type scale and spacing to font features, wrapping, truncation and punctuation."
---

# Better Typography System

## Typography Rules
1. **Tabular Numbers**: Apply `font-variant-numeric: tabular-nums` (or `tabular-nums` in Tailwind) to all changing numbers, timers, coordinates, and prices so layouts don't jitter.
2. **Line Heights**:
   - Display / Hero: `1.1` to `1.15`
   - Section Headings: `1.2` to `1.25`
   - Body Copy: `1.5` to `1.6`
   - Micro-labels: `1.0` to `1.2`
3. **Letter Spacing (Tracking)**:
   - Headings (≥24px): `-0.02em` (`tracking-tight`)
   - Micro-labels (≤12px, uppercase): `+0.05em` (`tracking-wider`)
   - Body: `0` (`tracking-normal`)
4. **Text Wrap**:
   - `text-wrap: balance` on headlines and cards
   - `text-wrap: pretty` on multi-line descriptions
5. **No Synthetic Fonts**: Load exact weights (Inter Variable, JetBrains Mono for coordinates/quantum parameters).
