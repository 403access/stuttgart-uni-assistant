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
export {
  ARTICULATION_CAMERA,
  ARTICULATION_PIVOT,
  ARTICULATION_GRID,
  ARTICULATION_SHELL,
  articulationAxisAngle,
  articulationGrid,
  withArticulationAxis,
  articulationScene,
  articulationPoseLayers,
  articulationShellOutline,
  articulationStaticLayers,
  projectSceneDirection,
  projectScenePoint,
} from './scene3d';
export type {
  ArticulationAxis,
  ArticulationCamera,
  ArticulationGridLine,
  ArticulationSceneLayer,
} from './scene3d';
export { ARTICULATION_CANVASES, ARTICULATION_GRID_TONES, ARTICULATION_SURFACE, articulationStage } from './surface';
export type {
  ArticulationCanvas,
  ArticulationCanvasOption,
  ArticulationGridTone,
  ArticulationGridToneOption,
  ArticulationStage,
} from './surface';
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
  ARTICULATION_TURN,
  wrapArticulationAngle,
  shadeColor,
} from './view3d';
