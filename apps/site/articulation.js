/* University Assistant — interactive articulation studio for the marketing page.
   No dependencies, no network: the sound data comes from assets/articulation.js,
   a snapshot generated from the app's own content. */
(() => {
  'use strict';

  const data = window.UA_ARTICULATION;
  const root = document.getElementById('studio');
  if (!data || !root) return;

  const CYCLE = 6400;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COPY = {
    de: {
      play: 'Abspielen',
      pause: 'Pause',
      flat: '2D',
      solid: '3D',
      turn: 'Drehen',
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
  let angle = data.slab.defaultAngle;
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
  const clampAngle = (value) => Math.max(data.slab.minAngle, Math.min(data.slab.maxAngle, value));

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
    const progress = windowProgress(window, value);
    const phase = (progress * passes(window)) % 1;
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

  function turn(degrees) {
    const radians = (degrees * Math.PI) / 180;
    return {
      cos: Math.cos(radians),
      sin: Math.sin(radians),
      tan: Math.tan(data.slab.elevation) * Math.sin(radians),
    };
  }

  const viewBox = () => (threeD ? data.view3d : data.headViewBox).split(' ').map(Number);
  const viewBoxOf = (source) => source.split(' ').map(Number);

  function project(point, lift = 0) {
    if (!threeD) return { x: point[0], y: point[1] };
    const { cos, sin, tan } = turn(angle);
    const [minX, , width] = viewBoxOf(data.headViewBox);
    const centerX = minX + width / 2;
    return {
      x: centerX + (point[0] - centerX) * cos + lift * sin * cos,
      y: point[1] + (point[0] - centerX + lift * sin) * tan,
    };
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

  /** The neutral pose: tongue down, lips open, velum raised. */
  const rest = { tongue: data.rest.tongue, lips: data.rest.lips, velum: 0 };

  function poseArt(pose) {
    return `<g class="studio-velum" transform="rotate(${pose.velum} 492 405)">${data.velum
      .map((d) => path(d, '#E7DDF3', '#9C86C0', 2.6))
      .join('')}</g>
      ${path(pose.tongue, '#EF9AA6', '#B95B6B', 2.6)}
      ${pose.lips.map((d) => path(d, '#E98A9B', '#B95B6B', 2.6)).join('')}
      ${(pose.cords || []).map((d) => path(d, '#5E7F9C', '#243447', 2)).join('')}`;
  }

  function plates(pose) {
    const { sin } = turn(angle);
    const plate = (paths, lift, thickness, fill, stroke, rotate) => {
      const side = shade(fill, 0.3);
      const dx = (lift * sin).toFixed(2);
      const walls = [];
      for (let step = 4; step >= 1; step -= 1) {
        const offset = (-sin * thickness * (step / 4)).toFixed(2);
        walls.push(
          ...paths.map((d) => `<g transform="translate(${offset} 0)">${path(d, side, side, 1)}</g>`),
        );
      }
      return `<g transform="translate(${dx} 0)${rotate ? ` ${rotate}` : ''}">${walls.join('')}${paths
        .map((d) => path(d, fill, stroke, 2.4))
        .join('')}</g>`;
    };
    return [
      plate(pose.cords, data.slab.cords, 6, '#5E7F9C', '#243447'),
      plate([pose.tongue], data.slab.tongue, 14, '#EF9AA6', '#B95B6B'),
      plate(data.velum, data.slab.velum, 8, '#E7DDF3', '#9C86C0', `rotate(${pose.velum} 492 405)`),
      plate(pose.lips, data.slab.lips, 10, '#E98A9B', '#B95B6B'),
    ].join('');
  }

  /* ---------- the figure ---------- */

  let poseNodes = null;
  let dots = [];
  let focusRing = null;

  function figure() {
    const target = { ...sound.pose, velum: sound.pose.velum };

    if (!threeD) {
      return `<svg viewBox="${data.headViewBox}" role="img" aria-label="${esc(
        copy().canvas(sound),
      )}" preserveAspectRatio="xMidYMid meet">
        ${data.silhouette.map((shape) => path(shape.d, shape.fill, shape.stroke, 3)).join('')}
        ${data.regions.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.4)).join('')}
        <g id="studio-pose-rest">${poseArt({ ...rest, cords: sound.pose.cords })}</g>
        <g id="studio-pose-target">${poseArt(target)}</g>
      </svg>`;
    }

    const { cos, sin, tan } = turn(angle);
    const [minX, , width] = viewBoxOf(data.headViewBox);
    const centerX = minX + width / 2;
    const headSide = shade('#FFFDF9', 0.19);
    const parts = [];
    for (let step = 10; step >= 1; step -= 1) {
      const dx = (-sin * data.slab.thickness * (step / 10)).toFixed(2);
      parts.push(
        `<g transform="translate(${dx} 0)">${data.silhouette
          .map((shape) => path(shape.d, headSide, headSide, 1.4))
          .join('')}</g>`,
      );
    }
    parts.push(
      ...data.silhouette.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.6)),
      ...data.regions.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.4)),
    );
    const skew = ((Math.atan(tan) * 180) / Math.PI).toFixed(3);
    return `<svg viewBox="${data.view3d}" role="img" aria-label="${esc(
      copy().canvas(sound),
    )}" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(${centerX} 0) scale(${cos.toFixed(4)} 1) skewY(${skew}) translate(${-centerX} 0)">
        ${parts.join('')}
        <g id="studio-pose-rest">${plates({ ...rest, cords: sound.pose.cords })}</g>
        <g id="studio-pose-target">${plates(target)}</g>
      </g>
    </svg>`;
  }

  function buildOverlay() {
    const canvas = document.getElementById('studio-canvas');
    const overlay = canvas.querySelector('.studio-overlay');
    overlay.innerHTML = '';
    dots = [];
    const lane = sound.pose.lane;
    lane.slice(1, -1).forEach((point, index, list) => {
      const node = document.createElement('span');
      node.className = 'studio-puff';
      const position = percent(project(point));
      node.style.left = position.left;
      node.style.top = position.top;
      overlay.appendChild(node);
      dots.push({ node, position: index / (list.length - 1) });
    });

    const ring = document.createElement('span');
    ring.className = 'studio-ring studio-ring-focus';
    const ringPoint = percent(project(sound.pose.focus, threeD ? data.slab.lips : 0));
    ring.style.left = ringPoint.left;
    ring.style.top = ringPoint.top;
    overlay.appendChild(ring);
    focusRing = ring;

    poseNodes = {
      rest: canvas.querySelector('#studio-pose-rest'),
      target: canvas.querySelector('#studio-pose-target'),
    };
  }

  function drawStatic() {
    const canvas = document.getElementById('studio-canvas');
    const [, , width, height] = viewBox();
    canvas.style.aspectRatio = `${width} / ${height}`;
    canvas.classList.toggle('is-3d', threeD);
    canvas.innerHTML = `<div class="studio-figure">${figure()}</div>
      <div class="studio-overlay"></div>
      <span class="studio-badge">${esc(sound.airflow === 'nasal' ? copy().viaNose : copy().viaMouth)}</span>
      ${threeD ? `<span class="studio-hint">${esc(copy().drag)}</span>` : ''}`;
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
      chips.forEach((chip, index) => chip.classList.toggle('is-active', playing && index === activePhase));
      const detail = document.getElementById('studio-phase-detail');
      if (detail) detail.textContent = local(window.phase.detail);
    }
  }

  function tick(now) {
    if (!playing) return;
    if (!last) last = now;
    elapsed = (elapsed + (now - last) / CYCLE) % 1;
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
          `<span class="studio-phase-chip${playing && index === 0 ? ' is-active' : ''}"><i aria-hidden="true"></i>${esc(
            local(window.phase.label),
          )}</span>`,
      )
      .join('');
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
        <div class="studio-seg" role="group" aria-label="${lang === 'en' ? 'View' : 'Ansicht'}">
          <button type="button" data-view="flat" aria-pressed="${!threeD}">${esc(copy().flat)}</button>
          <button type="button" data-view="solid" aria-pressed="${threeD}">${esc(copy().solid)}</button>
        </div>
      </div>
      ${
        threeD
          ? `<div class="studio-turn">
              <span>${esc(copy().turn)}</span>
              ${data.slab.presets
                .map(
                  (preset) =>
                    `<button type="button" data-angle="${preset}" aria-pressed="${
                      Math.round(angle) === preset
                    }">${fmt(preset)}</button>`,
                )
                .join('')}
              <em>${fmt(angle)}</em>
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
    bar.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.dataset.view === 'solid';
        if (next === threeD) return;
        threeD = next;
        renderBar();
        drawStatic();
      });
    });
    bar.querySelectorAll('[data-angle]').forEach((button) => {
      button.addEventListener('click', () => {
        angle = Number(button.dataset.angle);
        renderBar();
        drawStatic();
      });
    });
  }

  function wireDrag() {
    const canvas = document.getElementById('studio-canvas');
    canvas.addEventListener('pointerdown', (event) => {
      if (!threeD || event.button !== 0) return;
      drag = { x: event.clientX, angle };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      angle = clampAngle(drag.angle + (event.clientX - drag.x) * 0.32);
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
      if (readout) readout.textContent = fmt(angle);
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
