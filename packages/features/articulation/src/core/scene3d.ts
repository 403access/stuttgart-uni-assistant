import type { ArticulationPose } from './types';

import {
  articulationBackdrop,
  articulationRegions,
  cordOutlines,
  lipOutlines,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from './geometry';
import { diagramPalette } from '@ua/quiz-content/figures/palette';

import { ARTICULATION_TURN } from './view3d';

/**
 * The studio's 3D scene. A sagittal section is flat by nature, so the model is
 * built like a cutaway anatomy model: the head is an open shell, and every
 * organ inside it is a rounded volume with its own depth.
 *
 * The depths are schematic — a teaching model, not a measured reconstruction.
 */

export interface ArticulationSceneLayer {
  id: string;
  /** One or more outlines drawn as one volume. */
  paths: string[];
  fill: string;
  stroke: string;
  /** Depth of the slab centre, positive towards the viewer. */
  z: number;
  /** How far the organ reaches behind the cut plane. */
  depth: number;
  /**
   * How much smaller the cross-section is at the far side. A lobe like the
   * tongue narrows a lot; a shelf like the hard palate hardly at all.
   */
  taper: number;
  /** Extra rotation of the outline inside its plane (velum swing). */
  rotate?: number;
  /** 2-D paint order; coplanar cut faces fall back to it. */
  order: number;
}

/** The three axes the learner can turn the model around. */
export type ArticulationAxis = 'x' | 'y' | 'z';

export interface ArticulationCamera {
  /** Roll around the view axis, degrees. */
  roll: number;
  /** Turn around the vertical axis, degrees. */
  yaw: number;
  /** Tilt around the horizontal axis, degrees. */
  pitch: number;
}

/**
 * The head shell. A real head is about 150 mm wide and 195 mm long, and this
 * drawing is 714 units long, so the half head behind the cut plane is roughly
 * 270 units deep. The far half narrows towards the side of the head — most of
 * all at the face — which is what makes the turned model read as a head
 * instead of a sheet.
 */
export const ARTICULATION_SHELL = {
  depth: 260,
  /** Tone bands between the cut face and the far side of the head. */
  rim: 26,
  /** How much narrower the far side is than the cut face. */
  taper: 0.26,
  /** How far the neck runs on below the 2-D cut, so the 3-D bands get clipped. */
  neck: 320,
} as const;

/** The model turns around the middle of the head, not around the origin. */
export const ARTICULATION_PIVOT = { x: 540, y: 515 } as const;

/**
 * Where the anatomy narrows as it recedes. Every organ's cross-sections shrink
 * towards the core of the head — near the back of the skull, not towards their
 * own centre — so a turned body recedes into the head instead of sliding
 * forwards with the camera.
 */
export const ARTICULATION_DEPTH = { x: 640, y: 540 } as const;

/**
 * The user turns the model on one axis only. The pitch is the camera's fixed
 * elevation: it is what makes a turned view read as 3D, and it never changes.
 */
export const ARTICULATION_CAMERA: ArticulationCamera = {
  yaw: ARTICULATION_TURN.defaultAngle,
  pitch: 22,
  roll: 0,
};

/** Read the camera angle that belongs to one axis. */
export function articulationAxisAngle(camera: ArticulationCamera, axis: ArticulationAxis): number {
  if (axis === 'x') return camera.pitch;
  if (axis === 'z') return camera.roll;
  return camera.yaw;
}

/** Write one axis angle without touching the other two. */
export function withArticulationAxis(
  camera: ArticulationCamera,
  axis: ArticulationAxis,
  angle: number,
): ArticulationCamera {
  if (axis === 'x') return { ...camera, pitch: angle };
  if (axis === 'z') return { ...camera, roll: angle };
  return { ...camera, yaw: angle };
}

/**
 * Placement of the fixed organs: how deep the tissue reaches behind the cut
 * plane, the pivot, and the 2-D paint order (all cut faces sit on the plane, so
 * ties are resolved by that order).
 */
interface Placement {
  depth: number;
  taper: number;
  order: number;
}

const STATIC: Record<string, Placement> = {
  'nasal-cavity': { depth: 110, taper: 0.22, order: 10 },
  pharynx: { depth: 110, taper: 0.28, order: 20 },
  'oral-cavity': { depth: 100, taper: 0.25, order: 30 },
  'hard-palate': { depth: 130, taper: 0.1, order: 50 },
  'alveolar-ridge': { depth: 90, taper: 0.16, order: 60 },
  teeth: { depth: 80, taper: 0.1, order: 70 },
  'lower-jaw': { depth: 170, taper: 0.14, order: 110 },
  larynx: { depth: 90, taper: 0.32, order: 120 },
  trachea: { depth: 60, taper: 0.12, order: 140 },
};

/** A volume starts at the cut plane and recedes by its depth. */
const behind = (depth: number) => -depth / 2;

const tone = (name: keyof typeof diagramPalette) => diagramPalette[name];

/** The fixed organs, in scene coordinates. */
export function articulationStaticLayers(): ArticulationSceneLayer[] {
  return articulationRegions.flatMap((region) => {
    const placement = STATIC[region.id];
    if (!placement || !region.path) return [];
    return [
      {
        id: region.id,
        paths: [region.path],
        ...tone(region.tone ?? 'rose'),
        ...placement,
        z: behind(placement.depth),
      },
    ];
  });
}

/** The articulators for one pose, as volumes. */
export function articulationPoseLayers(
  pose: ArticulationPose,
  voiced: boolean,
): ArticulationSceneLayer[] {
  return [
    {
      id: 'vocal-cords',
      paths: cordOutlines(voiced),
      ...tone('cords'),
      depth: 45,
      taper: 0.3,
      z: behind(45),
      order: 130,
    },
    {
      id: 'tongue',
      paths: [tongueOutline(pose.tongue)],
      ...tone('tongue'),
      depth: 120,
      taper: 0.28,
      z: behind(120),
      order: 40,
    },
    {
      id: 'velum',
      paths: velumOutlines,
      ...tone('violet'),
      depth: 90,
      taper: 0.3,
      z: behind(90),
      order: 90,
      rotate: velumAngle(pose.velum),
    },
    {
      id: 'lips',
      paths: lipOutlines(pose.lips),
      ...tone('lip'),
      depth: 90,
      taper: 0.4,
      z: behind(90),
      order: 80,
    },
  ];
}

/** The whole scene for one pose: fixed organs plus articulators. */
export function articulationScene(pose: ArticulationPose, voiced: boolean): ArticulationSceneLayer[] {
  return [...articulationStaticLayers(), ...articulationPoseLayers(pose, voiced)];
}

/**
 * A reference grid on the cut plane. It gives the turned model a spatial
 * frame — scale, the pivot lines — without competing with the anatomy.
 */
export const ARTICULATION_GRID = {
  step: 80,
  minX: 160,
  maxX: 920,
  minY: 40,
  maxY: 990,
  z: 0,
  pivotX: 540,
  pivotY: 515,
} as const;

export interface ArticulationGridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strong: boolean;
}

