import { describe, expect, it } from 'vitest';
import type { DriverState } from '../../api/dispatch';
import { driverMapPlan } from './adapter';

const state = (overrides: Partial<DriverState> = {}): DriverState => ({
  driver_id: 'driver-a', vehicle_id: 'vehicle-a', route_id: 'route-a', corridor_id: 'corridor-real',
  route_version: 3, manifest_revision: 4, status: 'delayed', estimated_duration_seconds: 7200,
  estimated_distance_metres: 12500, last_ack_version: 2, last_ack_at: null, updated_at: '2026-10-30T00:00:00Z',
  active_overlays: {}, stops: [
    { id: 'stop-a', sequence: 1, name: 'Customer A', status: 'completed', address: 'Actual address', eta_window: null, coordinates: [77.2, 28.6] },
    { id: 'stop-b', sequence: 2, name: 'Customer B', status: 'en_route', address: null, eta_window: null, coordinates: [NaN, 28.7] },
  ],
  geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[77.2, 28.6], [77.3, 28.7]] }, properties: {} },
  ...overrides,
});

describe('driverMapPlan', () => {
  it('maps route geometry, measured estimates, manifest order, status, and completion from dispatcher payload', () => {
    const plan = driverMapPlan([state()]);
    expect(plan.scenario_id).toBe('corridor-real');
    expect(plan.routes[0]).toMatchObject({ total_distance_km: 12.5, total_duration_minutes: 120, geometry_coordinates: [[77.2, 28.6], [77.3, 28.7]] });
    expect(plan.routes[0].stops.map(({ id, sequence_idx, status, lng, lat }) => ({ id, sequence_idx, status, lng, lat }))).toEqual([
      { id: 'stop-a', sequence_idx: 1, status: 'completed', lng: 77.2, lat: 28.6 },
      { id: 'stop-b', sequence_idx: 2, status: 'en_route', lng: undefined, lat: undefined },
    ]);
    expect(plan.completed_stops).toBe(1);
    expect(plan.vehicles[0].status).toBe('delayed');
  });

  it('marks unavailable measurements as non-numeric and rejects malformed route geometry', () => {
    const plan = driverMapPlan([state({ estimated_distance_metres: NaN, estimated_duration_seconds: Infinity, geojson: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] as unknown as [number, number][] }, properties: {} } })]);
    expect(Number.isNaN(plan.routes[0].total_distance_km)).toBe(true);
    expect(Number.isNaN(plan.routes[0].total_duration_minutes)).toBe(true);
    expect(plan.routes[0].geometry_coordinates).toEqual([]);
    expect(Number.isNaN(plan.total_sla_exposure_inr)).toBe(true);
    expect(Number.isNaN(plan.routes[0].stops[0].demand_kg)).toBe(true);
  });
});
