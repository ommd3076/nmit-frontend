import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataBadge } from '../components/ui/DataBadge';
import { HealthPill } from '../components/ui/HealthPill';
import { StopDrawer } from '../components/stops/StopDrawer';
import { RouteMap } from '../components/map/RouteMap';
import { CommandCenterView } from '../features/dashboard/CommandCenterView';
import { FleetOperationsView } from '../features/fleet/FleetOperationsView';
import { SlaRiskView } from '../features/risk/SlaRiskView';
import { DispatchPlanningView } from '../features/dispatch/DispatchPlanningView';
import { BENGALURU_SCENARIO, SOLOMON_SCENARIO, DEFAULT_HEALTH } from '../data/mockScenarios';

describe('DataBadge UI Component', () => {
  it('renders Validated sentence-case badge', () => {
    render(<DataBadge badge="Validated" />);
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('renders QpiAI Opt local solver badge', () => {
    render(<DataBadge badge="QpiAI Opt · local solver" />);
    expect(screen.getByText('QpiAI Opt · local solver')).toBeInTheDocument();
  });

  it('renders VQC local statevector badge', () => {
    render(<DataBadge badge="VQC · local statevector" />);
    expect(screen.getByText('VQC · local statevector')).toBeInTheDocument();
  });

  it('renders Simulated held-out run badge', () => {
    render(<DataBadge badge="Simulated · held-out run" />);
    expect(screen.getByText('Simulated · held-out run')).toBeInTheDocument();
  });
});

describe('HealthPill UI Component', () => {
  it('renders active solvers slot capacity', () => {
    render(<HealthPill health={DEFAULT_HEALTH} />);
    expect(screen.getByText(/2 Solvers/)).toBeInTheDocument();
  });
});

describe('StopDrawer Component', () => {
  it('renders stop commitment window and simulated ETA interval', () => {
    const stop = BENGALURU_SCENARIO.routes[0].stops[0];
    const vehicle = BENGALURU_SCENARIO.vehicles[0];

    render(
      <StopDrawer
        stop={stop}
        vehicle={vehicle}
        onClose={() => {}}
        onTriggerReplan={() => {}}
      />
    );

    expect(screen.getByText(stop.customer_name)).toBeInTheDocument();
    expect(screen.getByText(`${stop.window_start} – ${stop.window_end}`)).toBeInTheDocument();
    expect(screen.getByText(`${stop.eta_min} – ${stop.eta_max}`)).toBeInTheDocument();
    expect(screen.getByText(/simulated interval/i)).toBeInTheDocument();
    expect(screen.getByText(/assumed rate ₹83\/\$/i)).toBeInTheDocument();
  });

  it('renders replan action and triggers onTriggerReplan', () => {
    const atRiskStop = BENGALURU_SCENARIO.routes[0].stops.find((s) => !s.is_completed) || BENGALURU_SCENARIO.routes[0].stops[3];
    const vehicle = BENGALURU_SCENARIO.vehicles[0];
    const handleReplan = vi.fn();

    render(
      <StopDrawer
        stop={atRiskStop}
        vehicle={vehicle}
        onClose={() => {}}
        onTriggerReplan={handleReplan}
      />
    );

    const replanBtn = screen.getByRole('button', { name: /Trigger Mid-Shift Re-Plan/i });
    expect(replanBtn).toBeInTheDocument();
    fireEvent.click(replanBtn);
    expect(handleReplan).toHaveBeenCalledWith(atRiskStop.id, atRiskStop.vehicle_id);
  });
});

describe('RouteMap Component (SVG Cartesian Benchmark)', () => {
  it('renders the Cartesian depot and lets a dispatcher select an ordered stop and vehicle', () => {
    const handleSelectVehicle = vi.fn();
    const handleSelectStop = vi.fn();

    render(
      <RouteMap
        plan={SOLOMON_SCENARIO}
        selectedVehicleId={null}
        selectedStopId={null}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
      />
    );

    expect(screen.getByText(/Solomon Euclidean Metric Space/i)).toBeInTheDocument();
    expect(SOLOMON_SCENARIO.routes[0].geometry_coordinates[0]).toEqual([40, 50]);
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('DEPOT')).toBeInTheDocument();

    const route = SOLOMON_SCENARIO.routes[0];
    const vehicle = SOLOMON_SCENARIO.vehicles.find((item) => item.id === route.vehicle_id)!;
    const stop = route.stops.slice().sort((a, b) => a.sequence_idx - b.sequence_idx)[0];
    fireEvent.click(screen.getByRole('button', { name: (name) => name.startsWith(`Stop ${stop.sequence_idx}, ${stop.customer_name}`) }));
    expect(handleSelectStop).toHaveBeenCalledWith(stop.id);
    expect(handleSelectVehicle).toHaveBeenCalledWith(vehicle.id);

    const routeLabel = `${vehicle.callsign.split('-').slice(0, 2).join('-')}(${route.stops.length})`;
    const routeButton = screen.getAllByRole('button').find((button) => button.textContent?.replace(/\s+/g, ' ').trim() === routeLabel);
    expect(routeButton).toBeDefined();
    fireEvent.click(routeButton!);
    expect(handleSelectVehicle).toHaveBeenLastCalledWith(vehicle.id);
  });
});

describe('Bengaluru Dispatch Route Geometry & Alignment', () => {
  const DEPOT_LNG = 77.6300;
  const DEPOT_LAT = 12.9800;

  it('ensures all 4 routes originate and terminate at Central Hub ([77.63, 12.98])', () => {
    expect(BENGALURU_SCENARIO.routes.length).toBe(4);

    BENGALURU_SCENARIO.routes.forEach((route) => {
      const coords = route.geometry_coordinates;
      expect(coords.length).toBeGreaterThan(6);

      // Origin
      const [startLng, startLat] = coords[0];
      expect(startLng).toBeCloseTo(DEPOT_LNG, 4);
      expect(startLat).toBeCloseTo(DEPOT_LAT, 4);

      // Return to depot (closed loop)
      const [endLng, endLat] = coords[coords.length - 1];
      expect(endLng).toBeCloseTo(DEPOT_LNG, 4);
      expect(endLat).toBeCloseTo(DEPOT_LAT, 4);
    });
  });

  it('ensures every stop is traversed in exact sequential order along the route polyline', () => {
    BENGALURU_SCENARIO.routes.forEach((route) => {
      let lastFoundIndex = -1;

      route.stops.forEach((stop, idx) => {
        const stopIndexInRoute = route.geometry_coordinates.findIndex(
          ([lng, lat]) => Math.abs(lng - stop.lng!) < 1e-4 && Math.abs(lat - stop.lat!) < 1e-4
        );

        expect(stopIndexInRoute).toBeGreaterThan(-1); // Stop is directly on the polyline
        expect(stopIndexInRoute).toBeGreaterThan(lastFoundIndex); // Stops appear in strictly sequential order
        lastFoundIndex = stopIndexInRoute;
        expect(stop.sequence_idx).toBe(idx + 1);
      });
    });
  });

  it('ensures all vehicle live telemetry coordinates sit directly along their corridor polylines', () => {
    BENGALURU_SCENARIO.vehicles.forEach((veh) => {
      const route = BENGALURU_SCENARIO.routes.find((r) => r.id === veh.route_id);
      expect(route).toBeDefined();

      const vehIndexInRoute = route!.geometry_coordinates.findIndex(
        ([lng, lat]) => Math.abs(lng - veh.current_lng!) < 1e-4 && Math.abs(lat - veh.current_lat!) < 1e-4
      );

      expect(vehIndexInRoute).toBeGreaterThan(-1); // Vehicle is directly on a corridor waypoint
    });
  });

  it('renders geographic coordinates in the SVG fallback with active route selection', () => {
    const handleSelectVehicle = vi.fn();
    const handleSelectStop = vi.fn();

    render(
      <RouteMap
        plan={BENGALURU_SCENARIO}
        selectedVehicleId={null}
        selectedStopId={null}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
      />
    );

    expect(screen.getByText(BENGALURU_SCENARIO.scenario_name)).toBeInTheDocument();
    expect(screen.getByText(/Active Routes \(4\)/i)).toBeInTheDocument();

    const firstRoute = BENGALURU_SCENARIO.routes[0];
    const vehicle = BENGALURU_SCENARIO.vehicles.find((item) => item.id === firstRoute.vehicle_id)!;
    const routeLabel = `${vehicle.callsign.split('-').slice(0, 2).join('-')}(${firstRoute.stops.length})`;
    fireEvent.click(screen.getByRole('button', { name: routeLabel }));
    expect(handleSelectVehicle).toHaveBeenCalledWith(vehicle.id);

    const stop = firstRoute.stops.slice().sort((a, b) => a.sequence_idx - b.sequence_idx)[0];
    fireEvent.click(screen.getByRole('button', { name: (name) => name.startsWith(`Stop ${stop.sequence_idx}, ${stop.customer_name}`) }));
    expect(handleSelectStop).toHaveBeenCalledWith(stop.id);
    expect(handleSelectVehicle).toHaveBeenLastCalledWith(vehicle.id);

    const svg = document.querySelector('svg polyline[points]');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('points')).not.toMatch(/NaN|Infinity/);
  });
});

