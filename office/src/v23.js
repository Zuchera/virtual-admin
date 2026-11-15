/* ============================ v23: realistic chess (castling, en passant, promotion, animation, better pieces and AI), movable UI, panel navigation, sound centre, lite mode ============================ */
/* ---------------- chess engine upgrades ---------------- */
const _chDoc23 = chDoc;
chDoc = function () {
  const d = _chDoc23(); if (me.local === 'chess' && LOCAL.chess) { if (LOCAL.chess.cr == null) { LOCAL.chess.cr = 'KQkq'; LOCAL.chess.ep = -1; LOCAL.chess.hist = []; } CH.st = { cr: LOCAL.chess.cr, ep: LOCAL.chess.ep }; return LOCAL.chess; }
  const g = Store.col('games').get('chess') || {}; d.cr = typeof g.cr === 'string' ? g.cr.replace(/[^KQkq]/g, '').slice(0, 4) : (d.f === CH_START ? 'KQkq' : ''); d.ep = Number.isInteger(g.ep) && g.ep >= 0 && g.ep < 64 ? g.ep : -1; d.hist = Array.isArray(g.hist) ? g.hist.slice(-80).map(x => str(x, 12)) : []; CH.st = { cr: d.cr, ep: d.ep }; return d;
};
chPut = function (d) { if (d.f === CH_START && !d.last) { d.cr = 'KQkq'; d.ep = -1; d.hist = []; } if (me.local === 'chess') { LOCAL.chess = d; return; } Store.set('games', 'chess', { w: d.w, b: d.b, f: d.f, turn: d.turn, last: d.last, res: d.res, cr: d.cr || '', ep: d.ep == null ? -1 : d.ep, hist: (d.hist || []).slice(-80), t: Date.now() }); };
const CHS0 = { cr: '', ep: -1 };
chMoves = function (f, sq, noCheck, st) {
  st = st || CH.st || CHS0; const ch = f[sq], w = isW(ch), t = ch.toLowerCase(), r = sq >> 3, c = sq & 7, out = [], at = (rr2, cc) => rr2 >= 0 && rr2 < 8 && cc >= 0 && cc < 8 ? rr2 * 8 + cc : -1, enemy = q => f[q] !== ' ' && isW(f[q]) !== w, empty = q => f[q] === ' ';
  const slide = ds => { for (const [dr, dc] of ds) { let rr2 = r + dr, cc = c + dc; while (at(rr2, cc) >= 0) { const q = at(rr2, cc); if (empty(q)) out.push(q); else { if (enemy(q)) out.push(q); break; } rr2 += dr; cc += dc; } } };
  if (t === 'p') { const dir = w ? -1 : 1, q1 = at(r + dir, c); if (q1 >= 0 && empty(q1)) { out.push(q1); const q2 = at(r + 2 * dir, c); if ((w ? r === 6 : r === 1) && q2 >= 0 && empty(q2)) out.push(q2); } for (const dc of [-1, 1]) { const q = at(r + dir, c + dc); if (q >= 0 && (enemy(q) || (q === st.ep && empty(q) && ((w && r === 3) || (!w && r === 4))))) out.push(q); } }
  else if (t === 'n') { for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const q = at(r + dr, c + dc); if (q >= 0 && (empty(q) || enemy(q))) out.push(q); } }
  else if (t === 'k') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const q = at(r + dr, c + dc); if (q >= 0 && (empty(q) || enemy(q))) out.push(q); }
    if (!noCheck && st.cr) { const home = w ? 60 : 4, K = w ? 'K' : 'k', R = w ? 'R' : 'r'; if (sq === home && !chCheck(f, w)) { if (st.cr.includes(K) && f[home + 1] === ' ' && f[home + 2] === ' ' && f[home + 3] === R && !chCheck(chApply(f, home, home + 1), w)) out.push(home + 2); if (st.cr.includes(w ? 'Q' : 'q') && f[home - 1] === ' ' && f[home - 2] === ' ' && f[home - 3] === ' ' && f[home - 4] === R && !chCheck(chApply(f, home, home - 1), w)) out.push(home - 2); } } }
  else if (t === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]); else if (t === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]); else slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
  return noCheck ? out : out.filter(q => !chCheck(chApply(f, sq, q), w));
};
chApply = function (f, a, b) {
  const s = f.split(''); let p = s[a]; s[a] = ' '; const lc = p.toLowerCase();
  if (lc === 'k' && Math.abs((b & 7) - (a & 7)) === 2) { if (b > a) { s[b - 1] = s[b + 1]; s[b + 1] = ' '; } else { s[b + 1] = s[b - 2]; s[b - 2] = ' '; } }
  if (lc === 'p' && (a & 7) !== (b & 7) && s[b] === ' ') s[(a >> 3) * 8 + (b & 7)] = ' ';
  if (p === 'P' && b < 8) p = 'Q'; if (p === 'p' && b > 55) p = 'q'; s[b] = p; return s.join('');
};
const SQN = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
chDo = function (d, a, b) {
  const pc = d.f[a], cap = d.f[b] !== ' ' || (pc.toLowerCase() === 'p' && (a & 7) !== (b & 7)), lc = pc.toLowerCase(), castle = lc === 'k' && Math.abs((b & 7) - (a & 7)) === 2, promo = lc === 'p' && (b < 8 || b > 55);
  let cr = d.cr || ''; if (lc === 'k') cr = cr.replace(isW(pc) ? /[KQ]/g : /[kq]/g, ''); for (const [sq, k] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (a === sq || b === sq) cr = cr.replace(k, '');
  const ep = lc === 'p' && Math.abs(b - a) === 16 ? (a + b) / 2 : -1;
  d.f = chApply(d.f, a, b); d.last = [a, b]; d.turn = d.turn === 'w' ? 'b' : 'w'; d.cr = cr; d.ep = ep; const white = d.turn === 'w', mv = chAll(d.f, white), chk = chCheck(d.f, white);
  const txt = castle ? (b > a ? 'O-O' : 'O-O-O') : (lc === 'p' ? '' : pc.toUpperCase()) + (cap ? (lc === 'p' ? 'abcdefgh'[a & 7] : '') + 'x' : '') + SQN(b) + (promo ? '=Q' : ''); d.hist = (d.hist || []).concat([txt + (chk && mv.length ? '+' : '') + (chk && !mv.length ? '#' : '')]).slice(-80);
  if (!mv.length) d.res = chk ? (white ? 'b' : 'w') : 'd'; const pcs = d.f.replace(/ /g, '').split('').filter(x => x.toLowerCase() !== 'k'); if (!d.res && (pcs.length === 0 || (pcs.length === 1 && /[nb]/i.test(pcs[0])))) d.res = 'd';
  sfx(castle ? 'clack' : cap ? 'clack' : 'tick'); chPut(d);
};
/* a real (if modest) engine: pseudo-legal alpha-beta search with piece-square tables */
const PST = { p: [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, -5, -5, 5, 5, 5, 1, 1, 2, 3, 3, 2, 1, 1, .5, .5, 1, 2.5, 2.5, 1, .5, .5, 0, 0, 0, 2, 2, 0, 0, 0, .5, -.5, -1, 0, 0, -1, -.5, .5, .5, 1, 1, -2, -2, 1, 1, .5, 0, 0, 0, 0, 0, 0, 0, 0] };
const evalB = f => { let s = 0; for (let i = 0; i < 64; i++) { const c = f[i]; if (c === ' ') continue; const w = isW(c), t = c.toLowerCase(), v = CH_VAL[t] * 100, r = i >> 3, col = i & 7, cen = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(col - 3.5)) * .5; let p = t === 'p' ? (w ? (6 - r) * 6 : (r - 1) * 6) + cen * 3 : t === 'k' ? 0 : cen * 6; s += (w ? 1 : -1) * (v + p); } return s; };
function chSearch(f, white, depth, alpha, beta) {
  if (depth === 0) return (white ? 1 : -1) * evalB(f); let best = -1e9, any = false; const mv = []; for (let i = 0; i < 64; i++) if (f[i] !== ' ' && isW(f[i]) === white) for (const q of chMoves(f, i, true, CHS0)) mv.push([i, q, f[q] !== ' ' ? CH_VAL[f[q].toLowerCase()] : 0]); mv.sort((a, b) => b[2] - a[2]);
  for (const [a, b, cv] of mv) { if (cv >= 100) return 1e5 + depth; any = true; const sc = -chSearch(chApply(f, a, b), !white, depth - 1, -beta, -alpha); if (sc > best) best = sc; if (best > alpha) alpha = best; if (alpha >= beta) break; } return any ? best : 0;
}
chAI = function (d) {
  const white = d.turn === 'w', mv = chAll(d.f, white); if (!mv.length) return; const lvl = clamp(num(local.chLvl, 2), 1, 3); let best = mv[0], bs = -1e9; const depth = lvl;
  for (const [a, b] of mv) { const nf = chApply(d.f, a, b); let s = -chSearch(nf, !white, depth, -1e9, 1e9) + Math.random() * (lvl === 1 ? 140 : lvl === 2 ? 25 : 4); if (s > bs) { bs = s; best = [a, b]; } } chDo(d, best[0], best[1]);
};
/* ---------------- realistic pieces ---------------- */
const IVORY = mat(0xf0e8d6, { roughness: .28, metalness: .05, envMapIntensity: .9 }), EBONY = mat(0x2a211c, { roughness: .25, metalness: .12, envMapIntensity: .9 });
const lathe = (k, pts, seg) => geo('cl' + k, () => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg || 28));
const BASE = [[0, 0], [.17, 0], [.185, .012], [.185, .03], [.165, .05], [.14, .065], [.115, .075]];
const CHP = {
  p: () => lathe('p', BASE.concat([[.075, .11], [.055, .17], [.05, .2], [.085, .225], [.09, .245], [.06, .265]])), pH: () => geo('chph', () => new T.SphereGeometry(.082, 20, 14)),
  r: () => lathe('r', BASE.concat([[.09, .12], [.075, .25], [.08, .33], [.125, .36], [.135, .4], [.12, .43], [.1, .43], [.1, .405], [0, .405]])),
  b: () => lathe('b', BASE.concat([[.085, .12], [.055, .22], [.045, .27], [.085, .3], [.09, .35], [.075, .43], [.04, .5], [.02, .52], [0, .52]])),
  q: () => lathe('q', BASE.concat([[.1, .12], [.065, .26], [.055, .34], [.1, .38], [.095, .42], [.12, .5], [.135, .56], [.11, .58], [.09, .56], [0, .56]])),
  k: () => lathe('k', BASE.concat([[.1, .12], [.065, .28], [.055, .38], [.105, .42], [.1, .46], [.12, .55], [.125, .62], [.1, .65], [0, .65]]))
};
const knightGeo = () => geo('chn', () => { const s = new T.Shape(); const P = [[-.1, 0], [.12, 0], [.1, .12], [.11, .24], [.15, .34], [.16, .42], [.12, .46], [.14, .52], [.1, .55], [.05, .66], [.0, .6], [-.05, .64], [-.07, .52], [-.2, .44], [-.22, .38], [-.15, .36], [-.1, .38], [-.04, .3], [-.1, .16]]; s.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], P[i][1]); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }); g.translate(0, 0, -.05); g.rotateY(-PI / 2); return g; });
const crownBits = geo2 => geo2;
chPiece = function (p) {
  const w = isW(p), m = w ? IVORY : EBONY, g = new T.Group(), t = p.toLowerCase(), add = (ge, x, y, z) => { const mm = new T.Mesh(ge, m); mm.position.set(x || 0, y || 0, z || 0); mm.castShadow = true; g.add(mm); return mm; };
  if (t === 'n') { add(lathe('nb', BASE.concat([[.1, .1], [0, .1]]))); const h = add(knightGeo(), 0, .08, 0); h.rotation.y = w ? 0 : PI; h.scale.setScalar(.95); }
  else { add(CHP[t]()); if (t === 'p') add(CHP.pH(), 0, .31, 0); if (t === 'r') for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, bb = add(geo('chcr', () => new T.BoxGeometry(.06, .06, .06)), Math.cos(a) * .1, .455, Math.sin(a) * .1); bb.rotation.y = -a; } if (t === 'b') { add(geo('chbb', () => new T.SphereGeometry(.03, 10, 8)), 0, .54, 0); } if (t === 'q') { add(geo('chqb', () => new T.SphereGeometry(.035, 12, 8)), 0, .6, 0); for (let i = 0; i < 8; i++) { const a = i * PI / 4; add(geo('chqs', () => new T.SphereGeometry(.022, 8, 6)), Math.cos(a) * .11, .58, Math.sin(a) * .11); } } if (t === 'k') { add(geo('chkv', () => new T.BoxGeometry(.035, .14, .035)), 0, .74, 0); add(geo('chkh', () => new T.BoxGeometry(.1, .035, .035)), 0, .75, 0); } }
  return g;
};
/* ---------------- board texture, animation and captured tray ---------------- */
function chBoardDraw(c, d) {
  const s = 64; for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { const dark = (r + q) & 1; const gr = c.createLinearGradient(q * s, r * s, q * s + s, r * s + s); gr.addColorStop(0, dark ? '#74502f' : '#ecd9b4'); gr.addColorStop(1, dark ? '#5f4125' : '#dcc499'); c.fillStyle = gr; c.fillRect(q * s, r * s, s, s); c.strokeStyle = dark ? 'rgba(0,0,0,.12)' : 'rgba(120,80,20,.1)'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); const y = r * s + 6 + k * 10 + ((q * 7 + r * 3) % 5); c.moveTo(q * s, y); c.bezierCurveTo(q * s + 20, y + 2, q * s + 40, y - 2, q * s + s, y + 1); c.stroke(); } c.fillStyle = dark ? 'rgba(236,217,180,.7)' : 'rgba(95,65,37,.7)'; c.font = '600 11px sans-serif'; if (q === 0) c.fillText(String(8 - r), q * s + 3, r * s + 12); if (r === 7) c.fillText('abcdefgh'[q], q * s + s - 11, r * s + s - 4); }
  const sq = (i, col) => { c.fillStyle = col; c.fillRect((i & 7) * s, (i >> 3) * s, s, s); };
  if (d.last) for (const i of d.last) sq(i, 'rgba(255,214,60,.42)'); const kc = d.f.indexOf(d.turn === 'w' ? 'K' : 'k'); if (!d.res && kc >= 0 && chCheck(d.f, d.turn === 'w')) { const g = c.createRadialGradient((kc & 7) * s + 32, (kc >> 3) * s + 32, 4, (kc & 7) * s + 32, (kc >> 3) * s + 32, 36); g.addColorStop(0, 'rgba(230,40,40,.85)'); g.addColorStop(1, 'rgba(230,40,40,0)'); c.fillStyle = g; c.fillRect((kc & 7) * s, (kc >> 3) * s, s, s); }
  if (CH.hover >= 0 && me.lock && me.lock.kind === 'chess') { c.strokeStyle = 'rgba(40,140,255,.9)'; c.lineWidth = 4; c.strokeRect((CH.hover & 7) * s + 2, (CH.hover >> 3) * s + 2, s - 4, s - 4); }
  if (CH.sel >= 0) { sq(CH.sel, 'rgba(60,160,255,.5)'); for (const m of CH.moves) { const cap = d.f[m] !== ' '; c.fillStyle = cap ? 'rgba(230,70,60,.55)' : 'rgba(40,200,120,.65)'; if (cap) { c.beginPath(); c.arc((m & 7) * s + 32, (m >> 3) * s + 32, 28, 0, 7); c.arc((m & 7) * s + 32, (m >> 3) * s + 32, 20, 0, 7, true); c.fill(); } else { c.beginPath(); c.arc((m & 7) * s + 32, (m >> 3) * s + 32, 11, 0, 7); c.fill(); } } }
}
const sqPos = i => [((i & 7) - 3.5) * .5, ((i >> 3) - 3.5) * .5];
CH.hover = -1; const CHT = [];
chDraw = function () {
  const d = chDoc(); for (const s of CH.sites) {
    s.tex.draw((c) => chBoardDraw(c, d));
    if (!s.map) { while (s.pieces.children.length) s.pieces.remove(s.pieces.children[0]); s.map = new Map(); s.tray = new T.Group(); s.pieces.add(s.tray); s.f = null; }
    if (s.f !== d.f) {
      const oldList = s.f ? [...s.map.entries()] : [], keep = new Map(), spare = []; const taken = new Set();
      for (let i = 0; i < 64; i++) { const ch = d.f[i]; if (ch === ' ') continue; const m = s.map.get(i); if (m && m.userData.ch === ch && s.f && s.f[i] === ch) { keep.set(i, m); taken.add(i); } }
      for (const [i, m] of s.map) if (!taken.has(i)) spare.push([i, m]);
      const placed = new Map(keep);
      for (let i = 0; i < 64; i++) { const ch = d.f[i]; if (ch === ' ' || keep.has(i)) continue; let k = spare.findIndex(([j, m]) => m.userData.ch === ch && d.last && j === d.last[0]); if (k < 0) k = spare.findIndex(([j, m]) => m.userData.ch === ch); let m; if (k >= 0 && s.f) { m = spare[k][1]; spare.splice(k, 1); const [tx, tz] = sqPos(i); CHT.push({ m, fx: m.position.x, fz: m.position.z, tx, tz, t: 0, d: .38, hop: m.userData.ch.toLowerCase() === 'n' ? .55 : .22 }); } else { m = chPiece(ch); const [tx, tz] = sqPos(i); m.position.set(tx, 0, tz); if (s.f) { m.scale.setScalar(.01); CHT.push({ m, grow: 1, t: 0, d: .3 }); } s.pieces.add(m); } m.userData.ch = ch; placed.set(i, m); }
      for (const [, m] of spare) CHT.push({ m, die: 1, t: 0, d: .3, s0: 1 }); s.map = placed; s.f = d.f;
      /* captured pieces tray */
      const cnt = {}; for (const ch of d.f) if (ch !== ' ') cnt[ch] = (cnt[ch] || 0) + 1; const full = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1, p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 }; while (s.tray.children.length) s.tray.remove(s.tray.children[0]); let iw = 0, ib = 0;
      for (const ch of 'QRBNP'.split('')) { for (let n = 0; n < full[ch] - (cnt[ch] || 0); n++) { const m = chPiece(ch); m.scale.setScalar(.5); m.position.set(-2.55 - (iw % 2) * .55, 0, -1.9 + Math.floor(iw / 2) * .46); s.tray.add(m); iw++; } for (const lc of [ch.toLowerCase()]) for (let n = 0; n < full[lc] - (cnt[lc] || 0); n++) { const m = chPiece(lc); m.scale.setScalar(.5); m.position.set(2.55 + (ib % 2) * .55, 0, -1.9 + Math.floor(ib / 2) * .46); s.tray.add(m); ib++; } }
    }
    for (const [i, m] of s.map) m.position.y = (i === CH.sel && me.lock && me.lock.kind === 'chess') ? .12 : (m.userData.tw ? m.position.y : 0);
  }
};
function chTick(dt) {
  for (let i = CHT.length - 1; i >= 0; i--) { const a = CHT[i]; a.t += dt; const k = clamp(a.t / a.d, 0, 1), e = k * k * (3 - 2 * k), m = a.m; m.userData.tw = k < 1;
    if (a.die) { m.scale.setScalar(Math.max(.01, 1 - e)); m.position.y = e * .2; if (k >= 1) { if (m.parent) m.parent.remove(m); CHT.splice(i, 1); } }
    else if (a.grow) { m.scale.setScalar(Math.max(.01, e)); if (k >= 1) { m.scale.setScalar(1); CHT.splice(i, 1); } }
    else { m.position.x = a.fx + (a.tx - a.fx) * e; m.position.z = a.fz + (a.tz - a.fz) * e; m.position.y = Math.sin(k * PI) * a.hop; if (k >= 1) { m.position.set(a.tx, 0, a.tz); CHT.splice(i, 1); } } }
}
/* ---------------- movable, collapsible panels ---------------- */
const UIPOS = LS.get('uipos', {}) || {};
function movable(elm, key, opts) {
  opts = opts || {}; if (!elm || elm.dataset.mv) return; elm.dataset.mv = 1; const place = () => { const p = UIPOS[key]; if (p) { const w = innerWidth, h = innerHeight; elm.style.left = clamp(p.x, 0, Math.max(0, w - 60)) + 'px'; elm.style.top = clamp(p.y, 0, Math.max(0, h - 40)) + 'px'; elm.style.right = 'auto'; elm.style.bottom = 'auto'; elm.style.transform = 'none'; } }; place();
  const grip = el('div', { class: 'mvgrip', title: 'Drag to move · double-click to reset', style: 'cursor:grab;touch-action:none;display:flex;align-items:center;gap:6px;justify-content:center;font-size:11px;color:#8a93a3;line-height:1;padding:2px 6px;user-select:none', text: '⋮⋮ drag' }); const tools = el('div', { class: 'row', style: 'justify-content:flex-end;gap:4px' });
  if (opts.collapse !== false) { const mn = el('button', { class: 'btn sm ghost', text: '–', title: 'Collapse', style: 'padding:0 8px', onclick: () => { elm.classList.toggle('cmin'); mn.textContent = elm.classList.contains('cmin') ? '+' : '–'; } }); tools.append(mn); }
  if (opts.close) tools.append(el('button', { class: 'btn sm ghost', text: '×', title: 'Hide', style: 'padding:0 8px', onclick: opts.close }));
  const bar = el('div', { class: 'row mvbar', style: 'justify-content:space-between;align-items:center;gap:4px;margin:-4px 0 4px;width:100%;flex-basis:100%' }, grip, tools); elm.prepend(bar); if (getComputedStyle(elm).display === 'flex') elm.style.flexWrap = 'wrap'; new MutationObserver(() => { if (elm.firstChild !== bar) elm.prepend(bar); }).observe(elm, { childList: true });
  let sx, sy, ox, oy, on = false; grip.addEventListener('pointerdown', e => { on = true; const r = elm.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; grip.setPointerCapture(e.pointerId); grip.style.cursor = 'grabbing'; e.preventDefault(); });
  grip.addEventListener('pointermove', e => { if (!on) return; const x = clamp(ox + e.clientX - sx, 0, innerWidth - 80), y = clamp(oy + e.clientY - sy, 0, innerHeight - 50); elm.style.left = x + 'px'; elm.style.top = y + 'px'; elm.style.right = 'auto'; elm.style.bottom = 'auto'; elm.style.transform = 'none'; UIPOS[key] = { x, y }; });
  grip.addEventListener('pointerup', e => { on = false; grip.style.cursor = 'grab'; LS.set('uipos', UIPOS); }); grip.addEventListener('dblclick', () => { delete UIPOS[key]; LS.set('uipos', UIPOS); elm.style.left = elm.style.top = elm.style.right = elm.style.bottom = elm.style.transform = ''; });
}
function watchMovables() {
  const st = document.createElement('style'); st.textContent = '.cmin>*:not(.mvbar){display:none!important}.cmin{min-width:0!important;padding-bottom:6px}#lockhud{top:auto!important;bottom:96px!important;max-width:min(560px,94vw)}#lockhud.cmin{opacity:.92}#krace{top:auto;bottom:150px}.mvbar .btn{line-height:1.1}'; document.head.append(st);
  const tryAttach = () => { for (const [id, k, o] of [['lockhud', 'lockhud', { close: () => { if (me.lock) lockEnd(); } }], ['krace', 'krace', {}], ['greeter', 'greeter', { collapse: true }], ['mplayer', 'mplayer', {}], ['chat', 'chat', { collapse: false }], ['map', 'map', {}], ['meetbar', 'meetbar', {}]]) { const e = document.getElementById(id); if (e && !e.dataset.mv && id !== 'chat' && id !== 'map') movable(e, k, o); } };
  new MutationObserver(tryAttach).observe(document.body, { childList: true, subtree: false }); tryAttach();
  /* chat dock and minimap get a simple drag grip without extra bars */
  for (const id of ['chat', 'map']) { const e = document.getElementById(id); if (!e) continue; const hd = id === 'chat' ? e.querySelector('header,.hd,#chatMin') : null; const g = el('div', { title: 'Drag to move · double-click to reset', style: 'position:absolute;top:2px;left:50%;transform:translateX(-50%);cursor:grab;color:#9aa3b2;font-size:10px;touch-action:none;user-select:none;z-index:3;padding:0 8px', text: '⋮⋮⋮' }); if (getComputedStyle(e).position === 'static') e.style.position = 'fixed'; e.append(g); let on = false, sx, sy, ox, oy; const key = id; const p = UIPOS[key]; if (p) { e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; e.style.right = e.style.bottom = 'auto'; }
    g.addEventListener('pointerdown', ev => { on = true; const r = e.getBoundingClientRect(); sx = ev.clientX; sy = ev.clientY; ox = r.left; oy = r.top; g.setPointerCapture(ev.pointerId); ev.preventDefault(); }); g.addEventListener('pointermove', ev => { if (!on) return; const x = clamp(ox + ev.clientX - sx, 0, innerWidth - 80), y = clamp(oy + ev.clientY - sy, 0, innerHeight - 40); e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.right = e.style.bottom = 'auto'; UIPOS[key] = { x, y }; }); g.addEventListener('pointerup', () => { on = false; LS.set('uipos', UIPOS); }); g.addEventListener('dblclick', () => { delete UIPOS[key]; LS.set('uipos', UIPOS); e.style.left = e.style.top = e.style.right = e.style.bottom = ''; }); }
}

