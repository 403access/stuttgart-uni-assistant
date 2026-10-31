import type { ArticulationPose } from '../core';

/** The neutral pose an utterance starts from. */
export const APPROACH_POSE: ArticulationPose = {
  tongue: 'rest',
  lips: 'open',
  velum: 'raised',
  airflow: 'oral',
};
