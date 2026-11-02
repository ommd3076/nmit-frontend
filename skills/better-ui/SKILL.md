---
name: better-ui
description: "Polishes surfaces, icons and motion with exact values for border radius, optical alignment, shadows, and animation."
---

# UI Polish & Surface Craft

## Rules
1. **Concentric Radii**: $R_{\text{outer}} = R_{\text{inner}} + \text{padding} + \text{border}$ so nested corners look naturally parallel.
2. **Layered Shadows for Elevation**: Use multi-layer subtle shadows (`box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)`) rather than heavy 1px borders.
3. **Press Scale**: Interactive buttons scale to `0.96` over `150ms ease-out` on click/tap (`active:scale-[0.98] transition-transform duration-150`).
4. **Optical Alignment**: Nudge icons and counters by 1-2px where geometric center looks lopsided.
5. **High-Frequency Feedback**: Row hovers, filters, and tab switches respond in ≤100ms.
6. **Reduced Motion**: Respect `prefers-reduced-motion` with cross-fades rather than transform animations.
