# Phase 0 Compliance Gate Report (QpiAI & API Contract)
**arQ (QML-01, Quant-A-Maze 3.0)**

*Committed: October 29, 2026*
*Status: PASSED & VERIFIED*

---

## 1. API Contract & OpenAPI Specification
- **Contract Location:** `contract/openapi.json` (OpenAPI 3.0.3)
- **Shared Types:** `packages/shared-types/src/api.d.ts` generated via `openapi-typescript` v7.13.0
- **Endpoint Reference:** `frontend/src/api/ENDPOINTS.md`
- **Rule Enforced:** The UI only calls routes documented in `ENDPOINTS.md`, typed directly from the OpenAPI schema.
- **Route Inventory (`/api/v1/*`):**
  - `GET /api/v1/health` — System status, WAL database health, and 2-slot concurrency capacity (`BoundedSemaphore(2)`).
  - `GET /api/v1/runs` — Lists active and archived dispatch plan runs.
  - `GET /api/v1/runs/{id}` — Full plan graph (vehicles, routes, ordered stops, coordinates, validator proof).
  - `POST /api/v1/solve` — Submits async optimization job; returns 429 `capacity_reached` with backoff when 2 solver slots are active.
  - `GET /api/v1/jobs` — Active and historical solver job queue.
  - `GET /api/v1/jobs/{id}` — Job progress polling (1s backoff to 3s).
  - `POST /api/v1/jobs/{id}/cancel` — Job cancellation and semaphore release.
  - `POST /api/v1/recovery/replan` — Mid-shift re-plan with locked prefix (`recovery.py`).
  - `GET /api/v1/intelligence/evidence` — Platt calibration curve, Brier score reduction, and solver benchmarks.

---

## 2. QpiAI Usage & Backend Solver Architecture Analysis

### Call Paths and Call Sites:
1. **QUBO Formulation (`qubo.py`):**
   - Constructs quadratic unconstrained binary optimization matrix with penalty bounds for SLA delay penalties and routing distance.
2. **QpiAI Opt Solver (`opt_qpiai.py`):**
   - Imports: `from qpiai_opt.opt_solvers import Client, solve`
   - Invocation: `solve(qubo_problem, mode="local", client=client)`
   - Safety check: Local mode verifies key online first; `allow_platform=True` is strictly omitted to prevent unauthorized platform billing.
   - Provenance badge: `QpiAI Opt · local solver`.
3. **Exact Combinatorial Solvers:**
   - `domain.py`: Exact enumeration brute-force baseline.
   - `financial.py`: Financial exact cover ($/min SLA penalty minimization).
4. **Quantum & Learning Inference:**
   - `qaoa.py`: Warm-start QAOA (Quantum Approximate Optimization Algorithm).
   - `qpiai_vqc.py`: Variational Quantum Classifier with 2-qubit statevector simulator (`qiskit` / `qpiai-quantum` local statevector backend).
   - Provenance badge: `VQC · local statevector`. Never claims physical QCloud hardware execution without verified execution log.

---

## 3. Currency Standard & Conversion Policy
- **Backend Standard:** `financial.py` computes delay penalties in US Dollars ($ per minute).
- **Frontend Standard:** Displayed in Indian Rupees (₹) across all UI metrics and tables.
- **Assumed Exchange Rate:** `$1.00 USD = ₹83.00 INR`.
- **Transparency Tag:** Every converted figure is tagged with `assumed rate ₹83/$` in sentence-case, with explicit disclaimers in Settings and Evidence views.

---

## 4. User Claims Audit & Verification
The user claims from hackathon benchmarking:
- **0.0% Fallback:** Verified against validation suite runs where exact cover and QUBO relaxations succeeded without heuristic crash.
- **Brier Score Reduction (−46.9%):** Grounded in `experiments_run2` Newton GBDT + Platt calibration partition (`brier_score = 0.142` vs uncalibrated `0.267`).
- **Regret Reduction (−30.8%):** Grounded in risk-weighted dispatch vs deadline-oblivious shortest-path routing.
- **Display Constraint:** These claims are only displayed alongside their run log audit badges in `IntelligenceView.tsx`.

---

## 5. Gate Checklist Summary
- [x] `contract/openapi.json` committed
- [x] `packages/shared-types/src/api.d.ts` generated
- [x] `frontend/src/api/ENDPOINTS.md` documented
- [x] QpiAI call paths verified (local QUBO solving, 2-qubit statevector VQC)
- [x] Currency conversion centralized to ₹83/$ with transparent provenance
- [x] User claims tied to run logs

*Phase 0 Gate Complete. Ready for UI Command Center Verification.*
