# arQ web API contract

The web client calls only the FastAPI routes below. `VITE_API_URL` may set an API origin; when unset, requests use same-origin relative `/api/v1/*` paths. The client never supplies demo data when a read fails.

## Health and persisted display data

| Method | Path | Client behavior |
| --- | --- | --- |
| GET | `/api/v1/health` | A successful response must include `api_version`, `capacity`, and `engines_available`. A network failure yields an offline state, empty engine list, and unknown (`null`) capacity. Invalid successful payloads are errors. |
| GET | `/api/v1/runs` | Returns `PlanRun[]` from the backend. A run must have identifiers, `vehicles`, `routes`, and `validator_result`. No fixtures are substituted. |
| GET | `/api/v1/runs/{run_id}` | Returns a validated `PlanRun`; backend 404 maps to `null`. |
| GET | `/api/v1/intelligence/evidence` | Returns backend evidence payload; no bundled evidence fallback. |
| GET | `/api/v1/events` | Returns backend events; malformed rows are rejected. |

Runs currently originate from `RunsService` display fixtures and are marked `provenance_badge: Preview` plus `data_source: fixture`. They are not proof of a live operation. The evidence endpoint returns null scores and empty measured series until verified run artifacts are connected. Fixture narrative events are excluded from the operational events feed.

## Jobs

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/api/v1/solve` | Request is `{scenario_id, engine, penalty_weights?}`. Backend responds `202` with `{job_id,status,submitted_at,poll_url,engine,scenario_id}`. `429` with error code `capacity_reached` is returned in the existing caller-compatible union; other errors throw `ApiError`. Backend code may load its own tiny fixture when no scenario is supplied, so a successful submission alone is not evidence the requested scenario was used. |
| GET | `/api/v1/jobs` | Persisted job records. Client preserves server status/result/error/metadata. |
| GET | `/api/v1/jobs/{job_id}` | Poll one persisted record. |
| POST | `/api/v1/jobs/{job_id}/cancel` | Returns the server's job record. `cancelJob` is true only when that record says `cancelled`; terminal or missing jobs are not optimistically changed. |

Job status values include `queued`, `running`, `succeeded`, `failed`, `cancelled`, `interrupted`, `timed_out`, `infeasible`, and `partial`. The backend does not expose progress percentage or result run IDs in its job schema; these fields remain `null`. Active elapsed time is age since submission; terminal elapsed time uses recorded start/completion timestamps when present. Execution provenance comes from `metadata.execution_type` and `metadata.solver`.

## Recovery

`POST /api/v1/recovery/replan` accepts `{run_id,vehicle_id,delayed_stop_id,delay_minutes,locked_stop_ids}`. The client returns only fields in the backend response (`success`, `audit_log`, `exposure_delta_inr`, `reordered_count`, optional `updated_run`). The current service contains fixture-oriented behavior; its audit string and exposure delta are reported as returned, without client-side edits or synthetic events.

## Errors and timeouts

Non-2xx responses become `ApiError` with a stable backend error code where supplied, HTTP status, message, and details. Network errors use `network_error`. The health read is the sole exception: a reachable-state failure renders the explicit disconnected health value needed by the status surface. Reads time out after 10 seconds; health after 2 seconds; solve submission and recovery after 30 seconds.

API calls do not retry POST requests automatically. Job polling cadence is owned by the screen; a status must be refreshed from the server before a terminal transition is shown.
