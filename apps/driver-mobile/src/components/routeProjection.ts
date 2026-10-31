export type LngLat = [number, number];
export type PixelPoint = { x: number; y: number };

/** Fits geographic coordinates to a viewport using a local equirectangular projection. */
export function projectRouteMapPoints(points: readonly LngLat[], width: number, height: number, padding = 26): PixelPoint[] {
  if (!points.length || width <= 0 || height <= 0) return [];
  const referenceLat = points.reduce((sum, [, lat]) => sum + lat, 0) / points.length;
  const cosLat = Math.max(Math.cos(referenceLat * Math.PI / 180), 0.01);
  const local = points.map(([lng, lat]) => [lng * cosLat, lat] as const);
  const xs = local.map(([x]) => x), ys = local.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if (maxX - minX < 1e-7 && maxY - minY < 1e-7) return points.map(() => ({ x: width / 2, y: height / 2 }));
  const spanX = Math.max(maxX - minX, 1e-7), spanY = Math.max(maxY - minY, 1e-7);
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const usedW = spanX * scale, usedH = spanY * scale;
  const offsetX = (width - usedW) / 2, offsetY = (height - usedH) / 2;
  return local.map(([x, y]) => ({ x: offsetX + (x - minX) * scale, y: height - offsetY - (y - minY) * scale }));
}
