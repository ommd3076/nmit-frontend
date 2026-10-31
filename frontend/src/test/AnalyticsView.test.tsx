import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { PlanRun, IntelligenceEvidence } from '../types/api';
import { AnalyticsView } from '../features/operations/AnalyticsView';
import type { useOperations } from '../features/operations/useOperations';

type Operations = ReturnType<typeof useOperations>;

const plan: PlanRun = {
  id: 'run-17', scenario_id: 'fixture-17', scenario_name: 'North route', coordinate_system: 'lat_lon',
  status: 'active', engine: 'exact_enumeration', provenance_badge: 'Exact (enumeration)',
  created_at: '2026-10-30T10:00:00Z', total_vehicles: 1, total_stops: 2, completed_stops: 0,
  total_sla_exposure_inr: 1800, assumed_rate_label: 'Assumed rate ₹83/$', objective_cost: '₹12,400',
  validator_result: { passed: true, constraints_checked: ['coverage'], violations: [], evaluated_at: '2026-10-30T10:00:00Z' },
  vehicles: [], routes: [], data_source: 'computed',
};

const evidence: IntelligenceEvidence = {
  model_name: 'local test record', brier_score: 0.18, brier_reduction_pct: null, regret_reduction_pct: null,
  user_claim_verified: false, user_claim_note: 'Not evaluated',
  calibration_points: [{ predicted_prob: 0.2, observed_freq: 0.25, sample_count: 4 }],
  benchmarks: [{ engine: 'exact_enumeration', provenance: 'Exact (enumeration)', gap_to_optimum_pct: 0, feasibility_pct: 100, runtime_seconds: 0.02, objective_cost: '₹12,400' }],
  quantum_circuit_summary: { type: 'unavailable', qubits: null, backend_mode: 'not run', execution_badge: 'Preview' },
  disclaimer: 'Test fixture only',
};

function operations(overrides: Partial<Operations> = {}): Operations {
  return {
    health: { status: 'healthy', backend_url: '', version: '', timestamp: '', capacity: null, engines_available: [] },
    plans: [], jobs: [], drivers: null, audits: [], evidence: null, error: '', busy: false,
    lastSync: null, refresh: () => {}, ...overrides,
  } as Operations;
}

describe('AnalyticsView', () => {
  it('shows only returned plan, model and runtime evidence with explicit units', () => {
    render(<AnalyticsView operations={operations({ plans: [plan], evidence, jobs: [{
      id: 'job-23', scenario_id: 'fixture-17', status: 'succeeded', progress_pct: null, elapsed_seconds: 1.25,
      engine: 'exact_enumeration', provenance_badge: 'Exact (enumeration)', result_plan_id: plan.id,
      error_message: null, submitted_at: '2026-10-30T10:00:00Z', execution_type: 'local', result: null, error: null, metadata: null,
    }] })}/>);

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getAllByText('₹1,800')).toHaveLength(2);
    expect(screen.getByText('₹12,400')).toBeInTheDocument();
    expect(screen.getByText('1.25 s')).toBeInTheDocument();
    expect(screen.getByText('0.18')).toBeInTheDocument();
    expect(screen.getByText('local test record')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /recorded sla exposure by plan, values in indian rupees/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /recorded benchmark gap to optimum by engine/i })).toBeInTheDocument();
  });

  it('shows honest empty states rather than substituting sample metrics', () => {
    render(<AnalyticsView operations={operations()}/>);

    expect(screen.getAllByText('No plan records supplied')).toHaveLength(2);
    expect(screen.getByText('No rupee-denominated objective costs recorded')).toBeInTheDocument();
    expect(screen.getByText('Model evidence unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('₹1,800')).not.toBeInTheDocument();
  });

  it('does not chart objective costs without an explicit INR denomination', () => {
    render(<AnalyticsView operations={operations({ plans: [{ ...plan, objective_cost: '12400' }] })}/>);

    const costPanel = screen.getByText('No rupee-denominated objective costs recorded').closest('section');
    expect(costPanel).not.toBeNull();
    expect(within(costPanel as HTMLElement).getByText(/explicitly labelled ₹ or INR/i)).toBeInTheDocument();
  });
});
