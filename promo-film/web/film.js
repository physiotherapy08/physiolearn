// PhysioLearn — vertical promo film engine. render(t) draws the frame at film time t (seconds).
'use strict';
const W = 1080, H = 1920, root = document.getElementById('root');
const BOX = { home_summ:[307,569], home_quiz:[79,457], home_books:[92,563], home_case:[118,662], tab_lib:[149,756], person:[40,37], summ_item:[236,680], lib_item:[303,640], quiz_item:[189,261], quiz_start:[195,735], q1_opt:[82,276], q_next:[151,736], q5_opt:[60,346], q_finish:[127,736], res_review:[195,674], case_cat:[327,178], case_item:[170,130], set_login:[264,712] };
// orig narration time -> film time (1.5 s pre-roll, +4 s after the iPhone steps, +2 s before the Android result)
const F = o => o + 1.5 + (o > 167.9 ? 4 : 0) + (o > 183.55 ? 2 : 0);

/* ---------- easing & timing ---------- */
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const E = {
  o3: p => 1 - Math.pow(1 - p, 3), io3: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  ob: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  i3: p => p * p * p, lin: p => p,
};
const pr = (t, a, b, e = E.o3) => e(cl((t - a) / (b - a)));
const env = (t, a, b, fi = .45, fo = .4) => (t < a || t > b) ? 0 : Math.min(cl((t - a) / fi), cl((b - t) / fo));
const mix = (a, b, p) => a + (b - a) * p;

/* ---------- element registry ---------- */
const REG = new Map(); let P = {};
function mk(id, html, cls = '', nc = false, keep = false, parent = root) {
  const d = document.createElement('div');
  d.id = id; d.className = 'd ' + cls; d.innerHTML = html;
  if (nc) d.dataset.nc = 1;
  parent.appendChild(d);
  if (!keep) REG.set(id, d);
  return d;
}
const $ = id => document.getElementById(id);
function set(id, p) { P[id] = Object.assign(P[id] || {}, p); }
function flush() {
  for (const [id, el] of REG) {
    const p = P[id];
    if (!p || !(p.op > 0.001)) { if (el.style.opacity !== '0') { el.style.opacity = '0'; el.style.visibility = 'hidden'; } continue; }
    el.style.visibility = 'visible';
    el.style.opacity = p.op.toFixed(3);
    const c = el.dataset.nc ? '' : ' translate(-50%,-50%)';
    el.style.transform = `translate(${(p.x || 0).toFixed(1)}px,${(p.y || 0).toFixed(1)}px)${c}` +
      (p.rx ? ` rotateX(${p.rx.toFixed(2)}deg)` : '') + (p.ry ? ` rotateY(${p.ry.toFixed(2)}deg)` : '') +
      (p.r ? ` rotate(${p.r.toFixed(2)}deg)` : '') + (p.s != null && p.s !== 1 ? ` scale(${p.s.toFixed(4)})` : '');
    if (p.f != null) el.style.filter = p.f; else if (el.style.filter) el.style.filter = '';
  }
}

/* ---------- kinetic text ---------- */
// "{word}" marks a key word: class k + data index; words rise from behind their baseline.
function line(id, text, style, cls = '') {
  const html = text.split(' ').map(w => {
    const key = /^\{.*\}$/.test(w); const ww = key ? w.slice(1, -1) : w;
    return `<span class="w${key ? ' kw' : ''}"><i>${ww}</i></span>`;
  }).join(' ');
  const el = mk(id, `<div class="line ${cls}" style="${style}">${html}</div>`, 'c');
  el._w = [...el.querySelectorAll('.w>i')];
  return el;
}
function showLine(id, t, a, b, x, y, o = {}) {
  const el = $(id), st = o.st ?? .07, d = o.d ?? .5, v = env(t, a, b + (o.hold || 0), .25, o.fo ?? .35);
  if (v <= 0) return 0;
  set(id, { x, y, op: v * (o.op ?? 1), s: o.s ?? 1 });
  el._w.forEach((w, i) => {
    const p = pr(t, a + i * st, a + i * st + d, E.o3);
    w.style.transform = `translateY(${((1 - p) * 115).toFixed(1)}%)`;
  });
  return v;
}

/* ---------- line-art library (monoline SVG) ---------- */
const S = (vb, inner, w, sw = 3, col = '#0F7F7A') => `<svg class="la" width="${w}" viewBox="${vb}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ART = {
  knee: S('0 0 120 200', '<path d="M38 4 C40 40 36 70 30 86 C22 104 34 118 58 116 C82 114 96 104 90 86 C84 70 80 40 82 4"/><path d="M30 130 C40 124 80 124 92 132 C88 150 84 170 84 196 M36 130 C40 150 42 172 40 196"/><ellipse cx="60" cy="121" rx="18" ry="6"/>', 150),
  spine: S('0 0 80 220', [0,1,2,3,4,5].map(i => `<rect x="18" y="${8 + i * 35}" width="44" height="26" rx="9"/><path d="M40 ${34 + i * 35} v9"/>`).join(''), 95),
  book: S('0 0 160 130', '<path d="M80 22 C60 8 26 8 8 16 V118 C26 110 60 110 80 124 C100 110 134 110 152 118 V16 C134 8 100 8 80 22 Z"/><path d="M80 22 V124"/><path d="M24 40 h38 M24 58 h38 M24 76 h30 M98 40 h38 M98 58 h38 M98 76 h30"/>', 170),
  ecg: S('0 0 220 80', '<path d="M4 44 H60 L72 18 L86 70 L98 8 L110 44 H216"/>', 230, 3.5, '#19AFC0'),
  rom: S('0 0 200 120', '<path d="M20 110 A80 80 0 0 1 180 110"/><path d="M100 110 L150 52"/><circle cx="100" cy="110" r="6"/>' + [0,1,2,3,4,5,6,7,8].map(i => { const a = Math.PI * (1 - i / 8), x1 = 100 + 80 * Math.cos(a), y1 = 110 - 80 * Math.sin(a), x2 = 100 + 70 * Math.cos(a), y2 = 110 - 70 * Math.sin(a); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; }).join(''), 200, 3, '#12303B'),
  brain: S('0 0 200 160', '<path d="M98 20 C70 4 36 14 30 42 C8 50 6 84 24 96 C18 124 46 146 72 134 C84 150 108 150 116 136 C140 150 172 132 168 106 C192 96 192 60 170 50 C166 22 128 6 98 20 Z"/><path d="M100 22 V136 M58 52 C72 58 74 74 60 84 M140 50 C126 58 126 76 142 86 M52 108 C66 102 80 108 84 120 M146 110 C134 102 120 108 116 120"/>', 220),
  card: S('0 0 170 120', '<rect x="4" y="4" width="162" height="112" rx="16"/><circle cx="34" cy="34" r="12"/><path d="M58 30 h80 M58 44 h50 M20 70 h130 M20 88 h96"/>', 170, 3, '#19AFC0'),
  heart: S('0 0 140 130', '<path d="M70 120 C30 90 6 66 10 38 C14 14 46 4 70 30 C94 4 126 14 130 38 C134 66 110 90 70 120 Z"/><path d="M24 64 H50 L58 48 L68 82 L78 56 H116"/>', 130, 3, '#E0634F'),
  pdf: S('0 0 120 150', '<path d="M8 4 H80 L112 36 V146 H8 Z"/><path d="M80 4 V36 H112"/><path d="M28 74 h64 M28 92 h64 M28 110 h40"/>', 110, 3, '#234F8F'),
  link: S('0 0 140 80', '<path d="M58 22 H34 A18 18 0 0 0 34 58 H58 M82 22 H106 A18 18 0 0 1 106 58 H82 M48 40 H92"/>', 140, 3.5, '#5E4DB2'),
  video: S('0 0 150 110', '<rect x="4" y="4" width="142" height="102" rx="18"/><path d="M62 36 L98 55 L62 74 Z"/>', 140, 3, '#E0634F'),
  qmark: S('0 0 60 90', '<path d="M14 26 C14 8 46 4 48 26 C50 42 30 44 30 60"/><circle cx="30" cy="80" r="3.5" fill="#E1A23A" stroke="none"/>', 60, 5, '#E1A23A'),
  gear: S('0 0 100 100', '<circle cx="50" cy="50" r="18"/>' + [0,1,2,3,4,5,6,7].map(i => { const a = i * Math.PI / 4; return `<path d="M${(50 + 30 * Math.cos(a)).toFixed(1)} ${(50 + 30 * Math.sin(a)).toFixed(1)} L${(50 + 42 * Math.cos(a)).toFixed(1)} ${(50 + 42 * Math.sin(a)).toFixed(1)}"/>`; }).join('') + '<circle cx="50" cy="50" r="30"/>', 120, 4),
  mag: S('0 0 120 120', '<circle cx="50" cy="50" r="34"/><path d="M76 76 L112 112"/>', 120, 6, '#12303B'),
  hall: S('0 0 520 340', '<path d="M10 330 V40 L260 6 L510 40 V330"/><rect x="170" y="60" width="180" height="84" rx="6"/><path d="M60 330 C140 300 380 300 460 330 M90 290 C170 262 350 262 430 290 M120 252 C200 228 320 228 400 252"/><path d="M240 150 v40 M220 190 h40"/>', 520, 3, '#12303B'),
  bulb: S('0 0 120 160', '<path d="M60 10 C28 10 10 34 12 58 C14 80 32 92 38 110 H82 C88 92 106 80 108 58 C110 34 92 10 60 10 Z"/><path d="M40 124 H80 M44 140 H76 M60 46 V86 M46 66 H74"/>', 130, 4, '#E1A23A'),
  bars: S('0 0 160 140', '<path d="M10 130 H150"/><rect x="22" y="86" width="24" height="44" rx="6"/><rect x="66" y="56" width="24" height="74" rx="6"/><rect x="110" y="20" width="24" height="110" rx="6"/>', 150, 4),
  steps: S('0 0 160 160', '<path d="M30 140 C24 128 34 116 44 122 C52 128 44 144 30 140 Z M70 104 C64 92 74 80 84 86 C92 92 84 108 70 104 Z M106 66 C100 54 110 42 120 48 C128 54 120 70 106 66 Z"/><path d="M20 152 C70 140 120 90 146 20" stroke-dasharray="2 12"/>', 150, 4, '#19AFC0'),
  tablet: S('0 0 220 290', '<rect x="6" y="6" width="208" height="278" rx="24"/><rect x="22" y="24" width="176" height="236" rx="10"/>', 220, 4, '#12303B'),
  laptop: S('0 0 320 210', '<rect x="40" y="6" width="240" height="160" rx="14"/><rect x="56" y="22" width="208" height="128" rx="6"/><path d="M6 186 H314 L296 204 H24 Z"/>', 320, 4, '#12303B'),
  inf: S('0 0 260 120', '<path d="M130 60 C100 18 36 18 36 60 C36 102 100 102 130 60 C160 18 224 18 224 60 C224 102 160 102 130 60 Z"/>', 300, 6, '#0F7F7A'),
  arrowup: S('0 0 60 120', '<path d="M30 114 V10 M8 32 L30 8 L52 32"/>', 50, 6, '#E1A23A'),
  ring: S('0 0 200 200', '<circle cx="100" cy="100" r="96"/>', 200, 2, '#19AFC0'),
};
// prepare stroke-draw: every path gets its own length for dash animation
function prepDraw(el) {
  el._paths = [...el.querySelectorAll('path,circle,rect,ellipse')].map(p => { let L = 600; try { L = p.getTotalLength(); } catch (e) {} p.style.strokeDasharray = L; p.style.strokeDashoffset = L; return [p, L]; });
}
function draw(id, p) { const el = $(id); if (!el._paths) prepDraw(el); el._paths.forEach(([pa, L]) => pa.style.strokeDashoffset = (L * (1 - p)).toFixed(1)); }

/* ---------- finger & phone ---------- */
const FINGER = `<svg viewBox="0 0 150 190" width="150" height="190"><g transform="rotate(-16 40 40)"><path d="M30 8 C40 2 52 6 54 18 L56 96 C66 90 80 92 84 102 C94 96 108 100 110 112 C120 108 134 114 134 126 L134 150 C134 176 112 190 86 190 L64 190 C42 190 30 178 22 160 L6 124 C2 114 10 104 22 108 L30 116 L28 20 C28 14 28 10 30 8 Z" fill="#FFFFFF" stroke="#8FA7B0" stroke-width="3" stroke-linejoin="round"/><path d="M34 18 C36 12 48 12 50 18 L50 30 C44 33 38 33 34 30 Z" fill="#EEF4F6" stroke="#B8CAD0" stroke-width="2"/><path d="M56 96 L56 120 M84 102 L84 124 M110 112 L110 128" stroke="#B8CAD0" stroke-width="2.5" stroke-linecap="round"/></g></svg>`;
const TIP = [26, 10]; // fingertip inside the svg after rotation
const SB_IOS = `<div class="sb"><span>9:41</span><span class="ic"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 3C10.8 3 12.9 3.9 14.4 5.4L15.6 4.2C13.7 2.4 11.2 1.3 8.5 1.3S3.3 2.4 1.4 4.2L2.6 5.4C4.1 3.9 6.2 3 8.5 3Z M8.5 6.6C9.9 6.6 11.1 7.1 12 8L13.2 6.8C11.9 5.6 10.3 4.9 8.5 4.9S5.1 5.6 3.8 6.8L5 8C5.9 7.1 7.1 6.6 8.5 6.6Z"/><circle cx="8.5" cy="10.3" r="1.5"/></svg><svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#000" stroke-opacity=".35"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5S25.8 4.8 25 4.5Z" opacity=".4"/></svg></span></div>`;
const SB_AND = `<div class="sb"><span>9:41</span><span class="ic"><svg width="14" height="12" viewBox="0 0 14 12"><path d="M7 12L0 3C4-1 10-1 14 3Z"/></svg><svg width="12" height="12" viewBox="0 0 12 12"><path d="M12 0V12H0Z"/></svg><svg width="9" height="14" viewBox="0 0 9 14"><rect x="0" y="1.5" width="9" height="12.5" rx="1.5"/><rect x="3" y="0" width="3" height="2"/></svg></span></div>`;
const appImg = (n, extra = '') => `<img class="app" src="shots/${n}.png" ${extra}>`;

