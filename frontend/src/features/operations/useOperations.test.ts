import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOperations } from './useOperations';

const api = vi.hoisted(() => ({
  getHealth: vi.fn(), getRuns: vi.fn(), getJobs: vi.fn(), getIntelligenceEvidence: vi.fn(),
  state: vi.fn(), audits: vi.fn(),
}));
vi.mock('../../api/client', () => ({ apiClient: api }));
vi.mock('../../api/dispatch', () => ({ dispatchApi: { state: api.state, audits: api.audits } }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const data = () => {
  api.getHealth.mockResolvedValue({ status: 'healthy', backend_url: '', version: '1', timestamp: '', capacity: null, engines_available: [] });
  api.getRuns.mockResolvedValue([]); api.getJobs.mockResolvedValue([]); api.getIntelligenceEvidence.mockResolvedValue(null);
  api.state.mockResolvedValue({ actor: 'dispatcher', states: [{ vehicle_id: 'new' }], proposals: [] });
  api.audits.mockResolvedValue([]);
};

describe('useOperations refresh lifecycle', () => {
  beforeEach(() => { vi.clearAllMocks(); data(); });
  afterEach(() => { vi.useRealTimers(); });

  it('deduplicates concurrent refreshes and passes a cancellable signal to dispatcher reads', async () => {
    const waiting = deferred<{ actor: string; states: []; proposals: [] }>();
    api.state.mockReturnValue(waiting.promise);
    const { result, unmount } = renderHook(() => useOperations());
    await waitFor(() => expect(api.state).toHaveBeenCalledTimes(1));
    const signal = api.state.mock.calls[0][0] as AbortSignal;
    act(() => { void result.current.refresh(); });
    expect(api.state).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('drops a late dispatcher result after unmount', async () => {
    const waiting = deferred<{ actor: string; states: []; proposals: [] }>();
    api.state.mockReturnValue(waiting.promise);
    const { result, unmount } = renderHook(() => useOperations());
    await waitFor(() => expect(api.state).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { waiting.resolve({ actor: 'old', states: [], proposals: [] }); await Promise.resolve(); });
    expect(result.current.drivers).toBeNull();
  });

  it('clears dispatcher data when an authenticated read fails instead of retaining stale state', async () => {
    api.audits.mockResolvedValue([{ event_type: 'route_ack', principal: 'driver', payload: {} }]);
    const { result } = renderHook(() => useOperations());
    await waitFor(() => expect(result.current.audits).toHaveLength(1));
    api.state.mockRejectedValueOnce(new Error('Unauthorized'));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => {
      expect(result.current.drivers).toBeNull();
      expect(result.current.audits).toEqual([]);
    });
  });
});
