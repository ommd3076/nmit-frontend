# Chart source notes

Checked 2026-10-30 IST. EvilCharts upstream was source-inspected at commit
`4c2dd7c9bae780703244265c9a4b509d40c055ad` (main, 2026-10-29); no package was
installed and upstream code was not executed in this project.

- [EvilCharts Recharts line chart](https://github.com/legions-developer/evilcharts/blob/4c2dd7c9bae780703244265c9a4b509d40c055ad/src/registry/charts/recharts-line-chart.tsx)
- [EvilCharts Recharts bar chart](https://github.com/legions-developer/evilcharts/blob/4c2dd7c9bae780703244265c9a4b509d40c055ad/src/registry/charts/recharts-bar-chart.tsx)
- [EvilCharts Recharts radial chart](https://github.com/legions-developer/evilcharts/blob/4c2dd7c9bae780703244265c9a4b509d40c055ad/src/registry/charts/recharts-radial-chart.tsx)
- [Official component docs](https://evilcharts.com/docs/recharts/components)
- [Install and registry instructions](https://evilcharts.com/docs/recharts/installation)

The project keeps its existing Recharts dependency and component boundaries.
Chart refinements adapt the upstream compound chart structure, chart-scoped SVG
definitions, deliberate gradients/rounded bars, and reduced-motion-aware reveal
behavior while keeping empty data empty and preserving the existing API types.
They do not claim the package/registry components themselves are installed.

Rare UI's official registry is configured in `nmit-frontend/frontend/components.json`
as `@rare-ui` → `https://raw.githubusercontent.com/swamimalode07/rare-ui/main/public/r/{name}.json`.
The shadcn MCP registry lookup from repository root returned `NOT_CONFIGURED`
because its server context did not resolve this nested project config; the official
registry JSON was read-only inspected as a fallback. No Rare UI component is used
in chart paths because its listed visual widgets do not fit these data displays.

Icon assets are downloaded as exact SVGs from the official Iconoir project and
remain under `public/assets/iconoir/`; Iconoir is MIT licensed:
[license](https://github.com/iconoir-icons/iconoir/blob/main/LICENSE).
