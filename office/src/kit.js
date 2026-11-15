/* ============================ building kit v5: realistic furniture, plants, ceilings, lobby, smart glass, holo globe, tower, batching ============================ */
/* rounded box with smooth normals: the corner band gets s-1 segments, the faces stay flat */
function roundBoxGeo(w, h, d, r, s) {
  s = s || 3; r = Math.max(0.002, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const k = 'rb' + [w, h, d, r, s].map(v => +(+v).toFixed(4)).join('_'); if (G[k]) return G[k];
  const g = new T.BoxGeometry(w, h, d, s * 2, s * 2, s * 2), p = g.attributes.position, n = g.attributes.normal, v = new T.Vector3(), c = new T.Vector3();
  const half = [w / 2, h / 2, d / 2], inner = half.map(a => a - r);
  const remap = (x, a, hi) => { const t = x / a, kk = Math.round(Math.abs(t) * s), sg = Math.sign(t); if (kk === 0) return 0; if (kk >= s) return sg * a; return sg * (hi + (a - hi) * (kk - 1) / (s - 1)); };
  for (let i = 0; i < p.count; i++) {
    v.set(remap(p.getX(i), half[0], inner[0]), remap(p.getY(i), half[1], inner[1]), remap(p.getZ(i), half[2], inner[2]));
    c.set(clamp(v.x, -inner[0], inner[0]), clamp(v.y, -inner[1], inner[1]), clamp(v.z, -inner[2], inner[2])); v.sub(c);
    if (v.lengthSq() > 1e-12) { v.normalize(); n.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r).add(c); } else v.add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return (G[k] = g);
}
const rbox = (p, w, h, d, r, m, x, y, z, o) => mesh(p, roundBoxGeo(w, h, d, r, (o && o.s) || (Math.min(w, h, d) < .1 ? 2 : 3)), m, x, y, z, o);
/* a soft "pouf" or cushion by lathing a profile */
function softGeo(r, h) { return geo('soft' + r + '_' + h, () => new T.LatheGeometry([[0, 0], [r * .86, 0], [r * .98, h * .1], [r, h * .45], [r * .97, h * .82], [r * .82, h * .97], [r * .5, h], [0, h]].map(q => new T.Vector2(q[0], q[1])), 28)); }
function domeGeo(r) { return geo('dome' + r, () => new T.LatheGeometry([[0.012, r * .95], [r * .3, r * .9], [r * .7, r * .62], [r * .93, r * .25], [r, 0], [r * .98, -0.004]].map(q => new T.Vector2(q[0], q[1])), 28)); }
const shade = (hex, f) => { const c = new T.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); };

/* ---------- materials of the new kit ---------- */
const M_LED = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6ea, emissiveIntensity: 1.8, roughness: .5 });
const M_HOLO = new T.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
const M_BEAM = new T.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: .045, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
const M_ALU = mat(0xc7ccd2, { roughness: .32, metalness: .85 }), M_BLACKM = mat(0x1b1e23, { roughness: .45, metalness: .5 }), M_OAK = mat(0xc89f72, { roughness: .55 }), M_WALNUT = mat(0x6e4a31, { roughness: .5 });
const M_MESH = mat(0x2a2e35, { roughness: .8 }), M_CHROME = mat(0xe4e8ec, { roughness: .12, metalness: 1 }), M_SURFACE = mat(0xf3f1ec, { roughness: .28 });
[M_LED, M_LAMP, M_HOLO, M_BEAM].forEach(m => { m.toneMapped = false; }); M_LAMP.emissiveIntensity = 1.2;
M_SCREEN_OFF.roughness = .12; M_SCREEN_OFF.metalness = .3; M_SCREEN_OFF.envMapIntensity = 1;

