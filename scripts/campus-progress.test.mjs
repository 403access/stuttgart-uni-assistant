import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CAMPUS_LOGIN_PHASES,
  isLoginFailureStep,
  isPhaseDone,
  phaseForStep,
  phaseIndexForStep,
} from '../src/auth/campus-progress.ts';

/**
 * The waiting UI keeps its promise only if the phase mapping is right: a wrong
 * step-to-phase mapping would show a completed sign-in as still connecting, or
 * jump the progress backwards on a page the script reports twice.
 */

test('the phases are ordered from connect to profile', () => {
  assert.deepEqual([...CAMPUS_LOGIN_PHASES], ['connect', 'identify', 'adopt', 'profile']);
  assert.ok(phaseIndexForStep('no-form') < phaseIndexForStep('filled'));
  assert.ok(phaseIndexForStep('filled') < phaseIndexForStep('signed-in'));
});

test('page-script steps map to the phase they belong to', () => {
  assert.equal(phaseForStep('idle'), 'connect');
  assert.equal(phaseForStep('probe'), 'connect');
  assert.equal(phaseForStep('no-form'), 'connect');
  for (const step of ['sso-click', 'cta-click', 'filled', 'waiting']) {
    assert.equal(phaseForStep(step), 'identify', `${step} is part of the sign-in itself`);
  }
  assert.equal(phaseForStep('signed-in'), 'adopt');
});

test('an unknown step never moves the progress backwards', () => {
  assert.equal(phaseForStep('something-new'), 'connect');
  assert.equal(phaseIndexForStep('something-new'), 0);
});

test('failure steps are terminal and carry no phase', () => {
  for (const step of ['rejected', 'too-many-attempts', 'submit-failed', 'error']) {
    assert.equal(isLoginFailureStep(step), true, `${step} must stop the flow`);
  }
  for (const step of ['filled', 'signed-in', 'no-form', 'waiting']) {
    assert.equal(isLoginFailureStep(step), false, `${step} is progress, not a failure`);
  }
});

test('completion is strictly behind the current phase', () => {
  assert.equal(isPhaseDone('connect', 'identify'), true);
  assert.equal(isPhaseDone('connect', 'connect'), false);
  assert.equal(isPhaseDone('profile', 'identify'), false);
  assert.equal(isPhaseDone('adopt', 'profile'), true);
});
