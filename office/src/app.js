/* ============================ app: state, storage, network ============================ */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('vo:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('vo:' + k, JSON.stringify(v)); } catch (e) { } }
};
/* optional children: null and false are skipped everywhere, so conditional UI never prints "null" */
for (const P of [Element.prototype, DocumentFragment.prototype]) for (const m of ['append', 'replaceChildren']) { const f = P[m]; if (f) P[m] = function (...k) { return f.apply(this, k.flat().filter(x => x != null && x !== false)); }; }
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) { const v = props[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.style.cssText = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const str = (v, n) => (typeof v === 'string' ? v : '').slice(0, n || 200);
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
function toast(text, o) {
  o = o || {}; const t = el('div', { class: 'toast island' }, el('span', { text }));
  if (o.action) t.append(el('button', { class: 'btn sm', text: o.action.label, onclick: () => { o.action.fn(); t.remove(); } }));
  $('#toasts').append(t); setTimeout(() => t.remove(), o.ms || 5200);
}

const saved = LS.get('me', null) || {};
const me = {
  uid: 'local', peer: null, pos: { x: 12, z: 4.4 }, ry: Math.PI, path: null, pending: null, seat: null, moving: false,
  emote: null, emoteT: 0, emN: 0, status: 'available', say: '', sayN: 0, scope: 'all', ping: null,
  name: str(saved.name, 40), role: str(saved.role, 40), cfg: cleanCfg(saved.cfg || DEF_CFG), desk: null, deskWant: saved.desk || null, deskT: saved.deskT || 0, item: num(saved.item, 0),
  teams: str(saved.teams, 120), tlink: str(saved.tlink, 300), prefs: { chat: !saved.prefs || saved.prefs.chat !== false, calls: !saved.prefs || saved.prefs.calls !== false }, face: validFace(saved.face) ? saved.face : '', game: null, side: null, removed: false, tb: null, pb: null,
  tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'; } catch (e) { return 'Europe/London'; } })(), mugUntil: 0, zone: null, av: null, dirty: false, loaded: false
};
const net = { db: null, user: null, room: null, assets: null, admin: true, live: false, names: {}, warned: false };
let conf = { name: 'StartDotCom HQ', bays: 3, req: true, reqTeams: true, chat: true, games: true, track: true };
function readConf(c) { c = c || {}; return { kind: (typeof PRESETS !== 'undefined' && Object.prototype.hasOwnProperty.call(PRESETS, c.kind)) ? c.kind : 'professional', view: c.view === 'sky' ? 'sky' : 'city', designed: c.designed === true, name: str(c.name, 32) || 'StartDotCom HQ', bays: clamp(Math.round(num(c.bays, 3)), 3, 8), req: c.req !== false, reqTeams: c.reqTeams === true, comms: c.comms === 'hq' ? 'hq' : 'both', notice: typeof c.notice === 'string' ? c.notice.slice(0, 200) : '', chat: c.chat !== false, games: c.games !== false, track: c.track !== false, teamLink: typeof c.teamLink === 'string' && /^https:\/\//.test(c.teamLink) ? c.teamLink.slice(0, 300) : '', approval: c.approval !== false, idleMin: clamp(Math.round(num(c.idleMin, 30)), 0, 240), idleSignOut: !!c.idleSignOut, accent: typeof c.accent === 'string' && /^#[0-9a-f]{6}$/i.test(c.accent) ? c.accent : '', tagline: str(c.tagline, 60), logo: typeof c.logo === 'string' && c.logo.length < 120000 && /^data:image\/(jpeg|png|webp);base64,/.test(c.logo) ? c.logo : '', allow: Array.isArray(c.allow) ? c.allow.filter(d => typeof d === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)).slice(0, 10) : [] }; }
const local = Object.assign({ tod: 'live', demo: false, quality: 'auto' }, LS.get('local', {}));

const COLS = ['people', 'office', 'chat', 'notes', 'files', 'kudos', 'games', 'rooms', 'wins', 'decisions', 'votes', 'cards', 'threads', 'dms', 'invites', 'gifts', 'feed', 'fcom', 'chans', 'rx', 'pins', 'mail', 'mailst', 'cal', 'rsvp', 'hdocs', 'pv', 'suite', 'courses', 'enrol', 'grades', 'hands', 'breakout'];
const Store = {
  db: null, data: {}, subs: {}, chain: {},
  col(n) { return this.data[n] || (this.data[n] = new Map()); },
  on(n, cb) { (this.subs[n] || (this.subs[n] = [])).push(cb); },
  emit(n) { for (const cb of (this.subs[n] || [])) { try { cb(this.col(n)); } catch (e) { console.error(e); } } },
  id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  fail(e) { if (!net.warned) { net.warned = true; toast(e && e.code === 'quota_exceeded' ? 'The office storage is full. Ask an admin to clear old notes or files.' : 'That change was not saved. You may have view-only access: ask the owner to make you a Contributor.', { ms: 9000 }); } },
  set(n, id, data) {
    if (this.db) { const p = n + '/' + id; this.chain[p] = (this.chain[p] || Promise.resolve()).then(() => this.db.doc(p).set(data)).catch(e => this.fail(e)); }
    else { this.col(n).set(id, data); this.persist(n); this.emit(n); }
  },
  del(n, id) {
    if (this.db) { const p = n + '/' + id; this.chain[p] = (this.chain[p] || Promise.resolve()).then(() => this.db.doc(p).delete()).catch(e => this.fail(e)); }
    else { this.col(n).delete(id); this.persist(n); this.emit(n); }
  },
  persist(n) { if (n !== 'files') LS.set('c:' + n, [...this.col(n)]); },
  loadLocal() { for (const n of COLS) { const a = LS.get('c:' + n, null); if (Array.isArray(a)) this.data[n] = new Map(a); } },
  attach(db) {
    this.db = db;
    for (const n of COLS) {
      this.data[n] = new Map(); this.emit(n);
      db.collection(n).onSnapshot(snap => { const m = new Map(); for (const d of snap.docs) m.set(d.id, d.data() || {}); this.data[n] = m; this.emit(n); }, () => { });
    }
  }
};
Store.loadLocal();

/* ---------- names: a typed nickname wins, otherwise the Zuchera profile name ---------- */
function nameOf(uid, nick) { if (nick) return str(nick, 40); if (uid === me.uid) return me.name || (net.names[uid] && net.names[uid].name) || 'You'; return (net.names[uid] && net.names[uid].name) || 'Teammate'; }
let nameTimer = 0;
function resolveNames() {
  if (!net.user) return; clearTimeout(nameTimer);
  nameTimer = setTimeout(async () => {
    const ids = new Set([...Store.col('people').keys()]); for (const p of peers.values()) if (p.uid) ids.add(p.uid); if (me.uid !== 'local') ids.add(me.uid);
    try { net.names = await net.user.profiles([...ids]); } catch (e) { }
    recomputeDesks(); refreshPanel(); renderChat();
  }, 300);
}

/* ---------- profile ---------- */
let profTimer = 0;
function saveProfile(quiet) {
  if (!quiet) me.dirty = true; LS.set('me', { name: me.name, role: me.role, cfg: me.cfg, desk: me.deskWant, deskT: me.deskT, item: me.item, teams: me.teams, tlink: me.tlink, prefs: me.prefs, face: me.face, vc: me.vc || null, alt: me.alt || null });
  clearTimeout(profTimer);
  profTimer = setTimeout(() => { if (Store.db && me.uid === 'local') return; Store.set('people', me.uid, { nm: me.name, role: me.role, av: me.cfg, desk: me.deskWant, deskT: me.deskT, item: me.item, tz: me.tz, teams: me.teams, tlink: me.tlink, prefs: me.prefs, att: me.att || null, hist: me.hist || null, req: me.req || null, vc: me.vc || null, alt: me.alt || null, clip: me.clip || null, t: Date.now() }); }, 700);
}
function applyProfile(p) {
  me.name = str(p.nm, 40); me.role = str(p.role, 40); me.alt = str(p.alt, 80); me.clip = typeof p.clip === 'string' && /^(https:|blob:)/.test(p.clip) ? p.clip.slice(0, 400) : ''; me.vc = typeof p.vc === 'string' ? p.vc.slice(0, 12) : null; me.cfg = cleanCfg(p.av); me.deskWant = str(p.desk, 8) || null; me.deskT = num(p.deskT, 0); me.item = clamp(num(p.item, 0), 0, 4);
  me.teams = str(p.teams, 120); me.tlink = str(p.tlink, 300); me.prefs = { chat: !p.prefs || p.prefs.chat !== false, calls: !p.prefs || p.prefs.calls !== false }; me.face = validFace(p.face) ? p.face : ''; me.vc = VOICES.includes(p.vc) ? p.vc : null;
  if (p.att && p.att.d === dayKey() && (!me.att || me.att.d !== dayKey())) { me.att = Object.assign({}, p.att); LS.set('att', me.att); }
  me.av.rebuild(me.cfg); me.av.setFace(me.face); LS.set('me', { name: me.name, role: me.role, cfg: me.cfg, desk: me.deskWant, deskT: me.deskT, item: me.item, teams: me.teams, tlink: me.tlink, prefs: me.prefs, face: me.face });
}

/* ---------- desks ---------- */
function recomputeDesks() {
  const people = Store.col('people'), assign = (Store.col('office').get('assign') || {}).map || {}, own = {};
  const rem = removedMap(); for (const d of W.desks) if (typeof assign[d.id] === 'string' && !rem[assign[d.id]]) own[d.id] = assign[d.id];
  const taken = new Set(Object.values(own)); const claims = [];
  for (const [uid, p] of people) if (p && typeof p.desk === 'string' && !taken.has(uid) && !rem[uid]) claims.push([num(p.deskT, 0), uid, p.desk]);
  claims.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
  for (const [, uid, id] of claims) { const d = W.desks.find(x => x.id === id); if (d && !d.priv && !own[id]) own[id] = uid; }
  me.desk = null;
  for (const d of W.desks) {
    const uid = own[d.id] || null, p = uid ? people.get(uid) : null, nm = uid ? nameOf(uid, p && p.nm) : '';
    if (uid === me.uid) me.desk = d;
    if (d.owner !== uid || d.ownerName !== nm) { d.owner = uid; d.ownerName = nm; drawPlate(d.plate, d.id, nm, d.col);
      if (d.door) d.door.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 24px ' + FONT_B; c.textBaseline = 'middle'; let t = 'Office ' + d.door.office + (nm ? ' · ' + nm : ''); while (c.measureText(t).width > w - 24 && t.length > 4) t = t.slice(0, -2); c.fillText(t, 12, h / 2 + 1); }); }
    setDeskItem(d, uid ? clamp(num(p && p.item, uid === me.uid ? me.item : 0), 0, 4) : -1);
  }
  $('#bDesk').textContent = me.desk ? 'My desk' : 'Pick a desk';
}

/* ============================ people in the room ============================ */
const peers = new Map();    // peer label -> {av, x, z, ry, tx, tz, ..., pres}
const npcs = [];
me.av = new Avatar(me.cfg); scene.add(me.av.g);

function seatById(id) { return W.seats.find(s => s.id === id) || null; }
function seatTaken(s) { for (const p of peers.values()) if (p.seat === s) return true; for (const n of npcs) if (n.seat === s) return true; return false; }
function inScope(sc, zid) { return !sc || sc === 'all' || sc === (me.zone && me.zone.id) || zid === 'all'; }

let twinSeen = null;
function syncPeers(list) {
  const seen = new Set();
  for (const pr of list) {
    if (pr.isMe || (pr.by && me.uid !== 'local' && pr.by === me.uid)) { if (pr.sameTab) me.peer = pr.peer; else if (pr.presence && typeof pr.presence.x === 'number') twinSeen = { d: pr.presence, at: Date.now() }; continue; }
    if (pr.kind === 'agent') continue;
    const d = pr.presence || {}; if (typeof d.x !== 'number') continue;
    if (pr.by) { const dup = list.find(o => o !== pr && o.by === pr.by && !o.isMe && o.presence && typeof o.presence.x === 'number' && (num(o.presence.la, 0) > num(d.la, 0) || (num(o.presence.la, 0) === num(d.la, 0) && String(o.peer) < String(pr.peer)))); if (dup) continue; }
    seen.add(pr.peer); let p = peers.get(pr.peer);
    const cfgKey = JSON.stringify(d.av || null);
    if (!p) { p = { av: new Avatar(d.av), x: num(d.x, 12), z: num(d.z, 4), ry: num(d.ry, 0), cfgKey, emN: num(d.emN, 0), sayN: num(d.sayN, 0), pingN: d.ping && num(d.ping.n, 0) || 0, emAt: -99, emote: null, joined: performance.now() };
      scene.add(p.av.g); p.av.g.position.set(p.x, 0, p.z);
      const hit = new T.Mesh(geo('phit', () => new T.BoxGeometry(0.7, 1.9, 0.7)), M_PICK); hit.position.y = 0.95; hit.visible = false; hit.userData.peer = pr.peer; p.av.g.add(hit); p.hit = hit; peers.set(pr.peer, p); v4NewPeer(p, pr); }
    else if (p.cfgKey !== cfgKey) { p.cfgKey = cfgKey; p.av.rebuild(d.av); }
    p.uid = pr.by || (typeof d.uid === 'string' ? d.uid.slice(0, 80) : null); p.guest = !!pr.guest;
    p.tx = clamp(num(d.x, p.x), 0, W.L); p.tz = clamp(num(d.z, p.z), 0, D); p.try = num(d.ry, 0);
    p.seat = d.seat ? seatById(str(d.seat, 24)) : null; p.status = STATUS[d.st] ? d.st : 'available'; p.wk = num(d.wk, 0) * 60; p.br = num(d.br, 0) * 60; p.game = d.gm === 'tt' || d.gm === 'pool' ? d.gm : null; p.tb = Array.isArray(d.tb) && d.tb.length === 4 ? d.tb.map(v => num(v, 0)) : null; p.pb = Array.isArray(d.pb) && d.pb.length === 32 ? d.pb.map(v => num(v, 99)) : null;
    { const pd = p.uid ? Store.col('people').get(p.uid) : null; p.av.setFace(pd && pd.face); } p.nick = str(d.nm, 40); p.role = str(d.role, 40); p.tzName = str(d.tz, 60);
    p.mug = !!d.mug; p.zid = str(d.zone, 24); p.pres = d;
    const emN = num(d.emN, 0); if (emN !== p.emN) { p.emN = emN; if (EMOJI[d.em]) { p.emote = d.em; p.emAt = performance.now(); p.av.popEmoji(EMOJI[d.em]); if (d.em === 'play') fx.ball = performance.now() + 4000; if (d.em === 'coffee') fx.steam = performance.now() + 4000; } }
    const sayN = num(d.sayN, 0); if (sayN !== p.sayN) { p.sayN = sayN; if (d.say && inScope(str(d.sc, 24)) && conf.chat && me.prefs.chat) p.av.say(str(d.say, 240)); }
    const pg = d.ping; if (pg && typeof pg === 'object' && num(pg.n, 0) !== p.pingN) { const fresh = p.pingN !== undefined || Date.now() - num(pg.n, 0) < 20000; p.pingN = num(pg.n, 0); if (fresh) v3Ping(p, pr.peer, pg); }
  }
  for (const [k, p] of peers) if (!seen.has(k)) { p.av.dispose(); peers.delete(k); }
  stripSig = ''; resolveNames();
}
function updatePeers(dt, t) {
  const now = performance.now();
  /* one person, many screens: this screen mirrors the one that was used most recently */
  if (twinSeen && Date.now() - twinSeen.at < 6000 && num(twinSeen.d.la, 0) > lastInput + 400 && !me.out) { const d = twinSeen.d; me.path = null; me.pending = null; const sd = d.seat ? seatById(str(d.seat, 24)) : null; if (sd) { if (me.seat !== sd) { me.seat = sd; me.pos.x = sd.x; me.pos.z = sd.z; me.ry = sd.ry; } } else { if (me.seat) stand(); me.pos.x = num(d.x, me.pos.x); me.pos.z = num(d.z, me.pos.z); me.ry = num(d.ry, me.ry); } }
  for (const p of peers.values()) {
    let moving = false;
    if (p.seat) { p.x = p.seat.x; p.z = p.seat.z; p.ry = p.seat.ry; }
    else { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz); if (d > 6) { p.x = p.tx; p.z = p.tz; } else if (d > 0.04) { const v = clamp(d * 2.4, 1.2, 4.2), sp = Math.min(d, v * dt); p.x += dx / d * sp; p.z += dz / d * sp; moving = d > 0.12; p.speed = lerp(p.speed || v, v, Math.min(1, dt * 4)); }
      let da = p.try - p.ry; da = Math.atan2(Math.sin(da), Math.cos(da)); p.ry += da * Math.min(1, dt * 10); }
    p.ox = p.ox || 0; p.oz = p.oz || 0; let px = 0, pz = 0;
    if (!p.seat) { const sep = (ax, az, w) => { const dx = p.x - ax, dz = p.z - az, d = Math.hypot(dx, dz); if (d < 0.62) { const k = (0.62 - d) * w / Math.max(d, 0.05); px += (d < 0.01 ? 0.3 : dx) * k; pz += dz * k; } };
      if (!me.seat) sep(me.pos.x, me.pos.z, 1); for (const o of peers.values()) if (o !== p && !o.seat) sep(o.x, o.z, 0.5); }
    p.ox = lerp(p.ox, clamp(px, -0.5, 0.5), Math.min(1, dt * 6)); p.oz = lerp(p.oz, clamp(pz, -0.5, 0.5), Math.min(1, dt * 6));
    p.av.g.position.set(p.x + p.ox, 0, p.z + p.oz); p.av.g.rotation.y = p.ry;
    p.av.update(dt, t, Object.assign({ moving, speed: p.speed, emoteN: p.emN, seat: p.seat, emote: p.emote, emoteAge: (now - p.emAt) / 1000, mug: p.mug, pose: p.game === 'tt' ? 'paddle' : p.game === 'pool' ? 'cue' : null }, v3AvPeer(p), v4AvPeer(p), v5AvPeer(p)));
    p.av.setLabel(nameOf(p.uid, p.nick), p.status, p.role, taskLabel(PRES(p).task));
  }
}

/* demo crowd: local-only stand-ins so a solo visitor can see the space in use. Never sent to anyone else. */
const DEMO = ['Demo: Ada', 'Demo: Kofi', 'Demo: Mei', 'Demo: Sam', 'Demo: Priya', 'Demo: Luca', 'Demo: Zainab', 'Demo: Tom', 'Demo: Aiko', 'Demo: Dayo'];
function setDemo(on) {
  local.demo = on; LS.set('local', local);
  while (npcs.length) npcs.pop().av.dispose();
  if (!on) return;
  DEMO.forEach((nm, i) => { const s = W.seats[(i * 13 + 5) % W.seats.length], f = nearestFree(s.ax, s.az); const n = { av: new Avatar(randomCfg()), x: f.x, z: f.z, ry: 0, path: null, seat: null, wait: 1 + i * 1.3, name: nm, emote: null, emAt: -99, goal: null }; n.av.setLabel(nm, ['available', 'meeting', 'idle', 'focus', 'break'][i % 5], 'preview only'); scene.add(n.av.g); npcs.push(n); });
}
function updateNpcs(dt, t) {
  const now = performance.now();
  for (const n of npcs) {
    let moving = false;
    if (n.path && n.path.length) { const p = n.path[0], dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz), sp = 1.4 * dt; if (d <= sp) { n.x = p.x; n.z = p.z; n.path.shift(); if (!n.path.length) { n.path = null; if (n.goal && !seatTaken(n.goal) && !(me.seat === n.goal)) { n.seat = n.goal; n.x = n.goal.x; n.z = n.goal.z; n.ry = n.goal.ry; } n.wait = 8 + Math.random() * 25; } } else { n.x += dx / d * sp; n.z += dz / d * sp; n.ry = Math.atan2(dx, dz); } moving = true; }
    else { n.wait -= dt; if (n.wait < 0) { if (Math.random() < 0.35 && !n.seat) { n.emote = ['wave', 'laugh', 'clap', 'thumbs'][Math.floor(Math.random() * 4)]; n.emAt = now; n.av.popEmoji(EMOJI[n.emote]); n.wait = 4; } else { const s = W.seats[Math.floor(Math.random() * W.seats.length)]; if (!seatTaken(s) && me.seat !== s) { if (n.seat) { const f = nearestFree(n.seat.ax, n.seat.az); n.x = f.x; n.z = f.z; n.seat = null; } n.goal = s; n.path = findPath(n.x, n.z, s.ax, s.az); } n.wait = 3; } } }
    n.av.g.position.set(n.x, 0, n.z); n.av.g.rotation.y = n.ry;
    n.av.update(dt, t, { moving, speed: 1.4, seat: n.seat, emote: n.emote, emoteN: n.emAt, emoteAge: (now - n.emAt) / 1000 });
  }
}

/* ============================ time helpers ============================ */
const fmtCache = {};
function tzHM(tz, date) {
  try { const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })); const p = f.formatToParts(date || new Date()); return { h: +p.find(x => x.type === 'hour').value % 24, m: +p.find(x => x.type === 'minute').value }; } catch (e) { return null; }
}
const two = n => String(n).padStart(2, '0');
function localTime(tz) { if (!tz) return ''; const t = tzHM(tz); return t ? two(t.h) + ':' + two(t.m) : ''; }
const city = tz => (tz || '').split('/').pop().replace(/_/g, ' ');
function londonHour() { const t = tzHM('Europe/London') || { h: 12, m: 0 }; return t.h + t.m / 60; }
function applyTod() { setTimeOfDay(local.tod === 'live' ? londonHour() : Number(local.tod)); }

