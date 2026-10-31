import { describe, expect, it } from 'vitest';
import { boundsForLngLat, createSquareProjector, isValidLngLat, isValidLngLatBounds, projectLngLatToLocal } from './geometry';

describe('map geometry', () => {
  it('fits rectangular Cartesian points without changing their aspect ratio', () => {
    const projector = createSquareProjector([[10, 20], [30, 20], [30, 30], [10, 30]]);
    const a = projector.project([10, 20]);
    const b = projector.project([30, 20]);
    const c = projector.project([30, 30]);
    expect(Math.abs(b[0] - a[0]) / Math.abs(c[1] - b[1])).toBeCloseTo(2);
    expect(a[0]).toBeGreaterThanOrEqual(8);
    expect(c[0]).toBeLessThanOrEqual(92);
  });

  it('keeps degenerate and invalid extents finite and centered', () => {
    const samePoint = createSquareProjector([[40, 50], [40, 50]]).project([40, 50]);
    expect(samePoint.every(Number.isFinite)).toBe(true);
    expect(samePoint[0]).toBeCloseTo(50);
    expect(samePoint[1]).toBeCloseTo(50);
    expect(createSquareProjector([[Number.NaN, 1]]).project([0, 0]).every(Number.isFinite)).toBe(true);
  });

  it('clamps bad SVG padding and ignores malformed Cartesian coordinates when fitting', () => {
    const projector = createSquareProjector([[0, 0], [10, 0], [Number.NaN, 1000]], Number.NaN);
    expect(projector.project([10, 0])[0] - projector.project([0, 0])[0]).toBeCloseTo(84);
    expect(projector.project([0, 0]).every(Number.isFinite)).toBe(true);
  });

  it('validates geographic bounds and derives padded bounds from geometry', () => {
    expect(isValidLngLatBounds([[77, 12], [78, 13]])).toBe(true);
    expect(isValidLngLatBounds([[77, 13], [78, 12]])).toBe(false);
    expect(isValidLngLatBounds([[77, 12], [77, 13]])).toBe(false);
    expect(isValidLngLatBounds([[181, 12], [182, 13]])).toBe(false);
    expect(isValidLngLatBounds([[77, 12, 99], [78, 13]])).toBe(false);
    expect(isValidLngLat([77.6, 12.9])).toBe(true);
    expect(isValidLngLat([181, 12])).toBe(false);
    expect(isValidLngLat([77, Number.NaN])).toBe(false);
    expect(boundsForLngLat([[77.6, 12.9], [77.7, 13]])).toEqual([
      [77.595, 12.895], [77.705, 13.005]
    ]);
  });

  it('keeps singleton bounds non-degenerate at geographic edges and drops invalid positions', () => {
    const edgeBounds = boundsForLngLat([[-180, -90]]);
    expect(edgeBounds).not.toBeNull();
    expect(isValidLngLatBounds(edgeBounds)).toBe(true);
    expect(boundsForLngLat([[181, 0], [0, 91]])).toBeNull();
    const projected = projectLngLatToLocal([[181, 0]]);
    expect(projected[0].every(Number.isNaN)).toBe(true);
  });

  it('scales longitude by latitude for a local geographic fallback projection', () => {
    const equator = projectLngLatToLocal([[1, 0]], 0)[0][0];
    const delhi = projectLngLatToLocal([[1, 28.6]], 28.6)[0][0];
    expect(equator).toBeCloseTo(1);
    expect(delhi).toBeCloseTo(Math.cos(28.6 * Math.PI / 180));
    expect(projectLngLatToLocal([[1, 0]], 100)[0][0]).toBeCloseTo(Math.cos(Math.PI / 2));
  });
});