describe('CommandCenterView Component', () => {
  it('renders operational metrics and ordered stop itinerary', () => {
    const handleReplan = vi.fn();
    const handleSelectStop = vi.fn();

    render(
      <CommandCenterView
        plan={BENGALURU_SCENARIO}
        selectedVehicleId={BENGALURU_SCENARIO.vehicles[0].id}
        selectedStopId={null}
        onSelectVehicle={() => {}}
        onSelectStop={handleSelectStop}
        onTriggerReplan={handleReplan}
      />
    );

    expect(screen.getAllByText(BENGALURU_SCENARIO.scenario_name)).toHaveLength(2);
    expect(screen.getByText(/Fleet In-Field/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA Exposure/i)).toBeInTheDocument();
    expect(screen.getByText(BENGALURU_SCENARIO.vehicles[0].callsign)).toBeInTheDocument();
  });

  it('filters ordered stops when searchQuery is supplied', () => {
    render(
      <CommandCenterView
        plan={BENGALURU_SCENARIO}
        selectedVehicleId={BENGALURU_SCENARIO.vehicles[0].id}
        selectedStopId={null}
        searchQuery="HealthKart"
        onTriggerReplan={() => {}}
      />
    );

    expect(screen.getByText(/Filtered by: "HealthKart"/i)).toBeInTheDocument();
    expect(screen.getByText(/HealthKart Fulfilment/i)).toBeInTheDocument();
  });
});

