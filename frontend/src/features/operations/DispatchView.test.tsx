import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DispatchView } from './DispatchView';

describe('DispatchView', () => {
  it('validates scenario with backend, polls the submitted job, and renders its validated route', async () => {
    const calls: string[] = [];
    let submittedScenario: any;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'http://localhost').pathname;
      calls.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.endsWith('/scenarios/validate')) { submittedScenario = JSON.parse(String(init?.body)); return Response.json({ valid: true, errors: [], execution_type: 'local_classical' }); }
      if (path === '/api/v1/jobs') return Response.json({ id: 'job-42', status: 'queued' }, { status: 202 });
      if (path.endsWith('/jobs/job-42')) return Response.json({ id: 'job-42', status: 'succeeded', metadata: { execution_type: 'local_classical' }, result: { plan: { status: 'feasible', objective: 8, routes: [{ vehicle_id: 'V1', order_ids: ['A'], stops: [{ order_id: 'A', arrival: 2, service_start: 2 }], travel_cost: 4 }] }, validation: { valid: true, feasible: true, recomputed: { objective: 8 } } } });
      throw new Error(`Unexpected request ${path}`);
    }));
    render(<DispatchView />);
    fireEvent.click(screen.getByText('Travel matrix · minutes'));
    fireEvent.change(screen.getByLabelText('Travel D to A minutes'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate and run optimization' }));
    expect(await screen.findByText('Scenario valid')).toBeTruthy();
    expect(await screen.findByText('V1')).toBeTruthy();
    expect(screen.getByText('Independent validation passed')).toBeTruthy();
    expect(calls).toContain('POST /api/v1/scenarios/validate');
    expect(calls).toContain('POST /api/v1/jobs');
    expect(calls).toContain('GET /api/v1/jobs/job-42');
    expect(submittedScenario.travel.D.A).toBe(9);
    vi.unstubAllGlobals();
  });
});
