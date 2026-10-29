# IMPLEMENTATION-PLAN — ArQ / DebugLeaf (QML-01)

Status labels used throughout: OBSERVED (seen in code/output), USER CLAIM (team said), ASSUMED (placeholder until Phase 0), OWN (our design choice).
Route paths in this plan are ASSUMED placeholders under `/api/v1/*`. Phase 0 replaces them with the real ones from `contract/openapi.json`; agents must update this file when they differ.

Every phase ends in a runnable state. A phase is done only when its acceptance checks pass and `make verify` is green.

## Contents
1. Ground rules
2. Phase overview and hours
3. Phases (0, W1–W8, M1–M5, D, P)
4. Web screens (8)
5. Mobile screens (5)
6. Cross-cutting state catalogue
7. Edge-case and risk register
8. Judge path (A1, A2, A3)
9. Real vs preview matrix
10. Demo runbook

## 1. Ground rules

- Read AGENTS.md. Load ≤ 3 skills per task.
- The UI never calls a route that isn't in `frontend/src/api/ENDPOINTS.md`.
- Backend changes only in Phase 0 (QpiAI gate) and Phase D (driver endpoints), each approved by the team before merge.
- Every number-bearing component has one source badge (skills/honest-data-states).
- USER CLAIMS (0.0% fallback, Brier −46.9%, regret −30.8%) appear only beside the run log that produced them.
- Money in ₹ with an 'assumed rate' tag; times in IST with the label 'IST'.
- No device permissions; no GPS, auth or proof-of-delivery implied.
- Do not claim emulator, device, or live-backend tests that weren't run.

## 2. Phase overview and hours (P50 / P80, one person with agents; OWN estimates)

| Phase | Name | Tool | P50 h | P80 h |
|---|---|---|---|---|
| 0 | QpiAI compliance gate + contract (HARD GATE) | Codex | 2 | 6 |
| W1 | Web shell, tokens, health | Gemini Flash | 1.5 | 3 |
| W2 | API client, jobs engine, error mapping | Codex | 2.5 | 6 |
| W3 | Run list (landing) + Jobs | Codex + Gemini | 2.5 | 5 |
| W4 | Plan screen + maps | Codex | 4 | 9 |
| W5 | Compare | Gemini + Codex | 2 | 4 |
| W6 | What-if / Recovery | Codex | 3 | 7 |
| W7 | Evidence + Limitations | Codex | 2.5 | 5 |
| W8 | Polish, a11y, docs | Codex | 2 | 4 |
| M1 | Expo app scaffold + dev build | Codex | 2 | 5 |
| M2 | Live route with map (Preview) | Codex | 3 | 6 |
| M3 | Today, Loads, dock checklist, Profile (Preview) | Gemini Flash | 2.5 | 4 |
| D | OPTIONAL backend change: driver endpoints (team approval) | Codex | 3 | 7 |
| M4 | Connect driver app (only after D) | Codex | 2 | 4 |
| P | Pitch run-through | Ojus | 1 | 2 |

**Total all phases: P50 35.5 h, P80 77 h.**
**Demo-critical path (0, W1–W7, M1, M2, P): P50 26 h, P80 58 h.**
Order: 0 → W1 → W2 → W3 → W4 → W6 → W5 → W7 → M1 → M2 → W8 → M3 → (D → M4 if approved) → P. Overview is LATER.

## 3. Phases

### Phase 0 — QpiAI compliance gate + contract (HARD GATE)
Tool: Codex · Hours P50 2 / P80 6

Steps:
1. Start backend locally; `make openapi`; commit contract/openapi.json.
2. `make types` → packages/shared-types/src/api.d.ts.
3. Write frontend/src/api/ENDPOINTS.md: method, path, request, response, errors, screen.
4. Grep for qpiai imports and call paths (skills/qpiai-compliance-gate §2). Record file:line.
5. If Opt missing: add engines/opt_qpiai.py solving qubo.py QUBO with qpiai-opt mode='local'; log execution_mode, objective, time, seed, penalty weights.
6. If QCloud missing: route qpiai_vqc.py circuit through qpiai-quantum SDK; record backend name + job ID.
7. Pick currency: ₹ with labelled assumed $→₹ rate and per-minute cost; one conversion function.
8. Write docs/PHASE0-REPORT.md: call sites, one logged run per QpiAI path, currency decision, list of USER CLAIMS with or without logs.

