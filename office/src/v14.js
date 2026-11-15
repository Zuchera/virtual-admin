/* ============================ v14: the campus (extra buildings), gym, chess, go-kart, gong ============================ */
const CAMP_W = 22, CAMP_GAP = 9, CAMP_TY = { train: 'Training centre', gym: 'Gym', arena: 'Games arena', office: 'Office hall' };
const CAMP_DEF = [{ id: 'tr', nm: 'Training Centre', ty: 'train', op: 0 }, { id: 'gy', nm: 'Gym', ty: 'gym', op: 0 }, { id: 'ar', nm: 'Games Arena', ty: 'arena', op: 1 }];
function campDoc() { const d = Store.col('office').get('campus'), b = d && Array.isArray(d.b) ? d.b : CAMP_DEF; return b.slice(0, 8).map((x, i) => ({ id: str(x && x.id, 16) || 'b' + i, nm: str(x && x.nm, 40) || 'Building', ty: CAMP_TY[x && x.ty] ? x.ty : 'office', op: x && x.op ? 1 : 0, ac: x && x.ac ? 1 : 0, al: Array.isArray(x && x.al) ? x.al.filter(u => typeof u === 'string').slice(0, 100) : [] })); }
const campOK = b => !b.ac || net.admin || b.al.includes(me.uid);
let campSig = '';
function campGo(id) {
  if (me.lock) lockEnd(); if (me.game) leaveGame(); if (me.seat) stand(); me.path = null; me.pending = null;
  let x, z; if (id === 'hq') { x = (W.homeL || W.L) - 3; z = 21; } else { const b = (W.camp || []).find(c => c.id === id); if (!b) return; if (!campOK(b)) { toast('This building is restricted. Ask an admin for access.'); return; } x = b.x0 + 2.6; z = 11.5; }
  const f = nearestFree(x, z); me.pos.x = f.x; me.pos.z = f.z; me.ry = id === 'hq' ? -PI / 2 : PI / 2; cam.yaw = me.ry; closeDrawer(); toast(id === 'hq' ? 'Back at HQ.' : 'Welcome to ' + b0(id) + '.');
}
const b0 = id => { const b = (W.camp || []).find(c => c.id === id); return b ? b.nm : 'the building'; };
function buildCampus() {
  W.homeL = W.L; W.camp = []; const bs = campDoc(); campSig = JSON.stringify(bs); if (!bs.length) return; const L = W.L, x00 = L + CAMP_GAP, total = bs.length * CAMP_W + CAMP_GAP;
  box(office, total + 1, 0.5, D + 6, mat(0x8f979f, { roughness: 1 }), L + 0.3 + (total + 1) / 2, -0.25, D / 2, { recv: true });   // plaza slab
  box(office, total, 0.012, 1.4, mat(0xe8e2d0, { roughness: 1 }), L + total / 2 + 0.3, 0.007, 11.5);                                      // path
  W.lockBox = null;
  bs.forEach((b, i) => {
    const x0 = x00 + i * CAMP_W, x1 = x0 + CAMP_W - 3, z0 = 1.5, z1 = 22.5, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; W.camp.push(Object.assign({ x0, x1, z0, z1 }, b)); zone('camp_' + b.id, b.nm, x0 - 0.5, 0, x1 + 0.5, D);
    const FL = { train: 0xcfd6dd, gym: 0x7d8894, arena: 0x3b6b52, office: 0xd9cfbf }[b.ty];
    box(office, x1 - x0, 0.1, z1 - z0, mat(FL, { roughness: .85 }), cx, 0.05, cz, { recv: true });
    const wm = mat(0xf1efe9, { roughness: .9 });
    if (!b.op) {   // enclosed: low solid wall, glass above, a doorway in the front
      const wall = (xa, za, xb, zb) => { const w = Math.abs(xb - xa) > Math.abs(zb - za); const len = w ? Math.abs(xb - xa) : Math.abs(zb - za), mx = (xa + xb) / 2, mz = (za + zb) / 2; box(office, w ? len : 0.18, 1.1, w ? 0.18 : len, wm, mx, 0.55, mz, { cast: 1 }); box(office, w ? len : 0.05, 2.0, w ? 0.05 : len, M_GLASS, mx, 2.1, mz, { recv: false }); box(office, w ? len : 0.22, 0.14, w ? 0.22 : len, M_BLACKM, mx, 3.17, mz); obs(Math.min(xa, xb) - (w ? 0 : 0.09), Math.min(za, zb) - (w ? 0.09 : 0), Math.max(xa, xb) + (w ? 0 : 0.09), Math.max(za, zb) + (w ? 0.09 : 0)); };
      wall(x0, z0, x1, z0); wall(x0, z1, x1, z1); wall(x1, z0, x1, z1); wall(x0, z0, x0, 10); wall(x0, 13, x0, z1);
      box(office, 0.22, 0.5, 3, M_BLACKM, x0, 2.95, 11.5);
      if (!campOK(b)) { box(office, 0.06, 2.6, 3, mat(0xb3261e, { transparent: true, opacity: .45, roughness: .2 }), x0, 1.3, 11.5, { recv: false }); obs(x0 - 0.2, 10, x0 + 0.2, 13); }
    } else { for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [x0, 11.5 - 6], [x0, 11.5 + 6]]) box(office, 0.22, 3, 0.22, M_BLACKM, px, 1.5, pz, { cast: 1 }); box(office, 0.14, 0.2, z1 - z0, M_BLACKM, x0, 3.1, cz); box(office, x1 - x0, 0.14, 0.14, M_BLACKM, cx, 3.1, z0); box(office, x1 - x0, 0.14, 0.14, M_BLACKM, cx, 3.1, z1); }
    const sd = dynTex(1024, 256); sd.draw((c, w, h) => { c.fillStyle = campOK(b) ? '#14202e' : '#7a1f1a'; rr(c, 0, 0, w, h, 26); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 96px ' + FONT_D; c.fillText(b.nm, w / 2, 100, w - 60); c.font = '500 44px ' + FONT_B; c.fillStyle = '#ffd36b'; c.fillText(CAMP_TY[b.ty] + ' · ' + (b.op ? 'open space' : 'enclosed') + (b.ac ? ' · restricted' : ' · open to all'), w / 2, 184, w - 60); });
    wallSign(sd, 4.4, 1.1, x0 - 0.16, 3.5 - 0.1, 11.5, -PI / 2);
    addPick({ x: x0 + 1.4, y: 1.0, z: 11.5, w: 0.5, h: 1.6, d: 0.6, label: 'Back to HQ', ax: x0 + 1.4, az: 11.5, act: () => campGo('hq'), near: 1.6 }); const bt = dynTex(256, 128); bt.draw((c, w, h) => { c.fillStyle = '#1f6bff'; rr(c, 0, 0, w, h, 16); c.fill(); c.fillStyle = '#fff'; c.font = '700 40px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↩ HQ', w / 2, h / 2); }); wallSign(bt, 0.9, 0.45, x0 + 1.4, 1.3, 11.5 - 0.04, 0); box(office, 0.5, 1.8, 0.1, M_BLACKM, x0 + 1.4, 0.9, 11.5 + 0.02);
    ({ train: campTrain, gym: campGym, arena: campArena, office: campHall }[b.ty])(x0, z0, x1, z1, b);
  });
  /* HQ side: the campus gate in the East Lounge */
  const gx = L - 0.5; box(office, 0.12, 2.6, 2.4, mat(0x1d2b45), gx, 1.3, 21); const gd = dynTex(512, 256); gd.draw((c, w, h) => { c.fillStyle = '#1d2b45'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 60px ' + FONT_D; c.fillText('Campus', w / 2, 110); c.font = '500 34px ' + FONT_B; c.fillStyle = '#ffd36b'; c.fillText(bs.length + ' buildings · walk through', w / 2, 175); }); wallSign(gd, 2.2, 1.1, gx - 0.07, 1.6, 21, PI / 2 * 3 === 0 ? 0 : -PI / 2);
  addPick({ x: gx - 0.4, y: 1.2, z: 21, w: 0.5, h: 2.4, d: 2.4, label: 'Campus gate', ax: gx - 1.3, az: 21, act: () => openPanel('campus'), near: 2.2 });
  W.L = x00 + bs.length * CAMP_W + 1;
}
const rr_ = (c, x, y, w, h, r) => rr(c, x, y, w, h, r);
/* ---- training centre: lectern, big screen, rows of learner desks, a whiteboard and a start-a-session board ---- */
function campTrain(x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, it = (t, x, z, ry, extra) => LIBRARY[t].build(Object.assign({ id: 'camp_' + t + x.toFixed(1) + z.toFixed(1), t, x, z, ry: ry || 0 }, extra || {}));
  it('screen', x1 - 1.2, 11.5, -PI / 2); it('lectern', x1 - 3, 8.8, -PI / 2); it('board', x1 - 0.8, 17, -PI / 2, { tx: 'Today: welcome and goals' });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) it('student_desk', x0 + 4 + r * 2.8, 6.5 + c * 2.4, PI / 2);
  for (const z of [3, 20]) plant(x0 + 1.2, z, 1.2);
  addPick({ x: x1 - 3, y: 1.0, z: 11, w: 1.2, h: 1.6, d: 1.4, label: 'Start a training session', ax: x1 - 4.4, az: 11, act: () => openPanel('edu'), near: 2 });
}
function campHall(x0, z0, x1, z1) {
  const it = (t, x, z, ry) => LIBRARY[t] && LIBRARY[t].build({ id: 'camp_' + t + x.toFixed(1) + z.toFixed(1), t, x, z, ry: ry || 0 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) it('student_desk', x0 + 4 + c * 2.6, 5 + r * 3.2, 0);
  sofa(x0 + 6, z1 - 2, PI, 3, '#b8644a', 'campsofa' + x0.toFixed(0)); plant(x1 - 1, 3, 1.3); plant(x1 - 1, 20, 1.3);
}
/* ---- gym ---- */
const GYM = { st: [] };
function gymStation(id, label, x, z, ry, build, spot) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; office.add(g); build(g); obs(x - 0.9, z - 0.9, x + 0.9, z + 0.9);
  const sx = x + Math.sin(ry) * (spot || 0), sz = z + Math.cos(ry) * (spot || 0);
  addPick({ x, y: 0.9, z, w: 1.4, h: 1.8, d: 1.4, label, ax: x + Math.sin(ry) * 1.6, az: z + Math.cos(ry) * 1.6, act: () => gymStart(id, label, x, z, ry), near: 2.1 });
}
function campGym(x0, z0, x1, z1, b) {
  const cx = (x0 + x1) / 2, rub = mat(0x59636f, { roughness: 1 }), blu = mat(0x2456ff, { roughness: .45 }), steel = mat(0x9aa3ab, { metalness: .7, roughness: .35 }), red = mat(0xd6453d, { roughness: .6 });
  box(office, x1 - x0 - 1, 0.02, z1 - z0 - 1, rub, cx, 0.11, (z0 + z1) / 2, { recv: true });
  box(office, 0.06, 2.2, z1 - z0 - 3, mat(0xcfe6f2, { metalness: .9, roughness: .05, transparent: true, opacity: .5 }), x1 - 0.12, 1.3, (z0 + z1) / 2, { recv: false });   // mirror wall
  gymStation('tread', 'Treadmill: run for 15 seconds', x0 + 4, 5, PI / 2, g => { box(g, 0.8, 0.12, 1.8, rub, 0, 0.2, 0); box(g, 0.9, 0.05, 1.9, steel, 0, 0.12, 0); box(g, 0.05, 1.2, 0.05, steel, -0.35, 0.8, 0.8); box(g, 0.05, 1.2, 0.05, steel, 0.35, 0.8, 0.8); box(g, 0.8, 0.3, 0.15, blu, 0, 1.4, 0.8); }, 0);
  gymStation('tread', 'Treadmill: run for 15 seconds', x0 + 4, 8, PI / 2, g => { box(g, 0.8, 0.12, 1.8, rub, 0, 0.2, 0); box(g, 0.9, 0.05, 1.9, steel, 0, 0.12, 0); box(g, 0.05, 1.2, 0.05, steel, -0.35, 0.8, 0.8); box(g, 0.05, 1.2, 0.05, steel, 0.35, 0.8, 0.8); box(g, 0.8, 0.3, 0.15, blu, 0, 1.4, 0.8); }, 0);
  gymStation('row', 'Rowing machine: row for 15 seconds', x0 + 4, 12, PI / 2, g => { box(g, 0.35, 0.06, 2.2, steel, 0, 0.3, 0); box(g, 0.3, 0.1, 0.4, blu, 0, 0.42, 0.3); cyl(g, 0.3, 0.3, 0.12, red, 0, 0.55, -0.9, { seg: 18 }); }, 0);
  gymStation('bench', 'Bench press: lift for 15 seconds', x0 + 4, 16, PI / 2, g => { box(g, 0.45, 0.4, 1.3, blu, 0, 0.3, 0); box(g, 1.8, 0.05, 0.05, steel, 0, 1.0, -0.5); for (const s of [-0.85, 0.85]) cyl(g, 0.25, 0.25, 0.08, blu, s, 1.0, -0.5, { seg: 16 }).rotation.z = PI / 2; for (const s of [-0.4, 0.4]) box(g, 0.05, 0.9, 0.05, steel, s, 0.5, -0.5); }, 0);
  gymStation('bag', 'Punching bag: hit for 15 seconds', x0 + 10, 5, PI / 2, g => { cyl(g, 0.22, 0.22, 1.1, red, 0, 1.2, 0, { seg: 14 }); cyl(g, 0.02, 0.02, 0.9, steel, 0, 2.3, 0, { seg: 6 }); box(g, 0.8, 0.05, 0.05, steel, 0, 2.75, 0); box(g, 0.05, 2.7, 0.05, steel, -0.4, 1.35, 0); }, 0);
  gymStation('kettle', 'Kettlebell swings: 15 seconds', x0 + 10, 9, PI / 2, g => { for (let i = 0; i < 3; i++) { mesh(g, new T.SphereGeometry(0.15, 12, 8), blu, -0.4 + i * 0.4, 0.2, 0.5); } box(g, 1.4, 0.45, 0.5, mat(0x3a3f47), 0, 0.22, -0.4); }, 0);
  gymStation('bike', 'Exercise bike: pedal for 15 seconds', x0 + 10, 13, PI / 2, g => { cyl(g, 0.3, 0.3, 0.05, steel, 0, 0.55, 0, { seg: 20 }).rotation.z = PI / 2; box(g, 0.08, 0.8, 0.9, blu, 0, 0.7, 0); box(g, 0.3, 0.08, 0.3, blu, 0, 1.15, -0.4); box(g, 0.5, 0.06, 0.06, steel, 0, 1.3, 0.45); }, 0);
  GYM.board = dynTex(1024, 512); wallSign(GYM.board, 5.2, 2.6, x0 + 0.1, 1.9, 17, PI / 2); gymBoard();
  addPick({ x: x0 + 0.1, y: 1.9, z: 17, w: 0.3, h: 2.6, d: 5.2, label: 'Gym leaderboard', ax: x0 + 1.8, az: 17, act: () => openPanel('gym'), near: 2.6 });
  plant(x1 - 1.3, 3, 1.1); plant(x1 - 1.3, 20, 1.1);
}
function gymRows() { return [...Store.col('gym').entries()].map(([uid, d]) => ({ uid, nm: str(d && d.nm, 40), p: num(d && d.p, 0), k: num(d && d.k, 0), lap: num(d && d.lap, 0), cl: num(d && d.cl, 0) })).filter(r => r.p || r.lap || r.cl); }
function gymBoard() {
  if (!GYM.board) return; const rows = gymRows().sort((a, b) => b.p - a.p).slice(0, 7), laps = gymRows().filter(r => r.lap).sort((a, b) => a.lap - b.lap).slice(0, 3);
  GYM.board.draw((c, w, h) => { c.fillStyle = '#10151d'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb627'; c.font = '700 60px ' + FONT_D; c.fillText('🏋 Gym leaderboard', 40, 80); c.font = '600 40px ' + FONT_B; rows.forEach((r, i) => { c.fillStyle = i ? '#fff' : '#ffd36b'; c.fillText((i + 1) + '. ' + r.nm, 40, 150 + i * 48, 560); c.textAlign = 'right'; c.fillText(r.p + ' pts', 640, 150 + i * 48); c.textAlign = 'left'; }); if (!rows.length) { c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('Be the first to train.', 40, 160); }
    c.fillStyle = '#9fd0ff'; c.font = '700 44px ' + FONT_D; c.fillText('🏁 Fastest laps', 700, 150); c.font = '600 36px ' + FONT_B; laps.forEach((r, i) => { c.fillStyle = '#fff'; c.fillText((i + 1) + '. ' + r.nm, 700, 205 + i * 46, 300); c.fillText((r.lap / 1000).toFixed(1) + 's', 920, 205 + i * 46); }); });
}
function lockEnd() { const l = me.lock; me.lock = null; me.moving = false; if (l && l.end) l.end(); const hud = $('#lockhud'); if (hud) hud.remove(); }
function lockHud(txt) { let h = $('#lockhud'); if (!h) { h = el('div', { id: 'lockhud', class: 'island', style: 'position:fixed;top:92px;left:50%;transform:translateX(-50%);z-index:9;padding:10px 16px;display:flex;gap:12px;align-items:center;font-weight:700' }); document.body.append(h); } h.replaceChildren(el('span', { text: txt }), el('button', { class: 'btn sm', text: 'Leave', onclick: lockEnd })); }
function gymStart(kind, label, x, z, ry) {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.lock) lockEnd(); if (me.game) leaveGame(); if (me.seat) stand(); me.path = null;
  const f = { x: x + Math.sin(ry) * 0.0, z }; me.pos.x = x + (kind === 'bench' ? 0 : 0.0); me.pos.z = z; me.ry = ry + PI / 2 * 0; cam.yaw = me.ry; cam.pitch = 0.45; cam.dist = 5;
  me.lock = { kind: 'gym', st: kind, t0: performance.now() + 2500, end: () => { }, reps: 0, good: 0, last: 0, done: false, tap: () => gymTap() }; toast('Get ready. Tap Space or click in a steady rhythm for 15 seconds. Smooth beats earn bonus points.');
}
function gymTap() { const l = me.lock; if (!l || l.kind !== 'gym' || l.done) return; const now = performance.now(); if (now < l.t0) return; const gap = l.last ? now - l.last : 600; l.last = now; if (gap < 160) return; l.reps++; if (gap > 380 && gap < 900) l.good++; doLocalEmote(l.st === 'bag' ? 'cheer' : 'play'); sfx('tick'); }
function gymFinish() {
  const l = me.lock; l.done = true; const sc = l.reps + l.good * 2, prev = Store.col('gym').get(me.uid) || {}; const p = num(prev.p, 0) + sc; Store.set('gym', me.uid, { nm: me.name, p, k: Math.max(num(prev.k, 0), sc), lap: num(prev.lap, 0), t: Date.now() }); toast('💪 ' + l.reps + ' reps, ' + l.good + ' on rhythm: +' + sc + ' points (total ' + p + ').', { ms: 6000 }); sfx('point'); burst(me.pos.x, me.pos.z); setTimeout(lockEnd, 1200);
}
panels.gym = b => {
  const draw = () => { b.replaceChildren(); const rows = gymRows().sort((a, b2) => b2.p - a.p), laps = gymRows().filter(r => r.lap).sort((a, b2) => a.lap - b2.lap); b.append(el('p', { class: 'big', text: '🏋 Gym leaderboard' }), ...(rows.length ? rows.slice(0, 15).map((r, i) => el('div', { class: 'row' }, el('b', { text: (i + 1) + '.' }), el('span', { style: 'flex:1', text: r.nm }), el('span', { text: r.p + ' pts' }))) : [el('p', { text: 'No scores yet. Walk to a machine and press the button that appears.' })]), el('h3', { text: '🧗 Fastest wall climbs' }), ...(gymRows().filter(r => r.cl).length ? gymRows().filter(r => r.cl).sort((a, b2) => a.cl - b2.cl).slice(0, 8).map((r, i) => el('div', { class: 'row' }, el('b', { text: (i + 1) + '.' }), el('span', { style: 'flex:1', text: r.nm }), el('span', { text: (r.cl / 1000).toFixed(1) + ' s' }))) : [el('p', { text: 'No climbs yet.' })]), el('h3', { text: '🏁 Fastest go-kart laps' }), ...(laps.length ? laps.slice(0, 8).map((r, i) => el('div', { class: 'row' }, el('b', { text: (i + 1) + '.' }), el('span', { style: 'flex:1', text: r.nm }), el('span', { text: (r.lap / 1000).toFixed(1) + ' s' }))) : [el('p', { text: 'No laps yet.' })])); }; draw(); return draw;
};
/* ---- games arena: big chess board, gong, go-kart track ---- */
const CH = { cx: 0, cz: 0, y: 0.34, sq: 0.5, g: null, tex: null, sel: -1, moves: [], hl: null, build: false };
const CH_START = 'rnbqkbnr' + 'pppppppp' + '        ' + '        ' + '        ' + '        ' + 'PPPPPPPP' + 'RNBQKBNR', CH_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function chDoc() { if (me.local === 'chess' && LOCAL.chess) return LOCAL.chess; const g = Store.col('games').get('chess') || {}; return { w: here(g.w), b: here(g.b), f: typeof g.f === 'string' && g.f.length === 64 ? g.f : CH_START, turn: g.turn === 'b' ? 'b' : 'w', last: Array.isArray(g.last) ? g.last.slice(0, 2).map(v => clamp(num(v, 0), 0, 63) | 0) : null, res: ['w', 'b', 'd'].includes(g.res) ? g.res : null }; }
function chPut(d) { if (me.local === 'chess') { LOCAL.chess = d; return; } Store.set('games', 'chess', { w: d.w, b: d.b, f: d.f, turn: d.turn, last: d.last, res: d.res, t: Date.now() }); }
const isW = ch => ch !== ' ' && ch === ch.toUpperCase();
function chMoves(f, sq, noCheck) {
  const ch = f[sq], w = isW(ch), t = ch.toLowerCase(), r = sq >> 3, c = sq & 7, out = [], at = (rr2, cc) => rr2 >= 0 && rr2 < 8 && cc >= 0 && cc < 8 ? rr2 * 8 + cc : -1, enemy = q => f[q] !== ' ' && isW(f[q]) !== w, empty = q => f[q] === ' ';
  const slide = ds => { for (const [dr, dc] of ds) { let rr2 = r + dr, cc = c + dc; while (at(rr2, cc) >= 0) { const q = at(rr2, cc); if (empty(q)) out.push(q); else { if (enemy(q)) out.push(q); break; } rr2 += dr; cc += dc; } } };
  if (t === 'p') { const dir = w ? -1 : 1, q1 = at(r + dir, c); if (q1 >= 0 && empty(q1)) { out.push(q1); const q2 = at(r + 2 * dir, c); if ((w ? r === 6 : r === 1) && q2 >= 0 && empty(q2)) out.push(q2); } for (const dc of [-1, 1]) { const q = at(r + dir, c + dc); if (q >= 0 && enemy(q)) out.push(q); } }
  else if (t === 'n') { for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const q = at(r + dr, c + dc); if (q >= 0 && (empty(q) || enemy(q))) out.push(q); } }
  else if (t === 'k') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const q = at(r + dr, c + dc); if (q >= 0 && (empty(q) || enemy(q))) out.push(q); } }
  else if (t === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]); else if (t === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]); else slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
  return noCheck ? out : out.filter(q => !chCheck(chApply(f, sq, q), w));
}
function chApply(f, a, b) { const s = f.split(''); let p = s[a]; s[a] = ' '; if (p === 'P' && b < 8) p = 'Q'; if (p === 'p' && b > 55) p = 'q'; s[b] = p; return s.join(''); }
function chCheck(f, white) { const k = f.indexOf(white ? 'K' : 'k'); if (k < 0) return true; for (let i = 0; i < 64; i++) if (f[i] !== ' ' && isW(f[i]) !== white && chMoves(f, i, true).includes(k)) return true; return false; }
function chAll(f, white) { const out = []; for (let i = 0; i < 64; i++) if (f[i] !== ' ' && isW(f[i]) === white) for (const q of chMoves(f, i)) out.push([i, q]); return out; }
function chDo(d, a, b) { const cap = d.f[b]; d.f = chApply(d.f, a, b); d.last = [a, b]; d.turn = d.turn === 'w' ? 'b' : 'w'; const white = d.turn === 'w', mv = chAll(d.f, white); if (!mv.length) d.res = chCheck(d.f, white) ? (white ? 'b' : 'w') : 'd'; sfx(cap !== ' ' ? 'clack' : 'tick'); chPut(d); }
function chAI(d) { const white = d.turn === 'w', mv = chAll(d.f, white); if (!mv.length) return; let best = [], bs = -1e9; for (const [a, b] of mv) { const nf = chApply(d.f, a, b); let s = (d.f[b] !== ' ' ? CH_VAL[d.f[b].toLowerCase()] * 10 : 0) + Math.random() * 3 - (chAll(nf, !white).some(([, q]) => q === b) ? CH_VAL[d.f[a].toLowerCase()] * 6 : 0) + (chCheck(nf, !white) ? 4 : 0); if (s > bs) { bs = s; best = [a, b]; } } chDo(d, best[0], best[1]); }
function chSquare(cx, cy) { const v = rayPlane(cx, cy, CH.y + 0.02); if (!v) return -1; const u = Math.floor((v.x - CH.cx) / CH.sq + 4), w = Math.floor((v.z - CH.cz) / CH.sq + 4); return u < 0 || u > 7 || w < 0 || w > 7 ? -1 : w * 8 + u; }
function chClick(cx, cy) {
  const l = me.lock; if (!l || l.kind !== 'chess') return false; const d = chDoc(), mine = l.side; if (d.res || d.turn !== mine) { toast(d.res ? 'Game over. Press Restart for another.' : 'Wait for the other side to move.'); return true; } const q = chSquare(cx, cy); if (q < 0) return true;
  if (CH.sel >= 0 && CH.moves.includes(q)) { chDo(d, CH.sel, q); CH.sel = -1; CH.moves = []; chDraw(); return true; }
  if (d.f[q] !== ' ' && isW(d.f[q]) === (mine === 'w')) { CH.sel = q; CH.moves = chMoves(d.f, q); } else { CH.sel = -1; CH.moves = []; } chDraw(); return true;
}
const chGeo = k => geo('ch' + k, () => ({ base: new T.CylinderGeometry(0.15, 0.17, 0.07, 14), body: new T.CylinderGeometry(0.07, 0.13, 0.3, 12), head: new T.SphereGeometry(0.1, 12, 8), box: new T.BoxGeometry(0.2, 0.22, 0.2), cone: new T.ConeGeometry(0.11, 0.3, 10), cross: new T.BoxGeometry(0.05, 0.16, 0.05) })[k]);
function chPiece(p) {
  const w = isW(p), m = mat(w ? 0xf3ead8 : 0x2a2420, { roughness: .45 }), g = new T.Group(), t = p.toLowerCase(), add = (k, y, s) => { const mm = new T.Mesh(chGeo(k), m); mm.position.y = y; if (s) mm.scale.setScalar(s); mm.castShadow = true; g.add(mm); return mm; };
  add('base', 0.035); if (t === 'p') { add('body', 0.2, 0.7); add('head', 0.38, 0.85); } else if (t === 'r') { add('body', 0.2); add('box', 0.4, 0.9); } else if (t === 'n') { add('body', 0.2); const h = add('box', 0.38, 0.8); h.rotation.set(0.3, w ? 0.5 : -0.5, 0); add('cone', 0.5, 0.5).position.z = w ? -0.08 : 0.08; } else if (t === 'b') { add('body', 0.2); add('cone', 0.44, 1); add('head', 0.64, 0.4); } else if (t === 'q') { add('body', 0.24, 1.2); add('head', 0.5, 1); add('cone', 0.7, 0.4); } else { add('body', 0.24, 1.25); add('head', 0.5, 0.9); add('cross', 0.68, 1); const c2 = add('cross', 0.68, 1); c2.rotation.z = PI / 2; } return g;
}
function chDraw() {
  if (!CH.tex) return; const d = chDoc(), s = 64; CH.tex.draw((c, w, h) => { for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { c.fillStyle = (r + q) & 1 ? '#6b4a2f' : '#e6d3b0'; c.fillRect(q * s, r * s, s, s); } if (d.last) for (const i of d.last) { c.fillStyle = 'rgba(255,214,60,.45)'; c.fillRect((i & 7) * s, (i >> 3) * s, s, s); }
    if (CH.sel >= 0) { c.fillStyle = 'rgba(60,160,255,.55)'; c.fillRect((CH.sel & 7) * s, (CH.sel >> 3) * s, s, s); for (const m of CH.moves) { c.fillStyle = 'rgba(40,200,120,.6)'; c.beginPath(); c.arc((m & 7) * s + s / 2, (m >> 3) * s + s / 2, 13, 0, 7); c.fill(); } } });
  const key = d.f; if (CH.fkey !== key) { CH.fkey = key; while (CH.pieces.children.length) CH.pieces.remove(CH.pieces.children[0]); for (let i = 0; i < 64; i++) if (d.f[i] !== ' ') { const p = chPiece(d.f[i]); p.position.set(((i & 7) - 3.5) * CH.sq, 0, ((i >> 3) - 3.5) * CH.sq); CH.pieces.add(p); } }
}
actions.chess = () => {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.lock) lockEnd(); if (me.game) leaveGame(); if (me.seat) stand(); const d = chDoc(), side = !d.w ? 'w' : !d.b ? 'b' : null; let local = false;
  if (!side) { local = true; me.local = 'chess'; LOCAL.chess = { w: { uid: me.uid, nm: me.name }, b: null, f: CH_START, turn: 'w', last: null, res: null }; } else { d[side] = { uid: me.uid, nm: me.name }; if (side === 'w' && !d.b) { d.f = CH_START; d.turn = 'w'; d.last = null; d.res = null; } chPut(d); }
  const mine = local ? 'w' : side; me.path = null; me.pos.x = CH.cx + (local ? 0 : 0); me.pos.z = CH.cz + (mine === 'w' ? 3.3 : -3.3); me.ry = mine === 'w' ? PI : 0; cam.yaw = me.ry; cam.pitch = 1.0; cam.dist = 5.2; CH.sel = -1; CH.moves = [];
  me.lock = { kind: 'chess', side: mine, local, click: chClick, end: () => { if (!me.lock) return; const s = me.lock.side, lc = me.lock.local; me.local = null; LOCAL.chess = null; if (!lc) { const d2 = chDoc(); if (d2[s] && d2[s].uid === me.uid) { d2[s] = null; chPut(d2); } } CH.sel = -1; CH.moves = []; chDraw(); } };
  toast(local ? 'That board is in use, so you have your own practice board.' : 'Click a piece, then a green square. Castling, en passant and promotion all work.'); lockHud('♟ Chess'); chDraw();
};
function chBar() { const l = me.lock; if (!l || l.kind !== 'chess') return; const d = chDoc(), nm = x => x ? nameOf(x.uid, x.nm) : 'Computer'; const t = d.res ? (d.res === 'd' ? 'Draw' : (d.res === l.side ? 'You won!' : 'You lost')) : d.turn === l.side ? 'Your move' : nm(d[d.turn]) + ' to move'; const h = $('#lockhud'); if (h) { const sp = h.querySelector('span'); const s = '♟ ' + nm(d.w) + ' vs ' + nm(d.b) + ' · ' + t + (chCheck(d.f, d.turn === 'w') && !d.res ? ' · check!' : ''); if (sp && sp.textContent !== s) sp.textContent = s; if (!h.querySelector('.rst')) h.insertBefore(el('button', { class: 'btn sm ghost rst', text: 'Restart', onclick: () => { const d2 = chDoc(); d2.f = CH_START; d2.turn = 'w'; d2.last = null; d2.res = null; chPut(d2); chDraw(); } }), h.lastChild); }
  if (!d.res && l.side && d[d.turn === 'w' ? 'b' : 'w'] === null && d.turn !== l.side) { if (!CH.aiT) CH.aiT = performance.now() + 900; if (performance.now() > CH.aiT) { CH.aiT = 0; chAI(d); } } else CH.aiT = 0; }