function phone(id, kind, layers) {
  const el = mk(id, '', 'c phone ' + (kind === 'and' ? 'and' : 'iosp'));
  el.innerHTML = `<div class="body"></div><div class="screen" id="${id}_scr"></div>${kind === 'and' ? '<div class="punch"></div>' : '<div class="island"></div>'}<div class="glare"></div>`;
  const scr = $(id + '_scr');
  layers.forEach(([k, html]) => mk(`${id}_${k}`, html, 'L', true, false, scr));
  mk(id + '_rip', '', 'ripple', true, false, scr);
  mk(id + '_rip2', '', 'ripple', true, false, scr);
  mk(id + '_hl', '', 'hl', true, false, scr);
  mk(id + '_fg', FINGER, 'finger', true, false, el);
  return el;
}
// show a layer: op + optional slide x/y (screen points)
const L = (ph, k, op = 1, x = 0, y = 0) => set(`${ph}_${k}`, { op, x, y });
// cross-fade/slide from layer A to B starting at t0
function swap(ph, t, t0, a, b, dir = 1, d = .35) {
  const p = pr(t, t0, t0 + d, E.io3);
  if (p < 1) L(ph, a, 1, -dir * 60 * p, 0);
  if (p > 0) L(ph, b, p, dir * 90 * (1 - p), 0);
}
// sequence of screens [[time, layer], ...] — slides between them
function seq(ph, t, list, dir = 1) {
  let i = 0; while (i + 1 < list.length && t >= list[i + 1][0]) i++;
  const [t0, k] = list[i];
  if (i > 0 && t < t0 + .35) swap(ph, t, t0, list[i - 1][1], k, dir); else L(ph, k, 1);
  return k;
}
// finger tap at screen point (x,y) at time tt. Finger glides in before, lifts after.
function tap(ph, t, tt, x, y, o = {}) {
  const pre = o.pre ?? .55, post = o.post ?? .4, from = o.from || [x + 70, y + 160];
  if (t < tt - pre || t > tt + post) return false;
  let fx, fy, s = 1, op = 1;
  if (t < tt) { const p = pr(t, tt - pre, tt - .06, E.io3); fx = mix(from[0], x, p); fy = mix(from[1], y, p); op = cl((t - tt + pre) / .15); }
  else { fx = x; fy = y; op = cl((tt + post - t) / .2); }
  const press = env(t, tt - .08, tt + .14, .06, .1); s = 1 - .08 * press;
  set(ph + '_fg', { x: 14 + fx - TIP[0], y: 14 + fy - TIP[1] + press * 4, op, s });
  // ripple
  const rp = pr(t, tt, tt + .5, E.o3);
  if (t >= tt) set(ph + '_rip', { x, y, op: 1 - rp, s: 1 + rp * 3.2 });
  return true;
}
function hl(ph, t, a, b, x, y, w, h, r = 14) {
  const v = env(t, a, b, .2, .2); if (!v) return;
  const el = $(ph + '_hl'); el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.borderRadius = r + 'px';
  const pulse = 1 + .03 * Math.sin((t - a) * 9);
  set(ph + '_hl', { x: x - w / 2, y: y - h / 2, op: v, s: pulse });
}