describe('FleetOperationsView Component', () => {
  it('filters vehicles by status and allows locating vehicle on command map', () => {
    const handleLocate = vi.fn();

    render(
      <FleetOperationsView
        plan={BENGALURU_SCENARIO}
        onSelectVehicleForMap={handleLocate}
      />
    );

    expect(screen.getByText(/Fleet Operations & Telemetry/i)).toBeInTheDocument();

    // Click vehicle row
    const firstVeh = screen.getByText(BENGALURU_SCENARIO.vehicles[0].callsign);
    fireEvent.click(firstVeh);

    // Click Locate on Map button in drawer
    const locateBtn = screen.getByRole('button', { name: /Locate on Command Center Map/i });
    expect(locateBtn).toBeInTheDocument();
    fireEvent.click(locateBtn);

    expect(handleLocate).toHaveBeenCalledWith(BENGALURU_SCENARIO.vehicles[0].id);
  });
});

describe('SlaRiskView Component', () => {
  it('renders route exposure cards and triggers stop inspection on map', () => {
    const handleInspect = vi.fn();

    render(
      <SlaRiskView
        plan={BENGALURU_SCENARIO}
        onInspectStop={handleInspect}
      />
    );

    expect(screen.getByText(/SLA Violation Risk & Contractual Exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Financial Exposure/i)).toBeInTheDocument();

    // Inspect buttons should exist for at-risk commitments
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
    expect(inspectButtons.length).toBeGreaterThan(0);

    fireEvent.click(inspectButtons[0]);
    expect(handleInspect).toHaveBeenCalled();
  });
});

describe('DispatchPlanningView Component', () => {
  it('allows solver architecture selection and publishing candidate manifest', () => {
    const handleUpdate = vi.fn();

    render(
      <DispatchPlanningView
        plan={{ ...BENGALURU_SCENARIO, status: 'draft' }}
        onPlanUpdate={handleUpdate}
      />
    );

    expect(screen.getByText(/Optimization Solver Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/DRAFT CANDIDATE/i)).toBeInTheDocument();

    // Publish Plan to Fleet
    const publishBtn = screen.getByRole('button', { name: /Publish Plan to Fleet/i });
    fireEvent.click(publishBtn);

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });
});
