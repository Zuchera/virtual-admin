/* ============================ people: anatomical avatars ============================ */
const SKIN = ['#f6d7c3', '#ecc09f', '#d9a577', '#c68a5c', '#a86d43', '#8a5433', '#6b3f25', '#4a2a18'];
const HAIRC = ['#1b1512', '#3b2416', '#6a4526', '#a0703a', '#d9b36a', '#b33a1e', '#8c8c8c', '#ece8e1', '#2456ff', '#e0457b', '#1f9d6b', '#5a2d82'];
const TOPC = ['#f4f3ef', '#1d2433', '#2456ff', '#e0633a', '#1f9d6b', '#ffb627', '#b04cff', '#e0457b', '#5c7c8a', '#8d2b2b', '#c9b89a', '#0fa3b1'];
const BOTC = ['#1d2433', '#2f4a6d', '#4a4f57', '#7a6a55', '#c9b89a', '#3a2c2a', '#5b6b3a', '#8d2b2b'];
const EYEC = ['#3b2a1d', '#5a3b22', '#7a5a2b', '#2f6b4a', '#3d6fa8', '#6b7f8f'];
const HAIRS = ['Bald', 'Buzz cut', 'Short', 'Quiff', 'Afro', 'Long', 'Bob', 'Bun', 'Braids / locs', 'Ponytail', 'Hijab', 'Cap', 'Turban'];
const TOPS = ['T-shirt', 'Jumper', 'Hoodie', 'Blazer'], BOTS = ['Trousers', 'Skirt'], BUILDS = ['Slim', 'Medium', 'Broad'], FIGS = ['Straight', 'Curvy'];
const BEARDS = ['None', 'Stubble', 'Beard'], GLASSES = ['None', 'Round', 'Square'];
const STATUS = { available: ['#1f9d6b', 'Online'], idle: ['#e6a100', 'Idle'], meeting: ['#d6453d', 'Busy'], call: ['#d6453d', 'In a Teams call'], outlook: ['#d6453d', 'In a meeting (Outlook)'], focus: ['#7a4cff', 'Do not disturb'], break: ['#2f8fd8', 'On a break'], away: ['#9aa6b2', 'Away'], off: ['#9aa6b2', 'Offline'] };
const EMOJI = { wave: '👋', clap: '👏', laugh: '😂', thumbs: '👍', dance: '🎶', heart: '❤️', coffee: '☕', play: '🏓', bell: '🔔', nod: '🙂', gift: '🎁', hand: '✋' };
const EMO_DUR = { wave: 2.4, clap: 2.4, laugh: 2.6, thumbs: 2.2, dance: 5, heart: 2, coffee: 2.6, play: 0.5, bell: 2.2, nod: 1.6, gift: 2 };
const DEF_CFG = { skin: 3, build: 1, fig: 0, ht: 1, eye: 1, hair: 2, hairC: 0, beard: 0, glasses: 0, top: 1, topC: 2, bot: 0, botC: 0, lan: 1, m: '', tone: 0, otint: 0, htint: 0 };
function cleanCfg(c) {
  c = c && typeof c === 'object' ? c : {}; const n = (k, max) => { const v = Math.round(Number(c[k])); return Number.isFinite(v) ? clamp(v, 0, max) : DEF_CFG[k]; };
  const ht = Number(c.ht);
  return { skin: n('skin', SKIN.length - 1), build: n('build', 2), fig: n('fig', 1), ht: Number.isFinite(ht) ? clamp(ht, 0.88, 1.12) : 1, eye: n('eye', EYEC.length - 1), hair: n('hair', HAIRS.length - 1), hairC: n('hairC', HAIRC.length - 1), beard: n('beard', 2), glasses: n('glasses', 2), top: n('top', 3), topC: n('topC', TOPC.length - 1), bot: n('bot', 1), botC: n('botC', BOTC.length - 1), lan: n('lan', 1), tone: n('tone', 7), otint: n('otint', 8), htint: n('htint', 8), m: typeof c.m === 'string' && /^[fm]([1-9]|10)$/.test(c.m) ? c.m : (n('fig', 1) ? 'f' : 'm') + (1 + (n('skin', 7) + n('hair', 12)) % 10) };
}
const TONE_SW = ['#d9b08c', '#c68e63', '#a8704a', '#8a5a3c', '#6f4630', '#573625', '#43281c', '#2f1b13'], TONE_MUL = [[1, 1, 1], [.9, .85, .8], [.8, .72, .66], [.68, .58, .52], [.58, .47, .42], [.48, .38, .34], [.4, .31, .28], [.33, .26, .24]];
const TINT_SW = ['#ffffff', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#2c3e50'], HAIR_T = [[1, 1, 1], [.18, .13, .1], [.35, .22, .12], [.55, .38, .2], [.78, .62, .36], [.5, .2, .12], [.55, .55, .58], [.85, .85, .88], [.3, .2, .45]];
function randomCfg() { const r = n => Math.floor(Math.random() * n); const fig = r(2); return { m: (fig ? 'f' : 'm') + (1 + r(10)), skin: r(8), build: r(3), fig, ht: 0.94 + Math.random() * 0.12, eye: r(6), hair: fig ? [5, 6, 7, 8, 9, 10, 4][r(7)] : [0, 1, 2, 3, 4, 8, 11, 12][r(8)], hairC: r(7), beard: !fig && Math.random() > .6 ? 1 + r(2) : 0, glasses: Math.random() > .7 ? 1 + r(2) : 0, top: r(4), topC: r(TOPC.length), bot: fig && Math.random() > .55 ? 1 : 0, botC: r(BOTC.length), lan: 1 }; }
const initials = n => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); };
const validFace = f => typeof f === 'string' && f.length < 90000 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(f);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- geometry builders (cached; shared by every avatar) ---------- */
function mergeGeos(list) {                  // [[geometry, matrix4]] -> one non-indexed geometry
  const parts = list.map(([g, m]) => { const n = g.index ? g.toNonIndexed() : g.clone(); if (m) n.applyMatrix4(m); return n; });
  const count = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2); let o = 0;
  for (const g of parts) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); return out;
}
const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx || 1, sy || 1, sz || 1));
/* a limb segment hanging from its joint at y=0 down to y=-len, with rounded ends and a little muscle swell */
function limbGeo(rt, rb, len, swell) {
  return geo('limb' + rt + '_' + rb + '_' + len + '_' + swell, () => {
    const p = [];
    for (let i = 0; i <= 5; i++) { const a = -PI / 2 + i * (PI / 2) / 5; p.push(new T.Vector2(rb * Math.cos(a) + 1e-4, -len + rb * Math.sin(a))); }
    p.push(new T.Vector2(lerp(rb, rt, .55) * (1 + (swell || 0)), -len * 0.52));
    for (let i = 0; i <= 5; i++) { const a = i * (PI / 2) / 5; p.push(new T.Vector2(rt * Math.cos(a) + 1e-4, rt * Math.sin(a))); }
    const g = new T.LatheGeometry(p, 16); g.computeVertexNormals(); return g;
  });
}
/* torso from pelvis (y=0 at hip joints) to the base of the neck, with chest, waist and hips */
function torsoGeo(bw, fig, part) {
  return geo('torso' + bw + '_' + fig + '_' + part, () => {
    const prof = [[-0.13, .11, .085], [-0.09, .158, .105], [-0.02, .176 + fig * .022, .118 + fig * .01], [0.08, .166 + fig * .01, .112], [0.2, .14 - fig * .012, .1], [0.31, .155, .112], [0.4, .178, .128 + fig * .016], [0.48, .19, .122], [0.55, .196, .1], [0.6, .14, .078], [0.635, .062, .056]];
    const y0 = part === 'low' ? -0.135 : 0.1, y1 = part === 'low' ? 0.17 : 0.64, ys = [];
    for (let i = 0; i <= 22; i++) ys.push(lerp(y0, y1, i / 22));
    const pts = [new T.Vector2(1e-4, y0 - 0.001)].concat(ys.map(y => new T.Vector2(1, y))).concat([new T.Vector2(1e-4, y1 + 0.001)]);
    const g = new T.LatheGeometry(pts, 28), pa = g.attributes.position;
    const at = (y, k) => { if (y <= prof[0][0]) return prof[0][k]; for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const a = prof[i - 1], b = prof[i], t = (y - a[0]) / (b[0] - a[0]); return lerp(a[k], b[k], smooth(0, 1, t)); } return prof[prof.length - 1][k]; };
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), r = Math.hypot(x, z); if (r < 1e-3) { pa.setXYZ(i, 0, y, 0); continue; }
      const nx = x / r, nz = z / r; let W = at(y, 1) * bw, Dp = at(y, 2);
      if (nz > 0) Dp *= 1 + 0.16 * Math.exp(-((y - 0.4) ** 2) / 0.006) * (fig ? 1.4 : 0.55) * Math.pow(Math.abs(nx) < 0.75 ? 1 : 0.6, 1);   // chest
      if (nz < 0) Dp *= 1 + 0.12 * Math.exp(-((y + 0.04) ** 2) / 0.004) * (fig ? 1.3 : 0.6);   // seat
      if (nz < -0.3) Dp *= 1 - 0.06 * Math.exp(-((y - 0.22) ** 2) / 0.008);   // small of the back
      pa.setXYZ(i, nx * W, y, nz * Dp);
    }
    g.computeVertexNormals(); return g;
  });
}
/* a right hand, hanging, fingers relaxed and gently curled; the left is a mirror */
function handGeo() {
  return geo('hand', () => {
    const L = [], cap = (r, len) => new T.CylinderGeometry(r * 0.92, r, len, 7, 1);
    L.push([new T.SphereGeometry(1, 12, 9), M4(0, -0.045, 0.004, 0, 0, 0, 0.019, 0.047, 0.04)]);
    const fz = [0.026, 0.009, -0.008, -0.024], fl = [0.034, 0.038, 0.036, 0.028];
    fz.forEach((z, i) => { const r = i === 3 ? 0.0068 : 0.0078, l = fl[i]; L.push([cap(r, l), M4(-0.004, -0.09 - l / 2 + 0.006, z, 0, 0, 0.18)]); L.push([cap(r * 0.9, l * 0.8), M4(-0.011, -0.09 - l - l * 0.32, z, 0, 0, 0.55)]); L.push([new T.SphereGeometry(r * 0.88, 7, 5), M4(-0.016, -0.09 - l - l * 0.68, z)]); });
    L.push([cap(0.0095, 0.036), M4(-0.012, -0.03, 0.036, -0.65, 0, 0.45)]); L.push([new T.SphereGeometry(0.0088, 7, 5), M4(-0.022, -0.052, 0.054)]);
    const g = mergeGeos(L); g.computeVertexNormals(); return g;
  });
}
function shoeGeo() { return geo('shoe2', () => mergeGeos([[new T.SphereGeometry(1, 14, 10), M4(0, 0.008, 0.045, 0, 0, 0, 0.05, 0.042, 0.115)], [new T.CylinderGeometry(0.046, 0.05, 0.05, 12), M4(0, 0.018, -0.03)], [new T.BoxGeometry(0.104, 0.018, 0.27, 1, 1, 1), M4(0, -0.026, 0.032)]])); }
/* a sculpted head: jaw, cheekbones, brow, eye sockets, a fuller back of the skull */
function shapeHead(g, r, grow) {
  const pa = g.attributes.position, E = [[0.36, 0.13], [-0.36, 0.13]];
  for (let i = 0; i < pa.count; i++) {
    let x = pa.getX(i) / r, y = pa.getY(i) / r, z = pa.getZ(i) / r; const fz = Math.max(0, z);
    x *= 1 - 0.27 * smooth(-0.15, -0.95, y) - 0.05 * smooth(0.5, 1, y);
    if (z > 0) z += 0.1 * smooth(-0.5, -0.95, y) * fz + 0.05 * Math.exp(-((y - 0.3) ** 2) / 0.012) * Math.pow(fz, 3) * (1 - smooth(0.2, 0.55, Math.abs(x)));
    x *= 1 + 0.05 * Math.exp(-((y + 0.02) ** 2) / 0.02) * smooth(0.15, 0.6, z);
    for (const [ex, ey] of E) { const d2 = (x - ex) ** 2 + (y - ey) ** 2; if (z > 0.6) { const k = 0.09 * Math.exp(-d2 / 0.016); z -= k; } }
    if (z < 0) z *= 1.07 + 0.04 * smooth(-0.2, 0.5, y);
    y *= 1.17; const s = r * (grow || 1); pa.setXYZ(i, x * s, y * s, z * s * 1.03);
  }
  g.computeVertexNormals(); return g;
}
const headGeo = () => geo('head3', () => shapeHead(new T.SphereGeometry(0.115, 44, 32), 0.115));
const faceGeo = () => geo('face3', () => shapeHead(new T.SphereGeometry(0.115, 30, 24, PI / 2 - 1.0, 2.0, 0.6, 1.62), 0.115, 1.012));
function skinTex(c) {                     // pores, cheeks and a little warmth around the eyes and lips
  return MC['skinTex' + c] || (MC['skinTex' + c] = ctex(512, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h); const col = new T.Color(c), dark = col.getHSL({}).l < 0.35;
    for (let i = 0; i < 9000; i++) { x.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.035)' : 'rgba(60,20,10,.045)'; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    for (const u of [0.18, 0.32]) { const gr = x.createRadialGradient(u * w, 0.57 * h, 2, u * w, 0.57 * h, 34); gr.addColorStop(0, dark ? 'rgba(120,30,30,.16)' : 'rgba(220,90,90,.2)'); gr.addColorStop(1, 'rgba(220,90,90,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.06)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.08)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  }));
}
const FABRIC = () => MC.fabric || (MC.fabric = ctex(128, 128, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { x.fillStyle = y % 4 ? '#8a8a8a' : '#767676'; x.fillRect(0, y, w, 1); } for (let i = 0; i < 1600; i++) { x.fillStyle = Math.random() > .5 ? '#999' : '#6a6a6a'; x.fillRect(Math.random() * w, Math.random() * h, 1, 2); } }, 6, 6));
const HAIRTEX = () => MC.hairTex || (MC.hairTex = ctex(128, 128, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const v = 90 + Math.random() * 80 | 0; x.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.lineWidth = 1; const px = Math.random() * w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 4, h * .3, px - 4, h * .7, px + 2, h); x.stroke(); } }, 3, 2));
const skinMat = c => MC['skin3' + c] || (MC['skin3' + c] = new T.MeshPhysicalMaterial({ color: 0xffffff, map: skinTex(c), roughness: 0.52, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: 0.35 }));
const clothMat = (c, rough) => MC['cloth' + c + (rough || '')] || (MC['cloth' + c + (rough || '')] = new T.MeshStandardMaterial({ color: new T.Color(c).convertSRGBToLinear(), roughness: rough || 0.9, bumpMap: FABRIC(), bumpScale: 0.0018, envMapIntensity: 0.3 }));
const hairMat = c => MC['hair3' + c] || (MC['hair3' + c] = new T.MeshStandardMaterial({ color: new T.Color(c).convertSRGBToLinear(), roughness: 0.62, metalness: 0.04, bumpMap: HAIRTEX(), bumpScale: 0.003, envMapIntensity: 0.6 }));
const lipMat = c => MC['lip' + c] || (MC['lip' + c] = (() => { const col = new T.Color(c).lerp(new T.Color('#9c3b3b'), 0.38).multiplyScalar(0.86); return new T.MeshPhysicalMaterial({ color: col.convertSRGBToLinear(), roughness: 0.4, clearcoat: 0.3 }); })());
const BLOB = () => MC.blobMat || (MC.blobMat = new T.MeshBasicMaterial({ map: ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(0.55, 'rgba(0,0,0,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false }));

class ProcAvatar {
  constructor(cfg) {
    this.g = new T.Group(); this.body = new T.Group(); this.g.add(this.body);
    this.phase = Math.random() * 6; this.ph = Math.random() * 6; this.j = {}; this.cur = {}; this.faceKey = ''; this.faceImg = null; this.faceTex = null; this.blinkT = 1 + Math.random() * 3; this.blink = 0; this.task = ''; this.headset = false;
    const sh = new T.Mesh(geo('blobp', () => new T.PlaneGeometry(1, 1)), BLOB()); sh.rotation.x = -PI / 2; sh.position.y = 0.006; sh.scale.set(0.95, 0.75, 1); sh.renderOrder = 1; this.g.add(sh); this.shadow = sh;
    this.labelD = dynTex(640, 256);
    this.label = new T.Sprite(new T.SpriteMaterial({ map: this.labelD.tex, transparent: true, depthWrite: false })); this.g.add(this.label);
    this.bubD = dynTex(512, 224);
    this.bub = new T.Sprite(new T.SpriteMaterial({ map: this.bubD.tex, transparent: true, depthWrite: false })); this.bub.scale.set(1.9, 0.83, 1); this.bub.visible = false; this.g.add(this.bub);
    this.emoD = dynTex(128, 128);
    this.emo = new T.Sprite(new T.SpriteMaterial({ map: this.emoD.tex, transparent: true, depthWrite: false })); this.emo.scale.set(.5, .5, 1); this.emo.visible = false; this.g.add(this.emo);
    this.handD = dynTex(128, 128); this.handD.draw((c, w, h) => { c.fillStyle = '#ffb627'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.font = '72px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', 64, 70); });
    this.handIcon = new T.Sprite(new T.SpriteMaterial({ map: this.handD.tex, transparent: true, depthWrite: false })); this.handIcon.scale.set(.42, .42, 1); this.handIcon.visible = false; this.g.add(this.handIcon);
    this.bubT = 0; this.emoT = 9; this.labelKey = '';
    this.rebuild(cfg);
  }
  rebuild(cfg) {
    cfg = this.cfg = cleanCfg(cfg); const b = this.body; while (b.children.length) b.remove(b.children[0]);
    const skin = skinMat(SKIN[cfg.skin]), top = clothMat(TOPC[cfg.topC], cfg.top === 3 ? 0.7 : 0.92), bot = clothMat(BOTC[cfg.botC], 0.85), hairC = HAIRC[cfg.hairC], hair = hairMat(hairC), shoe = mat('#1d2026', { roughness: .35 }), dark = mat('#14181d', { roughness: .3 });
    const bw = [0.9, 1, 1.13][cfg.build], fig = cfg.fig, S = cfg.ht * 0.94, skirt = cfg.bot === 1, j = this.j = {}; this.feat = []; this.detail = [];
    b.scale.setScalar(S); this.S = S;
    const M = (p, g, m, x, y, z, o) => { const me = new T.Mesh(g, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = !(o && o.noShadow); if (o && o.s) me.scale.set(o.s[0], o.s[1], o.s[2]); if (o && o.r) me.rotation.set(o.r[0], o.r[1], o.r[2]); p.add(me); if (o && o.d) this.detail.push(me); return me; };
    const Sp = (p, r, m, x, y, z, o) => M(p, geo('as' + r, () => new T.SphereGeometry(r, 20, 14)), m, x, y, z, o);
    const grp = (p, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; };
    const legM = skirt ? skin : bot;
    // legs: hip, knee, ankle
    for (const [n, sx] of [['L', 1], ['R', -1]]) {
      const hip = j['hip' + n] = grp(b, sx * 0.088 * bw * (1 + fig * 0.08), 0.92, 0);
      M(hip, limbGeo(0.086 * bw * (1 + fig * 0.06), 0.058, 0.44, 0.06), legM).scale.z = 0.95;
      const knee = j['knee' + n] = grp(hip, 0, -0.44, 0);
      M(knee, limbGeo(0.058, 0.04, 0.41, 0.1), legM).scale.z = 0.92;
      if (skirt) M(knee, limbGeo(0.059, 0.041, 0.41, 0.1), clothMat('#2a211c', .6), 0, 0, 0, { noShadow: 1 }).visible = false;
      const ank = j['ank' + n] = grp(knee, 0, -0.41, 0);
      M(ank, shoeGeo(), shoe, 0, -0.03, 0.005);
      if (!skirt) M(ank, limbGeo(0.052, 0.05, 0.05, 0), bot, 0, 0.03, 0, { noShadow: 1 });   // trouser hem over the shoe
    }
    // torso
    const t = j.torso = grp(b, 0, 0.92, 0);
    M(t, torsoGeo(bw, fig, 'low'), bot);
    const chest = j.chest = grp(t, 0, 0, 0);
    M(chest, torsoGeo(bw, fig, 'up'), top);
    M(t, geo('belt', () => new T.TorusGeometry(1, 0.11, 6, 28)), mat('#2a211c', { roughness: .4 }), 0, 0.13, 0, { s: [0.143 * bw, 0.1 * bw, 0.1 + fig * 0], r: [PI / 2, 0, 0], noShadow: 1 }).scale.set(0.142 * bw * (1 - fig * .06), 0.1, 0.1);
    if (skirt) M(t, geo('skirt', () => new T.CylinderGeometry(0.17, 0.27, 0.46, 24, 1, true)), bot, 0, -0.17, 0, { s: [bw, 1, 0.8] });
    if (cfg.top === 2) { const hd = Sp(chest, 0.1, top, 0, 0.6, -0.11, { s: [1.3, 0.75, 0.75] }); for (const sx of [-1, 1]) M(chest, geo('cord', () => new T.CylinderGeometry(0.0035, 0.0035, 0.13, 5)), mat('#f4f3ef'), sx * 0.03, 0.5, 0.122, { d: 1, noShadow: 1 }); M(chest, geo('pouch', () => new T.BoxGeometry(0.2, 0.09, 0.012)), top, 0, 0.22, 0.106, { noShadow: 1 }); }
    if (cfg.top === 3) { M(chest, geo('shirt3', () => new T.BoxGeometry(0.075, 0.3, 0.02)), clothMat('#f7f7f5', .7), 0, 0.46, 0.112, { noShadow: 1 }); for (const sx of [-1, 1]) M(chest, geo('lapel3', () => new T.BoxGeometry(0.052, 0.27, 0.012)), top, sx * 0.05, 0.46, 0.118, { r: [-0.08, 0, sx * 0.22], noShadow: 1 }); for (let k = 0; k < 2; k++) Sp(chest, 0.006, dark, 0.05, 0.22 + k * 0.08, 0.116, { d: 1, noShadow: 1 }); }
    if (cfg.top === 1 || cfg.top === 3) M(chest, geo('collar3', () => new T.TorusGeometry(0.062, 0.014, 8, 20)), cfg.top === 3 ? clothMat('#f7f7f5', .7) : top, 0, 0.615, 0.006, { r: [PI / 2 - 0.25, 0, 0], noShadow: 1 });
    else M(chest, geo('crew', () => new T.TorusGeometry(0.058, 0.01, 6, 20)), top, 0, 0.622, 0.004, { r: [PI / 2 - 0.2, 0, 0], noShadow: 1 });
    if (cfg.lan) { M(chest, geo('lany', () => new T.TorusGeometry(0.11, 0.004, 4, 24, PI)), mat('#2456ff'), 0, 0.56, 0.035, { r: [-1.25, 0, PI], noShadow: 1, d: 1 }); M(chest, geo('card', () => new T.BoxGeometry(0.05, 0.07, 0.004)), mat('#ffffff'), 0, 0.37, 0.14, { r: [-0.15, 0, 0], d: 1, noShadow: 1 }); M(chest, geo('cardb', () => new T.BoxGeometry(0.05, 0.016, 0.005)), mat('#2456ff'), 0, 0.395, 0.141, { r: [-0.15, 0, 0], d: 1, noShadow: 1 }); }
    // arms: shoulder, elbow, wrist
    for (const [n, sx] of [['L', 1], ['R', -1]]) {
      const s = j['sh' + n] = grp(chest, sx * (0.185 * bw + 0.012), 0.55, 0);
      Sp(s, 0.054, top, 0, -0.012, 0, { s: [1, 0.9, 0.95] });
      M(s, limbGeo(0.056 * (1 + (bw - 1) * .8), 0.045, 0.28, 0.08), top);
      const e = j['el' + n] = grp(s, 0, -0.28, 0), fm = cfg.top === 0 ? skin : top;
      M(e, limbGeo(0.045, 0.033, 0.25, 0.1), fm);
      if (cfg.top !== 0) M(e, geo('cuff', () => new T.TorusGeometry(0.035, 0.008, 6, 16)), top, 0, -0.235, 0, { r: [PI / 2, 0, 0], noShadow: 1 });
      if (cfg.top === 0) M(s, geo('sleeve', () => new T.CylinderGeometry(0.058, 0.064, 0.16, 14, 1, true)), top, 0, -0.08, 0);
      const w = j['wr' + n] = grp(e, 0, -0.25, 0);
      const hm = M(w, handGeo(), skin, 0, 0.005, 0); hm.scale.set(sx > 0 ? -0.9 : 0.9, 0.9, 0.9);
      if (n === 'L') M(w, geo('watch', () => new T.TorusGeometry(0.034, 0.007, 6, 16)), dark, 0, 0.02, 0, { r: [PI / 2, 0, 0], d: 1, noShadow: 1 });
      if (n === 'R') { const mug = this.mug = new T.Group(); mug.position.set(-0.03, -0.08, 0.05); w.add(mug); M(mug, geo('mug3', () => new T.CylinderGeometry(0.038, 0.034, 0.09, 16)), mat('#ffffff', { roughness: .3 })); M(mug, geo('mugh', () => new T.TorusGeometry(0.022, 0.006, 6, 12)), mat('#ffffff', { roughness: .3 }), 0.04, 0, 0, { r: [0, 0, 0] }); mug.visible = false; }
    }
    // neck and head
    M(chest, limbGeo(0.047, 0.05, 0.1, 0), skin, 0, 0.7, -0.005);
    const h = j.head = grp(chest, 0, 0.78, 0.004); h.scale.setScalar(1.08);
    const head = M(h, headGeo(), skin, 0, 0, 0);
    const F = me => { this.feat.push(me); this.detail.push(me); return me; };
    const white = mat('#f6f4f0', { roughness: .2 }), iris = mat(EYEC[cfg.eye], { roughness: .25 }), lid = skin, browM = cfg.hair === 0 || cfg.hair >= 10 ? mat('#2a1d16', { roughness: 1 }) : hairMat(hairC);
    this.lids = []; this.eyes = [];
    for (const sx of [-1, 1]) {
      const eg = new T.Group(); eg.position.set(sx * 0.039, 0.016, 0.0965); h.add(eg); this.eyes.push(eg);
      F(Sp(eg, 0.0165, white, 0, 0, 0, { noShadow: 1 }));
      F(M(eg, geo('iris', () => new T.CircleGeometry(0.0089, 18)), iris, 0, 0, 0.0163, { noShadow: 1 }));
      F(M(eg, geo('pupil', () => new T.CircleGeometry(0.0038, 12)), dark, 0, 0, 0.0166, { noShadow: 1 }));
      F(M(eg, geo('glint', () => new T.CircleGeometry(0.0016, 6)), mat('#ffffff', { emissive: 0xffffff, emissiveIntensity: 1 }), 0.003, 0.003, 0.0168, { noShadow: 1 }));
      const ld = F(M(eg, geo('lid', () => new T.SphereGeometry(0.0178, 16, 8, 0, PI * 2, 0, PI * 0.5)), lid, 0, 0, 0, { noShadow: 1 })); ld.rotation.x = -0.62; this.lids.push(ld);
      F(M(eg, geo('lash', () => new T.TorusGeometry(0.0172, 0.0016, 4, 14, PI * 0.9)), dark, 0, 0.003, 0.004, { r: [0.9, 0, 0.16 * PI * 0], noShadow: 1 }));
      F(M(h, geo('brow3', () => new T.TorusGeometry(0.03, 0.0042, 5, 12, 1.25)), browM, sx * 0.04, 0.026, 0.104, { r: [0.25, 0, PI / 2 - 0.62], noShadow: 1 }));
      F(M(h, geo('ear', () => new T.SphereGeometry(1, 10, 8)), skin, sx * 0.111, 0.004, -0.008, { s: [0.012, 0.03, 0.022], noShadow: 1 }));
      F(M(h, geo('earr', () => new T.TorusGeometry(0.019, 0.005, 5, 10, PI * 1.25)), skin, sx * 0.113, 0.006, -0.006, { r: [0, sx * PI / 2, PI * 0.35], noShadow: 1 }));
      F(Sp(h, 0.008, skin, sx * 0.0115, -0.035, 0.103, { noShadow: 1 }));
    }
    F(M(h, geo('noseb', () => new T.SphereGeometry(1, 12, 10)), skin, 0, -0.008, 0.108, { s: [0.0105, 0.03, 0.013], r: [-0.32, 0, 0], noShadow: 1 }));
    F(Sp(h, 0.0125, skin, 0, -0.031, 0.112, { noShadow: 1 }));
    const lips = lipMat(SKIN[cfg.skin]);
    this.upLip = F(M(h, geo('lipu', () => new T.SphereGeometry(1, 14, 8)), lips, 0, -0.057, 0.101, { s: [0.021, 0.005, 0.008], noShadow: 1 }));
    this.mouth = F(M(h, geo('mouth3', () => new T.SphereGeometry(1, 12, 6)), mat('#3a1414', { roughness: .9 }), 0, -0.0625, 0.098, { s: [0.017, 0.0015, 0.006], noShadow: 1 }));
    this.loLip = F(M(h, geo('lipl', () => new T.SphereGeometry(1, 14, 8)), lips, 0, -0.068, 0.099, { s: [0.019, 0.0062, 0.009], noShadow: 1 }));
    this.faceMesh = new T.Mesh(faceGeo(), new T.MeshStandardMaterial({ transparent: true, roughness: .7, depthWrite: false })); this.faceMesh.renderOrder = 2; this.faceMesh.visible = false; h.add(this.faceMesh);
    // hair and headwear
    const cap = (r, th, m, y, z, rx) => { const me = new T.Mesh(new T.SphereGeometry(r, 26, 14, 0, PI * 2, 0, th), m); me.position.set(0, y == null ? 0.016 : y, z == null ? -0.014 : z); me.scale.set(1, 1.17, 1.08); me.rotation.x = rx == null ? -0.45 : rx; me.castShadow = true; h.add(me); return me; };
    const ring = (r, t0, tl, m, gap) => { const me = new T.Mesh(new T.SphereGeometry(r, 26, 10, PI / 2 + gap, PI * 2 - gap * 2, t0, tl), m); me.position.set(0, 0.01, -0.006); me.scale.set(1, 1.17, 1.08); me.castShadow = true; h.add(me); return me; };
    const hs = cfg.hair;
    if (hs === 1) cap(0.119, 1.25, new T.MeshStandardMaterial({ color: new T.Color(hairC).convertSRGBToLinear(), roughness: 1, transparent: true, opacity: 0.85 }));
    if (hs === 2) { cap(0.125, 1.32, hair); ring(0.123, 1.3, 0.5, hair, 1.25); }
    if (hs === 3) { cap(0.125, 1.3, hair); ring(0.123, 1.28, 0.45, hair, 1.25); Sp(h, 0.062, hair, 0.012, 0.13, 0.06, { s: [1.5, 0.75, 1.15] }); }
    if (hs === 4) { const a = Sp(h, 0.158, hair, 0, 0.09, -0.05, { s: [1.08, 1, 1] }); a.material = hair; }
    if (hs === 5) { cap(0.128, 1.35, hair); ring(0.128, 1.3, 1.05, hair, 1.0); M(h, geo('lh3', () => new T.CylinderGeometry(0.1, 0.075, 0.32, 16, 1, true, PI / 2 + 0.6, PI * 2 - 1.2)), hair, 0, -0.19, -0.04, { r: [0.12, PI, 0] }); }
    if (hs === 6) { cap(0.13, 1.36, hair); ring(0.13, 1.3, 0.98, hair, 0.95); }
    if (hs === 7) { cap(0.123, 1.3, hair); ring(0.122, 1.28, 0.5, hair, 1.25); Sp(h, 0.06, hair, 0, 0.138, -0.075); }
    if (hs === 8) { cap(0.125, 1.3, hair); for (let i = 0; i < 11; i++) { const a = (i - 5) * 0.3; M(h, limbGeo(0.0125, 0.01, 0.3, 0), hair, Math.sin(a) * 0.118, -0.02, -Math.cos(a) * 0.112 - 0.004, { noShadow: 1 }); } }
    if (hs === 9) { cap(0.124, 1.3, hair); ring(0.122, 1.28, 0.5, hair, 1.25); Sp(h, 0.046, hair, 0, -0.03, -0.155, { s: [0.8, 2.3, 0.8], r: [0.35, 0, 0] }); }
    if (hs === 10) { cap(0.135, 1.24, hair, 0.012); ring(0.135, 1.2, 1.4, hair, 0.7); M(chest, geo('drape', () => new T.CylinderGeometry(0.1, 0.22, 0.2, 24)), hair, 0, 0.66, -0.005, { s: [bw, 1, 0.8] }); }
    if (hs === 11) { cap(0.12, 1.45, mat('#1b1512', { roughness: 1 })); cap(0.128, 1.15, clothMat(hairC, .8), 0.02, null, 0); M(h, geo('brim3', () => new T.CylinderGeometry(0.08, 0.08, 0.008, 16, 1, false, -PI / 2, PI)), clothMat(hairC, .8), 0, 0.07, 0.11, { r: [0.12, 0, 0], s: [1, 1, 0.9] }); }
    if (hs === 12) { Sp(h, 0.142, clothMat(hairC, .9), 0, 0.085, -0.01, { s: [1.02, 0.74, 1.06] }); Sp(h, 0.05, clothMat(hairC, .9), 0, 0.165, 0.055, { s: [1.4, .8, 1] }); }
    if (cfg.beard) { const bm = cfg.beard === 1 ? new T.MeshStandardMaterial({ color: new T.Color('#1b1512').convertSRGBToLinear(), transparent: true, opacity: .3, roughness: 1 }) : (hs === 0 || hs > 9 ? hairMat('#1b1512') : hair);
      const be = F(new T.Mesh(shapeHead(new T.SphereGeometry(0.115, 24, 16, PI / 2 - 1.15, 2.3, 1.75, 1.0), 0.115, cfg.beard === 1 ? 1.006 : 1.045), bm)); h.add(be); be.castShadow = cfg.beard === 2; }
    if (cfg.glasses) { const gm = mat('#14181d', { roughness: .3, metalness: .3 }); for (const sx of [-1, 1]) { const gl = F(M(h, cfg.glasses === 1 ? geo('gr3', () => new T.TorusGeometry(0.025, 0.0033, 6, 20)) : geo('gs3', () => new T.TorusGeometry(0.028, 0.0035, 4, 4)), gm, sx * 0.04, 0.016, 0.112, { noShadow: 1 })); if (cfg.glasses === 2) gl.rotation.z = PI / 4; F(M(h, geo('ga3', () => new T.BoxGeometry(0.003, 0.003, 0.105)), gm, sx * 0.07, 0.02, 0.06, { noShadow: 1 })); F(M(h, geo('lens', () => new T.CircleGeometry(0.024, 14)), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, metalness: 0.2, clearcoat: 1 }), sx * 0.04, 0.016, 0.111, { noShadow: 1 })); } F(M(h, geo('gb3', () => new T.BoxGeometry(0.025, 0.003, 0.003)), gm, 0, 0.02, 0.114, { noShadow: 1 })); }
    // headset, shown during calls
    this.hs = new T.Group(); h.add(this.hs); M(this.hs, geo('hsband', () => new T.TorusGeometry(0.128, 0.006, 6, 24, PI)), dark, 0, 0.015, 0, { noShadow: 1 }); for (const sx of [-1, 1]) M(this.hs, geo('hscup', () => new T.CylinderGeometry(0.032, 0.032, 0.022, 14)), dark, sx * 0.124, 0.004, 0, { r: [0, 0, PI / 2], noShadow: 1 }); M(this.hs, geo('hsmic', () => new T.CylinderGeometry(0.003, 0.003, 0.1, 5)), dark, -0.11, -0.04, 0.05, { r: [0.9, 0, 0.3], noShadow: 1 }); this.hs.visible = this.headset;
    this.bub.position.y = 2.95 * S; this.cur = {}; this.applyFace();
  }
  setHeadset(on) { this.headset = !!on; if (this.hs) this.hs.visible = this.headset; }
  /* photo face: a small square JPEG the person uploaded, feathered into the skin tone */
  setFace(url) {
    url = validFace(url) ? url : ''; if (url === this.faceKey) return; this.faceKey = url; this.labelKey = '';
    if (!url) { this.faceImg = null; this.applyFace(); return; }
    const img = new Image(); img.onload = () => { if (this.faceKey !== url) return; this.faceImg = img; this.labelKey = ''; this.applyFace(); }; img.src = url;
  }
  applyFace() {
    const on = !!this.faceImg; if (!this.faceMesh) return; this.faceMesh.visible = on; for (const f of this.feat) f.visible = !on || f === this.upLip && false; if (this.lids) for (const l of this.lids) l.visible = !on;
    if (!on) return;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.drawImage(this.faceImg, 0, 0, 256, 256); x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(128, 128, 60, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.72, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.save(); x.translate(128, 128); x.scale(0.86, 1.06); x.translate(-128, -128); x.fillRect(-40, -40, 336, 336); x.restore();
    if (this.faceTex) this.faceTex.dispose(); const tex = this.faceTex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
    this.faceMesh.material = new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .65, depthWrite: false });
  }
  /* big badge: photo or initials in a status ring, name, status and role, and what they are working on */
  setLabel(name, status, sub, task) {
    const key = name + '|' + status + '|' + sub + '|' + task + '|' + (this.faceImg ? 1 : 0); if (key === this.labelKey) return; this.labelKey = key; const st = STATUS[status] || STATUS.available, img = this.faceImg;
    this.labelD.draw((c, w, h) => {
      c.clearRect(0, 0, w, h); c.font = '700 54px ' + FONT_B; let nm = name || 'Teammate'; while (c.measureText(nm).width > 400 && nm.length > 3) nm = nm.slice(0, -2);
      const tw = c.measureText(nm).width; c.font = '700 32px ' + FONT_B; const line2 = st[1] + (sub ? ' · ' + sub : ''), sw = Math.min(410, c.measureText(line2).width);
      const bwid = Math.min(w - 6, Math.max(tw, sw) + 214), x0 = (w - bwid) / 2, y0 = 6, hh = 172;
      c.fillStyle = 'rgba(16,26,40,.9)'; rr(c, x0, y0, bwid, hh, 86); c.fill();
      const cx = x0 + 86, cy = y0 + 86; c.fillStyle = st[0]; c.beginPath(); c.arc(cx, cy, 78, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, 64, 0, 7); c.clip(); if (img) c.drawImage(img, cx - 64, cy - 64, 128, 128); else { c.fillStyle = '#f4f6f9'; c.fillRect(cx - 64, cy - 64, 128, 128); c.fillStyle = '#14202e'; c.font = '700 60px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(initials(name), cx, cy + 4); } c.restore();
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = '700 54px ' + FONT_B; c.fillText(nm, x0 + 180, y0 + 62);
      c.fillStyle = st[0] === '#9aa6b2' ? '#c9d2dc' : st[0]; c.beginPath(); c.arc(x0 + 192, y0 + 122, 12, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '700 32px ' + FONT_B; c.fillText(line2, x0 + 214, y0 + 124, 410);
      if (task) { c.font = '700 30px ' + FONT_B; let tk = task; while (c.measureText(tk).width > w - 70 && tk.length > 4) tk = tk.slice(0, -2); const tw2 = c.measureText(tk).width + 44; c.fillStyle = 'rgba(255,255,255,.95)'; rr(c, (w - tw2) / 2, y0 + hh + 10, tw2, 56, 28); c.fill(); c.fillStyle = '#14202e'; c.textAlign = 'center'; c.fillText(tk, w / 2, y0 + hh + 39); c.textAlign = 'left'; }
    });
  }
  say(text) {
    this.bubD.draw((c, w, h) => {
      c.clearRect(0, 0, w, h); c.font = '600 34px ' + FONT_B; const lines = wrapText(c, String(text).slice(0, 140), w - 70, 4);
      const bh = lines.length * 42 + 36, bwid = Math.min(w - 8, Math.max(...lines.map(l => c.measureText(l).width)) + 60), x0 = (w - bwid) / 2, y0 = h - bh - 24;
      c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(20,32,46,.25)'; c.lineWidth = 3; rr(c, x0, y0, bwid, bh, 26); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(w / 2 - 14, y0 + bh - 1); c.lineTo(w / 2, y0 + bh + 20); c.lineTo(w / 2 + 14, y0 + bh - 1); c.closePath(); c.fill();
      c.fillStyle = '#14202e'; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, w / 2, y0 + 39 + i * 42)); c.textAlign = 'left';
    });
    this.bub.visible = true; this.bubT = 6;
  }
  popEmoji(ch) { this.emoD.draw((c, w, h) => { c.clearRect(0, 0, w, h); c.font = '92px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 8); }); this.emo.visible = true; this.emoT = 0; }
  /* s: {moving, seat, emote, emoteAge, mug, pose, hand, speaking, call, look:{x,z}, activity, hideLabel} */
  update(dt, t, s) {
    const j = this.j, S = this.S; let hipL = 0, hipR = 0, knL = 0.03, knR = 0.03, anL = 0, anR = 0, shL = 0.03, shR = 0.03, elL = -0.14, elR = -0.14, zL = 0.07, zR = -0.07, wrL = 0, wrR = 0, by = 0, bz = 0, tRx = 0, tRy = 0, tRz = 0, hRx = 0, hRy = 0, hRz = 0, spin = 0, jaw = 0;
    const dist = camera.position.distanceTo(this.g.position), near = dist < 15;
    if (s.moving) this.phase += dt * 8.6;
    if (s.seat) {
      const hi = s.seat.h > 0.7; hipL = hipR = hi ? -1.2 : -1.52; knL = knR = hi ? 1.35 : 1.5; anL = anR = hi ? -0.1 : 0; by = (s.seat.h + 0.07) - 0.92 * S; bz = -0.03;
      if (s.seat.kind === 'desk' && s.activity !== 'call') { shL = shR = -0.6; zL = 0.12; zR = -0.12; elL = -1.05 + Math.sin(t * 13 + this.ph) * 0.04; elR = -1.05 + Math.cos(t * 11 + this.ph) * 0.04; wrL = wrR = 0.25; hRx = 0.16; tRx = 0.06; if (s.activity === 'read') { elL = elR = -0.8; hRx = 0.22; } }
      else { shL = shR = -0.3; elL = elR = -0.9; zL = 0.18; zR = -0.18; if (s.seat.kind === 'sofa' || s.seat.kind === 'pouf') tRx = -0.14; hRy = Math.sin(t * 0.35 + this.ph) * 0.2; }
      if (s.call) { shR = -0.5; elR = -2.0; zR = -0.35; hRz = 0.05; }
    } else if (s.moving) {
      const sw = Math.sin(this.phase), cw = Math.cos(this.phase); hipL = sw * 0.5; hipR = -sw * 0.5; knL = Math.max(0, Math.sin(this.phase - 1.3)) * 0.9 + 0.05; knR = Math.max(0, Math.sin(this.phase - 1.3 + PI)) * 0.9 + 0.05; anL = -Math.max(0, -sw) * 0.25; anR = -Math.max(0, sw) * 0.25;
      shL = -sw * 0.42; shR = sw * 0.42; elL = -0.32 - Math.max(0, sw) * 0.3; elR = -0.32 - Math.max(0, -sw) * 0.3; by = Math.abs(cw) * 0.026 * S - 0.012; tRx = 0.04; tRy = sw * 0.07; tRz = cw * 0.025; hRy = -sw * 0.04;
    } else {     // idle: breathe, shift weight, glance about
      const sh = Math.sin(t * 0.33 + this.ph); by = Math.sin(t * 1.6 + this.ph) * 0.003; tRz = sh * 0.02; hipL = sh * 0.04; hipR = -sh * 0.02; knL = 0.03 + Math.max(0, -sh) * 0.08; knR = 0.03 + Math.max(0, sh) * 0.08; hRy = Math.sin(t * 0.4 + this.ph) * 0.16; hRx = Math.sin(t * 0.27 + this.ph) * 0.04;
    }
    if (s.pose === 'paddle') { shR = -1.05; elR = -0.9; zR = -0.25; tRx = 0.12; knL = knR = 0.25; hipL = hipR = -0.15; }
    if (s.pose === 'cue') { shR = -0.6; elR = -1.3; shL = -1.25; elL = -0.2; tRx = 0.45; hRx = -0.3; }
    if (s.look && !s.moving) {   // turn the head toward whoever is talking or close by
      const dx = s.look.x - this.g.position.x, dz = s.look.z - this.g.position.z; let a = Math.atan2(dx, dz) - this.g.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.4) { hRy = clamp(a, -1.0, 1.0) * 0.85; tRy += clamp(a, -1, 1) * 0.15; }
    }
    if (s.hand) { shR = -2.85; zR = -0.12; elR = -0.25; wrR = 0; hRx = -0.05; }
    const e = s.emote, a = s.emoteAge;
    if (e && a < (EMO_DUR[e] || 2)) {
      const o = Math.sin(a * 12);
      if (e === 'wave') { shR = 0; zR = -2.55; elR = -0.25 + o * 0.45; hRy = 0; }
      else if (e === 'clap') { shL = shR = -1.0; zL = -0.45; zR = 0.45; elL = elR = -0.9 - Math.abs(o) * 0.25; }
      else if (e === 'laugh') { hRx = -0.3; by += Math.abs(Math.sin(a * 18)) * 0.02; tRx = -0.08; jaw = 0.6; }
      else if (e === 'thumbs' || e === 'heart' || e === 'gift') { shR = -1.25; elR = -0.7; }
      else if (e === 'nod') { hRx = Math.max(0, Math.sin(a * 9)) * 0.3; }
      else if (e === 'bell') { shR = -2.6 + o * 0.3; elR = -0.3; }
      else if (e === 'coffee') { shR = -0.9; elR = -1.9; hRx = -0.12; }
      else if (e === 'play') { shR = -1.7; elR = -0.4; zR = 0.5; }
      else if (e === 'dance' && !s.seat) { const d = Math.sin(a * 8); by += Math.abs(d) * 0.05; shL = -2.4 + d * 0.5; shR = -2.4 - d * 0.5; elL = elR = -0.5; hipL = d * 0.25; hipR = -d * 0.25; knL = knR = Math.abs(d) * 0.3; spin = Math.sin(a * 4) * 0.5; }
    } else if (s.mug && !s.moving && !s.hand) { shR = Math.min(shR, -0.5); elR = -1.15; }
    if (s.speaking || this.bubT > 3.5 || s.call && Math.sin(t * 0.7 + this.ph) > 0.3) { jaw = Math.max(jaw, (0.5 + 0.5 * Math.sin(t * 17 + Math.sin(t * 5.3) * 2)) * 0.8); if (s.speaking && !s.moving) { shL = Math.min(shL, -0.4 + Math.sin(t * 2.3) * 0.25); elL = -1.0; } }
    // blink
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 0.14; this.blinkT = 2 + Math.random() * 4; } if (this.blink > 0) this.blink -= dt;
    const k = 1 - Math.exp(-dt * 12), c = this.cur, ap = (n, v) => (c[n] = c[n] === undefined ? v : c[n] + (v - c[n]) * k);
    j.hipL.rotation.x = ap('hl', hipL); j.hipR.rotation.x = ap('hr', hipR); j.kneeL.rotation.x = ap('kl', knL); j.kneeR.rotation.x = ap('kr', knR); j.ankL.rotation.x = ap('al', anL); j.ankR.rotation.x = ap('ar', anR);
    j.shL.rotation.x = ap('sl', shL); j.shR.rotation.x = ap('sr', shR); j.elL.rotation.x = ap('el', elL); j.elR.rotation.x = ap('er', elR); j.wrL.rotation.x = ap('wl', wrL); j.wrR.rotation.x = ap('wr', wrR);
    j.shL.rotation.z = ap('zl', zL); j.shR.rotation.z = ap('zr', zR);
    j.torso.rotation.x = ap('tx', tRx); j.torso.rotation.y = ap('ty', tRy); j.torso.rotation.z = ap('tz', tRz); j.chest.scale.set(1, 1 + Math.sin(t * 1.6 + this.ph) * 0.006, 1 + Math.sin(t * 1.6 + this.ph) * 0.012);
    j.head.rotation.x = ap('hx', hRx); j.head.rotation.y = ap('hy', hRy); j.head.rotation.z = ap('hz', hRz);
    this.body.position.y = ap('by', by); this.body.position.z = ap('bz', bz); this.body.rotation.y = ap('sp', spin);
    if (near) {
      const lidX = this.blink > 0 ? 0.35 : -0.62 + (s.seat && s.seat.kind === 'desk' ? 0.22 : 0); for (const l of this.lids) l.rotation.x = lidX;
      const jw = ap('jw', jaw); this.loLip.position.y = -0.068 - jw * 0.012; this.mouth.scale.y = 0.0015 + jw * 0.009;
    }
    for (const d of this.detail) if (d.parent) d.visible = near && (!this.faceImg || this.feat.indexOf(d) < 0);
    if (this.mug) this.mug.visible = !!s.mug && !s.hand;
    this.handIcon.visible = !!s.hand; if (s.hand) this.handIcon.position.y = 2.32 * S + Math.sin(t * 4) * 0.04;
    this.shadow.visible = !s.seat;
    const kd = clamp(dist / 12, 0.42, 2.6); this.label.scale.set(2.0 * kd, 0.8 * kd, 1); this.label.position.y = (s.seat ? 1.62 : 2.1) * S + 0.42 * kd; this.label.visible = !s.hideLabel;
    if (this.bubT > 0) { this.bubT -= dt; if (this.bubT <= 0) this.bub.visible = false; else { this.bub.material.opacity = Math.min(1, this.bubT * 2); this.bub.position.y = 2.5 * S + 0.84 * kd + 0.3; } }
    if (this.emo.visible) { this.emoT += dt; this.emo.position.y = (2.3 + this.emoT * 0.45) * S; this.emo.material.opacity = clamp(1.8 - this.emoT, 0, 1); if (this.emoT > 1.8) this.emo.visible = false; }
  }
  dispose() { this.labelD.tex.dispose(); this.bubD.tex.dispose(); this.emoD.tex.dispose(); this.handD.tex.dispose(); if (this.faceTex) this.faceTex.dispose(); if (this.g.parent) this.g.parent.remove(this.g); }
}