// centre of an element in screen points (ignores transforms), relative to the phone screen
function sp(sel, ph) {
  let el = typeof sel === 'string' ? document.querySelector(sel) : sel; const w = el.offsetWidth, h = el.offsetHeight; let x = 0, y = 0;
  while (el && el.id !== ph + '_scr') { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
  return [x + w / 2, y + h / 2];
}
/* ---------- device UI builders (recreated from current iOS 26 Safari / Android Chrome) ---------- */
const GI = (bg, glyph) => `<div class="i" style="background:${bg}">${glyph}</div>`;
const gl = (d, c = '#fff') => `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GEN = [
  ['Calendar', '#FFFFFF', gl('<rect x="5" y="7" width="20" height="18" rx="3"/><path d="M5 12h20M10 4v5M20 4v5"/>', '#E0634F')],
  ['Clock', '#1C1C1E', gl('<circle cx="15" cy="15" r="10"/><path d="M15 9v6l4 3"/>')],
  ['Weather', 'linear-gradient(#4FA3E0,#2D6FB8)', gl('<circle cx="12" cy="12" r="5"/><path d="M10 22h12a4 4 0 0 0 0-8"/>')],
  ['Notes', '#FFFFFF', gl('<path d="M8 6h14v18H8z"/><path d="M11 11h8M11 15h8M11 19h5"/>', '#C79A2B')],
  ['Files', '#FFFFFF', gl('<path d="M5 9h8l2 3h10v11H5z"/>', '#2D7FD8')],
  ['Music', 'linear-gradient(#F0627A,#D93C5B)', gl('<path d="M12 21V8l11-3v13"/><circle cx="9" cy="21" r="3"/><circle cx="20" cy="18" r="3"/>')],
  ['Camera', '#D9DDE2', gl('<rect x="4" y="9" width="22" height="15" rx="3"/><circle cx="15" cy="16" r="4.5"/><path d="M11 9l2-3h4l2 3"/>', '#333')],
  ['Settings', '#8E959C', gl('<circle cx="15" cy="15" r="4"/><circle cx="15" cy="15" r="9" stroke-dasharray="3 3"/>')],
  ['Maps', 'linear-gradient(#7CD49C,#4FB37C)', gl('<path d="M15 25s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="15" cy="13" r="2.5"/>')],
  ['Calculator', '#333', gl('<rect x="7" y="5" width="16" height="20" rx="3"/><path d="M10 10h10M11 15h1M15 15h1M19 15h1M11 20h1M15 20h1M19 20h1"/>', '#F3A43A')],
  ['Photos', '#FFFFFF', gl('<circle cx="15" cy="15" r="3"/><path d="M15 5v5M15 20v5M5 15h5M20 15h5M8 8l3.5 3.5M18.5 18.5L22 22M22 8l-3.5 3.5M11.5 18.5L8 22"/>', '#E9A13B')],
  ['Mail', 'linear-gradient(#58A9F5,#2B7DE0)', gl('<rect x="5" y="8" width="20" height="14" rx="2"/><path d="M5 9l10 7 10-7"/>')],
];
const BROWSER_IOS = GI('linear-gradient(#FFFFFF,#E9EEF3)', `<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="none" stroke="#2D8CF0" stroke-width="3"/><path d="M21 7v4M21 31v4M7 21h4M31 21h4" stroke="#9DB3C8" stroke-width="2"/><path d="M27 15l-4 8-8 4 4-8z" fill="#E0634F"/><path d="M27 15l-8 4 4 4z" fill="#2D8CF0"/></svg>`);
const BROWSER_AND = GI('#FFFFFF', `<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="#5F7D95" stroke-width="3"/><circle cx="22" cy="22" r="7.5" fill="#3E86E6"/><path d="M22 4v11M8 31l9-5M36 31l-9-5" stroke="#5F7D95" stroke-width="2.5"/></svg>`);
function iosHome(withPL) {
  const apps = GEN.slice(0, 11).map(([n, bg, g]) => `<div class="app">${GI(bg, g)}<span>${n}</span></div>`);
  apps.splice(4, 0, `<div class="app" id="saf_icon">${BROWSER_IOS}<span>Safari</span></div>`);
  if (withPL) apps.splice(12, 1, `<div class="app" id="pl_slot_ios"><div class="pl-ic"><i></i></div><span>PhysioLearn</span></div>`);
  return `<div class="ios" style="position:absolute;inset:0"><div class="wall"></div>${SB_IOS}<div class="grid">${apps.join('')}</div><div class="dock">${[GEN[11], GEN[6], GEN[10], GEN[3]].map(([n, bg, g]) => `<div class="app">${GI(bg, g)}</div>`).join('')}</div></div>`;
}
function andHome(withPL) {
  const apps = GEN.slice(0, 11).map(([n, bg, g]) => `<div class="app">${GI(bg, g).replace('border-radius:15px', '')}<span>${n}</span></div>`);
  apps.splice(4, 0, `<div class="app" id="chr_icon">${BROWSER_AND}<span>Chrome</span></div>`);
  if (withPL) apps.splice(12, 1, `<div class="app" id="pl_slot_and"><div class="pl-ic" style="border-radius:50%"><i></i></div><span>PhysioLearn</span></div>`);
  return `<div style="position:absolute;inset:0" class="andui"><div class="andwall"></div>${SB_AND.replace('class="sb"', 'class="sb" style="color:#fff"')}<div class="grid" style="top:70px">${apps.join('').replace(/class="i"/g, 'class="i" style="border-radius:50%"')}</div><div class="gbar">${gl('<circle cx="13" cy="13" r="7"/><path d="M18 18l6 6"/>', '#666')}<span style="margin-left:10px">Search</span></div><div class="navh" style="background:rgba(255,255,255,.7)"></div></div>`;
}
const URL_S = 'physiotherapy08.github.io';
const safari = () => `<div class="ios" style="position:absolute;inset:0;background:#fff">${SB_IOS}
  <div id="saf_page" style="position:absolute;inset:0;opacity:0">${appImg('home')}</div>
  <div id="saf_blank" style="position:absolute;left:0;right:0;top:47px;bottom:0;background:#F2F2F7"><div style="padding:26px 22px;font:700 22px Inter">Favourites</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:0 22px">${[1,2,3,4].map(() => '<div style="height:70px;border-radius:16px;background:#E3E6EC"></div>').join('')}</div></div>
  <div id="saf_load" style="position:absolute;left:0;top:47px;height:3px;width:0;background:#0A7AFF;z-index:21"></div>
  <div class="sbar"><div class="b glass">${gl('<path d="M18 7l-8 8 8 8"/>', '#111')}</div><div class="addr glass" id="saf_addr">${gl('<path d="M9 13v-2a6 6 0 0 1 12 0v2"/><rect x="7" y="13" width="16" height="11" rx="2"/>', '#555').replace('width="30" height="30"', 'width="16" height="16"')}<span id="saf_url"></span><span id="saf_caret" style="width:2px;height:20px;background:#0A7AFF"></span></div><div class="b glass" id="saf_more">${gl('<circle cx="8" cy="15" r="1.6" fill="#111"/><circle cx="15" cy="15" r="1.6" fill="#111"/><circle cx="22" cy="15" r="1.6" fill="#111"/>', '#111')}</div></div>
  <div class="navh"></div></div>`;
const iosMenu = () => `<div class="ios" style="position:absolute;inset:0"><div style="position:absolute;inset:0;background:rgba(0,0,0,.08)"></div><div class="menu glass" style="background:rgba(250,250,252,.95)">
  ${[['Share', '<path d="M15 4v14M10 9l5-5 5 5M8 14v10h14V14"/>'], ['Add to Bookmarks', '<path d="M7 5h16v20l-8-5-8 5z"/>'], ['Add to Favourites', '<path d="M15 5l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>'], ['Add to Reading List', '<circle cx="11" cy="15" r="6"/><path d="M19 12h7M19 18h7"/>']].map(([n, d], i) => `<div class="it" id="${i === 0 ? 'ios_share_it' : ''}"><span>${n}</span>${gl(d, '#111').replace('width="30" height="30"', 'width="22" height="22"')}</div>`).join('')}
  <div class="sep"></div>${[['Find on Page', '<circle cx="13" cy="13" r="7"/><path d="M18 18l7 7"/>'], ['Translate', '<path d="M5 8h12M11 5v3M7 8c1 6 6 9 10 10M17 8c-1 5-5 9-10 11M19 24l4-10 4 10M20 21h6"/>'], ['Request Desktop Website', '<rect x="4" y="6" width="22" height="14" rx="2"/><path d="M11 25h8M15 20v5"/>']].map(([n, d]) => `<div class="it"><span>${n}</span>${gl(d, '#111').replace('width="30" height="30"', 'width="22" height="22"')}</div>`).join('')}
  </div></div>`;
const iosShare = () => `<div class="ios" style="position:absolute;inset:0"><div style="position:absolute;inset:0;background:rgba(0,0,0,.25)"></div><div class="sheet" id="shs">
  <div style="width:40px;height:5px;border-radius:3px;background:#C7C7CC;margin:8px auto 0"></div>
  <div class="hd"><div class="pl-ic" style="width:50px;height:50px;border-radius:12px"><i style="width:20px;height:20px;border-width:3.5px"></i></div><div><div style="font:600 16px Inter">PhysioLearn</div><div style="font:400 13px Inter;color:#8A8A8E">${URL_S} · Options ›</div></div><div style="margin-left:auto;width:30px;height:30px;border-radius:50%;background:#E3E3E8;display:flex;align-items:center;justify-content:center">${gl('<path d="M9 9l12 12M21 9L9 21"/>', '#555').replace('width="30" height="30"', 'width="14" height="14"')}</div></div>
  <div class="row">${['#3EA5F7', '#4CD964', '#2D8CF0', '#FFCC00', '#B0B5BC'].map((c, i) => `<div class="a"><i style="background:${c};opacity:.85"></i><span>${['Nearby', 'Message', 'Email', 'Notes', 'More'][i]}</span></div>`).join('')}</div>
  <div id="sh_list"><div class="grp">${['Copy', 'Add to Reading List', 'Add Bookmark', 'Add to Favourites'].map(n => `<div class="it"><span>${n}</span></div>`).join('')}</div>
  <div class="grp">${['Find on Page', 'Add to Home Screen', 'Markup', 'Print'].map(n => `<div class="it" ${n === 'Add to Home Screen' ? 'id="sh_add"' : ''}><span>${n}</span>${n === 'Add to Home Screen' ? gl('<rect x="6" y="6" width="18" height="18" rx="4"/><path d="M15 10v10M10 15h10"/>', '#111').replace('width="30" height="30"', 'width="22" height="22"') : ''}</div>`).join('')}</div></div>
  </div></div>`;
const iosAdd = () => `<div class="ios addhs">${SB_IOS}<div class="nav"><span class="blue">Cancel</span><b>Add to Home Screen</b><span class="blue" style="font-weight:600" id="add_btn">Add</span></div>
  <div class="grp" style="padding:14px;display:flex;gap:14px;align-items:center"><div class="pl-ic"><i></i></div><div style="flex:1"><div style="font:400 17px Inter;padding:8px 0;border-bottom:.5px solid #E2E2E7">PhysioLearn</div><div style="font:400 14px Inter;color:#8A8A8E;padding-top:8px">https://${URL_S}/physiolearn/</div></div></div>
  <div class="grp"><div class="it" id="tog_row"><span>Open as Web App</span><div class="tog"></div></div></div>
  <div style="font:400 13px Inter;color:#8A8A8E;padding:4px 32px">An icon will be added to your Home Screen so you can quickly access this website.</div></div>`;
const splash = (r = 15) => `<div style="position:absolute;inset:0;background:#F5F7F7;display:flex;align-items:center;justify-content:center"><div class="pl-ic" style="width:110px;height:110px;border-radius:${r === 15 ? 28 : 55}px"><i style="width:44px;height:44px;border-width:7px;border-radius:50% 50% 50% 10px"></i></div></div>`;
const chrome = () => `<div style="position:absolute;inset:0;background:#fff">${SB_AND}
  <div id="chr_page" style="position:absolute;left:0;right:0;top:64px;bottom:0;overflow:hidden;opacity:0"><img class="app" src="shots/home.png"></div>
  <div id="chr_blank" style="position:absolute;left:0;right:0;top:96px;bottom:0;background:#fff;display:flex;flex-direction:column;align-items:center;padding-top:110px;gap:26px"><div style="width:120px;height:40px;border-radius:20px;background:#EEF1F4"></div><div style="width:320px;height:52px;border-radius:26px;background:#EEF1F4"></div></div>
  <div class="abar">${gl('<path d="M6 15l9-8 9 8M9 13v10h12V13"/>', '#444').replace('width="30" height="30"', 'width="24" height="24"')}<div class="url">${gl('<path d="M9 13v-2a6 6 0 0 1 12 0v2"/><rect x="7" y="13" width="16" height="11" rx="2"/>', '#555').replace('width="30" height="30"', 'width="15" height="15"')}<span id="chr_url"></span><span id="chr_caret" style="width:2px;height:19px;background:#0B57D0"></span></div><div class="tabs">1</div><div id="chr_dots" style="width:26px;display:flex;justify-content:center">${gl('<circle cx="15" cy="7" r="2" fill="#444"/><circle cx="15" cy="15" r="2" fill="#444"/><circle cx="15" cy="23" r="2" fill="#444"/>', '#444').replace('width="30" height="30"', 'width="26" height="26"')}</div></div>
  <div id="chr_load" style="position:absolute;left:0;top:94px;height:3px;width:0;background:#0B57D0;z-index:21"></div>
  <div class="navh"></div></div>`;
const andMenu = () => `<div style="position:absolute;inset:0"><div class="amenu"><div class="ico">${['<path d="M10 15h12M17 9l6 6-6 6"/>', '<path d="M15 5l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>', '<path d="M15 5v14M9 13l6 6 6-6M7 25h16"/>', '<circle cx="15" cy="15" r="10"/><path d="M15 14v7M15 9v1"/>', '<path d="M24 15a9 9 0 1 1-3-6.7M24 6v6h-6"/>'].map(d => gl(d, '#444').replace('width="30" height="30"', 'width="22" height="22"')).join('')}</div>
  ${['New tab', 'New Incognito tab', 'History', 'Delete browsing data', 'Downloads', 'Bookmarks', 'Recent tabs', 'Share…', 'Find in page', 'Translate…', 'Install app', 'Desktop site', 'Settings'].map(n => `<div class="it" ${n === 'Install app' ? 'id="am_install"' : ''}>${n}</div>`).join('')}</div></div>`;
const andDlg = () => `<div style="position:absolute;inset:0"><div class="scrim"></div><div class="dlg"><div style="font:400 24px Inter;color:#1F1F1F;margin-bottom:20px">Install app</div><div style="display:flex;gap:16px;align-items:center;margin-bottom:28px"><div class="pl-ic" style="width:52px;height:52px;border-radius:50%"><i style="width:21px;height:21px;border-width:4px"></i></div><div><div style="font:500 17px Inter">PhysioLearn</div><div style="font:400 14px Inter;color:#5F6368">${URL_S}</div></div></div><div style="display:flex;justify-content:flex-end;gap:32px;font:500 16px Inter;color:#0B57D0;padding-right:6px"><span>Cancel</span><span id="dlg_inst">Install</span></div></div></div>`;

/* ---------- build the scene graph ---------- */
// background dot grid
(() => { const c = $('dots').getContext('2d'); c.fillStyle = 'rgba(18,48,59,.10)'; for (let y = 30; y < H; y += 46) for (let x = 30; x < W; x += 46) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); } })();

const APP_SCREENS = ['home_new', 'summaries_list', 'summary_detail', 'library', 'book_detail', 'quizzes_list', 'quiz_detail', 'quiz_q1', 'quiz_q1_sel', 'quiz_q5_sel', 'quiz_result', 'quiz_review', 'cases_cats', 'cases_list', 'case_detail', 'channels', 'saved', 'settings_signed', 'settings_guest', 'signup', 'home'];
phone('ph1', 'ios', [
  ['tall', `<div id="tallwrap" style="position:absolute;left:0;top:47px;width:390px"><img src="shots/home_tall.png" style="width:390px;display:block"></div><img src="shots/tabbar.png" style="position:absolute;left:0;top:${47 + 713}px;width:390px">${SB_IOS}`],
  ...APP_SCREENS.map(n => [n, appImg(n) + SB_IOS]),
  ['ios_home', iosHome(false)], ['safari', safari()], ['ios_menu', iosMenu()], ['ios_share', iosShare()], ['ios_add', iosAdd()],
  ['ios_home2', iosHome(true)], ['splash', splash()],
]);
phone('ph2', 'and', [
  ['and_home', andHome(false)], ['chrome', chrome()], ['and_menu', andMenu()], ['and_dlg', andDlg()],
  ['and_home2', andHome(true)], ['and_splash', splash(55)], ['and_app', appImg('home') + SB_AND],
]);
// mini phones for multi-device scene
mk('logo', `<div style="display:flex;align-items:center;gap:26px;direction:ltr"><div id="logo_sq" style="width:150px;height:150px;border-radius:44px;background:#0F7F7A;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -9px 0 rgba(0,0,0,.12),0 30px 60px rgba(15,127,122,.28)"><div style="width:60px;height:60px;border:11px solid #fff;border-radius:50% 50% 50% 13px"></div></div><div id="logo_wm" style="font:600 92px 'Readex Pro';color:#12303B;letter-spacing:-1px">Physio<span style="color:#0F7F7A">Learn</span></div></div>`, 'c');
mk('logosq', `<div style="width:220px;height:220px;border-radius:64px;background:#0F7F7A;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -12px 0 rgba(0,0,0,.12),0 40px 80px rgba(15,127,122,.30)"><div style="width:88px;height:88px;border:16px solid #fff;border-radius:50% 50% 50% 18px"></div></div>`, 'c');
for (let i = 0; i < 3; i++) mk('shock' + i, ART.ring, 'c');
mk('sig', '<i></i>@mohammed_pt', 'c');
mk('chap', '', 'c tag');

// hook knowledge elements
const HOOK = [['knee', 170, 360, -14], ['spine', 900, 420, 10], ['book', 200, 1450, -8], ['ecg', 820, 1530, 0], ['rom', 840, 900, 6], ['brain', 230, 860, -6], ['card', 560, 300, 4], ['heart', 560, 1650, 0], ['pdf', 950, 1220, 12], ['video', 120, 1170, -10]];
HOOK.forEach(([k], i) => mk('hk' + i, ART[k], 'c'));
// problem scene art
mk('path', `<svg class="la" width="900" height="1300" viewBox="0 0 900 1300" fill="none" stroke="#0F7F7A" stroke-width="5" stroke-linecap="round"><path id="jpath" d="M450 1290 C450 1150 170 1110 190 960 C210 810 700 830 700 660 C700 500 260 520 260 360 C260 220 450 180 450 20"/></svg>`, 'c');
mk('jdot', '<div style="width:34px;height:34px;border-radius:50%;background:#19AFC0;box-shadow:0 0 0 10px rgba(25,175,192,.2)"></div>', 'c');
mk('hall', ART.hall, 'c');
for (let i = 0; i < 4; i++) mk('qm' + i, ART.qmark, 'c');
['مفهوم', 'تشريح', 'حركة', 'تقييم'].forEach((w, i) => mk('cn' + i, `<div style="font:500 30px Alex;color:#12303B;background:#fff;border:2px solid #CFE6E8;border-radius:999px;padding:10px 26px">${w}</div>`, 'c'));
mk('gear', ART.gear, 'c'); mk('bars', ART.bars, 'c');
const SCAT = [['book', 0], ['pdf', 0], ['link', 0], ['video', 0], ['card', 0], ['book', 1], ['pdf', 1], ['link', 1], ['video', 1], ['card', 1], ['pdf', 2], ['book', 2]];
SCAT.forEach(([k], i) => mk('sc' + i, `<div style="background:#fff;border-radius:24px;padding:22px;box-shadow:0 16px 40px rgba(18,48,59,.10)">${ART[k]}</div>`, 'c'));
mk('mag', ART.mag, 'c');
mk('br1', `<div style="width:40px;height:150px;border:7px solid #19AFC0;border-left:none;border-radius:0 26px 26px 0"></div>`, 'c');
mk('br2', `<div style="width:40px;height:150px;border:7px solid #19AFC0;border-right:none;border-radius:26px 0 0 26px"></div>`, 'c');
// feature chips
const chip = (id, txt, col = '#0F7F7A') => mk(id, `<div style="display:flex;align-items:center;gap:14px;background:#fff;border-radius:999px;padding:16px 30px 16px 22px;box-shadow:0 14px 34px rgba(18,48,59,.10);font:500 34px Alex;color:#12303B;direction:rtl;white-space:nowrap"><span style="width:16px;height:16px;border-radius:50%;background:${col}"></span>${txt}</div>`, 'c');
chip('ch_rev', 'مراجعة المعلومات'); chip('ch_org', 'تنظيم دراستك', '#234F8F'); chip('ch_und', 'تعزيز فهمك', '#5E4DB2');
chip('ch_eval', 'تقييم معلوماتك'); chip('ch_conc', 'مراجعة المفاهيم', '#234F8F'); chip('ch_focus', 'نقاط تحتاج تركيزاً', '#E1A23A');
chip('ch_prog', 'تقدّمك في الاختبارات'); chip('ch_save', 'المواد المحفوظة', '#234F8F'); chip('ch_back', 'تعود لها متى احتجت', '#5E4DB2');
['b1', 'b2', 'b3', 'b4'].forEach((b, i) => mk('cov' + i, `<img src="../demo/covers/${b}.jpg" style="width:200px;border-radius:10px;box-shadow:0 30px 50px rgba(18,48,59,.25)">`, 'c'));
// clinical bridge
mk('brain2', ART.brain, 'c');
mk('bridge', `<svg class="la" width="760" height="140" viewBox="0 0 760 140" fill="none" stroke="#19AFC0" stroke-width="5" stroke-linecap="round"><path d="M20 110 C200 10 560 10 740 110"/><path d="M700 88 L740 110 L700 128"/></svg>`, 'c');
mk('bl1', '<div class="lbl" style="font-size:40px">معلومة علمية</div>', 'c');
mk('bl2', '<div class="lbl" style="font-size:40px;color:#0F7F7A">تطبيق عملي</div>', 'c');
mk('limb', S('0 0 240 260', '<path d="M60 10 C70 60 70 100 92 130 C110 156 150 170 196 176 C220 180 226 210 200 214 C150 222 104 214 72 186 C40 158 26 110 22 60"/><circle cx="88" cy="128" r="12"/><path d="M60 10 C90 60 100 96 120 120" stroke="#19AFC0" stroke-dasharray="6 10"/>', 240, 4, '#12303B'), 'c');
// horizons
for (let i = 0; i < 5; i++) mk('hz' + i, `<div style="width:900px;height:900px;border-radius:50%;border:3px solid rgba(25,175,192,.55)"></div>`, 'c');
// devices
mk('tab', ART.tablet, 'c'); mk('lap', ART.laptop, 'c');
mk('sync', `<svg class="la" width="700" height="260" viewBox="0 0 700 260" fill="none" stroke="#19AFC0" stroke-width="5" stroke-linecap="round" stroke-dasharray="4 16"><path d="M20 200 C200 40 500 40 680 200"/></svg>`, 'c');
for (let i = 0; i < 3; i++) mk('ok' + i, `<div style="width:64px;height:64px;border-radius:50%;background:#0F7F7A;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(15,127,122,.3)">${gl('<path d="M8 15l5 5 9-10"/>', '#fff')}</div>`, 'c');
// url search fatigue
mk('urlbar', `<div style="width:860px;height:110px;border-radius:55px;background:#fff;box-shadow:0 16px 40px rgba(18,48,59,.12);display:flex;align-items:center;gap:20px;padding:0 36px;direction:ltr;font:500 36px Inter;color:#12303B">${gl('<circle cx="13" cy="13" r="7"/><path d="M18 18l6 6"/>', '#6B8590').replace('width="30" height="30"', 'width="40" height="40"')}<span id="url_txt"></span><span style="width:3px;height:44px;background:#19AFC0"></span></div>`, 'c');
mk('strike', '<div style="width:900px;height:8px;border-radius:4px;background:#E0634F"></div>', 'c');
mk('hsgrid', `<div style="display:grid;grid-template-columns:repeat(4,120px);gap:40px 46px;padding:60px 56px;background:linear-gradient(160deg,#DCEFF2,#E9EEF8);border-radius:70px;box-shadow:0 40px 80px rgba(18,48,59,.18),inset 0 0 0 14px #12303B">${Array.from({ length: 16 }, (_, i) => i === 9 ? '<div id="hs_slot" style="width:120px;height:120px"></div>' : `<div style="width:120px;height:120px;border-radius:30px;background:rgba(255,255,255,.75)"></div>`).join('')}</div>`, 'c');
mk('dropic', `<div class="pl-ic" style="width:120px;height:120px;border-radius:30px"><i style="width:48px;height:48px;border-width:8px;border-radius:50% 50% 50% 11px"></i></div>`, 'c');
// install chapter
mk('mini_i', `<div style="width:180px;height:370px;border-radius:40px;border:6px solid #12303B;position:relative"><div style="position:absolute;left:50%;top:14px;width:56px;height:16px;margin-left:-28px;border-radius:8px;background:#12303B"></div></div>`, 'c');
mk('mini_a', `<div style="width:180px;height:370px;border-radius:28px;border:6px solid #12303B;position:relative"><div style="position:absolute;left:50%;top:16px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#12303B"></div></div>`, 'c');
mk('mini_lbl_i', '<div class="lbl" style="font-size:44px">آيفون</div>', 'c');
mk('mini_lbl_a', '<div class="lbl" style="font-size:44px">أندرويد</div>', 'c');
// install steps (instruction labels)
const step = (id, n, txt) => mk(id, `<div class="step"><b>${n}</b>${txt}</div>`, 'c');
step('si1', '١', 'افتح الرابط في سفاري'); step('si2', '٢', 'اضغط ••• ثم «مشاركة»'); step('si3', '٣', 'اختر «إضافة إلى الشاشة الرئيسية»'); step('si4', '٤', 'اضغط «إضافة»'); step('si5', '✓', 'افتحه من الأيقونة');
step('sa1', '١', 'افتح الرابط في كروم'); step('sa2', '٢', 'اضغط النقاط الثلاث ⋮'); step('sa3', '٣', 'اختر «تثبيت التطبيق»'); step('sa4', '٤', 'اضغط «تثبيت»'); step('sa5', '✓', 'افتحه من الأيقونة');
mk('osb_i', `<div class="tag" style="font-size:34px"><b>آيفون</b>سفاري</div>`, 'c');
mk('osb_a', `<div class="tag" style="font-size:34px"><b>أندرويد</b>كروم</div>`, 'c');
// closing art
mk('bulb', ART.bulb, 'c'); mk('bars2', ART.bars, 'c'); mk('steps', ART.steps, 'c'); mk('inf', ART.inf, 'c'); mk('arrow', ART.arrowup, 'c');
mk('en1', `<div style="font:800 118px AlexL;letter-spacing:14px;color:#12303B;direction:ltr">PHYSIOLEARN</div>`, 'c');
mk('en2', `<div style="font:300 44px AlexL;letter-spacing:9px;color:#0F7F7A;direction:ltr">YOUR KNOWLEDGE. YOUR JOURNEY.</div>`, 'c');
mk('creator', `<div style="width:900px;background:#fff;border-radius:48px;padding:64px 60px;box-shadow:0 40px 90px rgba(18,48,59,.16);direction:rtl;text-align:center">
  <div style="width:120px;height:120px;border-radius:50%;margin:0 auto 26px;background:linear-gradient(145deg,#0F7F7A,#19AFC0);display:flex;align-items:center;justify-content:center;font:800 54px Alex;color:#fff">م</div>
  <div style="font:900 76px Alex;color:#12303B">محمد البراشدي</div>
  <div style="font:500 36px Alex;color:#E1A23A;margin:10px 0 34px">أخصائي علاج طبيعي</div>
  <div style="display:flex;flex-direction:column;gap:18px;font:500 29px Alex;color:#33505B;line-height:1.5">
   <div><span style="font:800 20px AlexL;letter-spacing:3px;color:#0F7F7A;display:block;direction:ltr">EDUCATION</span>طالب ماجستير علاج طبيعي في جامعة انتجرال</div>
   <div><span style="font:800 20px AlexL;letter-spacing:3px;color:#0F7F7A;display:block;direction:ltr">SPECIAL OLYMPICS MENA</span>مستشار الأطباء المتطوعين في العلاج الطبيعي</div>
   <div><span style="font:800 20px AlexL;letter-spacing:3px;color:#0F7F7A;display:block;direction:ltr">CREATOR</span>محتوى AI</div></div>
  <div style="margin:40px auto 0;display:inline-flex;align-items:center;gap:14px;background:#12303B;color:#fff;border-radius:999px;padding:16px 36px;font:600 34px Inter;direction:ltr"><span style="width:14px;height:14px;border-radius:50%;background:#19AFC0"></span>@mohammed_pt</div></div>`, 'c');

/* ---------- text lines ---------- */
const T = (id, txt, size, weight = 800, color = '#12303B', font = 'Alex') => line(id, txt, `font:${weight} ${size}px ${font};color:${color}`);
T('t_plat', 'منصتك التعليمية', 62, 500, '#33505B');
T('t_deep1', 'نحو معرفة', 64, 300, '#33505B'); T('t_deep2', 'أعمق', 190, 900, '#0F7F7A');
T('t_fut1', 'ومستقبل مهني', 64, 300, '#33505B'); T('t_fut2', 'أفضل', 190, 900, '#E1A23A');
T('t_jour', 'رحلة طالب العلاج الطبيعي', 60, 800);
T('t_lim1', 'المعرفة لا تتوقف', 70, 900); T('t_lim2', 'عند حدود المحاضرات', 52, 300, '#33505B');
T('t_q1', 'تساؤلات جديدة', 76, 900, '#E1A23A'); T('t_q2', 'ومفاهيم تحتاج فهماً أعمق', 52, 300, '#33505B');
T('t_sk1', 'مهارات', 120, 900, '#0F7F7A'); T('t_sk2', 'تتطلب البحث والتطوير المستمر', 50, 300, '#33505B');
T('t_src1', 'كتب · مراجع · مصادر', 66, 800); T('t_src2', 'متعددة ومبعثرة', 50, 300, '#33505B');
T('t_ch1', 'الوصول للمعلومة', 56, 300, '#33505B'); T('t_ch2', 'تحدٍّ', 200, 900, '#E0634F');
T('t_idea', 'ومن هنا جاءت فكرة', 56, 300, '#33505B');
T('t_one1', 'مصادر العلاج الطبيعي', 56, 500, '#33505B'); T('t_one2', 'في مساحة واحدة', 96, 900, '#0F7F7A');
T('t_near1', 'أقرب إليك', 92, 900); T('t_near2', 'وأسهل في الوصول والاستفادة', 50, 300, '#33505B');
T('t_what', 'ماذا تقدّم لك المنصة؟', 74, 900);
T('t_summ', 'الملخصات والمحتوى العلمي', 64, 800); T('t_books', 'كتب ومراجع تخصصية', 64, 800); T('t_books2', 'توسّع معرفتك وتدعم تطورك', 46, 300, '#33505B');
T('t_quiz', 'اختبر معلوماتك', 80, 900); T('t_case1', 'العلاج الطبيعي', 56, 300, '#33505B'); T('t_case2', 'ليس معرفة نظرية فقط', 70, 900);
T('t_case3', 'الحالات السريرية', 80, 900, '#0F7F7A'); T('t_case4', 'تقرّب لك التفكير الإكلينيكي', 48, 300, '#33505B');
T('t_case5', 'توظيف المعرفة مع الحالات', 58, 800);
T('t_yt1', 'قنوات ومصادر تعليمية', 64, 800); T('t_yt2', 'آفاق أوسع', 130, 900, '#19AFC0'); T('t_yt3', 'وطرق متنوعة لاكتساب المعرفة', 48, 300, '#33505B');
T('t_acc1', 'تجربتك لا تتوقف عند التصفح', 54, 500, '#33505B'); T('t_acc2', 'حسابك الشخصي', 92, 900, '#0F7F7A');
T('t_dev1', 'تابع رحلتك', 92, 900); T('t_dev2', 'عبر أجهزتك المختلفة', 54, 300, '#33505B');
T('t_lnk1', 'لا حاجة للبحث عن الرابط', 60, 800); T('t_lnk2', 'في كل مرة', 48, 300, '#33505B');
T('t_ins1', 'ثبّته كتطبيق', 96, 900, '#0F7F7A'); T('t_ins2', 'على شاشتك الرئيسية', 54, 300, '#33505B');
T('t_how1', 'كيف تثبّت', 70, 300, '#33505B'); T('t_how2', 'PhysioLearn', 120, 600, '#12303B', "'Readex Pro'"); T('t_how3', 'على هاتفك؟', 70, 800);
T('t_done', 'تم التثبيت', 70, 900, '#0F7F7A');
T('t_and_done', 'من شاشة هاتفك مباشرة', 58, 800);
T('t_tag1', 'مساحة تجمع المعرفة،', 70, 700, '#12303B', 'Naskh'); T('t_tag2', 'وتدعم التعلم،', 70, 700, '#0F7F7A', 'Naskh');
T('t_tag3', 'وتقرّب المصادر التخصصية', 62, 700, '#12303B', 'Naskh'); T('t_tag4', 'من طلبة العلاج الطبيعي.', 62, 700, '#12303B', 'Naskh');
T('t_v1', 'كل معلومة جديدة', 58, 800); T('t_v2', 'وكل مهارة تتطور', 58, 800); T('t_v3', 'وكل خطوة في طريق التعلم', 52, 800);
T('t_v4', 'تصنع فارقاً في مستقبلك', 76, 900, '#E1A23A');
T('t_st1', 'ابدأ رحلتك مع المعرفة', 76, 900); T('t_st2', 'واجعل التعلم مستمراً', 60, 300, '#0F7F7A');

/* ---------- helpers for scenes ---------- */
const PHY = 1215, PHS = 1.38; // default phone position/scale for feature scenes
function phoneAt(ph, t, x, y, s, op = 1, extra = {}) {
  const float = Math.sin(t * .9) * 4;
  set(ph, Object.assign({ x, y: y + float, s, op }, extra));
}
function chapter(t, a, b, num, txt) {
  const v = env(t, a, b, .35, .35); if (!v) return;
  $('chap').innerHTML = `<b>${num}</b>${txt}`;
  set('chap', { x: W / 2, y: 150 + (1 - pr(t, a, a + .5)) * -20, op: v });
}
function slam(id, t, a, b, x, y, from = 1.9) { // key word slams in oversized, settles with shockwave
  const v = env(t, a, b, .12, .35); if (!v) return;
  const p = pr(t, a, a + .38, E.o3);
  set(id, { x, y, op: v, s: mix(from, 1, p), f: p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : null });
  $(id)._w.forEach(w => w.style.transform = 'none');
}
function shock(t, a, x, y, col) { for (let i = 0; i < 3; i++) { const p = pr(t, a + i * .09, a + i * .09 + .9, E.o3); if (p > 0 && p < 1) set('shock' + i, { x, y, op: (1 - p) * .9, s: .4 + p * 2.6 }); } }

/* ============ RENDER ============ */
function render(t) {
  P = {};
  if (t < 222.2) set('sig', { x: 150, y: 70, op: env(t, 2, 222.2, .8, .6) * .95 });

  /* ---- HOOK 0 – 9 ---- */
  if (t < 9.6) {
    HOOK.forEach(([k, x, y, r], i) => {
      const a = i * .07, conv = pr(t, 1.05 + i * .02, 1.62, E.i3);
      const dx = Math.sin(t * .8 + i) * 18, dy = Math.cos(t * .7 + i * 1.3) * 14;
      const X = mix(x + dx, W / 2, conv), Y = mix(y + dy, 860, conv);
      const op = cl((t - a) / .35) * (1 - pr(t, 1.5, 1.7));
      if (op > 0) { set('hk' + i, { x: X, y: Y, op, r: r * (1 - conv), s: 1.75 * (1 - conv * .9) * (1 + .05 * Math.sin(t * 2 + i)) }); draw('hk' + i, pr(t, a, a + .9)); }
    });
    // logo forms at the spoken name (film 1.72)
    const lp = pr(t, 1.62, 2.2, E.ob), lv = cl((t - 1.62) / .12) * (1 - pr(t, 8.9, 9.5));
    if (lv > 0) {
      const up = pr(t, 2.9, 3.6, E.io3) * 0 + pr(t, 4.75, 5.35, E.io3);
      set('logo', { x: W / 2, y: mix(860, 360, up), op: lv, s: mix(.3, 1, lp) * mix(1, .72, up) });
      const wm = pr(t, 1.85, 2.45, E.o3); $('logo_wm').style.clipPath = `inset(0 ${(100 - wm * 100).toFixed(1)}% 0 0)`;
    }
    shock(t, 1.66, W / 2, 860);
    showLine('t_plat', t, 3.06, 4.75, W / 2, 1010);
    // "نحو معرفة أعمق" — depth rings collapse into the word
    showLine('t_deep1', t, 5.0, 6.55, W / 2, 760);
    if (t > 5.75 && t < 6.9) { slam('t_deep2', t, 5.75, 6.55, W / 2, 950, 1.5); for (let i = 0; i < 3; i++) { const p = pr(t, 5.6 + i * .08, 6.1 + i * .08, E.i3); if (p < 1) set('shock' + i, { x: W / 2, y: 950, op: p * .8 * (1 - p) * 3, s: 3 - p * 2.4 }); } }
    showLine('t_fut1', t, 6.82, 8.75, W / 2, 1180);
    if (t > 7.75) { slam('t_fut2', t, 7.75, 8.75, W / 2, 1380, 1.2); const ap = pr(t, 7.75, 8.4); set('arrow', { x: W / 2 + 330, y: 1400 - ap * 60, op: env(t, 7.8, 8.75, .2, .35), s: 1.4 }); draw('arrow', ap); }
  }

  /* ---- PROBLEM 9.3 – 36 ---- */
  if (t > 9.2 && t < 36.4) {
    const jp = pr(t, 9.33, 25.5, E.lin), pv = env(t, 9.33, 27.6, .5, .6);
    if (pv) {
      set('path', { x: W / 2, y: 1150, op: pv * .9 }); draw('path', pr(t, 9.33, 11.4, E.io3) * .25 + jp * .75);
      const pe = $('jpath'), Lp = pe.getTotalLength(), pt = pe.getPointAtLength(Lp * (1 - (pr(t, 9.33, 11.4, E.io3) * .25 + jp * .75)));
      set('jdot', { x: W / 2 - 450 + pt.x, y: 1150 - 650 + pt.y, op: pv });
    }
    showLine('t_jour', t, 9.33, 11.6, W / 2, 330);
    // lecture hall: knowledge path breaks through its walls
    const hv = env(t, 11.96, 16.6, .5, .5);
    if (hv) { set('hall', { x: W / 2, y: 1220, op: hv, s: 1.35 }); draw('hall', pr(t, 11.96, 13.2)); }
    showLine('t_lim1', t, 11.96, 16.6, W / 2, 300); showLine('t_lim2', t, 13.3, 16.6, W / 2, 410);
    // questions pop along the path
    for (let i = 0; i < 4; i++) { const a = 17.6 + i * .45, v = env(t, a, 23.6, .2, .4); if (v) { const p = pr(t, a, a + .5, E.ob); set('qm' + i, { x: [250, 790, 330, 760][i], y: [1050, 900, 650, 1400][i], op: v, s: p * 1.7, r: Math.sin(t * 2 + i) * 8 }); draw('qm' + i, p); } }
    showLine('t_q1', t, 18.83, 23.6, W / 2, 300); showLine('t_q2', t, 21.26, 23.6, W / 2, 420);
    for (let i = 0; i < 4; i++) { const v = env(t, 21.3 + i * .18, 23.6, .3, .3); if (v) set('cn' + i, { x: [300, 780, 260, 800][i], y: [1250, 1180, 800, 720][i], op: v, s: .9 + .1 * pr(t, 21.3 + i * .18, 21.8 + i * .18, E.ob) }); }
    // skills: gear turns, bars grow
    const sv = env(t, 23.92, 27.5, .4, .45);
    if (sv) { set('gear', { x: 360, y: 1050, op: sv, s: 2.2, r: (t - 23.9) * 60 }); draw('gear', pr(t, 23.92, 24.8)); set('bars', { x: 720, y: 1080, op: sv, s: 2.4 }); draw('bars', pr(t, 24.3, 26.4)); }
    showLine('t_sk1', t, 23.92, 27.5, W / 2, 330); showLine('t_sk2', t, 24.9, 27.5, W / 2, 470);
    // scattered sources
    const scv = env(t, 27.54, 38.6, .4, .45);
    SCAT.forEach((s, i) => {
      if (!scv) return;
      const a = 27.6 + i * .12, ang = i * 2.39, rad = 260 + (i % 4) * 90;
      const bx = W / 2 + Math.cos(ang) * rad * 1.05, by = 1150 + Math.sin(ang) * rad * 1.15;
      const pin = pr(t, a, a + .6, E.ob), conv = pr(t, 37.4, 38.5, E.i3);
      const jit = t > 31.6 && t < 35.8 ? Math.sin(t * 7 + i) * 6 : 0;
      set('sc' + i, { x: mix(W / 2, bx, pin) + Math.sin(t * .9 + i) * 14 + jit, y: mix(1150, by, pin) + Math.cos(t * .8 + i) * 12, op: scv * cl((t - a) / .25) * (1 - conv), s: (.62 + (i % 3) * .08) * (1 - conv * .7), r: Math.sin(i * 3.1) * 14 * (1 - conv) });
    });
    showLine('t_src1', t, 27.54, 31.3, W / 2, 300); showLine('t_src2', t, 28.9, 31.3, W / 2, 400);
    // challenge: magnifier wanders, the word shakes
    const mv = env(t, 31.67, 35.9, .4, .4);
    if (mv) { const u = t - 31.67; set('mag', { x: W / 2 + Math.sin(u * 1.7) * 280, y: 1150 + Math.sin(u * 2.3 + 1) * 300, op: mv, s: 1.5, r: Math.sin(u * 3) * 12 }); draw('mag', pr(t, 31.67, 32.4)); }
    showLine('t_ch1', t, 31.67, 35.9, W / 2, 280);
    if (t > 33.4 && t < 36) { slam('t_ch2', t, 33.4, 35.9, W / 2, 470, 1.6); const shake = t < 34.2 ? Math.sin(t * 60) * 10 * (1 - pr(t, 33.6, 34.2)) : 0; if (P['t_ch2']) P['t_ch2'].x += shake; }
  }

  /* ---- IDEA 36.3 – 52.3 ---- */
  if (t > 36.2 && t < 52.6) {
    showLine('t_idea', t, 36.31, 39.4, W / 2, 330);
    const lv = env(t, 38.3, 39.6, .15, .4);
    if (lv) { set('logo', { x: W / 2, y: 520, op: lv, s: .82 * mix(1.4, 1, pr(t, 38.3, 38.75, E.o3)) }); $('logo_wm').style.clipPath = 'none'; shock(t, 38.35, W / 2 - 300, 520); }
    // phone rises; sources fly into its screen
    const rise = pr(t, 39.4, 40.4, E.o3), pv = env(t, 39.4, 52.6, .3, .4);
    if (pv) {
      phoneAt('ph1', t, W / 2, mix(1800, PHY + 60, rise), PHS * .98, pv, { ry: mix(-18, 0, rise), rx: mix(10, 0, rise) });
      const sc = t < 47.9 ? 0 : 640 * pr(t, 47.9, 51.8, E.io3);
      L('ph1', 'tall'); $('tallwrap').style.transform = `translateY(${-sc}px)`;
    }
    SCAT.forEach((s, i) => {
      const a = 40.6 + i * .1, p = pr(t, a, a + .55, E.i3);
      if (t > a - .05 && p < 1) { const ang = i * 2.39, rad = 420; set('sc' + i, { x: mix(W / 2 + Math.cos(ang) * rad, W / 2, p), y: mix(1150 + Math.sin(ang) * rad, PHY, p), op: 1 - p * .6, s: .6 * (1 - p * .9) }); }
    });
    showLine('t_one1', t, 40.07, 47.55, W / 2, 300);
    if (t > 46.1 && t < 47.7) {
      const p = pr(t, 46.13, 46.6, E.ob); showLine('t_one2', t, 46.0, 47.55, W / 2, 440);
      set('br1', { x: W / 2 - mix(560, 420, p), y: 440, op: env(t, 46.13, 47.55, .15, .3), s: .7 }); set('br2', { x: W / 2 + mix(560, 420, p), y: 440, op: env(t, 46.13, 47.55, .15, .3), s: .7 });
    }
    showLine('t_near1', t, 47.92, 52.3, W / 2, 300); showLine('t_near2', t, 49.72, 52.3, W / 2, 420);
  }

  /* ---- WHAT IT OFFERS 52.8 – 54.6 ---- */
  if (t > 52.6 && t < 55.4) {
    const v = env(t, 52.79, 55.0, .2, .35);
    showLine('t_what', t, 52.79, 54.9, W / 2, 900, { st: .08 });
    for (let i = 0; i < 3; i++) { const p = pr(t, 52.8 + i * .12, 54.5 + i * .12, E.o3); if (v) set('shock' + i, { x: W / 2, y: 900, op: (1 - p) * .5 * v, s: .6 + p * 3 }); }
  }

  /* ---- FEATURES 55 – 120 : phone demonstrates the real app ---- */
  if (t > 54.9 && t < 120.3) {
    const enter = pr(t, 54.9, 55.7, E.o3);
    let px = W / 2, ps = PHS, ry = mix(14, 0, enter);
    // clinical bridge pushes the phone to the side
    const side = pr(t, 100.6, 101.4, E.io3) * (1 - pr(t, 108.4, 109.3, E.io3));
    px = mix(W / 2, 780, side); ps = mix(PHS, 1.0, side);
    phoneAt('ph1', t, px, mix(1900, PHY, enter) + side * 120, ps, env(t, 54.9, 125, .2, .45), { ry: ry - side * 10 });
    const ph = 'ph1';
    // screen sequence (times = film)
    const S1 = [[54.9, 'home'], [55.95, 'summaries_list'], [59.45, 'summary_detail'],
      [68.3, 'home'], [69.4, 'library'], [74.4, 'book_detail'],
      [78.7, 'home'], [79.8, 'quizzes_list'], [81.7, 'quiz_detail'], [84.0, 'quiz_q1'], [85.25, 'quiz_q1_sel'], [86.75, 'quiz_q5_sel'], [88.0, 'quiz_result'], [90.6, 'quiz_review'],
      [93.4, 'home'], [95.6, 'cases_cats'], [98.0, 'cases_list'], [99.6, 'case_detail'],
      [109.3, 'channels']];
    seq(ph, t, S1);
    tap(ph, t, 55.55, ...BOX.home_summ); tap(ph, t, 59.05, ...BOX.summ_item);
    tap(ph, t, 69.0, ...BOX.tab_lib); tap(ph, t, 74.0, ...BOX.lib_item);
    tap(ph, t, 79.4, ...BOX.home_quiz); tap(ph, t, 81.3, ...BOX.quiz_item); tap(ph, t, 83.6, ...BOX.quiz_start);
    tap(ph, t, 85.05, ...BOX.q1_opt, { pre: .4 }); tap(ph, t, 86.45, ...BOX.q_next, { pre: .35 }); tap(ph, t, 87.6, ...BOX.q_finish, { pre: .4 }); tap(ph, t, 90.2, ...BOX.res_review);
    tap(ph, t, 95.2, ...BOX.home_case); tap(ph, t, 97.6, ...BOX.case_cat); tap(ph, t, 99.2, ...BOX.case_item);
    // highlight the result ring briefly
    hl(ph, t, 88.2, 89.8, 195, 47 + 120, 220, 220, 110);
    chapter(t, 55.19, 67.95, '٠١', 'الملخصات');
    showLine('t_summ', t, 55.19, 59.3, W / 2, 330);
    [['ch_rev', 59.99, 330], ['ch_org', 63.11, 450], ['ch_und', 64.61, 570]].forEach(([id, a, y]) => { const v = env(t, a, 67.95, .3, .35); if (v) set(id, { x: W / 2 + (1 - pr(t, a, a + .4)) * 80, y: y - 40, op: v }); });
    chapter(t, 68.37, 78.3, '٠٢', 'الكتب والمراجع');
    showLine('t_books', t, 68.37, 78.3, W / 2, 330); showLine('t_books2', t, 71.0, 78.3, W / 2, 440);
    for (let i = 0; i < 4; i++) { const a = 70.2 + i * .15, v = env(t, a, 73.6, .4, .4); if (v) { const p = pr(t, a, a + .7, E.ob); set('cov' + i, { x: mix(W / 2, [150, 930, 120, 960][i], p), y: mix(PHY, [820, 860, 1330, 1380][i], p), op: v, s: .5 + p * .45, r: [-12, 10, 8, -9][i] * p, ry: [-25, 25, -20, 20][i] }); } }
    chapter(t, 78.96, 93.05, '٠٣', 'الاختبارات');
    showLine('t_quiz', t, 78.96, 85.2, W / 2, 330);
    [['ch_eval', 85.43, 330], ['ch_conc', 87.96, 450], ['ch_focus', 89.53, 570]].forEach(([id, a, y]) => { const v = env(t, a, 93.05, .3, .35); if (v) set(id, { x: W / 2 + (1 - pr(t, a, a + .4)) * 80, y: y - 40, op: v }); });
    chapter(t, 93.56, 109.0, '٠٤', 'الحالات السريرية');
    showLine('t_case1', t, 93.56, 97.2, W / 2, 290); showLine('t_case2', t, 94.3, 97.2, W / 2, 390);
    showLine('t_case3', t, 97.4, 100.9, W / 2, 300); showLine('t_case4', t, 98.6, 100.9, W / 2, 410);
    // knowledge -> application bridge
    const bv = env(t, 101.08, 109.0, .4, .45);
    if (bv) {
      set('brain2', { x: 250, y: 820, op: bv, s: 1.25 }); draw('brain2', pr(t, 101.1, 102.4));
      set('limb', { x: 270, y: 1420, op: bv, s: 1.2 }); draw('limb', pr(t, 101.9, 103.4));
      set('bl1', { x: 250, y: 1040, op: bv * pr(t, 101.6, 102.1) }); set('bl2', { x: 270, y: 1640, op: bv * pr(t, 102.8, 103.3) });
      const bp = pr(t, 102.2, 103.6); set('bridge', { x: 250, y: 1230, op: bv, s: .5, r: 90 }); draw('bridge', bp);
    }
    showLine('t_case5', t, 101.08, 109.0, W / 2, 330);
    chapter(t, 109.46, 119.84, '٠٥', 'قنوات يوتيوب');
    showLine('t_yt1', t, 109.46, 113.6, W / 2, 330);
    if (t > 113.6) { slam('t_yt2', t, 113.75, 116.8, W / 2, 380, 1.3); for (let i = 0; i < 5; i++) { const p = ((t - 113.75) * .45 + i / 5) % 1; set('hz' + i, { x: W / 2, y: 380, op: env(t, 113.75, 119.84, .3, .4) * (1 - p) * .7, s: .15 + p * 1.2 }); } }
    showLine('t_yt3', t, 116.92, 119.84, W / 2, 530);
  }

  /* ---- ACCOUNT 120.5 – 139 ---- */
  if (t > 120.3 && t < 139.4) {
    chapter(t, 120.5, 138.53, '٠٦', 'حسابك الشخصي');
    const enter = 1, dev = pr(t, 133.5, 134.4, E.io3);
    phoneAt('ph1', t, mix(W / 2, 360, dev), mix(1900, PHY, enter) + dev * 80, mix(PHS, .9, dev), env(t, 120.3, 139.2, .2, .4), { ry: mix(14, 0, enter) + dev * 8 });
    const k = seq('ph1', t, [[120.0, 'channels'], [120.6, 'home'], [124.6, 'settings_signed'], [126.4, 'tall'], [129.4, 'saved'], [131.5, 'tall']]);
    if (k === 'tall') { const sc = t < 129 ? mix(0, 850, pr(t, 126.5, 127.5, E.io3)) : mix(700, 1060, pr(t, 131.6, 132.5, E.io3)); $('tallwrap').style.transform = `translateY(${-sc}px)`; }
    tap('ph1', t, 124.25, ...BOX.person); hl('ph1', t, 124.9, 126.2, 195, 47 + 712, 362, 80, 16);
    hl('ph1', t, 127.7, 129.2, 195, 47 + 122 + 100, 362, 236, 22); hl('ph1', t, 132.6, 133.5, 195, 47 + 110 + 150, 362, 300, 22);
    showLine('t_acc1', t, 120.5, 124.0, W / 2, 330); showLine('t_acc2', t, 124.18, 133.4, W / 2, 300);
    [['ch_prog', 126.32, 420], ['ch_save', 129.42, 530], ['ch_back', 131.51, 640]].forEach(([id, a, y]) => { const v = env(t, a, 133.4, .3, .35); if (v) set(id, { x: W / 2 + (1 - pr(t, a, a + .4)) * 80, y: y - 30, op: v }); });
    const dv = env(t, 133.7, 139.2, .4, .4);
    if (dv) {
      set('tab', { x: 800, y: 1080, op: dv * pr(t, 133.9, 134.4), s: 1.05 }); draw('tab', pr(t, 133.9, 135));
      set('lap', { x: 760, y: 1560, op: dv * pr(t, 134.3, 134.8), s: 1.0 }); draw('lap', pr(t, 134.3, 135.4));
      set('sync', { x: 600, y: 900, op: dv, s: .75 }); draw('sync', pr(t, 135, 136.2));
      [[800, 1080], [760, 1530], [360, 1300]].forEach(([x, y], i) => { const p = pr(t, 136.2 + i * .25, 136.6 + i * .25, E.ob); if (p > 0) set('ok' + i, { x, y, op: dv, s: p }); });
    }
    showLine('t_dev1', t, 133.65, 139.2, W / 2, 300); showLine('t_dev2', t, 136.79, 139.2, W / 2, 420);
  }

  /* ---- INSTALL INTRO 138.9 – 154.4 ---- */
  if (t > 138.9 && t < 154.6) {
    showLine('t_lnk1', t, 138.96, 144.6, W / 2, 330); showLine('t_lnk2', t, 141.44, 144.6, W / 2, 430);
    const uv = env(t, 139.3, 144.7, .3, .4);
    if (uv) {
      const full = 'physiotherapy08.github.io/physiolearn', cyc = ((t - 139.5) % 1.7) / 1.7, n = Math.floor(cl(cyc / .7) * full.length);
      $('url_txt').textContent = full.slice(0, n);
      set('urlbar', { x: W / 2, y: 1000, op: uv * (cyc > .9 ? 1 - (cyc - .9) * 10 : 1) });
      if (t > 142.4) { const sp = pr(t, 142.6, 143.0); set('strike', { x: W / 2, y: 1000, op: uv, r: -6 }); $('strike').firstChild.style.transform = `scaleX(${sp})`; }
    }
    showLine('t_ins1', t, 144.88, 154.4, W / 2, 330); showLine('t_ins2', t, 146.97, 154.4, W / 2, 450);
    const gv = env(t, 145.0, 154.4, .4, .4);
    if (gv) {
      const gr = pr(t, 145.0, 145.8, E.o3);
      const fl = Math.sin((t - 145) * 1.1) * 10;
      set('hsgrid', { x: W / 2, y: 1180 + (1 - gr) * 120 + fl, op: gv, s: .95, ry: Math.sin((t - 145) * .6) * 6 });
      const dp = pr(t, 147.2, 148.4, E.ob), X = 461, Y = 1256;
      set('dropic', { x: X, y: mix(560, Y, dp), op: gv * cl((t - 147.1) / .15), s: .95 * mix(1.6, 1, dp) * (1 + .06 * env(t, 150.9, 152.2, .3, .5)) });
      if (t > 148.3) shock(t, 148.35, X, Y);
      if (t > 149.4) for (let i = 0; i < 3; i++) { const q = ((t - 149.4) * .55 + i / 3) % 1; if (!(t > 148.3 && t < 149.4)) set('shock' + i, { x: X, y: Y + fl, op: gv * (1 - q) * .55, s: .5 + q * 1.4 }); }
      P['dropic'].y += t > 148.4 ? fl : 0;
    }
  }

  /* ---- INSTALL CHAPTER 154.6 – 157.4 ---- */
  if (t > 154.4 && t < 157.6) {
    showLine('t_how1', t, 154.61, 157.3, W / 2, 560); showLine('t_how2', t, 154.9, 157.3, W / 2, 720, { st: 0 }); showLine('t_how3', t, 155.3, 157.3, W / 2, 870);
    const v = env(t, 155.0, 157.3, .35, .3);
    if (v) { set('mini_i', { x: 330, y: 1300, op: v, r: -6 }); set('mini_a', { x: 750, y: 1300, op: v, r: 6 }); set('mini_lbl_i', { x: 330, y: 1560, op: v }); set('mini_lbl_a', { x: 750, y: 1560, op: v }); }
  }

  /* ---- IPHONE 157.5 – 173.6 ---- */
  if (t > 157.3 && t < 174.4) {
    const ph = 'ph1', enter = pr(t, 157.3, 158.1, E.o3), exit = pr(t, 173.3, 174.2, E.io3);
    phoneAt(ph, t, W / 2 - exit * 900, mix(1900, 1240, enter), 1.38, env(t, 157.3, 174.3, .2, .3), { ry: exit * -25 });
    set('osb_i', { x: W / 2, y: 150, op: env(t, 157.52, 173.3, .3, .3) });
    // screens
    const k = seq(ph, t, [[157.3, 'ios_home'], [160.25, 'safari'], [170.35, 'ios_home2'], [171.85, 'splash'], [172.45, 'home']]);
    // Safari: type URL, load, page
    if (t >= 160.25 && t < 170.7) {
      const full = URL_S + '/physiolearn', n = Math.floor(pr(t, 160.6, 161.7, E.lin) * full.length);
      $('saf_url').textContent = t < 162.3 ? full.slice(0, n) : 'physiotherapy08.github.io';
      $('saf_caret').style.opacity = t < 162.0 ? (Math.floor(t * 3) % 2 ? 1 : 0) : 0;
      $('saf_load').style.width = (pr(t, 161.8, 162.35, E.lin) * 390 * (t < 162.5 ? 1 : 0)) + 'px';
      $('saf_page').style.opacity = pr(t, 162.2, 162.5); $('saf_blank').style.opacity = 1 - pr(t, 162.2, 162.5);
    }
    // ••• menu → Share → sheet → scroll → Add to Home Screen → Add screen
    if (t > 163.55 && t < 164.6) L(ph, 'ios_menu', pr(t, 163.55, 163.75));
    if (t > 164.45 && t < 167.8) { const p = pr(t, 164.45, 164.85, E.o3); L(ph, 'ios_share', 1, 0, 0); $('shs').style.transform = `translateY(${(1 - p) * 620}px)`; $('sh_list').style.transform = `translateY(${-140 * pr(t, 165.3, 166.1, E.io3)}px)`; }
    if (t > 167.35 && t < 170.6) { const p = pr(t, 167.35, 167.75, E.io3); L(ph, 'ios_add', 1, (1 - p) * 390, 0); }
    // taps
    const ic = q => { const [x, y] = sp(q, ph); return [x, y - 10]; };
    tap(ph, t, 160.0, ...ic('#saf_icon .i'));
    tap(ph, t, 163.35, ...sp('#saf_more', ph)); hl(ph, t, 162.8, 163.4, ...sp('#saf_more', ph), 60, 60, 30);
    { const [x, y] = sp('#ios_share_it', ph); tap(ph, t, 164.25, x, y); hl(ph, t, 163.8, 164.3, x, y, 236, 44, 12); }
    { const [x, y0] = sp('#sh_add', ph), y = y0 - 140; tap(ph, t, 167.0, x, y); hl(ph, t, 166.25, 167.05, x, y, 358, 50, 12); }
    hl(ph, t, 168.1, 169.4, ...sp('#tog_row', ph), 358, 50, 12);
    { const [x, y] = sp('#add_btn', ph); tap(ph, t, 169.9, x, y); hl(ph, t, 169.45, 169.95, x, y, 64, 38, 10); }
    tap(ph, t, 171.6, ...sp('#pl_slot_ios .pl-ic', ph));
    // step labels
    const ST = [['si1', 158.3, 163.0], ['si2', 163.1, 165.0], ['si3', 165.06, 168.9], ['si4', 169.0, 170.5], ['si5', 170.6, 173.3]];
    ST.forEach(([id, a, b]) => { const v = env(t, a, b, .25, .25); if (v) set(id, { x: W / 2, y: 330 + (1 - pr(t, a, a + .35)) * 30, op: v }); });
    if (t > 171.9 && t < 173.4) showLine('t_done', t, 171.9, 173.3, W / 2, 450);
    // the new icon pops in on the home screen
    if (k === 'ios_home2') { const p = pr(t, 170.4, 170.9, E.ob); const sl = document.querySelector('#pl_slot_ios .pl-ic'); sl.style.transform = `scale(${p})`; }
  }

  /* ---- ANDROID 173.4 – 199 ---- */
  if (t > 173.3 && t < 199.4) {
    const ph = 'ph2', enter = pr(t, 173.4, 174.3, E.o3);
    phoneAt(ph, t, W / 2 + (1 - enter) * 900, 1240, 1.38, env(t, 173.4, 199.1, .2, .4), { ry: (1 - enter) * 25 });
    set('osb_a', { x: W / 2, y: 150, op: env(t, 173.91, 198.6, .3, .3) });
    const k = seq(ph, t, [[173.4, 'and_home'], [176.75, 'chrome'], [190.0, 'and_home2'], [192.25, 'and_splash'], [192.85, 'and_app']]);
    if (t >= 176.75 && t < 190.4) {
      const full = URL_S + '/physiolearn', n = Math.floor(pr(t, 177.0, 178.1, E.lin) * full.length);
      $('chr_url').textContent = t < 178.7 ? full.slice(0, n) : URL_S + '/physiolearn/';
      $('chr_caret').style.opacity = t < 178.3 ? (Math.floor(t * 3) % 2 ? 1 : 0) : 0;
      $('chr_load').style.width = (pr(t, 178.2, 178.75, E.lin) * 390 * (t < 178.9 ? 1 : 0)) + 'px';
      $('chr_page').style.opacity = pr(t, 178.6, 178.9); $('chr_blank').style.opacity = 1 - pr(t, 178.6, 178.9);
    }
    if (t > 180.85 && t < 184.5) L(ph, 'and_menu', pr(t, 180.85, 181.05));
    if (t > 184.3 && t < 189.6) L(ph, 'and_dlg', pr(t, 184.3, 184.6));
    tap(ph, t, 176.45, ...sp('#chr_icon .i', ph));
    { const [x, y] = sp('#chr_dots', ph); hl(ph, t, 179.6, 180.7, x, y, 40, 48, 20); tap(ph, t, 180.6, x, y); }
    { const [x, y] = sp('#am_install', ph); hl(ph, t, 182.6, 184.05, x, y, 240, 42, 10); tap(ph, t, 183.95, x, y); }
    { const [x, y] = sp('#dlg_inst', ph); hl(ph, t, 186.7, 189.25, x, y, 92, 44, 12); tap(ph, t, 189.2, x, y); }
    tap(ph, t, 191.95, ...sp('#pl_slot_and .pl-ic', ph));
    const ST = [['sa1', 174.6, 179.3], ['sa2', 179.3, 182.4], ['sa3', 182.5, 186.5], ['sa4', 186.58, 190.0], ['sa5', 190.1, 192.9]];
    ST.forEach(([id, a, b]) => { const v = env(t, a, b, .25, .25); if (v) set(id, { x: W / 2, y: 330 + (1 - pr(t, a, a + .35)) * 30, op: v }); });
    if (k === 'and_home2') { const p = pr(t, 190.0, 190.5, E.ob); document.querySelector('#pl_slot_and .pl-ic').style.transform = `scale(${p})`; }
    showLine('t_and_done', t, 193.0, 198.6, W / 2, 330);
    showLine('t_done', t, 193.4, 198.6, W / 2, 440);
  }

  /* ---- BRAND 199 – 207 ---- */
  if (t > 198.9 && t < 207.3) {
    const v = env(t, 199.0, 207.1, .5, .5), g = pr(t, 199.0, 206.8, E.io3);
    phoneAt('ph1', t, W / 2, mix(1600, 1450, g), mix(.92, 1.06, g), v * (1 - pr(t, 205.8, 206.8)), { ry: mix(-14, 0, g) });
    L('ph1', 'home');
    set('logo', { x: W / 2, y: 330, op: v, s: .62 * mix(.85, 1, pr(t, 199.14, 199.7, E.ob)) }); $('logo_wm').style.clipPath = 'none';
    showLine('t_tag1', t, 200.01, 207.1, W / 2, 520); showLine('t_tag2', t, 201.78, 207.1, W / 2, 630);
    showLine('t_tag3', t, 203.04, 207.1, W / 2, 740); showLine('t_tag4', t, 204.6, 207.1, W / 2, 840);
  }

  /* ---- VALUES 207.2 – 214.8 ---- */
  if (t > 207.0 && t < 215.0) {
    const v = env(t, 207.27, 214.8, .4, .4);
    [['bulb', 207.27, 520, 't_v1'], ['bars2', 208.67, 760, 't_v2'], ['steps', 210.38, 1000, 't_v3']].forEach(([id, a, y, tl]) => {
      const p = pr(t, a, a + .5, E.ob); if (t > a && v) { set(id, { x: 890, y, op: v, s: 1.05 * p }); draw(id, pr(t, a, a + 1)); }
      showLine(tl, t, a, 214.8, 410, y);
    });
    if (t > 212.4) { slam('t_v4', t, 212.44, 214.8, W / 2, 1330, 1.3); shock(t, 212.5, W / 2, 1330); }
  }

  /* ---- CLOSE 215 – 219 ---- */
  if (t > 214.9 && t < 219.3) {
    showLine('t_st1', t, 215.08, 219.1, W / 2, 820); showLine('t_st2', t, 216.9, 219.1, W / 2, 950);
    const v = env(t, 216.9, 219.1, .3, .4); if (v) { set('inf', { x: W / 2, y: 1180, op: v, s: 1.4 }); draw('inf', pr(t, 216.9, 218.4, E.io3)); }
  }

  /* ---- END WORDMARK 219 – 222.6 ---- */
  if (t > 218.9 && t < 222.8) {
    const v = env(t, 219.0, 222.6, .4, .4);
    set('logosq', { x: W / 2, y: 760, op: v, s: mix(.6, 1, pr(t, 219.0, 219.6, E.ob)) }); shock(t, 219.1, W / 2, 760);
    set('en1', { x: W / 2, y: 1000, op: v * pr(t, 219.4, 219.9), s: mix(1.08, 1, pr(t, 219.4, 220.2)) });
    set('en2', { x: W / 2, y: 1100, op: v * pr(t, 219.9, 220.5) });
  }
  /* ---- CREATOR CARD 222.4 – 228 ---- */
  if (t > 222.3) {
    const p = pr(t, 222.4, 223.1, E.o3);
    set('creator', { x: W / 2, y: 960 + (1 - p) * 60, op: p * (1 - pr(t, 227.5, 228)) });
  }
  flush();
}
window.render = render;
window.FILM_LEN = 228;
document.fonts.ready.then(() => { window.READY = true; });
