import type { IntelligenceEvidence, OperationalEvent, PlanRun, SolverJob, SystemHealth } from '../types/api';
import { getApiToken, redactApiToken } from './auth';

// Empty means same-origin `/api/v1/*` through Vite proxy; Vitest/Node uses direct localhost:8000.
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return '';
  }
  return (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
};
const API_BASE_URL = getBaseUrl();
const API = `${API_BASE_URL}/api/v1`;

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, any> {
  if (!isRecord(value)) throw new ApiError('invalid_response', `Backend returned an invalid ${label} response`, 502);
  return value;
}

function requireArray<T>(value: unknown, label: string, validate: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value) || !value.every(validate)) throw new ApiError('invalid_response', `Backend returned invalid ${label}`, 502);
  return value;
}

function isRun(value: unknown): value is PlanRun {
  return isRecord(value) && typeof value.id === 'string' && typeof value.scenario_id === 'string' &&
    Array.isArray(value.vehicles) && Array.isArray(value.routes) && isRecord(value.validator_result);
}

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'interrupted', 'timed_out', 'infeasible', 'partial']);
const JOB_STATUSES = new Set(['queued', 'running', ...TERMINAL]);
function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function jobFromApi(value: unknown, expectedId?: string): SolverJob {
  const job = requireRecord(value, 'job');
  if (!nonEmptyString(job.id) || !JOB_STATUSES.has(job.status) ||
      !nonEmptyString(job.submitted_at) || !Number.isFinite(Date.parse(job.submitted_at)) ||
      (expectedId !== undefined && job.id !== expectedId)) {
    throw new ApiError('invalid_response', 'Backend returned an invalid job record', 502);
  }
  const started = typeof job.started_at === 'string' ? Date.parse(job.started_at) : NaN;
  const submitted = Date.parse(job.submitted_at);
  const elapsed = Number.isFinite(started) && TERMINAL.has(job.status)
    ? Math.max(0, (Date.parse(job.completed_at || job.started_at) - started) / 1000)
    : Number.isFinite(submitted) ? Math.max(0, (Date.now() - submitted) / 1000) : null;
  const badge = job.metadata?.solver === 'exact_enumeration' && job.metadata?.execution_type === 'local_classical'
    ? 'Exact (enumeration)' : 'Preview';
  return {
    id: job.id,
    status: job.status,
    submitted_at: job.submitted_at,
    scenario_id: job.metadata?.settings?.scenario_id ?? 'unknown',
    engine: job.metadata?.solver ?? 'unknown',
    execution_type: job.metadata?.execution_type ?? 'unavailable',
    progress_pct: null,
    elapsed_seconds: elapsed,
    result: job.result ?? null,
    error: job.error ?? null,
    error_message: job.error?.message ?? null,
    result_plan_id: null,
    provenance_badge: badge,
    metadata: job.metadata ?? null
  } as SolverJob;
}

async function request(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<{ response: Response; abortError: () => ApiError | null; finish: () => void }> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    const token = getApiToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(`${API}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortFromCaller);
    if (timedOut) throw new ApiError('timeout', `Backend request timed out after ${timeoutMs}ms`, 0);
    if (callerSignal?.aborted) throw new ApiError('request_aborted', 'Backend request was cancelled', 0);
    throw new ApiError('network_error', `Can't reach backend at ${API_BASE_URL || window.location.origin}`, 0);
  }
  return { response, abortError: () => {
    if (timedOut) return new ApiError('timeout', `Backend request timed out after ${timeoutMs}ms`, 0);
    if (callerSignal?.aborted) return new ApiError('request_aborted', 'Backend request was cancelled', 0);
    return null;
  }, finish: () => {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  } };
}