/* ============================ movement, camera, input ============================ */
const cam = { yaw: 0.25, pitch: 0.36, dist: 11, fp: false, fpPitch: 0, tx: 12, ty: 1.25, tz: 4.4, mirror: null };
const keys = {}; const fx = { ball: 0, steam: 0, bell: 0 };
const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); };

function stand() { if (!me.seat) return; const f = nearestFree(me.seat.ax, me.seat.az); me.pos.x = f.x; me.pos.z = f.z; me.seat = null; }
function goTo(x, z, then) {
  if (me.seat) stand(); const p = findPath(me.pos.x, me.pos.z, x, z);
  if (!p) { toast("Can't find a way there. Try a spot on the open floor."); return; }
  me.path = p; me.pending = then || null;
}
function doSit(s) {
  if (seatTaken(s)) { toast('That seat is taken.'); return; }
  me.seat = s; me.path = null; me.pos.x = s.x; me.pos.z = s.z; me.ry = s.ry;
  if (s.kind === 'booth' && me.status !== 'focus') { setStatus('focus'); toast('Focus booth: your status is now Focusing.'); }
}
actions.sit = s => { if (me.seat === s) { stand(); return; } if (seatTaken(s)) { toast('That seat is taken.'); return; } if (Math.hypot(me.pos.x - s.ax, me.pos.z - s.az) < 1.1 && !me.seat) doSit(s); else goTo(s.ax, s.az, () => doSit(s)); };
function usePick(p) { if (p.seat) { p.act(); return; } if (Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < Math.max(1.3, p.near)) p.act(); else goTo(p.x, p.z, p.act); }
function nearestPick() { let best = null, bd = 1e9; for (const p of W.picks) { const ref = p.seat ? p.seat : p, d = Math.hypot(me.pos.x - ref.x, me.pos.z - ref.z); if (d < p.near && d < bd) { bd = d; best = p; } } return best; }

