/* ============================ v18: real floors (levels), stairs and lifts, directory ============================ */
const FH = 3.6;                                   // floor to floor height
let curLvl = 0; me.lvl = 0; me.y = 0; me.ride = null; let GR_L = [];
W.lv = []; W.fp = []; W.lifts = []; W.spaces = []; W.fac = [];
/* every thing built while a level is "current" is tagged with it, so picks, seats, zones and walls belong to their floor */
const _obs18 = obs; obs = function (a, b, c, d) { _obs18(a, b, c, d); W.obs[W.obs.length - 1][4] = curLvl; };
const _pick18 = addPick; addPick = function (o) { const p = _pick18(o); p.lv = curLvl; p.mesh.userData.lv = curLvl; return p; };
const _seat18 = addSeat; addSeat = function () { const s = _seat18.apply(null, arguments); s.lv = curLvl; return s; };
const _zone18 = zone; zone = function () { _zone18.apply(null, arguments); W.zones[W.zones.length - 1].lv = curLvl; };
const _zat18 = zoneAt; zoneAt = function (x, z) { const L = me.lvl || 0; for (const q of W.zones) if ((q.lv || 0) === L && x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1) return q; return W.zones[W.zones.length - 1]; };
function levelGroup(l) { if (l === 0) return office; if (!W.lv[l]) { const g = new T.Group(); g.position.y = l * FH; office.add(g); W.lv[l] = g; } return W.lv[l]; }
function atLevel(l, fn) { const po = office, pl = curLvl; office = levelGroup(l); curLvl = l; const bo = pl === 0 ? po : null; try { fn(); } finally { office = po; curLvl = pl; } }
/* level specific walking grids; upper floors are blocked everywhere except inside their building footprint */
const _bn18 = buildNav; buildNav = function () {
  _bn18(); const g0 = grid, top = Math.max(0, ...W.fp.map(f => f.lv), ...W.obs.map(o => o[4] || 0)); GR_L = [g0];
  for (let l = 1; l <= top; l++) { const g = new Uint8Array(NX * NZ).fill(1); for (const f of W.fp) if (f.lv === l) for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const cx = (i + .5) * CELL, cz = (j + .5) * CELL; if (cx > f.x0 + .2 && cx < f.x1 - .2 && cz > f.z0 + .2 && cz < f.z1 - .2) g[j * NX + i] = 0; } GR_L.push(g); }
  for (const o of W.obs) { const l = o[4] || 0; if (l === 0) continue; const g = GR_L[l], pad = 0.2; const i0 = Math.max(0, Math.floor((o[0] - pad) / CELL)), i1 = Math.min(NX - 1, Math.floor((o[2] + pad) / CELL)), j0 = Math.max(0, Math.floor((o[1] - pad) / CELL)), j1 = Math.min(NZ - 1, Math.floor((o[3] + pad) / CELL)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = (i + .5) * CELL, cz = (j + .5) * CELL; if (cx > o[0] - pad && cx < o[2] + pad && cz > o[1] - pad && cz < o[3] + pad) g[j * NX + i] = 1; } }
  // level 0 must ignore upper floor obstacles
  const g = new Uint8Array(NX * NZ); for (const o of W.obs) { if ((o[4] || 0) !== 0) continue; const pad = 0.2, i0 = Math.max(0, Math.floor((o[0] - pad) / CELL)), i1 = Math.min(NX - 1, Math.floor((o[2] + pad) / CELL)), j0 = Math.max(0, Math.floor((o[1] - pad) / CELL)), j1 = Math.min(NZ - 1, Math.floor((o[3] + pad) / CELL)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = (i + .5) * CELL, cz = (j + .5) * CELL; if (cx > o[0] - pad && cx < o[2] + pad && cz > o[1] - pad && cz < o[3] + pad) g[j * NX + i] = 1; } } GR_L[0] = g;
  grid = GR_L[me.lvl || 0] || GR_L[0];
};
function setLvl(l) { l = clamp(l | 0, 0, Math.max(0, GR_L.length - 1)); me.lvl = l; grid = GR_L[l] || GR_L[0]; lvVis(); }
const _un18 = updateNpcs; updateNpcs = function (dt, t) { const g = grid; if (GR_L[0]) grid = GR_L[0]; try { _un18(dt, t); } finally { grid = g; } };
/* which building (if any) the person is standing in */
function bldAt(x, z, l) { return (W.camp || []).find(b => b.fl && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) || null; }
function lvVis() { const b = bldAt(me.pos.x, me.pos.z), top = b && !me.local ? (me.lvl || 0) : 99; for (let l = 1; l < W.lv.length; l++) if (W.lv[l]) W.lv[l].visible = l <= top; for (const l of W.lifts) { } }
/* per frame: floor height easing, the ride animation, hiding upper floors while you are inside a building */
let lvT = 0;
function lvStep(dt) {
  const cb = bldAt(me.pos.x, me.pos.z), cp = camera.position; for (const f of W.fac || []) { const b = f.b; f.g.visible = !(cb === b && (f.side === 'roof' || (f.side === 'n' ? cp.z < b.z0 : f.side === 's' ? cp.z > b.z1 : f.side === 'w' ? cp.x < b.x0 : cp.x > b.x1))); }
  const r = me.ride; if (r) { r.t += dt; const k = clamp(r.t / r.d, 0, 1), e = k * k * (3 - 2 * k); if (r.x0 != null) { me.pos.x = lerp(r.x0, r.x1, k); me.pos.z = lerp(r.z0, r.z1, k); } me.y = lerp(r.y0, r.y1, r.stairs ? k : e); me.moving = !!r.stairs; me.speed = 1.2; if (r.stairs) me.ry = Math.atan2(r.x1 - r.x0, r.z1 - r.z0); if (k >= 1) { me.ride = null; me.y = r.y1; me.moving = false; const f = r.then; if (f) f(); } return; }
  me.y = lerp(me.y || 0, (me.lvl || 0) * FH, Math.min(1, dt * 6)); lvT += dt; if (lvT > .25) { lvT = 0; lvVis(); }
}
const _mv18 = moveMe; moveMe = function (dt) { if (me.ride) return; _mv18(dt); };
/* climb stairs or take a lift to level l. then() runs when you arrive */
function rideTo(l, o) {
  o = o || {}; if (me.seat) stand(); me.path = null; me.pending = null; const from = me.lvl || 0; if (from === l) { if (o.then) o.then(); return; } setLvl(l);
  me.ride = { t: 0, d: o.stairs ? 3.2 : 2.2 + Math.abs(l - from) * 0.5, y0: me.y, y1: l * FH, stairs: !!o.stairs, x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, then: o.then };
  if (!o.stairs) sfx && sfx('ding');
}
/* hit tests and picking only see the floor you are on */
const _np18 = nearestPick; nearestPick = function () { let best = null, bd = 1e9; for (const p of W.picks) { if ((p.lv || 0) !== (me.lvl || 0)) continue; const ref = p.seat ? p.seat : p, d = Math.hypot(me.pos.x - ref.x, me.pos.z - ref.z); if (d < p.near && d < bd) { bd = d; best = p; } } return best; };
const _pa18 = pickAt; pickAt = function (cx, cy) { floorPlane.constant = -((me.lvl || 0) * FH); const saved = W.pickMeshes; W.pickMeshes = saved.filter(m => (m.userData.lv || 0) === (me.lvl || 0)); try { return _pa18(cx, cy); } finally { W.pickMeshes = saved; floorPlane.constant = 0; } };
/* directory of labelled spaces, and navigation that handles stairs and lifts for you */
function space(o) { W.spaces.push(Object.assign({ lv: curLvl, ic: '📍', cat: 'Space' }, o)); }
function liftFor(b) { return W.lifts.find(l => l.bld === (b && b.id)) || null; }
function walkTo(x, z, then) { goTo(x, z, then); }
function navTo(sp) {
  closeDrawer(); if (me.lock) lockEnd(); if (me.game) leaveGame(); if (me.ride) return; const mb = bldAt(me.pos.x, me.pos.z), tb = sp.bld ? (W.camp || []).find(c => c.id === sp.bld) : null, L = me.lvl || 0;
  const arrive = () => { const f = nearestFree(sp.x, sp.z); goTo(f.x, f.z); toast('Heading to ' + sp.nm + (sp.lv ? ' (Level ' + sp.lv + ')' : '') + '.'); };
  const use = (b, to, then) => { const lf = liftFor(b); if (!lf) { then(); return; } const here = lf.x, hz = lf.z; const go = () => { rideTo(to, { then: () => { const f = nearestFree(lf.x, lf.z + 1.6); me.pos.x = f.x; me.pos.z = f.z; then(); } }); }; if (Math.hypot(me.pos.x - lf.x, me.pos.z - lf.z) < 1.2) go(); else goTo(lf.x, lf.z + 0.9, () => { me.pos.x = lf.x; me.pos.z = lf.z; go(); }); };
  if (L !== 0 && (!tb || tb !== mb || sp.lv !== L)) { if (tb && tb === mb) use(mb, sp.lv, arrive); else use(mb, 0, () => navTo(sp)); return; }
  if (L === 0 && sp.lv !== 0) { if (mb === tb) use(tb, sp.lv, arrive); else { const lf = liftFor(tb); if (lf) goTo(lf.x, lf.z + 1.6, () => navTo(sp)); else arrive(); } return; }
  arrive();
}
panels.dir = b => {
  let q = '', cat = ''; const draw = () => { b.replaceChildren(); const cats = [...new Set(W.spaces.map(s => s.cat))];
    b.append(el('input', { placeholder: 'Search places: gym, training room, café, roof garden…', value: q, style: 'width:100%', oninput: e => { q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(draw, 200); } }), el('div', { class: 'chips' }, ...[''].concat(cats).map(c => el('button', { type: 'button', class: cat === c ? 'sel' : '', text: c || 'All', onclick: () => { cat = c; draw(); } }))));
    const list = W.spaces.filter(s => (!cat || s.cat === cat) && (!q || (s.nm + ' ' + s.cat + ' ' + (s.bn || '')).toLowerCase().includes(q.toLowerCase()))); const groups = new Map(); for (const s of list) { const k = (s.bn || 'Outdoors and HQ') + ' · ' + (s.lv ? 'Level ' + s.lv : 'Ground'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    for (const [k, arr] of groups) b.append(el('h3', { text: k }), ...arr.map(s => el('div', { class: 'card', style: 'display:flex;flex-direction:row;align-items:center;gap:10px' }, el('span', { style: 'font-size:22px', text: s.ic }), el('b', { style: 'flex:1', text: s.nm }), el('button', { class: 'btn sm', text: 'Go', onclick: () => navTo(s) }))));
    if (!list.length) b.append(el('p', { class: 'meta', text: 'No place matches. Try another word.' })); };
  draw(); return draw;
};
function initV18() {
  const top = $('#topbtns'); top.append(el('button', { class: 'tb', id: 'bDir', text: '🧭 Places', title: 'Directory of every labelled space', onclick: () => openPanel('dir') }));
}