/* ---------- foliage: real leaf shapes on folded cards, merged into one mesh per plant ---------- */
const LEAF_TEX = ctex(512, 256, (c, w, h) => {
  c.clearRect(0, 0, w, h); const tile = (k, fn) => { c.save(); c.translate(k * 128, 0); fn(); c.restore(); };
  const leaf = (k, wid, top, colA, colB, vein) => tile(k, () => { const g = c.createLinearGradient(0, 256, 0, top); g.addColorStop(0, colA); g.addColorStop(1, colB); c.fillStyle = g;
    c.beginPath(); c.moveTo(64, 254); c.bezierCurveTo(64 - wid, 200, 64 - wid * 1.05, 70, 64, top); c.bezierCurveTo(64 + wid * 1.05, 70, 64 + wid, 200, 64, 254); c.fill();
    if (vein) { c.strokeStyle = vein; c.lineWidth = 2.2; c.beginPath(); c.moveTo(64, 252); c.lineTo(64, top + 14); c.stroke(); c.lineWidth = 1.1; for (let y = 220; y > top + 30; y -= 22) { c.beginPath(); c.moveTo(64, y); c.quadraticCurveTo(64 - wid * .5, y - 14, 64 - wid * .8, y - 30); c.moveTo(64, y); c.quadraticCurveTo(64 + wid * .5, y - 14, 64 + wid * .8, y - 30); c.stroke(); } } });
  leaf(0, 54, 8, '#2c5e33', '#4f9a52', 'rgba(190,230,170,.45)');                         // fiddle-leaf fig
  tile(1, () => { const g = c.createLinearGradient(40, 0, 88, 0); g.addColorStop(0, '#c9c25a'); g.addColorStop(.12, '#2f5a32'); g.addColorStop(.5, '#3f7a3c'); g.addColorStop(.88, '#2f5a32'); g.addColorStop(1, '#c9c25a'); c.fillStyle = g; c.beginPath(); c.moveTo(48, 256); c.quadraticCurveTo(44, 120, 64, 2); c.quadraticCurveTo(84, 120, 80, 256); c.fill(); c.fillStyle = 'rgba(160,200,140,.25)'; for (let y = 20; y < 250; y += 17) c.fillRect(50, y, 28, 5); });
  leaf(2, 62, 14, '#1f5a2c', '#3c8a45', 'rgba(170,220,150,.35)');                         // monstera (slits cut below)
  tile(2, () => { c.globalCompositeOperation = 'destination-out'; c.lineWidth = 5; for (const [y, s] of [[90, -1], [128, -1], [166, -1], [204, -1], [100, 1], [140, 1], [180, 1]]) { c.beginPath(); c.moveTo(64 + s * 62, y - 16); c.lineTo(64 + s * 18, y + 6); c.stroke(); } c.beginPath(); c.arc(64 - 30, 150, 5, 0, 7); c.arc(64 + 28, 118, 5, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; });
  leaf(3, 18, 30, '#62804e', '#9db58a', null);                                             // olive / small leaves and grass
});
LEAF_TEX.wrapS = LEAF_TEX.wrapT = T.ClampToEdgeWrapping; LEAF_TEX.anisotropy = 4;
const M_FOLIAGE = new T.MeshStandardMaterial({ map: LEAF_TEX, alphaTest: .5, side: T.DoubleSide, roughness: .62, envMapIntensity: .35 });
const M_FOLIAGE_DEPTH = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: LEAF_TEX, alphaTest: .5, side: T.DoubleSide });
class Foliage {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  leaf(base, dir, len, wid, tile, center, roll) {
    const d = dir.clone().normalize(), up = new T.Vector3(0, 1, 0); let side = new T.Vector3().crossVectors(d, up); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    if (roll) side.applyAxisAngle(d, roll); const nrm = new T.Vector3().crossVectors(side, d).normalize(); if (nrm.y < 0) nrm.negate();
    const mid = base.clone().addScaledVector(d, len * .48).addScaledVector(nrm, wid * .16);
    const pts = [base, mid.clone().addScaledVector(side, wid / 2), mid.clone().addScaledVector(side, -wid / 2), base.clone().addScaledVector(d, len).addScaledVector(up, -len * .12)];
    const u0 = tile / 4, u1 = (tile + 1) / 4, um = (u0 + u1) / 2, uvs = [[um, 0], [u0, .5], [u1, .5], [um, 1]], i0 = this.pos.length / 3;
    pts.forEach((p, i) => { this.pos.push(p.x, p.y, p.z); const n = p.clone().sub(center).normalize().addScaledVector(nrm, .6).add(new T.Vector3(0, .35, 0)).normalize(); this.nor.push(n.x, n.y, n.z); this.uv.push(uvs[i][0], uvs[i][1]); });
    this.idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
  }
  build(parent) {
    if (!this.idx.length) return null; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.idx); g.computeBoundingSphere();
    const m = new T.Mesh(g, M_FOLIAGE); m.customDepthMaterial = M_FOLIAGE_DEPTH; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
}
const V3 = (x, y, z) => new T.Vector3(x, y, z);
const POTS = [mat(0xb9b5ae, { roughness: .9 }), mat(0x2a2d31, { roughness: .7 }), mat(0xb5653f, { roughness: .85 }), mat(0xece9e2, { roughness: .6 })];
let plantN = 0;
function plant(x, z, s, kind) {
  s = s || 1; const kinds = s >= 1.25 ? ['fig', 'olive', 'fig', 'palm'] : s >= .95 ? ['monstera', 'snake', 'fig', 'monstera'] : ['snake', 'monstera']; kind = kind || kinds[plantN++ % kinds.length];
  const g = new T.Group(); g.position.set(x, 0, z); office.add(g); const pot = POTS[(plantN + Math.round(x * 3)) % POTS.length], ph = .46 * s;
  mesh(g, softGeo(.22 * s, ph), pot, 0, 0, 0, { cast: 1 }); cyl(g, .2 * s, .2 * s, .02, M_SOIL, 0, ph - .02, 0);
  const top = new T.Group(); top.position.y = ph; top.userData.dyn = true; g.add(top); const F = new Foliage(), C = V3(0, .5 * s, 0);
  if (kind === 'fig' || kind === 'olive' || kind === 'palm') {
    const th = (kind === 'palm' ? .5 : 1.05) * s; cyl(top, .018 * s, .03 * s, th, M_WOOD_D, 0, th / 2, 0, { cast: 1 });
    if (kind === 'palm') { for (let i = 0; i < 16; i++) { const a = i * 2.4 + rnd(), el = .5 + rnd() * .7; const d = V3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); for (let j = 0; j < 9; j++) { const b = V3(0, th, 0).addScaledVector(d, .08 * s + j * .07 * s); b.y -= j * j * .004 * s; const sd = V3(-Math.sin(a), 0, Math.cos(a)); F.leaf(b, sd.clone().add(d).multiplyScalar(1), .2 * s, .045 * s, 3, V3(0, th, 0), 0); F.leaf(b, sd.clone().negate().add(d), .2 * s, .045 * s, 3, V3(0, th, 0), 0); } } }
    else { const crown = V3(0, th * .78, 0), n = kind === 'fig' ? 54 : 150, rr2 = (kind === 'fig' ? .34 : .4) * s;
      for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * PI * 2, r0 = Math.cbrt(rnd()) * rr2; const b = V3(Math.sqrt(1 - u * u) * Math.cos(a) * r0, u * r0 * 1.15, Math.sqrt(1 - u * u) * Math.sin(a) * r0).add(crown);
        const d = b.clone().sub(crown).setY((b.y - crown.y) * .4 + .25).normalize().add(V3(rnd() - .5, rnd() * .3, rnd() - .5).multiplyScalar(.6));
        if (kind === 'fig') F.leaf(b, d, (.2 + rnd() * .1) * s, (.15 + rnd() * .04) * s, 0, crown, rnd() - .5); else F.leaf(b, d, (.1 + rnd() * .05) * s, .03 * s, 3, crown, rnd() * 2); }
      if (kind === 'fig') for (let i = 0; i < 3; i++) { const a = i * 2.1; const br = cyl(top, .008 * s, .012 * s, .3 * s, M_WOOD_D, Math.cos(a) * .08 * s, th * .7, Math.sin(a) * .08 * s); br.rotation.z = Math.cos(a) * .6; br.rotation.x = -Math.sin(a) * .6; } }
  } else if (kind === 'snake') {
    for (let i = 0; i < 15; i++) { const a = rnd() * PI * 2, r0 = rnd() * .1 * s; F.leaf(V3(Math.cos(a) * r0, 0, Math.sin(a) * r0), V3(Math.cos(a) * .18, 1, Math.sin(a) * .18), (.5 + rnd() * .45) * s, (.08 + rnd() * .03) * s, 1, V3(0, 0, 0), rnd() * 3); }
  } else {
    for (let i = 0; i < 11; i++) { const a = i * 2.39 + rnd() * .4, el = .35 + rnd() * .6, sl = (.3 + rnd() * .4) * s; const tipStem = V3(Math.cos(a) * Math.cos(el) * sl, Math.sin(el) * sl + .05 * s, Math.sin(a) * Math.cos(el) * sl);
      const st = cyl(top, .006 * s, .009 * s, tipStem.length(), mat(0x4f7a3a), tipStem.x / 2, tipStem.y / 2, tipStem.z / 2); st.quaternion.setFromUnitVectors(V3(0, 1, 0), tipStem.clone().normalize());
      F.leaf(tipStem, V3(Math.cos(a), .25 - rnd() * .3, Math.sin(a)), (.36 + rnd() * .12) * s, (.34 + rnd() * .08) * s, 2, V3(0, 0, 0), (rnd() - .5) * .6); }
  }
  F.build(top);
  if (!RM) W.anim.push(t => { top.rotation.z = Math.sin(t * .8 + x) * .025; top.rotation.x = Math.cos(t * .6 + z) * .018; });
  obs(x - .22 * s, z - .22 * s, x + .22 * s, z + .22 * s);
}
function planter(x0, z0, x1, z1) {
  const w = x1 - x0, d = z1 - z0; rbox(office, w, .72, d, .03, mat(0x30343a, { roughness: .55 }), (x0 + x1) / 2, .36, (z0 + z1) / 2, { cast: 1 }); box(office, w - .06, .02, d - .06, M_SOIL, (x0 + x1) / 2, .715, (z0 + z1) / 2); obs(x0, z0, x1, z1);
  const F = new Foliage(), n = Math.round(Math.max(w, d) / .045), C = V3((x0 + x1) / 2, .4, (z0 + z1) / 2);
  for (let i = 0; i < n; i++) { const b = V3(x0 + .05 + rnd() * (w - .1), .72, z0 + .05 + rnd() * (d - .1)); F.leaf(b, V3(rnd() - .5, 2.2, rnd() - .5), .28 + rnd() * .22, .03, 3, C, rnd() * 3); }
  for (let i = 0; i < Math.max(3, Math.round(Math.max(w, d) / .38)); i++) { const f = (i + .5) / Math.max(3, Math.round(Math.max(w, d) / .38)), cx = x0 + (w > d ? f * w : w / 2), cz = z0 + (w > d ? d / 2 : f * d), c = V3(cx, .95, cz);
    for (let k = 0; k < 22; k++) { const a = rnd() * 7, b = V3(cx + Math.cos(a) * .14, .76 + rnd() * .32, cz + Math.sin(a) * .14); F.leaf(b, b.clone().sub(c).setY(.3 + rnd() * .6), .2, .14, k % 5 ? 0 : 2, c, rnd()); } }
  F.build(office);
}