function moveMe(dt) {
  me.moving = false; const pos = me.pos; if (me.game || me.removed || me.out || !me.approved || actBusy()) return;
  const kx = ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0), kz = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0);
  if ((kx || kz) && !typing()) {
    if (me.seat) stand(); me.path = null; me.pending = null; if (me.act && actAge(me.act) < (ACT_DUR[me.act.k] || 2)) me.act = null;
    const fxx = Math.sin(cam.yaw), fzz = Math.cos(cam.yaw); let dx = fxx * kz - fzz * kx, dz = fzz * kz + fxx * kx; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    me.speed = keys.shift ? 3.0 : 1.6; const sp = me.speed * dt; if (free(pos.x + dx * sp, pos.z)) pos.x += dx * sp; if (free(pos.x, pos.z + dz * sp)) pos.z += dz * sp;
    me.ry = Math.atan2(dx, dz); me.moving = true;
  } else if (me.path && me.path.length) {
    let rem = 0, lx = pos.x, lz = pos.z; for (const q of me.path) { rem += Math.hypot(q.x - lx, q.z - lz); lx = q.x; lz = q.z; } me.speed = lerp(me.speed || 1.5, rem > 7 ? 2.9 : 1.5, Math.min(1, dt * 3));
    const p = me.path[0], dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz), sp = me.speed * dt;
    if (d <= sp) { pos.x = p.x; pos.z = p.z; me.path.shift(); if (!me.path.length) { me.path = null; const f = me.pending; me.pending = null; if (f) f(); } }
    else { pos.x += dx / d * sp; pos.z += dz / d * sp; let da = Math.atan2(dx, dz) - me.ry; da = Math.atan2(Math.sin(da), Math.cos(da)); me.ry += da * Math.min(1, dt * 14); }
    me.moving = true;
  }
}
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 8), seated = !!me.seat;
  cam.tx += (me.pos.x - cam.tx) * k; cam.tz += (me.pos.z - cam.tz) * k; cam.ty += ((seated ? 1.0 : 1.3) - cam.ty) * k;
  W.ext.ceil.visible = cam.fp; me.av.g.visible = !cam.fp && !me.out;
  if (cam.fp) {
    const ey = (seated ? me.seat.h + 0.72 : 1.62) * me.av.S; camera.position.set(me.pos.x, ey, me.pos.z);
    camera.lookAt(me.pos.x + Math.sin(cam.yaw) * Math.cos(cam.fpPitch), ey + Math.sin(cam.fpPitch), me.pos.z + Math.cos(cam.yaw) * Math.cos(cam.fpPitch));
    W.ext.n.visible = W.ext.w.visible = W.ext.e.visible = true;
  } else {
    const m = cam.mirror, yaw = m ? m.yaw : cam.yaw, pitch = m ? 0.12 : cam.pitch, dist = m ? 3.4 : cam.dist, cp = Math.cos(pitch);
    camera.position.set(cam.tx - Math.sin(yaw) * cp * dist, cam.ty + Math.sin(pitch) * dist, cam.tz - Math.cos(yaw) * cp * dist);
    camera.lookAt(cam.tx, cam.ty + (m ? -0.1 : 0), cam.tz);
    W.ext.n.visible = camera.position.z > 0.3; W.ext.w.visible = camera.position.x > 0.3; W.ext.e.visible = camera.position.x < W.L - 0.3;
  }
}

