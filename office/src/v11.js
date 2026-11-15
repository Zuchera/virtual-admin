/* ============================ v11: realism pass (cheap, baked, instanced) ============================ */
const NRM = new Map();
function normalFrom(tex, strength) {                      // height from brightness -> tangent-space normal map, once per texture
  const key = tex.uuid + ':' + strength; if (NRM.has(key)) return NRM.get(key); const img = tex.image; if (!img || !img.width) return null;
  const w = Math.min(img.width, 512), h = Math.min(img.height, 512), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
  const s = x.getImageData(0, 0, w, h).data, hh = new Float32Array(w * h); for (let i = 0; i < w * h; i++) hh[i] = (s[i * 4] * .3 + s[i * 4 + 1] * .59 + s[i * 4 + 2] * .11) / 255;
  const o = x.createImageData(w, h), d = o.data, at = (i, j) => hh[((j + h) % h) * w + ((i + w) % w)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (at(i + 1, j) - at(i - 1, j)) * strength, dy = (at(i, j + 1) - at(i, j - 1)) * strength, l = Math.hypot(dx, dy, 1), p = (j * w + i) * 4; d[p] = (-dx / l * .5 + .5) * 255; d[p + 1] = (dy / l * .5 + .5) * 255; d[p + 2] = (1 / l * .5 + .5) * 255; d[p + 3] = 255; }
  x.putImageData(o, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; NRM.set(key, t); return t;
}
function cityGroundMat() {                                 // streets, blocks, parks seen from above and from the windows
  const t = ctex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#4d535a'; c.fillRect(0, 0, w, h); const cell = 128, road = 20;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = i * cell + road / 2, y = j * cell + road / 2, r = rnd(); c.fillStyle = r < .16 ? '#5f8a52' : r < .5 ? '#8a8579' : r < .75 ? '#9a958a' : '#7b7f86'; c.fillRect(x, y, cell - road, cell - road);
      if (r < .16) { c.fillStyle = 'rgba(40,90,40,.55)'; for (let k = 0; k < 40; k++) { c.beginPath(); c.arc(x + rnd() * (cell - road), y + rnd() * (cell - road), 3 + rnd() * 5, 0, 7); c.fill(); } } else { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 6, y + 6, cell - road - 12, cell - road - 12); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 12, y + 12, cell - road - 24, cell - road - 24); } }
    c.strokeStyle = 'rgba(240,220,120,.55)'; c.lineWidth = 1.5; c.setLineDash([9, 8]); for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * cell, 0); c.lineTo(i * cell, h); c.stroke(); c.beginPath(); c.moveTo(0, i * cell); c.lineTo(w, i * cell); c.stroke(); }
  }); t.repeat.set(34, 34); t.anisotropy = 8; return new T.MeshStandardMaterial({ map: t, roughness: .95 });
}
function aoTex() { return MC.aoTex || (MC.aoTex = ctex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 6, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(.55, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.clearRect(0, 0, w, h); c.fillStyle = g; c.fillRect(0, 0, w, h); })); }

