import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiagnosticsView } from './DiagnosticsView';
import type { SolverJob } from '../../types/api';
import type { useOperations } from './useOperations';

function operations(overrides: Partial<ReturnType<typeof useOperations>> = {}) {
  return {
    health: { status: 'healthy', backend_url: 'http://127.0.0.1:8000', version: 'local', timestamp: '', capacity: null, engines_available: [] },
    plans: [], jobs: [], drivers: null, audits: [], evidence: {
      model_name: 'unverified', brier_score: null, brier_reduction_pct: null, regret_reduction_pct: null,
      user_claim_verified: false, user_claim_note: 'No run records', calibration_points: [], benchmarks: [],
      quantum_circuit_summary: { type: 'unverified', qubits: null, backend_mode: 'unavailable', execution_badge: 'Preview' },
      disclaimer: 'No measured evaluation supplied.',
    }, error: '', busy: false, lastSync: null, refresh: vi.fn(), ...overrides,
  } as ReturnType<typeof useOperations>;
}

describe('DiagnosticsView', () => {
  it('shows saved ETA results, frozen alpha zero policy, and honest local execution provenance', () => {
    render(<DiagnosticsView operations={operations()}/>);
    expect(screen.getByText('α = 0')).toBeTruthy();
    expect(screen.getAllByText('3.1467')).toHaveLength(2);
    expect(screen.getByText('3.1473')).toBeTruthy();
    expect(screen.getByText('3.1441')).toBeTruthy();
    expect(screen.getByText(/not a pristine blind test/i)).toBeTruthy();
    expect(screen.getByText(/no cloud solve or QPU/i)).toBeTruthy();
    expect(screen.getByText(/No QAOA job record returned/i)).toBeTruthy();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('renders current QAOA execution records without fabricating progress', () => {
    const job: SolverJob = {
      id: 'job-q1', status: 'succeeded', submitted_at: '2026-10-30T00:00:00Z', scenario_id: 'tiny',
      engine: 'qaoa_warm_start', execution_type: 'local_python_statevector_simulator', progress_pct: null,
      elapsed_seconds: 1.25, result: null, error: null, error_message: null, result_plan_id: null,
      provenance_badge: 'Preview', metadata: null,
    };
    render(<DiagnosticsView operations={operations({ jobs: [job] })}/>);
    expect(screen.getByText('job-q1')).toBeTruthy();
    expect(screen.getByText('local_python_statevector_simulator')).toBeTruthy();
    expect(screen.getByText('1.25 s')).toBeTruthy();
  });
});