Acceptance checks:
- [ ] openapi.json committed and types compile.
- [ ] ENDPOINTS.md lists every /api/v1 route incl. 429 on solve routes.
- [ ] PHASE0-REPORT.md shows at least one logged QpiAI Opt local solve and one QCloud (or 'VQC · local statevector' if QCloud isn't reachable, stated plainly).
- [ ] `pytest -q` passes, including a new test for opt_qpiai fallback when the key check fails.

Verify:
```
make openapi && make types
cd backend && python -m pytest -q
rg -n "qpiai" backend/ | tee docs/qpiai-grep.txt
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase 0. Do steps 1–8 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W1 — Web shell, tokens, health
Tool: Gemini Flash · Hours P50 1.5 / P80 3

Steps:
1. tokens.css from skills/tokens-glass-light incl. @supports fallback.
2. Shell: rail, top bar, health pill (GET health route), router with 8 routes (Overview hidden behind a flag).
3. Settings/Health screen skeleton.

Acceptance checks:
- [ ] `make dev-web` shows shell; health pill reads Connected/Offline correctly with backend on/off.
- [ ] Glass falls back to solid when backdrop-filter disabled (Chrome devtools rendering emulation).

Verify:
```
make typecheck build-web
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W1. Do steps 1–3 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W2 — API client, jobs engine, error mapping
Tool: Codex · Hours P50 2.5 / P80 6

Steps:
1. client.ts with openapi-fetch + generated types; base URL from VITE_API_URL.
2. useJob(id): TanStack Query polling 1s→3s, stops at terminal states, 10 min cap.
3. cancelJob with optimistic 'Cancelling…'.
4. 429 handler with backoff 2/4/8s and Retry-After.
5. Error → plain text mapper; DataBadge; EmptyState; ErrorState; StaleBanner.

Acceptance checks:
- [ ] Unit tests: polling stops on succeeded/failed/cancelled; 429 retries ×3 then surfaces; cancel confirmed only after server state.
- [ ] Mock server (msw) scenarios pass.

Verify:
```
cd frontend && npx vitest run
make typecheck
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W2. Do steps 1–5 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W3 — Run list (landing) + Jobs
Tool: Codex + Gemini · Hours P50 2.5 / P80 5

Steps:
1. Run list table from runs route; search; filter by engine/status.
2. Jobs screen: live list, cancel, interrupted badge, capacity x/2.

Acceptance checks:
- [ ] With the real backend, starting 3 solves shows 2 running and the 3rd as 429 busy with retry.
- [ ] Cancel moves a running job to cancelled within 2 polls.

Verify:
```
make verify
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W3. Do steps 1–2 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W4 — Plan screen + maps
Tool: Codex · Hours P50 4 / P80 9

Steps:
1. RouteMap: MapLibre + OpenFreeMap positron for lat/lon; SVG plot for Solomon x/y.
2. Stops table; stop drawer with ETA interval, P(late) interval, window, slack, penalty ₹.
3. Validator result panel.

Acceptance checks:
- [ ] Solomon instance renders without tiles; lat/lon instance renders with tiles; blocking tiles (devtools) shows the fallback banner and keeps routes.
- [ ] Validator fail shows reasons and no 'Validated' badge.

Verify:
```
make verify
npx playwright test plan.spec.ts
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W4. Do steps 1–3 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W5 — Compare
Tool: Gemini + Codex · Hours P50 2 / P80 4

Steps:
1. Cheap vs risk-aware vs exact; columns gap, feasibility rate, runtime; 'No speed-up claimed'.
2. Exposure badge 'Simulated · held-out run'; ₹ with assumed-rate tag.

Acceptance checks:
- [ ] Table renders from two real runs; missing engine shows 'Not run' not zero.

Verify:
```
make verify
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W5. Do steps 1–2 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W6 — What-if / Recovery
Tool: Codex · Hours P50 3 / P80 7

Steps:
1. Mark stop delayed or override window; submit recovery re-plan; locked prefix greyed; audit log entry; new vs old plan diff; route draw-in motion moment.

Acceptance checks:
- [ ] Recovery job succeeds against the real backend; locked stops unchanged in the new plan (asserted in test); validator result shown.
- [ ] Infeasible recovery keeps the old plan active with reasons.

Verify:
```
make verify
npx playwright test recovery.spec.ts
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W6. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W7 — Evidence + Limitations
Tool: Codex · Hours P50 2.5 / P80 5

Steps:
1. QUBO formulation card (variables, penalty weights and bounds from qubo.py), engine runs with job IDs, calibration chart (VQC/QCloud always shown, GBDT+Platt, logistic), Brier with run ID, feasibility over seeds, gap to exact, rerun command, Limitations.

Acceptance checks:
- [ ] Every figure links to a run ID; USER CLAIM rows show 'No log yet' when missing.

Verify:
```
make verify
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W7. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase W8 — Polish, a11y, docs
Tool: Codex · Hours P50 2 / P80 4

Steps:
1. axe on every route; remove one thing per screen; README run steps; real-vs-preview table.

Acceptance checks:
- [ ] 0 serious/critical axe issues; README commands run from clean clone.

Verify:
```
make verify
npx playwright test a11y.spec.ts
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase W8. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

### Phase M1 — Expo app scaffold + dev build
Tool: Codex · Hours P50 2 / P80 5

Steps:
1. create-expo-app (if absent), pin SDK, expo-dev-client, MapLibre RN plugin, prebuild, run:android.
2. Tabs: Today, Live route, Loads, Profile; theme; EXPO_PUBLIC_API_URL; health check on Profile.

Acceptance checks:
- [ ] `npx expo run:android` installs on emulator (report only if done); Profile health shows Connected via 10.0.2.2.

Verify:
```
make typecheck
cd apps/driver-mobile && npx expo export --platform android
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase M1. Do steps 1–2 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and `make dev-mobile` and the new behaviour is visible.

### Phase M2 — Live route with map (Preview)
Tool: Codex · Hours P50 3 / P80 6

Steps:
1. MapLibre RN map with fixture route; SVG plot for x/y; ordered stops list; ETA intervals; Delayed button local-only 'Not sent — preview'.

Acceptance checks:
- [ ] Map renders fixtures; tile failure shows list fallback.

Verify:
```
make typecheck
npx expo export --platform android
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase M2. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and `make dev-mobile` and the new behaviour is visible.

### Phase M3 — Today, Loads, dock checklist, Profile (Preview)
Tool: Gemini Flash · Hours P50 2.5 / P80 4

Steps:
1. Fixture-backed screens; checklist local state 'Not saved'.

Acceptance checks:
- [ ] Every screen shows Preview banner.

Verify:
```
make typecheck
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase M3. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and `make dev-mobile` and the new behaviour is visible.

### Phase D — OPTIONAL backend change: driver endpoints (team approval)
Tool: Codex · Hours P50 3 / P80 7

Steps:
1. GET /api/v1/drivers/{driver_id}/route (assigned route from latest validated plan).
2. POST /api/v1/drivers/{driver_id}/delay-events → calls recovery.py (locked prefix = served stops), returns recovery job id.
3. Rate-limit through the same semaphore; audit log entry; pytest.

Acceptance checks:
- [ ] Team approves the diff in writing.
- [ ] pytest covers 404 driver, 409 no active plan, 429, success path.
- [ ] Regenerate contract and types.

Verify:
```
make openapi types
cd backend && python -m pytest -q
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase D. Do steps 1–3 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and `make dev-mobile` and the new behaviour is visible.

### Phase M4 — Connect driver app (only after D)
Tool: Codex · Hours P50 2 / P80 4

Steps:
1. Swap fixtures for D routes on Today/Live route; Delayed → delay-events → poll recovery job; remove Preview on connected screens only.

Acceptance checks:
- [ ] On emulator against laptop backend, Delayed creates a recovery job visible on web Jobs (report only if done).

Verify:
```
make verify
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase M4. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and `make dev-mobile` and the new behaviour is visible.

### Phase P — Pitch run-through
Tool: Ojus · Hours P50 1 / P80 2

Steps:
1. Rehearse demo runbook twice with real backend; capture run IDs for Evidence.

Acceptance checks:
- [ ] Two clean rehearsals; fallback path rehearsed with Opt key unplugged.

Verify:
```
make verify
```

Prompt:
```
Read AGENTS.md and IMPLEMENTATION-PLAN.md Phase P. Do steps 1–1 one at a time; after each, run the verify commands and paste output. Edit only allowed folders. Stop and report if a route or field is missing from ENDPOINTS.md.
```
Runnable state at end: the app(s) start with `make dev-api`, `make dev-web` and the new behaviour is visible.

## 4. Web screens

### W-1 Run list (landing)

**Purpose:** Find a run and open it; the first thing a dispatcher sees.
**Data source:** GET /api/v1/runs (ASSUMED)

**Components:**
- RunsTable (TanStack Table): time IST, scenario, engines, status, validator, run ID
- SearchBox (scenario, run ID)
- Filters: status, engine
- Row → /runs/:id/plan

**States:**
- **loading** — trigger: first fetch of GET /api/v1/runs (ASSUMED).
  - UI: skeleton rows/panels sized like the final runs; no spinner text after 300 ms → 'Loading runs…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET /api/v1/runs (ASSUMED) returns zero items.
  - UI: one sentence + next action, e.g. 'No runs yet. Start one from Plan → Run plan.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET /api/v1/runs (ASSUMED) returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good runs visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial runs if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted runs as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached runs with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); runs drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: > 1000 runs.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Table semantics with th scope; search has label; row link is a real <a>.
**Test:** Playwright: search filters rows; row click navigates; empty state copy.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-2 Plan

**Purpose:** See the chosen routes, stop risks and validator verdict; start a solve.
**Data source:** POST solve route → job; GET /api/v1/jobs/{id}; GET plan/result route (ASSUMED)

**Components:**
- RouteMap (MapLibre or SVG)
- PlannedStops table (order, stop, ETA interval, window, P(late) interval, ₹ penalty)
- StopDrawer
- ValidatorPanel
- EngineBadge
- RunPlanButton with engine select

**States:**
- **loading** — trigger: first fetch of POST solve route → job.
  - UI: skeleton rows/panels sized like the final plan; no spinner text after 300 ms → 'Loading plan…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: POST solve route → job returns zero items.
  - UI: one sentence + next action, e.g. 'No plan for this scenario yet. Run plan.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: POST solve route → job returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good plan visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: solve/recovery submit returns 429 capacity_reached.
  - UI: banner 'Solver busy: 2 runs in progress. Retrying in Ns.' + link to Jobs; backoff 2/4/8s, then manual Retry.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial plan if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted plan as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached plan with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); plan drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 200+ stops, 20+ vans.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: tile requests fail (offline venue, OpenFreeMap down).
  - UI: banner 'Map tiles unavailable — routes shown without basemap'; GeoJSON layers kept; stops table remains.
  - test: route tiles.openfreemap.org to 503 in Playwright; routes still visible.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Map has the stops table as equivalent; drawer traps focus and closes on Esc; risk text labels.
**Test:** Playwright: run plan → poll → routes drawn; validator fail fixture.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-3 Compare

**Purpose:** Decide which plan to dispatch by cost, risk and correctness.
**Data source:** GET run results for engines (ASSUMED)

**Components:**
- CompareTable: engine, objective (₹), exposure (Simulated · held-out run), gap to optimum, feasibility rate, runtime
- Caption 'No speed-up claimed'
- Seed distribution mini-chart

**States:**
- **loading** — trigger: first fetch of GET run results for engines (ASSUMED).
  - UI: skeleton rows/panels sized like the final comparison; no spinner text after 300 ms → 'Loading comparison…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET run results for engines (ASSUMED) returns zero items.
  - UI: one sentence + next action, e.g. 'Only one engine has run. Run another engine to compare.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET run results for engines (ASSUMED) returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good comparison visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: solve/recovery submit returns 429 capacity_reached.
  - UI: banner 'Solver busy: 2 runs in progress. Retrying in Ns.' + link to Jobs; backoff 2/4/8s, then manual Retry.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial comparison if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted comparison as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached comparison with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); comparison drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 20+ seeds per engine.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Numbers right-aligned tabular-nums; table caption; chart has data table toggle.
**Test:** Vitest: column order fixed; missing engine row shows 'Not run'.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-4 What-if / Recovery

**Purpose:** Re-plan mid-shift after a delay without moving stops already served.
**Data source:** POST recovery route → job; GET job; GET audit log (ASSUMED)

**Components:**
- DelayForm (stop, minutes, or window override)
- LockedPrefix list
- OldVsNewDiff (moved stops, ₹ change, risk change)
- AuditLogEntry
- RouteMap with draw-in motion
- Badge 'Classical re-plan' or engine actual

**States:**
- **loading** — trigger: first fetch of POST recovery route → job.
  - UI: skeleton rows/panels sized like the final re-plan; no spinner text after 300 ms → 'Loading re-plan…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: POST recovery route → job returns zero items.
  - UI: one sentence + next action, e.g. 'Pick a stop and mark it delayed to see a re-plan.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: POST recovery route → job returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good re-plan visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: solve/recovery submit returns 429 capacity_reached.
  - UI: banner 'Solver busy: 2 runs in progress. Retrying in Ns.' + link to Jobs; backoff 2/4/8s, then manual Retry.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial re-plan if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted re-plan as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached re-plan with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); re-plan drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: re-plan with 150+ remaining stops.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: tile requests fail (offline venue, OpenFreeMap down).
  - UI: banner 'Map tiles unavailable — routes shown without basemap'; GeoJSON layers kept; stops table remains.
  - test: route tiles.openfreemap.org to 503 in Playwright; routes still visible.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Form fields labelled; diff readable as text; motion respects reduced-motion.