const ray = new T.Raycaster(), ndc = new T.Vector2(), floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), hitV = new T.Vector3();
function pickAt(cx, cy) {
  const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const targets = W.pickMeshes.concat([...peers.values()].map(p => p.hit)); const hits = ray.intersectObjects(targets, false);
  const fl = ray.ray.intersectPlane(floorPlane, hitV) ? { x: hitV.x, z: hitV.z, d: hitV.distanceTo(camera.position) } : null;
  if (hits.length) { const h = hits[0], u = h.object.userData; if (u.peer) return { peer: u.peer }; if (u.pick) return { pick: u.pick, fl }; }
  return { fl };
}
const ptr = new Map(); let dragAmt = 0, pinch = 0, hoverT = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragAmt = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } if (document.activeElement && document.activeElement !== canvas) document.activeElement.blur(); });
canvas.addEventListener('pointermove', e => {
  const p = ptr.get(e.pointerId);
  if (me.game && (!p || me.game === 'tt')) { gameAim(e.clientX, e.clientY); if (p) { p.x = e.clientX; p.y = e.clientY; dragAmt += 1; } return; }
  if (!p) { const now = performance.now(); if (now - hoverT < 70) return; hoverT = now; const h = pickAt(e.clientX, e.clientY), tip = $('#tip'); let label = h.pick ? h.pick.label : h.peer ? 'Say hi' : ''; if (h.pick && h.pick.seat && seatTaken(h.pick.seat)) label = 'Seat taken'; canvas.style.cursor = label ? 'pointer' : 'default'; tip.style.display = label ? 'block' : 'none'; if (label) { tip.textContent = label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; } return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptr.size === 1) { dragAmt += Math.abs(dx) + Math.abs(dy); if (dragAmt > 6) { cam.yaw -= dx * 0.0055; if (cam.fp) cam.fpPitch = clamp(cam.fpPitch - dy * 0.004, -1.1, 1.1); else cam.pitch = clamp(cam.pitch + dy * 0.004, 0.06, 1.48); } }
  else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 2.5, 70); pinch = d; dragAmt = 99; }
});
const endPtr = e => { const had = ptr.has(e.pointerId), n = ptr.size; ptr.delete(e.pointerId); if (had && n === 1 && (dragAmt <= 6 || me.game === 'tt') && e.type === 'pointerup') clickWorld(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', e => { e.preventDefault(); if (!cam.fp) cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 2.5, 70); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
function clickWorld(x, y) {
  if (gameClick(x, y)) return;
  const h = pickAt(x, y);
  if (h.peer) { openPerson(h.peer); return; }
  if (h.pick) { usePick(h.pick); return; }
  if (h.fl && h.fl.x > -1 && h.fl.x < W.L + 1 && h.fl.z > -1 && h.fl.z < D + 1) { const f = nearestFree(clamp(h.fl.x, 0.3, W.L - 0.3), clamp(h.fl.z, 0.3, D - 0.3)); goTo(f.x, f.z); }
}
addEventListener('keydown', e => {
  if (typing()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === 'e') { const p = nearestPick(); if (me.seat && (!p || p.seat === me.seat)) stand(); else if (p) usePick(p); }
  else if (k === 'enter') { $('#chat').classList.remove('min'); $('#chatIn').focus(); e.preventDefault(); }
  else if (k === 'v') toggleView(); else if (k === 'escape') { if (drawer.id) closeDrawer(); else if (me.game) leaveGame(); else if (me.seat) stand(); }
  else if (k >= '1' && k <= '6') doEmote(['wave', 'clap', 'laugh', 'thumbs', 'dance', 'heart'][+k - 1]);
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function toggleView() { cam.fp = !cam.fp; cam.fpPitch = 0; if (cam.fp) cam.yaw = me.ry; $('#bView').textContent = cam.fp ? 'Overview' : 'Eye level'; $('#bView').classList.toggle('on', cam.fp); }

function doEmote(e) { me.emote = e; me.emoteT = performance.now(); me.emN++; me.av.popEmoji(EMOJI[e]); if (e === 'play') fx.ball = performance.now() + 4000; }
function setStatus(s) { me.status = s; $('#status').value = s; }

/* ============================ wall displays ============================ */
function drawSign() {
  W.dyn.sign.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); c.fillStyle = '#2456ff'; rr(c, 48, 62, 132, 132, 34); c.fill(); c.fillStyle = '#fff'; c.font = '700 96px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((conf.name || 'S').trim().charAt(0).toUpperCase(), 114, 134);
    c.textAlign = 'left'; c.font = '700 92px ' + FONT_D; let t = conf.name; while (c.measureText(t).width > w - 270 && t.length > 3) t = t.slice(0, -2); c.fillText(t, 220, 108); c.fillStyle = '#ffb627'; c.font = '600 40px ' + FONT_B; c.fillText('Virtual HQ · London · ' + W.desks.length + ' desks', 222, 190); });
  $('#teamName').textContent = conf.name; $('#brandDot').textContent = (conf.name || 'S').trim().charAt(0).toUpperCase(); document.title = conf.name;
}
function teamZones() { const z = ['Europe/London']; for (const p of Store.col('people').values()) if (p && typeof p.tz === 'string' && tzHM(p.tz) && !z.includes(p.tz)) z.push(p.tz); for (const d of [me.tz, 'Africa/Lagos', 'America/New_York', 'Asia/Kolkata', 'America/Los_Angeles']) if (z.length < 5 && !z.includes(d) && tzHM(d)) z.push(d); return z.slice(0, 5); }
function drawClocks() {
  const zs = teamZones(), now = new Date();
  W.dyn.clocks.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); const sw = w / zs.length;
    zs.forEach((tz, i) => { const t = tzHM(tz, now), cx = sw * i + sw / 2, cy = 100, r = 66, day = t.h >= 7 && t.h < 19; c.fillStyle = day ? '#fdfaf0' : '#2b3a52'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.strokeStyle = day ? '#14202e' : '#dfe6f2'; c.lineCap = 'round';
      for (let k = 0; k < 12; k++) { const a = k * PI / 6; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + Math.sin(a) * (r - 9), cy - Math.cos(a) * (r - 9)); c.lineTo(cx + Math.sin(a) * (r - 3), cy - Math.cos(a) * (r - 3)); c.stroke(); }
      const ha = ((t.h % 12) + t.m / 60) * PI / 6, ma = t.m * PI / 30; c.lineWidth = 7; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(ha) * 34, cy - Math.cos(ha) * 34); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(ma) * 52, cy - Math.cos(ma) * 52); c.stroke();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 30px ' + FONT_B; c.fillText(city(tz), cx, 206, sw - 16); c.fillStyle = '#ffb627'; c.font = '600 26px ' + FONT_B; c.fillText(two(t.h) + ':' + two(t.m), cx, 238); }); });
}
const NOTE_COL = ['#ffe27a', '#ffb3a1', '#b9e6c9', '#b8d4ff', '#e3c6ff'];
function notesOf(board) { return [...Store.col('notes')].filter(([, n]) => n && n.board === board); }
function drawKudos() {
  const ks = [...Store.col('kudos').values()].filter(Boolean).sort((a, b) => num(b.t, 0) - num(a.t, 0)).slice(0, 6);
  W.dyn.kudos.draw((c, w, h) => { c.fillStyle = '#fff7e2'; c.fillRect(0, 0, w, h); c.fillStyle = '#14202e'; c.font = '700 58px ' + FONT_D; c.textBaseline = 'top'; c.fillText('Kudos wall', 36, 26); c.font = '600 26px ' + FONT_B; c.fillStyle = '#4a5a6c'; c.fillText(ks.length ? 'Thanks and wins from the team' : 'No kudos yet. Thank someone for something they did this week.', 38, 96);
    ks.forEach((k, i) => { const x = 36 + (i % 3) * 322, y = 150 + Math.floor(i / 3) * 176; c.fillStyle = ['#ffd9cf', '#d8ecff', '#dff3e4'][i % 3]; rr(c, x, y, 304, 160, 18); c.fill(); c.fillStyle = '#14202e'; c.font = '700 26px ' + FONT_B; c.fillText('To ' + str(k.to, 22), x + 16, y + 14, 272); c.font = '500 21px ' + FONT_B; wrapText(c, str(k.text, 140), 272, 3).forEach((l, j) => c.fillText(l, x + 16, y + 52 + j * 26)); c.fillStyle = '#4a5a6c'; c.font = '600 18px ' + FONT_B; c.fillText('from ' + nameOf(k.by, k.nm), x + 16, y + 132, 272); }); });
}
const C4_EMPTY = '.'.repeat(42);
function c4State() { const g = Store.col('games').get('c4') || {}; return { b: typeof g.b === 'string' && g.b.length === 42 ? g.b : C4_EMPTY, turn: g.turn === 'y' ? 'y' : 'r', r: g.r || null, y: g.y || null, win: g.win || null }; }
function drawC4() { const s = c4State(); W.dyn.c4.draw((c, w, h) => { c.fillStyle = '#2456ff'; c.fillRect(0, 0, w, h); for (let r = 0; r < 6; r++) for (let q = 0; q < 7; q++) { const v = s.b[r * 7 + q]; c.fillStyle = v === 'r' ? '#ff4d4d' : v === 'y' ? '#ffd23f' : '#eaf0fb'; c.beginPath(); c.arc(22 + q * 35.5, 24 + r * 35.5, 14, 0, 7); c.fill(); } }); }
const ICE = ['What is the best thing you ate this week?', 'What is on your desk right now that makes you smile?', 'Which city would you work from for a month?', 'What is a small win from this week?', 'What song gets you through a long build?', 'What did you want to be when you were ten?', 'What is the view from your window today?', 'Tea, coffee or something else entirely?', 'What is one skill you would like to learn from a teammate?', 'What was your first job?', 'What is a film you can watch again and again?', 'Early bird or night owl, and is that by choice?', 'What is the most useful thing you bought this year?', 'What local dish should the whole team try?', 'What is your go-to way to switch off after work?', 'Which app could you not work without?', 'What is something you are proud of that is not on your CV?', 'If the team had a mascot, what would it be?', 'What is the best advice you have been given?', 'What would you build if you had a free week?'];
function iceQ() { const g = Store.col('games').get('ice') || {}; return ICE[clamp(Math.round(num(g.i, 0)), 0, ICE.length - 1)]; }
function drawIce() { W.dyn.ice.draw((c, w, h) => { c.fillStyle = '#2a124a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb627'; c.font = '700 44px ' + FONT_D; c.textBaseline = 'top'; c.fillText('Icebreaker', 28, 26); c.fillStyle = '#fff'; c.font = '600 40px ' + FONT_B; wrapText(c, iceQ(), w - 56, 6).forEach((l, i) => c.fillText(l, 28, 100 + i * 48)); }); }
function redrawAll() { drawSign(); drawClocks(); drawBoards(); drawKudos(); drawC4(); drawIce(); drawScreens(); redrawExtra(); }

/* ============================ drawer + panels ============================ */
const drawer = { id: null, update: null, onClose: null };
function openDrawer(id, title, wide, build) {
  if (drawer.onClose) drawer.onClose(); drawer.onClose = null;
  const b = $('#drawerBody'); b.replaceChildren(); $('#drawerT').textContent = title; $('#drawer').classList.add('open'); $('#drawer').classList.toggle('wide', !!wide);
  drawer.id = id; drawer.update = build(b) || null; b.scrollTop = 0;
}
function closeDrawer() { if (drawer.onClose) drawer.onClose(); drawer.onClose = null; drawer.id = null; drawer.update = null; $('#drawer').classList.remove('open'); canvas.focus(); }
/* Redraws never run while the person is pressing, scrolling or typing in the drawer: they are deferred and scroll position is kept. */
let dwBusy = 0, dwPend = null, dwDown = false;
{ const d = () => $('#drawerBody'); const mark = () => { dwBusy = Date.now(); };
  addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#drawer')) { dwDown = true; mark(); } }, true);
  addEventListener('pointerup', () => { dwDown = false; mark(); }, true); addEventListener('pointercancel', () => { dwDown = false; }, true);
  addEventListener('wheel', e => { if (e.target.closest && e.target.closest('#drawer')) mark(); }, { passive: true, capture: true });
  addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('#drawer')) mark(); }, { passive: true, capture: true });
  addEventListener('scroll', e => { if (e.target && e.target.closest && e.target.closest('#drawer')) mark(); }, true);
  setInterval(() => { if (dwPend && !dwHold()) { const f = dwPend; dwPend = null; f(); } }, 400); }