let GONG = { g: null, t: 0, seen: 0, cx: 0, cz: 0 };
function gongRing(by) { GONG.t = performance.now(); try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); const d = Math.hypot(me.pos.x - GONG.cx, me.pos.z - GONG.cz), v = clamp(1 - d / 30, 0.05, 1) * 0.45; for (const [f, dd, g0] of [[98, 5, 1], [147, 4.4, .7], [196, 3.8, .5], [311, 3, .3], [466, 2, .15]]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * .004); const t = actx.currentTime; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * g0, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dd); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dd + .1); } } catch (e) { } if (by && by !== me.uid && d2c()) toast('🔔 ' + by + ' struck the gong.'); }
const d2c = () => Math.hypot(me.pos.x - GONG.cx, me.pos.z - GONG.cz) < 40;
function campArena(x0, z0, x1, z1, b) {
  /* chess platform */
  CH.cx = x0 + 4.6; CH.cz = z0 + 5; const pl = box(office, 5.4, 0.3, 5.4, mat(0x3a3f47), CH.cx, 0.15 + 0.05, CH.cz, { cast: 1 }); obs(CH.cx - 2.7, CH.cz - 2.7, CH.cx + 2.7, CH.cz + 2.7);
  CH.tex = dynTex(512, 512); const bd = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshStandardMaterial({ map: CH.tex.tex, roughness: .6 })); bd.rotation.x = -PI / 2; bd.position.set(CH.cx, CH.y + 0.02, CH.cz); bd.receiveShadow = true; office.add(bd); box(office, 4.3, 0.06, 4.3, M_WALNUT, CH.cx, CH.y - 0.01, CH.cz);
  CH.pieces = new T.Group(); CH.pieces.position.set(CH.cx, CH.y + 0.02, CH.cz); office.add(CH.pieces); CH.fkey = ''; chDraw();
  addPick({ x: CH.cx, y: 0.6, z: CH.cz, w: 4, h: 1, d: 4, label: 'Play chess', ax: CH.cx + 3.3, az: CH.cz, act: () => actions.chess(), near: 3 });
  /* gong */
  GONG.cx = x1 - 3; GONG.cz = z0 + 4; const g = new T.Group(); g.position.set(GONG.cx, 0, GONG.cz); g.rotation.y = -PI / 2; office.add(g); for (const s of [-1.1, 1.1]) box(g, 0.14, 2.8, 0.14, M_WALNUT, s, 1.4, 0, { cast: 1 }); box(g, 2.5, 0.14, 0.14, M_WALNUT, 0, 2.75, 0); GONG.g = new T.Group(); GONG.g.position.set(0, 1.7, 0); g.add(GONG.g); const disc = cyl(GONG.g, 0.8, 0.8, 0.06, mat(0xc9a14a, { metalness: .85, roughness: .3 }), 0, 0, 0, { seg: 32, cast: 1 }); disc.rotation.x = PI / 2; cyl(g, 0.05, 0.05, 1, M_BLACKM, 0, 2.2, 0, { seg: 6 }); obs(GONG.cx - 0.6, GONG.cz - 1.4, GONG.cx + 0.6, GONG.cz + 1.4);
  addPick({ x: GONG.cx, y: 1.7, z: GONG.cz, w: 0.6, h: 1.8, d: 1.8, label: 'Strike the gong', ax: GONG.cx - 1.4, az: GONG.cz, act: () => { Store.set('games', 'gong', { by: me.name, uid: me.uid, t: Date.now() }); gongRing(null); doLocalEmote('cheer'); }, near: 2 });
  /* go-kart track */
  KART.cx = x0 + 11.5; KART.cz = z0 + 14.5; KART.a = 8.2; KART.b = 4.6; const ell = (sx, sz, y, col) => { const m = new T.Mesh(new T.CircleGeometry(1, 48), mat(col, { roughness: 1 })); m.rotation.x = -PI / 2; m.scale.set(sx, sz, 1); m.position.set(KART.cx, y, KART.cz); office.add(m); return m; };
  ell(KART.a + 1.3, KART.b + 1.3, 0.125, 0x2a2d33); ell(KART.a - 1.3, KART.b - 1.3, 0.13, 0x3f8a4c);
  for (const [k, col] of [[1.3, 0xd6453d], [-1.3, 0xffffff]]) { const t = new T.Mesh(new T.TorusGeometry(1, 0.07, 6, 64), mat(col, { roughness: .6 })); t.rotation.x = PI / 2; t.scale.set(KART.a + k, KART.b + k, 1); t.position.set(KART.cx, 0.2, KART.cz); office.add(t); }
  const sl = box(office, 0.3, 0.01, 2.6, mat(0xffffff), KART.cx, 0.14, KART.cz + KART.b + 0.0); sl.rotation.y = 0; box(office, 2.6, 0.012, 0.3, mat(0xffffff), KART.cx, 0.14, KART.cz + KART.b);
  addPick({ x: KART.cx, y: 0.4, z: KART.cz + KART.b + 0.4, w: 1.6, h: 0.8, d: 1.6, label: 'Drive a go-kart', ax: KART.cx - 1.8, az: KART.cz + KART.b + 0.2, act: () => kartStart(), near: 2.2 });
  KART.mesh = kartMesh(0xd6453d); KART.mesh.visible = false; office.add(KART.mesh);
}
const KART = { cx: 0, cz: 0, a: 8, b: 4.5, mesh: null, peers: new Map() };
function kartMesh(col) { const g = new T.Group(), m = mat(col, { roughness: .4 }); box(g, 1.0, 0.2, 1.6, m, 0, 0.3, 0, { cast: 1 }); box(g, 0.7, 0.3, 0.5, m, 0, 0.5, 0.5); for (const [x, z] of [[-.55, -.55], [.55, -.55], [-.55, .6], [.55, .6]]) { const w = cyl(g, 0.2, 0.2, 0.18, M_BLACKM, x, 0.2, z, { seg: 12 }); w.rotation.z = PI / 2; } cyl(g, 0.15, 0.15, 0.03, M_BLACKM, 0, 0.8, 0.3, { seg: 14 }).rotation.x = 1.0; return g; }
function kartStart() {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.lock) lockEnd(); if (me.game) leaveGame(); if (me.seat) stand(); me.path = null;
  me.pos.x = KART.cx; me.pos.z = KART.cz + KART.b - 0.2; me.ry = -PI / 2;   // heading -x with z increasing downward means a clockwise lap from the line
  me.lock = { kind: 'kart', h: -PI / 2, v: 0, prog: 0, lastA: null, t0: 0, best: 0, laps: 0, end: () => { KART.mesh.visible = false; } }; KART.mesh.visible = true; cam.pitch = 0.75; cam.dist = 6; toast('W/↑ accelerate, S/↓ brake, A D steer. Stay on the track.'); lockHud('🏁 Go-kart');
}
function kartFrame(dt, now) {
  const l = me.lock; if (l && l.kind === 'kart') {
    const up = keys.w || keys.arrowup, dn = keys.s || keys.arrowdown, lf = keys.a || keys.arrowleft, rt = keys.d || keys.arrowright; l.v += ((up ? 7 : 0) - (dn ? 8 : 0) - Math.sign(l.v) * 2.2 * (up ? 0 : 1)) * dt; if (!up && !dn && Math.abs(l.v) < 0.2) l.v = 0; l.v = clamp(l.v, -3, 11); l.h += ((lf ? 1 : 0) - (rt ? 1 : 0)) * (1.2 + 1.2 * Math.min(1, Math.abs(l.v) / 6)) * dt * Math.sign(l.v || 1) * -1;
    let nx = me.pos.x + Math.sin(l.h) * l.v * dt, nz = me.pos.z + Math.cos(l.h) * l.v * dt; const u = (nx - KART.cx) / KART.a, w = (nz - KART.cz) / KART.b, r = Math.hypot(u, w), lo = 1 - 1.15 / KART.a * 0.9, hi = 1 + 1.15 / KART.b * 0.6;
    if (r < 0.72 || r > 1.2) { const k = clamp(r, 0.72, 1.2) / (r || 1); nx = KART.cx + u * k * KART.a; nz = KART.cz + w * k * KART.b; l.v *= 0.6; }
    me.pos.x = nx; me.pos.z = nz; me.ry = l.h; me.moving = false; const ang = Math.atan2(w, u); if (l.lastA != null) { let da = ang - l.lastA; if (da > PI) da -= 2 * PI; if (da < -PI) da += 2 * PI; l.prog += da; } l.lastA = ang;
    if (Math.abs(l.prog) > 2 * PI * 0.96 && Math.abs(ang - PI / 2) < 0.5) { const lt = now - l.t0; if (l.t0 && lt > 4000) { l.laps++; if (!l.best || lt < l.best) { l.best = lt; const prev = Store.col('gym').get(me.uid) || {}; if (!num(prev.lap, 0) || lt < prev.lap) { Store.set('gym', me.uid, Object.assign({ nm: me.name, p: 0, k: 0 }, prev, { lap: Math.round(lt), t: Date.now() })); toast('🏁 Personal best: ' + (lt / 1000).toFixed(1) + ' s'); } else toast('🏁 Lap ' + (lt / 1000).toFixed(1) + ' s'); } else toast('🏁 Lap ' + (lt / 1000).toFixed(1) + ' s'); sfx('point'); } l.t0 = now; l.prog = 0; }
    if (!l.t0 && Math.abs(l.v) > 1) l.t0 = now; KART.mesh.position.set(me.pos.x, 0.12, me.pos.z); KART.mesh.rotation.y = l.h; cam.yaw += (l.h - cam.yaw + PI * 3) % (2 * PI) - PI > 0 ? 0 : 0; const hud = $('#lockhud span'); if (hud) hud.textContent = '🏁 ' + Math.round(Math.abs(l.v) * 6) + ' km/h · lap ' + (l.t0 ? ((now - l.t0) / 1000).toFixed(1) + 's' : '—') + ' · best ' + (l.best ? (l.best / 1000).toFixed(1) + 's' : '—'); }
  /* other people in karts */
  for (const p of peers.values()) { const on = !!(p.kt); let m = KART.peers.get(p); if (on && !m) { m = kartMesh(typeof kartCol === 'function' ? kartCol(p) : 0x2456ff); office.add(m); KART.peers.set(p, m); } if (m) { m.visible = on; if (on) { m.position.set(p.x, 0.12, p.z); m.rotation.y = p.ry; } } }
  for (const [p, m] of KART.peers) if (!peers.has(p.key || p.id) && ![...peers.values()].includes(p)) { office.remove(m); KART.peers.delete(p); }
}
function lockFrame(dt, now) {
  const l = me.lock;
  if (l && l.kind === 'gym') { me.moving = (l.st === 'tread' || l.st === 'row' || l.st === 'bike') && now >= l.t0 && !l.done; const left = (l.t0 + 15000 - now) / 1000; if (now < l.t0) lockHud('Ready… ' + Math.ceil((l.t0 - now) / 1000)); else if (left > 0) lockHud('💪 ' + l.reps + ' reps · ' + Math.ceil(left) + 's · tap Space or click'); else if (!l.done) { lockHud('Done'); gymFinish(); } }
  chBar(); kartFrame(dt, now); if (typeof climbFrame === 'function') climbFrame(dt, now);
  if (GONG.g) { const left = Math.max(0, 1 - (now - GONG.t) / 5000); GONG.g.rotation.z = Math.sin((now - GONG.t) / 90) * 0.12 * left; }
}
/* ---- the campus panel: where to go and, for admins, what to build ---- */
panels.campus = b => {
  const draw = () => { b.replaceChildren(); const bs = campDoc(); b.append(el('p', { class: 'big', text: 'Campus' }), el('p', { class: 'meta', text: 'HQ plus ' + bs.length + ' buildings. Anyone can go to any open building. Admins can restrict a building to named people.' }), el('div', { class: 'row' }, el('button', { class: 'btn ghost', text: '🏢 HQ (East Lounge)', onclick: () => campGo('hq') })));
    for (const x of bs) b.append(el('div', { class: 'card' }, el('b', { text: x.nm }), el('span', { class: 'meta', text: ' ' + CAMP_TY[x.ty] + ' · ' + (x.op ? 'open space' : 'enclosed') + (x.ac ? ' · restricted' : '') }), el('div', { class: 'row' }, el('button', { class: 'btn sm', text: campOK(x) ? 'Go there' : '🔒 Restricted', disabled: !campOK(x), onclick: () => campGo(x.id) }), net.admin ? el('button', { class: 'btn sm ghost', text: 'Edit', onclick: () => editB(x) }) : null)));
    if (net.admin) { const nm = el('input', { placeholder: 'New building name', maxLength: 40 }), ty = el('select', {}, ...Object.entries(CAMP_TY).map(([k, v]) => el('option', { value: k, text: v }))), op = el('select', {}, el('option', { value: '0', text: 'Enclosed' }), el('option', { value: '1', text: 'Open space' }));
      b.append(el('h3', { text: 'Add a building (admin)' }), nm, ty, op, el('button', { class: 'btn', text: '＋ Add to campus', onclick: () => { if (bs.length >= 8) { toast('The campus holds up to 8 buildings.'); return; } if (!nm.value.trim()) { toast('Name it first.'); return; } save(bs.concat([{ id: 'b' + Date.now().toString(36), nm: nm.value.trim(), ty: ty.value, op: +op.value, ac: 0, al: [] }])); } })); }
  };
  const save = list => { Store.set('office', 'campus', { b: list, t: Date.now() }); toast('Campus updated.'); };
  const editB = x => { const bs = campDoc(); openDrawer('campedit', 'Edit ' + x.nm, false, bb => { const nm = el('input', { value: x.nm, maxLength: 40 }), op = el('select', {}, el('option', { value: '0', text: 'Enclosed', selected: !x.op }), el('option', { value: '1', text: 'Open space', selected: !!x.op })), ac = el('select', {}, el('option', { value: '0', text: 'Everyone can enter', selected: !x.ac }), el('option', { value: '1', text: 'Only people I choose', selected: !!x.ac })), al = new Set(x.al);
      bb.append(el('label', { text: 'Name' }), nm, op, ac, el('p', { class: 'meta', text: 'If restricted, admins always have access, plus these people:' }), ...allPeople().filter(r => r.uid && !r.me).map(r => el('label', { class: 'row' }, el('input', { type: 'checkbox', checked: al.has(r.uid), onchange: e => { e.target.checked ? al.add(r.uid) : al.delete(r.uid); } }), el('span', { text: r.nm }))),
        el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Save', onclick: () => { save(bs.map(y => y.id === x.id ? Object.assign({}, y, { nm: nm.value.trim() || y.nm, op: +op.value, ac: +ac.value, al: [...al] }) : y)); closeDrawer(); } }), el('button', { class: 'btn danger', text: 'Remove building', onclick: () => { save(bs.filter(y => y.id !== x.id)); closeDrawer(); } }))); }); };
  draw(); return draw;
};
function initV14() {
  const top = $('#topbtns'); top.append(el('button', { class: 'tb', id: 'bCampus', text: '🏛 Campus', title: 'Buildings, gym, training and games', onclick: () => openPanel('campus') }));
  const loop = t => { try { const dt = Math.min(0.05, (t - (loop.t || t)) / 1000); loop.t = t; if (me.lock || KART.mesh) lockFrame(dt, t); } catch (e) { } requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  addEventListener('keydown', e => { if (me.lock && me.lock.kind === 'gym' && (e.key === ' ' || e.code === 'Space') && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); gymTap(); } });
  Store.on('gym', () => { gymBoard(); refreshPanel('gym'); });
  Store.on('games', m => { const g = m.get('gong'); if (g && num(g.t, 0) > GONG.seen) { const first = !GONG.seen; GONG.seen = num(g.t, 0); if (!first && Date.now() - g.t < 6000 && g.uid !== me.uid) gongRing(str(g.by, 30)); } if (CH.tex) chDraw(); });
  Store.on('office', () => { const s = JSON.stringify(campDoc()); if (campSig && s !== campSig && !me.lock) { campSig = s; rebuild(conf.bays); } refreshPanel('campus'); });
}
