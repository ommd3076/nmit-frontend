import type { DriverState } from '../../api/dispatch';
import type { PlanRun, Route, Stop, Vehicle } from '../../types/api';

const COLORS = ['#c56535', '#527f90', '#50836b', '#b28b38'];
const unavailable = Number.NaN;
const isCoordinate = (value: unknown): value is [number, number] => Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
const statusFromDispatcher = (status: string): Vehicle['status'] => status as Vehicle['status'];
/** Map-only adapter: unknown operational fields are never used as KPIs or validation proof. */
export function driverMapPlan(states: DriverState[]): PlanRun {
  const routes: Route[] = states.map((state, i) => ({
    id: state.route_id, vehicle_id: state.vehicle_id, color_token: COLORS[i % COLORS.length],
    total_distance_km: Number.isFinite(state.estimated_distance_metres) ? state.estimated_distance_metres / 1000 : unavailable,
    total_duration_minutes: Number.isFinite(state.estimated_duration_seconds) ? state.estimated_duration_seconds / 60 : unavailable,
    geometry_coordinates: state.geojson?.geometry.type === 'LineString' && Array.isArray(state.geojson.geometry.coordinates)
      ? state.geojson.geometry.coordinates.filter(isCoordinate) : [],
    stops: state.stops.map((stop): Stop => ({
      id: stop.id, route_id: state.route_id, vehicle_id: state.vehicle_id,
      sequence_idx: stop.sequence, customer_name: stop.name, address: stop.address || 'Address unavailable',
      window_start: 'Unavailable', window_end: 'Unavailable', eta_min: 'Unavailable', eta_max: 'Unavailable',
      predicted_late_prob_min: unavailable, predicted_late_prob_max: unavailable, penalty_exposure_inr: unavailable, penalty_exposure_usd: unavailable,
      demand_kg: unavailable, is_locked: false, is_completed: stop.status.toLowerCase() === 'completed', status: stop.status as Stop['status'],
      ...(isCoordinate(stop.coordinates) ? { lng: stop.coordinates[0], lat: stop.coordinates[1] } : {}),
      notes: 'Catalog stop. Demand, service windows, ETA and calibrated risk are unavailable.',
    })),
  }));
  return {
    id: `driver-catalog-${states[0]?.corridor_id || 'unknown'}`, scenario_id: states[0]?.corridor_id || 'unknown', scenario_name: states[0]?.corridor_id || 'Dispatcher corridor',
    coordinate_system: 'lat_lon', status: 'active', engine: 'dispatcher_catalog', provenance_badge: 'Preview',
    created_at: states[0]?.updated_at || '', total_vehicles: states.length,
    total_stops: routes.reduce((n, r) => n + r.stops.length, 0), completed_stops: routes.flatMap((route) => route.stops).filter((stop) => stop.is_completed).length, total_sla_exposure_inr: unavailable,
    assumed_rate_label: 'Financial terms unavailable',
    validator_result: { passed: false, constraints_checked: [], violations: ['Dispatcher catalog data is not full dispatch feasibility proof.'], evaluated_at: '' },
    routes, vehicles: states.map((state) => ({
      id: state.vehicle_id, callsign: state.vehicle_id, driver_name: state.driver_id,
      phone: '', status: statusFromDispatcher(state.status), vehicle_type: 'Unavailable', battery_or_fuel_pct: unavailable, capacity_kg: unavailable, used_capacity_kg: unavailable,
      route_id: state.route_id, last_ping_iso: state.updated_at, eta_deviation_minutes: unavailable,
      assigned_stops_count: state.stops.length, completed_stops_count: state.stops.filter((stop) => stop.status.toLowerCase() === 'completed').length,
    })),
  };
}
