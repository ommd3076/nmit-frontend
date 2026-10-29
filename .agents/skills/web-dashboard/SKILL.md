---
name: web-dashboard
description: Use for screens in frontend/ (React + Vite + TS).
---
# Web dashboard

Operate surface: scanability beats expression (impeccable, pbakaus, via ui-skills.com). Look at the current screen before editing; refine, don't redesign.

Stack (own choice): React Router, TanStack Query, TanStack Table, MapLibre GL JS, Lucide icons, Motion (motion.dev) for the one motion moment, Vitest + Testing Library, Playwright for one smoke test.

Screens and routes:
| Route | Screen |
|---|---|
| / | Run list (landing) |
| /runs/:id/plan | Plan |
| /runs/:id/compare | Compare |
| /runs/:id/recovery | What-if / Recovery |
| /runs/:id/evidence | Evidence + Limitations |
| /jobs | Jobs |
| /settings | Settings / Health |
| /overview | Overview (LATER) |

Shell: left rail (icons + labels on ≥1280px), top bar with title, health pill, capacity indicator (x/2 solver slots if the API exposes it), search. Glass panels on --bg.
Copy: buttons say what happens ("Run plan", "Cancel job", "Re-plan from stop 7"); one action keeps one name; user terms (stop, van, window, penalty).
Full screen specs live in IMPLEMENTATION-PLAN.md.
