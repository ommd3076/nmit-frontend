import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { PlanRun, Stop, Vehicle } from '../../types/api';
import { Maximize2, AlertCircle, Compass } from 'lucide-react';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [tileError, setTileError] = useState(false);
  const [tileErrorCount, setTileErrorCount] = useState(0);

  // Active vehicle and route filter
  const activeRoute = useMemo(() => {
    if (!selectedVehicleId) return null;
    return plan.routes.find(r => r.vehicle_id === selectedVehicleId) || null;
  }, [plan.routes, selectedVehicleId]);

  // MAPLIBRE GL JS INITIALIZATION (For Lat/Lon)
  useEffect(() => {
    if (isCartesian || !mapContainerRef.current) return;

    // Default center for Bengaluru scenario
    const centerLng = 77.6300;
    const centerLat = 12.9800;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [centerLng, centerLat],
      zoom: 11.5,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('error', (e: any) => {
      // Catch tile loading errors gracefully
      if (e.error?.message?.includes('tile') || (e as any).status === 404) {
        setTileErrorCount(prev => {
          const next = prev + 1;
          if (next >= 2) setTileError(true);
          return next;
        });
      }
    });

    map.on('load', () => {
      // 1. Add route polyline sources and layers
      plan.routes.forEach((route, idx) => {
        const sourceId = `route-source-${route.id}`;
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
              coordinates: route.geometry_coordinates
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

      // Fit bounds if available
      if (plan.bounds) {
        map.fitBounds(plan.bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 13,
          duration: 1000
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isCartesian, plan.id]);

  // Update selection focus on MapLibre
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isCartesian) return;

    if (selectedVehicleId) {
      const v = plan.vehicles.find(veh => veh.id === selectedVehicleId);
      if (v && v.current_lat && v.current_lng) {
        map.easeTo({
          center: [v.current_lng, v.current_lat],
          zoom: 13,
          duration: 800
        });
      }
    } else if (selectedStopId) {
      for (const r of plan.routes) {
        const s = r.stops.find(st => st.id === selectedStopId);
        if (s && s.lat && s.lng) {
          map.easeTo({
            center: [s.lng, s.lat],
            zoom: 14,
            duration: 800
          });
          break;
        }
      }
    }
  }, [selectedVehicleId, selectedStopId, isCartesian, plan]);

  // Reset to full scenario bounds
  const handleResetBounds = () => {
    if (mapInstanceRef.current && plan.bounds) {
      mapInstanceRef.current.fitBounds(plan.bounds, {
        padding: 50,
        duration: 800
      });
    }
  };

  // -------------------------------------------------------------
  // RENDERER B: SVG PLOT FOR FLAT CARTESIAN BENCHMARKS (Solomon C101)
  // -------------------------------------------------------------
  if (isCartesian) {
    const minCoord = 0;
    const maxCoord = 100;
    const viewBoxSize = 100;

    return (
      <div className={`relative w-full h-full bg-[#FAFBF9] rounded-3xl overflow-hidden border border-black/5 flex flex-col ${className}`}>
        {/* Top Control Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          <div className="glass-pill px-3 py-1.5 rounded-full text-xs font-medium text-[#15211D] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#205A46]" />
            <span>Solomon Euclidean Metric Space (100×100)</span>
          </div>
        </div>

        <div className="flex-1 w-full h-full p-4 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full max-h-[720px] select-none"
            style={{ shapeRendering: 'geometricPrecision' }}
          >
            {/* Background Grid Every 10 units */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(21, 33, 29, 0.06)" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Axis Labels */}
            <text x="3" y="97" fontSize="2.8" fill="#929E99" fontFamily="monospace">0,0</text>
            <text x="91" y="97" fontSize="2.8" fill="#929E99" fontFamily="monospace">100,0</text>
            <text x="3" y="6" fontSize="2.8" fill="#929E99" fontFamily="monospace">0,100</text>
            <text x="88" y="6" fontSize="2.8" fill="#929E99" fontFamily="monospace">100,100</text>

            {/* Vehicle Route Polylines */}
            {plan.routes.map((route) => {
              const isRouteSelected = selectedVehicleId === route.vehicle_id;
              const points = route.geometry_coordinates.map(([x, y]) => `${x},${100 - y}`).join(' ');

              return (
                <g key={`svg-route-${route.id}`}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={isRouteSelected ? 3.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.8}
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={route.color_token}
                    strokeWidth={isRouteSelected ? 2.2 : 1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isRouteSelected ? 'none' : '2, 1'}
                    opacity={isRouteSelected || !selectedVehicleId ? 0.95 : 0.3}
                  />
                </g>
              );
            })}

            {/* Central Depot Square at (40, 50) */}
            <rect
              x={40 - 2.5}
              y={100 - 50 - 2.5}
              width="5"
              height="5"
              rx="0.8"
              fill="#17231F"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
            <text
              x="40"
              y={100 - 50 + 0.8}
              fontSize="2"
              fill="#FFFFFF"
              fontWeight="bold"
              textAnchor="middle"
            >
              D
            </text>

            {/* Numbered Stops */}
            {plan.routes.flatMap((r) =>
              r.stops.map((s) => {
                if (s.x === undefined || s.y === undefined) return null;
                const isStopSelected = selectedStopId === s.id;
                const isAtRisk = s.status === 'at_risk' || (s.predicted_late_prob_max || 0) > 0.4;
                const svgY = 100 - s.y;

                return (
                  <g
                    key={`svg-stop-${s.id}`}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => {
                      onSelectStop(s.id);
                      onSelectVehicle(s.vehicle_id);
                    }}
                  >
                    {/* Risk Halo Ring */}
                    {isAtRisk && (
                      <circle
                        cx={s.x}
                        cy={svgY}
                        r="3.2"
                        fill="none"
                        stroke="#C6534C"
                        strokeWidth="0.5"
                        strokeDasharray="1, 0.8"
                      />
                    )}

                    {/* Outer selection ring */}
                    {isStopSelected && (
                      <circle
                        cx={s.x}
                        cy={svgY}
                        r="3.6"
                        fill="none"
                        stroke="#17231F"
                        strokeWidth="0.8"
                      />
                    )}

                    {/* Stop Circle */}
                    <circle
                      cx={s.x}
                      cy={svgY}
                      r="2"
                      fill={s.is_completed ? '#A8DBC9' : isAtRisk ? '#C6534C' : r.color_token}
                      stroke="#FFFFFF"
                      strokeWidth="0.6"
                    />

                    {/* Sequence Index Number */}
                    <text
                      x={s.x}
                      y={svgY + 0.7}
                      fontSize="1.6"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                    >
                      {s.sequence_idx}
                    </text>
                  </g>
                );
              })
            )}

            {/* Vehicle Current Position Markers */}
            {plan.vehicles.map((v) => {
              if (v.current_x === undefined || v.current_y === undefined) return null;
              const isVehSelected = selectedVehicleId === v.id;
              const svgY = 100 - v.current_y;

              return (
                <g
                  key={`svg-veh-${v.id}`}
                  className="cursor-pointer"
                  onClick={() => onSelectVehicle(v.id)}
                >
                  <circle
                    cx={v.current_x}
                    cy={svgY}
                    r={isVehSelected ? 3.2 : 2.5}
                    fill="#17231F"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                  <text
                    x={v.current_x}
                    y={svgY + 0.7}
                    fontSize="1.8"
                    fill="#A8DBC9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    V
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 glass-panel p-2.5 rounded-2xl flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-[#17231F] rounded-sm inline-block" />
            <span className="text-[#68756F]">Depot (40, 50)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8DBC9] border border-white inline-block" />
            <span className="text-[#68756F]">Completed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6534C] border border-white inline-block" />
            <span className="text-[#68756F]">At Risk / Late</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERER A: MAPLIBRE GL JS (For Real-World Bengaluru / Lat-Lon)
  // -------------------------------------------------------------
  return (
    <div className={`relative w-full h-full bg-[#F6F8F5] rounded-3xl overflow-hidden border border-black/5 ${className}`}>
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />

      {/* Tile Fallback Warning Banner if tiles fail */}
      {tileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs text-[#9A5B00] border border-[#FBD6B0] shadow-lg">
          <AlertCircle className="w-4 h-4 text-[#D78A45]" />
          <span>Map tiles unavailable — displaying route geometry overlay</span>
        </div>
      )}

      {/* Floating Control: Reset Camera Bounds */}
      <button
        onClick={handleResetBounds}
        className="absolute top-4 right-4 z-10 glass-pill p-2 rounded-xl text-[#15211D] hover:bg-white transition-all shadow-md cursor-pointer"
        title="Fit Map to All Routes"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Floating Route Legend & Vehicle Selector */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-2xl max-w-sm border border-white/60 text-xs shadow-lg space-y-2">
        <div className="flex items-center justify-between font-medium text-[#15211D] pb-1 border-b border-black/5">
          <span>Active Routes ({plan.routes.length})</span>
          <span className="text-[11px] text-[#68756F]">OpenFreeMap Positron</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.routes.map((route, i) => {
            const v = plan.vehicles.find(veh => veh.id === route.vehicle_id);
            const isSelected = selectedVehicleId === route.vehicle_id;
            return (
              <button
                key={route.id}
                onClick={() => onSelectVehicle(route.vehicle_id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl transition-all font-medium text-[11px] cursor-pointer ${
                  isSelected
                    ? 'bg-[#17231F] text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-[#15211D] border border-black/5'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: route.color_token || '#2F5BEA' }}
                />
                <span>{v?.callsign.split('-').slice(0, 2).join('-') || `Van ${i + 1}`}</span>
                <span className="opacity-70 tabular-nums">({route.stops.length})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