/* ---------------- boot ---------------- */

/* ---------------- sound centre: one music source at a time, stop-everything switch ---------------- */
const SND = Object.assign({ fx: true, voice: true, music: true }, LS.get('snd', {}) || {});
const _sfx23 = sfx; sfx = function () { if (!SND.fx) return; return _sfx23.apply(this, arguments); };
const _miniPlay23 = miniPlay; miniPlay = function (x) { if (audio) { try { audio.ctx.close(); clearInterval(audio.iv); } catch (e) { } audio = null; } try { document.querySelectorAll('#drawerBody iframe').forEach(f => { if (/youtube|vimeo|spotify|twitch/.test(f.src)) f.src = 'about:blank'; }); } catch (e) { } if (!SND.music) { toast('Music is switched off in Comfort settings.'); return; } return _miniPlay23.apply(this, arguments); };
const _music23 = actions.music; actions.music = function () { if (!audio) { miniStop(); if (!SND.music) { toast('Music is switched off in Comfort settings.'); return; } } return _music23.apply(this, arguments); };
if (window.speechSynthesis) { const _sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { if (!SND.voice) return; speechSynthesis.cancel(); _sp(u); }; }
function stopAllMedia() {
  miniStop(); if (audio) { try { audio.ctx.close(); clearInterval(audio.iv); } catch (e) { } audio = null; } try { speechSynthesis.cancel(); } catch (e) { }
  document.querySelectorAll('audio,video').forEach(m => { if (!m.closest('#vidGrid,.callv,#calls')) { try { m.pause(); } catch (e) { } } }); document.querySelectorAll('#drawerBody iframe,#tvEmbed iframe').forEach(f => { if (/youtube|vimeo|spotify|twitch|loom/.test(f.src)) f.src = 'about:blank'; });
  try { if (actx && actx.state === 'running') actx.suspend(); } catch (e) { } toast('All music, radio, video and announcements stopped.');
}
function sndSave() { LS.set('snd', SND); if (actx && SND.fx) try { actx.resume(); } catch (e) { } }
/* ---------------- performance: lite mode ---------------- */
const PERF = { lite: !!LS.get('lite', false) };
function liteApply() { try { renderer.setPixelRatio(PERF.lite ? 0.8 : Math.min(devicePixelRatio || 1, 1.75)); renderer.shadowMap.enabled = !PERF.lite; sun.castShadow = !PERF.lite; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize(); } catch (e) { } }
panels.comfort = b => {
  const sw = (lab, key, hint) => el('label', { class: 'row', style: 'gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.07);cursor:pointer' }, el('input', { type: 'checkbox', checked: !!SND[key], onchange: e => { SND[key] = e.target.checked; sndSave(); if (!SND[key]) { if (key === 'music') { miniStop(); if (audio) actions.music(); } if (key === 'voice') try { speechSynthesis.cancel(); } catch (x) { } } } }), el('span', { style: 'flex:1' }, el('b', { text: lab }), el('div', { class: 'meta', text: hint })));
  b.append(el('button', { class: 'btn', style: 'width:100%;font-size:16px;padding:12px', text: '🔇 Stop all media and announcements now', onclick: stopAllMedia }), el('p', { class: 'meta', text: 'Only one music source plays at a time: starting radio, a playlist or a video stops the one before it. Voice and video calls are never cut by this button.' }),
    sw('Music, radio and videos', 'music', 'Untick to block everything the mini player and lo-fi radio can play.'), sw('Sound effects', 'fx', 'Clicks, chess moves, doors, points.'), sw('Spoken announcements', 'voice', 'Greeter and reading aloud.'),
    el('h3', { text: 'Speed' }), el('label', { class: 'row', style: 'gap:10px;padding:8px 0;cursor:pointer' }, el('input', { type: 'checkbox', checked: PERF.lite, onchange: e => { PERF.lite = e.target.checked; LS.set('lite', PERF.lite); liteApply(); toast(PERF.lite ? 'Lite mode on: lighter graphics, no shadows.' : 'Lite mode off.'); } }), el('span', { style: 'flex:1' }, el('b', { text: 'Lite mode' }), el('div', { class: 'meta', text: 'Best on older laptops, tablets and phones. Turns off shadows and lowers sharpness.' }))),
    el('h3', { text: 'Windows' }), el('p', { class: 'meta', text: 'Every floating box has a ⋮⋮ grip: drag it anywhere, – to fold it away, double-click the grip to put it back.' }), el('button', { class: 'btn ghost', text: 'Put every window back where it started', onclick: () => { for (const k in UIPOS) delete UIPOS[k]; LS.set('uipos', UIPOS); LS.set('drawgeo', null); toast('Reloading so everything returns home.'); setTimeout(() => location.reload(), 600); } }));
};
/* ---------------- side panel: move, 4 sizes, back button ---------------- */
const DSZ = [['S', 340], ['M', 460], ['L', 720], ['XL', 0]]; const DG = Object.assign({ s: 1, x: null, y: null }, LS.get('drawgeo', null) || {}); const DHIST = []; let dBack = false;
function drawerGeo() { const d = $('#drawer'), sz = DSZ[DG.s]; d.style.width = sz[1] ? Math.min(sz[1], innerWidth - 12) + 'px' : Math.min(innerWidth - 12, 1100) + 'px'; d.style.maxWidth = 'calc(100vw - 12px)'; if (DG.x != null) { d.style.left = clamp(DG.x, 0, innerWidth - 120) + 'px'; d.style.top = clamp(DG.y, 0, innerHeight - 60) + 'px'; d.style.right = 'auto'; d.style.bottom = 'auto'; d.style.height = Math.min(innerHeight - clamp(DG.y, 0, innerHeight - 60) - 8, innerHeight - 20) + 'px'; } if ($('#drawerSz')) $('#drawerSz').textContent = sz[0]; }
function initDrawer23() {
  const hdr = $('#drawer > header'), x = $('#drawerX'), mn = $('#drawerMin'); const st = document.createElement('style'); st.textContent = '#drawer{overflow:auto;max-width:calc(100vw - 12px)}#drawerBack{background:transparent;border:0;cursor:pointer;font-weight:700;font-size:15px;min-width:36px;height:36px;border-radius:10px}#drawerSz{background:transparent;border:1px solid rgba(0,0,0,.2);cursor:pointer;font-weight:700;font-size:12px;min-width:36px;height:30px;border-radius:10px}#drawer>header{cursor:grab;touch-action:none}'; document.head.append(st);
  const bk = el('button', { id: 'drawerBack', hidden: true, title: 'Back to the previous page', text: '← Back', onclick: () => { DHIST.pop(); const p = DHIST.pop(); if (p) { dBack = true; try { openDrawer(p.id, p.t, p.w, p.b); } finally { dBack = false; } } } }); hdr.insertBefore(bk, hdr.firstChild);
  const sz = el('button', { id: 'drawerSz', title: 'Change panel size: small, medium, large, extra large', text: DSZ[DG.s][0], onclick: () => { DG.s = (DG.s + 1) % 4; LS.set('drawgeo', DG); drawerGeo(); } }); hdr.insertBefore(sz, mn);
  let on = false, sx, sy, ox, oy; hdr.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; on = true; const r = $('#drawer').getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; hdr.setPointerCapture(e.pointerId); }); hdr.addEventListener('pointermove', e => { if (!on) return; DG.x = ox + e.clientX - sx; DG.y = oy + e.clientY - sy; drawerGeo(); }); hdr.addEventListener('pointerup', () => { if (on) { on = false; LS.set('drawgeo', DG); } }); hdr.addEventListener('dblclick', e => { if (e.target.closest('button')) return; DG.x = DG.y = null; const d = $('#drawer'); d.style.left = d.style.top = d.style.right = d.style.bottom = d.style.height = ''; LS.set('drawgeo', DG); drawerGeo(); });
  const od = openDrawer; openDrawer = function (id, t, w, bd) { if (!dBack) { if (!DHIST.length || DHIST[DHIST.length - 1].id !== id) DHIST.push({ id, t, w, b: bd }); if (DHIST.length > 12) DHIST.shift(); } const r = od.apply(this, arguments); $('#drawerBack').hidden = DHIST.length < 2; drawerGeo(); return r; };
  const cd = closeDrawer; closeDrawer = function () { DHIST.length = 0; $('#drawerBack').hidden = true; return cd.apply(this, arguments); }; drawerGeo(); addEventListener('resize', drawerGeo);
}
/* ---------------- gym: more stations, same one-tap rhythm ---------------- */
const _cg23 = campGym; campGym = function (x0, z0, x1, z1, b) {
  _cg23.apply(this, arguments); const rub = mat(0x59636f, { roughness: 1 }), blu = mat(0x2456ff, { roughness: .45 }), steel = mat(0x9aa3ab, { metalness: .7, roughness: .35 }), red = mat(0xd6453d, { roughness: .6 }), grn = mat(0x2fa86b, { roughness: .5 });
  const S = [
    ['squat', 'Squat rack: 15 seconds', x0 + 7, 6.5, g => { for (const s of [-.7, .7]) box(g, .08, 2, .08, steel, s, 1, 0); box(g, 1.6, .06, .06, steel, 0, 1.4, 0); for (const s of [-.75, .75]) cyl(g, .22, .22, .08, red, s, 1.4, 0, { seg: 14 }).rotation.z = PI / 2; box(g, 1.2, .05, 1, rub, 0, .06, 0); }],
    ['pullup', 'Pull-up bar: 15 seconds', x0 + 7, 10.5, g => { for (const s of [-.8, .8]) box(g, .08, 2.4, .08, steel, s, 1.2, 0); box(g, 1.7, .06, .06, steel, 0, 2.3, 0); box(g, 1.4, .04, 1, rub, 0, .06, 0); }],
    ['cable', 'Cable machine: 15 seconds', x0 + 7, 14.5, g => { box(g, .1, 2.4, .1, steel, -.7, 1.2, 0); box(g, .1, 2.4, .1, steel, .7, 1.2, 0); box(g, 1.5, .1, .1, steel, 0, 2.4, 0); box(g, .4, 1.6, .2, blu, 0, 1.2, -.15); box(g, .04, .04, 1, steel, 0, 1.4, .4); }],
    ['ski', 'Ski trainer: 15 seconds', x0 + 10, 17, g => { box(g, .5, .08, 2.1, steel, 0, .25, 0); box(g, .08, 1.3, .08, steel, 0, .9, -.9); box(g, .5, .5, .1, grn, 0, 1.5, -.9); box(g, .06, .06, .7, steel, -.2, 1.1, -.55); box(g, .06, .06, .7, steel, .2, 1.1, -.55); }],
    ['bike', 'Spin bike: pedal for 15 seconds', x0 + 4, 19.5, g => { cyl(g, .3, .3, .05, steel, 0, .55, 0, { seg: 20 }).rotation.z = PI / 2; box(g, .08, .8, .9, red, 0, .7, 0); box(g, .3, .08, .3, red, 0, 1.15, -.4); box(g, .5, .06, .06, steel, 0, 1.3, .45); }],
    ['bag', 'Heavy bag: hit for 15 seconds', x0 + 10, 19.5, g => { cyl(g, .22, .22, 1.1, blu, 0, 1.2, 0, { seg: 14 }); cyl(g, .02, .02, .9, steel, 0, 2.3, 0, { seg: 6 }); box(g, .8, .06, .8, rub, 0, .06, 0); }]
  ]; for (const [id, lab, x, z, bd] of S) if (z < z1 - 0.8) gymStation(id, lab, x, z, PI / 2, bd, 0);
  const gd = dynTex(1024, 512); gd.draw((c, w, h) => { c.fillStyle = '#10151d'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb627'; c.font = '700 58px ' + FONT_D; c.fillText('How the gym works', 40, 80); c.fillStyle = '#fff'; c.font = '600 38px ' + FONT_B; ['1. Walk up to any machine and click it.', '2. Wait for the countdown (2.5 seconds).', '3. Tap Space or click in a steady beat.', '4. Smooth, even taps earn bonus points.', '5. Press Leave to step off at any time.', 'Scores go on the leaderboard opposite.'].forEach((t, i) => c.fillText(t, 40, 160 + i * 52, 940)); }); wallSign(gd, 5.2, 2.6, x0 + 0.1, 1.9, 8, PI / 2);
};
function initV23() { watchMovables(); initDrawer23(); if (PERF.lite) liteApply(); const top = $('#topbtns'); top.append(el('button', { class: 'tb', id: 'bComfort', text: '🎚 Comfort', title: 'Sound, speed and window settings', onclick: () => openPanel('comfort') }), el('button', { class: 'tb', id: 'bQuiet', text: '🔇', title: 'Stop all music, radio, video and announcements', 'aria-label': 'Stop all media', onclick: stopAllMedia })); }