function dwHold() { const a = document.activeElement; return dwDown || Date.now() - dwBusy < 1200 || (a && a.closest && a.closest('#drawerBody') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value !== ''); }
function refreshPanel(id) { if (!(drawer.id && (!id || drawer.id === id || drawer.id.startsWith(id + ':')) && drawer.update)) return; const run = () => { const b = $('#drawerBody'), st = b.scrollTop; drawer.update(); b.scrollTop = st; }; if (dwHold()) { dwPend = run; return; } run(); }
$('#drawerX').onclick = closeDrawer;
const field = (label, input) => el('div', { class: 'field' }, el('label', { text: label, for: input.id }), input);
function chips(label, opts, get, set) { const box = el('div', { class: 'chips' }); const draw = () => box.replaceChildren(...opts.map((o, i) => el('button', { type: 'button', class: get() === i ? 'sel' : '', text: o, onclick: () => { set(i); draw(); } }))); draw(); return el('div', { class: 'field' }, el('span', { class: 'lbl', text: label }), box); }
function swatches(label, cols, get, set) { const box = el('div', { class: 'sw' }); const draw = () => box.replaceChildren(...cols.map((c, i) => el('button', { type: 'button', class: get() === i ? 'sel' : '', style: 'background:' + c, title: label + ' ' + (i + 1), 'aria-label': label + ' ' + (i + 1), onclick: () => { set(i); draw(); } }))); draw(); return el('div', { class: 'field' }, el('span', { class: 'lbl', text: label }), box); }

