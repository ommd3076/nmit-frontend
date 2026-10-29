---
name: motion-and-assets
description: Use when adding icons, illustrations, fonts or motion.
---
# Motion and assets

## Motion (modest, purposeful; own rules plus impeccable's "one motion moment")
- One moment per screen at most: e.g. the new plan's routes drawing in after a re-plan (300–500ms), or a job card settling into "Succeeded".
- State changes 150–200ms ease-out. No scroll-jacking, no parallax, no shader backgrounds.
- `prefers-reduced-motion` → no movement, instant state change. RN: `AccessibilityInfo.isReduceMotionEnabled()`.
- Web: Motion (motion.dev). RN: react-native-reanimated only if already installed; else Animated.

## Scrolltide (what Ojus mentioned)
Scrolltide (scrolltide.co) is real: a paid library of prompts for scroll-driven marketing sites and hero sections (Vite + Tailwind + Framer Motion), $39/month to $299 lifetime, no refunds. It isn't a JS library. **Not used** in the product: it targets landing pages and an Operate dashboard shouldn't scroll-animate. If a pitch landing page is built later, it could be considered; that's a purchase only Ojus can decide. If he meant GSAP ScrollTrigger or Lenis, same answer: not for this dashboard.

## Icons
Primary: **Lucide** (ISC licence), `lucide-react` web, `lucide-react-native` mobile. One set only. Alternatives if a glyph is missing: Tabler Icons (MIT), Phosphor (MIT). Never mix sets on one screen.
Logistics glyphs in Lucide: truck, package, map-pin, route, clock, alert-triangle, lock, timer, gauge, list-checks, warehouse.

## Illustrations
Optional, first-run empty state only. unDraw: free, no attribution, commercial OK; licence forbids redistributing in packs, building a competing service, and AI/ML training use. Download the one SVG by hand from undraw.co and commit it; don't script scraping (licence forbids automated downloading without consent).

## Fonts
Inter via `@fontsource-variable/inter` (OFL) on web; `@expo-google-fonts/inter` on mobile, or system font.
