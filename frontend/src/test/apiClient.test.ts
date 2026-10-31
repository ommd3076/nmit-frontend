import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from '../api/client';
import { setApiToken } from '../api/auth';

afterEach(() => {
  setApiToken('');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('backend API client', () => {
  it('uses the same-origin API by default and reports an unavailable backend honestly', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const health = await apiClient.getHealth();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/health$/);
    expect(health.status).toBe('offline');
    expect(health.capacity).toBeNull();
    expect(health.engines_available).toEqual([]);
  });

  it('does not replace unavailable run data with fixtures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(apiClient.getRuns()).rejects.toMatchObject({ code: 'network_error' });
  });

  it('passes caller cancellation to fetch and reports it separately from network failure', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = apiClient.getRuns(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'request_aborted', status: 0 });
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(true);
  });

  it('distinguishes request timeout from a backend network failure', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = apiClient.getRuns();
    const assertion = expect(pending).rejects.toMatchObject({ code: 'timeout', status: 0 });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    vi.useRealTimers();
  });

  it('validates the critical health response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 })));
    await expect(apiClient.getHealth()).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('preserves backend job status and does not invent progress or a run id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 'j-1', status: 'timed_out', submitted_at: '2026-10-30T00:00:00Z', started_at: '2026-10-30T00:00:01Z',
      completed_at: '2026-10-30T00:00:03Z', result: null, error: { code: 'timeout', message: 'timed out' },
      metadata: { solver: 'exact', execution_type: 'local_solver' }
    }]), { status: 200 })));
    const [job] = await apiClient.getJobs();
    expect(job.status).toBe('timed_out');
    expect(job.progress_pct).toBeNull();
    expect(job.result_plan_id).toBeNull();
    expect(job.error_message).toBe('timed out');
  });

  it('accepts explicit unknown evidence without filling in fixture scores', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model_name: 'unverified', brier_score: null, brier_reduction_pct: null,
      regret_reduction_pct: null, user_claim_verified: false, user_claim_note: 'No run evidence.',
      calibration_points: [], benchmarks: [], quantum_circuit_summary: {
        type: 'unverified', qubits: null, backend_mode: 'unavailable', execution_badge: 'Preview'
      }, disclaimer: 'No evidence attached.'
    }), { status: 200 })));
    const evidence = await apiClient.getIntelligenceEvidence();
    expect(evidence.brier_score).toBeNull();
    expect(evidence.user_claim_verified).toBe(false);
    expect(evidence.benchmarks).toEqual([]);
  });

  it('converts only the backend capacity error to the compatible result union', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'capacity_reached', message: 'busy' } }), { status: 429 })));
    expect(await apiClient.submitSolve({ scenario_id: 'tiny', engine: 'exact' })).toEqual({ error: 'capacity_reached', retry_after: 4 });
  });

  it('rejects empty job IDs and malformed poll locations on submission', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: ' ', status: 'queued', poll_url: '/api/v1/jobs/ ' }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: 'j-1', status: 'queued', poll_url: 'https://elsewhere/jobs/j-1' }), { status: 202 })));
    await expect(apiClient.submitSolve({ scenario_id: 'tiny', engine: 'exact' })).rejects.toMatchObject({ code: 'invalid_response' });
    await expect(apiClient.submitSolve({ scenario_id: 'tiny', engine: 'exact' })).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('accepts the documented solve response and does not invent authorization headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      job_id: 'j-1', status: 'queued', submitted_at: '2026-10-30T00:00:00Z',
      poll_url: '/api/v1/jobs/j-1', engine: 'exact_enumeration', scenario_id: 'tiny'
    }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const submission = await apiClient.submitSolve({ scenario_id: 'tiny', engine: 'exact' });
    expect(submission).toEqual({ job_id: 'j-1', status: 'queued', poll_url: '/api/v1/jobs/j-1' });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get('content-type')).toBe('application/json');
    expect(new Headers(request.headers).has('authorization')).toBe(false);
  });

  it('shares the in-memory token with the main API client and redacts it from errors', async () => {
    const token = 'non-secret-test-sentinel';
    setApiToken(token);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: {
      code: 'authentication_failed', message: `Rejected ${token}`, details: { note: `Credential ${token}` }
    } }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await apiClient.getRuns();
      throw new Error('expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as Error).message).not.toContain(token);
      expect((error as ApiError).details).toEqual({ note: 'Credential [redacted]' });
    }
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get('authorization')).toBe(`Bearer ${token}`);
  });

  it('rejects a job record whose ID differs from the requested job', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'other-job', status: 'queued', submitted_at: '2026-10-30T00:00:00Z', metadata: {}
    }), { status: 200 })));
    await expect(apiClient.getJob('requested-job')).rejects.toMatchObject({ code: 'invalid_response', status: 502 });
  });

  it('propagates stable backend errors and confirms cancellation only from server state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'job_not_found', message: 'missing' } }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'j-1', status: 'running', submitted_at: '2026-10-30T00:00:00Z', metadata: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'j-1', status: 'cancelled', submitted_at: '2026-10-30T00:00:00Z', metadata: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiClient.cancelJob('missing')).rejects.toBeInstanceOf(ApiError);
    expect(await apiClient.cancelJob('j-1')).toBe(false);
    expect(await apiClient.cancelJob('j-1')).toBe(true);
  });
});
