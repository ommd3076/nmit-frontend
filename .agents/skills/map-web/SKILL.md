---
name: map-web
description: Use for the Plan and Recovery maps on web.
---
# Map (web)

Two renderers behind one `<RouteMap scenario plan />` interface:
1. **Lat/lon (e.g. Amazon data): MapLibre GL JS** with OpenFreeMap tiles. Style URL `https://tiles.openfreemap.org/styles/positron` (light; matches the glass theme). OpenFreeMap: free, no API key, no registration, commercial use allowed, no SLA; attribution required and added automatically by MapLibre.
2. **Flat x/y (Solomon): SVG** (≤ 500 stops) or canvas (> 500). Fit to bounds with 5% padding, equal aspect, grid every 10 units, depot as a square.

Both: one line per vehicle (--map-route-n), numbered stop markers (real sequence), risk ring + text label in tooltip, locked stops greyed with lock icon, click → stop drawer. Legend lists vehicles with stop count. A text table of ordered stops is always present below (a11y and tile-failure fallback).

Tile failure: listen to `map.on('error')`; after 2 tile errors show "Map tiles unavailable — showing plot without basemap" and keep routes drawn on a blank background (add the GeoJSON layers to an empty style). Never block the screen on tiles.
Self-host option: OpenFreeMap publishes weekly planet MBTiles if the venue has no internet.
Performance: GeoJSON sources, one layer per kind (lines, stops, labels), not one per vehicle.
