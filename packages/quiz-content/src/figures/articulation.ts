import type {
  AirflowLane,
  ArticulationPose,
  ArticulationSound,
  DiagramRegion,
  LipPose,
  TonguePose,
  VelumPose,
} from '../types.ts';

import { HEAD_VIEW_BOX, roundRect, vocalTractFigure, vocalTractRegions } from './vocal-tract';

/**
 * Geometry for the articulation studio: the same sagittal head as the quiz
 * diagram, but with the movable articulators (tongue, lips, velum, uvula and
 * vocal cords) drawn separately so they can change shape per sound.
 *
 * The static parts come straight from `vocalTractRegions`, so a label, a tap
 * target and the animated version can never drift apart.
 */

export { HEAD_VIEW_BOX };

/** Regions that do not move while a sound is produced. */
const FIXED_REGION_IDS = new Set([
  'nasal-cavity',
  'pharynx',
  'oral-cavity',
  'hard-palate',
  'alveolar-ridge',
  'teeth',
  'lower-jaw',
  'larynx',
  'trachea',
]);

export const articulationRegions: DiagramRegion[] = vocalTractRegions.filter((region) =>
  FIXED_REGION_IDS.has(region.id),
);

export const articulationBackdrop: string[] = vocalTractFigure.backdrop;

/** Velum and uvula hang from this point and swing around it. */
export const VELUM_HINGE = { x: 492, y: 405 };

export function velumAngle(pose: VelumPose): number {
  return pose === 'lowered' ? 16 : 0;
}

/** Velum + uvula outlines, drawn as one rotating group. */
export const velumOutlines: string[] = ['velum', 'uvula']
  .map((id) => vocalTractRegions.find((region) => region.id === id)?.path)
  .filter((path): path is string => Boolean(path));

export function cordOutlines(voiced: boolean): string[] {
  if (voiced) return ['M626 748 L678 754 L678 762 L626 756 Z'];
  return ['M624 744 L678 752 L678 756 L624 748 Z', 'M624 762 L678 770 L678 774 L624 766 Z'];
}

type Point = readonly [number, number];

interface TongueAnchors {
  /** Tongue tip behind the teeth. */
  tip: Point;
  /** Blade, just behind the tip. */
  blade: Point;
  /** Front of the dorsum. */
  front: Point;
  /** Middle of the dorsum, under the hard palate. */
  mid: Point;
  /** Back of the dorsum, under the velum. */
  back: Point;
  /** Root, against the pharynx wall. */
  root: Point;
  bottomBack: Point;
  bottomMid: Point;
  bottomFront: Point;
  bottomTip: Point;
}

const TONGUE_BASE: TongueAnchors = {
  tip: [300, 566],
  blade: [352, 540],
  front: [430, 522],
  mid: [502, 524],
  back: [570, 550],
  root: [626, 604],
  bottomBack: [616, 648],
  bottomMid: [500, 626],
  bottomFront: [396, 598],
  bottomTip: [322, 580],
};

