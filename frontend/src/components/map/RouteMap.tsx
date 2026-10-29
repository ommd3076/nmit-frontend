import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { PlanRun } from '../../types/api';
import { Maximize2, AlertCircle, Compass, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [tileError, setTileError] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  // SVG Pan & Zoom state for Euclidean & SVG basemaps
  const [svgZoom, setSvgZoom] = useState<number>(1);
  const [svgPan, setSvgPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // -------------------------------------------------------------
  // MAPLIBRE GL JS INITIALIZATION (For Real-World Lat/Lon)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isCartesian || webglFailed || !mapContainerRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Base center for Bengaluru
    const centerLng = 77.6300;
    const centerLat = 12.9800;

    const baseStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'openfreemap-raster': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, OpenFreeMap'
        }
      },
      layers: [
        {
          id: 'map-background',
          type: 'background',
          paint: {
            'background-color': '#EEF2ED'
          }
        },
        {
          id: 'map-raster-tiles',
          type: 'raster',
          source: 'openfreemap-raster',
          minzoom: 0,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.85,
            'raster-saturation': -0.2
          }
        }
      ]
    };

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: baseStyle,
        center: [centerLng, centerLat],
        zoom: 11.5,
        attributionControl: false
      });
    } catch (err) {
      console.warn('MapLibre GL WebGL initialization skipped:', err);
      setTimeout(() => {
        setWebglFailed(true);
        setTileError(true);
      }, 0);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('error', (e: any) => {
      if (e.error?.message?.includes('tile') || (e as any).status === 404 || e.error?.message?.includes('Failed to fetch')) {
        setTileError(true);
      }
    });

    map.on('load', () => {
      // 1. Add route polyline sources and layers
      plan.routes.forEach((route) => {
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

      // 2. Add Stop Markers to MapLibre (Strictly vector SVG, no emojis)
      plan.routes.forEach((route) => {
        route.stops.forEach((stop) => {
          if (stop.lat === undefined || stop.lng === undefined) return;

          const isAtRisk = stop.status === 'at_risk' || (stop.predicted_late_prob_max || 0) > 0.4;
          const isStopSelected = selectedStopId === stop.id;

          const el = document.createElement('div');
          el.className = 'arq-stop-marker cursor-pointer transition-transform hover:scale-115 select-none';
          el.title = `${stop.customer_name} (${stop.window_start} - ${stop.window_end})`;

          let bgColor = route.color_token || '#2F5BEA';
          if (stop.is_completed) bgColor = '#205A46';
          else if (isAtRisk) bgColor = '#C6534C';

          const lockSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

          el.innerHTML = `
            <div style="
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
              ${isStopSelected ? 'outline: 3px solid #17231F; outline-offset: 2px;' : ''}
              ${isAtRisk ? 'box-shadow: 0 0 0 3px rgba(198, 83, 76, 0.4);' : ''}
            ">
              ${stop.is_locked ? lockSvg : stop.sequence_idx}
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectStop(stop.id);
            onSelectVehicle(stop.vehicle_id);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });
      });

      // 3. Add Vehicle Position Markers to MapLibre (Vector truck glyph, no emojis)
      plan.vehicles.forEach((veh) => {
        if (veh.current_lat === undefined || veh.current_lng === undefined) return;

        const isVehSelected = selectedVehicleId === veh.id;
        const vEl = document.createElement('div');
        vEl.className = 'arq-vehicle-marker cursor-pointer transition-transform hover:scale-110 select-none';
        vEl.title = `${veh.callsign} (${veh.driver_name}) - ${veh.battery_or_fuel_pct}% Batt`;

        const truckSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8DBC9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

        vEl.innerHTML = `
          <div style="
            background: #17231F;
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
            ${isVehSelected ? 'outline: 3px solid #205A46; outline-offset: 1px;' : ''}
          ">
            ${truckSvg}
            <span>${veh.callsign.split('-').slice(0, 2).join('-')}</span>
          </div>
        `;

        vEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicle(veh.id);
        });

        const vMarker = new maplibregl.Marker({ element: vEl })
          .setLngLat([veh.current_lng, veh.current_lat])
          .addTo(map);

        markersRef.current.push(vMarker);
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
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isCartesian, webglFailed, plan, onSelectStop, onSelectVehicle, selectedStopId, selectedVehicleId]);

  // Update selection focus and dynamic route emphasis on MapLibre
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isCartesian || webglFailed) return;

    // Emphasize selected route, dim unselected routes
    plan.routes.forEach((route) => {
      const layerId = `route-line-${route.id}`;
      if (map.getLayer(layerId)) {
        if (selectedVehicleId) {
          const isSelected = route.vehicle_id === selectedVehicleId;
          map.setPaintProperty(layerId, 'line-width', isSelected ? 6 : 3);
          map.setPaintProperty(layerId, 'line-opacity', isSelected ? 1.0 : 0.3);
        } else {
          map.setPaintProperty(layerId, 'line-width', 4);
          map.setPaintProperty(layerId, 'line-opacity', 0.95);
        }
      }
    });

    // Pan camera to selected vehicle or stop
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
  }, [selectedVehicleId, selectedStopId, isCartesian, webglFailed, plan]);

  // Reset to full scenario bounds
  const handleResetBounds = () => {
    if (mapInstanceRef.current && plan.bounds) {
      mapInstanceRef.current.fitBounds(plan.bounds, {
        padding: 50,
        duration: 800
      });
    }
    setSvgZoom(1);
    setSvgPan({ x: 0, y: 0 });
  };

  // -------------------------------------------------------------
  // RENDERER B: HIGH-FIDELITY ARCHITECTURAL SVG CANVAS
  // (Solomon Euclidean Metric Space & WebGL Fallback)
  // -------------------------------------------------------------
  if (isCartesian || webglFailed) {
    const minLng = plan.bounds ? plan.bounds[0][0] : 77.52;
    const maxLng = plan.bounds ? plan.bounds[1][0] : 77.72;
    const minLat = plan.bounds ? plan.bounds[0][1] : 12.91;
    const maxLat = plan.bounds ? plan.bounds[1][1] : 13.06;

    const projectCoord = (coordX: number, coordY: number): [number, number] => {
      if (isCartesian) {
        return [coordX, 100 - coordY];
      }
      const normX = 10 + ((coordX - minLng) / (maxLng - minLng)) * 80;
      const normY = 10 + ((coordY - minLat) / (maxLat - minLat)) * 80;
      return [normX, 100 - normY];
    };

    return (
      <div className={`relative w-full h-full bg-[#FAFBF9] rounded-3xl overflow-hidden border border-black/5 flex flex-col ${className}`}>
        {/* Top Control Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          <div className="glass-pill px-3 py-1.5 rounded-full text-xs font-semibold text-[#15211D] flex items-center gap-1.5 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-[#205A46]" />
            <span>
              {isCartesian
                ? 'Solomon Euclidean Metric Space (100×100)'
                : 'Bengaluru Dispatch Corridors (High-Fidelity Basemap)'}
            </span>
          </div>
        </div>

        {/* Floating Zoom & Reset Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 glass-panel p-1 rounded-2xl shadow-md border border-white/80">
          <button
            onClick={() => setSvgZoom(prev => Math.min(prev + 0.25, 2.5))}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSvgZoom(prev => Math.max(prev - 0.25, 0.75))}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetBounds}
            className="p-1.5 rounded-xl hover:bg-white text-[#15211D] transition-colors"
            title="Reset View Bounds"
            aria-label="Reset View Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Central Map Canvas */}
        <div className="flex-1 w-full h-full p-4 flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full max-h-[720px] select-none transition-transform duration-300 ease-out"
            style={{
              shapeRendering: 'geometricPrecision',
              transform: `scale(${svgZoom}) translate(${svgPan.x}px, ${svgPan.y}px)`
            }}
          >
            {/* Background Grid */}
            <defs>
              <pattern id="arq-svg-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(21, 33, 29, 0.05)" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#arq-svg-grid)" />

            {/* Axis / Coordinate Reference Marks */}
            <text x="3" y="97" fontSize="2.4" fill="#929E99" fontFamily="monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? '0,0' : '77.52°E, 12.91°N'}
            </text>
            <text x={isCartesian ? '90' : '74'} y="97" fontSize="2.4" fill="#929E99" fontFamily="monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? '100,0' : '77.72°E, 12.91°N'}
            </text>
            <text x="3" y="6" fontSize="2.4" fill="#929E99" fontFamily="monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? '0,100' : '77.52°E, 13.06°N'}
            </text>
            <text x={isCartesian ? '87' : '74'} y="6" fontSize="2.4" fill="#929E99" fontFamily="monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isCartesian ? '100,100' : '77.72°E, 13.06°N'}
            </text>

            {/* Vehicle Route Polylines */}
            {plan.routes.map((route) => {
              const isRouteSelected = selectedVehicleId === route.vehicle_id;
              const points = route.geometry_coordinates
                .map(([ptX, ptY]) => {
                  const [px, py] = projectCoord(ptX, ptY);
                  return `${px.toFixed(1)},${py.toFixed(1)}`;
                })
                .join(' ');

              return (
                <g key={`svg-route-${route.id}`}>
                  {/* Outer casing */}
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={isRouteSelected ? 3.8 : 2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                  {/* Colored corridor */}
                  <polyline
                    points={points}
                    fill="none"
                    stroke={route.color_token || '#2F5BEA'}
                    strokeWidth={isRouteSelected ? 2.4 : 1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isRouteSelected ? 'none' : '2, 1'}
                    opacity={isRouteSelected || !selectedVehicleId ? 0.95 : 0.28}
                  />
                </g>
              );
            })}

            {/* Central Depot Landmark (Solomon or Hub) */}
            {isCartesian && (
              <g transform="translate(37.5, 47.5)">
                <rect
                  width="5"
                  height="5"
                  rx="1"
                  fill="#17231F"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                />
                {/* Depot Warehouse icon */}
                <path
                  d="M 1 2.5 L 2.5 1 L 4 2.5 L 4 4 L 1 4 Z"
                  fill="#A8DBC9"
                />
                <text
                  x="2.5"
                  y="3.2"
                  fontSize="1.4"
                  fill="#17231F"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  D
                </text>
              </g>
            )}

            {/* Numbered Stops (Precision Centered Typography) */}
            {plan.routes.flatMap((r) =>
              r.stops.map((s) => {
                const sCoordX = isCartesian ? s.x : s.lng;
                const sCoordY = isCartesian ? s.y : s.lat;
                if (sCoordX === undefined || sCoordY === undefined) return null;

                const [posX, posY] = projectCoord(sCoordX, sCoordY);
                const isStopSelected = selectedStopId === s.id;
                const isAtRisk = s.status === 'at_risk' || (s.predicted_late_prob_max || 0) > 0.4;

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
                        cx={posX}
                        cy={posY}
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
                        cx={posX}
                        cy={posY}
                        r="3.4"
                        fill="none"
                        stroke="#17231F"
                        strokeWidth="0.8"
                      />
                    )}

                    {/* Stop Circle */}
                    <circle
                      cx={posX}
                      cy={posY}
                      r="2"
                      fill={s.is_completed ? '#205A46' : isAtRisk ? '#C6534C' : r.color_token}
                      stroke="#FFFFFF"
                      strokeWidth="0.6"
                    />

                    {/* Sequence Index Number - Mathematically centered */}
                    {s.is_locked ? (
                      /* Lock Icon Path */
                      <path
                        d="M -0.6 -0.1 L 0.6 -0.1 L 0.6 0.8 L -0.6 0.8 Z M -0.4 -0.1 L -0.4 -0.5 C -0.4 -0.8 0.4 -0.8 0.4 -0.5 L 0.4 -0.1"
                        transform={`translate(${posX}, ${posY})`}
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

            {/* Vehicle Current Position Markers (Sleek Tactical Vehicle Glyph) */}
            {plan.vehicles.map((v) => {
              const vCoordX = isCartesian ? v.current_x : v.current_lng;
              const vCoordY = isCartesian ? v.current_y : v.current_lat;
              if (vCoordX === undefined || vCoordY === undefined) return null;

              const [posX, posY] = projectCoord(vCoordX, vCoordY);
              const isVehSelected = selectedVehicleId === v.id;

              return (
                <g
                  key={`svg-veh-${v.id}`}
                  className="cursor-pointer"
                  onClick={() => onSelectVehicle(v.id)}
                >
                  {/* Vehicle Marker Pin */}
                  <circle
                    cx={posX}
                    cy={posY}
                    r={isVehSelected ? 2.8 : 2.2}
                    fill="#17231F"
                    stroke="#FFFFFF"
                    strokeWidth="0.7"
                  />
                  {/* Subtle heading pip */}
                  <circle
                    cx={posX}
                    cy={posY}
                    r="1"
                    fill="#A8DBC9"
                  />
                  {/* Vehicle Callout Badge */}
                  <g transform={`translate(${posX}, ${posY - 3.4})`}>
                    <rect
                      x="-3.5"
                      y="-1.3"
                      width="7"
                      height="2.6"
                      rx="0.6"
                      fill="#17231F"
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
              {isCartesian ? 'Depot (40, 50)' : 'SVG Basemap'}
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
      {tileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs text-[#9A5B00] border border-[#FBD6B0] shadow-lg">
          <AlertCircle className="w-4 h-4 text-[#D78A45]" />
          <span>Map tiles unavailable — displaying route geometry overlay</span>
        </div>
      )}

      {/* Floating Control: Reset Camera Bounds */}
      <button
        onClick={handleResetBounds}
        className="absolute top-4 right-4 z-10 glass-pill p-2 rounded-xl text-[#15211D] hover:bg-white transition-all shadow-md cursor-pointer interactive-tap"
        title="Fit Map to All Routes"
        aria-label="Fit Map to All Routes"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Floating Route Legend & Vehicle Selector */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-2xl max-w-sm border border-white/60 text-xs shadow-lg space-y-2">
        <div className="flex items-center justify-between font-semibold text-[#15211D] pb-1 border-b border-black/5">
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
};
