/* Presenter: an original flat cartoon host drawn as an SVG rig (650 x 770, cropped at the chest).
   Parameters pick the look; EXP.render(t) animates it: mouth from per-frame loudness, blinks on a fixed seed,
   a slow head sway, nods on key words, a pointing hand and an open palm raised from below. */
(function () {
  const OUT = '#3B2418';
  const SKIN = { light: '#F6D7C3', fair: '#EFC3A4', medium: '#D9A07A', tan: '#B97A55', brown: '#8D5838', deep: '#5E3A26' };
  const HAIR = { black: '#231B17', brown: '#5A3825', auburn: '#8E3B22', blonde: '#D9A94E', grey: '#9C9690', white: '#E9E4DC', pink: '#E37BA0', blue: '#3F6FD8' };
  const TOPS = { red: '#D7372C', ink: '#2B2A28', navy: '#25365F', green: '#3E7D58', mustard: '#D9A12B', grey: '#8A857E', cream: '#EFE6D6', blue: '#3D7BD9', purple: '#6B4FA8' };
  const OPTIONS = {
    skin: Object.keys(SKIN), hair: ['short', 'curly', 'long', 'bun', 'buzz', 'bald', 'side', 'afro'], hairColor: Object.keys(HAIR),
    glasses: ['none', 'round', 'square'], top: ['hoodie', 'tee', 'shirt', 'blazer'], topColor: Object.keys(TOPS),
    beard: ['none', 'stubble', 'full', 'moustache'], accessory: ['none', 'cap', 'earrings', 'headphones'],
  };

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function random(seed) {
    const r = rng(seed * 7919 + 13), pick = a => a[Math.floor(r() * a.length)];
    const p = { skin: pick(OPTIONS.skin), hair: pick(OPTIONS.hair), hairColor: pick(['black', 'brown', 'brown', 'auburn', 'blonde', 'grey', 'black']),
      glasses: pick(['none', 'round', 'square', 'round']), top: pick(OPTIONS.top), topColor: pick(OPTIONS.topColor),
      beard: pick(['none', 'none', 'stubble', 'full', 'moustache']), accessory: pick(['none', 'none', 'none', 'cap', 'earrings', 'headphones']) };
    if (p.hair === 'bald' && p.accessory === 'none') p.accessory = 'cap';
    return p;
  }
  function norm(p) {
    p = Object.assign({}, p || {});
    for (const k of Object.keys(OPTIONS)) if (!OPTIONS[k].includes(p[k])) p[k] = OPTIONS[k][0];
    return p;
  }

  const S = (tag, attrs, kids) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(c => el.appendChild(c));
    return el;
  };
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join('');
  };
  const line = { stroke: OUT, 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };

  // 10 mouth shapes: 0 closed, then wider and taller
  function mouthPath(i) {
    if (i === 0) return null;
    const w = 46 + i * 4.2, h = 4 + i * 5.2, cx = 330, y = 396;
    return `M ${cx - w / 2} ${y} Q ${cx} ${y - h * 0.22} ${cx + w / 2} ${y} Q ${cx + w * 0.28} ${y + h} ${cx} ${y + h} Q ${cx - w * 0.28} ${y + h} ${cx - w / 2} ${y} Z`;
  }

  function build(svgHost, params) {
    const p = norm(params), skin = SKIN[p.skin], hair = HAIR[p.hairColor], top = TOPS[p.topColor];
    const svg = S('svg', { viewBox: '0 0 650 770', width: 650, height: 770, overflow: 'visible' });
    const body = S('g'), head = S('g'), eyes = [], brows = S('g'), mouthG = S('g'), hands = {};
    // ---- body
    const torso = 'M 40 790 C 52 640 140 560 250 532 L 410 532 C 520 560 600 640 612 790 Z';
    body.appendChild(S('path', { d: torso, fill: top, ...line }));
    if (p.top === 'hoodie') {
      body.appendChild(S('path', { d: 'M 205 540 C 230 615 430 615 455 540 C 430 575 230 575 205 540 Z', fill: shade(top, 0.82), ...line }));
      body.appendChild(S('path', { d: 'M 292 590 L 286 676 M 368 590 L 374 676', fill: 'none', ...line, stroke: '#F4EFE6', 'stroke-width': 7 }));
      body.appendChild(S('path', { d: 'M 292 590 L 286 676 M 368 590 L 374 676', fill: 'none', ...line, 'stroke-width': 2 }));
    } else if (p.top === 'tee') {
      body.appendChild(S('path', { d: 'M 262 532 Q 330 600 398 532', fill: 'none', ...line }));
    } else if (p.top === 'shirt') {
      body.appendChild(S('path', { d: 'M 250 532 L 330 610 L 410 532 L 380 600 L 330 610 L 280 600 Z', fill: '#FBFAF8', ...line }));
      body.appendChild(S('path', { d: 'M 330 610 L 330 790', fill: 'none', ...line, 'stroke-width': 4 }));
    } else {
      body.appendChild(S('path', { d: 'M 262 532 L 330 640 L 398 532 Z', fill: '#FBFAF8', ...line }));
      body.appendChild(S('path', { d: 'M 250 532 L 300 700 L 330 640 L 262 532 Z M 410 532 L 360 700 L 330 640 L 398 532 Z', fill: shade(top, 0.85), ...line }));
    }
    // ---- head (sways and nods around the neck)
    const neck = S('path', { d: 'M 285 430 L 375 430 L 382 540 C 350 566 310 566 278 540 Z', fill: shade(skin, 0.9), ...line });
    if (p.hair === 'long') head.appendChild(S('path', { d: 'M 175 300 C 160 160 250 120 330 120 C 410 120 500 160 485 300 L 505 520 C 440 560 220 560 155 520 Z', fill: shade(hair, 0.9), ...line }));
    for (const x of [188, 472]) head.appendChild(S('ellipse', { cx: x, cy: 315, rx: 24, ry: 34, fill: skin, ...line }));
    head.appendChild(S('path', { d: 'M 190 300 C 186 175 250 130 330 130 C 410 130 474 175 470 300 C 468 400 420 468 330 470 C 240 468 192 400 190 300 Z', fill: skin, ...line }));
    // hair on top
    const H = d => head.appendChild(S('path', { d, fill: hair, ...line }));
    if (p.hair === 'short') H('M 192 285 C 176 150 262 112 335 118 C 420 118 486 165 468 285 C 452 222 410 200 330 204 C 260 200 214 226 192 285 Z');
    if (p.hair === 'side') H('M 192 290 C 180 150 270 108 345 116 C 430 122 486 172 468 280 C 440 210 380 180 300 200 C 250 212 214 240 192 290 Z');
    if (p.hair === 'buzz') head.appendChild(S('path', { d: 'M 196 262 C 196 162 262 132 330 132 C 400 132 466 162 464 262 C 440 200 400 186 330 186 C 262 186 220 200 196 262 Z', fill: hair, opacity: 0.85, ...line, 'stroke-width': 4 }));
    if (p.hair === 'curly' || p.hair === 'afro') {
      const R = p.hair === 'afro' ? 46 : 32, n = p.hair === 'afro' ? 13 : 11, g = S('g');
      for (let i = 0; i < n; i++) { const a = Math.PI * (1.05 + 0.9 * i / (n - 1)); g.appendChild(S('circle', { cx: 330 + Math.cos(a) * (p.hair === 'afro' ? 170 : 140), cy: 250 + Math.sin(a) * (p.hair === 'afro' ? 150 : 120), r: R, fill: hair, ...line })); }
      g.appendChild(S('ellipse', { cx: 330, cy: 170, rx: p.hair === 'afro' ? 150 : 120, ry: 62, fill: hair }));
      head.appendChild(g);
    }
    if (p.hair === 'long') H('M 192 292 C 180 150 262 114 335 118 C 420 118 486 165 468 292 C 430 200 370 186 300 214 C 260 228 220 250 192 292 Z');
    if (p.hair === 'bun') { head.appendChild(S('circle', { cx: 330, cy: 112, r: 50, fill: hair, ...line })); H('M 192 285 C 180 160 262 124 335 126 C 420 126 484 165 468 285 C 450 225 410 206 330 208 C 260 206 214 226 192 285 Z'); }
    if (p.accessory === 'cap') {
      head.appendChild(S('path', { d: 'M 188 262 C 190 150 260 112 334 112 C 410 112 472 150 472 262 Z', fill: TOPS.ink, ...line }));
      head.appendChild(S('path', { d: 'M 188 262 L 472 262 C 520 262 548 278 548 290 L 300 290 C 240 290 196 280 188 262 Z', fill: shade(TOPS.ink, 1.4), ...line }));
    }
    if (p.accessory === 'headphones') {
      head.appendChild(S('path', { d: 'M 176 300 C 170 130 490 130 484 300', fill: 'none', ...line, 'stroke-width': 18, stroke: OUT }));
      head.appendChild(S('path', { d: 'M 176 300 C 170 130 490 130 484 300', fill: 'none', ...line, 'stroke-width': 8, stroke: TOPS.red }));
      for (const x of [178, 482]) head.appendChild(S('rect', { x: x - 26, y: 278, width: 52, height: 78, rx: 18, fill: TOPS.red, ...line }));
    }
    // beard (under the mouth)
    if (p.beard === 'full') H('M 200 330 C 212 420 260 472 330 474 C 400 472 448 420 460 330 C 440 380 410 410 330 412 C 250 410 220 380 200 330 Z');
    if (p.beard === 'stubble') head.appendChild(S('path', { d: 'M 210 350 C 226 430 270 466 330 468 C 390 466 434 430 450 350 C 430 400 400 420 330 422 C 260 420 230 400 210 350 Z', fill: hair, opacity: 0.3 }));
    // eyes (blink = squash), pupils, brows
    for (const x of [272, 388]) {
      const g = S('g'); g.appendChild(S('ellipse', { cx: x, cy: 292, rx: 21, ry: 23, fill: '#FFFFFF', ...line, 'stroke-width': 5 }));
      g.appendChild(S('circle', { cx: x + 3, cy: 295, r: 9.5, fill: OUT }));
      g.appendChild(S('circle', { cx: x + 6, cy: 291, r: 3, fill: '#FFFFFF' }));
      head.appendChild(g); eyes.push({ g, x });
    }
    brows.appendChild(S('path', { d: 'M 244 252 Q 270 236 300 248 M 360 248 Q 390 236 416 252', fill: 'none', ...line, 'stroke-width': 10, stroke: p.hair === 'bald' || p.hair === 'buzz' ? shade(hair, 0.7) : shade(hair, 0.85) }));
    head.appendChild(brows);
    if (p.glasses !== 'none') {
      const gl = S('g', { fill: 'rgba(255,255,255,0.12)', ...line, 'stroke-width': 7 });
      if (p.glasses === 'round') for (const x of [272, 388]) gl.appendChild(S('circle', { cx: x, cy: 293, r: 42 }));
      else for (const x of [272, 388]) gl.appendChild(S('rect', { x: x - 46, y: 258, width: 92, height: 70, rx: 14 }));
      gl.appendChild(S('path', { d: 'M 314 290 Q 330 280 346 290', fill: 'none' }));
      gl.appendChild(S('path', { d: 'M 230 286 L 196 280 M 430 286 L 464 280', fill: 'none' }));
      head.appendChild(gl);
    }
    head.appendChild(S('path', { d: 'M 332 300 Q 318 346 338 352', fill: 'none', ...line, 'stroke-width': 5 }));
    if (p.beard === 'moustache') H('M 282 382 C 300 360 318 366 330 374 C 342 366 360 360 378 382 C 360 380 344 384 330 386 C 316 384 300 380 282 382 Z');
    // mouth: closed line + 9 open shapes
    const closed = S('path', { d: 'M 300 396 Q 330 410 360 396', fill: 'none', ...line, 'stroke-width': 6 });
    const open = S('path', { d: mouthPath(5), fill: '#7A2A25', ...line, 'stroke-width': 5 });
    const teeth = S('path', { d: '', fill: '#FFFFFF' });
    mouthG.appendChild(closed); mouthG.appendChild(open); mouthG.appendChild(teeth);
    head.appendChild(mouthG);
    if (p.accessory === 'earrings') for (const x of [188, 472]) head.appendChild(S('circle', { cx: x, cy: 356, r: 9, fill: TOPS.mustard, ...line, 'stroke-width': 4 }));
    // ---- hands (raised from below)
    const handPoint = S('g'); const handPalm = S('g');
    // pointing up and to the left, at the cards: a fist, a long index finger, the thumb tucked over it
    const pg = S('g', { transform: 'rotate(-38 150 700)' });
    pg.appendChild(S('path', { d: 'M 96 820 L 100 640 C 100 600 214 600 214 640 L 214 820 Z', fill: skin, ...line }));
    pg.appendChild(S('path', { d: 'M 112 630 L 112 470 C 112 444 150 444 150 470 L 150 628', fill: skin, ...line }));
    pg.appendChild(S('path', { d: 'M 150 640 C 168 622 214 626 214 652 M 150 676 C 170 660 214 664 214 690 M 150 714 C 170 700 214 702 214 726', fill: 'none', ...line, 'stroke-width': 5 }));
    pg.appendChild(S('path', { d: 'M 100 690 C 70 680 72 640 104 636 L 156 646 C 176 652 172 680 150 684 Z', fill: skin, ...line }));
    pg.appendChild(S('path', { d: 'M 84 790 L 226 790 L 240 1060 L 70 1060 Z', fill: top, ...line }));   // the sleeve
    handPoint.appendChild(pg);
    handPalm.appendChild(S('path', { d: 'M 70 800 L 80 600 L 74 520 C 72 500 104 498 106 520 L 116 590 L 114 492 C 114 470 148 470 148 492 L 150 586 L 160 500 C 162 478 194 480 192 502 L 186 594 L 206 532 C 212 512 240 518 236 540 L 214 640 C 210 700 204 760 200 800 Z', fill: skin, ...line }));
    handPalm.appendChild(S('path', { d: 'M 60 820 L 74 740 L 210 740 L 220 820 Z', fill: top, ...line }));
    hands.point = handPoint; hands.palm = handPalm;
    svg.appendChild(body); svg.appendChild(neck); svg.appendChild(head); svg.appendChild(handPoint); svg.appendChild(handPalm);
    svgHost.appendChild(svg);
    return { svg, head, body, eyes, brows, closed, open, teeth, hands, params: p };
  }

  // timeline data: mouth = string of digits per frame (30 fps), nods / points / palms = [t, ...], seed for blinks
  function rig(host, params, data) {
    const R = build(host, params), fps = data.fps || 30, mouth = data.mouth || '';
    const r = rng(data.seed || 7), blinks = [];
    for (let t = 1 + r() * 2; t < (data.duration || 120); t += 2.4 + r() * 1.8) blinks.push(t);
    const bump = (t, list, d) => { let k = 0; for (const a of list || []) if (t >= a && t < a + d) k = Math.max(k, Math.sin((t - a) / d * Math.PI)); return k; };
    const raise = (t, list, d) => {
      let k = 0;
      for (const a of list || []) if (t >= a && t < a + d) { const u = (t - a) / d; k = Math.max(k, u < 0.2 ? 1 - (1 - u / 0.2) ** 3 : u > 0.8 ? 1 - ((u - 0.8) / 0.2) ** 2 : 1); }
      return k;
    };
    return {
      params: R.params,
      render(t) {
        const nod = bump(t, data.nods, 0.5);
        const rot = 1.4 * Math.sin(t * 1.3) + 0.7 * Math.sin(t * 2.9 + 1) + 4 * nod;
        R.head.setAttribute('transform', `translate(${2 * Math.sin(t * 0.9)} ${3 * nod}) rotate(${rot.toFixed(2)} 330 460)`);
        R.body.setAttribute('transform', `translate(0 ${(1.5 * Math.sin(t * 1.6)).toFixed(2)})`);
        R.brows.setAttribute('transform', `translate(0 ${(-7 * nod).toFixed(2)})`);
        const bl = blinks.some(b => t >= b && t < b + 0.14);
        for (const e of R.eyes) e.g.setAttribute('transform', bl ? `translate(0 292) scale(1 0.1) translate(0 -292)` : '');
        const m = Math.max(0, Math.min(9, +(mouth[Math.floor(t * fps)] || 0)));
        R.closed.style.display = m === 0 ? '' : 'none';
        R.open.style.display = m === 0 ? 'none' : '';
        R.teeth.style.display = m >= 3 ? '' : 'none';
        if (m) {
          R.open.setAttribute('d', mouthPath(m));
          const w = 46 + m * 4.2;
          R.teeth.setAttribute('d', `M ${330 - w * 0.36} 398 Q 330 ${398 - 2} ${330 + w * 0.36} 398 L ${330 + w * 0.3} ${398 + 7} Q 330 ${398 + 9} ${330 - w * 0.3} ${398 + 7} Z`);
        }
        const hp = raise(t, data.points, 1.7), hq = raise(t, data.palms, 1.7);
        R.hands.point.setAttribute('transform', `translate(0 ${(1 - hp) * 420})`);
        R.hands.palm.setAttribute('transform', `translate(40 ${(1 - hq) * 420})`);
        R.hands.point.style.display = hp > 0.001 ? '' : 'none';
        R.hands.palm.style.display = hq > 0.001 ? '' : 'none';
      },
    };
  }

  window.EXP = { rig, random, norm, OPTIONS, SKIN, HAIR, TOPS };
})();
