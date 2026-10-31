import { HEAD_VIEW_BOX } from './regions';

type Point = readonly [number, number];

/**
 * Percentage position inside a figure, for overlay views (air puffs, rings)
 * that live outside the SVG and must track its viewBox.
 */
export function pointPercent(
  point: Point | { x: number; y: number },
  viewBox: string = HEAD_VIEW_BOX,
): { left: string; top: string } {
  const [minX, minY, width, height] = viewBox.split(/[\s,]+/).map(Number);
  const x = 'x' in point ? point.x : point[0];
  const y = 'y' in point ? point.y : point[1];
  return {
    left: `${(((x - minX) / width) * 100).toFixed(2)}%`,
    top: `${(((y - minY) / height) * 100).toFixed(2)}%`,
  };
}
