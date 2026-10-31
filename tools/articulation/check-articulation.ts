import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_CAMERA,
  ARTICULATION_SHELL,
  ARTICULATION_TURN,
  airflowLane,
  articulationFocus,
  articulationGroups,
  articulationPhaseWindows,
  articulationPhases,
  articulationSounds,
  buildArticulationSiteData,
  findArticulationSound,
  lipOutlines,
  projectScenePoint,
  shadeColor,
  studioSoundForTopic,
  wrapArticulationAngle,
  tongueOutline,
} from '@ua/feature-articulation';
import { readArticulationSiteSnapshot } from './export-articulation-site.ts';

/**
 * Checks for the articulation studio: the sound catalog, its phases, the pose
 * geometry, the 3D frame, the topic links and the snapshot the website ships.
 *
 *   bun run check:articulation
 */
const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
    console.error('FAIL', message);
  } else {
    console.log('ok', message);
  }
}
// The articulation studio animates the same head as the diagram questions.
// These checks keep the sound catalog, the pose geometry and the topic links in
// step — a broken path would render as an empty SVG instead of failing loudly.
const soundIds = new Set<string>();
for (const sound of articulationSounds) {
  expect(!soundIds.has(sound.id), `articulation sound id is unique: ${sound.id}`);
  soundIds.add(sound.id);
  expect(sound.glyph.trim().length > 0, `articulation sound has a glyph: ${sound.id}`);
  expect(Boolean(sound.word.de && sound.word.en), `articulation word is bilingual: ${sound.id}`);
  expect(Boolean(sound.summary.de && sound.summary.en), `articulation summary is bilingual: ${sound.id}`);
  if (sound.manner === 'vowel') {
    expect(Boolean(sound.shape?.de && sound.shape?.en), `vowel has a shape description: ${sound.id}`);
    expect(!sound.place, `vowel has no consonant place: ${sound.id}`);
  } else {
    expect(Boolean(sound.place), `consonant has a place: ${sound.id}`);
    expect(!sound.shape, `consonant has no vowel shape: ${sound.id}`);
  }

  const nasal = sound.manner === 'nasal';
  expect(
    sound.pose.velum === (nasal ? 'lowered' : 'raised'),
    `velum matches the manner: ${sound.id}`,
  );
  expect(
    sound.pose.airflow === (nasal ? 'nasal' : 'oral'),
    `airstream matches the manner: ${sound.id}`,
  );
  if (nasal) expect(sound.voiced, `nasal is voiced: ${sound.id}`);
  if (sound.manner === 'vowel') expect(sound.voiced, `vowel is voiced: ${sound.id}`);

  const tongue = tongueOutline(sound.pose.tongue);
  expect(!/NaN|Infinity/.test(tongue), `tongue outline is numeric: ${sound.id}`);
  expect(tongue.startsWith('M') && tongue.endsWith('Z'), `tongue outline is a closed path: ${sound.id}`);

  const lips = lipOutlines(sound.pose.lips);
  expect(lips.length === 2, `lips have two pads: ${sound.id}`);
  expect(lips.every((path) => path.startsWith('M') && !/NaN/.test(path)), `lip pads are drawable: ${sound.id}`);

  const lane = airflowLane(sound.pose.airflow, sound.pose);
  expect(lane.length >= 8, `airstream lane has enough points: ${sound.id}`);
  expect(
    lane.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
    `airstream lane is numeric: ${sound.id}`,
  );
  const focus = articulationFocus(sound);
  expect(
    Number.isFinite(focus[0]) && Number.isFinite(focus[1]),
    `articulation focus is numeric: ${sound.id}`,
  );

  // The studio tells the production story in phases, so every sound needs a
  // complete, well-formed set: approach first, a closure for a stop, and a
  // weighable duration per phase (the player normalises the weights).
  const phases = articulationPhases(sound);
  expect(phases.length > 0, `articulation phases exist: ${sound.id}`);
  expect(
    phases.every((phase) => phase.weight > 0),
    `articulation phase weights are positive: ${sound.id}`,
  );
  expect(
    phases.every((phase) => Boolean(phase.label.de && phase.label.en && phase.detail.de && phase.detail.en)),
    `articulation phases are bilingual: ${sound.id}`,
  );
  expect(phases[0].id === 'approach' || phases[0].id === 'flow', `articulation starts with movement or flow: ${sound.id}`);
  if (sound.manner === 'stop' || sound.manner === 'nasal') {
    expect(
      phases.some((phase) => phase.id === 'closure'),
      `stop and nasal sounds close the tract: ${sound.id}`,
    );
  }
  if (sound.manner === 'stop') {
    expect(
      phases.some((phase) => phase.id === 'release'),
      `stop sounds release the closure: ${sound.id}`,
    );
    expect(
      phases.some((phase) => phase.id === 'aspiration') === !sound.voiced,
      `only voiceless stops aspirate: ${sound.id}`,
    );
  }
  if (sound.manner === 'nasal') {
    expect(
      phases.find((phase) => phase.id === 'closure')?.airflow === 'nasal',
      `nasal closure routes the air through the nose: ${sound.id}`,
    );
  }
  const windows = articulationPhaseWindows(sound);
  expect(
    windows.length === phases.length &&
      Math.abs(windows[windows.length - 1].end - 1) < 1e-9 &&
      windows.every((window, index) => index === 0 || Math.abs(window.start - windows[index - 1].end) < 1e-9),
    `articulation phase windows tile the cycle: ${sound.id}`,
  );
}

