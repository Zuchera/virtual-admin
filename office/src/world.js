'use strict';
/* ============================ core helpers ============================ */
const T = THREE;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PI = Math.PI;

const canvas = $('#gl');
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { $('#fatal').style.display = 'grid'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(50, 1, 0.1, 6000);
scene.fog = new T.Fog(0xcfe3f2, 300, 2600);

const hemi = new T.HemisphereLight(0xffffff, 0x8a7f72, 0.75); scene.add(hemi);
const amb = new T.AmbientLight(0xffffff, 0.28); scene.add(amb);
const sun = new T.DirectionalLight(0xfff3df, 1.0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);

const G = {}, MC = {};
(function makeEnv() {
  try {
    const pm = new T.PMREMGenerator(renderer), es = new T.Scene(), c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#c4dbf0'); g.addColorStop(.46, '#f6f7f8'); g.addColorStop(.56, '#d8d0c3'); g.addColorStop(1, '#5e564d'); x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    es.add(new T.Mesh(new T.SphereGeometry(40, 24, 12), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.BackSide })));
    const wl = new T.Mesh(new T.PlaneGeometry(60, 9), new T.MeshBasicMaterial({ color: 0xffffff })); wl.position.set(0, 3, 30); wl.rotation.y = Math.PI; es.add(wl);
    scene.environment = (T.RoomEnvironment ? pm.fromScene(new T.RoomEnvironment(), 0.04) : pm.fromScene(es, 0.03)).texture; pm.dispose();
  } catch (e) { }
})();
const geo = (k, make) => G[k] || (G[k] = make());
function mat(color, o) {
  const k = color + (o ? JSON.stringify(o) : '');
  return MC[k] || (MC[k] = new T.MeshStandardMaterial(Object.assign({ color: new T.Color(color).convertSRGBToLinear(), roughness: 0.82, metalness: 0, envMapIntensity: 0.45 }, o || {})));
}
function mesh(p, g, m, x, y, z, o) {
  const me = new T.Mesh(g, m); me.position.set(x, y, z);
  me.castShadow = !!(o && o.cast); me.receiveShadow = !(o && o.recv === false);
  if (o && o.ry) me.rotation.y = o.ry;
  p.add(me); return me;
}
const box = (p, w, h, d, m, x, y, z, o) => mesh(p, geo('b' + w + '_' + h + '_' + d, () => new T.BoxGeometry(w, h, d)), m, x, y, z, o);
const cyl = (p, rt, rb, h, m, x, y, z, o) => mesh(p, geo('c' + rt + '_' + rb + '_' + h + '_' + ((o && o.seg) || 16), () => new T.CylinderGeometry(rt, rb, h, (o && o.seg) || 16)), m, x, y, z, o);
const sph = (p, r, m, x, y, z, o) => mesh(p, geo('s' + r + '_' + ((o && o.seg) || 14), () => new T.SphereGeometry(r, (o && o.seg) || 14, 10)), m, x, y, z, o);

function ctex(w, h, draw, rx, ry) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4;
  return t;
}
/* a texture you can redraw later (signs, boards, screens) */
function dynTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), tex, w, h, draw(fn) { fn(this.ctx, w, h); tex.needsUpdate = true; } };
}
const FONT_D = '"Bricolage Grotesque","Figtree",system-ui,sans-serif', FONT_B = '"Figtree",system-ui,sans-serif';
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrapText(c, text, maxW, maxLines) {
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; if (lines.length === maxLines) break; } else cur = t;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  else if (lines.length === maxLines) lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
  return lines;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ============================ shared materials ============================ */
const M_WHITE = mat(0xf4f3ef), M_WALL = mat(0xe2ded6), M_DARK = mat(0x23272e, { roughness: 0.6 }), M_STEEL = mat(0xb9c0c8, { roughness: 0.35, metalness: 0.7 });
const M_WOOD = mat(0xc49a6c, { roughness: 0.6 }), M_WOOD_D = mat(0x7a5536, { roughness: 0.6 }), M_DESK = mat(0xf2efe8, { roughness: 0.5 });
const M_GLASS = new T.MeshStandardMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, depthWrite: false });
const M_FROST = new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, roughness: 0.9, depthWrite: false });
const M_PICK = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const M_LAMP = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 0.9, roughness: 0.4 });
const M_LEAF = [mat(0x3f8f52, { flatShading: true }), mat(0x2f7a48, { flatShading: true }), mat(0x58a85e, { flatShading: true })];
const M_POT = mat(0xe8e2d6), M_SOIL = mat(0x4a3b2e);
const HOOD_COL = ['#2456ff', '#ff7a45', '#1f9d6b', '#b04cff', '#e6a100', '#e0457b', '#0fa3b1', '#8d6e63'];
const HOODS0 = ['Soho', 'Camden', 'Shoreditch', 'Brixton', 'Greenwich', 'Notting Hill', 'Hackney', 'Mayfair'], HOOD_COL0 = HOOD_COL.slice();
/* office types: palette, finishes and area names. conf.kind picks one; admins can switch at any time. */
const PRESETS = {
  professional: { label: 'Professional firm', icon: '🏢', note: 'Law, finance, consulting, agencies', cols: HOOD_COL0, hoods: HOODS0, floor: ['oak', 'tiles', 'cement'], z: {}, games: true },
  startup: { label: 'Tech startup', icon: '🚀', note: 'Product teams, studios, remote-first crews', cols: ['#6a5cff', '#ff7a45', '#12b886', '#e0457b', '#f5b700', '#0fa3b1', '#b04cff', '#2456ff'], hoods: ['Launch', 'Build', 'Ship', 'Growth', 'Data', 'Design', 'Ops', 'Labs'], floor: ['terrazzo', 'cement', 'cement'], z: { cafe: 'Fuel Bar', brain: 'Ideas Lab' }, games: true },
  realestate: { label: 'Real estate', icon: '🏠', note: 'Agents, lettings, property management', cols: ['#0b6e4f', '#c9a14a', '#2c5282', '#a0522d', '#4a5568', '#b7791f', '#2f855a', '#744210'], hoods: ['Sales', 'Lettings', 'Valuations', 'Mortgages', 'Surveys', 'Land', 'Commercial', 'Aftercare'], floor: ['oak', 'oak', 'terrazzo'], z: { cafe: 'Client Lounge', lounge: 'Showcase Gallery', brain: 'Viewing Room', games: 'Break Room' }, games: false },
  ecommerce: { label: 'E-commerce', icon: '🛒', note: 'Stores, fulfilment, support, marketing', cols: ['#ff5a5f', '#ffb400', '#00a699', '#7b61ff', '#fc642d', '#484848', '#2d9cdb', '#e83e8c'], hoods: ['Storefront', 'Support', 'Marketing', 'Fulfilment', 'Merch', 'Finance', 'Growth', 'Tech'], floor: ['tiles', 'cement', 'terrazzo'], z: { brain: 'Campaign Studio', cafe: 'Pantry' }, games: true },
  cleaning: { label: 'Cleaning & services', icon: '🧽', note: 'Field teams, dispatch, bookings', cols: ['#1c9ed8', '#26c6a6', '#7fcf3a', '#f2b632', '#ef6c57', '#4b5d8a', '#2aa8a8', '#8f9bb3'], hoods: ['Dispatch', 'North Crew', 'South Crew', 'Bookings', 'Quality', 'Supplies', 'HR', 'Accounts'], floor: ['tiles', 'tiles', 'cement'], z: { brain: 'Planning Room', work: 'Operations Floor', cafe: 'Crew Room' }, games: false },
  church: { label: 'Church & ministry', icon: '⛪', note: 'Pastoral teams, cell groups, volunteers', cols: ['#7a5c99', '#c9a14a', '#3b7a78', '#a65f5f', '#5a7bb0', '#8b6f47', '#6b8e5a', '#b9824a'], hoods: ['Pastoral', 'Worship', 'Youth', 'Children', 'Outreach', 'Prayer', 'Welfare', 'Admin'], floor: ['oak', 'oak', 'terrazzo'], z: { lounge: 'Fellowship Hall', brain: 'Prayer & Planning', cafe: 'Welcome Café', games: 'Youth Corner', collab: 'Cell Group Lounge' }, games: true },
  community: { label: 'Community & city life', icon: '🌆', note: 'Associations, councils, clubs, co-working', cols: ['#e4572e', '#17bebb', '#ffc914', '#76b041', '#6c5b7b', '#2e86ab', '#f06449', '#5d576b'], hoods: ['Town Hall', 'Market', 'Library', 'Arts', 'Sports', 'Youth', 'Seniors', 'Volunteers'], floor: ['terrazzo', 'tiles', 'cement'], z: { lounge: 'Town Square', cafe: 'Community Café', brain: 'Workshop', collab: 'Meeting Hall' }, games: true }
};
const PRE = () => { const base = PRESETS[(typeof conf !== 'undefined' && conf && conf.kind) || 'professional'] || PRESETS.professional; const t = typeof THEME === 'function' ? THEME() : null; if (!t) return base; const fl = ['oak', 'tiles', 'cement', 'terrazzo'].includes(t.floor) ? t.floor : 'oak'; return Object.assign({}, base, { cols: t.cols, floor: [fl, base.floor[1], base.floor[2]] }); };
const HOODS = ['Soho', 'Camden', 'Shoreditch', 'Brixton', 'Greenwich', 'Notting Hill', 'Hackney', 'Mayfair'];