**Test:** Playwright: submit delay → new plan; locked stops unchanged (assert IDs and order).
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-5 Evidence + Limitations

**Purpose:** Show judges exactly what ran, how, and what we don't claim.
**Data source:** GET run detail, job records, metrics (ASSUMED)

**Components:**
- FormulationCard (QUBO variables, penalty A/B and bounds from qubo.py)
- EngineRuns (job ID, backend, mode, seed, time)
- CalibrationChart (VQC/QCloud always, GBDT+Platt, logistic) + Brier with run ID
- FeasibilityOverSeeds
- GapToExact
- ClaimsTable (USER CLAIM vs logged)
- RerunCommand (copy)
- Limitations: data licence, gap, statevector vs hardware, out of scope

**States:**
- **loading** — trigger: first fetch of GET run detail, job records, metrics (ASSUMED).
  - UI: skeleton rows/panels sized like the final evidence; no spinner text after 300 ms → 'Loading evidence…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET run detail, job records, metrics (ASSUMED) returns zero items.
  - UI: one sentence + next action, e.g. 'No evidence yet. Complete a run first.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET run detail, job records, metrics (ASSUMED) returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good evidence visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial evidence if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted evidence as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached evidence with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); evidence drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 50 runs × 4 engines.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Charts have tabular alternative; copy button announces 'Copied'.
**Test:** Vitest: claim without run ID renders 'No log yet'.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-6 Jobs

**Purpose:** See and control what the 2 solver slots are doing.
**Data source:** GET /api/v1/jobs; POST /api/v1/jobs/{id}/cancel (ASSUMED)

**Components:**
- CapacityMeter (x/2)
- JobsTable: id, kind, engine, status, elapsed, started IST
- CancelButton
- InterruptedBadge

**States:**
- **loading** — trigger: first fetch of GET /api/v1/jobs.
  - UI: skeleton rows/panels sized like the final jobs; no spinner text after 300 ms → 'Loading jobs…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET /api/v1/jobs returns zero items.
  - UI: one sentence + next action, e.g. 'No jobs. Runs you start appear here.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET /api/v1/jobs returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good jobs visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: solve/recovery submit returns 429 capacity_reached.
  - UI: banner 'Solver busy: 2 runs in progress. Retrying in Ns.' + link to Jobs; backoff 2/4/8s, then manual Retry.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial jobs if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted jobs as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached jobs with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); jobs drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 500+ historical jobs.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Status changes announced via aria-live polite.
**Test:** Vitest: cancel optimistic then confirmed.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-7 Settings / Health

**Purpose:** Check the backend, set API URL, assumed rates, and see versions.
**Data source:** GET health route; GET /openapi.json (version) (ASSUMED)

**Components:**
- HealthCard (status, latency, last checked IST)
- ApiUrl field (stored in localStorage)
- AssumedRates ($→₹, ₹/min) with source note
- Versions (backend, contract hash, frontend build)
- Tile provider status

**States:**
- **loading** — trigger: first fetch of GET health route.
  - UI: skeleton rows/panels sized like the final settings; no spinner text after 300 ms → 'Loading settings…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET health route returns zero items.
  - UI: one sentence + next action, e.g. '—'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET health route returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good settings visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial settings if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted settings as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached settings with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); settings drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: n/a.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** All fields labelled; errors inline.
**Test:** Vitest: invalid URL rejected; rates persist.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### W-8 Overview (LATER)

**Purpose:** Fleet-level summary once there are many runs.
**Data source:** GET runs + metrics (ASSUMED)

**Components:**
- SummaryCards
- Charts
- DateRange
- Export CSV

**States:**
- **loading** — trigger: first fetch of GET runs + metrics (ASSUMED).
  - UI: skeleton rows/panels sized like the final summary; no spinner text after 300 ms → 'Loading summary…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET runs + metrics (ASSUMED) returns zero items.
  - UI: one sentence + next action, e.g. 'Not enough runs for a summary.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET runs + metrics (ASSUMED) returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good summary visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial summary if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted summary as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached summary with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); summary drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: months of runs.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: not applicable: this screen requests no permission.
  - UI: —.
  - —.

**Accessibility:** Cards are headings + values, not images.
**Test:** LATER.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

## 5. Mobile screens

### M-1 Today

**Purpose:** Driver's shift at a glance: van, first window, stop count.
**Data source:** Preview fixtures; after Phase D: GET /api/v1/drivers/{id}/route

**Components:**
- ShiftCard
- NextStopCard
- PreviewBanner

**States:**
- **loading** — trigger: first fetch of Preview fixtures.
  - UI: skeleton rows/panels sized like the final shift; no spinner text after 300 ms → 'Loading shift…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: Preview fixtures returns zero items.
  - UI: one sentence + next action, e.g. 'No route assigned for today.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: Preview fixtures returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good shift visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial shift if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted shift as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached shift with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); shift drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 60+ stops.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: the app requests no permissions; if a future build adds one and it is denied.
  - UI: feature hidden with one-line reason; app keeps working.
  - test: grep app.json/AndroidManifest has no location/camera permission.

**Accessibility:** Large text, 48dp targets, TalkBack labels.
**Test:** Jest/RTL-native: Preview banner present.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### M-2 Live route with map

**Purpose:** Follow the ordered stops; flag a delay.
**Data source:** Preview fixtures; after D: route + POST delay-events

**Components:**
- MapLibre RN MapView (OpenFreeMap positron)
- SVG plot for x/y
- StopList (ETA interval, window, simulated)
- DelayedButton ('Not sent — preview' until D)
- BlurView header (only blur use)

**States:**
- **loading** — trigger: first fetch of Preview fixtures.
  - UI: skeleton rows/panels sized like the final route; no spinner text after 300 ms → 'Loading route…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: Preview fixtures returns zero items.
  - UI: one sentence + next action, e.g. 'No stops to show.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: Preview fixtures returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good route visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: solve/recovery submit returns 429 capacity_reached.
  - UI: banner 'Solver busy: 2 runs in progress. Retrying in Ns.' + link to Jobs; backoff 2/4/8s, then manual Retry.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial route if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted route as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached route with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); route drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 60+ stops.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: tile requests fail (offline venue, OpenFreeMap down).
  - UI: banner 'Map tiles unavailable — routes shown without basemap'; GeoJSON layers kept; stops table remains.
  - test: route tiles.openfreemap.org to 503 in Playwright; routes still visible.
- **permission denial** — trigger: the app requests no permissions; if a future build adds one and it is denied.
  - UI: feature hidden with one-line reason; app keeps working.
  - test: grep app.json/AndroidManifest has no location/camera permission.

**Accessibility:** Stop list is the accessible primary view; map is supplementary.
**Test:** Jest: Delayed shows 'Not sent — preview' when no D route in contract.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### M-3 Loads

**Purpose:** See trailer and load vs capacity per stop.
**Data source:** Preview fixtures (no backend route)

**Components:**
- TrailerCard
- LoadBar (units / capacity)
- ParcelList (FlatList)

**States:**
- **loading** — trigger: first fetch of Preview fixtures (no backend route).
  - UI: skeleton rows/panels sized like the final loads; no spinner text after 300 ms → 'Loading loads…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: Preview fixtures (no backend route) returns zero items.
  - UI: one sentence + next action, e.g. 'No loads assigned.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: Preview fixtures (no backend route) returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good loads visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial loads if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted loads as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached loads with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); loads drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: 200 parcels.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: the app requests no permissions; if a future build adds one and it is denied.
  - UI: feature hidden with one-line reason; app keeps working.
  - test: grep app.json/AndroidManifest has no location/camera permission.

**Accessibility:** Numbers read with units.
**Test:** Jest: capacity over 100% shows warning text.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### M-4 Dock checklist

**Purpose:** Run the pre-departure checklist.
**Data source:** Local state only ('Not saved')

**Components:**
- ChecklistItem (Pressable, checkbox role)
- NotSavedBanner

**States:**
- **loading** — trigger: first fetch of Local state only ('Not saved').
  - UI: skeleton rows/panels sized like the final checklist; no spinner text after 300 ms → 'Loading checklist…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: Local state only ('Not saved') returns zero items.
  - UI: one sentence + next action, e.g. 'No checklist items.'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: Local state only ('Not saved') returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good checklist visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial checklist if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted checklist as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached checklist with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); checklist drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: n/a.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: the app requests no permissions; if a future build adds one and it is denied.
  - UI: feature hidden with one-line reason; app keeps working.
  - test: grep app.json/AndroidManifest has no location/camera permission.

