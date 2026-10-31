import type { ArticulationCamera, ArticulationSceneLayer } from '../core';
import {
  ARTICULATION_DEPTH,
  ARTICULATION_PIVOT,
  ARTICULATION_SHELL,
  VELUM_HINGE,
  shadeColor,
} from '../core';

/** How many cross-sections make a volume look rounded. */
export const SCENE_SLICES = 32;

/** Roughly how far an outline reaches from the depth centre, in scene units. */
const VOLUME_REACH = 420;

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
  /** Vertical scale, when the outline should narrow only front-to-back. */
  scaleY: number = scale,
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
  const y0 = cy - py - scaleY * cy;
  const a0 = scale * u;
  const b0 = scale * v * w;
  const d0 = scaleY * q;
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
  const [ax, ay] = [ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y];
  const depth = (layer: ArticulationSceneLayer) =>
    w * (ay - ARTICULATION_PIVOT.y) +
    q * (-v * (ax - ARTICULATION_PIVOT.x) + u * (layer.z + layer.depth / 2));
  return [...layers].sort((left, right) => depth(left) - depth(right) || left.order - right.order);
}

/**
 * The cut faces, in the order the flat figure paints them. Every face sits on
 * the same plane, so the anatomical order is the only correct one — and all
 * faces are drawn on top of all bodies, since a cut face is the frontmost
 * surface wherever it exists.
 */
export function faceOrder(layers: ArticulationSceneLayer[]): ArticulationSceneLayer[] {
  return [...layers].sort((left, right) => left.order - right.order);
}

export interface VolumeSlice {
  matrix: string;
  /** 0 just under the cut face, 1 at the far side of the organ. */
  back: number;
}

/**
 * The cross-sections of a volume, far to near. Each one is smaller than the
 * last — an organ is a lobe, not a prism — so the swept body has a shape of its
 * own instead of repeating the 2-D outline.
 */
export function volumeSlices(
  layer: ArticulationSceneLayer,
  camera: ArticulationCamera,
  count: number = SCENE_SLICES,
): VolumeSlice[] {
  const slices: VolumeSlice[] = [];
  for (let index = 0; index < count; index += 1) {
    const back = 1 - index / count;
    const scale = 1 - layer.taper * back ** 1.2;
    slices.push({
      matrix: sliceMatrix(
        [ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y],
        scale,
        layer.z + layer.depth / 2 - layer.depth * back,
        camera,
      ),
      back,
    });
  }
  return slices;
}

/**
 * How far one cross-section lands from the next, in scene units. Drawing the
 * bands that wide fuses them into a surface instead of leaving slivers, and it
 * shrinks to nothing head-on, where there are no gaps to close.
 */
export function volumeBandWidth(
  layer: ArticulationSceneLayer,
  camera: ArticulationCamera,
  count: number = SCENE_SLICES,
): number {
  const yaw = rad(camera.yaw);
  const pitch = rad(camera.pitch);
  const spread = Math.hypot(Math.sin(yaw), Math.sin(pitch) * Math.cos(yaw));
  // The projected depth step, plus the inward step of the taper.
  return ((layer.depth / count) * spread + (layer.taper * VOLUME_REACH) / count) * 2.2;
}

/** Transform of the lit face, which sits at the near side of the volume. */
export function faceMatrix(layer: ArticulationSceneLayer, camera: ArticulationCamera): string {
  return sliceMatrix([ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y], 1, layer.z + layer.depth / 2, camera);
}

/** Rotation of the outline inside its plane, e.g. the velum swing. */
export function layerRotation(layer: ArticulationSceneLayer): string {
  return layer.rotate ? `rotate(${layer.rotate} ${VELUM_HINGE.x} ${VELUM_HINGE.y})` : '';
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
      // A head is shorter front-to-back on its far side, not shorter overall:
      // scaling y as well would make the turned head sink into the neck.
      matrix: sliceMatrix([ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y], scale, -depth * back, camera, 1),
      scale,
      z: -depth * back,
      back,
    });
  }
  return slices;
}