/* ---------- furniture ---------- */
function officeChair(x, z, ry, col) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; office.add(g); const up = mat(col, { roughness: .9 });
  for (let i = 0; i < 5; i++) { const a = i * PI * 2 / 5, arm = box(g, .3, .025, .04, M_BLACKM, Math.cos(a) * .15, .07, Math.sin(a) * .15); arm.rotation.y = -a; sph(g, .028, M_BLACKM, Math.cos(a) * .29, .03, Math.sin(a) * .29, { seg: 8 }); }
  cyl(g, .035, .035, .06, M_BLACKM, 0, .08, 0); cyl(g, .024, .024, .32, M_CHROME, 0, .26, 0);
  rbox(g, .5, .085, .48, .035, up, 0, .47, .02, { cast: 1 });
  const back = rbox(g, .46, .58, .045, .04, M_MESH, 0, .86, -.24, { cast: 1 }); back.rotation.x = -.1; rbox(g, .4, .1, .04, .02, up, 0, .7, -.22);
  box(g, .05, .3, .03, M_BLACKM, 0, .6, -.25);
  for (const sx of [-1, 1]) { box(g, .03, .2, .03, M_BLACKM, sx * .25, .58, -.02); rbox(g, .07, .03, .26, .012, M_BLACKM, sx * .25, .69, .0); }
  return g;
}
function monitor(p, x, y, z, ry) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  rbox(g, .24, .012, .16, .006, M_ALU, 0, .006, -.02); box(g, .045, .2, .018, M_ALU, 0, .11, -.05).rotation.x = .12;
  rbox(g, .62, .37, .03, .008, M_BLACKM, 0, .34, -.01, { cast: 1 });
  const s = mesh(g, geo('scr', () => new T.PlaneGeometry(.6, .34)), M_SCREEN_OFF, 0, .345, .0065, { recv: false });
  rbox(g, .42, .014, .13, .006, mat(0xe3e6ea, { roughness: .5 }), 0, .007, .3); rbox(g, .06, .02, .1, .009, mat(0xe3e6ea, { roughness: .4 }), .3, .01, .3);
  return s;
}
function sofa(x, z, ry, n, col, idp) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; office.add(g); const w = n * .72 + .3, m = mat(col, { roughness: .96 }), m2 = mat(shade(col, .04), { roughness: .98 });
  rbox(g, w, .2, .86, .05, m, 0, .22, 0, { cast: 1 }); rbox(g, w, .46, .2, .07, m, 0, .56, -.34, { cast: 1 });
  for (const sx of [-1, 1]) { rbox(g, .18, .36, .86, .07, m, sx * (w / 2 - .09), .44, 0, { cast: 1 }); for (const sz of [-1, 1]) cyl(g, .018, .012, .12, M_WALNUT, sx * (w / 2 - .1), .06, sz * .34, { seg: 8 }); }
  for (let i = 0; i < n; i++) { const lx = (i - (n - 1) / 2) * .72; rbox(g, .68, .13, .62, .055, m2, lx, .38, .06, { cast: 1 }); const bc = rbox(g, .66, .4, .15, .065, m2, lx, .64, -.2, { cast: 1 }); bc.rotation.x = -.16;
    addSeat(idp + i, x + Math.cos(ry) * lx, z - Math.sin(ry) * lx, ry, 'sofa', .5); }
  if (n >= 2) for (const sx of [-1, 1]) { const pl = rbox(g, .36, .34, .12, .055, mat(sx > 0 ? '#e6c88f' : '#2f4b63', { roughness: 1 }), sx * (w / 2 - .4), .6, -.08); pl.rotation.set(-.25, sx * .3, sx * .12); }
  blob(x, z, (w + .6) * Math.abs(Math.cos(ry)) + 1.4 * Math.abs(Math.sin(ry)), (w + .6) * Math.abs(Math.sin(ry)) + 1.4 * Math.abs(Math.cos(ry)));
  const c = Math.abs(Math.cos(ry)), s2 = Math.abs(Math.sin(ry)), hw = (w * c + .86 * s2) / 2, hd = (w * s2 + .86 * c) / 2; obs(x - hw, z - hd, x + hw, z + hd);
}
function stool(id, x, z, ry, col) { cyl(office, .022, .022, .7, M_BLACKM, x, .36, z, { seg: 10 }); cyl(office, .19, .21, .02, M_BLACKM, x, .01, z, { seg: 20 }); mesh(office, new T.TorusGeometry(.16, .01, 6, 24), M_BLACKM, x, .3, z).rotation.x = PI / 2; mesh(office, softGeo(.19, .07), mat(col, { roughness: .6 }), x, .72, z, { cast: 1 }); addSeat(id, x, z, ry, 'stool', .78); }
function pouf(id, x, z, ry, col) { mesh(office, softGeo(.31, .42), mat(col, { roughness: 1 }), x, 0, z, { cast: 1 }); addSeat(id, x, z, ry, 'pouf', .44); }
function pendant(x, z, kind, y) {
  y = y || 2.5;
  if (kind === 'bar') { for (const sx of [-.7, .7]) box(office, .004, H - y, .004, M_DARK, x + sx, (H + y) / 2, z, { recv: false }); rbox(office, 1.6, .045, .075, .012, M_BLACKM, x, y + .02, z, { recv: false }); box(office, 1.54, .012, .052, M_LED, x, y - .004, z, { recv: false }); }
  else { box(office, .006, H - y - .2, .006, M_DARK, x, (H + y + .2) / 2, z, { recv: false }); const dm = kind === 'brass' ? mat(0xc9a14a, { metalness: .85, roughness: .3, side: T.DoubleSide }) : mat(0x1f2328, { roughness: .4, metalness: .3, side: T.DoubleSide });
    mesh(office, domeGeo(.22), dm, x, y, z, { recv: false }); sph(office, .06, M_LED, x, y + .02, z, { recv: false, seg: 10 }); }
}

/* ---------- surfaces ---------- */
const TEX_OAK = () => ctex(512, 512, (c, w, h) => {
  c.fillStyle = '#b98c5e'; c.fillRect(0, 0, w, h); const pw = 32, pl = 205;
  for (let col = 0; col < w / pw; col++) { const off = (col * 97) % pl; for (let y = -off; y < h; y += pl) { const v = 168 + rnd() * 46, t = rnd() * 10; c.fillStyle = `rgb(${v + 12},${v - 22 + t},${v - 70})`; c.fillRect(col * pw + 1, y + 1, pw - 2, pl - 2);
    c.strokeStyle = 'rgba(80,50,25,.16)'; c.lineWidth = 1; for (let k = 0; k < 7; k++) { const xx = col * pw + 3 + rnd() * (pw - 6); c.beginPath(); c.moveTo(xx, y); c.bezierCurveTo(xx + 3, y + pl * .3, xx - 3, y + pl * .6, xx + 1, y + pl); c.stroke(); } } }
  c.fillStyle = 'rgba(40,25,10,.35)'; for (let col = 0; col <= w / pw; col++) c.fillRect(col * pw - 1, 0, 1, h);
});
const TEX_TILES = () => ctex(256, 256, (c, w, h) => {
  const half = w / 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x0 = i * half, y0 = j * half, vert = (i + j) % 2; c.fillStyle = '#5d6672'; c.fillRect(x0, y0, half, half);
    for (let k = 0; k < half; k += 4) { c.fillStyle = k % 8 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.1)'; if (vert) c.fillRect(x0 + k, y0, 2, half); else c.fillRect(x0, y0 + k, half, 2); }
    for (let n = 0; n < 900; n++) { c.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; c.fillRect(x0 + rnd() * half, y0 + rnd() * half, 1.5, 1.5); } c.strokeStyle = 'rgba(0,0,0,.22)'; c.strokeRect(x0 + .5, y0 + .5, half - 1, half - 1); }
});
const TEX_CEMENT = () => ctex(512, 512, (c, w, h) => { c.fillStyle = '#c9c6c0'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70, g = c.createRadialGradient(x, y, 1, x, y, r), v = rnd() > .5 ? 255 : 90; g.addColorStop(0, `rgba(${v},${v},${v},.06)`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); } c.strokeStyle = 'rgba(0,0,0,.08)'; c.strokeRect(0, 0, w, h); });
const TEX_TERRAZZO = () => ctex(512, 512, (c, w, h) => { c.fillStyle = '#ecebe6'; c.fillRect(0, 0, w, h); const cols = ['#8c8f94', '#c9a14a', '#2456ff', '#d9b9a0', '#4a4f57', '#b8bcc2']; for (let i = 0; i < 900; i++) { c.fillStyle = cols[i % cols.length]; c.globalAlpha = .55 + rnd() * .45; c.beginPath(); const x = rnd() * w, y = rnd() * h, r = 1.5 + rnd() * (i % 9 ? 3 : 7); for (let k = 0; k < 6; k++) { const a = k / 6 * 7 + rnd(); c.lineTo(x + Math.cos(a) * r * (.6 + rnd() * .6), y + Math.sin(a) * r * (.6 + rnd() * .6)); } c.fill(); } c.globalAlpha = 1; });

/* ---------- smart glass: frosts when a room is private or the person inside is busy ---------- */
const smartGlass = [];
function glassMat() { const m = M_GLASS.clone(); m.userData.f = 0; return m; }
function frostTick(dt) {
  for (const s of smartGlass) { let want = 0; try { want = s.want() ? 1 : 0; } catch (e) { } s.m.userData.f = lerp(s.m.userData.f, want, Math.min(1, dt * 3));
    const f = s.m.userData.f; s.m.opacity = (M_GLASS.opacity) * (1 - f) + .8 * f; s.m.color.setRGB(.8 + f * .17, .9 + f * .07, .94 + f * .04); s.m.roughness = .05 + f * .8; }
}