const TONGUE_POSES: Record<TonguePose, Partial<TongueAnchors>> = {
  rest: {},
  dental: { tip: [304, 512], blade: [352, 522] },
  alveolar: { tip: [320, 488], blade: [358, 514], front: [432, 524] },
  postalveolar: { tip: [338, 498], blade: [376, 496], front: [448, 516], mid: [510, 524] },
  palatal: { tip: [300, 570], blade: [350, 544], front: [432, 504], mid: [514, 480], back: [578, 520] },
  velar: {
    tip: [300, 578],
    blade: [352, 560],
    front: [432, 548],
    mid: [508, 520],
    back: [574, 478],
    root: [620, 570],
    bottomBack: [614, 640],
  },
  'high-front': { tip: [300, 568], blade: [352, 534], front: [436, 462], mid: [512, 506], back: [576, 546] },
  'near-high-front': { tip: [300, 570], blade: [352, 540], front: [440, 492], mid: [512, 516], back: [576, 550] },
  'low-front': { tip: [298, 576], blade: [352, 556], front: [432, 540], mid: [504, 546], back: [572, 566] },
  'mid-central': { tip: [300, 572], blade: [352, 546], front: [430, 534], mid: [504, 536], back: [572, 558] },
  'high-back': { tip: [300, 570], blade: [352, 550], front: [432, 540], mid: [506, 510], back: [574, 480] },
  'low-back': {
    tip: [300, 578],
    blade: [352, 560],
    front: [432, 550],
    mid: [504, 552],
    back: [574, 566],
    root: [626, 606],
  },
  low: {
    tip: [298, 580],
    blade: [352, 562],
    front: [432, 556],
    mid: [504, 560],
    back: [572, 574],
    root: [626, 612],
    bottomBack: [618, 668],
    bottomMid: [500, 656],
    bottomFront: [390, 626],
    bottomTip: [318, 598],
  },
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Closed Catmull-Rom curve through the anchors. Hand-authored cubic segments
 * per pose would be a lot of path strings; interpolating a handful of anchors
 * keeps every tongue position on the same shape family.
 */
function smoothClosedPath(points: readonly Point[]): string {
  const count = points.length;
  const at = (index: number) => points[(index + count) % count];
  let path = `M${round(points[0][0])} ${round(points[0][1])}`;

  for (let index = 0; index < count; index += 1) {
    const previous = at(index - 1);
    const current = at(index);
    const next = at(index + 1);
    const after = at(index + 2);
    const control1x = current[0] + (next[0] - previous[0]) / 6;
    const control1y = current[1] + (next[1] - previous[1]) / 6;
    const control2x = next[0] - (after[0] - current[0]) / 6;
    const control2y = next[1] - (after[1] - current[1]) / 6;
    path += `C${round(control1x)} ${round(control1y)} ${round(control2x)} ${round(control2y)} ${round(next[0])} ${round(next[1])}`;
  }

  return `${path} Z`;
}

export function tongueOutline(pose: TonguePose): string {
  const anchors = { ...TONGUE_BASE, ...TONGUE_POSES[pose] };
  return smoothClosedPath([
    anchors.tip,
    anchors.blade,
    anchors.front,
    anchors.mid,
    anchors.back,
    anchors.root,
    anchors.bottomBack,
    anchors.bottomMid,
    anchors.bottomFront,
    anchors.bottomTip,
  ]);
}

/**
 * Lip pads. Each pose is two rounded rectangles — the real anatomy is more
 * complex, but the pads are what the quiz figure already shows, and their
 * distance, protrusion and height carry the articulation.
 */
const LIP_SHAPES: Record<LipPose, [number, number, number, number][]> = {
  open: [
    [236, 506, 32, 42],
    [234, 556, 32, 38],
  ],
  closed: [
    [237, 512, 31, 36],
    [235, 548, 31, 36],
  ],
  round: [
    [222, 504, 26, 44],
    [220, 556, 26, 40],
  ],
  spread: [
    [246, 512, 36, 26],
    [244, 562, 36, 24],
  ],
  labiodental: [
    [237, 508, 31, 40],
    [250, 530, 26, 26],
  ],
};

export function lipOutlines(pose: LipPose): string[] {
  return LIP_SHAPES[pose].map(([x, y, width, height]) => roundRect(x, y, width, height, 12));
}

/** Where the airstream is shaped, in figure coordinates (used for the focus ring). */
const PLACE_FOCUS = {
  bilabial: [250, 545],
  labiodental: [264, 522],
  dental: [304, 500],
  alveolar: [322, 486],
  postalveolar: [356, 492],
  palatal: [520, 486],
  velar: [578, 482],
  glottal: [654, 760],
} as const satisfies Record<string, Point>;

const VOWEL_FOCUS: Record<TonguePose, Point> = {
  rest: [430, 540],
  dental: [430, 540],
  alveolar: [430, 540],
  postalveolar: [430, 540],
  palatal: [514, 486],
  velar: [540, 500],
  'high-front': [440, 478],
  'near-high-front': [446, 506],
  'low-front': [440, 552],
  'mid-central': [470, 534],
  'high-back': [566, 496],
  'low-back': [500, 558],
  low: [460, 562],
};

export function articulationFocus(sound: ArticulationSound): Point {
  if (sound.place) return PLACE_FOCUS[sound.place];
  return VOWEL_FOCUS[sound.pose.tongue];
}

/**
 * The tongue's upper surface at `x`, interpolated between the pose anchors. The
 * airstream uses it to stay above the tongue instead of disappearing inside it
 * when the dorsum is raised.
 */
export function tongueSurface(pose: TonguePose, x: number): number {
  const anchors = { ...TONGUE_BASE, ...TONGUE_POSES[pose] };
  const surface: Point[] = [anchors.tip, anchors.blade, anchors.front, anchors.mid, anchors.back];
  if (x <= surface[0][0]) return surface[0][1];
  for (let index = 0; index < surface.length - 1; index += 1) {
    const [x0, y0] = surface[index];
    const [x1, y1] = surface[index + 1];
    if (x <= x1) {
      const ratio = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * ratio;
    }
  }
  return surface[surface.length - 1][1];
}

/** Air rises from the lungs through the trachea and larynx into the pharynx. */
const AIRFLOW_SOURCE: Point[] = [
  [668, 946],
  [668, 880],
  [664, 822],
  [660, 776],
  [654, 716],
  [650, 650],
  [640, 592],
];

/**
 * Airstream lanes, authored as polylines in figure coordinates. The studio
 * lights them up as a travelling wave, so the air visibly rises from the lungs
 * and leaves through the mouth or the nose.
 */
export function airflowLane(lane: AirflowLane, pose: ArticulationPose): Point[] {
  if (lane === 'nasal') {
    return [
      ...AIRFLOW_SOURCE,
      [622, 536],
      [606, 494],
      [580, 440],
      [520, 396],
      [444, 372],
      [368, 374],
      [304, 398],
      [262, 430],
      [246, 446],
    ];
  }

  // Mouth route: follow the tongue dorsum with a little clearance and exit
  // between the lips.
  const dorsum = [560, 490, 420, 360].map(
    (x) => [x, Math.min(tongueSurface(pose.tongue, x) - 20, 552)] as Point,
  );
  return [
    ...AIRFLOW_SOURCE,
    [608, 556],
    ...dorsum,
    [312, 536],
    [268, 542],
    [246, 546],
  ];
}

/** Fraction of the figure width/height for a point, for absolutely placed overlays. */
export function pointPercent(point: Point): { left: string; top: string } {
  const [minX, minY, width, height] = HEAD_VIEW_BOX.split(/[\s,]+/).map(Number);
  const left = ((point[0] - minX) / width) * 100;
  const top = ((point[1] - minY) / height) * 100;
  return { left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%` };
}