const TEX_WOOD = () => ctex(512, 512, (c, w, h) => {
  c.fillStyle = '#c9a57a'; c.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let i = 0; i < 3; i++) {
    const x = ((r % 2) * 90 + i * 190) % w, y = r * 64, v = 190 + rnd() * 30;
    c.fillStyle = `rgb(${v},${v - 32},${v - 78})`; c.fillRect(x, y, 188, 62);
    c.strokeStyle = 'rgba(90,60,30,.18)'; for (let k = 0; k < 5; k++) { c.beginPath(); const yy = y + 6 + rnd() * 50; c.moveTo(x, yy); c.bezierCurveTo(x + 60, yy + 3, x + 120, yy - 3, x + 188, yy); c.stroke(); }
  }
});
const TEX_CARPET = (base, line) => ctex(256, 256, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 5200; i++) { c.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  c.strokeStyle = line; c.lineWidth = 2; c.strokeRect(0, 0, w, h);
});
const TEX_SCREENS = [0, 1, 2].map(k => ctex(256, 160, (c, w, h) => {
  c.fillStyle = k === 0 ? '#0f1b2d' : '#f7f9fc'; c.fillRect(0, 0, w, h);
  if (k === 0) { const cols = ['#7fd1ff', '#ffb627', '#9be28f', '#ff8fa3', '#c9b6ff']; for (let i = 0; i < 16; i++) { let x = 12 + (i % 4 === 0 ? 0 : 14); for (let j = 0; j < 3 + (i * 7) % 3; j++) { const ww = 14 + ((i * 13 + j * 29) % 46); c.fillStyle = cols[(i + j) % 5]; c.fillRect(x, 10 + i * 9, ww, 4); x += ww + 6; } } }
  if (k === 1) { c.fillStyle = '#2456ff'; c.fillRect(0, 0, w, 22); c.strokeStyle = '#2456ff'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 10; i++) { const y = 130 - i * 7 - Math.sin(i * 1.3) * 14; i ? c.lineTo(20 + i * 21, y) : c.moveTo(20, y); } c.stroke(); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#ffb627' : '#1f9d6b'; c.fillRect(24 + i * 36, 150 - 20 - i * 6, 22, 20 + i * 6); } }
  if (k === 2) { c.fillStyle = '#e9eef6'; c.fillRect(0, 0, 60, h); for (let i = 0; i < 7; i++) { c.fillStyle = '#c5d0e0'; c.fillRect(8, 12 + i * 20, 44, 8); c.fillStyle = i % 3 ? '#dfe6f0' : '#ffe2a8'; rr(c, 72, 10 + i * 21, 168, 15, 4); c.fill(); } }
}));
const M_SCREEN_ON = TEX_SCREENS.map(t => new T.MeshBasicMaterial({ map: t }));
const M_SCREEN_OFF = mat(0x10141a, { roughness: 0.25, metalness: 0.4 });

/* ============================ world state ============================ */
const H = 3.2, D = 24, HANG = 14, BAY = 6.4, COLLAB = 16;
const W = { bays: 3, L: 0, xE: 0, obs: [], seats: [], picks: [], pickMeshes: [], desks: [], zones: [], anim: [], dyn: {}, ext: {}, places: [] };
let office = null;
const actions = {};                       // filled in by app.js: actions.board(id) etc.

function obs(x0, z0, x1, z1) { W.obs.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
function addPick(o) {                     // {x,y,z,w,h,d,label,ax,az,act}
  const m = box(office, o.w, o.h, o.d, M_PICK, o.x, o.y, o.z, { recv: false });
  m.visible = false;
  const p = { label: o.label, x: o.ax, z: o.az, act: o.act, mesh: m, near: o.near || 1.7, seat: o.seat || null };
  m.userData.pick = p; W.picks.push(p); W.pickMeshes.push(m); return p;
}
function addSeat(id, x, z, ry, kind, h) {
  const fwd = kind === 'sofa' || kind === 'booth' ? 0.8 : 0;
  const s = { id, x, z, ry, kind, h: h || 0.5, ax: x + Math.sin(ry) * fwd, az: z + Math.cos(ry) * fwd };
  W.seats.push(s);
  s.pick = addPick({ x, y: 0.6, z, w: 0.62, h: 1.2, d: 0.62, label: kind === 'desk' ? 'Sit at this desk' : 'Sit here', ax: s.ax, az: s.az, seat: s, act: () => actions.sit(s), near: 1.2 });
  return s;
}
function zone(id, name, x0, z0, x1, z1, room) { name = (PRE().z || {})[id] || name; W.zones.push({ id, name, x0, z0, x1, z1, room: !!room }); }
function zoneAt(x, z) { for (const q of W.zones) if (x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1) return q; return W.zones[W.zones.length - 1]; }

/* ---------- construction pieces ---------- */
function wallX(x0, x1, z, o) {             // wall running along X at depth z
  o = o || {}; const t = o.t || 0.12, h = o.h || H, y0 = o.y0 || 0;
  const m = box(office, +(x1 - x0).toFixed(3), h, t, o.mat || M_WALL, (x0 + x1) / 2, y0 + h / 2, z, { cast: o.cast !== false && !o.glass });
  if (o.obs !== false) obs(x0, z - t / 2, x1, z + t / 2); return m;
}
function wallZ(z0, z1, x, o) {
  o = o || {}; const t = o.t || 0.12, h = o.h || H, y0 = o.y0 || 0;
  const m = box(office, t, h, +(z1 - z0).toFixed(3), o.mat || M_WALL, x, y0 + h / 2, (z0 + z1) / 2, { cast: o.cast !== false && !o.glass });
  if (o.obs !== false) obs(x - t / 2, z0, x + t / 2, z1); return m;
}
function glassX(x0, x1, z, gm) {
  wallX(x0, x1, z, { mat: gm || M_GLASS, t: 0.05, glass: 1, h: H - 0.12, y0: 0.06 });
  wallX(x0, x1, z, { mat: M_FROST, t: 0.055, glass: 1, h: 0.34, y0: 0.95, obs: false });
  wallX(x0, x1, z, { mat: M_DARK, t: 0.08, h: 0.06, obs: false, cast: false }); wallX(x0, x1, z, { mat: M_DARK, t: 0.08, h: 0.08, y0: H - 0.08, obs: false, cast: false });
}
function glassZ(z0, z1, x, gm) {
  wallZ(z0, z1, x, { mat: gm || M_GLASS, t: 0.05, glass: 1, h: H - 0.12, y0: 0.06 });
  wallZ(z0, z1, x, { mat: M_FROST, t: 0.055, glass: 1, h: 0.34, y0: 0.95, obs: false });
  wallZ(z0, z1, x, { mat: M_DARK, t: 0.08, h: 0.06, obs: false, cast: false }); wallZ(z0, z1, x, { mat: M_DARK, t: 0.08, h: 0.08, y0: H - 0.08, obs: false, cast: false });
}
function doorFrameX(x0, x1, z) {           // open doorway in an X-running glass wall, with a leaf swung open
  box(office, 0.06, H, 0.1, M_DARK, x0, H / 2, z); box(office, 0.06, H, 0.1, M_DARK, x1, H / 2, z);
  box(office, x1 - x0, 0.9, 0.06, M_GLASS, (x0 + x1) / 2, H - 0.45, z, { recv: false });
  const leaf = box(office, 0.04, 2.2, x1 - x0 - 0.08, M_GLASS, x1 - 0.02, 1.12, z - (x1 - x0) / 2 + 0.02, { recv: false });
  box(office, 0.05, 0.3, 0.04, M_STEEL, x1 - 0.06, 1.05, z - (x1 - x0) + 0.2); return leaf;
}
let lightBudget = 0;
function roomLight(x, z, i) { if (lightBudget >= 7) return; lightBudget++; const l = new T.PointLight(0xffe9c9, i || 0.5, 16, 1.6); l.position.set(x, 2.5, z); office.add(l); W.dyn.lights.push(l); }

/* ---------- furniture ---------- */
function nameplate(x, y, z, flat, ry) {
  const d = dynTex(256, 64);
  const m = mesh(office, geo('np', () => new T.PlaneGeometry(0.44, 0.11)), new T.MeshBasicMaterial({ map: d.tex }), x, y, z, { recv: false });
  if (flat) m.rotation.set(-PI / 2, 0, PI + (ry || 0)); else m.rotation.y = ry || 0;
  return d;
}
function drawPlate(d, id, name, col) {
  d.draw((c, w, h) => { c.fillStyle = name ? '#ffffff' : '#eef1f5'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 0, 12, h);
    c.fillStyle = '#14202e'; c.font = '700 26px ' + FONT_B; c.textBaseline = 'middle'; let t = name || 'Free desk'; while (c.measureText(t).width > 170 && t.length > 3) t = t.slice(0, -2); c.globalAlpha = name ? 1 : .5; c.fillText(t, 22, 34); c.globalAlpha = .5; c.font = '600 18px ' + FONT_B; c.textAlign = 'right'; c.fillText(id.toUpperCase(), w - 8, 34); c.textAlign = 'left'; c.globalAlpha = 1; });
}
function blob(x, z, w, d) { const m = mesh(office, geo('blobp', () => new T.PlaneGeometry(1, 1)), BLOB(), x, 0.004, z, { recv: false }); m.rotation.x = -PI / 2; m.scale.set(w, d, 1); m.renderOrder = 1; return m; }
function desk(id, x, z, side, hood, priv) {   // side: +1 occupant sits at -z facing +z ; -1 occupant at +z facing -z
  { const lay = LAY(); if (!priv && lay.gone.includes(id)) return null; const mv = !priv && lay.moved[id]; if (mv) { x += num(mv[0], 0); z += num(mv[1], 0); } }
  const col = HOOD_COL[hood % 8], dw = priv ? 1.8 : 1.5;
  rbox(office, dw, 0.032, 0.75, 0.012, priv ? M_WALNUT : M_DESK, x, 0.744, z, { cast: 1 }); blob(x, z, dw + 0.5, 1.3);
  for (const sx of [-1, 1]) { const lx = x + sx * (dw / 2 - 0.1); box(office, 0.04, 0.72, 0.04, M_BLACKM, lx, 0.36, z - 0.28); box(office, 0.04, 0.72, 0.04, M_BLACKM, lx, 0.36, z + 0.28); box(office, 0.04, 0.03, 0.62, M_BLACKM, lx, 0.71, z); box(office, 0.05, 0.02, 0.66, M_BLACKM, lx, 0.01, z); }
  box(office, dw - 0.3, 0.05, 0.14, M_BLACKM, x, 0.66, z + side * 0.2);
  const scr = monitor(office, x, 0.76, z + side * 0.2, side > 0 ? PI : 0);
  const chairZ = z - side * 0.78, ry = side > 0 ? 0 : PI;
  officeChair(x, chairZ, ry, priv ? '#2b3340' : '#3a4352');
  const seat = addSeat(id, x, chairZ, ry, 'desk', 0.5);
  const plate = nameplate(x - (dw / 2 - 0.3) * side, 0.762, z - side * 0.28, true, side > 0 ? 0 : PI);
  const item = new T.Group(); item.position.set(x + (dw / 2 - 0.22) * side, 0.76, z + side * 0.05); office.add(item);
  const d = { id, x, z, side, hood, priv: !!priv, scr, seat, plate, item, owner: null, itemKind: -1, col, name: HOODS[hood % 8] };
  drawPlate(plate, id, '', col); W.desks.push(d);
  addPick({ x, y: 0.95, z: z + side * 0.1, w: dw - 0.1, h: 0.5, d: 0.5, label: priv ? 'Private office desk' : 'Desk ' + id.toUpperCase(), ax: x, az: chairZ, act: () => actions.desk(d) });
  return d;
}
function setDeskItem(d, kind) {
  if (d.itemKind === kind) return; d.itemKind = kind; while (d.item.children.length) d.item.remove(d.item.children[0]);
  const g = d.item;
  if (kind === 0) { cyl(g, 0.05, 0.04, 0.08, M_POT, 0, 0.04, 0); const l = sph(g, 0.08, M_LEAF[0], 0, 0.14, 0); l.scale.y = 1.2; }
  if (kind === 1) { cyl(g, 0.04, 0.035, 0.09, mat(d.col), 0, 0.045, 0); }
  if (kind === 2) { box(g, 0.14, 0.11, 0.015, M_WOOD_D, 0, 0.06, 0).rotation.x = -0.25 * d.side; }
  if (kind === 3) { cyl(g, 0.05, 0.06, 0.02, M_DARK, 0, 0.01, 0); cyl(g, 0.008, 0.008, 0.3, M_STEEL, 0, 0.16, 0); cyl(g, 0.07, 0.03, 0.07, M_LAMP, 0, 0.31, 0); }
  if (kind === 4) { cyl(g, 0.03, 0.04, 0.04, M_DARK, 0, 0.02, 0); cyl(g, 0.045, 0.02, 0.1, mat(0xe2b93b, { metalness: .8, roughness: .3 }), 0, 0.1, 0); }
}
function meetChair(id, x, z, ry) { officeChair(x, z, ry, '#55606f'); addSeat(id, x, z, ry, 'chair', 0.5); }
function wallSign(d, w, h, x, y, z, ry) { const m = mesh(office, new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: d.tex }), x, y, z, { recv: false }); m.rotation.y = ry || 0; return m; }

