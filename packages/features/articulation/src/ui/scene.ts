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
  const [cx, cy] = anchor;
  const px = ARTICULATION_PIVOT.x;
  const py = ARTICULATION_PIVOT.y;
  const a = scale * u;
  const b = scale * v * w;
  const d = scale * q;
  const e = px * (1 - scale * u) + u * (cx - px) * (1 - scale) + v * z;
  const f =
    py * (1 - scale * q) -
    scale * v * w * (cx - px) +
    q * (cy - py) * (1 - scale) -
    w * u * z;
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} 0 ${d.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
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
    return depth(left) - depth(right);
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

/** Depth slices of the head shell: a swept rim that keeps the cut plane open. */
export function shellRim(camera: ArticulationCamera, rim: number, backZ = ARTICULATION_SHELL.z): string[] {
  const matrices: string[] = [];
  for (let index = 0; index <= rim; index += 1) {
    matrices.push(sliceMatrix([540, 520], 1, backZ + ((0 - backZ) * index) / rim, camera));
  }
  return matrices;
}
