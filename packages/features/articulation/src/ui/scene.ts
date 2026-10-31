import type { ArticulationCamera, ArticulationSceneLayer } from '../core';
import { ARTICULATION_PIVOT, ARTICULATION_SHELL, shadeColor } from '../core';

/** How many slices make a volume look rounded. */
export const SCENE_SLICES = 9;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Affine transform for one depth slice of a volume: scale the outline around
 * its anchor, project it through the camera, then place it at depth `z`.
 *
 * The derivation lives in `projectScenePoint`; this is the same projection
 * written as an SVG `matrix`, which means the path data never changes.
 */
export function sliceMatrix(
  anchor: readonly [number, number],
  scale: number,
  z: number,
  camera: ArticulationCamera,
): string {
  const u = Math.cos(rad(camera.yaw));
  const v = Math.sin(rad(camera.yaw));
  const w = Math.sin(rad(camera.pitch));
  const q = Math.cos(rad(camera.pitch));
  const cr = Math.cos(rad(camera.roll));
  const sr = Math.sin(rad(camera.roll));
  const [cx, cy] = anchor;
  const px = ARTICULATION_PIVOT.x;
  const py = ARTICULATION_PIVOT.y;
  // The outline is scaled around its anchor, turned and tilted; the roll then
  // rotates the finished image around the pivot.
  const x0 = cx - px - scale * cx;
  const y0 = cy - py - scale * cy;
  const a0 = scale * u;
  const b0 = scale * v * w;
  const d0 = scale * q;
  const e0 = px + u * x0 + v * z;
  const f0 = py + q * y0 + w * v * x0 - w * u * z;
  const a = cr * a0 - sr * b0;
  const b = sr * a0 + cr * b0;
  const c = -sr * d0;
  const d = cr * d0;
  const e = px + cr * (e0 - px) - sr * (f0 - py);
  const f = py + sr * (e0 - px) + cr * (f0 - py);
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

/** Layers from far to near, so the painter's algorithm draws them correctly. */
export function sceneOrder(
  layers: ArticulationSceneLayer[],
  camera: ArticulationCamera,
): ArticulationSceneLayer[] {
  const u = Math.cos(rad(camera.yaw));
  const v = Math.sin(rad(camera.yaw));
  const w = Math.sin(rad(camera.pitch));
  const q = Math.cos(rad(camera.pitch));
  return [...layers].sort((left, right) => {
    const depth = (layer: ArticulationSceneLayer) => {
      const [ax, ay] = layer.anchor;
      const front = layer.z + layer.depth / 2;
      return w * (ay - ARTICULATION_PIVOT.y) + q * (-v * (ax - ARTICULATION_PIVOT.x) + u * front);
    };
    // Coplanar cut faces keep the familiar 2-D layering.
    return depth(left) - depth(right) || left.order - right.order;
  });
}

export interface VolumeSlice {
  matrix: string;
  fill: string;
}

/** The shaded slices of a volume, from its back to just under its face. */
export function volumeSlices(layer: ArticulationSceneLayer, camera: ArticulationCamera): VolumeSlice[] {
  const slices: VolumeSlice[] = [];
  for (let index = 0; index < SCENE_SLICES; index += 1) {
    const along = index / SCENE_SLICES;
    const z = layer.z - layer.depth / 2 + layer.depth * along;
    const scale = 0.9 + 0.1 * along;
    slices.push({
      matrix: sliceMatrix(layer.anchor, scale, z, camera),
      fill: shadeColor(layer.fill, 0.08 + 0.34 * (1 - along)),
    });
  }
  return slices;
}

/** Transform of the lit face, which sits at the near side of the volume. */
export function faceMatrix(layer: ArticulationSceneLayer, camera: ArticulationCamera): string {
  return sliceMatrix(layer.anchor, 1, layer.z + layer.depth / 2, camera);
}

/** Rotation of the outline inside its plane, e.g. the velum swing. */
export function layerRotation(layer: ArticulationSceneLayer): string {
  return layer.rotate ? `rotate(${layer.rotate} ${layer.anchor[0]} ${layer.anchor[1]})` : '';
}

/** One cross-section of the head shell, from the cut plane back to the crown. */
export interface ShellSlice {
  matrix: string;
  /** How much the outline shrank at this depth; 1 on the cut plane. */
  scale: number;
  z: number;
  /** 0 on the cut plane, 1 at the far side of the head. */
  back: number;
}

/**
 * Depth slices of the head shell. The section is the cut face at `z = 0`; the
 * rest of the head recedes behind it and narrows towards the side of the head,
 * so a turned model reads as a solid head instead of a sheet.
 */
export function shellRim(
  camera: ArticulationCamera,
  steps: number = ARTICULATION_SHELL.rim,
  depth: number = ARTICULATION_SHELL.depth,
): ShellSlice[] {
  const slices: ShellSlice[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const back = index / steps;
    // Round the far edge instead of tapering to a point.
    const scale = 1 - ARTICULATION_SHELL.taper * back ** 1.4;
    slices.push({
      matrix: sliceMatrix(ARTICULATION_SHELL.anchor, scale, -depth * back, camera),
      scale,
      z: -depth * back,
      back,
    });
  }
  return slices;
}

