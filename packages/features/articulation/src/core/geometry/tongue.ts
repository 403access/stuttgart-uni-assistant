import type { TonguePose } from '../types';

/**
 * The tongue is one shape family: a handful of anchors per pose, interpolated
 * with a closed Catmull-Rom curve. Hand-authored cubic segments per pose would
 * be a lot of path strings and impossible to keep consistent.
 */
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

const BASE: TongueAnchors = {
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

const POSES: Record<TonguePose, Partial<TongueAnchors>> = {
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

const round = (value: number): number => Math.round(value * 10) / 10;

function smoothClosedPath(points: readonly Point[]): string {
  const count = points.length;
  const at = (index: number) => points[(index + count) % count];
  let path = `M${round(points[0][0])} ${round(points[0][1])}`;

  for (let index = 0; index < count; index += 1) {
    const previous = at(index - 1);
    const current = at(index);
    const next = at(index + 1);
    const after = at(index + 2);
    const c1x = current[0] + (next[0] - previous[0]) / 6;
    const c1y = current[1] + (next[1] - previous[1]) / 6;
    const c2x = next[0] - (after[0] - current[0]) / 6;
    const c2y = next[1] - (after[1] - current[1]) / 6;
    path += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(next[0])} ${round(next[1])}`;
  }

  return `${path} Z`;
}

const anchorsFor = (pose: TonguePose): TongueAnchors => ({ ...BASE, ...POSES[pose] });

/** Closed outline of the tongue for one pose, in figure coordinates. */
export function tongueOutline(pose: TonguePose): string {
  const anchors = anchorsFor(pose);
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
 * The tongue's upper surface at `x`. The airstream uses it to stay above the
 * tongue instead of disappearing inside it when the dorsum is raised.
 */
export function tongueSurface(pose: TonguePose, x: number): number {
  const anchors = anchorsFor(pose);
  const surface: Point[] = [anchors.tip, anchors.blade, anchors.front, anchors.mid, anchors.back];
  if (x <= surface[0][0]) return surface[0][1];
  for (let index = 0; index < surface.length - 1; index += 1) {
    const [x0, y0] = surface[index];
    const [x1, y1] = surface[index + 1];
    if (x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
  }
  return surface[surface.length - 1][1];
}