async function json(path: string, init?: RequestInit, timeoutMs?: number): Promise<unknown> {
  const { response, abortError, finish } = await request(path, init, timeoutMs);
  try {
    if (!response.ok) {
      let payload: any;
      try { payload = await response.json(); }
      catch {
        const aborted = abortError();
        if (aborted) throw aborted;
        payload = null;
      }
      const error = payload?.error ?? payload?.detail?.error ?? {};
      const code = typeof error.code === 'string' ? String(redactApiToken(error.code)) : response.status === 429 ? 'capacity_reached' : `http_${response.status}`;
      const message = typeof error.message === 'string' ? String(redactApiToken(error.message)) : typeof payload?.detail === 'string' ? String(redactApiToken(payload.detail)) : `Backend request failed (${response.status})`;
      throw new ApiError(code, message, response.status, redactApiToken(error.details ?? payload?.details));
    }
    try { return await response.json(); }
    catch {
      const aborted = abortError();
      if (aborted) throw aborted;
      throw new ApiError('invalid_response', 'Backend returned invalid JSON', 502);
    }
  } finally {
    finish();
  }
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const apiClient = {
  getBaseUrl: () => API_BASE_URL,

  async getHealth(signal?: AbortSignal): Promise<SystemHealth> {
    try {
      const value = requireRecord(await json('/health', { signal }, 2_000), 'health');
      if (typeof value.api_version !== 'string' || !isRecord(value.capacity) || !Array.isArray(value.engines_available)) {
        throw new ApiError('invalid_response', 'Backend returned incomplete health data', 502);
      }
      return {
        status: 'healthy', backend_url: API_BASE_URL || window.location.origin,
        version: value.version ?? value.api_version, timestamp: value.timestamp,
        capacity: value.capacity as SystemHealth['capacity'], engines_available: value.engines_available
      };
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'invalid_response' || error.code === 'request_aborted')) throw error;
      return { status: 'offline', backend_url: API_BASE_URL || window.location.origin, version: 'unavailable', timestamp: new Date().toISOString(), capacity: null, engines_available: [] };
    }
  },

  async getRuns(signal?: AbortSignal): Promise<PlanRun[]> {
    return requireArray(await json('/runs', { signal }), 'runs', isRun);
  },

  async getRun(id: string, signal?: AbortSignal): Promise<PlanRun | null> {
    try {
      const result = await json(`/runs/${encodeURIComponent(id)}`, { signal });
      if (!isRun(result)) throw new ApiError('invalid_response', 'Backend returned an invalid run record', 502);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async submitSolve(params: { scenario_id: string; engine: string; penalty_weights?: { delay_weight: number; mileage_weight: number } }, signal?: AbortSignal): Promise<{ job_id: string; status: string; poll_url: string } | { error: 'capacity_reached'; retry_after: number }> {
    try {
      const value = requireRecord(await json('/solve', { ...post(params), signal }, 30_000), 'solve submission');
      const expectedPollUrl = nonEmptyString(value.job_id) ? `/api/v1/jobs/${encodeURIComponent(value.job_id)}` : '';
      if (!nonEmptyString(value.job_id) || !['queued', 'running'].includes(value.status) ||
          !nonEmptyString(value.submitted_at) || !Number.isFinite(Date.parse(value.submitted_at)) ||
          value.poll_url !== expectedPollUrl) {
        throw new ApiError('invalid_response', 'Backend returned an invalid job submission', 502);
      }
      return { job_id: value.job_id, status: value.status, poll_url: value.poll_url };
    } catch (error) {
      if (error instanceof ApiError && error.code === 'capacity_reached') return { error: 'capacity_reached', retry_after: 4 };
      throw error;
    }
  },

  async getJobs(signal?: AbortSignal): Promise<SolverJob[]> {
    return requireArray(await json('/jobs', { signal }), 'jobs', isRecord).map((job) => jobFromApi(job));
  },

  async getJob(id: string, signal?: AbortSignal): Promise<SolverJob> { return jobFromApi(await json(`/jobs/${encodeURIComponent(id)}`, { signal }), id); },

  async cancelJob(id: string, signal?: AbortSignal): Promise<boolean> {
    const value = jobFromApi(await json(`/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', signal }), id);
    return value.status === 'cancelled';
  },

  async executeRecoveryReplan(params: { run_id: string; vehicle_id: string; delayed_stop_id: string; delay_minutes: number; locked_stop_ids: string[] }, signal?: AbortSignal): Promise<{ success: boolean; audit_log: string; exposure_delta_inr: number; reordered_count: number; updated_run?: PlanRun }> {
    const value = requireRecord(await json('/recovery/replan', { ...post(params), signal }, 30_000), 'recovery');
    if (typeof value.success !== 'boolean' || typeof value.audit_log !== 'string' || typeof value.exposure_delta_inr !== 'number' || typeof value.reordered_count !== 'number') {
      throw new ApiError('invalid_response', 'Backend returned an invalid recovery result', 502);
    }
    if (value.updated_run !== undefined && !isRun(value.updated_run)) throw new ApiError('invalid_response', 'Backend returned an invalid recovery run', 502);
    return value as { success: boolean; audit_log: string; exposure_delta_inr: number; reordered_count: number; updated_run?: PlanRun };
  },

  async getIntelligenceEvidence(signal?: AbortSignal): Promise<IntelligenceEvidence> {
    const value = requireRecord(await json('/intelligence/evidence', { signal }), 'intelligence evidence');
    if (typeof value.model_name !== 'string' || typeof value.disclaimer !== 'string' ||
        !Array.isArray(value.calibration_points) || !Array.isArray(value.benchmarks) ||
        !isRecord(value.quantum_circuit_summary) ||
        (value.quantum_circuit_summary.qubits !== null && typeof value.quantum_circuit_summary.qubits !== 'number')) {
      throw new ApiError('invalid_response', 'Backend returned incomplete intelligence evidence', 502);
    }
    return value as IntelligenceEvidence;
  },

  async getOperationalEvents(signal?: AbortSignal): Promise<OperationalEvent[]> {
    return requireArray(await json('/events', { signal }), 'events', (item): item is OperationalEvent => isRecord(item) && typeof item.id === 'string' && typeof item.timestamp === 'string' && typeof item.title === 'string');
  },

  async getDemoState(driverId = 'driver_1', signal?: AbortSignal): Promise<unknown> { return json(`/demo/state?driver_id=${encodeURIComponent(driverId)}`, { signal }); },
  async reportDemoCongestion(driverId: string, severity: 'moderate' | 'heavy', note: string, signal?: AbortSignal): Promise<unknown> { return json('/demo/reports', { ...post({ driver_id: driverId, severity, note }), signal }); },
  async acknowledgeDemoRoute(driverId: string, version: number, signal?: AbortSignal): Promise<unknown> { return json('/demo/acknowledgements', { ...post({ driver_id: driverId, version }), signal }); }
};