/* ---------- ceilings: dark exposed slab, timber slats over the hangout, felt baffles and light lines over the floor ---------- */
function buildCeiling() {
  const L = W.L, xE = W.xE, cg = new T.Group(); cg.visible = false; office.add(cg); W.ext.ceil = cg;
  const slab = mesh(cg, new T.PlaneGeometry(L, D), mat(0x2b2f35, { roughness: 1 }), L / 2, H, D / 2, { recv: false }); slab.rotation.x = PI / 2;
  for (let x = .15; x < HANG - .1; x += .14) box(cg, .045, .07, D - .2, M_OAK, x, H - .2, D / 2, { recv: false });
  const felt = [mat(0x8c867b, { roughness: 1 }), mat(0x6f7a83, { roughness: 1 })];
  for (let z = 6.6, i = 0; z < D - .6; z += .55, i++) { const x0 = z < 6 ? xE : HANG + .2; box(cg, L - x0 - .3, .42, .035, felt[i % 2], (x0 + L - .3) / 2, H - .32, z, { recv: false }); }
  for (const z of [7.6, 12.1, 16.6, 20.8]) { box(cg, L - HANG - .6, .03, .08, M_BLACKM, (HANG + L) / 2, H - .58, z, { recv: false }); box(cg, L - HANG - .64, .012, .05, M_LED, (HANG + L) / 2, H - .6, z, { recv: false }); for (let x = HANG + 1; x < L; x += 4) box(cg, .004, .6, .004, M_DARK, x, H - .28, z, { recv: false }); }
  const panel = mat(0xf1f0ec, { roughness: .9 });
  const flat = (x0, x1, z0, z1) => { const p = mesh(cg, new T.PlaneGeometry(x1 - x0, z1 - z0), panel, (x0 + x1) / 2, H - .02, (z0 + z1) / 2, { recv: false }); p.rotation.x = PI / 2; for (let x = x0 + .8; x < x1 - .4; x += 1.4) for (let z = z0 + .8; z < z1 - .4; z += 1.4) { const dl = cyl(cg, .06, .06, .01, M_LED, x, H - .03, z, { seg: 14, recv: false }); } };
  for (let b = 0; b < W.bays; b++) for (let k = 0; k < 2; k++) { const x0 = HANG + b * BAY + k * 3.2; flat(x0 + .05, x0 + 3.15, .05, 4.35); }
  flat(xE + .05, L - .05, .05, 5.95);
  for (let x = 2; x < L; x += 3.2) for (let z = 2; z < D; z += 3.2) { cyl(cg, .045, .045, .025, M_WHITE, x, H - .35 + (x < HANG ? .1 : 0), z, { seg: 10, recv: false }); }
  for (let x = HANG + 1.6; x < L - 1; x += 6.4) box(cg, 1.2, .02, .08, M_DARK, x, H - .015, 10.3, { recv: false });
}

/* ---------- the holographic team globe ---------- */
const LAND = [
  [[37, -10], [37, 10], [32, 32], [12, 43], [11, 51], [-1, 42], [-11, 40], [-26, 33], [-35, 20], [-29, 16], [-17, 12], [-5, 12], [5, -5], [5, -8], [15, -17], [21, -17], [28, -13], [36, -6]],
  [[36, -9], [43, -9], [48, -4], [51, 2], [54, 8], [57, 8], [58, 6], [63, 5], [70, 20], [71, 28], [70, 40], [60, 40], [55, 38], [46, 40], [41, 29], [40, 23], [37, 22], [38, 15], [44, 12], [43, 5], [40, 0], [36, -6]],
  [[50, -5], [51, 1], [53, 0], [55, -2], [58, -3], [58, -6], [55, -6], [52, -5]], [[52, -10], [55, -8], [54, -6], [52, -6]],
  [[70, 40], [73, 80], [77, 105], [72, 130], [70, 160], [65, 178], [60, 165], [53, 142], [46, 138], [40, 140], [35, 129], [30, 122], [22, 114], [21, 106], [10, 107], [1, 104], [8, 98], [16, 97], [16, 94], [22, 89], [20, 86], [15, 80], [8, 77], [20, 72], [25, 66], [25, 57], [30, 48], [22, 59], [16, 53], [12, 44], [20, 40], [28, 34], [36, 36], [41, 29], [46, 40], [55, 38], [60, 40]],
  [[70, -160], [71, -156], [70, -140], [69, -115], [73, -95], [70, -80], [63, -77], [60, -64], [53, -56], [47, -53], [45, -61], [43, -70], [41, -70], [35, -76], [31, -81], [25, -80], [26, -82], [30, -84], [29, -89], [28, -97], [22, -97], [19, -96], [21, -87], [18, -88], [15, -83], [9, -79], [8, -82], [15, -92], [19, -105], [23, -110], [31, -114], [32, -117], [38, -123], [48, -125], [55, -131], [59, -139], [60, -147], [57, -157], [55, -163], [60, -165], [65, -168]],
  [[60, -44], [70, -22], [81, -15], [83, -40], [78, -70], [76, -68], [70, -54], [64, -52]],
  [[12, -72], [11, -63], [5, -52], [-1, -50], [-5, -35], [-13, -38], [-23, -42], [-33, -52], [-39, -57], [-41, -63], [-52, -68], [-55, -67], [-54, -72], [-46, -75], [-37, -73], [-18, -70], [-14, -76], [-5, -81], [1, -80], [8, -77]],
  [[-11, 142], [-17, 140], [-12, 136], [-14, 127], [-21, 114], [-31, 115], [-35, 117], [-32, 126], [-38, 140], [-38, 146], [-33, 152], [-25, 153], [-19, 146]],
  [[7, 117], [1, 119], [-4, 116], [-3, 110], [2, 109]], [[5, 95], [-6, 105], [-4, 102], [2, 98]], [[31, 130], [35, 140], [41, 141], [45, 142], [43, 145], [40, 140], [35, 133]],
  [[-12, 49], [-25, 47], [-25, 44], [-16, 44]], [[-35, 173], [-41, 176], [-47, 167], [-41, 172]], [[-6, 106], [-8, 114], [-8, 106]], [[-2, 131], [-6, 141], [-9, 148], [-6, 147], [-3, 135]]
];
const inPoly = (la, lo, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ai, oi] = P[i], [aj, oj] = P[j]; if ((ai > la) !== (aj > la) && lo < (oj - oi) * (la - ai) / (aj - ai) + oi) c = !c; } return c; };
const TZ_LL = { 'Europe/London': [51.5, -.1], 'Africa/Lagos': [6.5, 3.4], 'Africa/Accra': [5.6, -.2], 'Africa/Nairobi': [-1.3, 36.8], 'Africa/Johannesburg': [-26.2, 28], 'Africa/Cairo': [30, 31.2], 'Africa/Casablanca': [33.6, -7.6], 'Africa/Kigali': [-1.9, 30], 'Africa/Addis_Ababa': [9, 38.7], 'Africa/Kampala': [.3, 32.6], 'Africa/Dar_es_Salaam': [-6.8, 39.3], 'Africa/Abidjan': [5.3, -4], 'Africa/Dakar': [14.7, -17.4],
  'Asia/Dubai': [25.2, 55.3], 'Asia/Kolkata': [20.6, 78.9], 'Asia/Calcutta': [20.6, 78.9], 'Asia/Karachi': [24.9, 67], 'Asia/Dhaka': [23.8, 90.4], 'Asia/Manila': [14.6, 121], 'Asia/Singapore': [1.35, 103.8], 'Asia/Shanghai': [31.2, 121.5], 'Asia/Hong_Kong': [22.3, 114.2], 'Asia/Tokyo': [35.7, 139.7], 'Asia/Seoul': [37.6, 127], 'Asia/Jakarta': [-6.2, 106.8], 'Asia/Riyadh': [24.7, 46.7], 'Asia/Kathmandu': [27.7, 85.3], 'Asia/Colombo': [6.9, 79.9], 'Asia/Ho_Chi_Minh': [10.8, 106.7], 'Asia/Bangkok': [13.8, 100.5], 'Asia/Kuala_Lumpur': [3.1, 101.7],
  'America/New_York': [40.7, -74], 'America/Chicago': [41.9, -87.6], 'America/Denver': [39.7, -105], 'America/Los_Angeles': [34, -118.2], 'America/Toronto': [43.7, -79.4], 'America/Sao_Paulo': [-23.5, -46.6], 'America/Mexico_City': [19.4, -99.1], 'America/Bogota': [4.7, -74.1], 'America/Phoenix': [33.4, -112], 'America/Vancouver': [49.3, -123.1],
  'Europe/Paris': [48.9, 2.35], 'Europe/Berlin': [52.5, 13.4], 'Europe/Madrid': [40.4, -3.7], 'Europe/Lisbon': [38.7, -9.1], 'Europe/Amsterdam': [52.4, 4.9], 'Europe/Dublin': [53.3, -6.3], 'Europe/Warsaw': [52.2, 21], 'Europe/Kiev': [50.4, 30.5], 'Europe/Kyiv': [50.4, 30.5], 'Europe/Istanbul': [41, 29], 'Europe/Moscow': [55.8, 37.6], 'Europe/Rome': [41.9, 12.5], 'Europe/Stockholm': [59.3, 18.1], 'Europe/Zurich': [47.4, 8.5], 'Europe/Bucharest': [44.4, 26.1], 'Europe/Athens': [38, 23.7],
  'Australia/Sydney': [-33.9, 151.2], 'Australia/Melbourne': [-37.8, 145], 'Australia/Perth': [-31.9, 115.9], 'Pacific/Auckland': [-36.8, 174.8] };