function realism() {
  try {
    const q = (typeof local !== 'undefined' && local.quality) || 'standard', lite = q === 'lite', L = W.L, xE = W.xE, g = new T.Group(); office.add(g); W.real = g;
    /* 1. contact shadows under everything that has a footprint: one draw call for the whole office */
    const ob = W.obs.filter(o => { const w = o[2] - o[0], d = o[3] - o[1]; return w > .18 && d > .18 && w < 13 && d < 13 && !(Math.min(w, d) < .35 && Math.max(w, d) > 3); });
    if (ob.length) { const im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: aoTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, opacity: .85, fog: false }), ob.length), m4 = new T.Matrix4(), qn = new T.Quaternion().setFromEuler(new T.Euler(-PI / 2, 0, 0)), sc = new T.Vector3(), ps = new T.Vector3();
      ob.forEach((o, i) => { const w = o[2] - o[0], d = o[3] - o[1]; sc.set(w + .9, d + .9, 1); ps.set((o[0] + o[2]) / 2, .008, (o[1] + o[3]) / 2); m4.compose(ps, qn, sc); im.setMatrixAt(i, m4); }); im.renderOrder = 1; im.frustumCulled = false; g.add(im); }
    /* 2. floors get surface relief so light and reflections catch them */
    if (!lite && W.floors) W.floors.forEach((f, i) => { const m = f.material; if (m.map) { const n = normalFrom(m.map, i === 1 ? 2.2 : i === 0 ? 3 : 1.6); if (n) { n.repeat.copy(m.map.repeat); m.normalMap = n; m.normalScale.set(.55, .55); m.needsUpdate = true; } } });
    /* 3. skirting boards and soft occlusion where walls meet the floor */
    const skirt = mat(0xf3f2ee, { roughness: .5 }), base = ctex(8, 64, (c, w, h) => { const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.clearRect(0, 0, w, h); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const aoMat = new T.MeshBasicMaterial({ map: base, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const strip = (grp, len, x, z, ry) => { box(grp, len, .11, .025, skirt, 0, .055, 0, { recv: false }).position.set(x, .055, z); const p = new T.Mesh(new T.PlaneGeometry(len, .55), aoMat); p.position.set(x, .28, z); grp.add(p); if (ry) { grp.children[grp.children.length - 2].rotation.y = ry; p.rotation.y = ry; } };
    strip(W.ext.n, L, L / 2, .014, 0); strip(W.ext.w, D, .014, D / 2, PI / 2); strip(W.ext.e, D, L - .014, D / 2, PI / 2);
    /* 4. warm slatted feature wall in the lounge */
    const slat = ctex(512, 256, (c, w, h) => { c.fillStyle = '#1f1710'; c.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { const v = 110 + rnd() * 40; c.fillStyle = `rgb(${v},${v * .68 | 0},${v * .42 | 0})`; c.fillRect(i * 21 + 2, 0, 17, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 6; k++) c.fillRect(i * 21 + 3 + rnd() * 14, 0, 1, h); } });
    const sm = new T.MeshStandardMaterial({ map: slat, roughness: .6 }); if (!lite) { const n = normalFrom(slat, 3); if (n) { sm.normalMap = n; sm.normalScale.set(.8, .8); } }
    if ((W.zones.find(z => z.id === 'lounge') || {}).x1 > 6) { const z0 = 17, z1 = D - 1, p = new T.Mesh(new T.PlaneGeometry(z1 - z0, 2.7), sm); p.rotation.y = PI / 2; p.position.set(.03, 1.45, (z0 + z1) / 2); W.ext.w.add(p); }
    /* 5. desk life: mugs and notebooks, instanced */
    if (!lite && W.desks.length) { const n = W.desks.length, mugs = new T.InstancedMesh(new T.CylinderGeometry(.04, .036, .09, 10), new T.MeshStandardMaterial({ roughness: .5 }), n), pads = new T.InstancedMesh(new T.BoxGeometry(.21, .014, .15), new T.MeshStandardMaterial({ roughness: .7 }), n), m4 = new T.Matrix4(), col = new T.Color(), pal = ['#f4f1ea', '#2456ff', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'];
      W.desks.forEach((d, i) => { const s = (i * 7 + 3) % pal.length; m4.makeTranslation(d.x + .36, .806, d.z - d.side * .22); mugs.setMatrixAt(i, m4); mugs.setColorAt(i, col.set(pal[s])); m4.makeRotationY((i % 5 - 2) * .12).setPosition(d.x - .02, .767, d.z - d.side * .2); pads.setMatrixAt(i, m4); pads.setColorAt(i, col.set(pal[(s + 2) % pal.length])); }); g.add(mugs, pads); }
    /* 6. window light: soft shafts that follow the sun, fade at night */
    if (!lite) { const sh = ctex(32, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); c.clearRect(0, 0, w, h); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), sg = new T.Group(); const mm = new T.MeshBasicMaterial({ map: sh, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: 0 });
      for (let x = 2.4; x < L - 1; x += 4.8) { const p = new T.Mesh(new T.PlaneGeometry(1.5, 3.4), mm); p.position.set(x, 1.5, D - 1.9); p.rotation.x = -.62; sg.add(p); } g.add(sg); W.shafts = mm; }
  } catch (e) { console.warn('realism', e); }
}
setInterval(() => { if (W.shafts && typeof sun !== 'undefined' && sky) W.shafts.opacity = clamp(sun.intensity / 2.4, 0, .55) * (1 - (sky.night || 0)); }, 1500);

/* plaster: a faint grain on every painted wall, so flat white reads as a real finish */
(function () { try { const n = ctex(128, 128, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 100 + rnd() * 56 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } }); const t = normalFrom(n, 1.2); if (t) { t.repeat.set(3, 1); M_WALL.normalMap = t; M_WALL.normalScale.set(.35, .35); M_WALL.roughness = .93; } } catch (e) { } })();