**Accessibility:** accessibilityRole=checkbox, state announced.
**Test:** Jest: toggling updates state; banner visible.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

### M-5 Profile

**Purpose:** Backend URL, health and data legend.
**Data source:** GET health route

**Components:**
- ApiUrlField (default EXPO_PUBLIC_API_URL)
- HealthRow
- DataLegend
- AppVersion

**States:**
- **loading** — trigger: first fetch of GET health route.
  - UI: skeleton rows/panels sized like the final profile; no spinner text after 300 ms → 'Loading profile…'.
  - test: msw delays 2s; skeleton visible, no layout shift (CLS 0).
- **empty** — trigger: GET health route returns zero items.
  - UI: one sentence + next action, e.g. '—'.
  - test: empty fixture renders the sentence and action button.
- **error** — trigger: GET health route returns 4xx/5xx or JSON doesn't match types.
  - UI: ErrorState role=alert: status, detail, Retry; keep last good profile visible with 'Stale' tag.
  - test: 500 then 200 on retry recovers.
- **429 busy** — trigger: not applicable to reads; if a read ever returns 429, treat like error with Retry-After.
  - UI: no special UI.
  - test: 429×3 → manual Retry shown; 429 then 202 → job starts.
- **cancelled** — trigger: job reaches cancelled.
  - UI: keep partial profile if returned, badge 'Cancelled'; actions: Re-run, View log.
  - test: cancel mid-run, status poll returns cancelled, UI updates within 2 polls.
- **stale or interrupted job** — trigger: job marked interrupted after backend restart (restart_interrupted) or data older than the latest run.
  - UI: amber banner 'This job was interrupted when the backend restarted at <time IST>. It was re-queued' or 'Newer run available'; never show interrupted profile as Validated.
  - test: fixture status=interrupted shows banner and no Validated badge.
- **offline** — trigger: network error / health down.
  - UI: top bar pill 'Offline'; screen shows cached profile with 'Offline — showing last loaded at <time IST>'; submit buttons disabled with reason.
  - test: msw network error; buttons disabled with tooltip.
- **validator fail** — trigger: validator.py result is fail.
  - UI: red 'Validator failed' badge + list of violated constraints (stop, rule, value vs limit); profile drawn but marked not dispatchable.
  - test: fixture with 2 violations lists both.
- **infeasible scenario** — trigger: engine returns infeasible / no cover.
  - UI: 'No feasible plan for this scenario' + which constraint is binding if provided; suggest the action the backend supports (e.g. add a van, widen window) only if a route exists for it.
  - test: infeasible fixture shows message, no map routes.
- **partial results** — trigger: some engines finished, others failed/timeout.
  - UI: show finished engines; failed ones as 'Failed: <reason>' rows, never zero.
  - test: 2 of 4 engines returned; table shows 2 values, 2 failure rows.
- **long run** — trigger: job running > 30 s.
  - UI: elapsed timer, current stage if exposed, Cancel button; after 10 min stop polling with 'Still running — check Jobs'.
  - test: fake timers advance 11 min; polling stopped.
- **unit mismatch** — trigger: money in $/min from financial.py vs ₹ elsewhere, or minutes vs seconds.
  - UI: convert once in money.ts/time.ts; show 'assumed rate' tag; if a response lacks a unit field, show raw value with unit 'unknown' and log a console warning.
  - test: $ value converts with configured rate; missing unit shows 'unknown'.
- **timezone** — trigger: server timestamps (assume UTC ISO) vs IST display.
  - UI: display IST with 'IST' label; tooltip shows ISO UTC; windows across midnight handled.
  - test: 2026-10-29T18:45Z renders 00:15 IST next day.
- **large instances** — trigger: n/a.
  - UI: virtualised table (TanStack Virtual), map clustering for stop labels, SVG→canvas above 500 stops.
  - test: 2000-stop fixture renders under 1 s in Playwright trace.
- **map tile failure** — trigger: not applicable (no map on this screen).
  - UI: —.
  - —.
- **permission denial** — trigger: the app requests no permissions; if a future build adds one and it is denied.
  - UI: feature hidden with one-line reason; app keeps working.
  - test: grep app.json/AndroidManifest has no location/camera permission.

**Accessibility:** Fields labelled.
**Test:** Jest: health offline shows plain error with URL.
**Done when:** all non-'—' states have a fixture and a passing test, and `make verify` is green.

## 6. Cross-cutting state catalogue

| State | Detection | Shared component | Copy pattern |
|---|---|---|---|
| loading | see per-screen | StatusBanner | one sentence + next action |
| empty | see per-screen | StatusBanner | one sentence + next action |
| error | see per-screen | ErrorState | one sentence + next action |
| 429 busy | see per-screen | StatusBanner | one sentence + next action |
| cancelled | see per-screen | StatusBanner | one sentence + next action |
| stale or interrupted job | see per-screen | StatusBanner | one sentence + next action |
| offline | see per-screen | ErrorState | one sentence + next action |
| validator fail | see per-screen | StatusBanner | one sentence + next action |
| infeasible scenario | see per-screen | StatusBanner | one sentence + next action |
| partial results | see per-screen | StatusBanner | one sentence + next action |
| long run | see per-screen | StatusBanner | one sentence + next action |
| unit mismatch | see per-screen | StatusBanner | one sentence + next action |
| timezone | see per-screen | StatusBanner | one sentence + next action |
| large instances | see per-screen | StatusBanner | one sentence + next action |
| map tile failure | see per-screen | StatusBanner | one sentence + next action |
| permission denial | see per-screen | StatusBanner | one sentence + next action |

## 7. Edge-case and risk register

| # | Risk / edge case | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | QpiAI Opt never actually called | High | A2/A3 credibility collapses | Phase 0 grep + added opt_qpiai path + logged run | Codex |
| R2 | Opt local solve needs online key verification | High | demo fails without internet | venue hotspot; exact fallback labelled 'Fallback'; rehearse unplugged | Ojus |
| R3 | QCloud unreachable or quota | Med | VQC shown as statevector only | badge 'VQC · local statevector'; state in Limitations | Codex |
| R4 | Team claims without logs | High | judges challenge numbers | ClaimsTable shows 'No log yet'; rerun before demo | Team |
| R5 | 429 under demo load | Med | run fails on stage | pre-run results cached; backoff UI; Jobs cancel | Codex |
| R6 | Interrupted jobs after laptop sleep | Med | stale state | restart_interrupted banner; disable sleep | Ojus |
| R7 | Currency confusion $ vs ₹ | Med | wrong exposure | single converter; assumed-rate tag | Codex |
| R8 | Timezone bugs at midnight windows | Low | wrong ETAs | IST formatter tests | Codex |
| R9 | OpenFreeMap outage / venue blocks tiles | Med | blank map | fallback no-basemap layers; optional self-hosted MBTiles | Codex |
| R10 | MapLibre RN New Architecture/SDK mismatch | Med | Android build fails | pin versions via expo install; fall back to SVG plot | Codex |
| R11 | Android SDK/JDK not installed | Med | no APK | install Android Studio early (M1) | Ojus |
| R12 | Glass contrast fails AA | Med | a11y fail, unreadable | --glass-strong under text; axe; contrast check over bg | Gemini |
| R13 | Blur jank on low-end Android | Low | laggy UI | blur only tab bar/header; intensity ≤40 | Gemini |
| R14 | Agent invents routes | High | broken calls | ENDPOINTS.md rule; typed client fails compile | All |
| R15 | Scattered context between Codex and Gemini | Med | contradictory code | single AGENTS.md + START-PROMPT | Ojus |
| R16 | Amazon data licence (CC BY-NC) | Med | use rules | state in Limitations; ask organisers in writing | Ojus |
| R17 | Large instance freezes map | Low | demo lag | canvas renderer >500 stops; keep demo 12–25 stops | Codex |
| R18 | Validator disagrees with engine | Med | conflicting truth | validator wins; show reasons | Codex |
| R19 | Recovery moves locked stops | High | wrong re-plan | test asserts locked prefix unchanged | Codex |
| R20 | Driver endpoints rejected by team | Low | app stays Preview | label Preview; demo from dispatcher What-if | Team |
| R21 | Scope creep (Overview, charts) | Med | core unfinished | Overview LATER | Ojus |
| R22 | Expo Go used instead of dev build | Med | MapLibre crash | dev-client only; Makefile android target | Codex |
| R23 | Secrets in repo (Opt key) | High | leak | env vars; .gitignore .env; never in frontend | Codex |
| R24 | Misclaiming quantum advantage | High | judges penalise | 'No speed-up claimed'; Limitations | All |
| R25 | unDraw licence misuse | Low | licence breach | one hand-downloaded SVG; no scripts | Gemini |

