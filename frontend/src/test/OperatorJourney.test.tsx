import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

const now = '2026-10-30T12:00:00.000Z';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function installBackendMock(overrides: Record<string, (init: RequestInit) => Response | Promise<Response>> = {}) {
  const calls: Array<{ path: string; init: RequestInit; body: unknown }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace('/api/v1', '');
    let body: unknown;
    try { body = init.body ? JSON.parse(String(init.body)) : undefined; } catch { body = undefined; }
    calls.push({ path, init, body });
    const common: Record<string, unknown> = {
      '/health': { api_version: 'test', timestamp: now, capacity: {}, engines_available: [] },
      '/runs': [], '/jobs': [],
      '/demo/dispatcher/state': { actor: 'dispatcher', states: [], proposals: [] },
      '/demo/audits': [],
      '/intelligence/evidence': { model_name: 'test fixture', disclaimer: 'Test data only', calibration_points: [], benchmarks: [], quantum_circuit_summary: { qubits: null } },
    };
    const override = overrides[path];
    if (override) return override(init);
    return json(common[path] ?? { error: { code: 'not_found', message: `Unexpected test request: ${path}` } }, common[path] === undefined ? 404 : 200);
  }));
  return calls;
}

describe('Integrated operator journey (API boundary mocked)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    // jsdom does not implement these browser dialog methods.
    if (!HTMLDialogElement.prototype.showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn() });
    if (!HTMLDialogElement.prototype.close) Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn() });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('navigates through all ten wired operator views', async () => {
    installBackendMock();
    render(<App />);
    await screen.findByRole('heading', { name: 'Command center' });

    const views = [
      ['Command', 'Command center', 'command'], ['Live map', 'Live map', 'map'], ['Dispatch', 'Dispatch planning', 'dispatch'],
      ['Compare', 'Route comparison', 'compare'], ['Fleet', 'Fleet', 'fleet'], ['Drivers', 'Drivers', 'driver'],
      ['Orders', 'Orders', 'orders'], ['Analytics', 'Analytics', 'analytics'], ['Diagnostics', 'Diagnostics', 'diagnostics'],
      ['Recovery', 'Incidents & audit', 'recovery'],
    ];
    for (const [nav, heading, hash] of views) {
      fireEvent.click(screen.getByRole('button', { name: nav }));
      await waitFor(() => expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument());
      expect(window.location.hash).toBe(`#/${hash}`);
    }
  });

  it('submits the edited scenario to validation and QAOA, then renders the returned backend job', async () => {
    const calls = installBackendMock({
      '/scenarios/validate': () => json({ valid: true, errors: [] }),
      '/jobs/qaoa': () => json({ id: 'job-qaoa-42', status: 'succeeded', metadata: { execution_type: 'local_simulator' }, result: {
        plan: { status: 'feasible', objective: 7, travel_cost: 5, lateness_exposure: 2, routes: [{ vehicle_id: 'V1', order_ids: ['A'], stops: [{ order_id: 'A', arrival: 2, service_start: 2, lateness: 0 }], travel_cost: 5 }] },
        validation: { valid: true, errors: [] },
      } }),
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dispatch' }));
    await screen.findByRole('heading', { name: 'Dispatch planning' });

    fireEvent.change(screen.getByLabelText('Depot identifier'), { target: { value: 'DEPOT-X' } });
    fireEvent.change(screen.getByLabelText('Planning algorithm'), { target: { value: 'qaoa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate and run optimization' }));

    await screen.findByText('Job job-qaoa-42');
    expect(screen.getByText('Backend job succeeded.')).toBeInTheDocument();
    expect(screen.getByLabelText('Depot identifier')).toHaveValue('DEPOT-X');
    expect(screen.getByText('7')).toBeInTheDocument();

    const validation = calls.find((call) => call.path === '/scenarios/validate');
    const submission = calls.find((call) => call.path === '/jobs/qaoa');
    expect(validation?.body).toMatchObject({ depot: 'DEPOT-X', vehicles: expect.arrayContaining([{ id: 'V1', capacity: 3 }]), orders: expect.any(Array), travel: expect.any(Object) });
    expect(submission?.body).toMatchObject({ seed: 7, shots: 128, warm_start: true, angle_grid: 4, scenario: { depot: 'DEPOT-X' } });
    expect(submission?.init.method).toBe('POST');
  });

  it('shows a field-level validation error and does not submit a solver job', async () => {
    const calls = installBackendMock({
      '/scenarios/validate': () => json({ detail: { error: { code: 'invalid_scenario', message: 'orders[0].demand must be positive' } } }, 422),
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dispatch' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Validate and run optimization' }));

    expect(await screen.findByText('orders[0].demand must be positive')).toBeInTheDocument();
    expect(calls.some((call) => call.init.method === 'POST' && (call.path === '/jobs' || call.path === '/jobs/qaoa'))).toBe(false);
  });
});
