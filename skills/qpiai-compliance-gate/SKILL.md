---
name: qpiai-compliance-gate
description: Phase 0 hard gate. Run before any UI work. Proves whether QCloud and QpiAI Opt are actually called, and fixes it if not.
---
# QpiAI compliance gate (Phase 0)

Nothing else starts until every box below is ticked and committed in `docs/PHASE0-REPORT.md`.

## 1. Contract
- Start the backend on the laptop: `uvicorn app.main:app --port 8000` (adjust the module path).
- `curl -s http://127.0.0.1:8000/openapi.json -o contract/openapi.json`
- `npx openapi-typescript contract/openapi.json -o packages/shared-types/src/api.d.ts`
- Write `frontend/src/api/ENDPOINTS.md`: one row per `/api/v1/*` route: method, path, request, response, error codes (note 429 `capacity_reached`), which screen uses it.
- Rule: the UI never calls a route that isn't in ENDPOINTS.md.

## 2. Is QpiAI actually used? (UNKNOWN today)
```
rg -n "qpiai|QpiAI" --type py backend/
rg -n "^(from|import) qpiai" --type py backend/
rg -n "solve\(|mode=|allow_platform" --type py backend/
pip show qpiai-opt qpiai-quantum
```
Record exact file:line hits. "Imported" is not "called": find the call path from a route to the SDK call.

## 3. If QpiAI Opt is missing
Add a solver path in `backend/engines/opt_qpiai.py` that takes the QUBO from `qubo.py` and solves it with qpiai-opt in local mode:
```python
import os
from qpiai_opt.opt_solvers import Client, solve
client = Client(api_key=os.environ["QPIAI_OPT_API_KEY"])
result = solve(qubo_problem, mode="local", client=client)   # never allow_platform=True
```
Facts from the PyPI page (qpiai-opt 0.0.9, Apache-2.0): local solving is free but **verifies the key online first**; no network = no solve. So the demo laptop needs internet, and the fallback (exact enumeration in domain.py) must be wired and labelled. Check the `solve()` input type for a QUBO dict vs `QUBOProblem` in the docs before coding.
Log per call: engine, mode, execution_mode from the result, objective, wall time, seed, penalty weights (from qubo.py bounds).

## 4. If QCloud is missing
Route the VQC circuit (qpiai_vqc.py, 2-qubit statevector) through the qpiai-quantum SDK (`pip install "qpiai-opt[quantum]"` pins qpiai-quantum==0.3.0 per PyPI). Read the SDK docs for the circuit/run API; don't guess method names. Record the backend name and job ID from the job record; the UI badge reads it ("QCloud · <backend>").

## 5. Currency
financial.py prices in $ per minute. Recommendation: show ₹ in the UI, with a labelled assumption block in Settings and Evidence: "Assumed rate: $1 = ₹<x> (date, source); driver cost ₹<y>/min (assumption)". Convert in one function in the backend or one in `frontend/src/lib/money.ts`, never twice. Tag converted values "assumed rate".

## 6. Team claims
"0.0% fallback", "Brier −46.9%", "regret −30.8%" are USER CLAIMS. Show any of them only next to the run log that produced them (run ID, seed, command). No log, no number.

## Done when
openapi.json committed, types generate, ENDPOINTS.md written, PHASE0-REPORT.md lists QpiAI call sites (or the added ones) with one logged run each, currency decided.