function tzLatLon(tz) { if (TZ_LL[tz]) return TZ_LL[tz]; try { const d = new Date(), s = d.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':'), off = ((+s[0] % 24) + (+s[1]) / 60) - (d.getUTCHours() + d.getUTCMinutes() / 60); const o = ((off + 36) % 24) - 12; return [/^Africa/.test(tz) ? 5 : /^Australia|^Pacific/.test(tz) ? -25 : /^America\/(Sao|Buenos|Lima|Santiago)/.test(tz) ? -20 : 35, o * 15]; } catch (e) { return null; } }
const llVec = (la, lo, r) => { const a = la * PI / 180, b = lo * PI / 180; return V3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r); };
function holoGlobe(cx, cz) {
  const R = .44, g = new T.Group(); g.position.set(cx, 0, cz); office.add(g);
  mesh(g, softGeo(.62, .5), M_SURFACE, 0, 0, 0, { cast: 1 }); const ring = mesh(g, new T.TorusGeometry(.5, .012, 8, 64), M_HOLO, 0, .505, 0); ring.rotation.x = PI / 2;
  const disc = mesh(g, new T.CircleGeometry(.44, 40), new T.MeshBasicMaterial({ color: 0x2aa8ff, transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false }), 0, .508, 0); disc.rotation.x = -PI / 2;
  mesh(g, new T.CylinderGeometry(.62, .42, 1.15, 40, 1, true), M_BEAM, 0, 1.08, 0);
  const sph0 = new T.Group(); sph0.position.y = 1.32; sph0.userData.dyn = true; g.add(sph0); W.dyn.globe = sph0;
  const pts = []; const N = 9000; for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; const la = Math.asin(y) * 180 / PI, lo = ((Math.atan2(r * Math.sin(th), r * Math.cos(th)) * 180 / PI) + 540) % 360 - 180; if (LAND.some(P => inPoly(la, lo, P))) { const v = llVec(la, lo, R); pts.push(v.x, v.y, v.z); } }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  sph0.add(new T.Points(pg, new T.PointsMaterial({ color: 0x8fe9ff, size: .012, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
  const grid = []; for (let la = -60; la <= 60; la += 30) for (let lo = 0; lo < 360; lo += 6) { const a = llVec(la, lo, R * 1.005), b = llVec(la, lo + 6, R * 1.005); grid.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  for (let lo = 0; lo < 360; lo += 30) for (let la = -84; la < 84; la += 6) { const a = llVec(la, lo, R * 1.005), b = llVec(la + 6, lo, R * 1.005); grid.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(grid, 3)); sph0.add(new T.LineSegments(gg, new T.LineBasicMaterial({ color: 0x3fb8ff, transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false })));
  sph0.add(new T.Mesh(new T.SphereGeometry(R * .97, 32, 16), new T.MeshBasicMaterial({ color: 0x0a3a66, transparent: true, opacity: .28, depthWrite: false })));
  const halo = new T.Mesh(new T.SphereGeometry(R * 1.08, 32, 16), new T.MeshBasicMaterial({ color: 0x2aa8ff, transparent: true, opacity: .08, blending: T.AdditiveBlending, depthWrite: false, side: T.BackSide })); sph0.add(halo);
  const pins = new T.Group(); sph0.add(pins); W.dyn.globePins = pins;
  const lr = mesh(office, new T.TorusGeometry(2.6, .025, 8, 96), M_LED, cx, H - .3, cz, { recv: false }); lr.rotation.x = PI / 2;
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; box(office, .004, .3, .004, M_DARK, cx + Math.cos(a) * 2.6, H - .15, cz + Math.sin(a) * 2.6, { recv: false }); }
  if (!RM) W.anim.push((t, dt) => { sph0.rotation.y += (dt || .016) * .18; halo.material.opacity = .07 + Math.sin(t * 1.7) * .02; disc.material.opacity = .3 + Math.sin(t * 2.3) * .06; });
  obs(cx - .62, cz - .62, cx + .62, cz + .62);
  addPick({ x: cx, y: 1.2, z: cz, w: 1.3, h: 2, d: 1.3, label: 'Team globe: where everyone is right now', ax: cx, az: cz + 1.2, act: () => actions.panel('people'), near: 2.6 });
  W.places.push({ name: 'Team globe', x: cx, z: cz + 1.4 });
}
const PIN_M = [new T.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false }), new T.MeshBasicMaterial({ color: 0x5dffa8, toneMapped: false })];
function setGlobePins(list) {          // [{tz, here}] from the people in the office
  const pins = W.dyn.globePins; if (!pins) return; const key = list.map(p => p.tz + (p.here ? 1 : 0)).sort().join('|'); if (pins.userData.key === key) return; pins.userData.key = key;
  while (pins.children.length) pins.remove(pins.children[0]); const seen = new Map();
  for (const p of list) { const ll = tzLatLon(p.tz); if (!ll) continue; const k = ll.join(','); seen.set(k, { ll, n: (seen.get(k) || { n: 0 }).n + 1, here: (seen.get(k) || {}).here || p.here }); }
  for (const { ll, n, here } of seen.values()) { const base = llVec(ll[0], ll[1], .44), tip = llVec(ll[0], ll[1], .5 + Math.min(n, 6) * .015);
    const lg = new T.BufferGeometry().setFromPoints([base, tip]); pins.add(new T.Line(lg, new T.LineBasicMaterial({ color: here ? 0x5dffa8 : 0xffd36b }))); const s = new T.Mesh(geo('pinS', () => new T.SphereGeometry(.012, 8, 6)), PIN_M[here ? 1 : 0]); s.position.copy(tip); pins.add(s); }
}

/* ---------- lobby: lifts with floor displays, terrazzo, holographic welcome ---------- */
function buildLobby() {
  const n = W.ext.n, stone = mat(0x3a3e45, { roughness: .4 });
  const inl = mesh(office, new T.PlaneGeometry(4, 7), new T.MeshStandardMaterial({ map: (() => { const t = TEX_TERRAZZO(); t.repeat.set(1.6, 2.8); return t; })(), roughness: .28, envMapIntensity: .9 }), 12, .003, 3.5); inl.rotation.x = -PI / 2;
  box(office, 4, .004, .05, mat(0xc9a14a, { metalness: .8, roughness: .3 }), 12, .004, 7);
  box(n, 3.9, H, .04, mat(0x2a2d33, { roughness: .35, metalness: .1 }), 12, H / 2, .02); box(n, 3.9, .02, .05, M_LED, 12, H - .12, .045); box(n, 3.9, .02, .05, M_LED, 12, .03, .045);
  W.dyn.lift = []; for (const lx of [11.05, 12.95]) {
    rbox(n, 1.5, 2.75, .14, .02, stone, lx, 1.375, .03); const lfd = mat(0x8f857a, { metalness: .9, roughness: .38 }); rbox(n, .6, 2.35, .05, .006, lfd, lx - .301, 1.175, .1); rbox(n, .6, 2.35, .05, .006, lfd, lx + .301, 1.175, .1);
    box(n, .006, 2.35, .07, M_BLACKM, lx, 1.175, .101); const ds = dynTex(256, 96); W.dyn.lift.push(ds); const sgn = wallSign(ds, .5, .19, lx, 2.56, .102, 0); office.remove(sgn); n.add(sgn);
  }
  for (const [i, d] of W.dyn.lift.entries()) d.draw((c, w, h) => { c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb347'; c.font = '700 64px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((i ? '▼ ' : '▲ ') + '32', w / 2, h / 2 + 3); });
  rbox(n, .12, .3, .03, .01, M_ALU, 12, 1.15, .11); for (const y of [1.21, 1.09]) cyl(n, .022, .022, .01, M_LED, 12, y, .13, { seg: 12 }).rotation.x = PI / 2;
  /* holographic welcome on the floor of the lobby */
  const hx = 10.75, hz = 5.85, hg = new T.Group(); hg.position.set(hx, 0, hz); office.add(hg);
  cyl(hg, .42, .46, .06, M_BLACKM, 0, .03, 0, { seg: 32 }); const rg = mesh(hg, new T.TorusGeometry(.36, .01, 6, 48), M_HOLO, 0, .065, 0); rg.rotation.x = PI / 2;
  mesh(hg, new T.CylinderGeometry(.5, .34, 1.9, 32, 1, true), M_BEAM, 0, 1.0, 0);
  const ht = dynTex(512, 512); W.dyn.holo = ht; const hm = new T.MeshBasicMaterial({ map: ht.tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const card = new T.Mesh(new T.PlaneGeometry(.9, .9), hm); card.position.y = 1.45; card.userData.dyn = true; hg.add(card); W.dyn.holoCard = card;
  drawHolo(); obs(hx - .45, hz - .45, hx + .45, hz + .45);
  if (!RM) W.anim.push(t => { card.rotation.y = t * .6; card.position.y = 1.45 + Math.sin(t * 1.3) * .03; hm.opacity = .85 + Math.sin(t * 9) * .05 * (Math.sin(t * .7) > .95 ? 1 : 0); });
  addPick({ x: hx, y: 1.2, z: hz, w: .9, h: 1.8, d: .9, label: 'Welcome: how this office works', ax: hx + .9, az: hz - .6, act: () => actions.panel('help'), near: 2.2 });
}
function drawHolo() {
  const d = W.dyn.holo; if (!d) return; const nm = (typeof conf !== 'undefined' && conf && conf.name) || 'StartDotCom HQ';
  d.draw((c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(127,227,255,.9)'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, 190, 120, 0, 7); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(w / 2, 190, 142, -.6, 1.9); c.stroke(); c.beginPath(); c.arc(w / 2, 190, 142, 2.5, 5); c.stroke();
    c.fillStyle = '#bff3ff'; c.font = '700 150px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm.trim().charAt(0).toUpperCase(), w / 2, 198);
    c.font = '700 44px ' + FONT_D; let t = nm; while (c.measureText(t).width > w - 30 && t.length > 4) t = t.slice(0, -2); c.fillText(t, w / 2, 380); c.font = '600 28px ' + FONT_B; c.fillStyle = 'rgba(191,243,255,.8)'; c.fillText('WELCOME · LEVEL 32 · LONDON', w / 2, 430);
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5); });
}

/* ---------- the rest of the tower, a facade with fins, a living wall and small real-world details ---------- */
function buildShell() {
  const L = W.L, xE = W.xE;
  for (let x = .8; x < L; x += 1.6) box(office, .05, H + .7, .42, M_ALU, x, H / 2 - .1, D + .32, { cast: 1 });
  box(office, L + .6, .55, .3, mat(0x1d232b, { roughness: .2, metalness: .6 }), L / 2, -.25, D + .2, { recv: false });
  const tex = sky.glassB.map.clone(), em = sky.glassB.emissiveMap.clone(); tex.needsUpdate = em.needsUpdate = true; tex.repeat.set(L / 3.2, 60 / 3.6); em.repeat.copy(tex.repeat); tex.wrapS = tex.wrapT = em.wrapS = em.wrapT = T.RepeatWrapping;
  const tm = new T.MeshStandardMaterial({ map: tex, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0, roughness: .3, metalness: .2 }); sky.tower = tm;
  const tw = mesh(office, new T.BoxGeometry(L + .6, -GROUND - .55, D + .6), tm, L / 2, (GROUND - .55) / 2, D / 2, { recv: false }); tw.userData.dyn = true;
  /* living wall on the east lounge */
  const gw = mat(0x23402a, { roughness: 1 }); box(W.ext.e, .1, 2.9, 4.8, gw, L - .05, 1.55, 20.2); const F = new Foliage(), C = V3(L + 1, 1.5, 20.2);
  for (let i = 0; i < 520; i++) { const b = V3(L - .1, .2 + rnd() * 2.8, 17.9 + rnd() * 4.6); F.leaf(b, V3(-1, rnd() - .3, (rnd() - .5) * 1.4), .14 + rnd() * .1, .1 + rnd() * .05, rnd() > .25 ? 0 : 2, C, rnd() * 3); }
  const lw = F.build(office); office.remove(lw); W.ext.e.add(lw);
  /* art in every private office, exit signs, lockers */
  const pal = [['#2456ff', '#ffb627', '#f4efe6'], ['#1f9d6b', '#e0457b', '#f2ede4'], ['#b04cff', '#0fa3b1', '#efeae1'], ['#ff7a45', '#14202e', '#f1ece3'], ['#e6a100', '#2456ff', '#f3eee5']];
  for (let b = 0; b < W.bays; b++) for (let k = 0; k < 2; k++) { const i = b * 2 + k, x0 = HANG + b * BAY + k * 3.2, P = pal[i % pal.length], d = dynTex(384, 256);
    d.draw((c, w, h) => { c.fillStyle = P[2]; c.fillRect(0, 0, w, h); seed = 50 + i; for (let q = 0; q < 7; q++) { c.fillStyle = P[q % 2]; c.globalAlpha = .55 + rnd() * .4; c.beginPath(); c.arc(rnd() * w, rnd() * h, 20 + rnd() * 90, 0, 7); c.fill(); } c.globalAlpha = 1; c.strokeStyle = '#14202e'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, h * .7); c.bezierCurveTo(w * .3, h * .2, w * .6, h * .9, w - 20, h * .3); c.stroke(); seed = 11; });
    rbox(W.ext.n, 1.16, .8, .04, .01, M_BLACKM, x0 + 2.0, 1.75, .02); const a = wallSign(d, 1.08, .72, x0 + 2.0, 1.75, .045, 0); office.remove(a); W.ext.n.add(a); }
  const exitT = dynTex(256, 96); exitT.draw((c, w, h) => { c.fillStyle = '#0d8a3f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 54px ' + FONT_B; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT  ➜', w / 2, h / 2 + 2); });
  const em2 = new T.MeshBasicMaterial({ map: exitT.tex }); for (const [x, z, ry] of [[L - .06, 23.0, -PI / 2], [.06, 16.2, PI / 2]]) { const s = mesh(office, geo('exitp', () => new T.PlaneGeometry(.4, .15)), em2, x, 2.7, z, { recv: false }); s.rotation.y = ry; }
  const lk = [mat(0x2f4b63, { roughness: .5 }), mat(0x3a5a74, { roughness: .5 })]; for (let i = 0; i < 4; i++) { rbox(office, .45, 1.9, .34, .01, lk[i % 2], .23, .95, 10.85 + i * .35, { cast: 1 }); box(office, .02, .12, .02, M_ALU, .46, 1.1, 10.85 + i * .35 + .1); } obs(0, 10.66, .47, 12.06);
}

/* ---------- static batching: everything that never moves is merged by material ---------- */
function mergeStatic(root, keep) {
  root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), m4 = new T.Matrix4(), nm = new T.Matrix3();
  (function walk(o) { for (const c of o.children) { if (keep.has(c) || (c.userData && c.userData.dyn)) continue;
    if (c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && c.visible && !c.children.length && !Array.isArray(c.material) && c.material !== M_PICK && !c.customDepthMaterial && c.geometry && c.geometry.attributes.position && c.geometry.attributes.normal) {
      const k = c.material.uuid + (c.castShadow ? 'c' : '') + (c.receiveShadow ? 'r' : ''); let b = buckets.get(k); if (!b) buckets.set(k, b = { m: c.material, cast: c.castShadow, recv: c.receiveShadow, list: [], ro: 0 }); b.list.push(c); b.ro = Math.max(b.ro, c.renderOrder || 0); }
    else if (c.children.length) walk(c); } })(root);
  let merged = 0;
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue; let nv = 0; for (const c of b.list) nv += c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count;
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2); let o = 0; const v = new T.Vector3();
    for (const c of b.list) { m4.multiplyMatrices(inv, c.matrixWorld); nm.getNormalMatrix(m4); const g = c.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ix = g.index, n = ix ? ix.count : pa.count;
      for (let i = 0; i < n; i++) { const j = ix ? ix.getX(i) : i; v.fromBufferAttribute(pa, j).applyMatrix4(m4); P[o * 3] = v.x; P[o * 3 + 1] = v.y; P[o * 3 + 2] = v.z; v.fromBufferAttribute(na, j).applyMatrix3(nm).normalize(); N[o * 3] = v.x; N[o * 3 + 1] = v.y; N[o * 3 + 2] = v.z; if (ua) { U[o * 2] = ua.getX(j); U[o * 2 + 1] = ua.getY(j); } o++; }
      if (m4.determinant() < 0) for (let q = o - n; q < o; q += 3) for (let a = 0; a < 3; a++) { const t1 = P[q * 3 + a]; P[q * 3 + a] = P[(q + 1) * 3 + a]; P[(q + 1) * 3 + a] = t1; const t2 = N[q * 3 + a]; N[q * 3 + a] = N[(q + 1) * 3 + a]; N[(q + 1) * 3 + a] = t2; if (a < 2) { const t3 = U[q * 2 + a]; U[q * 2 + a] = U[(q + 1) * 2 + a]; U[(q + 1) * 2 + a] = t3; } }
      c.parent.remove(c); merged++; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('uv', new T.BufferAttribute(U, 2)); g.computeBoundingSphere();
    const me = new T.Mesh(g, b.m); me.castShadow = b.cast; me.receiveShadow = b.recv; me.renderOrder = b.ro; me.userData.batch = true; root.add(me);
  }
  return merged;
}
function batchOffice() {
  const keep = new Set(), add = o => { if (!o) return; if (o.isObject3D) keep.add(o); else if (Array.isArray(o)) o.forEach(add); else if (typeof o === 'object' && !o.tex) Object.values(o).forEach(v => v && (v.isObject3D || Array.isArray(v) || (typeof v === 'object' && !v.tex && !v.isMaterial && !v.isTexture)) && add(v)); };
  for (const k in W.dyn) if (k !== 'lights') add(W.dyn[k]);
  for (const d of W.desks) { keep.add(d.scr); keep.add(d.item); } for (const r of W.rooms || []) { if (r.leaf) keep.add(r.leaf); if (r.screenMesh) keep.add(r.screenMesh); }
  const ext = [W.ext.n, W.ext.w, W.ext.e, W.ext.ceil]; ext.forEach(e => e && keep.add(e));
  const n = mergeStatic(office, keep); for (const e of ext) if (e) mergeStatic(e, keep);
  return n;
}

/* ---------- DOT, the robot concierge: glides a fixed round of the office (the same for everyone, timed off the clock), turns to you and tells you what needs your attention ---------- */
function buildRobot() {
  const g = new T.Group(); g.userData.dyn = true; office.add(g); W.dyn.robot = g; g.position.set(12, 0, 8.4);
  const shell = mat(0xf4f6f8, { roughness: .28, metalness: .05 }), dark = mat(0x0c1118, { roughness: .08, metalness: .6 }), eyeM = new T.MeshBasicMaterial({ color: 0x66e0ff, toneMapped: false }), ringM = new T.MeshBasicMaterial({ color: 0x2f7bff, toneMapped: false });
  const body = new T.Group(); g.add(body);
  mesh(body, new T.LatheGeometry([[0, .06], [.2, .06], [.25, .1], [.26, .3], [.22, .62], [.17, .8], [.12, .86], [0, .87]].map(q => new T.Vector2(q[0], q[1])), 32), shell, 0, 0, 0, { cast: 1 });
  cyl(body, .24, .26, .05, dark, 0, .04, 0, { seg: 32 }); const ring = mesh(body, new T.TorusGeometry(.262, .012, 8, 48), ringM, 0, .1, 0, { recv: false }); ring.rotation.x = PI / 2;
  const head = new T.Group(); head.position.y = 1.0; body.add(head);
  mesh(head, new T.SphereGeometry(.2, 32, 20), shell, 0, 0, 0, { cast: 1 }).scale.set(1.12, .86, 1); const visor = mesh(head, new T.SphereGeometry(.185, 32, 16, PI / 2 - 1.0, 2.0, 1.02, 0.9), dark, 0, 0, .03, { recv: false }); visor.scale.set(1.12, .86, 1);
  const eyes = [-.065, .065].map(x => { const e = mesh(head, new T.SphereGeometry(.02, 12, 8), eyeM, x, .015, .208, { recv: false }); e.scale.set(.8, 1.5, .5); e.userData.sy = 1.5; return e; });
  cyl(head, .008, .008, .12, shell, .1, .2, -.04, { seg: 8 }); const tip = sph(head, .018, ringM, .1, .27, -.04, { seg: 10, recv: false });
  cyl(body, .05, .07, .1, dark, 0, .9, 0, { seg: 16 });
  for (const sx of [-1, 1]) { const arm = rbox(body, .05, .34, .07, .02, shell, sx * .27, .58, 0, { cast: 1 }); arm.rotation.z = sx * .12; }
  const tray = rbox(body, .3, .02, .2, .008, dark, 0, .62, .27); const sc = dynTex(256, 128), scr = mesh(body, new T.PlaneGeometry(.2, .1), new T.MeshBasicMaterial({ map: sc.tex, toneMapped: false }), 0, .47, .236, { recv: false }); scr.rotation.x = -.18;
  sc.draw((c, w, h) => { c.fillStyle = '#06101c'; c.fillRect(0, 0, w, h); c.fillStyle = '#66e0ff'; c.font = '700 54px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DOT', w / 2, h / 2 - 8); c.font = '600 22px ' + FONT_B; c.fillText('concierge', w / 2, h / 2 + 34); });
  blobAt(g);
  const bub = dynTex(640, 220), bm = new T.SpriteMaterial({ map: bub.tex, transparent: true, depthWrite: false }), bs = new T.Sprite(bm); bs.scale.set(1.15, .4, 1); bs.position.y = 1.56; bs.visible = false; g.add(bs);
  const say = text => { bub.draw((c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(12,20,34,.92)'; rr(c, 8, 8, w - 16, h - 50, 34); c.fill(); c.beginPath(); c.moveTo(w / 2 - 22, h - 44); c.lineTo(w / 2, h - 8); c.lineTo(w / 2 + 22, h - 44); c.fill();
    c.fillStyle = '#eaf6ff'; c.font = '600 32px ' + FONT_B; c.textAlign = 'center'; c.textBaseline = 'middle'; const words = String(text).split(' '), lines = ['']; for (const wd of words) { if (c.measureText(lines[lines.length - 1] + ' ' + wd).width > w - 70) lines.push(wd); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + wd; }
    const ls = lines.slice(0, 3), y0 = (h - 42) / 2 + 8 - (ls.length - 1) * 20; ls.forEach((l, i) => c.fillText(l, w / 2, y0 + i * 40)); }); };
  const pick = addPick({ x: 12, y: .8, z: 8.4, w: .7, h: 1.5, d: .7, label: 'DOT, the concierge: what needs me?', ax: 12, az: 9.3, act: () => { if (typeof work === 'function') robotBrief(true); }, near: 2.4 }); pick.mesh.userData.dyn = true;
  let route = null, lastLine = '', lineT = 0, yaw = 0;
  const stops = [[12, 8.4], [HANG + 3.4, 9.4], [W.xE - 2, 9.4], [W.xE + 6, 9.2], [W.xE + 7.2, 15.2], [W.xE - 1.5, 19.6], [HANG + 6, 20.4], [8.4, 19.4], [6.4, 9.2]];
  const mkRoute = () => { const segs = []; let T0 = 0; for (let i = 0; i < stops.length; i++) { const a = stops[i], b = stops[(i + 1) % stops.length]; let pts; try { pts = [nearestFree(a[0], a[1])].concat(findPath(a[0], a[1], b[0], b[1])); } catch (e) { pts = [{ x: a[0], z: a[1] }, { x: b[0], z: b[1] }]; }
      for (let k = 0; k < pts.length - 1; k++) { const L = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z); if (L < .01) continue; segs.push({ t0: T0, t1: T0 + L / .85, a: pts[k], b: pts[k + 1] }); T0 += L / .85; } const end = pts[pts.length - 1]; segs.push({ t0: T0, t1: T0 + 9, a: end, b: end }); T0 += 9; } return { segs, T: T0 }; };
  W.anim.push((t, dt) => {
    if (!route) { if (typeof grid === 'undefined' || !grid) return; route = mkRoute(); }
    const ph = (Date.now() / 1000) % route.T; let sg = route.segs[0]; for (const s0 of route.segs) if (ph >= s0.t0 && ph < s0.t1) { sg = s0; break; }
    const f = sg.t1 > sg.t0 ? (ph - sg.t0) / (sg.t1 - sg.t0) : 0, x = lerp(sg.a.x, sg.b.x, f), z = lerp(sg.a.z, sg.b.z, f), moving = sg.a !== sg.b;
    let near = false, mx = 0, mz = 0; try { mx = me.pos.x; mz = me.pos.z; near = Math.hypot(mx - x, mz - z) < 2.6 && !me.out; } catch (e) { }
    g.position.set(x, 0, z); const want = near ? Math.atan2(mx - x, mz - z) : moving ? Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z) : yaw; let dy = want - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, (dt || .016) * 5); g.rotation.y = yaw;
    body.position.y = .03 + Math.sin(t * 2.2) * .012; head.rotation.y = Math.sin(t * .7) * .18 * (near ? .2 : 1); head.rotation.x = near ? -.12 : Math.sin(t * .9) * .04; const blink = (t % 4.2) < .12 ? .1 : 1; eyes.forEach(e => e.scale.set(.8, 1.5 * blink, .5)); tip.scale.setScalar(1 + Math.sin(t * 5) * .2); ring.rotation.z = t * .8;
    pick.x = x + Math.sin(yaw) * .9; pick.z = z + Math.cos(yaw) * .9; pick.mesh.position.set(x, .8, z);
    if (near) { if (t - lineT > 6) { lineT = t; let line = 'Hello! I am DOT.'; try { line = robotBrief(false); } catch (e) { } if (line !== lastLine) { lastLine = line; say(line); } } bs.visible = true; } else { bs.visible = false; lineT = 0; }
  });
}
function blobAt(g) { try { const b = new T.Mesh(geo('blobq', () => new T.PlaneGeometry(1, 1)), BLOB()); b.rotation.x = -PI / 2; b.position.y = .012; b.scale.set(.9, .9, 1); b.renderOrder = 1; g.add(b); } catch (e) { } }
function robotBrief(open) {
  const bits = []; let u = 0, evs = [], tk = 0;
  try { u = mailUnread(); evs = nextEvents(4 * 3600000); tk = allUnread(); } catch (e) { }
  if (typeof conf !== 'undefined' && conf && conf.notice) bits.push('Continuity mode is on. Work from here: Mail, Talk and calls all run in-house.');
  if (evs.length) { const e = evs[0][1], m = Math.round((e.s - Date.now()) / 60000); bits.push((m <= 0 ? 'Now: ' : 'In ' + (m < 60 ? m + ' min: ' : Math.round(m / 60) + ' h: ')) + str(e.title, 40) + ', ' + str(e.where, 30) + '.'); }
  if (u) bits.push('You have ' + u + ' unread mail' + (u > 1 ? 's' : '') + '.'); if (tk) bits.push(tk + ' unread in Talk.');
  if (!bits.length) bits.push(['All clear. Nothing needs you right now.', 'Tip: hold T to speak to people near you.', 'Tip: Ctrl+K opens Talk, Ctrl+J opens Workspace.', 'Tip: click anyone to call, mail or meet them.'][Math.floor(Date.now() / 15000) % 4]);
  if (open) { if (u) { work(true, 'mail'); } else if (evs.length) { work(true, 'cal'); } else if (tk) talk(true); else work(true, 'cont'); }
  return bits[Math.floor(Date.now() / 6000) % bits.length];
}

