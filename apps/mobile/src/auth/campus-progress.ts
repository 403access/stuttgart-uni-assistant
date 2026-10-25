/**
 * Phases of a sign-in, in order. Pure data: no React Native import, so the
 * mapping from a page-script step to a phase is unit-testable.
 */

export const CAMPUS_LOGIN_PHASES = ['connect', 'identify', 'adopt', 'profile'] as const;

export type CampusLoginPhase = (typeof CAMPUS_LOGIN_PHASES)[number];

/**
 * The page script reports these steps (`headlessAutofillScript` in
 * campus-browser-scripts.ts) plus the app's own states. Mapping:
 *
 *  - connect: still booting the C@MPUS shell, nothing to show yet
 *  - identify: taking the st-account entry, or filling and submitting the form
 *  - adopt: the portal accepted it, the session is being harvested and handed over
 *  - profile: the server is loading the studies and the curriculum
 */
const STEP_PHASES: Record<string, CampusLoginPhase> = {
  idle: 'connect',
  probe: 'connect',
  'no-form': 'connect',
  'cta-click': 'identify',
  'sso-click': 'identify',
  waiting: 'identify',
  filled: 'identify',
  'signed-in': 'adopt',
};

/** A stop reason: the flow ends here and the caller shows the message. */
export const LOGIN_FAILURE_STEPS = ['rejected', 'too-many-attempts', 'submit-failed', 'error'] as const;

export function isLoginFailureStep(step: string): boolean {
  return (LOGIN_FAILURE_STEPS as readonly string[]).includes(step);
}

export function phaseIndexForStep(step: string): number {
  const phase = STEP_PHASES[step];
  return phase ? CAMPUS_LOGIN_PHASES.indexOf(phase) : 0;
}

export function phaseForStep(step: string): CampusLoginPhase {
  return CAMPUS_LOGIN_PHASES[phaseIndexForStep(step)];
}

export function isPhaseDone(phase: CampusLoginPhase, current: CampusLoginPhase): boolean {
  return CAMPUS_LOGIN_PHASES.indexOf(phase) < CAMPUS_LOGIN_PHASES.indexOf(current);
}
