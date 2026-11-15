/* ============================ boot ============================ */
function rebuild(bays) {
  const keepSeat = null; me.seat = keepSeat; me.path = null; buildOffice(bays); sizeMap(); const f = nearestFree(clamp(me.pos.x, 0.5, W.L - 0.5), me.pos.z); me.pos.x = f.x; me.pos.z = f.z;
  recomputeDesks(); redrawAll(); applyTod(); if (local.demo) setDemo(true);
}
Store.on('office', m => { const nc = readConf(m.get('config')); const grow = nc.bays !== conf.bays || nc.kind !== conf.kind; conf = nc; if (grow) { rebuild(conf.bays); layoutSig(); } else { drawSign(); layoutSync(); } recomputeDesks(); refreshPanel('desk'); });
Store.on('people', () => { recomputeDesks(); drawClocks(); resolveNames(); refreshPanel('people'); refreshPanel('desk'); refreshPanel('kudos'); });
Store.on('chat', renderChat);
Store.on('notes', () => { drawBoards(); refreshPanel('notes'); });
Store.on('files', () => refreshPanel('files'));
Store.on('kudos', () => { drawKudos(); refreshPanel('kudos'); });
Store.on('games', () => { drawC4(); drawIce(); refreshPanel('c4'); refreshPanel('ice'); });
Store.on('rooms', () => { drawScreens(); refreshPanel('rooms'); });

conf = readConf(Store.col('office').get('config')); initExtra(); initV3(); initV4(); initV5(); initV6(); initV7(); initBuild(); initV8(); initV9(); initV10(); initV12(); initV13(); initV14(); document.body.append(el('div', { id: 'vig' }));
buildOffice(conf.bays); layoutSig(); sizeMap(); recomputeDesks(); redrawAll(); applyTod(); renderChat();
if (!Store.col('people').get('local')) saveProfile(true);
if (local.demo) setDemo(true);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { redrawAll(); for (const d of W.desks) { d.owner = undefined; } recomputeDesks(); me.av.labelKey = ''; });

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fxResize(); }
let clkLast = Date.now(); setInterval(() => { const n = Date.now(); tickClock(Math.min(120, (n - clkLast) / 1000)); clkLast = n; }, 3000);
addEventListener('resize', resize); resize();

let last = performance.now(), fpsN = 0, fpsT = 0, lowered = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05), t = now / 1000; last = now;
  moveMe(dt); gameFrame(dt, now); applyDoors(dt);
  me.av.g.position.set(me.pos.x, 0, me.pos.z); me.av.g.rotation.y = me.ry;
  me.av.update(dt, t, Object.assign({ moving: me.moving, speed: me.speed, emoteN: me.emN, seat: me.seat, emote: me.emote, emoteAge: (now - me.emoteT) / 1000, mug: Date.now() < me.mugUntil, hideLabel: !!me.game || me.out, pose: me.game === 'tt' ? 'paddle' : me.game === 'pool' ? 'cue' : null }, v3AvMe(), v4AvMe(), v5AvMe())); me.av.setHeadset(!!me.call); me.av.g.visible = !cam.fp && !me.out;
  updatePeers(dt, t); updateNpcs(dt, t);
  for (const f of W.anim) f(t, dt); animateLondon(t, dt);
  // little effects: coffee steam and the table-tennis ball
  const st = now < fx.steam; W.dyn.steam.forEach((s, i) => { const a = ((t * 0.6 + i / 5) % 1); s.position.set(2.2 + Math.sin(a * 6 + i) * 0.04, 1.08 + a * 0.5, 0.58); s.material.opacity = st ? (1 - a) * 0.5 : 0; s.scale.setScalar(0.08 + a * 0.16); });
  if (!RM) TEX_SCREENS[0].offset.y = (t * 0.02) % 1;
  updateCamera(dt);
  if (now - slowT > 250) { slowT = now; slowTick(); }
  sendPresence(now);
  renderFrame();
  fpsN++; fpsT += dt; if (fpsT > 4) { if (!lowered && fpsN / fpsT < 22) { lowered = true; if (FX.on) { setQuality('standard'); toast('Switched graphics to Standard to keep things smooth.'); } renderer.setPixelRatio(1); sun.castShadow = false; resize(); } fpsN = 0; fpsT = 0; }
}
setQuality(['high', 'lite', 'standard'].includes(local.quality) ? local.quality : AUTO_QUALITY()); slowTick(); requestAnimationFrame(frame);
initNet();
window.__office = { me, W, cam, Store, goTo, openPanel, actions, setDemo, toggleView, local, applyTod, peers };
