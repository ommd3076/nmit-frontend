import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DriverStop } from '../api/client';
import { projectRouteMapPoints, type LngLat } from './routeProjection';
import { Map as MapLibreMapClass, NavigationControl, setWorkerUrl, type GeoJSONSource, type Map as MapLibreMap, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Props = { geojson: unknown; stops: DriverStop[]; selectedStopId?: string; onSelectStop?: (stop: DriverStop) => void };
const isLngLat = (v: unknown): v is LngLat => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
function linesFrom(value: unknown): LngLat[][] {
  if (!value || typeof value !== 'object') return [];
  const item = value as { type?: string; geometry?: unknown; features?: unknown; coordinates?: unknown };
  if (item.type === 'FeatureCollection' && Array.isArray(item.features)) return item.features.flatMap(linesFrom);
  if (item.type === 'Feature') return linesFrom(item.geometry);
  if (item.type !== 'LineString' && item.type !== 'MultiLineString' || !Array.isArray(item.coordinates)) return [];
  const candidates: unknown[] = item.type === 'LineString' ? [item.coordinates] : item.coordinates;
  return candidates.filter((line): line is unknown[] => Array.isArray(line) && line.length > 0 && line.every(isLngLat)) as LngLat[][];
}

export function DriverRouteMap({ geojson, stops, selectedStopId, onSelectStop }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stopsRef = useRef(stops);
  const [mapReady, setMapReady] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const lines = useMemo(() => linesFrom(geojson), [geojson]);
  const orderedStops = useMemo(() => [...stops].filter(stop => isLngLat(stop.coordinates)).sort((a, b) => a.sequence - b.sequence), [stops]);
  const routeData = useMemo(() => ({ type: 'FeatureCollection' as const, features: lines.map(coordinates => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } })) }), [lines]);
  const stopData = useMemo(() => ({ type: 'FeatureCollection' as const, features: orderedStops.map(stop => ({ type: 'Feature' as const, properties: { id: stop.id, sequence: stop.sequence, selected: stop.id === selectedStopId }, geometry: { type: 'Point' as const, coordinates: stop.coordinates as LngLat } })) }), [orderedStops, selectedStopId]);
  const allCoordinates = [...lines.flat(), ...orderedStops.map(stop => stop.coordinates as LngLat)];
  const fallbackPoints = projectRouteMapPoints(allCoordinates, 500, 250);
  let fallbackCursor = 0;
  const fallbackLines = lines.map(line => { const part = fallbackPoints.slice(fallbackCursor, fallbackCursor + line.length); fallbackCursor += line.length; return part; });
  const fallbackStops = orderedStops.map(stop => ({ stop, point: fallbackPoints[fallbackCursor++] }));
  useEffect(() => { stopsRef.current = stops; }, [stops]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !host.current || mapRef.current) return;
    if (!webglAvailable) return;
    setWorkerUrl(new URL('/maplibre-gl-worker.mjs', window.location.origin).href);
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) { setWebglAvailable(false); return; }
    const first = allCoordinates[0] ?? [-98, 39];
    // Keep the initial style local so route overlays render immediately while raster tiles load.
    let map: MapLibreMap;
    try {
      map = new MapLibreMapClass({ container: host.current, style: {
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers: [{ id: 'osm-base', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
      }, center: first, zoom: 13 });
    } catch {
      setWebglAvailable(false);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    const watchdog = setTimeout(() => { if (!map.getSource('planned-route')) setWebglAvailable(false); }, 5000);
    map.on('error', (event) => { setTilesUnavailable(true); if (/worker/i.test(event.error?.message || '')) setWebglAvailable(false); });
    map.on('style.load', () => {
      clearTimeout(watchdog);
      map.addSource('planned-route', { type: 'geojson', data: routeData });
      map.addLayer({ id: 'planned-route-line', type: 'line', source: 'planned-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#27845f', 'line-width': 5, 'line-opacity': 0.92 } });
      map.addSource('planned-stops', { type: 'geojson', data: stopData });
      map.addLayer({ id: 'planned-stop-circles', type: 'circle', source: 'planned-stops', paint: { 'circle-radius': ['case', ['get', 'selected'], 12, 10], 'circle-color': ['case', ['get', 'selected'], '#e7a939', '#ffffff'], 'circle-stroke-color': '#183c30', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'planned-stop-labels', type: 'symbol', source: 'planned-stops', layout: { 'text-field': ['to-string', ['get', 'sequence']], 'text-size': 10, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'] }, paint: { 'text-color': '#17392e' } });
      map.on('click', 'planned-stop-circles', (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        const stop = stopsRef.current.find(candidate => candidate.id === id);
        if (stop) onSelectStop?.(stop);
      });
      map.on('mouseenter', 'planned-stop-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'planned-stop-circles', () => { map.getCanvas().style.cursor = ''; });
      setMapReady(true);
    });
    return () => { clearTimeout(watchdog); map.remove(); mapRef.current = null; };
  }, [webglAvailable]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const route = map.getSource('planned-route') as GeoJSONSource | undefined;
    const stopSource = map.getSource('planned-stops') as GeoJSONSource | undefined;
    route?.setData(routeData as never);
    stopSource?.setData(stopData as never);
    const coords = [...lines.flat(), ...orderedStops.map(stop => stop.coordinates as LngLat)];
    if (coords.length) {
      const lngs = coords.map(([lng]) => lng), lats = coords.map(([, lat]) => lat);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 36, maxZoom: 15, duration: 450 });
    }
  }, [lines, orderedStops, routeData, stopData, mapReady]);

  return <View style={styles.card}>
    <View style={styles.headingRow}><View><Text style={styles.eyebrow}>ROUTE OVERVIEW</Text><Text style={styles.title}>Planned route</Text></View><View style={styles.tileBadge}><View style={styles.tileDot}/><Text style={styles.tileText}>Open map</Text></View></View>
    <View style={styles.mapFrame}>
      {webglAvailable ? <div ref={host} aria-label="Interactive planned route map" role="application" style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden' } as React.CSSProperties}/> : <svg aria-label="Route coordinate overview" viewBox="0 0 500 250" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <rect width="500" height="250" fill="#edf1ed"/>
        {fallbackLines.filter(line => line.length > 1).map((line, i) => <polyline key={`fallback-line-${i}`} points={line.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#27845f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>)}
        {fallbackStops.map(({ stop, point }) => <g key={stop.id} onClick={() => onSelectStop?.(stop)} style={{ cursor: 'pointer' }}><circle cx={point.x} cy={point.y} r={11} fill={stop.id === selectedStopId ? '#e7a939' : '#fff'} stroke="#183c30" strokeWidth="2"/><text x={point.x} y={point.y + 3.5} textAnchor="middle" fontSize="10" fill="#17392e">{stop.sequence}</text></g>)}
      </svg>}
      {!lines.length && <View pointerEvents="none" style={styles.overlay}><Text style={styles.overlayText}>Route geometry unavailable</Text></View>}{!orderedStops.length && <View pointerEvents="none" style={[styles.overlay, { top: 44 }]}><Text style={styles.overlayText}>Stop coordinates unavailable</Text></View>}
    </View>
    <View style={styles.footer}><Text style={styles.fallbackNotice}>{tilesUnavailable ? 'Map tiles unavailable · route and stops remain visible' : webglAvailable ? 'Pan and zoom · select a numbered stop · © OpenStreetMap contributors' : 'Coordinate view · select a numbered stop'}</Text><View style={styles.legend}><View style={styles.legendItem}><View style={styles.routeSwatch}/><Text style={styles.legendText}>Planned path</Text></View><Text style={styles.count}>{orderedStops.length} stops</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({ card: { backgroundColor: '#fff', borderColor: '#e1e8e2', borderWidth: 1, borderRadius: 18, padding: 14, overflow: 'hidden' }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, eyebrow: { color: '#718177', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, title: { color: '#1d3025', fontSize: 17, fontWeight: '700', marginTop: 3 }, tileBadge: { backgroundColor: '#f1f6f1', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }, tileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#39946a' }, tileText: { color: '#385446', fontSize: 10, fontWeight: '600' }, mapFrame: { height: 250, borderRadius: 12, overflow: 'hidden', backgroundColor: '#edf1ed', position: 'relative' }, overlay: { position: 'absolute', left: 10, right: 10, top: 12, alignItems: 'center' }, overlayText: { color: '#435248', fontSize: 11, backgroundColor: '#ffffffed', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 }, footer: { paddingTop: 10, gap: 8 }, fallbackNotice: { color: '#718177', fontSize: 10 }, legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, routeSwatch: { width: 17, height: 3, borderRadius: 2, backgroundColor: '#27845f' }, legendText: { color: '#55685b', fontSize: 10 }, count: { color: '#31483a', fontSize: 10, fontWeight: '700' } });
