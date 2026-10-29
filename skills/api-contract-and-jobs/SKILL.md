---
name: api-contract-and-jobs
description: Use when writing any API call, job polling, cancel, recovery re-plan, or error handling in web or mobile.
---
# API contract and jobs

Known backend facts (from Ojus's team; confirm paths in Phase 0): FastAPI, routes under `/api/v1/*`; a `BoundedSemaphore(2)` caps concurrent solves and returns **429 `capacity_reached`**; jobs.py runs async jobs on SQLite WAL with cancel and `restart_interrupted`; recovery.py re-plans mid-shift with locked prefixes and an audit log; validator.py checks constraints independently.

Route names below are placeholders until ENDPOINTS.md exists.

## Client
- One typed client per app: `frontend/src/api/client.ts`, `apps/driver-mobile/src/api/client.ts`, both importing `packages/shared-types` (openapi-typescript output). Use `openapi-fetch` (same author, typed) or plain fetch with the generated types.
- Base URL: web `VITE_API_URL` (default `http://127.0.0.1:8000`); mobile `EXPO_PUBLIC_API_URL` (emulator `http://10.0.2.2:8000`, phone = laptop LAN IP; backend `--host 0.0.0.0`).
- Timeouts: 10s for reads, 30s for job submit. AbortController on unmount.

## Jobs
- Submit → job id → poll status every 1s for 10s, then every 3s, max 10 min (show elapsed). Stop polling on terminal states.
- States to render: queued, running, succeeded, failed, cancelled, interrupted (restarted by `restart_interrupted`), partial (if the API returns partial results).
- Cancel: optimistic "Cancelling…", confirm with the next poll. Never mark cancelled before the server says so.
- Polling uses TanStack Query (`refetchInterval` as a function of status) on web and mobile.

## 429 capacity_reached
- Show "Solver busy: 2 runs already in progress. Retry in Ns." Retry with backoff 2s, 4s, 8s (max 3), honour `Retry-After` if present. Show a Jobs link to see/cancel the running ones. Never auto-retry a POST more than 3 times.

## Recovery re-plan
- Request includes the delayed stop/event and the locked prefix (stops already served). UI shows locked stops greyed with a lock icon and "Locked (served)".
- Show the audit log entry returned by recovery.py beside the new plan.
- Run the result through the validator result field; if the validator fails, show the failure reasons and keep the old plan active.

## Errors
Map every error to plain text: network ("Can't reach backend at <url>"), 4xx with detail, 422 validation (list fields), 429 (above), 5xx ("Backend error; job log id <id>").
