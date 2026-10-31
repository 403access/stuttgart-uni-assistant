export type {
  AirflowLane,
  ArticulationAirflow,
  ArticulationManner,
  ArticulationPhase,
  ArticulationPhaseId,
  ArticulationPhaseWindow,
  ArticulationPlace,
  ArticulationPose,
  ArticulationSound,
  LipPose,
  TonguePose,
  VelumPose,
} from './types';

export { articulationPhaseWindows, articulationPhases } from './phases';
export {
  articulationGroups,
  articulationMannerOrder,
  articulationSounds,
  findArticulationSound,
  studioSoundForTopic,
} from './sounds';
export { mannerLabels, placeLabels } from './labels';
export { buildArticulationSiteData } from './site';
export type { ArticulationSiteData, ArticulationSitePhase, ArticulationSiteSound } from './site';

export {
  airflowFocusT,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  cordOutlines,
  HEAD_VIEW_BOX,
  lipOutlines,
  pointPercent,
  tongueOutline,
  tongueSurface,
  velumAngle,
  velumOutlines,
  VELUM_HINGE,
} from './geometry';

export {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_SLAB,
  articulationBlockTransform,
  articulationTurn,
  clampArticulationAngle,
  projectArticulationPoint,
  shadeColor,
} from './view3d';
export type { ArticulationTurn } from './view3d';
