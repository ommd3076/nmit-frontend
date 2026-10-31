export type MapPoint = readonly [number, number];

/** GeoJSON position in [longitude, latitude] order. */
export function isValidLngLat(point: unknown): point is MapPoint {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [lng, lat] = point;
  return Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

export interface SquareProjector {
  project: (point: MapPoint) => [number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Fit arbitrary Cartesian coordinates into a square SVG viewport without stretching either axis. */
export function createSquareProjector(points: readonly MapPoint[], padding = 8): SquareProjector {
  const valid = points.filter((point) => Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]));
  const xs = valid.map(([x]) => x);
  const ys = valid.map(([, y]) => y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 100;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 100;
  const rawSpanX = maxX - minX;
  const rawSpanY = maxY - minY;
  const spanX = Math.max(rawSpanX, 1e-6);
  const spanY = Math.max(rawSpanY, 1e-6);
  const safePadding = Number.isFinite(padding) ? Math.min(Math.max(padding, 0), 49.5) : 8;
  const usable = 100 - safePadding * 2;
  const scale = usable / Math.max(spanX, spanY);
  const offsetX = (100 - spanX * scale) / 2;
  const offsetY = (100 - spanY * scale) / 2;

  return {
    bounds: { minX, minY, maxX, maxY },
    project: ([x, y]) => [
      rawSpanX < 1e-6 ? 50 : offsetX + (x - minX) * scale,
      rawSpanY < 1e-6 ? 50 : 100 - offsetY - (y - minY) * scale
    ]
  };
}

export function isValidLngLatBounds(bounds: unknown): bounds is [[number, number], [number, number]] {
  if (!Array.isArray(bounds) || bounds.length !== 2 ||
    !bounds.every((corner) => Array.isArray(corner) && corner.length === 2)) return false;
  const [[minLng, minLat], [maxLng, maxLat]] = bounds as [[number, number], [number, number]];
  return [minLng, minLat, maxLng, maxLat].every(Number.isFinite) &&
    minLng >= -180 && maxLng <= 180 && minLat >= -90 && maxLat <= 90 &&
    minLng < maxLng && minLat < maxLat;
}

export function boundsForLngLat(points: readonly MapPoint[]): [[number, number], [number, number]] | null {
  const valid = points.filter(isValidLngLat);
  if (!valid.length) return null;
  const lngs = valid.map(([lng]) => lng);
  const lats = valid.map(([, lat]) => lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const lngPad = Math.max((maxLng - minLng) * 0.03, 0.005);
  const latPad = Math.max((maxLat - minLat) * 0.03, 0.005);
  // Keep a non-zero extent for points on the world edges; clamping both ends
  // of a padded singleton at -180/+180 (or -90/+90) otherwise collapses it.
  const west = Math.max(-180, minLng - lngPad);
  const east = Math.min(180, maxLng + lngPad);
  const south = Math.max(-90, minLat - latPad);
  const north = Math.min(90, maxLat + latPad);
  return [[west, south], [west < east ? east : Math.min(180, west + 0.005),
    south < north ? north : Math.min(90, south + 0.005)]];
}

/** Convert geographic coordinates to a local equirectangular plane for an SVG fallback. */
export function projectLngLatToLocal(points: readonly MapPoint[], referenceLat?: number): MapPoint[] {
  const valid = points.filter(isValidLngLat);
  const inferredLat = valid.length ? valid.reduce((sum, [, lat]) => sum + lat, 0) / valid.length : 0;
  const meanLat = Number.isFinite(referenceLat) ? Math.min(90, Math.max(-90, referenceLat!)) : inferredLat;
  const longitudeScale = Math.cos(meanLat * Math.PI / 180);
  return points.map((point) => isValidLngLat(point)
    ? [point[0] * longitudeScale, point[1]] as const
    : [Number.NaN, Number.NaN] as const);
}
