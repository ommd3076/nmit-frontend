import { ApiError } from './client';
import { getApiToken, redactApiToken, setApiToken } from './auth';
export const configureDispatcherToken = setApiToken;

export interface DriverStop { id: string; sequence: number; name: string; status: string; address: string | null; eta_window: unknown; coordinates?: [number, number]; }
export interface DriverState {
  driver_id: string; vehicle_id: string; route_id: string; corridor_id: string;
  route_version: number; manifest_revision: number; status: string;
  estimated_duration_seconds: number; estimated_distance_metres: number;
  last_ack_version: number; last_ack_at: string | null; updated_at: string;
  active_overlays: Record<string, unknown>; stops: DriverStop[];
  geojson: { type: string; geometry: { type: string; coordinates: [number, number][] }; properties: Record<string, unknown> } | null;
}
export interface Proposal {
  id?: string; proposal_id?: string; driver_id: string; vehicle_id: string;
  status: string; base_route_version: number; [key: string]: unknown;
}
export interface DispatcherState { actor: string; states: DriverState[]; proposals: Proposal[]; }
export interface AuditEntry { id?: string | number; event_type: string; principal: string; timestamp?: string; created_at?: string; payload: Record<string, unknown>; }
/** Exact result returned by demo proposal approval (a published manifest, not DriverState). */
export interface ApprovalManifest {
  driver_id: string; vehicle_id: string; version: number; route_version: number;
  route_id: string; corridor_id: string; proposal_id?: string; status: string;
  validation?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface Scenario {
  depot: string; vehicles: { id: string; capacity: number }[];
  orders: { id: string; demand: number; window: [number, number]; service: number; penalty: number }[];
  travel: Record<string, Record<string, number>>;
}
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isDriverState = (value: unknown): value is DriverState => isRecord(value) &&
  ['driver_id', 'vehicle_id', 'route_id', 'corridor_id', 'status', 'updated_at'].every((key) => typeof value[key] === 'string') &&
  ['route_version', 'manifest_revision', 'estimated_duration_seconds', 'estimated_distance_metres', 'last_ack_version'].every((key) => typeof value[key] === 'number') &&
  Array.isArray(value.stops) && isRecord(value.active_overlays);
const isProposal = (value: unknown): value is Proposal => isRecord(value) &&
  (typeof value.proposal_id === 'string' || typeof value.id === 'string') &&
  typeof value.status === 'string' && typeof value.driver_id === 'string' && typeof value.vehicle_id === 'string' &&
  typeof value.base_route_version === 'number';
const isDispatcherState = (value: unknown): value is DispatcherState => isRecord(value) &&
  typeof value.actor === 'string' && Array.isArray(value.states) && value.states.every(isDriverState) &&
  Array.isArray(value.proposals) && value.proposals.every(isProposal);
const isAuditEntry = (value: unknown): value is AuditEntry => isRecord(value) &&
  (typeof value.id === 'string' || typeof value.id === 'number') && typeof value.event_type === 'string' &&
  typeof value.principal === 'string' && typeof value.created_at === 'string' && isRecord(value.payload);
const isApprovalManifest = (value: unknown): value is ApprovalManifest => isRecord(value) &&
  typeof value.driver_id === 'string' && typeof value.vehicle_id === 'string' &&
  typeof value.version === 'number' && typeof value.route_version === 'number' &&
  typeof value.route_id === 'string' && typeof value.corridor_id === 'string' && typeof value.status === 'string';

function requestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `dispatch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function redact(value: unknown): unknown {
  return redactApiToken(value);
}

export async function dispatchRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { 'X-Request-ID': requestId() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  const timeoutSignal = AbortSignal.timeout(30_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  try {
    response = await fetch(`${API_ORIGIN}/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: requestSignal,
    });
  } catch (error) {
    if (timeoutSignal.aborted || (error instanceof DOMException && error.name === 'TimeoutError')) {
      throw new ApiError('timeout', 'Backend request timed out. Retry when the server is available.', 408);
    }
    if (signal?.aborted) throw new ApiError('cancelled', 'Backend request was cancelled.', 0);
    throw new ApiError('network_error', 'Backend connection failed. Check the server and retry.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = data?.error || data?.detail?.error;
    const code = typeof failure?.code === 'string' ? failure.code : `http_${response.status}`;
    const message = typeof failure?.message === 'string' ? failure.message : `Request failed (${response.status})`;
    throw new ApiError(code, String(redact(message)), response.status, redact(failure?.details ?? data?.detail));
  }
  if (data === null) throw new ApiError('invalid_response', 'Backend returned an empty response.', 502);
  return data as T;
}
export const dispatchApi = {
  async state(signal?: AbortSignal): Promise<DispatcherState> {
    const value: unknown = await dispatchRequest<unknown>('/demo/dispatcher/state', undefined, signal);
    if (isRecord(value) && Array.isArray(value.proposals)) {
      value.proposals = value.proposals.map((entry: unknown) => {
        if (!isRecord(entry) || !isRecord(entry.proposal)) return entry;
        return { ...entry, driver_id: entry.driver_id ?? entry.proposal.driver_id, vehicle_id: entry.vehicle_id ?? entry.proposal.vehicle_id };
      });
    }
    if (!isDispatcherState(value)) throw new ApiError('invalid_response', 'Backend returned an invalid dispatcher state.', 502);
    return value;
  },
  async audits(signal?: AbortSignal): Promise<AuditEntry[]> {
    const value: unknown = await dispatchRequest<unknown>('/demo/audits', undefined, signal);
    if (!Array.isArray(value) || !value.every(isAuditEntry)) throw new ApiError('invalid_response', 'Backend returned invalid dispatcher audits.', 502);
    return value;
  },
  async approve(id: string): Promise<ApprovalManifest> {
    if (!id.trim()) throw new ApiError('invalid_request', 'Proposal ID is required.', 0);
    // The server checks proposal status and its base route version atomically before publishing.
    const value: unknown = await dispatchRequest<unknown>(`/demo/proposals/${encodeURIComponent(id)}/approve`, {});
    if (!isApprovalManifest(value)) throw new ApiError('invalid_response', 'Backend returned an invalid approval manifest.', 502);
    return value;
  },
  validate: (scenario: Scenario) => dispatchRequest<{ valid: boolean; errors: string[] }>('/scenarios/validate', scenario),
  solve: (scenario: Scenario, engine: string) => engine === 'qaoa_warm_start'
    ? dispatchRequest<Record<string, unknown>>('/scenarios/qaoa', { scenario, seed: 7, shots: 128, warm_start: true, angle_grid: 4 })
    : dispatchRequest<{ job_id: string; status: string }>('/solve', { scenario, scenario_id: 'operator-scenario', engine: 'exact_enumeration' }),
};

/** Deterministic, explicitly labeled tiny scenario; travel values are input minutes, not learned road-leg ETA. */
export const TINY_SCENARIO: Scenario = {
  depot: 'D', vehicles: [{ id: 'V1', capacity: 3 }, { id: 'V2', capacity: 2 }],
  orders: [{ id: 'A', demand: 2, window: [0, 5], service: 1, penalty: 4 }, { id: 'B', demand: 1, window: [0, 4], service: 1, penalty: 2 }, { id: 'C', demand: 2, window: [0, 20], service: 1, penalty: 1 }],
  travel: { D: { D: 0, A: 2, B: 1, C: 3 }, A: { D: 2, A: 0, B: 1, C: 2 }, B: { D: 1, A: 1, B: 0, C: 2 }, C: { D: 3, A: 2, B: 2, C: 0 } },
};
