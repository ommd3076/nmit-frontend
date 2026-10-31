import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { DriverStop } from '../api/client';
import type { LngLat } from './routeProjection';

type Props = { geojson: unknown; stops: DriverStop[]; selectedStopId?: string; onSelectStop?: (stop: DriverStop) => void };
const isLngLat = (v: unknown): v is LngLat => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
function linesFrom(value: unknown): LngLat[][] {
  if (!value || typeof value !== 'object') return [];
  const item = value as { type?: string; geometry?: unknown; features?: unknown; coordinates?: unknown };
  if (item.type === 'FeatureCollection' && Array.isArray(item.features)) return item.features.flatMap(linesFrom);
  if (item.type === 'Feature') return linesFrom(item.geometry);
  if ((item.type !== 'LineString' && item.type !== 'MultiLineString') || !Array.isArray(item.coordinates)) return [];
  const candidates: unknown[] = item.type === 'LineString' ? [item.coordinates] : item.coordinates;
  return candidates.filter((line): line is unknown[] => Array.isArray(line) && line.length > 0 && line.every(isLngLat)) as LngLat[][];
}
const emptyCollection = { type: 'FeatureCollection' as const, features: [] as object[] };

export function DriverRouteMap({ geojson, stops, selectedStopId, onSelectStop }: Props) {
  const camera = useRef<React.ComponentRef<typeof Camera>>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const lines = useMemo(() => linesFrom(geojson), [geojson]);
  const orderedStops = useMemo(() => [...stops].filter(stop => isLngLat(stop.coordinates)).sort((a, b) => a.sequence - b.sequence), [stops]);
  const routeData = useMemo(() => ({ type: 'FeatureCollection' as const, features: lines.map(coordinates => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } })) }), [lines]);
  const stopData = useMemo(() => ({ type: 'FeatureCollection' as const, features: orderedStops.map(stop => ({ type: 'Feature' as const, properties: { id: stop.id, sequence: stop.sequence, selected: stop.id === selectedStopId }, geometry: { type: 'Point' as const, coordinates: stop.coordinates as LngLat } })) }), [orderedStops, selectedStopId]);
  const all = [...lines.flat(), ...orderedStops.map(stop => stop.coordinates as LngLat)];
  const lngs = all.map(([lng]) => lng), lats = all.map(([, lat]) => lat);
  const initialViewState = lngs.length ? { bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number], padding: { top: 32, right: 32, bottom: 32, left: 32 }, zoom: 12 } : { center: [-98, 39] as LngLat, zoom: 3 };

  return <View style={styles.card}>
    <View style={styles.headingRow}><View><Text style={styles.eyebrow}>ROUTE OVERVIEW</Text><Text style={styles.title}>Planned route</Text></View><View style={styles.tileBadge}><View style={styles.tileDot}/><Text style={styles.tileText}>Open map</Text></View></View>
    <View style={styles.mapFrame}>
      <Map style={StyleSheet.absoluteFill} mapStyle="https://tiles.openfreemap.org/styles/positron" onDidFailLoadingMap={() => setTilesUnavailable(true)}>
        <Camera ref={camera} initialViewState={initialViewState}/>
        <GeoJSONSource id="planned-route" data={routeData as never}><Layer id="planned-route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#27845f', 'line-width': 5, 'line-opacity': 0.92 }}/></GeoJSONSource>
        <GeoJSONSource id="planned-stops" data={(stopData.features.length ? stopData : emptyCollection) as never} onPress={event => {
          const props = (event.nativeEvent as { features?: Array<{ properties?: { id?: string } }> }).features?.[0]?.properties;
          const stop = orderedStops.find(candidate => candidate.id === props?.id);
          if (stop) onSelectStop?.(stop);
        }}>
          <Layer id="planned-stop-circles" type="circle" paint={{ 'circle-radius': ['case', ['get', 'selected'], 12, 10], 'circle-color': ['case', ['get', 'selected'], '#e7a939', '#ffffff'], 'circle-stroke-color': '#183c30', 'circle-stroke-width': 2 }}/>
          <Layer id="planned-stop-labels" type="symbol" layout={{ 'text-field': ['to-string', ['get', 'sequence']], 'text-size': 10 }} paint={{ 'text-color': '#17392e' }}/>
        </GeoJSONSource>
      </Map>
      {(!lines.length || !orderedStops.length) && <View pointerEvents="none" style={styles.overlay}><Text style={styles.overlayText}>{!lines.length ? 'Route geometry unavailable' : 'Stop coordinates unavailable'}</Text></View>}
    </View>
    <View style={styles.footer}><Text style={styles.fallbackNotice}>{tilesUnavailable ? 'Map tiles unavailable · route and stops remain visible if map recovers' : 'Pan and zoom · tap a numbered stop'}</Text><View style={styles.legend}><View style={styles.legendItem}><View style={styles.routeSwatch}/><Text style={styles.legendText}>Planned path</Text></View><Text style={styles.count}>{orderedStops.length} stops</Text></View></View>
  </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#fff', borderColor: '#e1e8e2', borderWidth: 1, borderRadius: 18, padding: 14, overflow: 'hidden' }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, eyebrow: { color: '#718177', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, title: { color: '#1d3025', fontSize: 17, fontWeight: '700', marginTop: 3 }, tileBadge: { backgroundColor: '#f1f6f1', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }, tileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#39946a' }, tileText: { color: '#385446', fontSize: 10, fontWeight: '600' }, mapFrame: { height: 250, borderRadius: 12, overflow: 'hidden', backgroundColor: '#edf1ed' }, overlay: { position: 'absolute', left: 10, right: 10, top: 12, alignItems: 'center' }, overlayText: { color: '#435248', fontSize: 11, backgroundColor: '#ffffffed', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 }, footer: { paddingTop: 10, gap: 8 }, fallbackNotice: { color: '#718177', fontSize: 10 }, legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, routeSwatch: { width: 17, height: 3, borderRadius: 2, backgroundColor: '#27845f' }, legendText: { color: '#55685b', fontSize: 10 }, count: { color: '#31483a', fontSize: 10, fontWeight: '700' } });
