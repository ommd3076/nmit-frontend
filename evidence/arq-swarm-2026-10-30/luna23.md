# Luna 23 browser QA

## Status

**Browser smoke PASS; actual dispatch and proposal publication PASS.** Owner waived the unavailable usage check for this batch. Tests used root-owned Vite on `127.0.0.1:5173` and API on `127.0.0.1:8001`. Tests made ordinary browser/API requests without intercepting or fabricating operational responses. Root owns service startup; no duplicate API was started.

## Prepared browser procedure

The owned Playwright spec is `frontend/e2e/swarm-smoke.spec.ts`. It uses the installed `@playwright/test` dependency.

- Desktop: 1366 x 768; visits Command, Live map, Dispatch, Compare, Fleet, Drivers, Orders, Analytics, Diagnostics, and Recovery; saves a full-page screenshot per screen.
- Mobile: 390 x 844; visits the same 10 screens through the responsive navigation, checks for horizontal document overflow, and saves a full-page screenshot per screen.
- Dispatch navigation: selects Dispatch from the application navigation, switches the planning algorithm between exact enumeration and warm-start QAOA, and confirms the `#/dispatch` browser route.
- Dispatch execution: the desktop smoke validates the actual tiny browser scenario and submits it through `Validate and run optimization`; it asserts the backend job succeeded and the independent validator badge passed. This creates one real local exact-enumeration job.
- Map: waits for the actual route geometry fallback, selects the first route from the live dispatcher API, verifies the selected vehicle/route and its rendered route ID, then captures the selected route view.
- Proposal review: uses the pending dispatcher proposal created by root's authenticated two-driver report flow, checks the actual current/candidate duration and route geometry plus unavailable SLA/cost/feasibility facts, then opens the confirmation dialog and publishes through the UI.
- Screenshots: 10 screens at both sizes under `evidence/arq-swarm-2026-10-30/screenshots/`, including selected-route map, live job, and proposal review/confirmation/publication images.

## Execution record

| Check | Command / procedure | Result |
|---|---|---|
| Playwright availability | Read `frontend/package.json` and checked installed `node_modules/@playwright/test`, `node_modules/playwright`, and the Playwright command shim | Present; Chromium launched headless |
| Desktop browser smoke and exact dispatch | `npx.cmd playwright test e2e/swarm-smoke.spec.ts --workers=1 -g "desktop size"` from `nmit-frontend/frontend` | PASS, 1 test; all 10 screens at 1366 x 768; switches exact/QAOA selection, validates scenario, creates actual exact job, sees terminal success and independent validation PASS. |
| Mobile browser smoke | `npx.cmd playwright test e2e/swarm-smoke.spec.ts --workers=1 -g "mobile viewport"` from `nmit-frontend/frontend` | PASS, 1 test; all 10 screens at 390 x 844, no horizontal overflow, responsive navigation drawer closes before screenshots |
| Screenshots | Desktop, mobile, and proposal Playwright tests | 26 PNGs total: 10 desktop + 10 mobile screen captures, additional dispatch selection/live-job images, and proposal review/confirmation/published images. Map captures are overwritten after route selection and geometry appears. |
| Live API reads | GET `/api/v1/health`, `/runs`, `/jobs`, `/events`, `/intelligence/evidence`, `/demo/dispatcher/state`, and `/demo/audits` through `127.0.0.1:8001` | All returned HTTP 200 after root restarted API with isolated DB. Dispatcher returned two real catalog states; events/audits were empty. |
| Map route selection | UI-selected first live `.arq-route-row`; compared its vehicle and route ID to the selected-vehicle card and SVG route `data-route-id` | PASS at desktop and mobile. Fallback SVG was visible after its 5 second tile/style watchdog. |
| Exact dispatch job | UI submission using the default tiny scenario and `exact` engine | PASS; job `a8fe4e33-3bed-4ce8-90c4-fa591993b612`, `succeeded`, `local_classical` / `exact_enumeration`; UI showed `Scenario valid` and `Independent validation passed`. |
| Proposal review | Live proposal `proposal_a6b621e911424617921ba6d800053913`, vehicle_1, current `route_v1_primary`, proposed `route_v1_bypass`; screenshot and browser assertions in the new compare test | PASS; proposal API supplied 1,680s current vs 1,440s proposed (4.0 min reported difference); screenshot showed source from dispatcher API and kept SLA, financial exposure, and independent feasibility unavailable. Both current and candidate geometry appeared in the overlay. |
| Explicit publication | UI `Review approval` → confirmation dialog → `Confirm & publish` | PASS; API state confirms proposal `published`, `decided_by=local_dispatcher`; vehicle_1 now route_v1_bypass, route_version 2 and manifest_revision 2. At handoff last_ack_version/manifest_revision remain 0/0. |
| Compare test command | `npx.cmd playwright test e2e/swarm-smoke.spec.ts --workers=1 -g "live pending route proposal"` | PASS, 1 test (8.6 seconds). This consumed the pending proposal by publishing it; rerun needs a new real pending proposal and must never silently create one. |

The first attempt against stale API port 8000 showed a false healthy pill alongside a 404 error. After root moved Vite to updated API port 8001, `GET /api/v1/jobs` initially returned 500; root restarted that API with an isolated DB and `/jobs` then returned 200. The actual proposal initially arrived with `driver_id` and `vehicle_id` nested inside its `proposal` object; the dispatcher client validator rejected the whole state. Root normalized these nested fields for the client, after which the web compare UI rendered the proposal. The actual compare/confirmation/published screenshots below reflect this repaired live path.

At last state read after publication, the manifest ACK remained 0/0. Luna29 was handed the published manifest version to validate via a fresh driver session and attempt the ACK plus second-driver isolation flow. Those later mobile actions are outside this browser result and remain unverified here.