Extra edge cases to test:
- Duplicate stop IDs in scenario: expected behaviour = plain error or valid render; add a fixture and a test.
- Stop with zero-width window: expected behaviour = plain error or valid render; add a fixture and a test.
- Van capacity 0: expected behaviour = plain error or valid render; add a fixture and a test.
- All stops at depot coordinates: expected behaviour = plain error or valid render; add a fixture and a test.
- Negative or NaN coordinates: expected behaviour = plain error or valid render; add a fixture and a test.
- Scenario with 1 stop: expected behaviour = plain error or valid render; add a fixture and a test.
- K vans > stops: expected behaviour = plain error or valid render; add a fixture and a test.
- Job ID not found (404) after DB reset: expected behaviour = plain error or valid render; add a fixture and a test.
- SQLite locked under WAL contention: expected behaviour = plain error or valid render; add a fixture and a test.
- Backend restarted mid-poll: expected behaviour = plain error or valid render; add a fixture and a test.
- Two browser tabs cancelling the same job: expected behaviour = plain error or valid render; add a fixture and a test.
- Clock skew between laptop and phone: expected behaviour = plain error or valid render; add a fixture and a test.
- Recovery request for an already-served stop: expected behaviour = plain error or valid render; add a fixture and a test.
- Delay of 0 minutes: expected behaviour = plain error or valid render; add a fixture and a test.
- Delay larger than shift length: expected behaviour = plain error or valid render; add a fixture and a test.
- Penalty ₹0 for all stops: expected behaviour = plain error or valid render; add a fixture and a test.
- Very large penalties overflowing chart scale: expected behaviour = plain error or valid render; add a fixture and a test.
- QUBO penalty weights below qubo.py lower bound: expected behaviour = plain error or valid render; add a fixture and a test.
- VQC returns P(late) outside [0,1]: expected behaviour = plain error or valid render; add a fixture and a test.
- openapi.json changes after types generated (contract hash mismatch banner): expected behaviour = plain error or valid render; add a fixture and a test.

## 8. Judge path

| Rubric | Points | Meaning | Where judges see it | Evidence artefact |
|---|---|---|---|---|
| A1 | 5 | Meaningful product choice and domain integration | Run list → Plan → What-if/Recovery: SLA penalties in ₹ drive the dispatcher's routes; mid-shift re-plan with locked stops | recovery audit log entry, old vs new diff |
| A2 | 10 | QCloud and Opt formulation correctness | Evidence: QUBO card (variables, penalties, bounds), Opt local solve job, VQC/QCloud circuit and calibration vs GBDT+Platt | qubo.py bounds, job records, Brier with run ID |
| A3 | 5 | Working runs with recorded evidence | Jobs + Evidence: job IDs, settings, validator pass/fail, rerun command | SQLite job rows, run logs, PHASE0-REPORT.md |

Say out loud: what ran on QpiAI (from the job record), what was classical, what's simulated, and what we don't claim.

## 9. Real vs preview matrix

