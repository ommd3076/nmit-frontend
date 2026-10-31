import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { apiClient } from './client';
import { configureDispatcherToken, dispatchApi, dispatchRequest, TINY_SCENARIO } from './dispatch';

afterEach(() => {
  configureDispatcherToken('');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const state = {
  driver_id: 'driver_1', vehicle_id: 'vehicle_1', route_id: 'route_v1_primary', corridor_id: 'corridor_a',
  route_version: 1, manifest_revision: 1, status: 'en_route', estimated_duration_seconds: 1200,
  estimated_distance_metres: 1000, last_ack_version: 0, last_ack_at: null, updated_at: '2026-10-30T00:00:00Z',
  active_overlays: {}, stops: [], geojson: null,
};
const ok = (payload: unknown) => new Response(JSON.stringify(payload), { status: 200 });

describe('dispatcher API client', () => {
  it('uses dispatcher routes, request IDs and validates real state/audit shapes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ actor: 'local_dispatcher', states: [state], proposals: [] }))
      .mockResolvedValueOnce(ok([{ id: 7, event_type: 'route_published', principal: 'local_dispatcher', payload: {}, created_at: '2026-10-30T00:00:00Z' }]));
    vi.stubGlobal('fetch', fetchMock);

    expect((await dispatchApi.state()).states[0].route_version).toBe(1);
    expect((await dispatchApi.audits())[0].event_type).toBe('route_published');
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toMatch(/\/api\/v1\/demo\/(dispatcher\/state|audits)$/);
      expect((init as RequestInit).headers).toHaveProperty('X-Request-ID');
    }
  });

  it('rejects malformed successful responses instead of trusting casts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ actor: 'local_dispatcher', states: [{}], proposals: [] })));
    await expect(dispatchApi.state()).rejects.toMatchObject({ code: 'invalid_response', status: 502 });
  });

  it('sends approval only to the encoded proposal route and accepts the published manifest shape', async () => {
    const manifest = { driver_id: 'driver_1', vehicle_id: 'vehicle_1', version: 2, route_version: 2, route_id: 'route_v1_bypass', corridor_id: 'corridor_b', proposal_id: 'p/1', status: 'published' };
    const fetchMock = vi.fn().mockResolvedValue(ok(manifest));
    vi.stubGlobal('fetch', fetchMock);
    expect(await dispatchApi.approve('p/1')).toEqual(manifest);
    expect(fetchMock.mock.calls[0][0]).toContain('/demo/proposals/p%2F1/approve');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{}' });
  });

  it('surfaces unauthorized and stale-version decisions as stable backend errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: { error: { code: 'dispatcher_required', message: 'dispatcher or admin role required' } } }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: { error: { code: 'stale_proposal', message: 'proposal failed validation or is stale' } } }), { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(dispatchApi.state()).rejects.toMatchObject({ code: 'dispatcher_required', status: 403 });
    await expect(dispatchApi.approve('proposal-stale')).rejects.toMatchObject({ code: 'stale_proposal', status: 409 });
  });

  it('distinguishes cancellation and timeout from a connection failure', async () => {
    const cancelled = new AbortController();
    cancelled.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await expect(dispatchRequest('/demo/audits', undefined, cancelled.signal)).rejects.toMatchObject({ code: 'cancelled' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')));
    await expect(dispatchRequest('/demo/audits')).rejects.toMatchObject({ code: 'timeout', status: 408 });
  });

  it('redacts a configured token from backend errors and keeps auth out of the body', async () => {
    const token = 'do-not-leak-sentinel';
    configureDispatcherToken(token);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'authentication_failed', message: `Rejected ${token}` } }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await dispatchApi.state();
      throw new Error('expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as Error).message).not.toContain(token);
    }
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
    expect(init.body).toBeUndefined();
  });

  it('shares dispatcher configuration with the main health and solver client', async () => {
    const token = 'cross-client-test-sentinel';
    configureDispatcherToken(token);
    const fetchMock = vi.fn().mockResolvedValue(ok({
      api_version: '1', capacity: { max_slots: 2, active_slots: 0, available_slots: 2, active_job_ids: [] }, engines_available: []
    }));
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.getHealth();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('authorization')).toBe(`Bearer ${token}`);
  });

  it('routes scenario calls to the implemented QAOA and solve contracts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ status: 'completed', plan: {} }))
      .mockResolvedValueOnce(ok({ job_id: 'job-1', status: 'queued', submitted_at: '2026-10-30T00:00:00Z', poll_url: '/api/v1/jobs/job-1', engine: 'exact_enumeration', scenario_id: 'operator-scenario' }));
    vi.stubGlobal('fetch', fetchMock);
    await dispatchApi.solve(TINY_SCENARIO, 'qaoa_warm_start');
    await dispatchApi.solve(TINY_SCENARIO, 'exact_enumeration');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/scenarios/qaoa');
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ scenario: TINY_SCENARIO, warm_start: true });
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/solve');
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toMatchObject({ scenario: TINY_SCENARIO, engine: 'exact_enumeration' });
  });
});

describe('persisted proposal envelope', () => {
  it('normalizes owner fields from the actual persisted nested payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({actor:'local_dispatcher',states:[state],proposals:[{proposal_id:'proposal-1',status:'pending',base_route_version:1,proposal:{driver_id:'driver_1',vehicle_id:'vehicle_1'}}]})));
    const result = await dispatchApi.state();
    expect(result.proposals[0]).toMatchObject({driver_id:'driver_1',vehicle_id:'vehicle_1',proposal_id:'proposal-1',status:'pending'});
  });
});