/* ============================ build the office ============================ */
function buildOffice(bays) {
  if (office) scene.remove(office);
  office = new T.Group(); scene.add(office); seed = 11; lightBudget = 0; smartGlass.length = 0; plantN = 0;
  Object.assign(W, { bays, L: HANG + bays * BAY + COLLAB, xE: HANG + bays * BAY, obs: [], seats: [], picks: [], pickMeshes: [], desks: [], zones: [], anim: [], dyn: { lights: [] }, ext: {}, places: [] });
  const L = W.L, xE = W.xE;
  { const pr = PRE(); for (let i = 0; i < 8; i++) { HOOD_COL[i] = pr.cols[i]; HOODS[i] = pr.hoods[i]; } }

  /* floors with a different finish per zone */
  const fl = (x0, x1, tex, rx, ry) => { tex.repeat.set(rx, ry); const m = mesh(office, new T.PlaneGeometry(x1 - x0, D), new T.MeshStandardMaterial({ map: tex, roughness: x0 === 0 ? .42 : .9, envMapIntensity: x0 === 0 ? .7 : .3 }), (x0 + x1) / 2, 0, D / 2); m.rotation.x = -PI / 2; return m; };
  const FT = { oak: [TEX_OAK, 3], tiles: [TEX_TILES, 1], cement: [TEX_CEMENT, 4], terrazzo: [TEX_TERRAZZO, 2] }, fk = PRE().floor, F0 = FT[fk[0]], F1 = FT[fk[1]], F2 = FT[fk[2]];
  W.floors = [fl(0, HANG, F0[0](), HANG / F0[1], D / F0[1]), fl(HANG, xE, F1[0](), (xE - HANG) / F1[1], D / F1[1]), fl(xE, L, F2[0](), COLLAB / F2[1], D / F2[1])];
  W.floors[0].material.roughness = .48; W.floors[0].material.envMapIntensity = .75; W.floors[2].material.roughness = .32; W.floors[2].material.envMapIntensity = 1.0; W.floors[1].material.roughness = 1;
  const brass = mat(0xc9a14a, { metalness: .8, roughness: .35 });
  box(office, 0.07, 0.006, D, brass, HANG, 0.004, D / 2); box(office, 0.07, 0.006, D, brass, xE, 0.004, D / 2);
  /* slab edge + ceiling (ceiling only shown at eye level) */
  box(office, L + 0.6, 0.5, D + 0.6, mat(0x8d949c), L / 2, -0.26, D / 2, { recv: false });


  /* external walls. North/west/east hide when the camera is behind them. */
  const accent = mat(0x1d2b45);
  W.ext.n = new T.Group(); W.ext.w = new T.Group(); W.ext.e = new T.Group(); office.add(W.ext.n, W.ext.w, W.ext.e);
  const keep = office; let m;
  m = wallX(-0.2, L + 0.2, -0.1, { t: 0.2 }); keep.remove(m); W.ext.n.add(m);
  m = wallZ(0, D, -0.1, { t: 0.2 }); keep.remove(m); W.ext.w.add(m);
  m = wallZ(0, D, L + 0.1, { t: 0.2 }); keep.remove(m); W.ext.e.add(m);
  buildCeiling();
  /* south glass facade looking over London */
  wallX(0, L, D + 0.05, { t: 0.14, h: 0.32, mat: mat(0x3a3f47), cast: false });
  box(office, L, H - 0.6, 0.04, M_GLASS, L / 2, 0.32 + (H - 0.6) / 2, D + 0.05, { recv: false });
  box(office, L, 0.28, 0.2, mat(0x3a3f47), L / 2, H - 0.14, D + 0.05, { cast: 1 });
  for (let x = 0; x <= L + 0.01; x += 1.6) box(office, 0.045, H, 0.1, M_BLACKM, x, H / 2, D + 0.05, { cast: 1 });
  box(office, L, 0.04, 0.12, M_BLACKM, L / 2, 0.32, D + 0.05);

  /* ---------------- HANGOUT (x 0..14) ---------------- */
  zone('cafe', 'Café', 0, 0, 10, 6.4); zone('lobby', 'Lobby', 10, 0, HANG, 7);
  zone('lounge', 'Skyline Lounge', 0, 15.6, HANG, D); zone('games', 'Games Corner', 0, 6.4, HANG, 15.6);
  // lobby: lift, sign, clock
  buildLobby();
  W.dyn.sign = dynTex(1024, 256); const sg = wallSign(W.dyn.sign, 4.8, 1.2, 5, 2.58, 0.012, 0); office.remove(sg); W.ext.n.add(sg);
  const clock = new T.Group(); clock.position.set(9.6, 2.35, 0.03); W.ext.n.add(clock);
  const face = cyl(clock, 0.34, 0.34, 0.04, M_WHITE, 0, 0, 0, { seg: 32 }); face.rotation.x = PI / 2; const rim = mesh(clock, new T.TorusGeometry(0.34, 0.025, 8, 32), M_DARK, 0, 0, 0.02);
  const hh = new T.Group(), mh = new T.Group(); clock.add(hh, mh); box(hh, 0.03, 0.18, 0.01, M_DARK, 0, 0.09, 0.03); box(mh, 0.02, 0.27, 0.01, M_DARK, 0, 0.135, 0.035);
  W.dyn.clock = { hh, mh };
  box(office, 1.6, 0.012, 1.1, mat(0x2b3340, { roughness: 1 }), 12, 0.007, 1.3);
  // café
  const cab = mat(0x1d2b45), stone = mat(0xe9e6df, { roughness: .35 });
  box(office, 7.8, 0.88, 0.65, cab, 4.5, 0.44, 0.43, { cast: 1 }); box(office, 7.9, 0.05, 0.7, stone, 4.5, 0.905, 0.43); obs(0.6, 0, 8.4, 0.8);
  box(office, 7.8, 0.4, 0.36, cab, 4.5, 1.7, 0.28, { cast: 1 });
  box(office, 0.85, 1.95, 0.72, M_STEEL, 9.15, 0.975, 0.46, { cast: 1 }); obs(8.7, 0, 9.6, 0.85);
  const cm = new T.Group(); cm.position.set(2.2, 0.93, 0.42); office.add(cm);
  box(cm, 0.42, 0.46, 0.4, M_DARK, 0, 0.23, 0, { cast: 1 }); box(cm, 0.3, 0.04, 0.26, M_STEEL, 0, 0.02, 0.16); cyl(cm, 0.045, 0.04, 0.09, M_WHITE, 0, 0.09, 0.16); box(cm, 0.2, 0.06, 0.02, M_LAMP, 0, 0.38, 0.205);
  W.dyn.steam = []; for (let i = 0; i < 5; i++) { const s = new T.Sprite(new T.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); s.scale.set(.12, .12, 1); s.position.set(2.2, 1.1, 0.58); office.add(s); W.dyn.steam.push(s); }
  cyl(office, 0.1, 0.08, 0.2, M_STEEL, 3.4, 1.03, 0.4); box(office, 0.7, 0.02, 0.45, M_STEEL, 5.6, 0.93, 0.42); cyl(office, 0.16, 0.1, 0.09, M_WOOD, 6.9, 0.975, 0.4); for (let i = 0; i < 4; i++) sph(office, 0.05, mat(i % 2 ? 0xe2552f : 0xe9b320), 6.84 + (i % 2) * .1, 1.04, 0.36 + (i > 1) * .08);
  addPick({ x: 2.2, y: 1.2, z: 0.45, w: 0.6, h: 0.7, d: 0.6, label: 'Make a coffee', ax: 2.2, az: 1.3, act: () => actions.coffee() });
  box(office, 5.6, 1.0, 0.8, cab, 4.8, 0.5, 3.5, { cast: 1 }); box(office, 5.8, 0.05, 0.95, M_WOOD, 4.8, 1.03, 3.5, { cast: 1 }); obs(2, 3.1, 7.6, 3.9);
  for (let i = 0; i < 5; i++) stool('bar' + i, 2.6 + i * 1.1, 4.4, PI, '#c9a14a');
  for (const x of [3, 4.8, 6.6]) pendant(x, 3.5, 'brass', 2.3); roomLight(4.8, 3.2, .55);
  // world clocks + kudos wall on the west wall
  W.dyn.clocks = dynTex(1024, 256); m = wallSign(W.dyn.clocks, 4.2, 1.05, 0.012, 2.1, 3.1, PI / 2); office.remove(m); W.ext.w.add(m);
  addPick({ x: 0.15, y: 2.0, z: 3.1, w: 0.3, h: 1.4, d: 4.2, label: 'Team time zones', ax: 1.1, az: 3.3, act: () => actions.panel('people'), near: 2.2 });
  W.dyn.kudos = dynTex(1024, 512); m = wallSign(W.dyn.kudos, 3.8, 1.9, 0.012, 1.7, 8.6, PI / 2); office.remove(m); W.ext.w.add(m);
  addPick({ x: 0.15, y: 1.7, z: 8.6, w: 0.3, h: 2, d: 3.8, label: 'Kudos wall', ax: 1.2, az: 8.6, act: () => actions.panel('kudos'), near: 2.4 });
  // games corner
  const tt = mat(0x1e4fa3, { roughness: .5 }); box(office, 2.74, 0.04, 1.52, tt, 4.6, 0.76, 11.6, { cast: 1 }); blob(4.6, 11.6, 3.4, 2.2); box(office, 2.74, 0.006, 0.03, M_WHITE, 4.6, 0.783, 11.6); box(office, 0.02, 0.15, 1.6, mat(0xffffff, { transparent: true, opacity: .6 }), 4.6, 0.86, 11.6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(office, 0.05, 0.74, 0.05, M_DARK, 4.6 + sx * 1.2, 0.37, 11.6 + sz * 0.6); obs(3.2, 10.8, 6, 12.4);
  W.dyn.ball = sph(office, 0.025, mat(0xff8a1f, { emissive: 0xff8a1f, emissiveIntensity: .3 }), 4.6, 0.82, 11.6); W.dyn.ball.visible = false;
  addPick({ x: 4.6, y: 0.9, z: 11.6, w: 2.8, h: 0.4, d: 1.6, label: 'Play table tennis (2 players or solo)', ax: 2.7, az: 11.6, act: () => actions.tt(), near: 2.4 });
  W.dyn.pads = [0, 1].map(i => { const g = new T.Group(); office.add(g); const d = cyl(g, 0.085, 0.085, 0.014, mat(i ? 0x2456ff : 0xd6453d), 0, 0, 0, { seg: 20 }); d.rotation.z = PI / 2; box(g, 0.02, 0.1, 0.026, M_WOOD, 0, -0.12, 0); g.position.set(4.6 + (i ? 1.42 : -1.42), 0.95, 11.6); g.visible = false; return g; });
  // pool table
  { const px = 8.6, pz = 8.6, felt = mat(0x1f7a4d, { roughness: 1 }), rail = mat(0x5a3a22, { roughness: .45 });
    box(office, 2.5, 0.22, 1.38, rail, px, 0.67, pz, { cast: 1 }); blob(px, pz, 3.2, 2.1); box(office, 2.24, 0.02, 1.12, felt, px, 0.79, pz);
    for (const sz of [-1, 1]) box(office, 2.5, 0.05, 0.13, rail, px, 0.815, pz + sz * 0.625, { cast: 1 }); for (const sx of [-1, 1]) box(office, 0.13, 0.05, 1.12, rail, px + sx * 1.185, 0.815, pz, { cast: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(office, 0.12, 0.58, 0.12, M_DARK, px + sx * 1.05, 0.29, pz + sz * 0.5);
    for (const [u, w] of [[-1.12, -0.56], [0, -0.6], [1.12, -0.56], [-1.12, 0.56], [0, 0.6], [1.12, 0.56]]) cyl(office, 0.062, 0.062, 0.012, M_DARK, px + u, 0.802, pz + w, { seg: 16, recv: false });
    obs(px - 1.25, pz - 0.7, px + 1.25, pz + 0.7);
    const BC = ['#fbfaf5', '#f2c230', '#2456ff', '#d6453d', '#7a4cff', '#ff7a45', '#1f9d6b', '#7a2e2a', '#14181d'];
    const balls = []; for (let n = 0; n < 16; n++) { const stripe = n > 8, g = new T.Group(); office.add(g); sph(g, 0.0286, mat(stripe ? '#fbfaf5' : BC[n], { roughness: .15 }), 0, 0, 0, { cast: 1, seg: 16 }); if (stripe) { const b = sph(g, 0.029, mat(BC[n - 8], { roughness: .15 }), 0, 0, 0, { seg: 16 }); b.scale.set(1.01, 0.5, 1.01); } g.position.set(px, 0.829, pz); balls.push(g); }
    const aim = box(office, 1, 0.006, 0.012, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 }), px, 0.832, pz, { recv: false }); aim.visible = false;
    const cue = cyl(office, 0.006, 0.014, 1.4, M_WOOD, px, 0.86, pz, { seg: 8 }); cue.visible = false;
    W.dyn.pool = { balls, aim, cue };
    addPick({ x: px, y: 0.9, z: pz, w: 2.5, h: 0.4, d: 1.4, label: 'Play pool (2 players or solo)', ax: px, az: pz + 1.25, act: () => actions.pool(), near: 2.2 });
    pendant(px - 0.5, pz, 'bar', 2.2); pendant(px + 0.5, pz, 'bar', 2.2); W.places.push({ name: 'Pool table', x: px, z: pz + 1.3 }); }
  // wins board + bell in the lobby
  { box(office, 0.1, 2.4, 3.0, mat(0x14202e), 13.92, 1.2, 2.6, { cast: 1 }); obs(13.85, 1.1, 14, 4.1); W.dyn.wins = dynTex(1024, 704); wallSign(W.dyn.wins, 2.84, 1.95, 13.865, 1.36, 2.6, -PI / 2);
    cyl(office, 0.03, 0.04, 1.75, M_STEEL, 13.5, 0.875, 0.75); box(office, 0.5, 0.04, 0.04, M_STEEL, 13.3, 1.74, 0.75); obs(13.42, 0.67, 13.58, 0.83);
    const bell = new T.Group(); bell.position.set(13.1, 1.72, 0.75); office.add(bell); const gold = mat(0xe2b93b, { metalness: .9, roughness: .25 }); cyl(bell, 0.045, 0.15, 0.2, gold, 0, -0.12, 0, { cast: 1, seg: 20 }); sph(bell, 0.05, gold, 0, -0.03, 0); sph(bell, 0.03, M_DARK, 0, -0.24, 0); box(bell, 0.008, 0.3, 0.008, M_DARK, 0, -0.38, 0); W.dyn.bell = bell;
    addPick({ x: 13.5, y: 1.3, z: 2.4, w: 0.9, h: 2.4, d: 3.6, label: 'Wins board: ring the bell', ax: 12.7, az: 2.6, act: () => actions.panel('wins'), near: 2.6 }); }
  cyl(office, 0.55, 0.55, 0.04, M_WOOD, 10.6, 0.74, 11.6, { cast: 1, seg: 24 }); cyl(office, 0.05, 0.3, 0.72, M_DARK, 10.6, 0.36, 11.6); obs(10.25, 11.25, 10.95, 11.95);
  W.dyn.c4 = dynTex(256, 224); const rack = box(office, 0.56, 0.48, 0.05, [mat(0x2456ff), mat(0x2456ff), mat(0x2456ff), mat(0x2456ff), new T.MeshBasicMaterial({ map: W.dyn.c4.tex }), new T.MeshBasicMaterial({ map: W.dyn.c4.tex })], 10.6, 1.02, 11.6, { cast: 1 }); rack.rotation.y = PI / 2;
  meetChair('game0', 9.75, 11.6, PI / 2); meetChair('game1', 11.45, 11.6, -PI / 2);
  addPick({ x: 10.6, y: 1.0, z: 11.6, w: 0.7, h: 0.7, d: 0.9, label: 'Play Connect Four', ax: 10.6, az: 12.5, act: () => actions.panel('c4') });
  // icebreaker kiosk + speaker
  box(office, 0.5, 1.5, 0.75, mat(0xb04cff), 0.3, 0.75, 12.6, { cast: 1 }); obs(0, 12.2, 0.6, 13); W.dyn.ice = dynTex(512, 384); wallSign(W.dyn.ice, 0.62, 0.46, 0.56, 1.12, 12.6, PI / 2);
  addPick({ x: 0.35, y: 0.9, z: 12.6, w: 0.7, h: 1.6, d: 0.9, label: 'Icebreaker question', ax: 1.3, az: 12.6, act: () => actions.panel('ice') });
  box(office, 0.4, 0.9, 0.5, M_WOOD_D, 13.0, 0.45, 6.75, { cast: 1 }); cyl(office, 0.13, 0.13, 0.02, M_DARK, 13.0, 0.6, 6.99).rotation.x = PI / 2; obs(12.78, 6.48, 13.22, 7.0);
  addPick({ x: 13.0, y: 0.6, z: 6.75, w: 0.6, h: 1.1, d: 0.7, label: 'Lo-fi radio on/off', ax: 12.4, az: 7.4, act: () => actions.music() });
  { const wallM = mat(0x3d4f63, { roughness: .9 }); box(office, 0.12, 3.1, 2.4, wallM, 0.1, 1.55, 14.4, { cast: 1 }); obs(0, 13.2, 0.2, 15.6); const hc = [0xff7a45, 0x2456ff, 0xffb627, 0x1f9d6b, 0xe0457b, 0xb04cff], hg = geo('hold', () => new T.IcosahedronGeometry(0.045, 0));
    seed = 31; for (let i = 0; i < 46; i++) { const h = mesh(office, hg, mat(hc[i % 6], { flatShading: true, roughness: .6 }), 0.18, 0.25 + rnd() * 2.75, 13.35 + rnd() * 2.1, { cast: 1 }); h.scale.set(0.8, 0.6 + rnd() * 0.8, 1 + rnd() * 0.6); h.rotation.set(rnd() * 3, rnd() * 3, 0); }
    box(office, 1.2, 0.08, 2.4, mat(0x2b3340, { roughness: 1 }), 0.75, 0.04, 14.4); seed = 11;
    addPick({ x: 0.3, y: 1.5, z: 14.4, w: 0.5, h: 3, d: 2.4, label: 'Climb the wall', ax: 1.2, az: 14.4, act: () => climbWall(), near: 2.4 }); W.places.push({ name: 'Climbing wall', x: 1.3, z: 14.4 }); }
  pendant(4.6, 11.6, 'bar', 2.4); pendant(10.6, 11.6, 'dome', 2.2); roomLight(7, 11.5, .45);
  // lounge
  box(office, 6.4, 0.012, 4.6, mat(0x2f4f6f, { roughness: 1 }), 5.2, 0.007, 19.7);
  sofa(5.2, 17.75, 0, 3, '#b8644a', 'sofaA'); sofa(2.2, 19.9, PI / 2, 1, '#ecd9b8', 'armA'); sofa(8.2, 19.9, -PI / 2, 1, '#ecd9b8', 'armB');
  cyl(office, 0.55, 0.55, 0.05, M_WOOD, 5.2, 0.38, 19.9, { cast: 1, seg: 24 }); cyl(office, 0.06, 0.25, 0.36, M_DARK, 5.2, 0.18, 19.9); obs(4.7, 19.4, 5.7, 20.4);
  pouf('bean0', 10, 21.4, 0, '#ffb627'); pouf('bean1', 11.4, 20.4, 0, '#1f9d6b'); pouf('bean2', 11.6, 22.2, 0, '#b04cff');
  box(office, 0.34, 1.9, 3.2, M_WOOD, 0.2, 0.95, 22.3, { cast: 1 }); obs(0, 20.7, 0.4, 23.9);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) box(office, 0.2, 0.3 + (i % 3) * .03, 0.06 + (i % 2) * .03, mat(HOOD_COL[(r * 3 + i) % 8]), 0.3, 0.3 + r * 0.45, 21.0 + i * 0.32);
  plant(1.2, 23.5, 1.2); plant(13.2, 23.1, 1.3); plant(13.3, 7.4, 1.1); plant(0.6, 5.8, 1.2);
  pendant(5.2, 19.8, 'dome', 2.3); roomLight(5.2, 19.5, .5);
  // divider with the team drive cabinet
  planter(13.8, 8, 14.2, 11); planter(13.8, 14.2, 14.2, 17.2);
  box(office, 0.5, 1.25, 1.8, M_WHITE, 14, 0.625, 12.6, { cast: 1 }); obs(13.75, 11.7, 14.25, 13.5);
  for (let i = 0; i < 3; i++) { box(office, 0.52, 0.02, 1.7, M_DARK, 14, 0.32 + i * 0.4, 12.6); box(office, 0.02, 0.08, 0.3, M_STEEL, 13.74, 0.5 + i * 0.4, 12.6); }
  W.dyn.drive = dynTex(256, 64); W.dyn.drive.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 30px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Team Drive', w / 2, h / 2 + 2); });
  wallSign(W.dyn.drive, 1.2, 0.3, 13.74, 1.42, 12.6, -PI / 2); box(office, 0.04, 0.36, 1.3, M_DARK, 13.77, 1.42, 12.6);
  addPick({ x: 14, y: 0.8, z: 12.6, w: 0.9, h: 1.6, d: 1.9, label: 'Team Drive (shared files)', ax: 13.1, az: 12.6, act: () => actions.panel('files') });

  /* ---------------- WORKFLOOR (x 14..xE) ---------------- */
  let dn = 0;
  for (let b = 0; b < bays; b++) {
    const bx = HANG + b * BAY, col = HOOD_COL[b % 8];
    // two private offices per bay along the north wall
    for (let k = 0; k < 2; k++) {
      const i = b * 2 + k, x0 = bx + k * 3.2, x1 = x0 + 3.2, id = 'o' + (i + 1);
      zone('office' + (i + 1), 'Office ' + (i + 1), x0, 0, x1, 4.4, true);
      const ogm = glassMat(); glassZ(0, 4.4, x0, ogm);
      glassX(x0, x0 + 2.0, 4.4, ogm); doorFrameX(x0 + 2.0, x0 + 3.05, 4.4); wallX(x0 + 3.05, x1, 4.4, { mat: M_DARK, t: 0.08 });
      const pd = desk(id, x0 + 1.3, 1.75, 1, b, true); smartGlass.push({ m: ogm, want: () => typeof deskBusy === 'function' && deskBusy(pd) }); obs(x0 + 0.4, 1.375, x0 + 2.2, 2.125);
      officeChair(x0 + 1.3, 3.0, PI, '#8d949c'); addSeat(id + 'g', x0 + 1.3, 3.0, PI, 'chair', 0.5);
      rbox(office, 0.42, 0.74, 1.3, 0.015, M_WALNUT, x0 + 0.33, 0.4, 3.4, { cast: 1 }); for (const dz of [-0.33, 0.33]) box(office, 0.02, 0.012, 0.18, M_ALU, x0 + 0.55, 0.62, 3.4 + dz); cyl(office, 0.02, 0.02, 0.06, M_BLACKM, x0 + 0.2, 0.03, 2.8, { seg: 8 }); cyl(office, 0.02, 0.02, 0.06, M_BLACKM, x0 + 0.2, 0.03, 4.0, { seg: 8 }); obs(x0 + 0.1, 2.75, x0 + 0.55, 4.05);
      box(office, 0.3, 0.26, 0.03, mat(col), x0 + 0.34, 0.95, 3.2).rotation.y = PI / 2;
      plant(x0 + 0.45, 0.5, 0.8); box(office, 2.2, 0.012, 2.2, mat(col, { roughness: 1 }), x0 + 1.5, 0.006, 2.2);
      const sign = nameplate(x0 + 1.0, 1.55, 4.44, false, 0); sign.office = i + 1; W.desks[W.desks.length - 1].door = sign;
      pendant(x0 + 1.3, 1.9, 'dome', 2.35);
    }
    // two pods of four desks
    for (const cz of [9.2, 15]) {
      const cx = bx + 3.2;
      box(office, 3.6, 0.012, 3.6, mat(col, { roughness: 1, transparent: true, opacity: .55 }), cx, 0.006, cz);
      for (const side of [1, -1]) for (const sx of [-0.8, 0.8]) desk('d' + (++dn), cx + sx, cz - side * 0.4, side, b);
      rbox(office, 3.1, 0.46, 0.035, 0.015, mat(shade(col, 0.12), { roughness: 1 }), cx, 1.0, cz, { cast: 1 }); box(office, 3.1, 0.012, 0.04, M_BLACKM, cx, 0.77, cz);
      obs(cx - 1.6, cz - 0.8, cx + 1.6, cz + 0.8);
      pendant(cx - 0.8, cz, 'bar', 2.45); pendant(cx + 0.8, cz, 'bar', 2.45);
    }
    if (b % 2 === 0) roomLight(bx + 3.2, 12.1, .5);
    // neighbourhood sign hanging over the aisle
    const hd = dynTex(512, 128); hd.draw((c, w, h) => { c.fillStyle = col; rr(c, 0, 0, w, h, 28); c.fill(); c.fillStyle = '#fff'; c.font = '700 64px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(HOODS[b % 8], w / 2, h / 2 + 4); });
    for (const r of [0, PI]) wallSign(hd, 1.6, 0.4, bx + 3.2, 2.75, 12.1, r); box(office, 0.01, 0.3, 0.01, M_DARK, bx + 2.5, 3.05, 12.1); box(office, 0.01, 0.3, 0.01, M_DARK, bx + 3.9, 3.05, 12.1);
    if (b > 0) { planter(bx - 0.2, 8.4, bx + 0.2, 10); planter(bx - 0.2, 14.2, bx + 0.2, 15.8); }
    // window seats with the view
    for (const sx of [-0.85, 0.85]) sofa(bx + 3.2 + sx, 21.5, 0, 1, b % 2 ? '#5c7c8a' : '#c76f4a', 'win' + b + (sx > 0 ? 'b' : 'a'));
    cyl(office, 0.3, 0.3, 0.04, M_WOOD, bx + 3.2, 0.5, 22.7, { cast: 1 }); cyl(office, 0.03, 0.2, 0.5, M_DARK, bx + 3.2, 0.25, 22.7); obs(bx + 2.95, 22.45, bx + 3.45, 22.95);
    plant(bx + 0.1 + (b === 0 ? 0.6 : 0), 23.1, 1.2);
    W.places.push({ name: HOODS[b % 8] + ' desks', x: bx + 3.2, z: 12.1 });
  }
  zone('window', 'Window Walk', HANG, 18.6, xE, D); zone('work', 'Workfloor', HANG, 0, xE, D);

  /* ---------------- COLLAB WING (x xE..L) ---------------- */
  const rooms = [{ id: 'thames', name: 'Thames Room', x0: xE, x1: xE + 8, door: [xE + 6.3, xE + 7.4], tw: 4.2, n: 3 }, { id: 'shard', name: 'Shard Room', x0: xE + 8, x1: L, door: [xE + 8.6, xE + 9.7], tw: 3.0, n: 2 }];
  glassZ(0, 6, xE); glassZ(0, 6, xE + 8);
  for (const r of rooms) {
    zone(r.id, r.name, r.x0, 0, r.x1, 6, true);
    r.gm = glassMat(); glassX(r.x0, r.door[0], 6, r.gm); r.leaf = doorFrameX(r.door[0], r.door[1], 6); glassX(r.door[1], r.x1, 6, r.gm); smartGlass.push({ m: r.gm, want: () => typeof roomDoc === 'function' && roomDoc(r.id).lock });
    const cx = (r.x0 + r.x1) / 2, cz = 3.3;
    { const sh = new T.Shape(), hw = r.tw / 2 - 0.65; sh.absarc(hw, 0, 0.65, -PI / 2, PI / 2, false); sh.absarc(-hw, 0, 0.65, PI / 2, PI * 1.5, false); const tg = new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 18 }); tg.rotateX(PI / 2); const tm = mesh(office, tg, M_WALNUT, cx, 0.77, cz, { cast: 1 }); }
    for (const sx of [-1, 1]) { rbox(office, 0.5, 0.06, 0.5, 0.02, M_BLACKM, cx + sx * (r.tw / 2 - 0.9), 0.03, cz); cyl(office, 0.05, 0.05, 0.68, M_BLACKM, cx + sx * (r.tw / 2 - 0.9), 0.38, cz); } obs(cx - r.tw / 2, cz - 0.65, cx + r.tw / 2, cz + 0.65);
    for (let i = 0; i < r.n; i++) { const x = cx + (i - (r.n - 1) / 2) * 1.15; meetChair(r.id + 'n' + i, x, cz - 1.05, 0); meetChair(r.id + 's' + i, x, cz + 1.05, PI); }
    meetChair(r.id + 'w', cx - r.tw / 2 - 0.45, cz, PI / 2); meetChair(r.id + 'e', cx + r.tw / 2 + 0.45, cz, -PI / 2);
    box(W.ext.n, 2.7, 1.55, 0.06, M_DARK, cx, 1.75, 0.03); W.dyn['scr_' + r.id] = dynTex(1024, 576); m = wallSign(W.dyn['scr_' + r.id], 2.56, 1.44, cx, 1.75, 0.065, 0); office.remove(m); W.ext.n.add(m); r.screenMesh = m;
    addPick({ x: cx, y: 1.7, z: 0.2, w: 2.7, h: 1.6, d: 0.4, label: r.name + ' screen: call, agenda, timer', ax: cx, az: 1.4, act: () => actions.meeting(r), near: 3.2 });
    box(office, r.x1 - r.x0 - 0.6, 0.012, 4.6, mat(0x3d4b5c, { roughness: 1 }), cx, 0.006, 3.2);
    pendant(cx - 0.8, cz, 'bar', 2.3); pendant(cx + 0.8, cz, 'bar', 2.3); plant(r.x1 - 0.55, 0.55, 1);
    const ds = r.sign = dynTex(512, 192); ds.draw((c, w, h) => { c.fillStyle = '#14202e'; rr(c, 0, 0, w, h, 20); c.fill(); c.fillStyle = '#fff'; c.font = '700 54px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.name, w / 2, h / 2 + 3); }); wallSign(ds, 1.5, 0.56, r.door[0] - 0.85, 1.78, 6.05, 0);
    W.places.push({ name: r.name, x: cx, z: 4.8 });
  }
  W.rooms = rooms; for (const r of rooms) blob((r.x0 + r.x1) / 2, 3.3, r.tw + 1.4, 3.2);
  roomLight(xE + 4, 3.2, .5); roomLight(xE + 12, 3.2, .5);
  // brainstorm studio
  zone('booth', 'Focus Booths', L - 2, 8.4, L, 13); zone('brain', 'Brainstorm Studio', xE, 6, L, 17.5); zone('collab', 'East Lounge', xE, 17.5, L, D);
  const rug = mesh(office, new T.CircleGeometry(4.2, 40), mat(0xffb627, { roughness: 1 }), xE + 7.2, 0.008, 11.6); rug.rotation.x = -PI / 2;
  for (const [k, bxc] of [['a', xE + 4.2], ['b', xE + 10.2]]) {
    box(office, 3.8, 1.7, 0.06, M_WHITE, bxc, 1.6, 8.5, { cast: 1 }); box(office, 3.9, 0.06, 0.1, M_STEEL, bxc, 0.72, 8.5);
    for (const sx of [-1.7, 1.7]) { box(office, 0.05, 2.4, 0.05, M_STEEL, bxc + sx, 1.2, 8.5); box(office, 0.06, 0.05, 0.7, M_STEEL, bxc + sx, 0.03, 8.5); }
    obs(bxc - 1.95, 8.35, bxc + 1.95, 8.65);
    W.dyn['board_' + k] = dynTex(1024, 448); wallSign(W.dyn['board_' + k], 3.7, 1.62, bxc, 1.6, 8.535, 0);
    addPick({ x: bxc, y: 1.6, z: 8.7, w: 3.8, h: 1.7, d: 0.4, label: k === 'a' ? 'Whiteboard: notes, pen and stickers' : 'Kanban board', ax: bxc, az: 9.9, act: () => (k === 'a' ? actions.board('studio-a', 'Whiteboard') : actions.panel('kanban')), near: 3 });
  }
  const pc = ['#2456ff', '#e0457b', '#1f9d6b', '#b04cff', '#ff7a45', '#0fa3b1'];
  holoGlobe(xE + 7.2, 11.7); for (let i = 0; i < 6; i++) { const a = PI * (0.15 + i * 0.14) + PI, px = xE + 7.2 + Math.cos(a) * 2.3, pz = 11.7 - Math.sin(a) * 2.3; pouf('idea' + i, px, pz, Math.atan2(xE + 7.2 - px, 11.7 - pz), pc[i]); }
  box(office, 2.4, 0.05, 0.9, M_WOOD, xE + 7.2, 1.05, 15.2, { cast: 1 }); for (const sx of [-1, 1]) box(office, 0.06, 1.03, 0.7, M_DARK, xE + 7.2 + sx * 1.05, 0.515, 15.2); obs(xE + 6, 14.75, xE + 8.4, 15.65);
  for (let i = 0; i < 4; i++) cyl(office, 0.03, 0.03, 0.12, mat(pc[i]), xE + 6.6 + i * 0.12, 1.14, 15.1);
  pendant(xE + 7.2, 15.2, 'bar', 2.4); pendant(xE + 4.2, 10.4, 'dome', 2.5); pendant(xE + 10.2, 10.4, 'dome', 2.5); roomLight(xE + 7.2, 11.5, .55);
  // focus booths on the east wall
  const felt = mat(0x33556b, { roughness: 1 });
  for (let i = 0; i < 2; i++) {
    const z0 = 8.6 + i * 2.2, zc = z0 + 0.9;
    box(office, 1.6, 2.3, 0.08, felt, L - 0.85, 1.15, z0, { cast: 1 }); box(office, 1.6, 2.3, 0.08, felt, L - 0.85, 1.15, z0 + 1.8, { cast: 1 }); box(office, 1.7, 0.08, 1.9, felt, L - 0.85, 2.3, zc, { cast: 1 });
    box(office, 0.5, 0.45, 1.5, mat(0xe0633a, { roughness: 1 }), L - 0.3, 0.25, zc); box(office, 0.3, 0.04, 1.0, M_WOOD, L - 1.35, 0.74, z0 + 0.3 + 0.5 * 0); box(office, 0.02, 0.12, 0.5, M_LAMP, L - 0.06, 1.9, zc);
    obs(L - 1.65, z0 - 0.05, L, z0 + 0.06); obs(L - 1.65, z0 + 1.74, L, z0 + 1.86); obs(L - 0.55, z0, L, z0 + 1.8);
    addSeat('booth' + i, L - 0.42, zc, -PI / 2, 'booth', 0.5);
  }
  sofa(xE + 7.2, 20.6, 0, 3, '#33556b', 'sofaE'); pouf('eastp0', xE + 4.6, 21.6, 0, '#ffb627'); pouf('eastp1', xE + 9.8, 21.6, 0, '#e0457b');
  box(office, 5.4, 0.012, 3.6, mat(0xe9e4d8, { roughness: 1 }), xE + 7.2, 0.007, 21.4);
  plant(L - 0.7, 23.2, 1.5);
  W.dyn.decide = dynTex(1024, 640); box(W.ext.e, 0.05, 2.0, 3.2, M_DARK, L - 0.03, 1.7, 15.4); m = wallSign(W.dyn.decide, 3.06, 1.9, L - 0.06, 1.7, 15.4, -PI / 2); office.remove(m); W.ext.e.add(m);
  addPick({ x: L - 0.2, y: 1.7, z: 15.4, w: 0.4, h: 2, d: 3.2, label: 'Decision board: GO or NO-GO', ax: L - 1.5, az: 15.4, act: () => actions.panel('decide'), near: 2.8 }); plant(xE + 0.7, 23.1, 1.1); plant(xE + 0.7, 7.2, 1.1); plant(L - 0.7, 7.0, 1.1);

  W.places.unshift({ name: 'Lobby and wins board', x: 12, z: 4 }, { name: 'Café', x: 4.8, z: 5.2 }, { name: 'Games Corner', x: 8, z: 12.6 }, { name: 'Skyline Lounge', x: 5.2, z: 21.4 });
  W.places.push({ name: 'Brainstorm Studio', x: xE + 7.2, z: 13.2 }, { name: 'Decision board', x: L - 1.6, z: 15.4 }, { name: 'Focus Booths', x: L - 2.6, z: 10.6 }, { name: 'East Lounge', x: xE + 7.2, z: 22.3 });

  buildRobot(); buildLiveBoard();
  buildShell(); W.anim.push((t, dt) => frostTick(dt || 0.016));
  W.batched = batchOffice();
  buildCustom(); if (typeof muralBuild === 'function') muralBuild();
  sun.target.position.set(L / 2, 0, D / 2);
  const sc = sun.shadow.camera; sc.left = -(L / 2 + 8); sc.right = L / 2 + 8; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 320; sc.updateProjectionMatrix();
  skyline.position.set(L / 2, 0, D);
  if (typeof realism === 'function') realism(); if (typeof tvBuild === 'function') tvBuild(); if (typeof roomBoards === 'function') roomBoards(); if (typeof buildCampus === 'function') buildCampus(); if (typeof hqExtras === 'function') hqExtras();
  buildNav();
}

/* ============================ navigation grid + A* ============================ */
const CELL = 0.4; let NX = 0, NZ = 0, grid = null;
function buildNav() {
  NX = Math.ceil(W.L / CELL); NZ = Math.ceil(D / CELL); grid = new Uint8Array(NX * NZ); const pad = 0.2;
  for (const o of W.obs) {
    const i0 = Math.max(0, Math.floor((o[0] - pad) / CELL)), i1 = Math.min(NX - 1, Math.floor((o[2] + pad) / CELL)), j0 = Math.max(0, Math.floor((o[1] - pad) / CELL)), j1 = Math.min(NZ - 1, Math.floor((o[3] + pad) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = (i + .5) * CELL, cz = (j + .5) * CELL; if (cx > o[0] - pad && cx < o[2] + pad && cz > o[1] - pad && cz < o[3] + pad) grid[j * NX + i] = 1; }
  }
}
function free(x, z) { const i = Math.floor(x / CELL), j = Math.floor(z / CELL); return i >= 0 && j >= 0 && i < NX && j < NZ && !grid[j * NX + i]; }
function nearestFree(x, z) {
  if (free(x, z)) return { x, z };
  const ci = clamp(Math.floor(x / CELL), 0, NX - 1), cj = clamp(Math.floor(z / CELL), 0, NZ - 1); let best = null, bd = 1e9;
  for (let r = 1; r < 14 && !best; r++) for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= NX || j >= NZ || grid[j * NX + i]) continue; const px = (i + .5) * CELL, pz = (j + .5) * CELL, d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = { x: px, z: pz }; }
  }
  return best || { x: 12, z: 4 };
}
function los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.15); for (let i = 1; i < n; i++) { const t = i / n; if (!free(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
function findPath(sx, sz, tx, tz) {
  const s = nearestFree(sx, sz), t = nearestFree(tx, tz);
  if (los(s.x, s.z, t.x, t.z)) return [t];
  const si = Math.floor(s.x / CELL) + Math.floor(s.z / CELL) * NX, ti = Math.floor(t.x / CELL) + Math.floor(t.z / CELL) * NX;
  const N = NX * NZ, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [], hv = i => Math.hypot((i % NX) - (ti % NX), Math.floor(i / NX) - Math.floor(ti / NX));
  const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break;[heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break;[heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  g[si] = 0; push(si, hv(si)); let found = false;
  while (heap.length) {
    const cur = pop()[1]; if (closed[cur]) continue; closed[cur] = 1; if (cur === ti) { found = true; break; }
    const ci = cur % NX, cj = (cur / NX) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue; const n = nj * NX + ni; if (grid[n] || closed[n]) continue;
      if (di && dj && (grid[cj * NX + ni] || grid[nj * NX + ci])) continue;
      const c = g[cur] + (di && dj ? 1.414 : 1); if (c < g[n]) { g[n] = c; from[n] = cur; push(n, c + hv(n)); }
    }
  }
  if (!found) return null;
  const pts = []; for (let c = ti; c !== -1; c = from[c]) pts.push({ x: ((c % NX) + .5) * CELL, z: (((c / NX) | 0) + .5) * CELL }); pts.reverse(); pts[pts.length - 1] = t;
  const out = []; let a = s, i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(a.x, a.z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); a = pts[j]; i = j; }
  if (!out.length) out.push(t); return out;
}

/* ============================ London outside the windows ============================ */
const skyline = new T.Group(); scene.add(skyline);       // origin = centre of the glass facade; +z is away from the office
const GROUND = -74; const sky = {};
(function buildLondon() {
  const g = skyline;
  // sky dome with a vertical gradient we recolour through the day
  const sg = new T.SphereGeometry(3800, 32, 16); sg.setAttribute('color', new T.BufferAttribute(new Float32Array(sg.attributes.position.count * 3), 3));
  sky.dome = new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); sky.dome.renderOrder = -1; scene.add(sky.dome);
  sky.sunDisc = new T.Mesh(new T.CircleGeometry(60, 24), new T.MeshBasicMaterial({ color: 0xfff4d6, fog: false, side: T.DoubleSide })); scene.add(sky.sunDisc);
  const gm = (typeof cityGroundMat === 'function' ? cityGroundMat() : mat(0x4a5057, { roughness: 1 })); const gr = new T.Mesh(new T.PlaneGeometry(9000, 9000), gm); gr.rotation.x = -PI / 2; gr.position.set(0, GROUND, 1500); g.add(gr);
  sky.river = new T.Mesh(new T.PlaneGeometry(9000, 150), new T.MeshStandardMaterial({ color: 0x5f7f96, roughness: 0.25, metalness: 0.5 })); sky.river.rotation.x = -PI / 2; sky.river.position.set(0, GROUND + 0.6, 220); g.add(sky.river);
  for (const z of [143, 297]) { const e = new T.Mesh(new T.BoxGeometry(9000, 5, 6), mat(0x8a8f96)); e.position.set(0, GROUND + 2, z); g.add(e); }
  // generic city blocks
  const wt = ctex(64, 128, (c, w, h) => { c.fillStyle = '#c9cdd2'; c.fillRect(0, 0, w, h); c.fillStyle = '#56667a'; for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) c.fillRect(x, y, 6, 6); });
  const et = ctex(64, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) if (rnd() > .45) { c.fillStyle = rnd() > .3 ? '#ffd98a' : '#cfe6ff'; c.fillRect(x, y, 6, 6); } });
  sky.bm = new T.MeshStandardMaterial({ map: wt, emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 0, roughness: .8 });
  const bg = new T.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0); const N = 620; const inst = new T.InstancedMesh(bg, sky.bm, N); const dm = new T.Object3D(), col = new T.Color();
  const land = [[60, 470, 60], [430, 560, 45], [500, 620, 45], [540, 500, 50], [600, 640, 45], [230, 440, 60], [-40, 335, 95], [-250, 325, 80], [-430, 320, 40], [-470, 380, 80]];
  let n = 0, tries = 0; seed = 99;
  while (n < N && tries++ < 6000) {
    const kind = rnd(), near = kind < 0.3, back = kind > 0.84; const z = back ? -70 - rnd() * 900 : near ? 26 + rnd() * 108 : 304 + rnd() * 1500, x = (rnd() - .5) * (near ? 1700 : back ? 2400 : 3600);
    if (land.some(l => Math.hypot(x - l[0], z - l[1]) < l[2])) continue;
    const w = 16 + rnd() * 34, d = 16 + rnd() * 30; let h = near ? 12 + rnd() * 30 : 16 + rnd() * 36; if (!near && rnd() > .84) h += 40 + rnd() * 90;
    dm.position.set(x, GROUND, z); dm.scale.set(w, h, d); dm.rotation.y = (rnd() - .5) * .5; dm.updateMatrix(); inst.setMatrixAt(n, dm.matrix);
    const v = .62 + rnd() * .38; col.setRGB(v, v * (.92 + rnd() * .08), v * (.84 + rnd() * .14)); inst.setColorAt(n, col); n++;
  }
  inst.count = n; g.add(inst);
  const stone = mat(0xd8cfbb), glassB = new T.MeshStandardMaterial({ map: ctex(64, 128, (c, w, h) => { c.fillStyle = '#7fa9c4'; c.fillRect(0, 0, w, h); c.fillStyle = '#9cc6de'; for (let y = 2; y < h; y += 6) c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(40,70,95,.5)'; for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 1, h); }, 3, 6), emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 0, roughness: .35, metalness: .1 }); sky.glassB = glassB;
  const dark = mat(0x3d444d), gold = mat(0xc9a66a);
  const add = (geom, m, x, y, z) => { const me = new T.Mesh(geom, m); me.position.set(x, GROUND + y, z); g.add(me); return me; };
  // The Shard
  add(new T.ConeGeometry(40, 306, 4), glassB, 230, 153, 440).rotation.y = PI / 4;
  // 30 St Mary Axe (the Gherkin)
  const prof = [[0, 0], [22, 0], [27, 45], [28, 80], [24, 125], [14, 160], [0, 180]].map(p => new T.Vector2(p[0], p[1]));
  add(new T.LatheGeometry(prof, 20), glassB, 430, 0, 560);
  // Leadenhall (Cheesegrater), Walkie Talkie, 22 Bishopsgate
  add(new T.CylinderGeometry(6, 30, 225, 4), glassB, 500, 112, 620).rotation.y = PI / 4;
  add(new T.CylinderGeometry(36, 26, 160, 4), glassB, 540, 80, 500).rotation.y = PI / 4;
  add(new T.BoxGeometry(46, 278, 40), glassB, 600, 139, 640);
  // St Paul's
  add(new T.BoxGeometry(70, 26, 38), stone, 60, 13, 470); add(new T.CylinderGeometry(15, 15, 26, 20), stone, 60, 39, 470);
  add(new T.SphereGeometry(16, 20, 10, 0, PI * 2, 0, PI / 2), mat(0x9fb0a6), 60, 52, 470); add(new T.CylinderGeometry(3, 3, 12, 8), stone, 60, 74, 470); add(new T.ConeGeometry(2, 8, 8), gold, 60, 84, 470);
  for (const sx of [-1, 1]) add(new T.BoxGeometry(9, 50, 9), stone, 90, 25, 470 + sx * 13);
  // Tate Modern
  add(new T.BoxGeometry(150, 30, 40), mat(0x7a5a45), -40, 15, 340); add(new T.BoxGeometry(12, 99, 12), mat(0x7a5a45), -40, 49, 318);
  // Elizabeth Tower (Big Ben) + Parliament
  add(new T.BoxGeometry(12, 70, 12), gold, -430, 35, 320); add(new T.BoxGeometry(15, 12, 15), stone, -430, 76, 320); add(new T.ConeGeometry(10, 22, 4), dark, -430, 93, 320).rotation.y = PI / 4;
  for (const zz of [-7.6, 7.6]) { const f = add(new T.CircleGeometry(4.6, 20), new T.MeshBasicMaterial({ color: 0xfff6dc }), -430, 76, 320 + zz); if (zz < 0) f.rotation.y = PI; }
  add(new T.BoxGeometry(60, 26, 150), gold, -480, 13, 390);
  // London Eye
  const eye = new T.Group(); eye.position.set(-250, GROUND + 70, 322); g.add(eye); sky.eye = eye;
  const wm = mat(0xf2f4f7); eye.add(new T.Mesh(new T.TorusGeometry(62, 0.9, 6, 64), wm)); eye.add(new T.Mesh(new T.TorusGeometry(58, 0.5, 6, 64), wm));
  for (let i = 0; i < 16; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 124, 4), wm); s.rotation.z = i * PI / 16; eye.add(s); }
  sky.pods = []; for (let i = 0; i < 32; i++) { const a = i * PI / 16; const p = new T.Mesh(new T.SphereGeometry(2.2, 8, 6), new T.MeshStandardMaterial({ color: 0xdfeaf2, emissive: 0xffe2a8, emissiveIntensity: 0 })); p.position.set(Math.cos(a) * 64.5, Math.sin(a) * 64.5, 0); eye.add(p); sky.pods.push(p); }
  for (const sx of [-1, 1]) { const leg = add(new T.CylinderGeometry(1.4, 1.8, 84, 6), wm, -250 + sx * 24, 36, 347); leg.rotation.z = sx * 0.33; leg.rotation.x = -0.32; }
  // Tower Bridge
  const tb = new T.Group(); tb.position.set(300, GROUND, 220); g.add(tb); const tbm = mat(0xb9ad98), tbb = mat(0x4f86b8);
  for (const sz of [-1, 1]) { const t = new T.Mesh(new T.BoxGeometry(16, 62, 14), tbm); t.position.set(0, 31, sz * 32); tb.add(t); const c = new T.Mesh(new T.ConeGeometry(11, 16, 4), dark); c.position.set(0, 70, sz * 32); c.rotation.y = PI / 4; tb.add(c); const pier = new T.Mesh(new T.BoxGeometry(22, 8, 20), tbm); pier.position.set(0, 3, sz * 32); tb.add(pier);
    const side = new T.Mesh(new T.BoxGeometry(8, 2, 50), tbb); side.position.set(0, 10, sz * 64); tb.add(side); const cab = new T.Mesh(new T.BoxGeometry(1, 1, 48), tbb); cab.position.set(0, 30, sz * 62); cab.rotation.x = sz * 0.55; tb.add(cab); }
  const deck = new T.Mesh(new T.BoxGeometry(9, 2, 52), tbm); deck.position.set(0, 10, 0); tb.add(deck); for (const sx of [-3, 3]) { const w = new T.Mesh(new T.BoxGeometry(2.5, 3, 52), tbb); w.position.set(sx, 44, 0); tb.add(w); }
  // other bridges, boats, clouds
  for (const x of [-340, -40, 110]) add(new T.BoxGeometry(12, 3, 160), mat(0xa9aeb5), x, 6, 220);
  sky.boats = []; for (let i = 0; i < 4; i++) { const b = add(new T.BoxGeometry(26, 4, 7), mat(i % 2 ? 0xf2f2f2 : 0xc8443c), -900 + i * 500, 3, 185 + i * 22); const cab = new T.Mesh(new T.BoxGeometry(12, 3, 5), M_WHITE); cab.position.y = 3.5; b.add(cab); b.userData.v = (i % 2 ? -1 : 1) * (9 + i * 3); sky.boats.push(b); }
  const ct = ctex(256, 128, (c, w, h) => { for (let i = 0; i < 9; i++) { const x = 50 + rnd() * 156, y = 50 + rnd() * 34, r = 26 + rnd() * 26; const gr2 = c.createRadialGradient(x, y, 2, x, y, r); gr2.addColorStop(0, 'rgba(255,255,255,.85)'); gr2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr2; c.fillRect(0, 0, w, h); } });
  sky.clouds = []; sky.cloudMat = new T.SpriteMaterial({ map: ct, transparent: true, opacity: .9, fog: false, depthWrite: false });
  for (let i = 0; i < 16; i++) { const s = new T.Sprite(sky.cloudMat); const sc = 500 + rnd() * 500; s.scale.set(sc, sc * .42, 1); s.position.set((rnd() - .5) * 5000, 260 + rnd() * 520, 900 + rnd() * 1700); g.add(s); sky.clouds.push(s); }
  seed = 7;
})();

