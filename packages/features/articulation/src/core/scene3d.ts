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
  /** Extrusion thickness of the volume. */
  depth: number;
  /** Point the volume is scaled and depth-sorted around. */
  anchor: readonly [number, number];
  /** Extra rotation of the outline inside its plane (velum swing). */
  rotate?: number;
}

export interface ArticulationCamera {
  /** Horizontal turn, degrees. */
  yaw: number;
  /** Vertical tilt, degrees. */
  pitch: number;
}

/** The head shell: an open back plate plus the swept rim that closes it. */
export const ARTICULATION_SHELL = { z: -44, rim: 10, rimWidth: 4 } as const;

/** The model turns around the middle of the head, not around the origin. */
export const ARTICULATION_PIVOT = { x: 540, y: 515 } as const;

export const ARTICULATION_CAMERA: ArticulationCamera = { yaw: ARTICULATION_TURN.defaultAngle, pitch: 22 };

export const ARTICULATION_PITCH = { min: -32, max: 32, step: 10 } as const;

/** Placement of the fixed organs: depth, thickness and pivot. */
const STATIC: Record<string, { z: number; depth: number; anchor: [number, number] }> = {
  'nasal-cavity': { z: -10, depth: 16, anchor: [450, 360] },
  pharynx: { z: -12, depth: 16, anchor: [640, 560] },
  'oral-cavity': { z: -14, depth: 16, anchor: [430, 565] },
  'hard-palate': { z: 4, depth: 10, anchor: [400, 430] },
  'alveolar-ridge': { z: 6, depth: 8, anchor: [312, 452] },
  teeth: { z: 8, depth: 8, anchor: [290, 500] },
  'lower-jaw': { z: 0, depth: 14, anchor: [420, 700] },
  larynx: { z: -6, depth: 18, anchor: [658, 750] },
  trachea: { z: -10, depth: 16, anchor: [670, 890] },
};

const tone = (name: keyof typeof diagramPalette) => diagramPalette[name];

/** The fixed organs, in scene coordinates. */
export function articulationStaticLayers(): ArticulationSceneLayer[] {
  return articulationRegions.flatMap((region) => {
    const placement = STATIC[region.id];
    if (!placement || !region.path) return [];
    return [{ id: region.id, paths: [region.path], ...tone(region.tone ?? 'rose'), ...placement }];
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
      z: 4,
      depth: 6,
      anchor: [652, 755],
    },
    {
      id: 'tongue',
      paths: [tongueOutline(pose.tongue)],
      ...tone('tongue'),
      z: 12,
      depth: 30,
      anchor: [470, 560],
    },
    {
      id: 'velum',
      paths: velumOutlines,
      ...tone('violet'),
      z: 14,
      depth: 10,
      anchor: [545, 440],
      rotate: velumAngle(pose.velum),
    },
    {
      id: 'lips',
      paths: lipOutlines(pose.lips),
      ...tone('lip'),
      z: 20,
      depth: 15,
      anchor: [245, 545],
    },
  ];
}

/** The whole scene for one pose: fixed organs plus articulators. */
export function articulationScene(pose: ArticulationPose, voiced: boolean): ArticulationSceneLayer[] {
  return [...articulationStaticLayers(), ...articulationPoseLayers(pose, voiced)];
}

/** The skull outline the shell is built from. */
export { articulationBackdrop };

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
  const u = Math.cos(yaw);
  const v = Math.sin(yaw);
  const w = Math.sin(pitch);
  const q = Math.cos(pitch);
  const cx = ARTICULATION_PIVOT.x;
  const cy = ARTICULATION_PIVOT.y;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const x1 = u * dx + v * z;
  const z1 = -v * dx + u * z;
  return {
    x: cx + x1,
    y: cy + q * dy - w * z1,
    depth: w * dy + q * z1,
  };
}
