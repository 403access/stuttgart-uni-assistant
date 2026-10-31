/* University Assistant — interactive articulation studio for the marketing page.
   No dependencies, no network: the sound data comes from assets/articulation.js,
   a snapshot generated from the app's own content. */
(() => {
  'use strict';

  const data = window.UA_ARTICULATION;
  const root = document.getElementById('studio');
  if (!data || !root) return;

  const NS = 'http://www.w3.org/2000/svg';
  const CYCLE = 5200;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COPY = {
    de: {
      play: 'Abspielen',
      pause: 'Pause',
      flat: '2D',
      solid: '3D',
      turn: 'Drehen',
      turnLeft: 'Nach links drehen',
      turnRight: 'Nach rechts drehen',
      viaMouth: 'Luft durch den Mund',
      viaNose: 'Luft durch die Nase',
      voiced: 'stimmhaft',
      voiceless: 'stimmlos',
      stages: ['Luftstrom', 'Stimme', 'Artikulation'],
      reduced: 'Bewegung ist reduziert – die Animation steht still.',
      canvas: (sound) => `Artikulationsstudio: ${sound.glyph} wie in „${sound.word.de}“`,
      nach: (count) => `${count} Laute`,
    },
    en: {
      play: 'Play',
      pause: 'Pause',
      flat: '2D',
      solid: '3D',
      turn: 'Turn',
      turnLeft: 'Turn left',
      turnRight: 'Turn right',
      viaMouth: 'Air through the mouth',
      viaNose: 'Air through the nose',
      voiced: 'voiced',
      voiceless: 'voiceless',
      stages: ['Airstream', 'Voice', 'Articulation'],
      reduced: 'Motion is reduced – the animation stays still.',
      canvas: (sound) => `Articulation studio: ${sound.glyph} as in “${sound.word.en}”`,
      nach: (count) => `${count} sounds`,
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

  const copy = () => COPY[lang];
  const local = (value) => (lang === 'en' ? value.en : value.de);

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
    return { cos: Math.cos(radians), sin: Math.sin(radians), tan: Math.tan(data.slab.elevation) * Math.sin(radians) };
  }

  function viewBox() {
    return (threeD ? data.view3d : data.headViewBox).split(' ').map(Number);
  }

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

  function viewBoxOf(source) {
    return source.split(' ').map(Number);
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

  function path(d, fill, stroke, width) {
    return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
  }

  /* ---------- the figure ---------- */

  function figure2d() {
    const layers = [
      ...data.silhouette.map((shape) => path(shape.d, shape.fill, shape.stroke, 3)),
      ...data.regions.map((shape) => path(shape.d, shape.fill, shape.stroke, 2.4)),
      `<g transform="rotate(${sound.pose.velum} 492 405)">${data.velum
        .map((d) => path(d, '#E7DDF3', '#9C86C0', 2.6))
        .join('')}</g>`,
      path(sound.pose.tongue, '#EF9AA6', '#B95B6B', 2.6),
      ...sound.pose.lips.map((d) => path(d, '#E98A9B', '#B95B6B', 2.6)),
      ...sound.pose.cords.map((d) => path(d, '#5E7F9C', '#243447', 2)),
    ];
    return `<svg viewBox="${data.headViewBox}" role="img" aria-label="${esc(
      copy().canvas(sound),
    )}" preserveAspectRatio="xMidYMid meet">${layers.join('')}</svg>`;
  }

  /** One plate of the block: its side wall plus the illuminated face. */
  function plate(paths, lift, thickness, fill, stroke, rotate) {
    const { sin } = turn(angle);
    const dx = (lift * sin).toFixed(2);
    const side = shade(fill, 0.3);
    const rotation = rotate ? ` rotate(${sound.pose.velum} 492 405)` : '';
    const walls = [];
    for (let step = 4; step >= 1; step -= 1) {
      const offset = (-sin * thickness * (step / 4)).toFixed(2);
      walls.push(
        ...paths.map((d) => `<g transform="translate(${offset} 0)">${path(d, side, side, 1)}</g>`),
      );
    }
    return `<g transform="translate(${dx} 0)${rotation}">${walls.join('')}${paths
      .map((d) => path(d, fill, stroke, 2.4))
      .join('')}</g>`;
  }

  function figure3d() {
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
      plate(sound.pose.cords, data.slab.cords, 6, '#5E7F9C', '#243447'),
      plate([sound.pose.tongue], data.slab.tongue, 14, '#EF9AA6', '#B95B6B'),
      plate(data.velum, data.slab.velum, 8, '#E7DDF3', '#9C86C0', true),
      plate(sound.pose.lips, data.slab.lips, 10, '#E98A9B', '#B95B6B'),
    );

    const skew = ((Math.atan(tan) * 180) / Math.PI).toFixed(3);
    return `<svg viewBox="${data.view3d}" role="img" aria-label="${esc(
      copy().canvas(sound),
    )}" preserveAspectRatio="xMidYMid meet"><g transform="translate(${centerX} 0) scale(${cos.toFixed(
      4,
    )} 1) skewY(${skew}) translate(${-centerX} 0)">${parts.join('')}</g></svg>`;
  }

  /* ---------- overlays (airstream, rings) ---------- */

  const STAGE = (value) => (value < 0.4 ? 0 : value < 0.62 ? 1 : 2);
  const center = (position) =>
    position <= 0.5 ? 0.04 + (position / 0.5) * 0.3 : 0.64 + ((position - 0.5) / 0.5) * 0.3;

  let dots = [];
  let focusRing = null;
  let voiceRings = [];

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
      dots.push({ node, phase: center(index / (list.length - 1)) });
    });

    voiceRings = [];
    if (sound.voiced) {
      for (let index = 0; index < 2; index += 1) {
        const node = document.createElement('span');
        node.className = 'studio-ring studio-ring-voice';
        const position = percent(project([652, 762], threeD ? data.slab.cords : 0));
        node.style.left = position.left;
        node.style.top = position.top;
        overlay.appendChild(node);
        voiceRings.push({ node, offset: index * 0.07 });
      }
    }

    const focus = document.createElement('span');
    focus.className = 'studio-ring studio-ring-focus';
    const focusPosition = percent(project(sound.pose.focus, threeD ? data.slab.lips : 0));
    focus.style.left = focusPosition.left;
    focus.style.top = focusPosition.top;
    overlay.appendChild(focus);
    focusRing = focus;
  }

  function drawStatic() {
    const canvas = document.getElementById('studio-canvas');
    const [, , width, height] = viewBox();
    canvas.style.aspectRatio = `${width} / ${height}`;
    canvas.innerHTML = `<div class="studio-figure">${threeD ? figure3d() : figure2d()}</div>
      <div class="studio-overlay"></div>
      <span class="studio-badge">${esc(sound.airflow === 'nasal' ? copy().viaNose : copy().viaMouth)}</span>`;
    buildOverlay();
    update(elapsed);
  }

  /* ---------- frame ---------- */

  function update(value) {
    const stage = STAGE(value);
    document.querySelectorAll('.studio-stage-chip').forEach((chip, index) => {
      chip.classList.toggle('is-active', playing && index === stage);
    });

    dots.forEach((dot) => {
      const distance = Math.abs(value - dot.phase);
      const strength = Math.max(0, 1 - distance / 0.075);
      dot.node.style.opacity = (strength * 0.85).toFixed(3);
      dot.node.style.transform = `translate(-50%, -50%) scale(${(0.55 + strength * 0.65).toFixed(3)})`;
    });

    voiceRings.forEach((ring) => {
      const local = value - ring.offset;
      const strength = local < 0.3 ? 0 : local < 0.38 ? (local - 0.3) / 0.08 : local < 0.58 ? 1 : local < 0.66 ? (0.66 - local) / 0.08 : 0;
      ring.node.style.opacity = (strength * 0.55).toFixed(3);
      ring.node.style.transform = `translate(-50%, -50%) scale(${(0.7 + strength * 1.4).toFixed(3)})`;
    });

    if (focusRing) {
      const strength = value < 0.62 ? 0 : value < 0.68 ? (value - 0.62) / 0.06 : value < 0.9 ? 1 : (1 - value) / 0.1;
      focusRing.style.opacity = (strength * 0.95).toFixed(3);
      focusRing.style.transform = `translate(-50%, -50%) scale(${(0.75 + strength * 0.6).toFixed(3)})`;
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
          `<button type="button" role="tab" class="studio-tab${entry.id === manner ? ' is-active' : ''}" data-manner="${
            entry.id
          }" aria-selected="${entry.id === manner}">${esc(local(entry.label))}</button>`,
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
          `<button type="button" class="studio-chip${entry.id === sound.id ? ' is-active' : ''}" data-sound="${entry.id}" aria-pressed="${
            entry.id === sound.id
          }"><strong>${esc(entry.glyph)}</strong><span>${esc(local(entry.word))}</span></button>`,
      )
      .join('');
    chips.querySelectorAll('.studio-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const next = data.sounds.find((entry) => entry.id === button.dataset.sound);
        if (!next) return;
        sound = next;
        manner = next.manner;
        elapsed = 0;
        last = 0;
        renderChips();
        renderDetail();
        renderBar();
        drawStatic();
        if (playing) start();
      });
    });
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
    bar.innerHTML = `<div class="studio-stages">${copy()
      .stages.map(
        (stage, index) =>
          `<span class="studio-stage-chip${playing && index === STAGE(elapsed) ? ' is-active' : ''}"><i aria-hidden="true"></i>${esc(
            stage,
          )}</span>`,
      )
      .join('')}</div>
      <div class="studio-actions">
        <button type="button" class="studio-btn" id="studio-play" aria-pressed="${!playing}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">${
            playing ? '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>' : '<path d="M7 4l13 8-13 8z"/>'
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
              <button type="button" data-turn="-1" aria-label="${esc(copy().turnLeft)}" ${angle <= data.slab.minAngle ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2.3 6.5"/><path d="M4 4v6h6"/></svg>
              </button>
              <button type="button" data-turn="1" aria-label="${esc(copy().turnRight)}" ${angle >= data.slab.maxAngle ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10a8 8 0 1 0-2.3 6.5"/><path d="M20 4v6h-6"/></svg>
              </button>
              <em>${Math.round(angle)}°</em>
            </div>`
          : ''
      }`;

    bar.querySelector('#studio-play').addEventListener('click', () => {
      playing = !playing;
      renderBar();
      if (playing) start();
      else cancelAnimationFrame(frame);
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
    bar.querySelectorAll('[data-turn]').forEach((button) => {
      button.addEventListener('click', () => {
        angle = Math.max(
          data.slab.minAngle,
          Math.min(data.slab.maxAngle, angle + Number(button.dataset.turn) * data.slab.step),
        );
        renderBar();
        drawStatic();
      });
    });
  }

  function renderAll() {
    renderTabs();
    renderChips();
    renderDetail();
    renderBar();
    drawStatic();
    start();
  }

  document.addEventListener('ua:langchange', (event) => {
    lang = event.detail && event.detail.lang === 'en' ? 'en' : 'de';
    renderAll();
  });

  renderAll();
})();
