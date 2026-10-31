import { Platform } from 'react-native';

export type DriverIdentity = { token: string; driver_id: string; driver_name: string; vehicle_id: string; expires_at: string };
export type DriverState = {
  driver_id: string; vehicle_id: string; route_id: string; corridor_id: string;
  route_version: number; manifest_revision: number; status: string;
  estimated_duration_seconds: number | null; estimated_distance_metres: number | null;
  active_overlays: string[]; geojson: unknown; last_ack_version: number | null;
  last_ack_at: string | null; updated_at: string; stops?: DriverStop[];
};
export type DriverStop = { id: string; sequence: number; name: string; status: string; address: string | null; eta_window: string | null; detail_available: boolean; coordinates?: [number, number] | null };
export type DriverManifest = { driver_id: string; vehicle_id: string; version: number; route_version: number; route_id: string; corridor_id: string; status: string; manifest_revision?: number; stops?: DriverStop[] };
export type ReportProposal = {
  status: 'proposal_pending'; event_id: string; proposal_id: string; job_id: string; driver_id: string; vehicle_id: string;
  base_route_version: number; decision: 'PROPOSE_ROUTE' | 'KEEP'; reason: string; proposed_route_id: string | null;
  proposed_corridor_id: string | null; published: false; current_route_version: number; current_route_id: string;
  current_duration_seconds: number | null; proposed_duration_seconds: number | null; time_saved_seconds: number | null;
  proposed_route_geojson: unknown; validation: { status: 'not_performed' | string; valid: boolean | null };
};
export type AckResult = { status: 'acknowledged'; driver_id: string; vehicle_id: string; version: number; manifest_revision: number; acknowledged_at: string };
export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly requestId?: string) {
    super(message); this.name = 'ApiError';
  }
}

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL?.trim() || (Platform.OS === 'android' ? 'http://10.0.2.2:8001' : 'http://127.0.0.1:8001')).replace(/\/+$/, '');
let requestSequence = 0;
function makeRequestId(): string {
  // This is a trace/idempotency key, not a credential. Avoid relying on
  // crypto.randomUUID, which is not consistently available in Expo Go.
  requestSequence += 1;
  return `driver-${Date.now().toString(36)}-${requestSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(detail: unknown, status: number): { message: string; code: string } {
  const record = detail && typeof detail === 'object' ? detail as Record<string, unknown> : null;
  const nested = record?.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : null;
  const message = nested?.message ?? (typeof detail === 'string' ? detail : undefined);
  const code = nested?.code;
  return {
    message: typeof message === 'string' ? message : `Request failed (${status}).`,
    code: typeof code === 'string' ? code : `http_${status}`,
  };
}

export const configuredApiOrigin = API_ORIGIN;
async function request<T>(path: string, token?: string, init?: RequestInit, requestId = makeRequestId()): Promise<T> {
  let origin: URL;
  try { origin = new URL(API_ORIGIN); }
  catch { throw new ApiError('Set EXPO_PUBLIC_API_URL to an HTTP(S) API origin. For a physical phone, use the development computer LAN address.', 'invalid_api_url', 0, requestId); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/') {
    throw new ApiError('Set EXPO_PUBLIC_API_URL to an HTTP(S) API origin. For a physical phone, use the development computer LAN address.', 'invalid_api_url', 0, requestId);
  }
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = 10_000;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onAbort = () => controller.abort();
  if (init?.signal?.aborted) controller.abort();
  else init?.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      ...init, signal: controller.signal,
      // Never send browser cookies; driver access is scoped to this bearer session.
      ...(Platform.OS === 'web' ? { mode: 'cors' as const } : {}), credentials: 'omit',
      headers: {
        Accept: 'application/json', 'X-Request-ID': requestId,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers,
      },
    });
    const raw = await response.text();
    let body: unknown = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {
      if (response.ok) throw new ApiError('The service returned an unreadable response.', 'invalid_response', response.status, requestId);
    }
    if (!response.ok) {
      const detail = (body && typeof body === 'object' ? (body as Record<string, unknown>).detail : undefined);
      const error = errorMessage(detail, response.status);
      throw new ApiError(error.message, error.code, response.status, requestId);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      if (timedOut) throw new ApiError('The service did not respond in time. Check the connection and retry.', 'timeout', 0, requestId);
      throw new ApiError('Request cancelled.', 'aborted', 0, requestId);
    }
    throw new ApiError(`Can't reach the service at ${API_ORIGIN}. Check the API address and network.`, 'network_error', 0, requestId);
  } finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', onAbort); }
}
export const driverApi = {
  pair: (code: string) => request<DriverIdentity>('/api/v1/demo/sessions', undefined, { method: 'POST', body: JSON.stringify({ code }) }),
  state: (token: string, signal?: AbortSignal) => request<DriverState>('/api/v1/demo/state', token, { signal }),
  manifest: (token: string, signal?: AbortSignal) => request<DriverManifest>('/api/v1/demo/manifest', token, { signal }),
  revoke: (token: string) => request<{ status: 'revoked'; driver_id: string }>('/api/v1/demo/sessions/current', token, { method: 'DELETE' }),
  report: (token: string, payload: { event_id: string; base_route_version: number; severity: string; note: string }) =>
    // The backend deduplicates reports by event_id; reuse it as the trace ID so
    // a caller retrying the same report remains identifiable and idempotent.
    request<ReportProposal>('/api/v1/demo/reports', token, { method: 'POST', body: JSON.stringify(payload) }, payload.event_id),
  acknowledge: (token: string, version: number, manifest_revision: number) =>
    request<AckResult>('/api/v1/demo/acknowledgements', token, { method: 'POST', body: JSON.stringify({ version, manifest_revision }) }),
};
