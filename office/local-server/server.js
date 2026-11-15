#!/usr/bin/env node
/* Zuchera Local Server: runs the whole office on your own network, with no internet and no database to install.
   One computer runs this program. Everyone else opens its address in a browser. */
'use strict';
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), zlib = require('zlib');
const ROOT = __dirname, APP = path.join(ROOT, 'app'), DATA = path.join(ROOT, 'data'), FILES = path.join(DATA, 'files');
const VER = '24.0-local';
fs.mkdirSync(FILES, { recursive: true }); fs.mkdirSync(path.join(DATA, 'backups'), { recursive: true });
/* ---------- settings (config.json is yours to edit) ---------- */
const CFGF = path.join(ROOT, 'config.json');
const DEF = { name: 'Zuchera Virtual Office', tagline: 'Sign in to walk into the office.', port: 8080, httpsPort: 8443, signup: true, approval: true, domains: '', syncMs: 800, maxMB: 20, site: 'localhost', license: '' };
if (!fs.existsSync(CFGF)) fs.writeFileSync(CFGF, JSON.stringify(DEF, null, 2));
let S = Object.assign({}, DEF); try { S = Object.assign(S, JSON.parse(fs.readFileSync(CFGF, 'utf8'))); } catch (e) { console.log('config.json could not be read, using defaults.'); }
/* ---------- storage: everything lives in data/store.json (saved a couple of seconds after any change) ---------- */
const SF = path.join(DATA, 'store.json'); let DB = { secret: crypto.randomBytes(32).toString('hex'), nextUid: 1, trial0: 0, users: {}, members: {}, docs: {}, rev: 0, invites: {}, codes: {}, license: '', aikey: '' };
try { if (fs.existsSync(SF)) DB = Object.assign(DB, JSON.parse(fs.readFileSync(SF, 'utf8'))); } catch (e) { console.log('Your saved data could not be read. A copy of the damaged file was kept as store.damaged.json.'); try { fs.copyFileSync(SF, path.join(DATA, 'store.damaged.json')); } catch (x) { } }
if (S.license && !DB.license) DB.license = S.license;
let dirty = false, saveT = null; const mark = () => { dirty = true; if (!saveT) saveT = setTimeout(save, 2000); };
function save() { saveT = null; if (!dirty) return; dirty = false; try { fs.writeFileSync(SF + '.tmp', JSON.stringify(DB)); fs.renameSync(SF + '.tmp', SF); } catch (e) { console.log('Could not save:', e.message); dirty = true; } }
try { const d = new Date().toISOString().slice(0, 10), b = path.join(DATA, 'backups', 'store-' + d + '.json'); if (fs.existsSync(SF) && !fs.existsSync(b)) fs.copyFileSync(SF, b); const old = fs.readdirSync(path.join(DATA, 'backups')).sort(); while (old.length > 14) fs.unlinkSync(path.join(DATA, 'backups', old.shift())); } catch (e) { }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { save(); process.exit(0); }); process.on('exit', save);
if (!DB.trial0) { DB.trial0 = Math.floor(Date.now() / 1000); mark(); }
const LOG = []; /* revision log for fast sync */
for (const [p, d] of Object.entries(DB.docs)) LOG.push([d.rev, p]); LOG.sort((a, b) => a[0] - b[0]);
const PRES = new Map(), EV = []; let evId = 0;
const now = () => Math.floor(Date.now() / 1000);
/* ---------- licence (same signed keys as the WordPress plugin) ---------- */
const PUB = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from('hE26P1ziIx/WWA50kTc6owcr9/FoBhqCaF0NR7Oailc=', 'base64')]);
const FEATURES = ['build', 'media', 'ai', 'record', 'apps', 'photo', 'multi', 'brand', 'suites'];
const TIERS = { starter: { label: 'Starter', seats: 5, addons: [], wm: true }, team: { label: 'Team', seats: 30, addons: ['build', 'media'], wm: false }, business: { label: 'Business', seats: 100, addons: ['build', 'media', 'ai', 'record', 'apps', 'photo', 'suites'], wm: false }, enterprise: { label: 'Enterprise', seats: 0, addons: FEATURES, wm: false }, internal: { label: 'Zuchera (internal)', seats: 0, addons: FEATURES, wm: false } };
const b64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function license() {
  let L = { tier: 'starter', label: 'Starter', seats: 5, addons: [], wm: true, org: '', valid: false, why: '', exp: 0 }; const k = String(DB.license || '').trim();
  if (!k) { const left = Math.ceil((DB.trial0 + 14 * 86400 - now()) / 86400); if (left > 0) return { tier: 'trial', label: 'Free trial', seats: 100, addons: FEATURES, wm: true, org: '', valid: false, why: '', exp: DB.trial0 + 14 * 86400, trial: left }; L.why = 'Your 14 day trial has ended. Choose a plan to keep your features.'; return L; }
  const p = k.split('.'); if (p.length !== 2) { L.why = 'Key not recognised.'; return L; }
  try { const ok = crypto.verify(null, Buffer.from(p[0]), crypto.createPublicKey({ key: PUB, format: 'der', type: 'spki' }), b64u(p[1])); if (!ok) { L.why = 'Key is not valid.'; return L; } const d = JSON.parse(b64u(p[0]).toString()), t = TIERS[d.tier]; if (!t) { L.why = 'Key is not valid.'; return L; }
    if (d.exp && d.exp < now()) { L.why = 'This licence expired. Renew it to keep your plan.'; return L; } if (d.site && String(d.site).toLowerCase() !== String(S.site || '').toLowerCase().replace(/^www\./, '')) { L.why = 'This key is for a different site name. Set "site" in config.json to the name on your licence.'; return L; }
    return { tier: d.tier, label: t.label, seats: d.seats > 0 ? d.seats : t.seats, addons: [...new Set(t.addons.concat((d.addons || []).map(String)))], wm: d.wm === false ? false : t.wm, org: d.org || '', valid: true, why: '', exp: d.exp || 0 };
  } catch (e) { L.why = 'Key is not valid.'; return L; }
}
const approvedCount = () => Object.values(DB.members).filter(m => m.status === 'approved').length;
function seatOk(uid) { const L = license(); if (L.seats <= 0) return true; const m = DB.members[uid]; if (!m || m.role === 'owner') return true; const rank = Object.values(DB.members).filter(x => x.status === 'approved' && x.role !== 'owner' && (x.created < m.created || (x.created === m.created && x.uid < m.uid))).length; return rank + 1 < L.seats; }
/* ---------- tokens and passwords ---------- */
const b64e = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sign = p => b64e(crypto.createHmac('sha256', DB.secret).update(p).digest());
const tokMake = (uid, ttl) => { const p = b64e(JSON.stringify({ u: uid, e: now() + (ttl || 43200) })); return p + '.' + sign(p); };
function tokUid(t) { if (typeof t !== 'string' || !t.includes('.')) return 0; const [p, s] = t.split('.', 2); const a = Buffer.from(sign(p)), b = Buffer.from(s || ''); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 0; try { const d = JSON.parse(b64u(p).toString()); return d && d.u && d.e > now() ? d.u : 0; } catch (e) { return 0; } }
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const newPw = () => crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 12);
const tries = new Map(); const hit = (k, max, secs) => { const t = Date.now(), a = (tries.get(k) || []).filter(x => t - x < secs * 1000); tries.set(k, a); return a.length >= max; }; const addHit = k => { (tries.get(k) || tries.set(k, []).get(k)).push(Date.now()); };
setInterval(() => { const t = Date.now(); for (const [k, a] of tries) { const f = a.filter(x => t - x < 3600000); f.length ? tries.set(k, f) : tries.delete(k); } }, 600000).unref();
/* ---------- helpers ---------- */
const isEmail = e => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length < 120; const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
function me(uid) { const m = DB.members[uid]; return { id: 'u' + uid, name: m.name, email: m.email, role: m.role, status: m.status === 'approved' && !seatOk(uid) ? 'full' : m.status }; }
function ensureMember(u, codeRole) {
  let m = DB.members[u.uid]; if (m) return m; let status = 'pending', role = 'member'; const inv = DB.invites[u.email];
  if (!Object.values(DB.members).some(x => x.role === 'owner')) { status = 'approved'; role = 'owner'; } else if (codeRole) { status = 'approved'; role = codeRole === 'admin' ? 'admin' : 'member'; } else if (inv) { status = 'approved'; role = inv.role === 'admin' ? 'admin' : 'member'; inv.used = 1; }
  else { const dom = u.email.split('@')[1] || '', ok = String(S.domains || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean); if (!S.approval || (dom && ok.includes(dom))) status = 'approved'; }
  m = DB.members[u.uid] = { uid: u.uid, status, role, name: u.name, email: u.email, created: now() }; mark(); return m;
}
const codeRole = c => { c = String(c || '').replace(/[^A-Za-z0-9]/g, ''); const x = c && DB.codes[c]; return x && x.exp > now() ? x.role : ''; };
const readJson = (req, max) => new Promise((ok, no) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > (max || 3000000)) { no(new Error('big')); req.destroy(); } else c.push(d); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch (e) { ok({}); } }); req.on('error', no); });
const readBuf = (req, max) => new Promise((ok, no) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > max) { no(new Error('big')); req.destroy(); } else c.push(d); }); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
const json = (res, a, code) => { res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(a)); };
const cookieOf = req => { const m = /(?:^|; )zq=([^;]+)/.exec(req.headers.cookie || ''); return m ? m[1] : ''; };
const setCookie = (res, tok, secure) => res.setHeader('Set-Cookie', 'zq=' + (tok || '') + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + (tok ? 2592000 : 0) + (secure ? '; Secure' : ''));
const ipOf = req => req.socket.remoteAddress || 'x';
/* ---------- accounts ---------- */
async function aLogin(req, res, secure) {
  const b = await readJson(req); const ip = ipOf(req); if (hit('login' + ip, 15, 600)) return json(res, { ok: false, err: 'Too many attempts. Wait a few minutes and try again.' }, 429);
  const login = clean(b.login, 120).toLowerCase(), pw = String(b.password || ''); if (!login || !pw) return json(res, { ok: false, err: 'Enter your email and password.' });
  const u = Object.values(DB.users).find(x => x.email === login || x.login === login); let ok = false; if (u) { const h = hashPw(pw, u.salt); ok = crypto.timingSafeEqual(Buffer.from(h), Buffer.from(u.hash)); }
  if (!ok) { addHit('login' + ip); return json(res, { ok: false, err: 'That email and password do not match.' }); }
  ensureMember(u, codeRole(b.code)); setCookie(res, tokMake(u.uid, 2592000), secure); json(res, { ok: true, token: tokMake(u.uid), me: me(u.uid) });
}
async function aRegister(req, res, secure) {
  const b = await readJson(req), cr = codeRole(b.code), ip = ipOf(req); if (!cr) { if (hit('reg' + ip, 40, 3600)) return json(res, { ok: false, err: 'Too many attempts. Wait and try again.' }, 429); addHit('reg' + ip); }
  const first = !Object.keys(DB.users).length; if (!S.signup && !cr && !first) return json(res, { ok: false, err: 'New accounts are by invitation only. Ask an admin for an invite link.' });
  const email = clean(b.email, 120).toLowerCase(), pw = String(b.password || ''), name = clean(b.name, 80); if (!isEmail(email)) return json(res, { ok: false, err: 'Enter a valid email address.' }); if (pw.length < 8) return json(res, { ok: false, err: 'Passwords need at least 8 characters.' }); if (!name) return json(res, { ok: false, err: 'Enter your name.' });
  if (Object.values(DB.users).some(x => x.email === email)) return json(res, { ok: false, err: 'That email already has an account. Sign in instead.' });
  const uid = DB.nextUid++, salt = crypto.randomBytes(16).toString('hex'); const u = DB.users[uid] = { uid, email, login: email.split('@')[0].toLowerCase(), name, salt, hash: hashPw(pw, salt) }; ensureMember(u, cr); mark();
  setCookie(res, tokMake(uid, 2592000), secure); json(res, { ok: true, token: tokMake(uid), me: me(uid) });
}
function aToken(req, res) { const uid = tokUid(cookieOf(req)); if (!uid || !DB.users[uid]) return json(res, { ok: false, err: 'auth' }, 401); ensureMember(DB.users[uid]); json(res, { ok: true, token: tokMake(uid), me: me(uid) }); }
/* ---------- sync (same rules as the WordPress plugin) ---------- */
function canRead(col, d, who) { if (col === 'mail') { const to = Array.isArray(d.to) ? d.to : []; return d.by === who || to.includes(who) || to.includes('*'); } if (col === 'sops') { if ((d.vis || 'private') === 'public') return true; const to = Array.isArray(d.to) ? d.to : []; return d.by === who || to.includes(who); }
  if (col === 'dms') { const t = DB.docs['threads/' + String(d.th || '')]; return !!(t && !t.del && t.data && Array.isArray(t.data.mem) && t.data.mem.includes(who)); } return true; }