| Screen | Source | Status before D | After D |
|---|---|---|---|
| W-1 Run list (landing) | GET /api/v1/runs (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-2 Plan | POST solve route → job; GET /api/v1/jobs/{id}; GET plan/result route (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-3 Compare | GET run results for engines (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-4 What-if / Recovery | POST recovery route → job; GET job; GET audit log (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-5 Evidence + Limitations | GET run detail, job records, metrics (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-6 Jobs | GET /api/v1/jobs; POST /api/v1/jobs/{id}/cancel (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-7 Settings / Health | GET health route; GET /openapi.json (version) (ASSUMED) | Real (after Phase 0 confirms routes) | same |
| W-8 Overview (LATER) | GET runs + metrics (ASSUMED) | LATER | same |
| M-1 Today | Preview fixtures; after Phase D: GET /api/v1/drivers/{id}/route | Preview | Real |
| M-2 Live route with map | Preview fixtures; after D: route + POST delay-events | Preview | Real |
| M-3 Loads | Preview fixtures (no backend route) | Preview | Preview/local |
| M-4 Dock checklist | Local state only ('Not saved') | Preview | Preview/local |
| M-5 Profile | GET health route | Real | Real |

## 10. Demo runbook (3 min)

1. Settings: health Connected, capacity 0/2.
2. Run list → open a pre-run scenario (cached results ready).
3. Plan: map, stop risks, Validated badge.
4. Compare: gap, feasibility, runtime; 'No speed-up claimed'.
5. What-if: delay stop 7 by 25 min → Classical re-plan job → new routes draw in; locked stops unchanged; audit entry.
6. Android: Live route (Preview, or connected if D shipped) shows the re-ordered stops.
7. Evidence: QpiAI Opt · local solver job, QCloud/VQC job, calibration, Limitations.

Fallback script: if internet drops, Opt key verification fails → show the Fallback badge and the logged Opt run from rehearsal.

## Appendix A — Per-screen build prompts

### W-1 Run list (landing)
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-1 Run list (landing) per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET /api/v1/runs (ASSUMED). Components: RunsTable (TanStack Table): time IST, scenario, engines, status, validator, run ID, SearchBox (scenario, run ID), Filters: status, engine, Row → /runs/:id/plan.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-2 Plan
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-2 Plan per IMPLEMENTATION-PLAN.md §4/§5.
Data: POST solve route → job; GET /api/v1/jobs/{id}; GET plan/result route (ASSUMED). Components: RouteMap (MapLibre or SVG), PlannedStops table (order, stop, ETA interval, window, P(late) interval, ₹ penalty), StopDrawer, ValidatorPanel, EngineBadge, RunPlanButton with engine select.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-3 Compare
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-3 Compare per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET run results for engines (ASSUMED). Components: CompareTable: engine, objective (₹), exposure (Simulated · held-out run), gap to optimum, feasibility rate, runtime, Caption 'No speed-up claimed', Seed distribution mini-chart.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-4 What-if / Recovery
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-4 What-if / Recovery per IMPLEMENTATION-PLAN.md §4/§5.
Data: POST recovery route → job; GET job; GET audit log (ASSUMED). Components: DelayForm (stop, minutes, or window override), LockedPrefix list, OldVsNewDiff (moved stops, ₹ change, risk change), AuditLogEntry, RouteMap with draw-in motion, Badge 'Classical re-plan' or engine actual.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-5 Evidence + Limitations
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-5 Evidence + Limitations per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET run detail, job records, metrics (ASSUMED). Components: FormulationCard (QUBO variables, penalty A/B and bounds from qubo.py), EngineRuns (job ID, backend, mode, seed, time), CalibrationChart (VQC/QCloud always, GBDT+Platt, logistic) + Brier with run ID, FeasibilityOverSeeds, GapToExact, ClaimsTable (USER CLAIM vs logged), RerunCommand (copy), Limitations: data licence, gap, statevector vs hardware, out of scope.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-6 Jobs
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-6 Jobs per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET /api/v1/jobs; POST /api/v1/jobs/{id}/cancel (ASSUMED). Components: CapacityMeter (x/2), JobsTable: id, kind, engine, status, elapsed, started IST, CancelButton, InterruptedBadge.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-7 Settings / Health
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-7 Settings / Health per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET health route; GET /openapi.json (version) (ASSUMED). Components: HealthCard (status, latency, last checked IST), ApiUrl field (stored in localStorage), AssumedRates ($→₹, ₹/min) with source note, Versions (backend, contract hash, frontend build), Tile provider status.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### W-8 Overview (LATER)
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build W-8 Overview (LATER) per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET runs + metrics (ASSUMED). Components: SummaryCards, Charts, DateRange, Export CSV.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### M-1 Today
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build M-1 Today per IMPLEMENTATION-PLAN.md §4/§5.
Data: Preview fixtures; after Phase D: GET /api/v1/drivers/{id}/route. Components: ShiftCard, NextStopCard, PreviewBanner.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### M-2 Live route with map
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build M-2 Live route with map per IMPLEMENTATION-PLAN.md §4/§5.
Data: Preview fixtures; after D: route + POST delay-events. Components: MapLibre RN MapView (OpenFreeMap positron), SVG plot for x/y, StopList (ETA interval, window, simulated), DelayedButton ('Not sent — preview' until D), BlurView header (only blur use).
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### M-3 Loads
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build M-3 Loads per IMPLEMENTATION-PLAN.md §4/§5.
Data: Preview fixtures (no backend route). Components: TrailerCard, LoadBar (units / capacity), ParcelList (FlatList).
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### M-4 Dock checklist
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build M-4 Dock checklist per IMPLEMENTATION-PLAN.md §4/§5.
Data: Local state only ('Not saved'). Components: ChecklistItem (Pressable, checkbox role), NotSavedBanner.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

### M-5 Profile
```
Read AGENTS.md, skills/honest-data-states, skills/api-contract-and-jobs. Build M-5 Profile per IMPLEMENTATION-PLAN.md §4/§5.
Data: GET health route. Components: ApiUrlField (default EXPO_PUBLIC_API_URL), HealthRow, DataLegend, AppVersion.
Implement every state listed for this screen with a fixture and a test. Run make verify and paste output. List files changed.
```

## Appendix B — Component contracts (TypeScript props; OWN)

Types from `packages/shared-types` are referenced as `api.components['schemas'][...]`; replace names after Phase 0.

### W-1 Run list (landing) (React)

#### RunsTable
```ts
export interface RunsTableProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for runs
}
```
Role: RunsTable (TanStack Table): time IST, scenario, engines, status, validator, run ID.

#### SearchBox
```ts
export interface SearchBoxProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for runs
}
```
Role: SearchBox (scenario, run ID).

#### Filters
```ts
export interface FiltersProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for runs
}
```
Role: Filters: status, engine.

#### Row
```ts
export interface RowProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for runs
}
```
Role: Row → /runs/:id/plan.

### W-2 Plan (React)

#### RouteMap
```ts
export interface RouteMapProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: RouteMap (MapLibre or SVG).

#### PlannedStops
```ts
export interface PlannedStopsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: PlannedStops table (order, stop, ETA interval, window, P(late) interval, ₹ penalty).

#### StopDrawer
```ts
export interface StopDrawerProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: StopDrawer.

#### ValidatorPanel
```ts
export interface ValidatorPanelProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: ValidatorPanel.

#### EngineBadge
```ts
export interface EngineBadgeProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: EngineBadge.

#### RunPlanButton
```ts
export interface RunPlanButtonProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for plan
}
```
Role: RunPlanButton with engine select.

### W-3 Compare (React)

#### CompareTable
```ts
export interface CompareTableProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for comparison
}
```
Role: CompareTable: engine, objective (₹), exposure (Simulated · held-out run), gap to optimum, feasibility rate, runtime.

#### Caption
```ts
export interface CaptionProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for comparison
}
```
Role: Caption 'No speed-up claimed'.

#### Seed
```ts
export interface SeedProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for comparison
}
```
Role: Seed distribution mini-chart.

### W-4 What-if / Recovery (React)

#### DelayForm
```ts
export interface DelayFormProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: DelayForm (stop, minutes, or window override).

#### LockedPrefix
```ts
export interface LockedPrefixProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: LockedPrefix list.

#### OldVsNewDiff
```ts
export interface OldVsNewDiffProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: OldVsNewDiff (moved stops, ₹ change, risk change).

#### AuditLogEntry
```ts
export interface AuditLogEntryProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: AuditLogEntry.

#### RouteMap
```ts
export interface RouteMapProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: RouteMap with draw-in motion.

#### Badge
```ts
export interface BadgeProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for re-plan
}
```
Role: Badge 'Classical re-plan' or engine actual.

### W-5 Evidence + Limitations (React)

#### FormulationCard
```ts
export interface FormulationCardProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: FormulationCard (QUBO variables, penalty A/B and bounds from qubo.py).

#### EngineRuns
```ts
export interface EngineRunsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: EngineRuns (job ID, backend, mode, seed, time).

#### CalibrationChart
```ts
export interface CalibrationChartProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: CalibrationChart (VQC/QCloud always, GBDT+Platt, logistic) + Brier with run ID.

#### FeasibilityOverSeeds
```ts
export interface FeasibilityOverSeedsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: FeasibilityOverSeeds.

#### GapToExact
```ts
export interface GapToExactProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: GapToExact.

#### ClaimsTable
```ts
export interface ClaimsTableProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: ClaimsTable (USER CLAIM vs logged).

#### RerunCommand
```ts
export interface RerunCommandProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: RerunCommand (copy).

#### Limitations
```ts
export interface LimitationsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for evidence
}
```
Role: Limitations: data licence, gap, statevector vs hardware, out of scope.

### W-6 Jobs (React)

#### CapacityMeter
```ts
export interface CapacityMeterProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for jobs
}
```
Role: CapacityMeter (x/2).

#### JobsTable
```ts
export interface JobsTableProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for jobs
}
```
Role: JobsTable: id, kind, engine, status, elapsed, started IST.

#### CancelButton
```ts
export interface CancelButtonProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for jobs
}
```
Role: CancelButton.

#### InterruptedBadge
```ts
export interface InterruptedBadgeProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for jobs
}
```
Role: InterruptedBadge.

### W-7 Settings / Health (React)

#### HealthCard
```ts
export interface HealthCardProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for settings
}
```
Role: HealthCard (status, latency, last checked IST).

#### ApiUrl
```ts
export interface ApiUrlProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for settings
}
```
Role: ApiUrl field (stored in localStorage).

#### AssumedRates
```ts
export interface AssumedRatesProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for settings
}
```
Role: AssumedRates ($→₹, ₹/min) with source note.

#### Versions
```ts
export interface VersionsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for settings
}
```
Role: Versions (backend, contract hash, frontend build).

#### Tile
```ts
export interface TileProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for settings
}
```
Role: Tile provider status.

### W-8 Overview (LATER) (React)

#### SummaryCards
```ts
export interface SummaryCardsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for summary
}
```
Role: SummaryCards.

#### Charts
```ts
export interface ChartsProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for summary
}
```
Role: Charts.

#### DateRange
```ts
export interface DateRangeProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for summary
}
```
Role: DateRange.

#### Export
```ts
export interface ExportProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for summary
}
```
Role: Export CSV.

### M-1 Today (React Native)

#### ShiftCard
```ts
export interface ShiftCardProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for shift
}
```
Role: ShiftCard.

#### NextStopCard
```ts
export interface NextStopCardProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for shift
}
```
Role: NextStopCard.

#### PreviewBanner
```ts
export interface PreviewBannerProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for shift
}
```
Role: PreviewBanner.

### M-2 Live route with map (React Native)

#### MapLibre
```ts
export interface MapLibreProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for route
}
```
Role: MapLibre RN MapView (OpenFreeMap positron).

#### SVG
```ts
export interface SVGProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for route
}
```
Role: SVG plot for x/y.

#### StopList
```ts
export interface StopListProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for route
}
```
Role: StopList (ETA interval, window, simulated).

#### DelayedButton
```ts
export interface DelayedButtonProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for route
}
```
Role: DelayedButton ('Not sent — preview' until D).

#### BlurView
```ts
export interface BlurViewProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for route
}
```
Role: BlurView header (only blur use).

### M-3 Loads (React Native)

#### TrailerCard
```ts
export interface TrailerCardProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for loads
}
```
Role: TrailerCard.

#### LoadBar
```ts
export interface LoadBarProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for loads
}
```
Role: LoadBar (units / capacity).

#### ParcelList
```ts
export interface ParcelListProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for loads
}
```
Role: ParcelList (FlatList).

### M-4 Dock checklist (React Native)

#### ChecklistItem
```ts
export interface ChecklistItemProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for checklist
}
```
Role: ChecklistItem (Pressable, checkbox role).

#### NotSavedBanner
```ts
export interface NotSavedBannerProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for checklist
}
```
Role: NotSavedBanner.

### M-5 Profile (React Native)

#### ApiUrlField
```ts
export interface ApiUrlFieldProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for profile
}
```
Role: ApiUrlField (default EXPO_PUBLIC_API_URL).

#### HealthRow
```ts
export interface HealthRowProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for profile
}
```
Role: HealthRow.

#### DataLegend
```ts
export interface DataLegendProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for profile
}
```
Role: DataLegend.

#### AppVersion
```ts
export interface AppVersionProps {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'busy' | 'cancelled' | 'interrupted' | 'offline';
  source?: SourceBadgeKind;           // one badge per component
  error?: { title: string; detail?: string; retry?: () => void };
  stale?: { since: string /* ISO UTC */ };
  // data: typed from shared-types for profile
}
```
Role: AppVersion.

```ts
export type SourceBadgeKind =
  | 'validated' | 'validator-failed' | 'exact-enum' | 'exact-financial' | 'qpiai-opt-local'
  | 'qaoa' | 'qcloud' | 'vqc-statevector' | 'gbdt-platt' | 'fallback' | 'classical-replan'
  | 'simulated-heldout' | 'preview';
