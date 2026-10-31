import Svg, { G, Path } from 'react-native-svg';

import { diagramTone } from '@ua/quiz-content/figures/palette';

import type { ArticulationPose } from '../core';
import {
  HEAD_VIEW_BOX,
  VELUM_HINGE,
  cordOutlines,
  lipOutlines,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from '../core';

/** The movable articulators of the flat figure, drawn over the static anatomy. */
export function PoseArt({ pose, voiced }: { pose: ArticulationPose; voiced: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox={HEAD_VIEW_BOX}>
      <G transform={`rotate(${velumAngle(pose.velum)} ${VELUM_HINGE.x} ${VELUM_HINGE.y})`}>
        {velumOutlines.map((d, index) => (
          <Path
            key={`velum-${index}`}
            d={d}
            fill={diagramTone('violet').fill}
            stroke={diagramTone('violet').stroke}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ))}
      </G>
      <Path
        d={tongueOutline(pose.tongue)}
        fill={diagramTone('tongue').fill}
        stroke={diagramTone('tongue').stroke}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {lipOutlines(pose.lips).map((d, index) => (
        <Path
          key={`lips-${index}`}
          d={d}
          fill={diagramTone('lip').fill}
          stroke={diagramTone('lip').stroke}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      ))}
      {cordOutlines(voiced).map((d, index) => (
        <Path
          key={`cords-${index}`}
          d={d}
          fill={diagramTone('cords').fill}
          stroke={diagramTone('cords').stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
