import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dispatchApi, type DispatcherState } from '../../api/dispatch';
import { RouteComparisonView } from './RouteComparisonView';
import type { useOperations } from './useOperations';

vi.mock('../../api/dispatch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/dispatch')>();
  return { ...actual, dispatchApi: { ...actual.dispatchApi, approve: vi.fn() } };
});

const operations = {
  busy: false,
  drivers: {
    actor: 'dispatcher',
    states: [{
      driver_id: 'driver-a', vehicle_id: 'van-1', route_id: 'route-current', corridor_id: 'north',
      route_version: 4, manifest_revision: 2, status: 'active', estimated_duration_seconds: 1800,
      estimated_distance_metres: 9000, last_ack_version: 4, last_ack_at: null, updated_at: '2026-10-30T00:00:00Z',
      active_overlays: {}, stops: [], geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[77.1, 28.5], [77.2, 28.6]] }, properties: {} },
    }],
    proposals: [{
      id: 'proposal-1', proposal_id: 'proposal-1', driver_id: 'driver-a', vehicle_id: 'van-1', status: 'pending', base_route_version: 4,
      proposal: {
        current_route_id: 'route-current', proposed_route_id: 'route-bypass', current_duration_seconds: 1800,
        proposed_duration_seconds: 1500, time_saved_seconds: 300,
        proposed_route_geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[77.1, 28.5], [77.18, 28.62]] }, properties: {} },
      },
    }],
  } as DispatcherState,
  refresh: vi.fn().mockResolvedValue(undefined),
} as unknown as ReturnType<typeof useOperations>;

describe('RouteComparisonView', () => {
  it('compares only supplied metrics, overlays supplied geometry, and requires explicit approval confirmation', async () => {
    vi.mocked(dispatchApi.approve).mockResolvedValue({} as never);
    render(<RouteComparisonView operations={operations} />);

    expect(screen.getByText('30.0 min')).toBeTruthy();
    expect(screen.getByText('25.0 min')).toBeTruthy();
    expect(screen.getByText('5.0 min shorter')).toBeTruthy();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('img', { name: /current and candidate route geometry/i })).toBeTruthy();
    expect(dispatchApi.approve).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /review approval/i }));
    expect(screen.getByRole('dialog', { name: /confirm route approval/i })).toBeTruthy();
    expect(dispatchApi.approve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish/i }));
    await waitFor(() => expect(dispatchApi.approve).toHaveBeenCalledWith('proposal-1'));
    await waitFor(() => expect(operations.refresh).toHaveBeenCalled());
  });

  it('shows a truthful empty state without pending backend proposals', () => {
    const empty = { ...operations, drivers: { ...operations.drivers!, proposals: [] } } as ReturnType<typeof useOperations>;
    render(<RouteComparisonView operations={empty} />);
    expect(screen.getByText('No pending route proposals')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /confirm & publish/i })).toBeNull();
  });

  it('does not bridge malformed coordinates into a misleading route line', () => {
    const data = {
      ...operations,
      drivers: {
        ...operations.drivers!,
        proposals: operations.drivers!.proposals.map((proposal) => ({
          ...proposal,
          proposal: {
            ...(proposal.proposal as Record<string, unknown>),
            proposed_route_geojson: { geometry: { coordinates: [[77.1, 28.5], [999, 100], [77.2, 28.6]] } },
          },
        })),
      },
    } as ReturnType<typeof useOperations>;
    render(<RouteComparisonView operations={data} />);
    expect(screen.getByText('Route overlay unavailable')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /current and candidate route geometry/i })).toBeNull();
  });
});