```

## Appendix C — Copy deck (screen × state)

| Screen | State | Text |
|---|---|---|
| W-1 Run list (landing) | loading | Loading runs… |
| W-1 Run list (landing) | empty | No runs yet. Start one from Plan → Run plan. |
| W-1 Run list (landing) | error | Couldn't load runs: {status} {detail}. Retry |
| W-1 Run list (landing) | cancelled | Cancelled at {time} IST. Re-run |
| W-1 Run list (landing) | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-1 Run list (landing) | offline | Offline — showing runs last loaded at {time} IST. |
| W-1 Run list (landing) | validator fail | Validator failed: {count} constraint(s) broken. |
| W-1 Run list (landing) | infeasible scenario | No feasible plan for this scenario. |
| W-1 Run list (landing) | partial results | {done} of {total} engines finished. |
| W-1 Run list (landing) | long run | Running for {elapsed}. Cancel |
| W-1 Run list (landing) | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-1 Run list (landing) | timezone | All times IST. |
| W-1 Run list (landing) | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-2 Plan | loading | Loading plan… |
| W-2 Plan | empty | No plan for this scenario yet. Run plan. |
| W-2 Plan | error | Couldn't load plan: {status} {detail}. Retry |
| W-2 Plan | 429 busy | Solver busy: 2 runs in progress. Retrying in {s}s. |
| W-2 Plan | cancelled | Cancelled at {time} IST. Re-run |
| W-2 Plan | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-2 Plan | offline | Offline — showing plan last loaded at {time} IST. |
| W-2 Plan | validator fail | Validator failed: {count} constraint(s) broken. |
| W-2 Plan | infeasible scenario | No feasible plan for this scenario. |
| W-2 Plan | partial results | {done} of {total} engines finished. |
| W-2 Plan | long run | Running for {elapsed}. Cancel |
| W-2 Plan | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-2 Plan | timezone | All times IST. |
| W-2 Plan | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-2 Plan | map tile failure | Map tiles unavailable — routes shown without basemap. |
| W-3 Compare | loading | Loading comparison… |
| W-3 Compare | empty | Only one engine has run. Run another engine to compare. |
| W-3 Compare | error | Couldn't load comparison: {status} {detail}. Retry |
| W-3 Compare | 429 busy | Solver busy: 2 runs in progress. Retrying in {s}s. |
| W-3 Compare | cancelled | Cancelled at {time} IST. Re-run |
| W-3 Compare | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-3 Compare | offline | Offline — showing comparison last loaded at {time} IST. |
| W-3 Compare | validator fail | Validator failed: {count} constraint(s) broken. |
| W-3 Compare | infeasible scenario | No feasible plan for this scenario. |
| W-3 Compare | partial results | {done} of {total} engines finished. |
| W-3 Compare | long run | Running for {elapsed}. Cancel |
| W-3 Compare | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-3 Compare | timezone | All times IST. |
| W-3 Compare | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-4 What-if / Recovery | loading | Loading re-plan… |
| W-4 What-if / Recovery | empty | Pick a stop and mark it delayed to see a re-plan. |
| W-4 What-if / Recovery | error | Couldn't load re-plan: {status} {detail}. Retry |
| W-4 What-if / Recovery | 429 busy | Solver busy: 2 runs in progress. Retrying in {s}s. |
| W-4 What-if / Recovery | cancelled | Cancelled at {time} IST. Re-run |
| W-4 What-if / Recovery | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-4 What-if / Recovery | offline | Offline — showing re-plan last loaded at {time} IST. |
| W-4 What-if / Recovery | validator fail | Validator failed: {count} constraint(s) broken. |
| W-4 What-if / Recovery | infeasible scenario | No feasible plan for this scenario. |
| W-4 What-if / Recovery | partial results | {done} of {total} engines finished. |
| W-4 What-if / Recovery | long run | Running for {elapsed}. Cancel |
| W-4 What-if / Recovery | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-4 What-if / Recovery | timezone | All times IST. |
| W-4 What-if / Recovery | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-4 What-if / Recovery | map tile failure | Map tiles unavailable — routes shown without basemap. |
| W-5 Evidence + Limitations | loading | Loading evidence… |
| W-5 Evidence + Limitations | empty | No evidence yet. Complete a run first. |
| W-5 Evidence + Limitations | error | Couldn't load evidence: {status} {detail}. Retry |
| W-5 Evidence + Limitations | cancelled | Cancelled at {time} IST. Re-run |
| W-5 Evidence + Limitations | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-5 Evidence + Limitations | offline | Offline — showing evidence last loaded at {time} IST. |
| W-5 Evidence + Limitations | validator fail | Validator failed: {count} constraint(s) broken. |
| W-5 Evidence + Limitations | infeasible scenario | No feasible plan for this scenario. |
| W-5 Evidence + Limitations | partial results | {done} of {total} engines finished. |
| W-5 Evidence + Limitations | long run | Running for {elapsed}. Cancel |
| W-5 Evidence + Limitations | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-5 Evidence + Limitations | timezone | All times IST. |
| W-5 Evidence + Limitations | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-6 Jobs | loading | Loading jobs… |
| W-6 Jobs | empty | No jobs. Runs you start appear here. |
| W-6 Jobs | error | Couldn't load jobs: {status} {detail}. Retry |
| W-6 Jobs | 429 busy | Solver busy: 2 runs in progress. Retrying in {s}s. |
| W-6 Jobs | cancelled | Cancelled at {time} IST. Re-run |
| W-6 Jobs | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-6 Jobs | offline | Offline — showing jobs last loaded at {time} IST. |
| W-6 Jobs | validator fail | Validator failed: {count} constraint(s) broken. |
| W-6 Jobs | infeasible scenario | No feasible plan for this scenario. |
| W-6 Jobs | partial results | {done} of {total} engines finished. |
| W-6 Jobs | long run | Running for {elapsed}. Cancel |
| W-6 Jobs | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-6 Jobs | timezone | All times IST. |
| W-6 Jobs | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-7 Settings / Health | loading | Loading settings… |
| W-7 Settings / Health | empty | — |
| W-7 Settings / Health | error | Couldn't load settings: {status} {detail}. Retry |
| W-7 Settings / Health | cancelled | Cancelled at {time} IST. Re-run |
| W-7 Settings / Health | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-7 Settings / Health | offline | Offline — showing settings last loaded at {time} IST. |
| W-7 Settings / Health | validator fail | Validator failed: {count} constraint(s) broken. |
| W-7 Settings / Health | infeasible scenario | No feasible plan for this scenario. |
| W-7 Settings / Health | partial results | {done} of {total} engines finished. |
| W-7 Settings / Health | long run | Running for {elapsed}. Cancel |
| W-7 Settings / Health | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-7 Settings / Health | timezone | All times IST. |
| W-7 Settings / Health | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| W-8 Overview (LATER) | loading | Loading summary… |
| W-8 Overview (LATER) | empty | Not enough runs for a summary. |
| W-8 Overview (LATER) | error | Couldn't load summary: {status} {detail}. Retry |
| W-8 Overview (LATER) | cancelled | Cancelled at {time} IST. Re-run |
| W-8 Overview (LATER) | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| W-8 Overview (LATER) | offline | Offline — showing summary last loaded at {time} IST. |
| W-8 Overview (LATER) | validator fail | Validator failed: {count} constraint(s) broken. |
| W-8 Overview (LATER) | infeasible scenario | No feasible plan for this scenario. |
| W-8 Overview (LATER) | partial results | {done} of {total} engines finished. |
| W-8 Overview (LATER) | long run | Running for {elapsed}. Cancel |
| W-8 Overview (LATER) | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| W-8 Overview (LATER) | timezone | All times IST. |
| W-8 Overview (LATER) | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-1 Today | loading | Loading shift… |
| M-1 Today | empty | No route assigned for today. |
| M-1 Today | error | Couldn't load shift: {status} {detail}. Retry |
| M-1 Today | cancelled | Cancelled at {time} IST. Re-run |
| M-1 Today | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| M-1 Today | offline | Offline — showing shift last loaded at {time} IST. |
| M-1 Today | validator fail | Validator failed: {count} constraint(s) broken. |
| M-1 Today | infeasible scenario | No feasible plan for this scenario. |
| M-1 Today | partial results | {done} of {total} engines finished. |
| M-1 Today | long run | Running for {elapsed}. Cancel |
| M-1 Today | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| M-1 Today | timezone | All times IST. |
| M-1 Today | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-1 Today | permission denial | This feature needs a permission the app doesn't request yet. |
| M-2 Live route with map | loading | Loading route… |
| M-2 Live route with map | empty | No stops to show. |
| M-2 Live route with map | error | Couldn't load route: {status} {detail}. Retry |
| M-2 Live route with map | 429 busy | Solver busy: 2 runs in progress. Retrying in {s}s. |
| M-2 Live route with map | cancelled | Cancelled at {time} IST. Re-run |
| M-2 Live route with map | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| M-2 Live route with map | offline | Offline — showing route last loaded at {time} IST. |
| M-2 Live route with map | validator fail | Validator failed: {count} constraint(s) broken. |
| M-2 Live route with map | infeasible scenario | No feasible plan for this scenario. |
| M-2 Live route with map | partial results | {done} of {total} engines finished. |
| M-2 Live route with map | long run | Running for {elapsed}. Cancel |
| M-2 Live route with map | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| M-2 Live route with map | timezone | All times IST. |
| M-2 Live route with map | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-2 Live route with map | map tile failure | Map tiles unavailable — routes shown without basemap. |
| M-2 Live route with map | permission denial | This feature needs a permission the app doesn't request yet. |
| M-3 Loads | loading | Loading loads… |
| M-3 Loads | empty | No loads assigned. |
| M-3 Loads | error | Couldn't load loads: {status} {detail}. Retry |
| M-3 Loads | cancelled | Cancelled at {time} IST. Re-run |
| M-3 Loads | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| M-3 Loads | offline | Offline — showing loads last loaded at {time} IST. |
| M-3 Loads | validator fail | Validator failed: {count} constraint(s) broken. |
| M-3 Loads | infeasible scenario | No feasible plan for this scenario. |
| M-3 Loads | partial results | {done} of {total} engines finished. |
| M-3 Loads | long run | Running for {elapsed}. Cancel |
| M-3 Loads | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| M-3 Loads | timezone | All times IST. |
| M-3 Loads | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-3 Loads | permission denial | This feature needs a permission the app doesn't request yet. |
| M-4 Dock checklist | loading | Loading checklist… |
| M-4 Dock checklist | empty | No checklist items. |
| M-4 Dock checklist | error | Couldn't load checklist: {status} {detail}. Retry |
| M-4 Dock checklist | cancelled | Cancelled at {time} IST. Re-run |
| M-4 Dock checklist | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| M-4 Dock checklist | offline | Offline — showing checklist last loaded at {time} IST. |
| M-4 Dock checklist | validator fail | Validator failed: {count} constraint(s) broken. |
| M-4 Dock checklist | infeasible scenario | No feasible plan for this scenario. |
| M-4 Dock checklist | partial results | {done} of {total} engines finished. |
| M-4 Dock checklist | long run | Running for {elapsed}. Cancel |
| M-4 Dock checklist | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| M-4 Dock checklist | timezone | All times IST. |
| M-4 Dock checklist | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-4 Dock checklist | permission denial | This feature needs a permission the app doesn't request yet. |
| M-5 Profile | loading | Loading profile… |
| M-5 Profile | empty | — |
| M-5 Profile | error | Couldn't load profile: {status} {detail}. Retry |
| M-5 Profile | cancelled | Cancelled at {time} IST. Re-run |
| M-5 Profile | stale or interrupted job | Interrupted when the backend restarted at {time} IST. Re-queued. |
| M-5 Profile | offline | Offline — showing profile last loaded at {time} IST. |
| M-5 Profile | validator fail | Validator failed: {count} constraint(s) broken. |
| M-5 Profile | infeasible scenario | No feasible plan for this scenario. |
| M-5 Profile | partial results | {done} of {total} engines finished. |
| M-5 Profile | long run | Running for {elapsed}. Cancel |
| M-5 Profile | unit mismatch | Converted from $ at assumed rate ₹{rate}/$. |
| M-5 Profile | timezone | All times IST. |
| M-5 Profile | large instances | Showing {shown} of {total} stops. Zoom to see labels. |
| M-5 Profile | permission denial | This feature needs a permission the app doesn't request yet. |

## Appendix D — Test skeletons

### W-1 Run list (landing)
```ts
// frontend/src/__tests__/w-run-list-landing.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-1 Run list (landing)', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No runs yet. Start one from Plan → Run plan. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### W-2 Plan
```ts
// frontend/src/__tests__/w-plan.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-2 Plan', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No plan for this scenario yet. Run plan. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('429 backoff then manual retry', async () => { /* 429 x3 */ });
  it('cancel confirmed by server', async () => { /* poll returns cancelled */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('tile failure keeps routes and stop list', async () => {});
});
```

