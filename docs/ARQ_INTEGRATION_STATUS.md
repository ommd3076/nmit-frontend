# arQ — Integration & Implementation Status Report

*Status as of Phase 1 Web Application Completion*

---

## 1. Integration Status Matrix

| Subsystem / Feature | Integration Status | Data Provenance | Source Location | Notes |
|---|---|---|---|---|
| **Command Center (Hero View)** | **Fully Working** | Local Adapter / Backend fallback | `src/features/dashboard/CommandCenterView.tsx` | Interactive MapLibre & SVG, telemetry timeline, stop drawer |
| **OpenFreeMap Positron Map** | **Fully Working** | Real geospatial tiles | `src/components/map/RouteMap.tsx` | No API key required; automatic tile error fallback |
| **Solomon C101 SVG Plotter** | **Fully Working** | Synthetic academic benchmark | `src/components/map/RouteMap.tsx` | Equal aspect ratio SVG with depot (40,50) and numbered stops |
| **Fleet Operations View** | **Fully Working** | Real-time telemetry adapter | `src/features/fleet/FleetOperationsView.tsx` | Search, status filters, battery/capacity bars, detail drawer |
| **Dispatch & Plan Workspace** | **Fully Working** | Async job polling engine | `src/features/dispatch/DispatchPlanningView.tsx` | Solver selection, penalty sliders, draft vs published manifest |
| **SLA Risk & Financial Exposure** | **Fully Working** | Traceable ₹83/$ conversion | `src/features/risk/SlaRiskView.tsx` | At-risk commitments, P(late) intervals, route breakdowns |
| **QML Intelligence Evidence** | **Fully Working** | Recorded artifacts (experiments_run2) | `src/features/intelligence/IntelligenceView.tsx` | Platt calibration curve, Brier score -46.9%, solver benchmarks |
| **Operational Audit Events** | **Fully Working** | Client WAL audit stream | `src/features/activity/ActivityView.tsx` | Filterable event stream with severity tags and actors |
| **Solver Jobs & Concurrency** | **Fully Working** | BoundedSemaphore(2) simulation | `src/features/jobs/JobsView.tsx` | 2-slot concurrency monitoring, cancel actions, 429 backoff |
| **FastAPI Backend Integration** | **Ready for Connection** | HTTP REST (`/api/v1/*`) | `src/api/client.ts`, `src/api/ENDPOINTS.md` | Auto-detects live backend on `VITE_API_URL`, falls back gracefully |
| **Driver Android Mobile App** | **Deferred to Phase D** | N/A | `apps/driver-mobile/` (Pending Phase D) | Deliberately excluded per Phase 1 scope instructions |

---

## 2. Provenance & Computational Grounding

Every displayed metric strictly complies with `skills/honest-data-states`:
- **Brier Score (−46.9%) & Regret Reduction (−30.8%):** Grounded in `experiments_run2` Newton GBDT + Platt calibrator validation records.
- **Quantum Circuit:** Transparently identified as `VQC · local statevector` (2-qubit simulator); does not falsely claim physical QCloud execution.
- **Financial Penalties:** Converted from `financial.py` ($/minute) to ₹ at explicit assumed rate `₹83/$`.
- **Solver Runtime Benchmarks:** Discloses "No speed-up claimed; mathematical optimization benchmarked on exact coverage with penalty bounds."

---

## 3. Connecting to Live Backend (`backend/`)

When the backend is running locally on Ojus's machine:
```bash
# Start FastAPI backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start arQ Web Command Center
cd frontend && VITE_API_URL=http://127.0.0.1:8000 npm run dev
```

The `HealthPill` in the top navbar will automatically switch from `Simulation Mode` to `Backend Online` with a green indicator.
