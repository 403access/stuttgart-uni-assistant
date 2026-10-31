/* University Assistant — interactive articulation studio for the marketing page.
   No dependencies, no network: the sound data comes from assets/articulation.js,
   a snapshot generated from the app's own content. */
(() => {
  'use strict';

  const data = window.UA_ARTICULATION;
  const root = document.getElementById('studio');
  if (!data || !root) return;

  const CYCLE = 6400;
  const SLICES = 9;
  const AIR_Z = 10;
  const FOCUS_Z = 20;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COPY = {
    de: {
      play: 'Abspielen',
      pause: 'Pause',
      flat: '2D',
      solid: '3D',
      turn: 'Drehen',
      axes: 'Achsen',
      drag: 'Ziehen zum Drehen',
      viaMouth: 'Luft durch den Mund',
      viaNose: 'Luft durch die Nase',
      voiced: 'stimmhaft',
      voiceless: 'stimmlos',
      reduced: 'Bewegung ist reduziert – die Animation steht still.',
      canvas: (sound) => `Artikulationsstudio: ${sound.glyph} wie in „${sound.word.de}“`,
    },
    en: {
      play: 'Play',
      pause: 'Pause',
      flat: '2D',
      solid: '3D',
      turn: 'Turn',
      axes: 'Axes',
      drag: 'Drag to turn',
      viaMouth: 'Air through the mouth',
      viaNose: 'Air through the nose',
      voiced: 'voiced',
      voiceless: 'voiceless',
      reduced: 'Motion is reduced – the animation stays still.',
      canvas: (sound) => `Articulation studio: ${sound.glyph} as in “${sound.word.en}”`,
    },
  };

  let lang = document.documentElement.lang === 'en' ? 'en' : 'de';
  let sound = data.sounds.find((entry) => entry.id === 't') || data.sounds[0];
  let manner = sound.manner;
  let threeD = false;
  let showAxes = false;
  let camera = { ...data.scene.camera };
  let speed = 1;
  let playing = !reducedMotion;
  let elapsed = 0;
  let frame = 0;
  let last = 0;
  let drag = null;
  let drawFrame = 0;
  let activePhase = -1;

  const copy = () => COPY[lang];
  const local = (value) => (lang === 'en' ? value.en : value.de);
  const fmt = (value) => `${Math.round(value)}\u00b0`.replace('-', '\u2212');
  const SPEEDS = [0.5, 1, 1.5, 2];
  const fmtSpeed = (value) => {
    const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return `${lang === 'de' ? text.replace('.', ',') : text}\u00d7`;
  };
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrapAngle = (value) => {
    const wrapped = (((value + 180) % 360) + 360) % 360 - 180;
    return wrapped === -180 ? 180 : wrapped;
  };

  /* ---------- phases ---------- */

  function phaseWindows() {
    const total = sound.phases.reduce((sum, phase) => sum + phase.weight, 0) || 1;
    let cursor = 0;
    return sound.phases.map((phase, index) => {
      const start = cursor / total;
      cursor += phase.weight;
      return { phase, index, start, end: cursor / total };
    });
  }

  function windowAt(windows, value) {
    const clamped = Math.max(0, Math.min(0.999999, value));
    for (let index = windows.length - 1; index >= 0; index -= 1) {
      if (clamped >= windows[index].start) return windows[index];
    }
    return windows[0];
  }

  const windowProgress = (window, value) =>
    Math.max(0, Math.min(1, (value - window.start) / Math.max(0.0001, window.end - window.start)));

  function airflowSegment(window, focusT) {
    switch (window.phase.airflow) {
      case 'none':
        return null;
      case 'rising':
      case 'blocked':
        return [0, Math.max(0.04, focusT)];
      case 'burst':
        return [focusT, 1];
      default:
        return [0, 1];
    }
  }

  const passes = (window) => (window.phase.airflow === 'burst' ? 1 : 2);

  function airstreamOpacity(windows, focusT, position, value) {
    const window = windowAt(windows, value);
    const segment = airflowSegment(window, focusT);
    if (!segment) return 0;
    const [from, to] = segment;
    if (position < from || position > to) return 0;
    const span = Math.max(0.0001, to - from);
    const along = (position - from) / span;
    const phase = (windowProgress(window, value) * passes(window)) % 1;
    const distance = Math.abs(phase - along);
    const wrapped = Math.min(distance, 1 - distance);
    return Math.max(0, 1 - wrapped / 0.15);
  }

  function ringOpacity(window, value) {
    const progress = windowProgress(window, value);
    switch (window.phase.airflow) {
      case 'rising':
        return 0;
      case 'blocked':
        return 0.45 + 0.4 * Math.abs(Math.sin(progress * Math.PI * 3));
      case 'burst':
        return Math.max(0, 1 - progress * 1.25);
      case 'turbulent':
        return 0.8;
      case 'free':
        return window.phase.id === 'flow' ? 0.3 : 0.5;
      case 'nasal':
        return 0.35;
      default:
        return 0;
    }
  }

  function ringScale(window, value) {
    const progress = windowProgress(window, value);
    switch (window.phase.airflow) {
      case 'blocked':
        return 1 + 0.12 * Math.abs(Math.sin(progress * Math.PI * 3));
      case 'burst':
        return 0.7 + progress * 1.6;
      default:
        return 1;
    }
  }

  function poseProgress(windows, value) {
    const approach = windows.find((window) => window.phase.id === 'approach');
    if (!approach) return 1;
    const fade = (approach.end - approach.start) * 0.45;
    if (value < approach.end - fade) return 0;
    if (value < approach.end) return (value - (approach.end - fade)) / fade;
    return 1;
  }

  const ringColor = (airflow) => {
    switch (airflow) {
      case 'blocked':
        return '#b7791f';
      case 'free':
      case 'nasal':
        return '#2f6b52';
      default:
        return '#004191';
    }
  };

  function airflowFocusT() {
    const lane = sound.pose.lane;
    const focus = sound.pose.focus;
    let total = 0;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 1; index < lane.length; index += 1) {
      const [x0, y0] = lane[index - 1];
      const [x1, y1] = lane[index];
      const length = Math.hypot(x1 - x0, y1 - y0);
      const projection =
        length > 0
          ? Math.max(
              0,
              Math.min(
                1,
                ((focus[0] - x0) * (x1 - x0) + (focus[1] - y0) * (y1 - y0)) / (length * length),
              ),
            )
          : 0;
      const px = x0 + (x1 - x0) * projection;
      const py = y0 + (y1 - y0) * projection;
      const distance = Math.hypot(px - focus[0], py - focus[1]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = total + length * projection;
      }
      total += length;
    }
    return total > 0 ? Math.max(0, Math.min(1, best / total)) : 0.6;
  }

  const focusT = airflowFocusT();
  let windows = phaseWindows();

  /* ---------- geometry ---------- */

  function shade(hex, amount) {
    const value = hex.replace('#', '');
    const full =
      value.length === 3
        ? value
            .split('')
            .map((part) => part + part)
            .join('')
        : value;
    const ink = [0x24, 0x34, 0x47];
    const mixed = [0, 2, 4].map((offset, index) => {
      const channel = Number.parseInt(full.slice(offset, offset + 2), 16);
      return Math.round(channel + (ink[index] - channel) * amount);
    });
    return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  const viewBox = () => (threeD ? data.view3d : data.headViewBox).split(' ').map(Number);

  /** Projection of a point at depth `z`; the 2D view ignores depth. */
  function project(point, z = 0) {
    if (!threeD) return { x: point[0], y: point[1] };
    const u = Math.cos(rad(camera.yaw));
    const v = Math.sin(rad(camera.yaw));
    const w = Math.sin(rad(camera.pitch));
    const q = Math.cos(rad(camera.pitch));
    const dx = point[0] - PIVOT.x;
    const dy = point[1] - PIVOT.y;
    const z1 = -v * dx + u * z;
    return { x: PIVOT.x + u * dx + v * z, y: PIVOT.y + q * dy - w * z1 };
  }

  function percent(point) {
    const [minX, minY, width, height] = viewBox();
    return {
      left: `${(((point.x - minX) / width) * 100).toFixed(2)}%`,
      top: `${(((point.y - minY) / height) * 100).toFixed(2)}%`,
    };
  }

  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );

  const path = (d, fill, stroke, width) =>
    `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;

  /* ---------- 3D scene ---------- */

  const PIVOT = { x: 540, y: 515 };

  const sceneMatrix = (anchor, scale, z) => {
    const u = Math.cos(rad(camera.yaw));
    const v = Math.sin(rad(camera.yaw));
    const w = Math.sin(rad(camera.pitch));
    const q = Math.cos(rad(camera.pitch));
    const [cx, cy] = anchor;
    const a = scale * u;
    const b = scale * v * w;
    const d = scale * q;
    const e = PIVOT.x * (1 - scale * u) + u * (cx - PIVOT.x) * (1 - scale) + v * z;
    const f =
      PIVOT.y * (1 - scale * q) -
      scale * v * w * (cx - PIVOT.x) +
      q * (cy - PIVOT.y) * (1 - scale) -
      w * u * z;
    return `matrix(${a.toFixed(4)} ${b.toFixed(4)} 0 ${d.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
  };

  const sceneDepth = (layer) => {
    const u = Math.cos(rad(camera.yaw));
    const v = Math.sin(rad(camera.yaw));
    const w = Math.sin(rad(camera.pitch));
    const q = Math.cos(rad(camera.pitch));
    const [ax, ay] = layer.anchor;
    return (
      w * (ay - PIVOT.y) + q * (-v * (ax - PIVOT.x) + u * (layer.z + layer.depth / 2))
    );
  };

  function sceneLayer(layer) {
    const rotation = layer.rotate ? ` rotate(${layer.rotate} ${layer.anchor[0]} ${layer.anchor[1]})` : '';
    let svg = '';
    for (let index = 0; index < SLICES; index += 1) {
      const along = index / SLICES;
      const z = layer.z - layer.depth / 2 + layer.depth * along;
      const matrix = sceneMatrix(layer.anchor, 0.9 + 0.1 * along, z);
      const fill = shade(layer.fill, 0.08 + 0.34 * (1 - along));
      svg += layer.paths
        .map((d) => `<path d="${d}" transform="${matrix}${rotation}" fill="${fill}" stroke="${fill}" stroke-width="0.8"/>`)
        .join('');
    }
    const face = sceneMatrix(layer.anchor, 1, layer.z + layer.depth / 2);
    return {
      depth: sceneDepth(layer),
      svg:
        svg +
        layer.paths
          .map(
            (d) =>
              `<path d="${d}" transform="${face}${rotation}" fill="${layer.fill}" stroke="${layer.stroke}" stroke-width="2.4" stroke-linejoin="round"/>`,
          )
          .join(''),
    };
  }

  function figure3d() {
    const shell = data.scene.shell;
    const headSide = shade('#FFFDF9', 0.22);
    const parts = [];
    parts.push(
      ...data.silhouette.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.4).replace('<path', `<path transform="${sceneMatrix([540, 520], 1, shell.z)}"`)),
    );
    for (let index = 1; index <= shell.rim; index += 1) {
      const z = shell.z + ((0 - shell.z) * index) / shell.rim;
      const matrix = sceneMatrix([540, 520], 1, z);
      parts.push(
        ...data.silhouette.map(
          (shape) =>
            `<path d="${shape.d}" transform="${matrix}" fill="none" stroke="${headSide}" stroke-width="${shell.rimWidth}" stroke-linejoin="round"/>`,
        ),
      );
    }
    const layers = [...data.scene.layers, ...sound.poseLayers]
      .map((layer) => sceneLayer(layer))
      .sort((left, right) => left.depth - right.depth);
    parts.push(...layers.map((layer) => layer.svg));
    return `<svg viewBox="${data.view3d}" role="img" aria-label="${esc(
      copy().canvas(sound),
    )}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
  }

  function axes() {
    const u = Math.cos(rad(camera.yaw));
    const v = Math.sin(rad(camera.yaw));
    const w = Math.sin(rad(camera.pitch));
    const q = Math.cos(rad(camera.pitch));
    const colors = ['#C0392B', '#1E8449', '#1F5FA8'];
    const names = ['X', 'Y', 'Z'];
    return `<svg class="studio-axes" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="2.4" fill="#5E666E"/>
      ${[
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]
        .map(([dx, dy, dz], index) => {
          const x = u * dx + v * dz;
          const y = q * dy + v * w * dx - u * w * dz;
          const depth = w * dy + q * (-v * dx + u * dz);
          const color = colors[index];
          return `<g opacity="${depth > 0 ? 1 : 0.5}">
            <line x1="36" y1="36" x2="${(36 + x * 24).toFixed(1)}" y2="${(36 + y * 24).toFixed(1)}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
            <text x="${(36 + x * 31).toFixed(1)}" y="${(36 + y * 31 + 3).toFixed(1)}" font-size="9" font-weight="700" text-anchor="middle" fill="${color}">${names[index]}</text>
          </g>`;
        })
        .join('')}
    </svg>`;
  }

  function figure2d() {
    const target = sound.pose;
    return `<svg viewBox="${data.headViewBox}" role="img" aria-label="${esc(
      copy().canvas(sound),
    )}" preserveAspectRatio="xMidYMid meet">
      ${data.silhouette.map((shape) => path(shape.d, shape.fill, shape.stroke, 3)).join('')}
      ${data.regions.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.4)).join('')}
      <g id="studio-pose-rest" opacity="1">${poseArt({ ...data.rest, cords: target.cords, velum: 0 })}</g>
      <g id="studio-pose-target" opacity="0">${poseArt(target)}</g>
    </svg>`;
  }

  function poseArt(pose) {
    return `<g transform="rotate(${pose.velum} 492 405)">${data.velum
      .map((d) => path(d, '#E7DDF3', '#9C86C0', 2.6))
      .join('')}</g>
      ${path(pose.tongue, '#EF9AA6', '#B95B6B', 2.6)}
      ${pose.lips.map((d) => path(d, '#E98A9B', '#B95B6B', 2.6)).join('')}
      ${pose.cords.map((d) => path(d, '#5E7F9C', '#243447', 2)).join('')}`;
  }

  /* ---------- overlays ---------- */

  let poseNodes = null;
  let dots = [];
  let focusRing = null;

  function buildOverlay() {
    const canvas = document.getElementById('studio-canvas');
    const overlay = canvas.querySelector('.studio-overlay');
    overlay.innerHTML = '';
    dots = [];
    const lane = sound.pose.lane;
    lane.slice(1, -1).forEach((point, index, list) => {
      const node = document.createElement('span');
      node.className = 'studio-puff';
      const position = percent(project(point, threeD ? AIR_Z : 0));
      node.style.left = position.left;
      node.style.top = position.top;
      overlay.appendChild(node);
      dots.push({ node, position: index / (list.length - 1) });
    });

    const ring = document.createElement('span');
    ring.className = 'studio-ring studio-ring-focus';
    const ringPoint = percent(project(sound.pose.focus, threeD ? FOCUS_Z : 0));
    ring.style.left = ringPoint.left;
    ring.style.top = ringPoint.top;
    overlay.appendChild(ring);
    focusRing = ring;

    poseNodes = threeD
      ? null
      : {
          rest: canvas.querySelector('#studio-pose-rest'),
          target: canvas.querySelector('#studio-pose-target'),
        };
  }

  function drawStatic() {
    const canvas = document.getElementById('studio-canvas');
    const [, , width, height] = viewBox();
    canvas.style.aspectRatio = `${width} / ${height}`;
    canvas.classList.toggle('is-3d', threeD);
    canvas.innerHTML = `<div class="studio-figure">${threeD ? figure3d() : figure2d()}</div>
      <div class="studio-overlay"></div>
      <span class="studio-badge">${esc(sound.airflow === 'nasal' ? copy().viaNose : copy().viaMouth)}</span>
      ${threeD ? `<span class="studio-hint">${esc(copy().drag)}</span>` : ''}
      ${threeD && showAxes ? axes() : ''}`;
    buildOverlay();
    update(elapsed);
  }

  /* ---------- frame ---------- */

  function update(value) {
    const window = windowAt(windows, value);
    const progress = poseProgress(windows, value);
    if (poseNodes) {
      poseNodes.rest.setAttribute('opacity', (1 - progress).toFixed(3));
      poseNodes.target.setAttribute('opacity', progress.toFixed(3));
    }

    dots.forEach((dot) => {
      const strength = airstreamOpacity(windows, focusT, dot.position, value);
      dot.node.style.opacity = (strength * 0.85).toFixed(3);
      dot.node.style.transform = `translate(-50%, -50%) scale(${(0.55 + strength * 0.65).toFixed(3)})`;
    });

    if (focusRing) {
      focusRing.style.opacity = ringOpacity(window, value).toFixed(3);
      focusRing.style.transform = `translate(-50%, -50%) scale(${ringScale(window, value).toFixed(3)})`;
      focusRing.style.borderColor = ringColor(window.phase.airflow);
    }

    if (window.index !== activePhase) {
      activePhase = window.index;
      const chips = document.querySelectorAll('.studio-phase-chip');
      chips.forEach((chip, index) => {
        chip.classList.toggle('is-active', index === activePhase);
        chip.setAttribute('aria-pressed', String(index === activePhase));
      });
      const detail = document.getElementById('studio-phase-detail');
      if (detail) detail.textContent = local(window.phase.detail);
    }
  }

  function tick(now) {
    if (!playing) return;
    if (!last) last = now;
    elapsed = (elapsed + ((now - last) / CYCLE) * speed) % 1;
    last = now;
    update(elapsed);
    frame = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(frame);
    last = 0;
    if (playing) frame = requestAnimationFrame(tick);
  }

  /* ---------- controls ---------- */

  function renderTabs() {
    const tabs = document.getElementById('studio-tabs');
    tabs.setAttribute('aria-label', lang === 'en' ? 'Manner of articulation' : 'Artikulationsart');
    tabs.innerHTML = data.manners
      .map(
        (entry) =>
          `<button type="button" role="tab" class="studio-tab${
            entry.id === manner ? ' is-active' : ''
          }" data-manner="${entry.id}" aria-selected="${entry.id === manner}">${esc(
            local(entry.label),
          )}</button>`,
      )
      .join('');
    tabs.querySelectorAll('.studio-tab').forEach((button) => {
      button.addEventListener('click', () => {
        manner = button.dataset.manner;
        renderTabs();
        renderChips();
      });
    });
  }

  function renderChips() {
    const chips = document.getElementById('studio-chips');
    const sounds = data.sounds.filter((entry) => entry.manner === manner);
    chips.innerHTML = sounds
      .map(
        (entry) =>
          `<button type="button" class="studio-chip${
            entry.id === sound.id ? ' is-active' : ''
          }" data-sound="${entry.id}" aria-pressed="${entry.id === sound.id}"><strong>${esc(
            entry.glyph,
          )}</strong><span>${esc(local(entry.word))}</span></button>`,
      )
      .join('');
    chips.querySelectorAll('.studio-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const next = data.sounds.find((entry) => entry.id === button.dataset.sound);
        if (!next) return;
        selectSound(next);
      });
    });
  }

  function selectSound(next) {
    sound = next;
    manner = next.manner;
    windows = phaseWindows();
    activePhase = -1;
    elapsed = 0;
    last = 0;
    renderChips();
    renderDetail();
    renderPhases();
    renderBar();
    drawStatic();
    if (playing) start();
  }

  function renderPhases() {
    const strip = document.getElementById('studio-phases');
    strip.innerHTML = windows
      .map(
        (window, index) =>
          `<button type="button" class="studio-phase-chip" data-phase="${index}" aria-pressed="${
            index === 0
          }"><i aria-hidden="true"></i>${esc(local(window.phase.label))}</button>`,
      )
      .join('');
    strip.querySelectorAll('[data-phase]').forEach((button) => {
      button.addEventListener('click', () => {
        const window = windows[Number(button.dataset.phase)];
        if (!window) return;
        elapsed = window.start + 0.001;
        activePhase = -1;
        update(elapsed);
      });
    });
    const detail = document.getElementById('studio-phase-detail');
    detail.textContent = local(windows[0].phase.detail);
    activePhase = -1;
  }

  function renderDetail() {
    const detail = document.getElementById('studio-detail');
    const tags = [
      local(sound.mannerLabel),
      sound.placeLabel ? local(sound.placeLabel) : sound.shape ? local(sound.shape) : '',
      sound.voiced ? copy().voiced : copy().voiceless,
    ].filter(Boolean);
    detail.innerHTML = `<div class="studio-sound">
        <span class="studio-glyph">${esc(sound.glyph)}</span>
        <div>
          <p class="studio-word">${esc(local(sound.word))}</p>
          <p class="studio-tags">${tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</p>
        </div>
      </div>
      <p class="studio-summary">${esc(local(sound.summary))}</p>`;
    const canvas = document.getElementById('studio-canvas');
    const svg = canvas.querySelector('svg');
    if (svg) svg.setAttribute('aria-label', copy().canvas(sound));
  }

  function renderBar() {
    const bar = document.getElementById('studio-bar');
    bar.innerHTML = `<div class="studio-actions">
        <button type="button" class="studio-btn" id="studio-play" aria-pressed="${!playing}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">${
            playing
              ? '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>'
              : '<path d="M7 4l13 8-13 8z"/>'
          }</svg>
          <span>${esc(playing ? copy().pause : copy().play)}</span>
        </button>
        ${
          threeD
            ? `<button type="button" class="studio-btn" data-axes aria-pressed="${showAxes}">${esc(
                copy().axes,
              )}</button>`
            : ''
        }
        <div class="studio-seg" role="group" aria-label="${lang === 'en' ? 'View' : 'Ansicht'}">
          <button type="button" data-view="flat" aria-pressed="${!threeD}">${esc(copy().flat)}</button>
          <button type="button" data-view="solid" aria-pressed="${threeD}">${esc(copy().solid)}</button>
        </div>
      </div>
      <div class="studio-turn">
        <span>${lang === 'en' ? 'Speed' : 'Tempo'}</span>
        ${SPEEDS.map(
          (value) =>
            `<button type="button" data-speed="${value}" aria-pressed="${speed === value}">${fmtSpeed(
              value,
            )}</button>`,
        ).join('')}
      </div>
      ${
        threeD
          ? `<div class="studio-turn">
              <span>${esc(copy().turn)}</span>
              ${data.turn.presets
                .map(
                  (preset) =>
                    `<button type="button" data-angle="${preset}" aria-pressed="${
                      Math.round(camera.yaw) === preset
                    }">${fmt(preset)}</button>`,
                )
                .join('')}
              <em>${fmt(camera.yaw)}</em>
            </div>`
          : ''
      }`;

    bar.querySelector('#studio-play').addEventListener('click', () => {
      playing = !playing;
      renderBar();
      if (playing) start();
      else cancelAnimationFrame(frame);
      update(elapsed);
    });
    bar.querySelectorAll('[data-axes]').forEach((button) => {
      button.addEventListener('click', () => {
        showAxes = !showAxes;
        renderBar();
        drawStatic();
      });
    });
    bar.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.dataset.view === 'solid';
        if (next === threeD) return;
        threeD = next;
        renderBar();
        drawStatic();
      });
    });
    bar.querySelectorAll('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => {
        speed = Number(button.dataset.speed);
        renderBar();
      });
    });
    bar.querySelectorAll('[data-angle]').forEach((button) => {
      button.addEventListener('click', () => {
        camera = { ...camera, yaw: Number(button.dataset.angle) };
        renderBar();
        drawStatic();
      });
    });
  }

  function wireDrag() {
    const canvas = document.getElementById('studio-canvas');
    canvas.addEventListener('pointerdown', (event) => {
      if (!threeD || event.button !== 0) return;
      drag = { x: event.clientX, camera: { ...camera } };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      camera = {
        ...camera,
        yaw: wrapAngle(drag.camera.yaw + (event.clientX - drag.x) * 0.55),
      };
      scheduleDraw();
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      renderBar();
      drawStatic();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
  }

  /** Coalesce pointer moves into one SVG rebuild per frame. */
  function scheduleDraw() {
    if (drawFrame) return;
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0;
      drawStatic();
      const readout = document.querySelector('.studio-turn em');
      if (readout) readout.textContent = fmt(camera.yaw);
    });
  }

  function renderAll() {
    renderTabs();
    renderChips();
    renderDetail();
    renderPhases();
    renderBar();
    drawStatic();
    start();
  }

  document.addEventListener('ua:langchange', (event) => {
    lang = event.detail && event.detail.lang === 'en' ? 'en' : 'de';
    windows = phaseWindows();
    activePhase = -1;
    renderAll();
  });

  wireDrag();
  renderAll();
})();