/** Grid lines projected through the scene camera. */
export function articulationGrid(camera: ArticulationCamera): ArticulationGridLine[] {
  const grid = ARTICULATION_GRID;
  const lines: ArticulationGridLine[] = [];
  for (let x: number = grid.minX; x <= grid.maxX; x += grid.step) {
    const top = projectScenePoint([x, grid.minY], grid.z, camera);
    const bottom = projectScenePoint([x, grid.maxY], grid.z, camera);
    lines.push({ x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y, strong: x === grid.pivotX });
  }
  for (let y: number = grid.minY; y <= grid.maxY; y += grid.step) {
    const left = projectScenePoint([grid.minX, y], grid.z, camera);
    const right = projectScenePoint([grid.maxX, y], grid.z, camera);
    lines.push({ x1: left.x, y1: left.y, x2: right.x, y2: right.y, strong: y === grid.pivotY });
  }
  return lines;
}

/** The skull outline the shell is built from. */
export { articulationBackdrop };

/**
 * The skull outline with the neck carried down past the 3D frame. The 2-D
 * figure ends the neck on a flat cut, which would turn the shell's bands into a
 * staircase as they recede; in 3D the neck simply runs out of the picture.
 */
export const articulationShellOutline: string[] = articulationBackdrop.map((d) =>
  d.replace(
    'L806 986',
    `L526 ${986 + ARTICULATION_SHELL.neck} L806 ${986 + ARTICULATION_SHELL.neck} L806 986`,
  ),
);

/**
 * Projection of a direction (no position), e.g. one axis of the gizmo. Same
 * camera as `projectScenePoint`, without the translation.
 */
export function projectSceneDirection(
  direction: readonly [number, number, number],
  camera: ArticulationCamera,
): { x: number; y: number } {
  const yaw = (camera.yaw * Math.PI) / 180;
  const pitch = (camera.pitch * Math.PI) / 180;
  const roll = (camera.roll * Math.PI) / 180;
  const u = Math.cos(yaw);
  const v = Math.sin(yaw);
  const w = Math.sin(pitch);
  const q = Math.cos(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const [dx, dy, dz] = direction;
  // turn, then tilt, then roll the finished image around the view axis
  const x1 = u * dx + v * dz;
  const z1 = -v * dx + u * dz;
  const x2 = x1;
  const y2 = q * dy - w * z1;
  return { x: cr * x2 - sr * y2, y: sr * x2 + cr * y2 };
}

/**
 * Orthographic projection of a point at depth `z`. The camera looks from a
 * three-quarter angle: yaw turns the model, pitch tilts it.
 */
export function projectScenePoint(
  point: readonly [number, number],
  z: number,
  camera: ArticulationCamera,
): { x: number; y: number; depth: number } {
  const yaw = (camera.yaw * Math.PI) / 180;
  const pitch = (camera.pitch * Math.PI) / 180;
  const roll = (camera.roll * Math.PI) / 180;
  const u = Math.cos(yaw);
  const v = Math.sin(yaw);
  const w = Math.sin(pitch);
  const q = Math.cos(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cx = ARTICULATION_PIVOT.x;
  const cy = ARTICULATION_PIVOT.y;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  // turn and tilt, then roll the finished image around the view axis
  const x1 = u * dx + v * z;
  const z1 = -v * dx + u * z;
  const x2 = x1;
  const y2 = q * dy - w * z1;
  return {
    x: cx + cr * x2 - sr * y2,
    y: cy + sr * x2 + cr * y2,
    depth: w * dy + q * z1,
  };
}
