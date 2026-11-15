/* ============================ v16: competitive wall climb, smash timing for table tennis ============================ */
function climbWall() { const spot = { x: 0.62, z: 14.4 }; goTo(spot.x + 0.4, spot.z, () => climbStart(spot)); }
function climbStart(spot) {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.lock) lockEnd(); me.pos.x = spot.x; me.pos.z = spot.z; doAct('climb', { x: 0, z: spot.z });
  me.lock = { kind: 'climb', prog: 0, last: '', t0: performance.now() + 1500, start: 0, done: false, end: () => { me.act = null; } }; me.act.t0 = performance.now() + 5000;
  const best = climbBest(); toast('Alternate A and D (or ← and →, or tap left and right) to climb. Same side twice makes you slip.' + (best ? ' Record: ' + best.nm + ' ' + (best.cl / 1000).toFixed(1) + 's.' : ''), { ms: 6000 }); lockHud('🧗 Get ready…');
}
const climbBest = () => [...Store.col('gym').values()].filter(d => d && num(d.cl, 0) > 0).sort((a, b) => a.cl - b.cl).map(d => ({ nm: str(d.nm, 40), cl: num(d.cl, 0) }))[0];
function climbPress(side) {
  const l = me.lock; if (!l || l.kind !== 'climb' || l.done) return; const now = performance.now(); if (now < l.t0) return; if (!l.start) l.start = now;
  if (side === l.last) { l.prog = Math.max(0, l.prog - 0.025); sfx('tick'); } else { l.prog = Math.min(1, l.prog + 0.034); l.last = side; sfx('tick'); if (l.prog >= 1) l.reach = true; }
}
function climbFrame(dt, now) {
  const l = me.lock; if (!l || l.kind !== 'climb') return; me.moving = false;
  if (!l.done) {
    if (now < l.t0) { lockHud('🧗 Ready… ' + Math.ceil((l.t0 - now) / 1000)); me.act.t0 = now + 5000; return; }
    if (l.start) l.prog = Math.max(0, l.prog - 0.018 * dt); const el_ = l.start ? (now - l.start) / 1000 : 0;
    me.act.t0 = now - (0.4 + 4.6 * l.prog) * 1000; lockHud('🧗 ' + Math.round(l.prog * 100) + '% · ' + el_.toFixed(1) + 's');
    if (l.reach || l.prog >= 1) { l.prog = 1; l.done = true; const ms = Math.max(1, Math.round(performance.now() - l.start)), prev = Store.col('gym').get(me.uid) || {}, pb = !num(prev.cl, 0) || ms < prev.cl, rec = !climbBest() || ms < climbBest().cl; Store.set('gym', me.uid, Object.assign({ nm: me.name, p: 0, k: 0, lap: 0 }, prev, { nm: me.name, cl: pb ? ms : prev.cl, p: num(prev.p, 0) + 10, t: Date.now() })); toast((rec ? '🏆 New office record! ' : pb ? '🥇 Personal best! ' : '') + (ms / 1000).toFixed(1) + ' s to the top. +10 gym points.', { ms: 6000 }); sfx('point'); burst(me.pos.x, me.pos.z); doLocalEmote('cheer'); l.fin = now; me.act.t0 = now - 6200; }
    else if (el_ > 40) { l.done = true; toast('Time. You reached ' + Math.round(l.prog * 100) + '%. Try again.'); l.fin = now; me.act.t0 = now - 6200; }
  } else { lockHud('🧗 ' + (l.prog >= 1 ? 'Top!' : 'Time')); if (now - l.fin > 4600) lockEnd(); }
}
function initV16() {
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const k = e.key.toLowerCase();
    if (me.lock && me.lock.kind === 'climb') { if (k === 'a' || k === 'arrowleft') { e.preventDefault(); climbPress('L'); } else if (k === 'd' || k === 'arrowright') { e.preventDefault(); climbPress('R'); } }
    if (me.game === 'tt' && (k === ' ' || e.code === 'Space') && !e.repeat) { e.preventDefault(); me.sw = Date.now(); doLocalEmote('play'); } });
  canvas.addEventListener('pointerdown', e => { if (me.lock && me.lock.kind === 'climb') climbPress(e.clientX < innerWidth / 2 ? 'L' : 'R'); else if (me.game === 'tt') { me.sw = Date.now(); doLocalEmote('play'); } });
}
