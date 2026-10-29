# arQ API Endpoints Contract (`/api/v1/*`)

This document defines the REST API contract between the arQ web command center and the dispatch/optimization backend.

Base URL: `VITE_API_URL` (default `http://127.0.0.1:8000`).

---

## 1. System & Health

### `GET /api/v1/health`
Checks backend responsiveness, database WAL status, and available solver concurrency.
- **Request:** None
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-10-29T14:30:00Z",
    "capacity": {
      "max_slots": 2,
      "active_slots": 1,
      "available_slots": 1
    },
    "engines_available": [
      "exact_enumeration",
      "financial_cover",
      "qpiai_opt_local",
      "qaoa_warm_start",
      "vqc_inference",
      "gbdt_platt"
    ]
  }
  ```
- **Errors:** `503 Service Unavailable` if WAL or engine is unresponsive.

---

## 2. Plan Runs & Routing

### `GET /api/v1/runs`
Lists recent optimization and dispatch plan runs.
- **Query params:** `limit=20`, `status=active|archived`, `scenario_id`
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "run-blr-20261029-01",
      "scenario_name": "Bengaluru Urban Express",
      "status": "active",
      "created_at": "2026-10-29T08:15:00Z",
      "engine": "financial_cover",
      "provenance_badge": "Exact (financial cover)",
      "total_vehicles": 4,
      "total_stops": 28,
      "completed_stops": 11,
      "total_sla_exposure_inr": 14250,
      "assumed_rate_label": "assumed rate ₹83/$",
      "validator_status": "passed"
    }
  ]
  ```

### `GET /api/v1/runs/{id}`
Fetches complete plan graph: vehicles, assigned routes, ordered stops, commitment windows, predicted ETAs, coordinates, and validator proof.
- **Path param:** `id` (e.g. `run-blr-20261029-01`)
- **Response `200 OK`:** See `PlanRun` interface in `frontend/src/types/api.ts`.
- **Errors:** `404 Not Found`.

---

## 3. Optimization Solver & Jobs

### `POST /api/v1/solve`
Submits an async optimization job. Concurrency is limited by `BoundedSemaphore(2)`.
- **Request Body:**
  ```json
  {
    "scenario_id": "blr-north",
    "engine": "qpiai_opt" | "qaoa" | "financial" | "exact",
    "penalty_weights": {
      "delay_weight": 1.5,
      "mileage_weight": 0.8
    },
    "seed": 42
  }
  ```
- **Response `202 Accepted`:**
  ```json
  {
    "job_id": "job-8921-solve",
    "status": "queued",
    "submitted_at": "2026-10-29T14:32:00Z",
    "poll_url": "/api/v1/jobs/job-8921-solve"
  }
  ```
- **Response `429 Too Many Requests` (`capacity_reached`):**
  ```json
  {
    "detail": "capacity_reached",
    "message": "Solver busy: 2 runs already in progress. Retry in 4s.",
    "active_jobs": ["job-8919-solve", "job-8920-solve"],
    "retry_after_seconds": 4
  }
  ```

### `GET /api/v1/jobs`
Lists active and recent solver jobs.
- **Response `200 OK`:** Array of `SolverJob`.

### `GET /api/v1/jobs/{id}`
Polls job state. Frontend polls every 1s for the first 10s, then backoff to every 3s until terminal (`succeeded`, `failed`, `cancelled`, `interrupted`).
- **Response `200 OK`:**
  ```json
  {
    "id": "job-8921-solve",
    "status": "running",
    "progress_pct": 65,
    "elapsed_seconds": 8.4,
    "engine": "qpiai_opt",
    "provenance_badge": "QpiAI Opt · local solver",
    "result_plan_id": null,
    "error_message": null
  }
  ```

### `POST /api/v1/jobs/{id}/cancel`
Requests cancellation of an active job.
- **Response `200 OK`:**
  ```json
  {
    "id": "job-8921-solve",
    "status": "cancelled",
    "cancelled_at": "2026-10-29T14:32:15Z"
  }
  ```

---

## 4. Mid-Shift Recovery (`recovery.py`)

### `POST /api/v1/recovery/replan`
Triggers mid-shift re-plan with locked prefix (already completed/dispatched stops) and delay perturbation.
- **Request Body:**
  ```json
  {
    "run_id": "run-blr-20261029-01",
    "vehicle_id": "van-03",
    "delayed_stop_id": "stop-blr-14",
    "delay_minutes": 25,
    "locked_stop_ids": ["stop-blr-01", "stop-blr-02", "stop-blr-03"]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "new_run_id": "run-blr-recovery-02",
    "provenance_badge": "Classical re-plan",
    "audit_log": {
      "timestamp": "2026-10-29T14:35:00Z",
      "actor": "recovery.py",
      "reason": "Vehicle Van-03 delay +25m at Hebbal Junction",
      "stops_reordered": 5,
      "sla_breaches_prevented": 2,
      "exposure_delta_inr": -3400
    },
    "validator_result": {
      "passed": true,
      "constraints_checked": ["time_windows", "capacity", "battery_range"],
      "errors": []
    }
  }
  ```

---

## 5. Intelligence & Validation Evidence

### `GET /api/v1/intelligence/evidence`
Retrieves model evaluation, Platt calibration curve, and engine benchmark comparisons.
- **Response `200 OK`:**
  ```json
  {
    "model_evaluation": {
      "brier_score": 0.142,
      "brier_reduction_pct": -46.9,
      "claim_note": "Observed on experiments_run2 validation partition",
      "regret_reduction_pct": -30.8
    },
    "calibration_curve": [
      { "predicted_prob": 0.1, "observed_freq": 0.09 },
      { "predicted_prob": 0.3, "observed_freq": 0.28 },
      { "predicted_prob": 0.5, "observed_freq": 0.51 },
      { "predicted_prob": 0.7, "observed_freq": 0.69 },
      { "predicted_prob": 0.9, "observed_freq": 0.88 }
    ],
    "engine_benchmarks": [
      { "engine": "Exact enumeration", "gap_to_optimum_pct": 0.0, "feasibility_pct": 100.0, "runtime_seconds": 18.2 },
      { "engine": "Financial exact cover", "gap_to_optimum_pct": 0.2, "feasibility_pct": 100.0, "runtime_seconds": 4.1 },
      { "engine": "QpiAI Opt (local QUBO)", "gap_to_optimum_pct": 1.4, "feasibility_pct": 98.5, "runtime_seconds": 1.8 },
      { "engine": "Warm-start QAOA", "gap_to_optimum_pct": 2.1, "feasibility_pct": 96.0, "runtime_seconds": 3.2 }
    ],
    "disclaimer": "No speed-up claimed. Solvers benchmarked on constrained routing instances."
  }
  ```