function sync(b, res) {
  const uid = tokUid(b.tok); if (!uid) return json(res, { ok: false, err: 'auth' }, 401); const m = DB.members[uid]; if (!m) return json(res, { ok: false, err: 'auth' }, 401);
  if (m.status !== 'approved') return json(res, { ok: false, err: 'status', status: m.status }); if (!seatOk(uid)) return json(res, { ok: false, err: 'status', status: 'full' });
  const who = 'u' + uid, admin = m.role === 'owner' || m.role === 'admin', t = now(), peer = typeof b.peer === 'string' && /^u\d+:[a-z0-9]{4,12}$/.test(b.peer) && b.peer.startsWith(who + ':') ? b.peer : ''; if (!peer) return json(res, { ok: false, err: 'peer' }, 400);
  const denied = [];
  if (Array.isArray(b.w)) for (const w of b.w.slice(0, 200)) {
    const p = String((w && w.path) || ''), mm = /^([a-z0-9_]{1,32})\/([A-Za-z0-9_.~:-]{1,150})$/.exec(p); if (!mm) { denied.push(p); continue; } const col = mm[1], id = mm[2];
    if ((['office', 'grades', 'courses', 'breakout'].includes(col) && !admin) || (col === 'people' && id !== who && !admin)) { denied.push(p); continue; }
    if (col === 'sops' && !admin) { const dd = w.data && typeof w.data === 'object' ? w.data : null; if (dd !== null && dd.vis !== 'private') { denied.push(p); continue; } }
    if (['mailst', 'rsvp', 'pv'].includes(col) && !id.endsWith('~' + who)) { denied.push(p); continue; } if (col === 'rx' && !id.includes('~' + who + '~')) { denied.push(p); continue; }
    if (!admin && ((col === 'lesson' && /^(v|sub|at|gs|nt|rd|rq)_/.test(id) && !id.endsWith('_' + who)) || (col === 'games' && id.startsWith('rk_') && !id.endsWith('_' + who)))) { denied.push(p); continue; }
    const old = DB.docs[p]; if (!admin && ['chat', 'dms', 'mail', 'cal', 'sops'].includes(col) && old && !old.del && old.by !== uid) { denied.push(p); continue; }
    const del = !('data' in w) || w.data === null; let js = ''; try { js = del ? 'null' : JSON.stringify(w.data); } catch (e) { js = ''; } if (!js || js.length > 600000) { denied.push(p); continue; }
    let by = uid; if (admin && !del && old && !old.del) by = old.by; const rev = ++DB.rev; DB.docs[p] = { rev, col, data: del ? null : w.data, del: del ? 1 : 0, by, t }; LOG.push([rev, p]); mark();
  }
  if (Array.isArray(b.ev)) for (const e of b.ev.slice(0, 120)) { const topic = String((e && e.topic) || '').replace(/[^a-z0-9_]/g, '').slice(0, 32); if (!topic) continue; let js = ''; try { js = JSON.stringify(e.data === undefined ? null : e.data); } catch (x) { continue; } if (js.length > 60000) continue; const dest = typeof e.to === 'string' && /^u\d+:[a-z0-9]{4,12}$/.test(e.to) ? e.to : ''; EV.push({ id: ++evId, topic, dest, data: e.data === undefined ? null : e.data, peer, t }); }
  if (b.bye) { PRES.delete(peer); return json(res, { ok: true }); }
  let pj = {}; try { pj = b.p && typeof b.p === 'object' ? b.p : {}; if (JSON.stringify(pj).length >= 20000) pj = null; } catch (e) { pj = null; } if (pj) PRES.set(peer, { uid, data: pj, t });
  const peers = []; for (const [k, v] of PRES) { if (v.t <= t - 12 || k === peer) continue; peers.push({ peer: k, uid: 'u' + v.uid, p: v.data }); }
  let ec = Number.isInteger(b.ec) ? b.ec : -1; const evs = []; if (ec < 0) ec = evId; else { for (const e of EV) if (e.id > ec && e.peer !== peer && (e.dest === '' || e.dest === peer)) { evs.push({ topic: e.topic, data: e.data, peer: e.peer, by: 'u' + parseInt(e.peer.slice(1), 10) }); if (evs.length >= 300) break; } if (evId > ec) ec = evId; }
  const rc = Math.max(0, parseInt(b.rc, 10) || 0), docs = [], seen = new Set(); let max = rc;
  const emit = (p, d) => { if (seen.has(p)) return; seen.add(p); if (d.rev > max) max = d.rev; if (d.del) { docs.push({ path: p, del: 1 }); return; } if (d.col === 'grades' && !admin && p !== 'grades/' + who) return; if (['mail', 'dms', 'sops'].includes(d.col) && !canRead(d.col, d.data && typeof d.data === 'object' ? d.data : {}, who)) return; docs.push({ path: p, data: d.data }); };
  if (rc === 0) { for (const p in DB.docs) { const d = DB.docs[p]; if (!d.del && docs.length < 20000) emit(p, d); } max = Math.max(max, DB.rev); }
  else { const from = Math.max(0, rc - 25); for (let i = LOG.length - 1; i >= 0 && LOG[i][0] > from && docs.length < 4000; i--) { const p = LOG[i][1], d = DB.docs[p]; if (d && d.rev > from) emit(p, d); } }
  if (Math.random() < 1 / 60) { for (const [k, v] of PRES) if (v.t < t - 120) PRES.delete(k); while (EV.length && EV[0].t < t - 90) EV.shift(); if (LOG.length > 60000) { const keep = LOG.filter(([r, p]) => DB.docs[p] && DB.docs[p].rev === r); LOG.length = 0; LOG.push(...keep); } for (const p in DB.docs) { const d = DB.docs[p]; if (d.del && d.t < t - 172800) delete DB.docs[p]; } }
  json(res, { ok: true, peers, ev: evs, docs, rc: max, ec, role: m.role, denied, now: t });
}
/* ---------- admin ---------- */
async function admin(req, res) {
  const b = await readJson(req), uid = tokUid(b.tok), m = uid && DB.members[uid]; const op = String(b.op || '');
  if (m && m.status === 'approved' && op === 'slackpost') return json(res, { ok: true });
  if (m && m.status === 'approved' && op === 'ics') { if (hit('ics' + uid, 12, 3600)) return json(res, { ok: false, err: 'Slow down a little and try again soon.' }); addHit('ics' + uid); const url = String(b.url || ''); if (!url.startsWith('https://')) return json(res, { ok: false, err: 'Use the https calendar address.' }); try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }), t = (await r.text()).slice(0, 1048576); if (!t.includes('BEGIN:VCALENDAR')) throw 0; return json(res, { ok: true, text: t }); } catch (e) { return json(res, { ok: false, err: 'Could not fetch that calendar. The local server needs internet for this.' }); } }
  if (m && m.status === 'approved' && op === 'ai') { const L = license(); if (!DB.aikey) return json(res, { ok: false, err: 'AI is not set up yet. The office owner adds a key in the AI notes panel.' }); if (!L.addons.includes('ai')) return json(res, { ok: false, err: 'AI is part of the Business plan and above.' }); if (hit('ai' + uid, 40, 3600)) return json(res, { ok: false, err: 'Slow down a little and try again soon.' }); addHit('ai' + uid);
    try { const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'x-api-key': DB.aikey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content: String(b.prompt || '').slice(0, 30000) }] }) }); const j = await r.json(); if (!j.content || !j.content[0]) throw 0; return json(res, { ok: true, text: j.content[0].text }); } catch (e) { return json(res, { ok: false, err: 'The AI service could not be reached. It needs an internet connection.' }); } }
  if (!m || m.status !== 'approved' || (m.role !== 'owner' && m.role !== 'admin')) return json(res, { ok: false, err: 'Admins only.' }, 403);
  const tg = DB.members[parseInt(String(b.uid || '').replace(/\D/g, ''), 10)];
  if (op === 'list') return json(res, { ok: true, list: Object.values(DB.members).sort((a, c) => a.created - c.created).map(x => ({ uid: x.uid, status: x.status, role: x.role, name: x.name, email: x.email, created: x.created, user_id: 'u' + x.uid })) });
  if (op === 'status' && tg && ['approved', 'blocked', 'pending'].includes(b.status)) { if (tg.role === 'owner') return json(res, { ok: false, err: 'The owner cannot be blocked.' }); tg.status = b.status; if (b.status === 'blocked') for (const [k, v] of PRES) if (v.uid === tg.uid) PRES.delete(k); mark(); return json(res, { ok: true }); }
  if (op === 'role' && tg && ['admin', 'member'].includes(b.role)) { if (tg.role === 'owner') return json(res, { ok: false, err: 'The owner stays the owner.' }); tg.role = b.role; mark(); return json(res, { ok: true }); }
  if (op === 'resetpw' && tg) { const u = DB.users[tg.uid], pw = newPw(); u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(pw, u.salt); mark(); return json(res, { ok: true, password: pw }); }
  if (op === 'invites') return json(res, { ok: true, invites: Object.entries(DB.invites).map(([e, v]) => ({ email: e, role: v.role, used: !!v.used })) });
  if (op === 'invite' && isEmail(String(b.email || ''))) { const e = String(b.email).toLowerCase(); DB.invites[e] = { role: b.role === 'admin' ? 'admin' : 'member' }; const u = Object.values(DB.users).find(x => x.email === e); if (u && DB.members[u.uid] && DB.members[u.uid].status === 'pending') DB.members[u.uid].status = 'approved'; mark(); return json(res, { ok: true }); }
  if (op === 'uninvite') { delete DB.invites[String(b.email || '').toLowerCase()]; mark(); return json(res, { ok: true }); }
  if (op === 'link') { for (const k in DB.codes) if (DB.codes[k].exp < now()) delete DB.codes[k]; const c = crypto.randomBytes(14).toString('hex'); DB.codes[c] = { role: 'member', exp: now() + 7 * 86400 }; mark(); const host = req.headers.host || 'localhost'; return json(res, { ok: true, url: (req.socket.encrypted ? 'https://' : 'http://') + host + '/?invite=' + c, days: 7 }); }
  if (op === 'slack') return json(res, { ok: false, err: 'Slack needs internet and is not part of the local server.' });
  if (op === 'claim') return json(res, { ok: false, err: 'Paste your licence key instead: the local server cannot look up payments offline.' });
  if (op === 'license' && m.role === 'owner') { const old = DB.license; DB.license = String(b.key || '').trim(); const L = license(); if (!L.valid) { DB.license = old; return json(res, { ok: false, err: L.why || 'That key is not valid.' }); } mark(); return json(res, { ok: true, tier: L.tier }); }
  if (op === 'aikey' && m.role === 'owner') { const k = String(b.key || '').trim(); if (k && !/^sk-ant-[A-Za-z0-9_-]{20,200}$/.test(k)) return json(res, { ok: false, err: 'That does not look like an Anthropic API key.' }); DB.aikey = k; mark(); return json(res, { ok: true, set: !!k }); }
  if (op === 'aistate') return json(res, { ok: true, set: !!DB.aikey });
  json(res, { ok: false, err: 'Unknown request.' }, 400);
}
/* ---------- files ---------- */
const OKEXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'md', 'csv', 'json', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'];
async function upload(req, res) {
  const max = Math.max(1, +S.maxMB || 20) * 1048576; let buf; try { buf = await readBuf(req, max + 65536); } catch (e) { return json(res, { ok: false, err: 'Files up to ' + S.maxMB + ' MB.' }); }
  const ct = /boundary=(.+)$/.exec(req.headers['content-type'] || ''); if (!ct) return json(res, { ok: false, err: 'The file did not arrive.' }); const bd = Buffer.from('--' + ct[1]); const parts = []; let i = buf.indexOf(bd);
  while (i >= 0) { const j = buf.indexOf(bd, i + bd.length); if (j < 0) break; parts.push(buf.slice(i + bd.length + 2, j - 2)); i = j; }
  let tok = '', file = null, fname = ''; for (const p of parts) { const h = p.indexOf('\r\n\r\n'); if (h < 0) continue; const head = p.slice(0, h).toString(), body = p.slice(h + 4); const nm = /name="([^"]+)"/.exec(head); if (nm && nm[1] === 'tok') tok = body.toString(); else if (nm && nm[1] === 'file') { file = body; fname = (/filename="([^"]*)"/.exec(head) || [])[1] || 'file'; } }
  const uid = tokUid(tok), m = uid && DB.members[uid]; if (!m || m.status !== 'approved') return json(res, { ok: false, err: 'auth' }, 401); if (!file || !file.length) return json(res, { ok: false, err: 'The file did not arrive.' }); if (file.length > max) return json(res, { ok: false, err: 'Files up to ' + S.maxMB + ' MB.' });
  const name = path.basename(fname).replace(/[^A-Za-z0-9._-]/g, '_').slice(-90) || 'file', ext = name.split('.').pop().toLowerCase(); if (!OKEXT.includes(ext)) return json(res, { ok: false, err: 'That file type is not allowed here.' });
  const sub = crypto.randomBytes(10).toString('hex'); fs.mkdirSync(path.join(FILES, sub)); fs.writeFileSync(path.join(FILES, sub, name), file); json(res, { ok: true, id: sub + '/' + name, url: '/files/' + sub + '/' + encodeURIComponent(name), size: file.length });
}
/* ---------- pages and static files ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/plain', '.csv': 'text/csv', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.webmanifest': 'application/manifest+json' };
const INLINE = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.mp4', '.webm', '.wav', '.ogg', '.m4a', '.pdf', '.txt']);
function sendFile(req, res, file, cache, userFile) {
  fs.stat(file, (e, st) => { if (e || !st.isFile()) { res.writeHead(404); return res.end('Not found'); } const ext = path.extname(file).toLowerCase(); const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': cache ? 'public, max-age=86400' : 'no-store' };
    if (userFile) { h['Content-Security-Policy'] = "default-src 'none'; sandbox"; if (!INLINE.has(ext)) h['Content-Disposition'] = 'attachment'; }
    const ae = String(req.headers['accept-encoding'] || ''); const comp = /\.(js|json|html|css|svg|gltf|txt)$/.test(file) && st.size > 1024 && /gzip/.test(ae);
    if (comp) { h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding'; res.writeHead(200, h); fs.createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res); } else { h['Content-Length'] = st.size; res.writeHead(200, h); fs.createReadStream(file).pipe(res); } });
}
function looks() { try { return fs.readdirSync(path.join(APP, 'models')).map(f => /^([fm]\d+)\.json$/.exec(f)).filter(Boolean).map(x => x[1]); } catch (e) { return []; } }
function page(req, res, secure, url) {
  const file = path.join(APP, 'index.html'); let html; try { html = fs.readFileSync(file, 'utf8'); } catch (e) { res.writeHead(500); return res.end('The app folder is missing. Unzip the whole download again.'); }
  const L = license(), lic = { tier: L.tier, label: L.label, seats: L.seats, used: approvedCount(), addons: L.addons, wm: L.wm, org: L.org, valid: L.valid, exp: L.exp, trial: L.trial || 0, site: S.site, buy: 'https://portal.zuchera.com' };
  const cfg = { wp: true, ver: VER, appName: S.name, tagline: S.tagline, allowSignup: !!S.signup, api: '/api', ajax: '/ajax', syncMs: Math.max(300, Math.min(5000, +S.syncMs || 800)), iceServers: null, files: '/files/', looks: looks(), maxUpload: Math.max(1, +S.maxMB || 20) * 1048576, home: '/', self: '/', https: secure, lic, invite: clean(url.searchParams.get('invite') || '', 60).replace(/[^A-Za-z0-9]/g, '') };
  const uid = tokUid(cookieOf(req)); if (uid && DB.users[uid]) { ensureMember(DB.users[uid], codeRole(cfg.invite)); cfg.token = tokMake(uid); cfg.me = me(uid); }
  const inject = '<base href="/app/"><meta name="theme-color" content="#2456ff"><script>window.OFFICE_CONFIG=' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ';window.OFFICE_ASSETS="/app/models/";</script>';
  html = html.replace(/<head>/i, '<head>' + inject).replace(/<title>.*?<\/title>/is, '<title>' + S.name.replace(/[<>&]/g, '') + '</title>');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'same-origin', 'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)', 'X-Content-Type-Options': 'nosniff' }); res.end(html);
}
function handler(secure) { return async (req, res) => { try {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  if (p === '/' || p === '/index.html') return page(req, res, secure, url);
  if (p === '/ajax' && req.method === 'POST') { const a = url.searchParams.get('action'); if (a === 'sdchq_login') return aLogin(req, res, secure); if (a === 'sdchq_register') return aRegister(req, res, secure); if (a === 'sdchq_token') return aToken(req, res); if (a === 'sdchq_logout') { setCookie(res, '', secure); return json(res, { ok: true }); } if (a === 'sdchq_admin') return admin(req, res); if (a === 'sdchq_upload') return upload(req, res); if (a === 'sdchq_api') return sync(await readJson(req), res); return json(res, { ok: false, err: 'Unknown request.' }, 400); }
  if (p === '/api' && req.method === 'POST') return sync(await readJson(req), res);
  if (p === '/health') return json(res, { ok: true, ver: VER, people: new Set([...PRES.values()].filter(v => v.t > now() - 12).map(v => v.uid)).size });
  if (p.startsWith('/app/')) { const f = path.normalize(path.join(APP, decodeURIComponent(p.slice(5)))); if (!f.startsWith(APP + path.sep)) { res.writeHead(403); return res.end(); } return sendFile(req, res, f, true); }
  if (p.startsWith('/files/')) { const f = path.normalize(path.join(FILES, decodeURIComponent(p.slice(7)))); if (!f.startsWith(FILES + path.sep)) { res.writeHead(403); return res.end(); } return sendFile(req, res, f, false, true); }
  res.writeHead(404); res.end('Not found');
} catch (e) { try { json(res, { ok: false, err: 'Server error' }, 500); } catch (x) { } } }; }
/* ---------- secure address: each install makes its own certificate (needed for the microphone on a network) ---------- */
function getCert() {
  const dir = path.join(ROOT, 'cert'), kp = path.join(dir, 'key.pem'), cp = path.join(dir, 'cert.pem'), pf = path.join(dir, 'cert.pfx'); const cp2 = require('child_process');
  const ips = []; for (const l of Object.values(os.networkInterfaces())) for (const a of l || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  const stamp = path.join(dir, 'ips.txt'), want = ips.join(','); let have = ''; try { have = fs.readFileSync(stamp, 'utf8'); } catch (e) { }
  if (have !== want) { for (const f of [kp, cp, pf]) try { fs.unlinkSync(f); } catch (e) { } }
  try { if (fs.existsSync(kp) && fs.existsSync(cp)) return { key: fs.readFileSync(kp), cert: fs.readFileSync(cp) }; if (fs.existsSync(pf)) return { pfx: fs.readFileSync(pf), passphrase: 'zuchera' }; } catch (e) { }
  fs.mkdirSync(dir, { recursive: true }); const san = ['DNS:localhost', 'IP:127.0.0.1'].concat(ips.map(i => 'IP:' + i)).join(',');
  try { cp2.execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', kp, '-out', cp, '-days', '3650', '-subj', '/CN=Zuchera Local Server', '-addext', 'subjectAltName=' + san], { stdio: 'ignore', timeout: 20000 }); fs.writeFileSync(stamp, want); return { key: fs.readFileSync(kp), cert: fs.readFileSync(cp) }; } catch (e) { }
  if (process.platform === 'win32') { try { const ps = "$c=New-SelfSignedCertificate -DnsName 'localhost'" + ips.map(i => ",'" + i + "'").join('') + " -CertStoreLocation Cert:\\CurrentUser\\My -NotAfter (Get-Date).AddYears(10) -KeyExportPolicy Exportable;$p=ConvertTo-SecureString 'zuchera' -AsPlainText -Force;Export-PfxCertificate -Cert $c -FilePath '" + pf + "' -Password $p | Out-Null"; cp2.execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore', timeout: 40000 }); fs.writeFileSync(stamp, want); return { pfx: fs.readFileSync(pf), passphrase: 'zuchera' }; } catch (e) { } }
  return null;
}
/* ---------- start ---------- */
const nets = []; for (const l of Object.values(os.networkInterfaces())) for (const a of l || []) if (a.family === 'IPv4' && !a.internal) nets.push(a.address);
const srv = http.createServer(handler(false)); srv.on('error', e => { console.log(e.code === 'EADDRINUSE' ? '\nPort ' + S.port + ' is already in use. Close the other program or change "port" in config.json.' : e.message); process.exit(1); });
srv.listen(S.port, '0.0.0.0', () => {
  console.log('\n  Zuchera Local Server ' + VER + '\n  ---------------------------------------------------------');
  console.log('  Share this address with your team (same Wi-Fi or network):\n'); for (const ip of nets) console.log('     http://' + ip + ':' + S.port); if (!nets.length) console.log('     http://localhost:' + S.port + '   (no network found: connect to Wi-Fi or a cable network)');
  console.log('\n  The first person to create an account becomes the owner.\n  Leave this window open while people work. Press Ctrl+C to stop.\n');
  const cert = getCert();
  if (!cert) console.log('  (Secure address not available: the computer has no certificate tool. Text chat and presence work; for voice and video see HOST-GUIDE.html.)\n');
  if (cert) { try { https.createServer(cert, handler(true)).listen(S.httpsPort, '0.0.0.0', () => { console.log('  For voice and video use the secure address (your browser will warn once: choose Advanced, then Continue):\n'); for (const ip of nets) console.log('     https://' + ip + ':' + S.httpsPort); console.log(''); }).on('error', () => { }); } catch (e) { } }
});
