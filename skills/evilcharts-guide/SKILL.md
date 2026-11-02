---
name: evilcharts-guide
description: "Guidelines for implementing high-aesthetic, opinionated, beautifully animated charts using EvilCharts principles."
---

# EvilCharts Aesthetics & Implementation Guide

Reference: https://evilcharts.com/docs

## Principles
1. **Unapologetically Opinionated UI**:
   - Deep, subtle SVG gradients instead of flat fills (`linearGradient` with 0.4 -> 0.05 opacity).
   - Crisp, delicate strokes (`strokeWidth={2}` with vibrant accent color).
   - Glow filters and soft drop shadows on lines and points (`filter: drop-shadow(0 0 6px rgba(...))`).
   - Clean, rounded bars with gradient vertical fills.
2. **Tabular Metric Tooltips**:
   - Custom floating frosted-glass tooltips with border shine and tabular numbers (`tabular-nums`).
   - Metric diff indicator (e.g. green `-30.8%` regret reduction, amber risk exposure).
3. **Compound Components**:
   - Responsive containers with zero CLS (reserve aspect ratio or min-height).
   - Subtle animated stroke dashoffset / reveal animations on initial mount.
