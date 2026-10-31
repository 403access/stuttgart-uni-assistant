# @ua/feature-articulation

The articulation studio: an animated model of how a sound is produced, used by the quiz tab as
the first **learning tool** and mirrored on the marketing website.

The package is split the same way as the other features:

```
src/
├── index.ts              # core entry point
├── ui.ts                 # UI entry point (components)
├── core/                 # no React — usable by tools and the website export
│   ├── types.ts          # sound, pose, phase, manner, place
│   ├── sounds/           # the catalog, one file per manner
│   ├── phases.ts         # approach, closure, release, aspiration, stricture, flow
│   ├── labels.ts         # localized manner/place names
│   ├── site.ts           # plain-data snapshot for apps/site
│   ├── view3d.ts         # slab, turn, projection, shading
│   └── geometry/         # tongue, lips, velum, cords, airflow, focus, regions
└── ui/                   # React Native components
    ├── timeline.ts       # one phase clock, airstream + ring curves
    ├── figure-2d.tsx     # flat cutaway
    ├── figure-3d.tsx     # turnable block
    ├── pose-art.tsx      # the movable articulators
    ├── phase-strip.tsx   # the sound's phases
    ├── controls.tsx      # play, 2D/3D, preset angles
    └── player.tsx        # composition
```

## Use it

```tsx
import { findArticulationSound, studioSoundForTopic } from '@ua/feature-articulation';
import { ArticulationPlayer } from '@ua/feature-articulation/ui';

const sound = findArticulationSound('t') ?? findArticulationSound(studioSoundForTopic['bpp-vocal-tract']);
<ArticulationPlayer sound={sound} locale={locale} />;
```

The player owns the timeline, the 2D/3D switch and the camera controls; the 3D view is a cutaway head of shaded volumes; dragging turns it through a full circle, the tilt buttons look from above or below, and three presets cover the useful turns. Its phase chips seek:
`timeline.seekPhase(index)` jumps to a stage without restarting the loop, and pausing keeps the
current frame. `ArticulationFigure` and `ArticulationFigure3D` are exported for compositions that
need their own controls.

## Content

Adding a sound is data-only: append to the file for its manner in `core/sounds/` and give it a
`pose` (tongue, lips, velum, airflow). The phases follow from the manner and voicing, so a new
voiceless stop automatically gets approach → closure → release → aspiration.

```bash
bun run check:articulation   # catalog, phases, geometry, 3D frame, site snapshot
bun run site:articulation    # refresh apps/site/assets/articulation.js
```

The drawing reuses the head from `@ua/quiz-content/figures/vocal-tract`, so the studio and the
quiz's diagram questions can never show different anatomy.