/* time of day: h in 0..24 (London time) */
const KEY = [[0, '#070b1c', '#1a2240', 0.05, '#8fa6d9', .22, 1], [5, '#0d1430', '#3a3f66', 0.06, '#8fa6d9', .24, 1], [6.5, '#42609a', '#f3a56c', 0.5, '#ffc89a', .5, .7], [9, '#4f8fd6', '#d3e6f3', 1.0, '#fff3df', .78, .25], [16, '#4f8fd6', '#d9e7f0', 1.0, '#fff1d8', .78, .25], [18.5, '#3c4f86', '#f29163', 0.55, '#ffb07a', .5, .7], [20.5, '#0d1430', '#3a3f66', 0.06, '#8fa6d9', .25, 1], [24, '#070b1c', '#1a2240', 0.05, '#8fa6d9', .22, 1]];
const cA = new T.Color(), cB = new T.Color(), cTop = new T.Color(), cHor = new T.Color();
function setTimeOfDay(h) {
  let i = 0; while (i < KEY.length - 2 && h >= KEY[i + 1][0]) i++; const a = KEY[i], b = KEY[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  cTop.copy(cA.set(a[1])).lerp(cB.set(b[1]), t); cHor.copy(cA.set(a[2])).lerp(cB.set(b[2]), t); cTop.convertSRGBToLinear(); cHor.convertSRGBToLinear();
  const night = lerp(a[6], b[6], t); sky.night = night;
  const pos = sky.dome.geometry.attributes.position, colr = sky.dome.geometry.attributes.color, c = new T.Color();
  for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / 3800; c.copy(cHor).lerp(cTop, clamp(y * 2.2, 0, 1)); if (y < 0) c.copy(cHor).multiplyScalar(.85); colr.setXYZ(k, c.r, c.g, c.b); } colr.needsUpdate = true;
  scene.fog.color.copy(cHor); renderer.setClearColor(cHor);
  sun.intensity = lerp(a[3], b[3], t) * 1.15; sun.color.copy(cA.set(a[4])).lerp(cB.set(b[4]), t);
  hemi.intensity = lerp(a[5], b[5], t) * 0.66; for (const k in MC) MC[k].envMapIntensity = 0.45 * (1 - night * 0.6); hemi.color.copy(cTop).lerp(cA.set('#ffffff'), .6); amb.intensity = .16 + night * .06;
  const day = h > 6 && h < 20, ha = day ? ((h - 13) / 7) * (PI / 2) : 0.5, L = W.L || 50;
  sun.position.set(L / 2 - Math.sin(ha) * 110, day ? Math.max(14, Math.cos(ha) * 95) : 80, D + 30 + Math.cos(ha) * 60);
  sky.sunDisc.position.set(L / 2 - Math.sin(ha) * 2600, GROUND + (day ? Math.max(60, Math.cos(ha) * 1500) : 1300), D + 400 + Math.cos(ha) * 2400); sky.sunDisc.material.color.set(day ? (night > .5 ? 0xffc27a : 0xfff4d6) : 0xdfe6ff); sky.sunDisc.scale.setScalar(day ? 1 : .6);
  sky.bm.emissiveIntensity = night * 1.1; sky.glassB.emissiveIntensity = night * .8; sky.bm.color.setRGB(1 - night * .82, 1 - night * .8, 1 - night * .72); sky.glassB.color.copy(sky.bm.color); for (const p of sky.pods) p.material.emissiveIntensity = night * 1.5;
  sky.cloudMat.opacity = .9 - night * .6; sky.cloudMat.color.copy(cHor).lerp(cA.set('#ffffff'), 1 - night * .8);
  M_LAMP.emissiveIntensity = 1.1 + night * .8; M_LED.emissiveIntensity = 1.6 + night * 1.4; if (sky.tower) sky.tower.emissiveIntensity = night * .9, sky.tower.color.copy(sky.glassB.color); if (W.dyn.lights) for (const l of W.dyn.lights) l.intensity = .3 + night * 1.0;
  renderer.toneMappingExposure = 1.0 + night * .15; M_GLASS.opacity = .14 + night * .08;
}
function animateLondon(t, dt) {
  { const v = (typeof conf !== 'undefined' && conf && conf.view) !== 'sky'; if (skyline.visible !== v) skyline.visible = v; }
  if (RM) return; sky.eye.rotation.z = t * 0.035; for (const p of sky.pods) p.rotation.z = -sky.eye.rotation.z;
  for (const b of sky.boats) { b.position.x += b.userData.v * dt; if (b.position.x > 1500) b.position.x = -1500; if (b.position.x < -1500) b.position.x = 1500; }
  for (const c of sky.clouds) { c.position.x += dt * 6; if (c.position.x > 2600) c.position.x = -2600; }
}