expect(
  articulationGroups.every((group) => group.sounds.length > 0),
  'every articulation manner group has sounds',
);
expect(
  articulationGroups.reduce((count, group) => count + group.sounds.length, 0) === articulationSounds.length,
  'articulation groups cover every sound exactly once',
);

// The 3D view turns the same figure into a block. At the extreme angles every
// airstream point still has to land inside the padded frame, otherwise the
// model would be clipped while the learner rotates it.
const box = ARTICULATION_3D_VIEW_BOX.split(' ').map(Number);
const [boxX, boxY, boxWidth, boxHeight] = box;
const extremeAngles = [
  ARTICULATION_TURN.minAngle,
  -90,
  ARTICULATION_TURN.defaultAngle,
  90,
  ARTICULATION_TURN.maxAngle,
];
expect(
  extremeAngles.every((angle) => {
    const point = projectScenePoint([540, 515], 0, { yaw: angle, pitch: ARTICULATION_CAMERA.pitch });
    return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.depth);
  }),
  'articulation 3D camera is finite at every angle',
);
expect(
  ARTICULATION_TURN.minAngle < ARTICULATION_TURN.defaultAngle &&
    ARTICULATION_TURN.defaultAngle < ARTICULATION_TURN.maxAngle,
  'articulation 3D default angle sits inside the range',
);
expect(wrapArticulationAngle(370) === 10, 'articulation 3D wraps a full turn');
expect(wrapArticulationAngle(-370) === -10, 'articulation 3D wraps backwards');
expect(wrapArticulationAngle(180) === 180, 'articulation 3D keeps the half turn');
expect(
  Object.values(ARTICULATION_TURN.presets).every((preset) => preset >= ARTICULATION_TURN.minAngle && preset <= ARTICULATION_TURN.maxAngle),
  'articulation 3D presets sit inside the full turn',
);
expect(shadeColor('#FFFDF9') !== '#FFFDF9', 'articulation 3D shades the side wall');
expect(/^#[0-9a-f]{6}$/.test(shadeColor('#FFFDF9')), 'articulation 3D shading is a hex colour');

for (const sound of articulationSounds) {
  for (const yaw of extremeAngles) {
    {
      const pitch = ARTICULATION_CAMERA.pitch;
      const lane = airflowLane(sound.pose.airflow, sound.pose);
      const focus = articulationFocus(sound);
      const points = [
        ...lane.map((point) => projectScenePoint(point, 10, { yaw, pitch })),
        projectScenePoint(focus, 20, { yaw, pitch }),
        // points on the head shell, which is the outer bound of the model
        ...([[186, 500], [600, 68], [900, 486], [806, 986], [258, 660]] as const).map((corner) =>
          projectScenePoint(corner, ARTICULATION_SHELL.z, { yaw, pitch }),
        ),
      ];
      expect(
        points.every(
          (point) =>
            point.x >= boxX &&
            point.x <= boxX + boxWidth &&
            point.y >= boxY &&
            point.y <= boxY + boxHeight,
        ),
        `articulation 3D stays inside the frame: ${sound.id} at ${yaw}°`,
      );
    }
  }
}


// The marketing site ships a committed snapshot of the studio (no build step),
// so a content change without `bun run site:articulation` would leave the demo
// showing sounds the app no longer has.
const siteSnapshot = readArticulationSiteSnapshot(
  readFileSync(resolve('apps/site/assets/articulation.js'), 'utf8'),
);
expect(Boolean(siteSnapshot), 'site articulation snapshot parses');
expect(
  JSON.stringify(siteSnapshot) === JSON.stringify(buildArticulationSiteData()),
  'site articulation snapshot matches the studio content (run bun run site:articulation)',
);

// The studio opens from a quiz topic; the link map must point at real sounds.
for (const [topicId, soundId] of Object.entries(studioSoundForTopic)) {
  expect(Boolean(findArticulationSound(soundId)), `studio link targets a sound: ${topicId} -> ${soundId}`);
}

if (failures.length) {
  console.error(`\n${failures.length} articulation check(s) failed.`);
  process.exit(1);
}
console.log(`\n${articulationSounds.length} articulation sounds passed.`);