/* ---------- the live board: a hanging LED display over the workfloor entrance with world clocks, who is in, what is next and service status ---------- */
function buildLiveBoard() {
  const x = HANG + .9, z = 10.3, y = 2.42, d = dynTex(1536, 384); W.dyn.live = d;
  const m = new T.MeshBasicMaterial({ map: d.tex, toneMapped: false }), frame = rbox(office, .07, 1.0, 3.9, .02, M_BLACKM, x, y, z, { cast: 1 }); frame.userData.dyn = true;
  for (const [sx, ry] of [[-.037, -PI / 2], [.037, PI / 2]]) { const p = mesh(office, new T.PlaneGeometry(3.8, .95), m, x + sx, y, z, { recv: false }); p.rotation.y = ry; p.userData.dyn = true; }
  for (const dz of [-1.6, 1.6]) box(office, .012, H - y - .5, .012, M_DARK, x, (H + y + .5) / 2, z + dz, { recv: false });
  let last = 0; const zones = () => { const out = [['London', 'Europe/London']]; try { const seen = new Set(['Europe/London']); for (const r of allPeople()) if (r.tz && !seen.has(r.tz) && out.length < 4) { seen.add(r.tz); out.push([r.tz.split('/').pop().replace(/_/g, ' '), r.tz]); } } catch (e) { } for (const [n, tz] of [['Lagos', 'Africa/Lagos'], ['Dubai', 'Asia/Dubai'], ['New York', 'America/New_York']]) if (out.length < 4 && !out.some(o => o[1] === tz)) out.push([n, tz]); return out; };
  const draw = () => d.draw((c, w, h) => {
    const g0 = c.createLinearGradient(0, 0, w, 0); g0.addColorStop(0, '#050b14'); g0.addColorStop(1, '#0a1626'); c.fillStyle = g0; c.fillRect(0, 0, w, h); c.textBaseline = 'middle';
    let n = 1, next = null, notice = '', nm = 'StartDotCom HQ'; try { n = headcount(); const ev = nextEvents(24 * 3600000); next = ev.length ? ev[0][1] : null; notice = conf.notice || ''; nm = conf.name || nm; } catch (e) { }
    c.textAlign = 'left'; let cx = 40; for (const [name, tz] of zones()) { let tm = '--:--'; try { tm = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }); } catch (e) { } c.fillStyle = '#7fe3ff'; c.font = '700 74px ' + FONT_D; c.fillText(tm, cx, 96); c.fillStyle = 'rgba(210,235,255,.75)'; c.font = '600 28px ' + FONT_B; c.fillText(name.toUpperCase().slice(0, 12), cx + 4, 158); cx += 250; }
    c.fillStyle = 'rgba(127,227,255,.25)'; c.fillRect(cx + 6, 40, 3, 150); cx += 40; c.fillStyle = '#5dffa8'; c.font = '700 96px ' + FONT_D; c.fillText(String(n), cx, 100); const nw = c.measureText(String(n)).width; c.fillStyle = '#eaf6ff'; c.font = '600 34px ' + FONT_B; c.fillText('in the office', cx + nw + 18, 92); c.fillStyle = 'rgba(210,235,255,.75)'; c.font = '600 26px ' + FONT_B; c.fillText(nm.slice(0, 26), cx + nw + 18, 132);
    c.fillStyle = notice ? '#3a2a05' : 'rgba(127,227,255,.08)'; c.fillRect(0, 232, w, 152); c.font = '700 44px ' + FONT_B; c.fillStyle = notice ? '#ffd36b' : '#eaf6ff';
    let line = notice ? '⚠ ' + notice : next ? 'NEXT  ' + fmtHM(next.s) + '  ' + str(next.title, 46) + '  ·  ' + str(next.where, 28) : 'Mail ✓   Talk ✓   Calendar ✓   Documents ✓   Calls ✓     all running in-house';
    while (c.measureText(line).width > w - 80 && line.length > 10) line = line.slice(0, -2); c.fillText(line, 40, 308);
  });
  W.anim.push(t => { if (t - last > 5) { last = t; try { draw(); } catch (e) { } } }); draw();
}