### W-3 Compare
```ts
// frontend/src/__tests__/w-compare.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-3 Compare', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: Only one engine has run. Run another engine to compare. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('429 backoff then manual retry', async () => { /* 429 x3 */ });
  it('cancel confirmed by server', async () => { /* poll returns cancelled */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### W-4 What-if / Recovery
```ts
// frontend/src/__tests__/w-what-if-recovery.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-4 What-if / Recovery', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: Pick a stop and mark it delayed to see a re-plan. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('429 backoff then manual retry', async () => { /* 429 x3 */ });
  it('cancel confirmed by server', async () => { /* poll returns cancelled */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('tile failure keeps routes and stop list', async () => {});
});
```

### W-5 Evidence + Limitations
```ts
// frontend/src/__tests__/w-evidence-limitations.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-5 Evidence + Limitations', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No evidence yet. Complete a run first. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### W-6 Jobs
```ts
// frontend/src/__tests__/w-jobs.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-6 Jobs', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No jobs. Runs you start appear here. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('429 backoff then manual retry', async () => { /* 429 x3 */ });
  it('cancel confirmed by server', async () => { /* poll returns cancelled */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### W-7 Settings / Health
```ts
// frontend/src/__tests__/w-settings-health.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-7 Settings / Health', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: — */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### W-8 Overview (LATER)
```ts
// frontend/src/__tests__/w-overview-later.test.tsx
import { render, screen } from '@testing-library/react';
import { server, http, HttpResponse } from '../test/msw';
describe('W-8 Overview (LATER)', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: Not enough runs for a summary. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
});
```

### M-1 Today
```ts
// apps/driver-mobile/__tests__/m-today.test.tsx
import { render, screen } from '@testing-library/react-native';
import { server, http, HttpResponse } from '../test/msw';
describe('M-1 Today', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No route assigned for today. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('Preview banner visible until driver routes exist', () => {});
});
```

### M-2 Live route with map
```ts
// apps/driver-mobile/__tests__/m-live-route-with-map.test.tsx
import { render, screen } from '@testing-library/react-native';
import { server, http, HttpResponse } from '../test/msw';
describe('M-2 Live route with map', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No stops to show. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('429 backoff then manual retry', async () => { /* 429 x3 */ });
  it('cancel confirmed by server', async () => { /* poll returns cancelled */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('tile failure keeps routes and stop list', async () => {});
  it('Preview banner visible until driver routes exist', () => {});
});
```

### M-3 Loads
```ts
// apps/driver-mobile/__tests__/m-loads.test.tsx
import { render, screen } from '@testing-library/react-native';
import { server, http, HttpResponse } from '../test/msw';
describe('M-3 Loads', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No loads assigned. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('Preview banner visible until driver routes exist', () => {});
});
```

### M-4 Dock checklist
```ts
// apps/driver-mobile/__tests__/m-dock-checklist.test.tsx
import { render, screen } from '@testing-library/react-native';
import { server, http, HttpResponse } from '../test/msw';
describe('M-4 Dock checklist', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: No checklist items. */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('Preview banner visible until driver routes exist', () => {});
});
```

### M-5 Profile
```ts
// apps/driver-mobile/__tests__/m-profile.test.tsx
import { render, screen } from '@testing-library/react-native';
import { server, http, HttpResponse } from '../test/msw';
describe('M-5 Profile', () => {
  it('shows skeleton then data', async () => { /* msw delay 2s, assert skeleton, then rows */ });
  it('empty state', async () => { /* expect text: — */ });
  it('error then retry recovers', async () => { /* 500 then 200 */ });
  it('interrupted job banner, no Validated badge', async () => {});
  it('offline disables submit with reason', async () => {});
  it('times render in IST with label', () => {});
  it('Preview banner visible until driver routes exist', () => {});
});
```

## Appendix E — Target file tree (OWN)

```
contract/openapi.json
packages/shared-types/src/api.d.ts
frontend/
  src/api/{client.ts,ENDPOINTS.md,jobs.ts,errors.ts}
  src/lib/{money.ts,time.ts,format.ts}
  src/styles/tokens.css
  src/components/{DataBadge,ErrorState,EmptyState,StatusBanner,StaleBanner,CapacityMeter}.tsx
  src/map/{RouteMap.tsx,MapLibreRoutes.tsx,SvgPlot.tsx,projection.ts}
  src/screens/{RunList,Plan,Compare,Recovery,Evidence,Jobs,Settings,Overview}.tsx
  src/test/{msw.ts,fixtures/*.json}
  e2e/{plan,recovery,a11y}.spec.ts
apps/driver-mobile/
  app.json (plugins: @maplibre/maplibre-react-native)
  src/api/client.ts
  src/theme.ts
  src/screens/{Today,LiveRoute,Loads,DockChecklist,Profile}.tsx
  src/fixtures/*.json
  __tests__/*.test.tsx
backend/ (Phase 0 / D only)
  engines/opt_qpiai.py (if missing)
  routes/drivers.py (Phase D)
docs/PHASE0-REPORT.md
```

## Appendix F — Fixture spec

- `scenario-solomon-c101-25.json`: 25 stops x/y, 4 vans, windows, penalties ₹. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `scenario-latlon-20.json`: 20 stops lat/lon around one city, 4 vans. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `job-running.json`: status running, elapsed 12s. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `job-interrupted.json`: status interrupted. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `job-cancelled-partial.json`: cancelled with partial plan. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `plan-validated.json`: 4 routes, validator pass. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `plan-validator-fail.json`: 2 violations. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `plan-infeasible.json`: no cover. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `compare-partial.json`: 2 of 4 engines. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `recovery-result.json`: locked prefix 6 stops, audit entry. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `evidence-claims.json`: 3 USER CLAIMS, 1 with run ID. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `large-2000.json`: 2000 stops stress. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `driver-route-preview.json`: 12 stops for Live route. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `loads-preview.json`: trailer, 80 parcels. Mark top-level `"_preview": true` for anything not captured from the real backend.
- `checklist-preview.json`: 8 dock items. Mark top-level `"_preview": true` for anything not captured from the real backend.
