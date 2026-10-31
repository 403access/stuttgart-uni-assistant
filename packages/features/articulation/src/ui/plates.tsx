import { G, Path } from 'react-native-svg';

import { diagramTone } from '@ua/quiz-content/figures/palette';

import type { ArticulationPose } from '../core';
import {
  ARTICULATION_SLAB,
  VELUM_HINGE,
  articulationTurn,
  cordOutlines,
  lipOutlines,
  shadeColor,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from '../core';

/**
 * The movable articulators as extruded plates, drawn inside the block's
 * transform. Each plate is four offset copies (its side wall) plus the face.
 */
export function Plates({
  pose,
  voiced,
  angle,
}: {
  pose: ArticulationPose;
  voiced: boolean;
  angle: number;
}) {
  const turn = articulationTurn(angle);

  const plate = (
    paths: string[],
    lift: number,
    thickness: number,
    tone: 'cords' | 'tongue' | 'violet' | 'lip',
    rotate?: string,
  ) => {
    const { fill, stroke } = diagramTone(tone);
    const side = shadeColor(fill, 0.3);
    return (
      <G transform={`translate(${(lift * turn.sin).toFixed(2)} 0)${rotate ? ` ${rotate}` : ''}`}>
        {Array.from({ length: 4 }, (_, index) => 4 - index).map((step) => (
          <G key={`wall-${step}`} transform={`translate(${(-turn.sin * thickness * (step / 4)).toFixed(2)} 0)`}>
            {paths.map((d, index) => (
              <Path key={`wall-${step}-${index}`} d={d} fill={side} stroke={side} strokeWidth={1} strokeLinejoin="round" />
            ))}
          </G>
        ))}
        {paths.map((d, index) => (
          <Path key={`face-${index}`} d={d} fill={fill} stroke={stroke} strokeWidth={2.4} strokeLinejoin="round" />
        ))}
      </G>
    );
  };

  return (
    <>
      {plate(cordOutlines(voiced), ARTICULATION_SLAB.cords, 6, 'cords')}
      {plate([tongueOutline(pose.tongue)], ARTICULATION_SLAB.tongue, 14, 'tongue')}
      {plate(
        velumOutlines,
        ARTICULATION_SLAB.velum,
        8,
        'violet',
        `rotate(${velumAngle(pose.velum)} ${VELUM_HINGE.x} ${VELUM_HINGE.y})`,
      )}
      {plate(lipOutlines(pose.lips), ARTICULATION_SLAB.lips, 10, 'lip')}
    </>
  );
}
