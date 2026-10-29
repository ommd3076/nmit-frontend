# AGENTS.md — ArQ / DebugLeaf (QML-01, Quant-A-Maze 3.0)

## Product
Delay-risk-aware fleet dispatch for contract logistics. Users: the dispatcher (web) and the driver (Android). Target customer: a mid-sized 3PL (pitch framing, not validated demand).

## What exists (team's account; confirm in Phase 0)
FastAPI backend on Ojus's laptop, routes `/api/v1/*`, `BoundedSemaphore(2)` → 429 `capacity_reached`.
- validator.py: independent constraint checker.
- Engines: exact enumeration (domain.py); financial exact cover (financial.py, $ per minute); warm-start QAOA (qaoa.py); VQC inference (learning_inference.py, quantum_learning.py, qpiai_vqc.py — 2-qubit statevector).
- qubo.py with penalty bounds. jobs.py: async jobs, SQLite WAL, cancel, restart_interrupted. recovery.py: mid-shift re-plan, locked prefixes, audit log. experiments_run2: Newton GBDT + Platt calibration.
- UNKNOWN: whether QCloud or QpiAI Opt is actually called.
- USER CLAIMS (show only with a run log): 0.0% fallback, Brier −46.9%, regret −30.8%.

## Scope
Edit `frontend/` (React+Vite+TS), `apps/driver-mobile/` (Expo), `packages/shared-types/`, `contract/`, `docs/`. Backend edits only in Phase 0 (QpiAI gate) and optional Phase D (driver endpoints), each approved by the team first. Preserve everything else.

## Hard rules
1. Phase 0 is a gate (skills/qpiai-compliance-gate). No UI phase starts before PHASE0-REPORT.md is committed.
2. Call only routes in `frontend/src/api/ENDPOINTS.md`, typed from `contract/openapi.json` via openapi-typescript.
3. Handle 429 capacity_reached, job polling, cancel, interrupted jobs and recovery re-plan exactly as in skills/api-contract-and-jobs.
4. One sentence-case source badge per component (skills/honest-data-states). Never imply QCloud/Opt ran unless the job record says so.
5. Money in ₹ with labelled assumed rates (financial.py is $/min).
6. ETAs and P(late): intervals + "simulated". Comparison: gap, feasibility, runtime; "No speed-up claimed".
7. Driver endpoints don't exist: driver screens are Preview until Phase D ships.
8. No device permissions until a feature needs them. No GPS dot, no auth, no proof of delivery implied.
9. Style: glass minimalism, light (skills/tokens-glass-light). The brief wins over generic anti-slop rules; keep AA contrast and the no-blur fallback.
10. Maps: MapLibre GL + OpenFreeMap (web), MapLibre RN (mobile), SVG for Solomon x/y. No keyed tile providers.
11. Motion: one purposeful moment per screen; honour reduced motion.
12. Cut taglines and helper text; fix the layout instead. Improve UX, DX and agent experience together without breaking anything. (Voxyz_ai)
13. Never claim emulator, device or live-backend testing without pasted output. `expo export` proves bundling only.

## Commands
`make setup | assets | openapi | types | dev-api | dev-web | dev-mobile | android | build-web | typecheck | test | verify | zip`

## Skills (≤ 3 per task)
qpiai-compliance-gate · api-contract-and-jobs · honest-data-states · tokens-glass-light · web-dashboard · map-web · map-mobile · driver-android-expo · motion-and-assets · a11y · agent-workflow
Plan: IMPLEMENTATION-PLAN.md.
