import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { PlanRun } from '../../types/api';
import { AlertCircle, Compass, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { boundsForLngLat, createSquareProjector, projectLngLatToLocal, isValidLngLatBounds } from './geometry';

interface RouteMapProps {
  plan: PlanRun;
  selectedVehicleId: string | null;
  selectedStopId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectStop: (stopId: string) => void;
  className?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  plan,
  selectedVehicleId,
  selectedStopId,
  onSelectVehicle,
  onSelectStop,
  className = ''
}) => {
  const isCartesian = plan.coordinate_system === 'cartesian_xy';
  const isValidGeoPoint = (point: readonly number[]) => point.length >= 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90;
  const isRenderablePoint = (point: readonly number[]) => isCartesian
    ? point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
    : isValidGeoPoint(point);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [tileFailedPlanId, setTileFailedPlanId] = useState<string | null>(null);
  const tileError = tileFailedPlanId === plan.id;
  const [webglFailed, setWebglFailed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return !(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      return true;
    }
  });

  // Callbacks and plan in refs to prevent map unmounting on parent state update
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const onSelectStopRef = useRef(onSelectStop);
  const planRef = useRef(plan);

  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle;
    onSelectStopRef.current = onSelectStop;
    planRef.current = plan;
  }, [onSelectVehicle, onSelectStop, plan]);

  // SVG Pan & Zoom state for Euclidean & SVG basemaps
  const [svgZoom, setSvgZoom] = useState<number>(1);
  const [svgPan, setSvgPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [svgResetSelection, setSvgResetSelection] = useState<{ planId: string; vehicleId: string | null; stopId: string | null } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // -------------------------------------------------------------
  // MAPLIBRE GL JS INITIALIZATION (For Real-World Lat/Lon)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isCartesian || webglFailed || tileError || !mapContainerRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const currentPlan = planRef.current;
    const routeCoords = currentPlan.routes.flatMap((route) => route.geometry_coordinates).filter(isValidGeoPoint) as [number, number][];
    const featureCoords: [number, number][] = [
      ...routeCoords,
      ...currentPlan.routes.flatMap(route => route.stops.flatMap(stop => {
        const point: [number, number] = [stop.lng!, stop.lat!];
        return isValidGeoPoint(point) ? [point] : [];
      })),
      ...currentPlan.vehicles.flatMap(vehicle => {
        const point: [number, number] = [vehicle.current_lng!, vehicle.current_lat!];
        return isValidGeoPoint(point) ? [point] : [];
      })
    ];
    const extent = boundsForLngLat(featureCoords) ?? (isValidLngLatBounds(currentPlan.bounds) ? currentPlan.bounds : null);
    if (!extent) {
      queueMicrotask(() => setTileFailedPlanId(currentPlan.id));
      return;
    }
    const centerLng = (extent[0][0] + extent[1][0]) / 2;
    const centerLat = (extent[0][1] + extent[1][1]) / 2;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        // Keep the style itself local so slow/unavailable style hosting cannot
        // block route layers. Raster tiles may fail independently; route lines
        // and markers are added on `style.load` and remain visible over the base.
        style: {
          version: 8,
          sources: {
            openstreetmap: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            }
          },
          layers: [
            { id: 'map-background', type: 'background', paint: { 'background-color': '#F6F8F5' } },
            { id: 'openstreetmap-raster', type: 'raster', source: 'openstreetmap', paint: { 'raster-opacity': 0.9 } }
          ]
        },
        center: [centerLng, centerLat],
        zoom: 11.5,
        minZoom: 9.0, // Prevents zooming out to outer space / world view
        maxZoom: 18.0,
        renderWorldCopies: false, // Prevents duplicated world wraps on zoom out
        maxBounds: extent,
        attributionControl: false
      });
      // Attach to window for testing/debugging
      if (typeof window !== 'undefined') {
        (window as any)._mapInstance = map;
      }
    } catch {
      queueMicrotask(() => {
        setWebglFailed(true);
        setTileFailedPlanId(currentPlan.id);
      });
      return;
    }

    // Add controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // A style request can stall without emitting a useful MapLibre error.
    // Fall back to the deterministic SVG route plot instead of leaving a blank map.
    let styleLoaded = false;
    const styleLoadTimeout = window.setTimeout(() => {
      if (!styleLoaded) setTileFailedPlanId(currentPlan.id);
    }, 5000);

    let consecutiveTileErrors = 0;
    map.on('error', (e: any) => {
      // Aborted tiles during fast zoom-out or pan are normal network cancellations, not fatal
      const message = String(e.error?.message ?? e.message ?? '').toLowerCase();
      if (message.includes('aborted') || e.error?.name === 'AbortError') {
        return;
      }
      if (e.sourceId === 'openstreetmap' || message.includes('tile') || (e as any).status >= 400 || message.includes('failed to fetch')) {
        consecutiveTileErrors += 1;
        if (consecutiveTileErrors >= 2) {
          setTileFailedPlanId(currentPlan.id);
        }
      }
    });

    map.on('style.load', () => {
      styleLoaded = true;
      window.clearTimeout(styleLoadTimeout);
      // 1. Add route polyline sources and layers
      currentPlan.routes.forEach((route) => {
        const sourceId = `route-source-${route.id}`;
        const coordinates = route.geometry_coordinates.filter(isValidGeoPoint);
        if (coordinates.length < 2) return;
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              route_id: route.id,
              color: route.color_token
            },
            geometry: {
              type: 'LineString',
              coordinates
            }
          }
        });

        // Background casing line
        map.addLayer({
          id: `route-casing-${route.id}`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 7,
            'line-opacity': 0.8
          }
        });

        // Core colored route line
        map.addLayer({
          id: `route-line-${route.id}`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': route.color_token || '#2F5BEA',
            'line-width': 4,
            'line-opacity': 0.95
          }
        });
      });

      // 2. Add Stop Markers to MapLibre (Strictly vector SVG, no emojis)
      currentPlan.routes.forEach((route) => {
        route.stops.slice().sort((a, b) => a.sequence_idx - b.sequence_idx).forEach((stop) => {
          if (!isValidGeoPoint([stop.lng!, stop.lat!])) return;

          const isAtRisk = stop.status === 'at_risk' || (stop.predicted_late_prob_max || 0) > 0.4;

          const el = document.createElement('div');
          el.className = 'arq-stop-marker cursor-pointer transition-transform hover:scale-115 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 select-none';
          el.dataset.stopId = stop.id;
          el.title = `${stop.customer_name} (${stop.window_start} - ${stop.window_end})`;
          el.setAttribute('role', 'button');
          el.tabIndex = 0;
          el.setAttribute('aria-label', `Stop ${stop.sequence_idx}, ${stop.customer_name}${isAtRisk ? ', at risk' : ''}${stop.is_locked ? ', locked' : ''}`);
          el.style.minWidth = '44px';
          el.style.minHeight = '44px';
          el.style.display = 'grid';
          el.style.placeItems = 'center';

          let bgColor = route.color_token || '#2F5BEA';
          if (stop.is_completed) bgColor = '#205A46';
          else if (isAtRisk) bgColor = '#C6534C';

          const lockSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

          el.innerHTML = `
            <div class="arq-stop-badge" style="
              position: relative;
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background-color: ${bgColor};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              font-family: inherit;
              font-variant-numeric: tabular-nums;
              border: 2px solid #FFFFFF;
              box-shadow: 0 1px 4px rgba(16, 24, 40, 0.25);
            ">
              ${stop.is_locked ? lockSvg : stop.sequence_idx}
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectStopRef.current(stop.id);
            onSelectVehicleRef.current(stop.vehicle_id);
          });
          el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectStopRef.current(stop.id);
              onSelectVehicleRef.current(stop.vehicle_id);
            }
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng!, stop.lat!])
            .addTo(map);

          markersRef.current.push(marker);
        });
      });

      // 3. Add Vehicle Position Markers to MapLibre (Vector truck glyph, no emojis)
      currentPlan.vehicles.forEach((veh) => {
        if (!isValidGeoPoint([veh.current_lng!, veh.current_lat!])) return;

        const vEl = document.createElement('div');
        vEl.className = 'arq-vehicle-marker cursor-pointer transition-transform hover:scale-110 select-none';
        vEl.setAttribute('role', 'button');
        vEl.tabIndex = 0;
        vEl.setAttribute('aria-label', `Vehicle ${veh.callsign}`);
        vEl.dataset.vehicleId = veh.id;
        vEl.title = `${veh.callsign} (${veh.driver_name}) - ${veh.battery_or_fuel_pct}% Batt`;
        const vehicleColor = currentPlan.routes.find(route => route.vehicle_id === veh.id)?.color_token || ['#B4532A', '#2F5BEA', '#45816C', '#8D5CA6'][currentPlan.vehicles.indexOf(veh) % 4];

        const truckSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8DBC9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

        vEl.innerHTML = `
          <div class="arq-veh-badge" style="
            background: ${vehicleColor};
            color: #FFFFFF;
            padding: 2px 7px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            font-family: inherit;
            font-variant-numeric: tabular-nums;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(16, 24, 40, 0.35);
          ">
            ${truckSvg}
            <span>${veh.callsign.split('-').slice(0, 2).join('-')}</span>
          </div>
        `;

        vEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicleRef.current(veh.id);
        });
        vEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectVehicleRef.current(veh.id);
          }
        });

        const vMarker = new maplibregl.Marker({ element: vEl })
          .setLngLat([veh.current_lng!, veh.current_lat!])
          .addTo(map);

        markersRef.current.push(vMarker);
      });

      // Fit the observed route, stops and vehicle positions.
      if (extent) {
        map.fitBounds(extent, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 13,
          duration: 1000
        });
      }
    });

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.clearTimeout(styleLoadTimeout);
      resizeObserver.disconnect();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
      if (typeof window !== 'undefined') {
        delete (window as any)._mapInstance;
      }
    };
  }, [isCartesian, webglFailed, tileError, plan.id, plan.routes, plan.vehicles, plan.bounds]);

  // Update selection focus and dynamic route emphasis on MapLibre without destroying the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isCartesian || webglFailed || tileError) return;

    // Emphasize selected route, dim unselected routes
    plan.routes.forEach((route) => {
      const lineLayerId = `route-line-${route.id}`;
      const casingLayerId = `route-casing-${route.id}`;
      if (map.getLayer(lineLayerId)) {
        if (selectedVehicleId) {
          const isSelected = route.vehicle_id === selectedVehicleId;
          map.setPaintProperty(lineLayerId, 'line-width', isSelected ? 6 : 3);
          map.setPaintProperty(lineLayerId, 'line-opacity', isSelected ? 1.0 : 0.25);
          if (map.getLayer(casingLayerId)) {
            map.setPaintProperty(casingLayerId, 'line-width', isSelected ? 9 : 4);
            map.setPaintProperty(casingLayerId, 'line-opacity', isSelected ? 0.9 : 0.2);
          }
        } else {
          map.setPaintProperty(lineLayerId, 'line-width', 4);
          map.setPaintProperty(lineLayerId, 'line-opacity', 0.95);
          if (map.getLayer(casingLayerId)) {
            map.setPaintProperty(casingLayerId, 'line-width', 7);
            map.setPaintProperty(casingLayerId, 'line-opacity', 0.85);
          }
        }
      }
    });

    // Update marker outline states via DOM without recreating markers
    const container = mapContainerRef.current;
    if (container) {
      container.querySelectorAll<HTMLElement>('.arq-stop-marker').forEach((el) => {
        const badge = el.querySelector<HTMLElement>('.arq-stop-badge');
        if (badge) {
          if (el.dataset.stopId === selectedStopId) {
            badge.style.outline = '3px solid #17231F';
            badge.style.outlineOffset = '2px';
          } else {
            badge.style.outline = 'none';
          }
        }
      });

      container.querySelectorAll<HTMLElement>('.arq-vehicle-marker').forEach((el) => {
        const badge = el.querySelector<HTMLElement>('.arq-veh-badge');
        if (badge) {
          if (el.dataset.vehicleId === selectedVehicleId) {
            badge.style.outline = '3px solid #205A46';
            badge.style.outlineOffset = '1px';
          } else {
            badge.style.outline = 'none';
          }
        }
      });
    }

    // Selection may arrive before MapLibre's first load. Apply focus after the
    // initial full-plan fit so the load handler cannot undo the selected view.
    const focusSelection = () => {
      if (selectedStopId) {
        const selectedStop = plan.routes.flatMap((route) => route.stops).find((stop) => stop.id === selectedStopId);
        if (selectedStop && isValidGeoPoint([selectedStop.lng!, selectedStop.lat!])) {
          map.easeTo({ center: [selectedStop.lng!, selectedStop.lat!], zoom: 14, duration: 500 });
        }
      } else if (selectedVehicleId) {
        const v = plan.vehicles.find(veh => veh.id === selectedVehicleId);
        const route = plan.routes.find(candidate => candidate.vehicle_id === selectedVehicleId);
        const routePoints = [
          ...(route?.geometry_coordinates ?? []),
          ...(route?.stops.flatMap(stop => isValidGeoPoint([stop.lng!, stop.lat!]) ? [[stop.lng!, stop.lat!] as [number, number]] : []) ?? []),
          ...(v && isValidGeoPoint([v.current_lng!, v.current_lat!]) ? [[v.current_lng!, v.current_lat!] as [number, number]] : [])
        ].filter(isValidGeoPoint);
        const routeBounds = boundsForLngLat(routePoints);
        if (routeBounds) map.fitBounds(routeBounds, { padding: 70, maxZoom: 14, duration: 700 });
      }
    };
    if (map.isStyleLoaded()) focusSelection();
    else map.once('style.load', focusSelection);
  }, [selectedVehicleId, selectedStopId, isCartesian, webglFailed, tileError, plan.routes, plan.vehicles]);

  // Unified Zoom and Reset Handlers
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current && !isCartesian && !webglFailed && !tileError) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    } else {
      setSvgZoom((prev) => Math.min(prev + 0.25, 2.5));
    }
  }, [isCartesian, webglFailed, tileError]);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current && !isCartesian && !webglFailed && !tileError) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    } else {
      setSvgZoom((prev) => Math.max(prev - 0.25, 0.6));
    }
  }, [isCartesian, webglFailed, tileError]);

  const handleResetBounds = useCallback(() => {
    const fullBounds = boundsForLngLat([
      ...plan.routes.flatMap(route => route.geometry_coordinates.filter(isValidGeoPoint)),
      ...plan.routes.flatMap(route => route.stops.flatMap(stop => isValidGeoPoint([stop.lng!, stop.lat!]) ? [[stop.lng!, stop.lat!] as [number, number]] : [])),
      ...plan.vehicles.flatMap(vehicle => isValidGeoPoint([vehicle.current_lng!, vehicle.current_lat!]) ? [[vehicle.current_lng!, vehicle.current_lat!] as [number, number]] : [])
    ]);
    if (mapInstanceRef.current && fullBounds && !isCartesian && !webglFailed && !tileError) {
      mapInstanceRef.current.fitBounds(fullBounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 13,
        duration: 800
      });
    }
    setSvgZoom(1);
    setSvgPan({ x: 0, y: 0 });
    setSvgResetSelection({ planId: plan.id, vehicleId: selectedVehicleId, stopId: selectedStopId });
  }, [isCartesian, webglFailed, tileError, plan.id, plan.routes, plan.vehicles, selectedVehicleId, selectedStopId]);

  // -------------------------------------------------------------
  // RENDERER B: HIGH-FIDELITY ARCHITECTURAL SVG CANVAS
  // (Solomon Euclidean Metric Space & WebGL Fallback)
  // -------------------------------------------------------------
  if (isCartesian || webglFailed || tileError) {
    const points = [
      ...plan.routes.flatMap((route) => route.geometry_coordinates.filter(isRenderablePoint)),
      ...plan.routes.flatMap((route) => route.stops.flatMap((stop) => {
        const x = isCartesian ? stop.x : stop.lng;
        const y = isCartesian ? stop.y : stop.lat;
        return isRenderablePoint([x!, y!]) ? [[x!, y!] as const] : [];
      })),
      ...plan.vehicles.flatMap((vehicle) => {
        const x = isCartesian ? vehicle.current_x : vehicle.current_lng;
        const y = isCartesian ? vehicle.current_y : vehicle.current_lat;
        return isRenderablePoint([x!, y!]) ? [[x!, y!] as const] : [];
      })
    ];
    const meanLatitude = isCartesian || points.length === 0 ? 0 : points.reduce((sum, [, lat]) => sum + lat, 0) / points.length;
    const projectedPoints = isCartesian ? points : projectLngLatToLocal(points, meanLatitude);
    const projector = createSquareProjector(projectedPoints);
    const projectCoord = (coordX: number, coordY: number): [number, number] => projector.project(
      isCartesian ? [coordX, coordY] : projectLngLatToLocal([[coordX, coordY]], meanLatitude)[0]
    );
    const focusStop = plan.routes.flatMap((route) => route.stops).find((stop) => stop.id === selectedStopId);
    const focusRoute = focusStop
      ? plan.routes.find((route) => route.stops.some((stop) => stop.id === focusStop.id))
      : plan.routes.find((route) => route.vehicle_id === selectedVehicleId);
    const focusCoordinates: [number, number][] = focusStop
      ? [[isCartesian ? focusStop.x! : focusStop.lng!, isCartesian ? focusStop.y! : focusStop.lat!]]
      : focusRoute
        ? [
          ...focusRoute.geometry_coordinates,
          ...focusRoute.stops.map((stop) => [isCartesian ? stop.x! : stop.lng!, isCartesian ? stop.y! : stop.lat!] as [number, number]),
          ...plan.vehicles.filter((vehicle) => vehicle.id === focusRoute.vehicle_id).map((vehicle) => [isCartesian ? vehicle.current_x! : vehicle.current_lng!, isCartesian ? vehicle.current_y! : vehicle.current_lat!] as [number, number])
        ]
        : [];
    const resetMatchesSelection = svgResetSelection?.planId === plan.id && svgResetSelection?.vehicleId === selectedVehicleId && svgResetSelection?.stopId === selectedStopId;
    const projectedFocus = !resetMatchesSelection && (focusStop || focusRoute)
      ? focusCoordinates.filter(isRenderablePoint).map(([x, y]) => projectCoord(x, y))
      : [];
    const focusViewBox = projectedFocus.length
      ? (() => {
        const xs = projectedFocus.map(([x]) => x);
        const ys = projectedFocus.map(([, y]) => y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = Math.max(maxX - minX, maxY - minY) * 0.12 + 2;
        return `${minX - pad} ${minY - pad} ${Math.max(maxX - minX + pad * 2, 8)} ${Math.max(maxY - minY + pad * 2, 8)}`;
      })()
      : '0 0 100 100';

    return (
      <div className={`relative w-full h-full bg-[#FAFBF9] rounded-3xl overflow-hidden border border-black/5 flex flex-col ${className}`}>
        {/* Top Control Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          <div className="glass-pill px-3 py-1.5 rounded-full text-xs font-semibold text-[#15211D] flex items-center gap-1.5 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-[#205A46]" />
            <span>
              {isCartesian
                ? 'Solomon Euclidean Metric Space'
                : plan.scenario_name}
            </span>
          </div>
        </div>

        {/* Floating Zoom & Reset Toolbar (Polished Glass Surface) */}
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 glass-panel p-1 rounded-2xl shadow-md border border-white/80">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetBounds}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
            title="Reset View Bounds"
            aria-label="Reset View Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Central Map Canvas with fluid drag-pan and centered zoom */}
        <div
          className="flex-1 w-full h-full p-4 flex items-center justify-center overflow-hidden"
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.88;
            setSvgZoom(prev => Math.min(Math.max(prev * factor, 0.6), 2.8));
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              setIsPanning(true);
              panStartRef.current = { x: e.clientX - svgPan.x, y: e.clientY - svgPan.y };
            }
          }}
          onMouseMove={(e) => {
            if (isPanning) {
              setSvgPan({
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y
              });
            }
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          <svg
            data-testid="route-map-geometry"
            viewBox={focusViewBox}
            className="w-full h-full max-h-[720px] select-none transition-transform duration-150 ease-out"
            style={{
              shapeRendering: 'geometricPrecision',
              transformOrigin: '50% 50%',
              transformBox: 'view-box',
              transform: `translate(${svgPan.x}px, ${svgPan.y}px) scale(${svgZoom})`,
              cursor: isPanning ? 'grabbing' : 'grab'
            }}
          >
            {/* Background Grid */}
            <defs>
              <pattern id="arq-svg-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(21, 33, 29, 0.05)" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#arq-svg-grid)" />

            {/* Axis / Coordinate Reference Marks - Stable Architectural Alignment */}
            <text x="3" y="97" fontSize="2.2" fill="#77736D" fontFamily="ui-monospace, monospace" textAnchor="start" dominantBaseline="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? `${projector.bounds.minX.toFixed(1)},${projector.bounds.minY.toFixed(1)}` : 'Route extent'}
            </text>
            <text x="97" y="97" fontSize="2.2" fill="#77736D" fontFamily="ui-monospace, monospace" textAnchor="end" dominantBaseline="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? `${projector.bounds.maxX.toFixed(1)},${projector.bounds.minY.toFixed(1)}` : 'Route extent'}
            </text>
            <text x="3" y="6" fontSize="2.2" fill="#77736D" fontFamily="ui-monospace, monospace" textAnchor="start" dominantBaseline="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? `${projector.bounds.minX.toFixed(1)},${projector.bounds.maxY.toFixed(1)}` : 'Route extent'}
            </text>
            <text x="97" y="6" fontSize="2.2" fill="#77736D" fontFamily="ui-monospace, monospace" textAnchor="end" dominantBaseline="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? `${projector.bounds.maxX.toFixed(1)},${projector.bounds.maxY.toFixed(1)}` : 'Route extent'}
            </text>

            {/* Vehicle Route Polylines */}
            {plan.routes.map((route) => {
              const isRouteSelected = selectedVehicleId === route.vehicle_id;
              const points = route.geometry_coordinates.filter(isRenderablePoint)
                .map(coord => projectCoord(coord[0], coord[1]))
                .map(p => `${p[0]},${p[1]}`)
                .join(' ');

              return (
                <g
                  key={`svg-route-${route.id}`}
                  data-route-id={route.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Route for ${plan.vehicles.find((vehicle) => vehicle.id === route.vehicle_id)?.callsign ?? route.vehicle_id}`}
                  className="cursor-pointer"
                  onClick={() => onSelectVehicle(route.vehicle_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectVehicle(route.vehicle_id);
                    }
                  }}
                >
                  {/* Outer casing */}
                  <polyline
                    data-route-id={route.id}
                    points={points}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={isRouteSelected ? 3.8 : 2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={selectedVehicleId ? (isRouteSelected ? 0.9 : 0.2) : 0.85}
                  />
                  {/* Core polyline */}
                  <polyline
                    data-route-id={route.id}
                    points={points}
                    fill="none"
                    stroke={route.color_token || '#2F5BEA'}
                    strokeWidth={isRouteSelected ? 2.6 : 1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={selectedVehicleId ? (isRouteSelected ? 1 : 0.25) : 0.95}
                  />
                </g>
              );
            })}

            {/* Solomon depot is defined by the benchmark route; geographic depots need source metadata. */}
            {isCartesian && (() => {
              const depot = plan.routes.find((route) => route.geometry_coordinates.length > 0)?.geometry_coordinates[0];
              const depotX = depot?.[0] ?? projector.bounds.minX;
              const depotY = depot?.[1] ?? projector.bounds.minY;
              const [dPosX, dPosY] = projectCoord(depotX, depotY);

              return (
                <g key="svg-depot" transform={`translate(${dPosX}, ${dPosY})`} className="select-none">
                  {/* Outer pulse boundary */}
                  <rect
                    x="-2.8"
                    y="-2.8"
                    width="5.6"
                    height="5.6"
                    rx="1.4"
                    fill="#17231F"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="0.3"
                    fontSize="2.4"
                    fontWeight="800"
                    fill="#A8DBC9"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="inherit"
                  >
                    D
                  </text>
                  <text
                    x="0"
                    y="4.5"
                    fontSize="1.6"
                    fontWeight="700"
                    fill="#17231F"
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fontFamily="inherit"
                  >
                    DEPOT
                  </text>
                </g>
              );
            })()}

            {/* Stop Markers */}
            {plan.routes.map((route) =>
              route.stops.slice().sort((a, b) => a.sequence_idx - b.sequence_idx).map((s) => {
                const sCoordX = isCartesian ? s.x : s.lng;
                const sCoordY = isCartesian ? s.y : s.lat;
                if (!isRenderablePoint([sCoordX!, sCoordY!])) return null;

                const [posX, posY] = projectCoord(sCoordX!, sCoordY!);
                const isSelected = selectedStopId === s.id;
                const isAtRisk = s.status === 'at_risk' || (s.predicted_late_prob_max || 0) > 0.4;

                let fillColor = route.color_token || '#2F5BEA';
                if (s.is_completed) fillColor = '#205A46';
                else if (isAtRisk) fillColor = '#C6534C';

                return (
                  <g
                    key={`svg-stop-${s.id}`}
                    className="cursor-pointer transition-transform hover:scale-125 focus-visible:drop-shadow-[0_0_2px_#17231F]"
                    role="button"
                    tabIndex={0}
                    aria-label={`Stop ${s.sequence_idx}, ${s.customer_name}${isAtRisk ? ', at risk' : ''}${s.is_locked ? ', locked' : ''}`}
                    onClick={() => {
                      onSelectStop(s.id);
                      onSelectVehicle(s.vehicle_id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectStop(s.id);
                        onSelectVehicle(s.vehicle_id);
                      }
                    }}
                  >
                    {/* At risk animated halo ring */}
                    {isAtRisk && (
                      <circle
                        cx={posX}
                        cy={posY}
                        r="3.2"
                        fill="#FFFFFF"
                        stroke="#C6534C"
                        strokeWidth="0.6"
                        strokeDasharray="1.5 1"
                        opacity="0.8"
                      />
                    )}
                    {/* Selected stop halo */}
                    {isSelected && (
                      <circle
                        cx={posX}
                        cy={posY}
                        r="3.4"
                        fill="none"
                        stroke="#17231F"
                        strokeWidth="0.8"
                      />
                    )}
                    {/* Marker circle */}
                    <circle
                      cx={posX}
                      cy={posY}
                      r="2.2"
                      fill={fillColor}
                      stroke="#FFFFFF"
                      strokeWidth="0.6"
                    />
                    {/* Sequence Number or Lock Glyph */}
                    {s.is_locked ? (
                      <path
                        d={`M ${posX - 0.7} ${posY + 0.5} h 1.4 v 0.9 h -1.4 z M ${posX - 0.5} ${posY + 0.5} v -0.6 a 0.5 0.5 0 0 1 1 0 v 0.6`}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="0.3"
                        strokeLinecap="round"
                      />
                    ) : (
                      <text
                        x={posX}
                        y={posY}
                        fontSize="1.6"
                        fontWeight="700"
                        fill="#FFFFFF"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="inherit"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {s.sequence_idx}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Vehicle Current Position Markers */}
            {plan.vehicles.map((v) => {
              const vCoordX = isCartesian ? v.current_x : v.current_lng;
              const vCoordY = isCartesian ? v.current_y : v.current_lat;
              if (!isRenderablePoint([vCoordX!, vCoordY!])) return null;

              const [posX, posY] = projectCoord(vCoordX!, vCoordY!);
              const isVehSelected = selectedVehicleId === v.id;
              const vehicleColor = plan.routes.find(route => route.vehicle_id === v.id)?.color_token || ['#B4532A', '#2F5BEA', '#45816C', '#8D5CA6'][plan.vehicles.indexOf(v) % 4];

              return (
                <g
                  key={`svg-veh-${v.id}`}
                  className="cursor-pointer focus-visible:drop-shadow-[0_0_2px_#17231F]"
                  aria-label={`Vehicle ${v.callsign}`}
                  onClick={() => onSelectVehicle(v.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectVehicle(v.id);
                    }
                  }}
                >
                  <circle
                    cx={posX}
                    cy={posY}
                    r={isVehSelected ? 2.8 : 2.2}
                    fill={vehicleColor}
                    stroke="#FFFFFF"
                    strokeWidth="0.7"
                  />
                  <circle
                    cx={posX}
                    cy={posY}
                    r="1"
                    fill="#A8DBC9"
                  />
                  <g transform={`translate(${posX}, ${posY - 3.4})`}>
                    <rect
                      x="-3.5"
                      y="-1.3"
                      width="7"
                      height="2.6"
                      rx="0.6"
                      fill={vehicleColor}
                      stroke="#FFFFFF"
                      strokeWidth="0.4"
                    />
                    <text
                      x="0"
                      y="0.1"
                      fontSize="1.2"
                      fill="#A8DBC9"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="inherit"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {v.callsign.split('-').slice(0, 2).join('-')}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Route Legend & Vehicle Selector */}
        <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-2xl max-w-sm border border-white/60 text-xs shadow-lg space-y-2">
          <div className="flex items-center justify-between font-semibold text-[#15211D] pb-1 border-b border-black/5">
            <span>Active Routes ({plan.routes.length})</span>
            <span className="text-[11px] text-[#68756F]">
              {isCartesian ? 'Solomon x/y' : (tileError ? 'Offline route view' : 'Local map view')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plan.routes.map((route, i) => {
              const v = plan.vehicles.find(veh => veh.id === route.vehicle_id);
              const isSelected = selectedVehicleId === route.vehicle_id;
              return (
                <button
                  key={route.id}
                  onClick={() => onSelectVehicle(route.vehicle_id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl transition-all font-semibold text-[11px] cursor-pointer interactive-tap ${
                    isSelected
                      ? 'bg-[#17231F] text-white shadow-sm'
                      : 'bg-white/80 hover:bg-white text-[#15211D] border border-black/5'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: route.color_token || '#2F5BEA' }}
                  />
                  <span>{v?.callsign.split('-').slice(0, 2).join('-') || `Van ${i + 1}`}</span>
                  <span className="opacity-75 tabular-nums">({route.stops.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERER A: MAPLIBRE GL JS (For Real-World Lat/Lon when WebGL available)
  // -------------------------------------------------------------
  return (
    <div className={`relative w-full h-full bg-[#F6F8F5] rounded-3xl overflow-hidden border border-black/5 ${className}`}>
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />

      {/* Tile Fallback Warning Banner if tiles fail */}
      {(tileError || webglFailed) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs text-[#9A5B00] border border-[#FBD6B0] shadow-lg">
          <AlertCircle className="w-4 h-4 text-[#D78A45]" />
          <span>Map tiles unavailable — displaying route geometry overlay</span>
        </div>
      )}

      {/* Unified Floating Zoom & Reset Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 glass-panel p-1 rounded-2xl shadow-md border border-white/80">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetBounds}
          className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors cursor-pointer interactive-tap"
          title="Fit Map to All Routes"
          aria-label="Fit Map to All Routes"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Route Legend & Vehicle Selector */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-2xl max-w-sm border border-white/60 text-xs shadow-lg space-y-2">
        <div className="flex items-center justify-between font-semibold text-[#15211D] pb-1 border-b border-black/5">
          <span>Active Routes ({plan.routes.length})</span>
          <span className="text-[11px] text-[#68756F]">{tileError ? 'Offline route view' : 'OpenStreetMap tiles'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.routes.map((route, i) => {
            const v = plan.vehicles.find(veh => veh.id === route.vehicle_id);
            const isSelected = selectedVehicleId === route.vehicle_id;
            return (
              <button
                key={route.id}
                onClick={() => onSelectVehicle(route.vehicle_id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl transition-all font-semibold text-[11px] cursor-pointer interactive-tap ${
                  isSelected
                    ? 'bg-[#17231F] text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-[#15211D] border border-black/5'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: route.color_token || '#2F5BEA' }}
                />
                <span>{v?.callsign.split('-').slice(0, 2).join('-') || `Van ${i + 1}`}</span>
                <span className="opacity-75 tabular-nums">({route.stops.length})</span>
              </button>
            );
          })}
        </div>
      </div>
      {(tileError || webglFailed) && (
        <div className="absolute bottom-4 right-4 z-10 w-64 max-h-56 overflow-auto rounded-2xl border border-black/5 bg-white/95 p-3 text-xs shadow-lg" aria-label="Ordered stops">
          <div className="mb-2 font-semibold text-[#15211D]">Stops · select to focus</div>
          <ol className="space-y-1">
            {plan.routes.flatMap(route => route.stops.slice().sort((a, b) => a.sequence_idx - b.sequence_idx).map(stop => ({ route, stop }))).map(({ route, stop }) => (
              <li key={stop.id}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-[#F6F4F0]" onClick={() => { onSelectStop(stop.id); onSelectVehicle(stop.vehicle_id); }}>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: route.color_token || '#B4532A' }}>{stop.sequence_idx}</span>
                  <span className="truncate text-[#34403A]">{stop.customer_name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