const panels = {
  avatar(b) {
    const ch = (k, v) => { me.cfg[k] = v; me.av.rebuild(me.cfg); saveProfile(); };
    cam.mirror = { yaw: me.ry + PI }; if (cam.fp) toggleView(); drawer.onClose = () => { cam.mirror = null; };
    const nm = el('input', { id: 'fName', type: 'text', maxLength: 40, value: me.name, placeholder: (net.names[me.uid] && net.names[me.uid].name) || 'What should teammates call you?', oninput: e => { me.name = e.target.value.trim(); saveProfile(); recomputeDesks(); } });
    const rl = el('input', { id: 'fRole', type: 'text', maxLength: 40, value: me.role, placeholder: 'e.g. Product manager', oninput: e => { me.role = e.target.value.trim(); saveProfile(); } });
    const ht = el('input', { id: 'fHt', type: 'range', min: 0.88, max: 1.12, step: 0.01, value: me.cfg.ht, oninput: e => ch('ht', +e.target.value) });
    b.append(el('p', { text: 'Build your office twin. Changes show on your avatar straight away and teammates see them live.' }), el('button', { class: 'btn ghost', text: 'Edit my details, Teams ID and call settings', onclick: () => showSetup(true) }), facePicker(), outlookCard(), field('Display name', nm), field('Job title', rl),
      swatches('Skin tone', SKIN, () => me.cfg.skin, v => ch('skin', v)), swatches('Deeper skin depth (realistic people)', ['#e9c9ac'].concat(TONE_SW.slice(1)), () => me.cfg.tone, v => ch('tone', v)), swatches('Outfit colour', TINT_SW, () => me.cfg.otint, v => ch('otint', v)), swatches('Hair colour (realistic people)', ['#c9b89a', '#1b1410', '#5a3a1e', '#8b5e34', '#c9a050', '#7a3320', '#8d8f95', '#e4e4e8', '#6b4aa0'], () => me.cfg.htint, v => ch('htint', v)), chips('Build', BUILDS, () => me.cfg.build, v => ch('build', v)), chips('Figure', FIGS, () => me.cfg.fig, v => ch('fig', v)), swatches('Eye colour', EYEC, () => me.cfg.eye, v => ch('eye', v)), field('Height', ht),
      chips('Hair / headwear', HAIRS, () => me.cfg.hair, v => ch('hair', v)), swatches('Hair / headwear colour', HAIRC, () => me.cfg.hairC, v => ch('hairC', v)),
      chips('Facial hair', BEARDS, () => me.cfg.beard, v => ch('beard', v)), chips('Glasses', GLASSES, () => me.cfg.glasses, v => ch('glasses', v)),
      chips('Top', TOPS, () => me.cfg.top, v => ch('top', v)), swatches('Top colour', TOPC, () => me.cfg.topC, v => ch('topC', v)),
      chips('Bottom', BOTS, () => me.cfg.bot, v => ch('bot', v)), chips('Company lanyard', ['Off', 'On'], () => me.cfg.lan, v => ch('lan', v)), swatches('Bottom colour', BOTC, () => me.cfg.botC, v => ch('botC', v)),
      el('div', { class: 'row' }, el('button', { class: 'btn ghost', text: 'Surprise me', onclick: () => { me.cfg = cleanCfg(randomCfg()); me.av.rebuild(me.cfg); saveProfile(); openPanel('avatar'); } }), el('button', { class: 'btn', text: 'Done', onclick: closeDrawer })));
  },
  people(b) {
    const sum = el('div', { class: 'card' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    b.append(el('p', { text: 'Blue bars show each person\'s 9:00 to 18:00 working day laid over London time. The yellow box is now.' }), sum, list);
    return () => {
      const rows = [], seen = new Set(), ld = Math.floor(londonHour());
      const add = (uid, nick, role, tz, online, status, zid, peer) => { rows.push({ uid, nm: nameOf(uid, nick), role, tz, online, status, zid, peer }); if (uid) seen.add(uid); };
      add(me.uid, me.name, me.role, me.tz, true, me.status, me.zone && me.zone.name, null);
      for (const [k, p] of peers) add(p.uid, p.nick, p.role, p.tzName, true, p.status, (W.zones.find(z => z.id === p.zid) || {}).name, k);
      for (const [uid, p] of Store.col('people')) if (!seen.has(uid) && p) add(uid, str(p.nm, 40), str(p.role, 40), str(p.tz, 60), false, 'off');
      const base = new Date(); base.setUTCMinutes(0, 0, 0); const lNow = tzHM('Europe/London', base).h;
      const work = r => { const out = []; for (let i = 0; i < 24; i++) { const t = tzHM(r.tz || 'Europe/London', new Date(base.getTime() + (i - lNow) * 3600e3)); out.push(!!t && t.h >= 9 && t.h < 18); } return out; };
      const all = rows.map(work), ov = []; for (let i = 0; i < 24; i++) if (all.every(a => a[i])) ov.push(i);
      sum.replaceChildren(el('b', { text: rows.length < 2 ? 'Shared working hours appear here once teammates join.' : ov.length ? 'Everyone overlaps ' + two(ov[0]) + ':00 to ' + two(ov[ov.length - 1] + 1) + ':00 London time.' : 'No hour where all ' + rows.length + ' people are within 9:00 to 18:00. Rotate meeting times.' }), el('span', { class: 'meta', text: rows.filter(r => r.online).length + ' in the office now · ' + rows.length + ' on the team' }));
      list.replaceChildren(...rows.map((r, i) => { const st = STATUS[r.status];
        return el('div', { class: 'card person' }, el('div', { class: 'av', style: 'background:' + HOOD_COL[i % 8], text: r.nm.charAt(0).toUpperCase() }),
          el('div', {}, el('div', { class: 'nm', text: r.nm + (r.uid === me.uid ? ' (you)' : '') }), el('div', { class: 'sub', text: [r.role, r.tz ? localTime(r.tz) + ' in ' + city(r.tz) : ''].filter(Boolean).join(' · ') })),
          el('div', {}, el('span', { class: 'pill ' + r.status }, el('i'), r.online ? (st ? st[1] : '') + (r.zid ? ' · ' + r.zid : '') : 'Not in the office')),
          el('div', { class: 'hours', title: 'Working hours on the London clock' }, ...all[i].map((w, h) => el('i', { class: (w ? 'w' : '') + (h === ld ? ' now' : '') }))),
          r.peer ? el('div', { class: 'row', style: 'grid-column:1/-1' }, el('button', { class: 'btn sm ghost', text: 'Walk over', onclick: () => walkToPeer(r.peer) }), el('button', { class: 'btn sm ghost', text: 'Wave 👋', onclick: () => wavePeer(r.peer) })) : null); }));
    };
  },
  places(b) { b.append(el('p', { text: 'Pick a place and your avatar walks there.' }), ...W.places.map(p => el('button', { class: 'btn ghost', style: 'text-align:left', text: p.name, onclick: () => { goTo(p.x, p.z); closeDrawer(); } }))); },
  settings(b) {
    const tod = el('select', { id: 'fTod', onchange: e => { local.tod = e.target.value; LS.set('local', local); applyTod(); } }, ...[['live', 'Live London time'], ['8', 'Morning'], ['13', 'Midday'], ['18.3', 'Golden hour'], ['22', 'Night']].map(([v, t]) => el('option', { value: v, text: t, selected: String(local.tod) === v })));
    const demo = el('input', { id: 'fDemo', type: 'checkbox', checked: local.demo, onchange: e => setDemo(e.target.checked) });
    const ql = el('select', { id: 'fQual', onchange: e => setQuality(e.target.value) }, el('option', { value: 'lite', text: 'Lite (older laptops and tablets: no shadows)', selected: local.quality === 'lite' }), el('option', { value: 'standard', text: 'Standard (most laptops)', selected: local.quality !== 'high' && local.quality !== 'lite' }), el('option', { value: 'high', text: 'High (sharper image and finer shadows; needs a good graphics card)', selected: local.quality === 'high' }));
    b.append(el('h3', { text: 'Your view' }), field('Sky outside', tod), field('Graphics quality', ql), el('label', { class: 'row', for: 'fDemo' }, demo, 'Show a demo crowd (only you see it, for previewing the space)'));
    if (net.admin) b.append(el('h3', { text: 'Office' }), el('button', { class: 'btn', text: 'Open the Admin panel', onclick: () => openPanel('admin') }));
    b.append(el('h3', { text: 'Who can get in' }), el('p', { text: net.live ? 'Only people you share this office with through Zuchera can open it, and they must be signed in. There are no anonymous visitors or bots. Contributors can chat, post notes and upload files; Viewers can only look around.' : 'You are in a solo preview on this device. Nothing leaves your browser. Open the shared link from Zuchera to work with teammates live.' }),
      el('p', { text: 'Chat, notes, kudos and files are visible to everyone you share the office with. Do not post passwords or keys.' }));
  },
  help(b) {
    const k = (a, t) => [el('span', {}, ...a.map(x => el('kbd', { text: x })).flatMap((n, i) => i ? [' ', n] : [n])), el('span', { text: t })];
    b.append(el('div', { class: 'keys' }, ...k(['Click floor'], 'Walk there'), ...k(['W', 'A', 'S', 'D'], 'Walk (hold Shift to jog)'), ...k(['Drag'], 'Look around'), ...k(['Scroll'], 'Zoom'), ...k(['E'], 'Use what is next to you: sit, open a board, make coffee'), ...k(['V'], 'Switch to eye-level view'), ...k(['Enter'], 'Chat'), ...k(['1', '…', '6'], 'Reactions'), ...k(['Esc'], 'Close panel or stand up')),
      el('h3', { text: 'Things to try' }), el('p', { text: 'Claim a desk. Post ideas on the whiteboards in the Brainstorm Studio. Pin a call link on a meeting-room screen. Thank a teammate on the Kudos wall. Ring the bell on the wins board in the lobby. Vote GO or NO-GO on the decision board. Run the kanban board. Play pool, table tennis or Connect Four in the Games Corner. Sit by the window and watch the London Eye turn.' }),
      el('h3', { text: 'Voice and video' }), el('h3', { text: 'Actions' }), el('p', { text: 'Open Actions in the toolbar for gestures (wave, cheer, dance and more), moves (jump, backflip, kick, push-ups, climbing wall) and things you do with someone next to you: hug, handshake, high five. They accept first. Click anyone to tap them on the shoulder.' }),
      el('p', { text: 'Everything you need to work is built in, so the office keeps going when outside email or chat is down. 💬 Talk (Ctrl+K) has channels, direct and group chats, files, polls, reactions and @mentions. 🗂 Work (Ctrl+J) has HQ Mail, the Calendar, shared Documents and the Continuity centre. In the self-hosted office, 🎧 Voice lets you talk to whoever is near you, 📞 Call on anyone\'s card rings them for voice or video with screen sharing, meeting rooms have their own call, and 🎤 records voice notes. Hold 🎙 Talk (or T) to speak a message. DOT, the robot, tells you what needs your attention.' }));
  },
  files(b) {
    const inp = el('input', { id: 'fFile', type: 'file' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }), msg = el('p', {});
    const up = el('button', { class: 'btn', text: 'Upload to Team Drive', onclick: async () => {
      const f = inp.files && inp.files[0]; if (!f) { msg.textContent = 'Choose a file first.'; return; } if (f.size > (typeof MAX_UP === "function" ? MAX_UP() : 20 * 1048576)) { msg.textContent = 'That file is over the upload limit.'; return; }
      up.disabled = true; msg.textContent = 'Uploading…';
      try { let asset = null, url = null; if (Store.db) { if (!net.assets) throw new Error('no-assets'); const r = await net.assets.upload(f); asset = r.id; url = r.url; } else url = URL.createObjectURL(f);
        Store.set('files', Store.id(), { name: str(f.name, 120), size: f.size, type: str(f.type, 80), asset, url, by: me.uid, nm: me.name, t: Date.now() }); msg.textContent = 'Uploaded.'; inp.value = ''; }
      catch (e) { msg.textContent = e.message === 'no-assets' ? 'Uploads are not available for your access level here. Ask the owner to make you a Contributor.' : 'Upload failed. Supported: images, PDF, video, CSV, Markdown, JSON and text, up to 20 MB.'; }
      up.disabled = false; } });
    b.append(el('p', { text: 'Shared files for the whole office. Images, PDFs, video, CSV, Markdown, JSON and text up to 20 MB.' + (Store.db ? '' : ' In solo preview, files stay in this browser tab only.') }), field('File', inp), el('div', { class: 'row' }, up), msg, list);
    return () => { const fs = [...Store.col('files')].filter(([, f]) => f).sort((a, b2) => num(b2[1].t, 0) - num(a[1].t, 0));
      list.replaceChildren(...(fs.length ? fs.map(([id, f]) => { const href = f.asset ? '/_blob/' + encodeURIComponent(str(f.asset, 200)) : (typeof f.url === 'string' && f.url.startsWith('blob:') ? f.url : null);
        return el('div', { class: 'card' }, el('b', { text: str(f.name, 120) }), el('span', { class: 'meta', text: (num(f.size, 0) / 1024 < 1024 ? Math.max(1, Math.round(num(f.size, 0) / 1024)) + ' KB' : (num(f.size, 0) / 1048576).toFixed(1) + ' MB') + ' · from ' + nameOf(f.by, f.nm) + ' · ' + new Date(num(f.t, 0)).toLocaleDateString() }),
          el('div', { class: 'row' }, href ? el('a', { class: 'btn sm ghost', href, target: '_blank', rel: 'noopener', text: 'Open' }) : null, (f.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Remove', onclick: async () => { if (f.asset && net.assets) { try { await net.assets.delete(f.asset); } catch (e) { } } Store.del('files', id); } }) : null)); }) : [el('p', { text: 'No files yet.' })])); };
  },
  kudos(b) {
    const to = el('input', { id: 'fKTo', type: 'text', maxLength: 40, placeholder: 'Who are you thanking?', list: 'kNames' }), dl = el('datalist', { id: 'kNames' }), tx = el('textarea', { id: 'fKTx', maxLength: 200, placeholder: 'What did they do?' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    b.append(el('p', { text: 'Say thanks in public. The latest six show on the wall in the Hangout.' }), field('To', to), dl, field('For', tx), el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Post kudos', onclick: () => { if (!to.value.trim() || !tx.value.trim()) return; const hit = allPeople().find(r => r.uid && r.nm.toLowerCase() === to.value.trim().toLowerCase()); Store.set('kudos', Store.id(), { to: to.value.trim(), toUid: hit ? hit.uid : null, text: tx.value.trim(), by: me.uid, nm: me.name, t: Date.now() }); to.value = tx.value = ''; doEmote('clap'); } })), list);
    return () => { dl.replaceChildren(...allPeople().filter(r => !r.me).map(r => el('option', { value: r.nm })));
      const ks = [...Store.col('kudos')].filter(([, k]) => k).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)).slice(0, 40);
      list.replaceChildren(...ks.map(([id, k]) => el('div', { class: 'card' }, el('b', { text: 'To ' + str(k.to, 40) }), el('span', { text: str(k.text, 200) }), el('div', { class: 'row' }, el('span', { class: 'meta', text: 'from ' + nameOf(k.by, k.nm) + ' · ' + new Date(num(k.t, 0)).toLocaleDateString() }), (k.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Remove', onclick: () => Store.del('kudos', id) }) : null)))); };
  },
  c4(b) {
    const info = el('p', { class: 'big' }), grid = el('div', { class: 'c4' }), seats = el('div', { class: 'row' });
    b.append(el('p', { text: 'Four in a row wins. Take a colour, then click a column on your turn. Take both colours to play on your own.' }), seats, info, grid, el('div', { class: 'row' }, el('button', { class: 'btn ghost', text: 'New game', onclick: () => Store.set('games', 'c4', { b: C4_EMPTY, turn: 'r', r: null, y: null, win: null, t: Date.now() }) })));
    const put = s => Store.set('games', 'c4', { b: s.b, turn: s.turn, r: s.r, y: s.y, win: s.win, t: Date.now() });
    const winner = bd => { const at = (r, q) => (r < 0 || q < 0 || r > 5 || q > 6) ? '.' : bd[r * 7 + q]; for (let r = 0; r < 6; r++) for (let q = 0; q < 7; q++) { const v = at(r, q); if (v === '.') continue; for (const [dr, dq] of [[0, 1], [1, 0], [1, 1], [1, -1]]) if (at(r + dr, q + dq) === v && at(r + 2 * dr, q + 2 * dq) === v && at(r + 3 * dr, q + 3 * dq) === v) return v; } return bd.includes('.') ? null : 'd'; };
    return () => { const s = c4State(), col = { r: 'Red', y: 'Yellow' }, mine = s[s.turn] && s[s.turn].uid === me.uid;
      seats.replaceChildren(...['r', 'y'].map(k => el('button', { class: 'btn sm ' + (s[k] && s[k].uid === me.uid ? '' : 'ghost'), text: col[k] + ': ' + (s[k] ? nameOf(s[k].uid, s[k].nm) : 'free, take it'), onclick: () => { const n = Object.assign({}, s); n[k] = s[k] && s[k].uid === me.uid ? null : { uid: me.uid, nm: me.name }; put(n); } })));
      info.textContent = s.win === 'd' ? 'Draw.' : s.win ? col[s.win] + ' wins!' : !s.r || !s.y ? 'Waiting for both colours to be taken.' : mine ? 'Your move (' + col[s.turn] + ').' : col[s.turn] + ' to move.';
      grid.replaceChildren(...Array.from({ length: 42 }, (_, i) => el('button', { class: s.b[i] === '.' ? '' : s.b[i], disabled: !mine || !!s.win || !s.r || !s.y, 'aria-label': 'Column ' + (i % 7 + 1), onclick: () => { const q = i % 7; let r = 5; while (r >= 0 && s.b[r * 7 + q] !== '.') r--; if (r < 0) return; const nb = s.b.slice(0, r * 7 + q) + s.turn + s.b.slice(r * 7 + q + 1), w = winner(nb); put({ b: nb, turn: s.turn === 'r' ? 'y' : 'r', r: s.r, y: s.y, win: w }); if (w && w !== 'd') doEmote('clap'); } }))); };
  },
  ice(b) {
    const q = el('p', { class: 'big' });
    b.append(q, el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Next question', onclick: () => { const cur = num((Store.col('games').get('ice') || {}).i, 0); let n = Math.floor(Math.random() * ICE.length); if (n === cur) n = (n + 1) % ICE.length; Store.set('games', 'ice', { i: n, t: Date.now() }); } }), el('button', { class: 'btn ghost', text: 'Answer in chat', onclick: () => { $('#chat').classList.remove('min'); $('#chatIn').focus(); } })), el('p', { text: 'Everyone in the office sees the same question on the kiosk. Good for the first two minutes of a stand-up.' }));
    return () => { q.textContent = iceQ(); };
  }
};
function openPanel(id) { const titles = { actions: 'Actions', members: 'Members and approvals', insights: 'Insights', assistant: 'Office assistant', avatar: 'My look', people: 'People, status and time zones', places: 'Places', settings: 'Settings', help: 'How it works', files: 'Team Drive', kudos: 'Kudos wall', c4: 'Connect Four', ice: 'Icebreaker', admin: 'Admin', wins: 'Wins board and bell', decide: 'Decision board: GO or NO-GO', kanban: 'Kanban board', design: 'Design your office', fixit: 'Fix and report', library: 'Build: item library', apps: 'Apps and radio', suite: 'Zuchera Suites', calsync: 'Calendar sync', edu: 'Zuchera Edu', audio: 'Audio', photo: 'Match my office', embed: 'App', sendfile: 'Send file', plans: 'Plan and add-ons', media: 'Media: music, news, video', robot: 'DOT the assistant', pc: 'My computer', tasks: 'My tasks and time' }; if (id === 'c4' && !conf.games) { toast('Games are switched off by your admin.'); return; } openDrawer(id, titles[id], id === 'kanban', panels[id]); refreshPanel(id); }
actions.panel = openPanel;

actions.board = (id, title) => {
  openDrawer('notes:' + id, title, true, b => {
    let col = 0; const tx = el('input', { id: 'fNote', type: 'text', maxLength: 160, placeholder: 'Write an idea and press Enter' }), area = el('div', { class: 'board' }), els = new Map(); let dragging = null;
    const add = () => { const t = tx.value.trim(); if (!t) return; Store.set('notes', Store.id(), { board: id, text: t, c: col, x: 0.08 + Math.random() * 0.7, y: 0.08 + Math.random() * 0.6, by: me.uid, nm: me.name, v: [], t: Date.now() }); tx.value = ''; };
    tx.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    b.append(el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:200px' }, tx), swatches('Colour', NOTE_COL, () => col, v => { col = v; }), el('button', { class: 'btn', text: 'Add note', onclick: add }), ...dusterBtns(id)), area, el('p', { text: 'Drag notes to group them. 👍 votes for a note. Everyone at the board sees changes live, and the notes show on the board in the room.' }));
    return () => {
      const ns = notesOf(id), keep = new Set();
      for (const [nid, n] of ns) { keep.add(nid); if (dragging === nid) continue; let e = els.get(nid);
        if (!e) { e = el('div', { class: 'note' }); els.set(nid, e); area.append(e);
          e.addEventListener('pointerdown', ev => { if (ev.target.tagName === 'BUTTON') return; e.setPointerCapture(ev.pointerId); dragging = nid; e.classList.add('drag'); const r = area.getBoundingClientRect(), ox = ev.clientX - e.offsetLeft, oy = ev.clientY - e.offsetTop;
            const mv = m => { e.style.left = clamp(m.clientX - ox, 0, r.width - 150) + 'px'; e.style.top = clamp(m.clientY - oy, 0, r.height - 92) + 'px'; };
            const upf = () => { e.removeEventListener('pointermove', mv); e.removeEventListener('pointerup', upf); e.removeEventListener('pointercancel', upf); e.classList.remove('drag'); dragging = null; const cur = Store.col('notes').get(nid); if (cur) Store.set('notes', nid, Object.assign({}, cur, { x: e.offsetLeft / Math.max(1, r.width - 150), y: e.offsetTop / Math.max(1, r.height - 92) })); };
            e.addEventListener('pointermove', mv); e.addEventListener('pointerup', upf); e.addEventListener('pointercancel', upf); }); }
        const votes = Array.isArray(n.v) ? n.v.filter(x => typeof x === 'string') : [];
        e.style.background = NOTE_COL[clamp(num(n.c, 0), 0, 4)]; e.style.left = 'calc((100% - 150px) * ' + clamp(num(n.x, .5), 0, 1) + ')'; e.style.top = 'calc((100% - 92px) * ' + clamp(num(n.y, .5), 0, 1) + ')';
        e.replaceChildren(el('span', { text: str(n.text, 160) }), el('footer', {}, el('span', { text: nameOf(n.by, n.nm) }), el('button', { text: '👍 ' + votes.length, title: 'Vote', onclick: () => { const cur = Store.col('notes').get(nid); if (!cur) return; const v = votes.includes(me.uid) ? votes.filter(x => x !== me.uid) : votes.concat(me.uid); Store.set('notes', nid, Object.assign({}, cur, { v })); } }), el('button', { text: '×', title: 'Delete note', onclick: () => Store.del('notes', nid) }))); }
      for (const [nid, e] of els) if (!keep.has(nid)) { e.remove(); els.delete(nid); }
      let hint = area.querySelector('.hint'); if (!ns.length && !hint) area.append(el('div', { class: 'hint', text: 'Empty board. Add the first idea above.' })); else if (ns.length && hint) hint.remove();
    };
  });
  refreshPanel();
};
actions.desk = d => {
  openDrawer('desk:' + d.id, d.priv ? 'Private office ' + d.id.slice(1) : 'Desk ' + d.id.toUpperCase(), false, b => {
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }); b.append(body);
    return () => {
      const mine = d.owner === me.uid, kids = [el('p', { text: (d.priv ? 'Private office in ' : 'Open desk in ') + d.name + '. ' + (d.owner ? (mine ? 'This is your desk.' : 'Belongs to ' + d.ownerName + '.') : 'Nobody has claimed it yet.') })];
      if (!d.priv && !d.owner) kids.push(el('button', { class: 'btn', text: 'Make this my desk', onclick: () => { me.deskWant = d.id; me.deskT = Date.now(); saveProfile(); toast('Desk ' + d.id.toUpperCase() + ' is yours.'); } }));
      if (mine && !d.priv) kids.push(el('button', { class: 'btn ghost', text: 'Give up this desk', onclick: () => { me.deskWant = null; saveProfile(); } }));
      if (mine) kids.push(el('button', { class: 'btn', text: '💻 Use my computer', onclick: () => openPanel('pc') })); if (net.admin && has('build') && !d.priv) kids.push(el('button', { class: 'btn ghost', text: '✥ Move or remove desks', onclick: () => { closeDrawer(); setEdit(true); ED.sel = { k: 'desk', id: d.id }; drawEd(); } }));
      if (d.priv && (mine || net.admin) && d.owner) kids.push(lockButton(d)); if (d.priv && d.owner && !mine) kids.push(el('button', { class: 'btn ghost', text: '✊ Knock', onclick: () => knockOffice(d) }));
      if (mine) kids.push(chips('On your desk', ['Plant', 'Mug', 'Photo', 'Lamp', 'Trophy'], () => me.item, v => { me.item = v; saveProfile(); setDeskItem(d, v); }));
      if (d.priv || net.admin) { if (net.admin) { const sel = el('select', { id: 'fAssign' }, el('option', { value: '', text: 'Unassigned' }), ...[...Store.col('people')].map(([uid, p]) => el('option', { value: uid, text: nameOf(uid, p && p.nm), selected: d.owner === uid })));
          kids.push(field(d.priv ? 'Assign this office to' : 'Admin: assign this desk to', sel), el('button', { class: 'btn', text: 'Save', onclick: () => { const map = Object.assign({}, (Store.col('office').get('assign') || {}).map || {}); for (const k in map) if (map[k] === sel.value) delete map[k]; if (sel.value) map[d.id] = sel.value; else delete map[d.id]; Store.set('office', 'assign', { map }); toast('Office assignment saved.'); } })); }
        else kids.push(el('p', { text: 'Private offices are for managers and senior team members. An office admin assigns them.' })); }
      kids.push(el('button', { class: 'btn ghost', text: 'Sit here', onclick: () => { actions.sit(d.seat); closeDrawer(); } }));
      body.replaceChildren(...kids);
    };
  });
  refreshPanel();
};
function wavePeer(k) { doEmote('wave'); me.ping = { to: k, n: Date.now() }; }
function walkToPeer(k) { const p = peers.get(k); if (!p) return; const f = nearestFree(p.x + 0.9, p.z + 0.4); goTo(f.x, f.z); }

actions.coffee = () => { doEmote('coffee'); fx.steam = performance.now() + 4000; me.mugUntil = Date.now() + 5 * 60000; lastBreak = Date.now(); toast('Fresh coffee. Take five by the window.'); };
let audio = null;
actions.music = () => {
  if (audio) { audio.ctx.close(); clearInterval(audio.iv); audio = null; toast('Radio off.'); return; }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), out = ctx.createGain(), lp = ctx.createBiquadFilter(); out.gain.value = 0.07; lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out); out.connect(ctx.destination);
    const chords = [[174.6, 220, 261.6, 329.6], [164.8, 196, 246.9, 293.7], [146.8, 174.6, 220, 261.6], [130.8, 164.8, 196, 246.9]]; let i = 0;
    const play = () => { const t = ctx.currentTime, ch = chords[i++ % 4]; ch.forEach((f, n) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = n % 2 ? 'triangle' : 'sine'; o.frequency.value = f * (n === 3 ? 1 : 0.5 + (n > 0)); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.4); o.connect(g); g.connect(lp); o.start(t + n * 0.12); o.stop(t + 4.6); }); };
    play(); audio = { ctx, iv: setInterval(play, 4000) }; toast('Lo-fi radio on (only you hear it).');
  } catch (e) { toast('Audio is not available in this browser.'); }
};

/* ============================ chat ============================ */
/* ============================ HUD wiring ============================ */
$('#bPeople').onclick = () => openPanel('people'); $('#bPlaces').onclick = () => openPanel('places'); $('#bAvatar').onclick = () => openPanel('avatar'); $('#bSettings').onclick = () => openPanel('settings'); $('#bHelp').onclick = () => openPanel('help');
$('#status').onchange = e => { me.status = e.target.value; lastInput = Date.now(); };
for (const b of document.querySelectorAll('#dock .em')) b.onclick = () => doEmote(b.dataset.em);
$('#bDesk').onclick = () => { if (me.desk) actions.sit(me.desk.seat); else { const d = W.desks.find(x => !x.priv && !x.owner); if (d) { goTo(d.seat.ax, d.seat.az, () => actions.desk(d)); toast('Walking you to a free desk. Claim it when you get there.'); } else toast('Every open desk is taken. Ask an admin to enlarge the floor in Settings.'); } };
$('#bView').onclick = toggleView;
$('#prompt').onclick = () => { const p = nearestPick(); if (me.seat && (!p || p.seat === me.seat)) stand(); else if (p) usePick(p); };
const mapC = $('#mapC'), mctx = mapC.getContext('2d'); let mapS = 1;
function sizeMap() { mapS = 260 / W.L; mapC.width = 260; mapC.height = Math.round(D * mapS); }
function drawMap() {
  const c = mctx, s = mapS; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, mapC.width, mapC.height); c.setTransform(-1, 0, 0, -1, mapC.width, mapC.height);   // windows at the top, to match the default view
  c.fillStyle = '#e9d9bf'; c.fillRect(0, 0, HANG * s, D * s); c.fillStyle = '#cfd8e3'; c.fillRect(HANG * s, 0, (W.xE - HANG) * s, D * s); c.fillStyle = '#e6e1d6'; c.fillRect(W.xE * s, 0, COLLAB * s, D * s);
  c.fillStyle = '#9fd0ee'; c.fillRect(0, D * s - 3, mapC.width, 3);
  c.fillStyle = 'rgba(20,32,46,.28)'; for (const o of W.obs) c.fillRect(o[0] * s, o[1] * s, Math.max(1, (o[2] - o[0]) * s), Math.max(1, (o[3] - o[1]) * s));
  for (const d of W.desks) if (d.owner) { c.fillStyle = d.owner === me.uid ? '#2456ff' : '#1f9d6b'; c.fillRect(d.x * s - 2, d.z * s - 1.5, 4, 3); }
  const dot = (x, z, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(x * s, z * s, r, 0, 7); c.fill(); };
  for (const n of npcs) dot(n.x, n.z, '#9aa6b2', 2.5); for (const p of peers.values()) dot(p.x, p.z, (STATUS[p.status] || STATUS.available)[0], 3.5);
  if (me.path) { c.strokeStyle = 'rgba(36,86,255,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(me.pos.x * s, me.pos.z * s); for (const p of me.path) c.lineTo(p.x * s, p.z * s); c.stroke(); }
  dot(me.pos.x, me.pos.z, '#fff', 5.5); dot(me.pos.x, me.pos.z, '#2456ff', 4);
}
mapC.addEventListener('click', e => { const r = mapC.getBoundingClientRect(), f = nearestFree(clamp((1 - (e.clientX - r.left) / r.width) * W.L, 0.3, W.L - 0.3), clamp((1 - (e.clientY - r.top) / r.height) * D, 0.3, D - 0.3)); goTo(f.x, f.z); });

let lastBreak = Date.now(), slowT = 0, minuteKey = '', lastSec = 0;
function slowTick() {
  const z = zoneAt(me.pos.x, me.pos.z); if (z !== me.zone) { me.zone = z; $('#zoneName').textContent = z.name; renderChat(); }
  if (['cafe', 'lounge', 'games'].includes(z.id)) lastBreak = Date.now();
  if (Date.now() - lastBreak > 50 * 60000 && effStatus() === 'available') { lastBreak = Date.now() - 40 * 60000; toast('You have been heads-down for a while. Stretch your legs?', { ms: 12000, action: { label: 'Take a break', fn: () => { setStatus('break'); goTo(4.8, 5.2); } } }); }
  const lt = tzHM('Europe/London') || { h: 0, m: 0 }, key = lt.h + ':' + lt.m;
  if (key !== minuteKey) { minuteKey = key; $('#ldn').textContent = 'London ' + two(lt.h) + ':' + two(lt.m); $('#mytime').textContent = me.tz === 'Europe/London' ? '' : 'You ' + localTime(me.tz) + ' · ' + city(me.tz); drawClocks(); if (local.tod === 'live') applyTod();
    W.dyn.clock.hh.rotation.z = -((lt.h % 12) + lt.m / 60) * PI / 6; W.dyn.clock.mh.rotation.z = -lt.m * PI / 30; }
  const sec = Math.floor(Date.now() / 1000); if (sec !== lastSec) { lastSec = sec; if (roomDoc('thames').end > Date.now() - 1500 || roomDoc('shard').end > Date.now() - 1500) { drawScreens(); refreshPanel('rooms'); } }
  const here = new Set([me.uid]); for (const p of peers.values()) if (p.uid) here.add(p.uid);
  W.desks.forEach((d, i) => { const tm = deskPcOff(d) ? null : deskTaskMat(d), on = tm || (tm === undefined ? M_SCREEN_ON[i % 3] : M_SCREEN_OFF); if (d.scr.material !== on) d.scr.material = on; });
  const p = nearestPick(), pr = $('#prompt'); if (me.seat && (!p || p.seat === me.seat)) { pr.style.display = 'flex'; $('#promptTxt').textContent = 'Stand up'; } else if (p) { pr.style.display = 'flex'; $('#promptTxt').textContent = p.seat && seatTaken(p.seat) ? 'Seat taken' : p.label; } else pr.style.display = 'none';
  drawMap();
  me.av.setLabel(nameOf(me.uid, me.name), effStatus(), me.role, taskLabel(me.task)); v3Slow();
  renderStrip(); gameBar(); if (drawer.id === 'people') refreshPanel('people');
}

/* ============================ network ============================ */
let lastPres = '', presT = 0;
function sendPresence(now) {
  if (!net.room || now - presT < (me.game ? 33 : 90)) return; presT = now;
  if (me.removed || me.out || !me.approved) { if (lastPres !== 'x') { lastPres = 'x'; net.room.presence({ x: null }).catch(() => { }); } return; }
  const p = { x: +me.pos.x.toFixed(2), z: +me.pos.z.toFixed(2), ry: +me.ry.toFixed(2), seat: me.seat ? me.seat.id : null, st: effStatus(), wk: conf.track ? Math.floor(clock.wk / 60) : null, br: conf.track ? Math.floor(clock.br / 60) : null, gm: me.game, tb: me.tb, pb: me.pb, em: me.emote, emN: me.emN, say: me.say, sayN: me.sayN, sc: me.saySc || 'all', nm: me.name, role: me.role, av: me.cfg, tz: me.tz, uid: me.uid === 'local' ? null : me.uid, mug: Date.now() < me.mugUntil ? 1 : null, zone: me.zone ? me.zone.id : null, ping: me.ping };
  Object.assign(p, { la: lastInput }, v8Presence(), v3Presence(), v5Presence(), v6Presence(), { act: me.act ? { k: me.act.k, n: me.act.n, x: me.act.x, z: me.act.z, w: me.act.w } : null }); const s = JSON.stringify(p); if (s === lastPres) return; lastPres = s; net.room.presence(p).catch(() => { });
}
function setNet(txt, live) { $('#netTxt').textContent = txt; $('#net').classList.toggle('live', !!live); }
async function initNet() {
  const c = window.claude; if (!c || typeof c.use !== 'function') { maybeSetup(); return; }
  const use = n => Promise.resolve().then(() => c.use(n)).catch(() => null);
  setNet('Connecting…', false);
  const [user, db, room, assets] = await Promise.all([use('user'), use('db'), use('room'), use('assets')]);
  net.user = user; net.assets = assets;
  if (user) { try { const m = await user.me(); if (m && m.id) me.uid = m.id; net.admin = !!(m && (m.canEdit || m.isOwner)); if (m && m.id && m.name) net.names[m.id] = { name: m.name }; net.email = m && m.email || ''; } catch (e) { } }
  if (db && me.uid !== 'local') {
    net.db = db; net.live = true; clearTimeout(profTimer); Store.attach(db);
    let first = true; Store.on('people', m => { if (!first) return; first = false; const p = m.get(me.uid); if (p && !me.dirty) applyProfile(p); else saveProfile(true); recomputeDesks(); me.loaded = true; maybeSetup(); });
  }
  if (room) {
    net.room = room; net.live = true;
    room.onPeers(ch => syncPeers(ch.peers), () => { net.room = null; setNet(net.db ? 'Shared office (live presence off)' : 'Solo preview', !!net.db); });
    room.onConnection(on => setNet(on ? 'Live with your team' : 'Reconnecting…', on), () => { });
  }
  if (!net.live) setNet('Solo preview', false); else if (!room) setNet('Shared office', true);
  refreshPanel(); resolveNames(); applyPrefs(); if (!net.db) maybeSetup(); else setTimeout(() => { if (!me.loaded) maybeSetup(); }, 6000);
}

