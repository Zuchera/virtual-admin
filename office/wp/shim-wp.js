/* StartDotCom HQ on WordPress: sign-in, approval, live data, files and call setup, all served by this WordPress site.
   Gives the office the same "claude.use(...)" interface it uses inside Zuchera: db, room (presence and events), user and assets. */
(function () {
  'use strict';
  const CFG = window.OFFICE_CONFIG || {}; if (!CFG.wp || !CFG.ajax) return;
  const $$ = (t, a, ...k) => { const e = document.createElement(t); for (const x in a || {}) { if (x === 'text') e.textContent = a[x]; else if (x.startsWith('on')) e.addEventListener(x.slice(2), a[x]); else if (x === 'class') e.className = a[x]; else e.setAttribute(x, a[x]); } k.flat().forEach(c => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
  const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter(x => x != null));
  window.OFFICE_STANDALONE = true; window.OFFICE_WP = true; window.OFFICE_LOOKS = Array.isArray(CFG.looks) ? CFG.looks : null;
  let tok = CFG.token || '', ME = CFG.me || null, resolveReady; const ready = new Promise(r => { resolveReady = r; });
  const TAB = Math.random().toString(36).slice(2, 8);
  const ajax = (action, body) => fetch(CFG.ajax + '?action=sdchq_' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body || {}) }).then(r => r.json()).catch(() => ({ ok: false, err: 'Could not reach the server. Check your connection and try again.' }));

  /* ---------------- sign-in screen ---------------- */
  const css = `#auth{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:linear-gradient(160deg,#0b1422,#14233b 55%,#2456ff);font-family:Figtree,system-ui,sans-serif;overflow:auto}
  #auth .card{width:min(420px,100%);background:#fafbfd;border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px;color:#14202e}
  #auth h1{margin:0;font:700 24px 'Bricolage Grotesque',Figtree,sans-serif}#auth p{margin:0;color:#4a5a6c;font-size:14px}
  #auth input{border:1px solid rgba(20,32,46,.18);border-radius:10px;padding:10px 12px;font:inherit;width:100%;box-sizing:border-box}
  #auth button{border:0;border-radius:10px;padding:11px 14px;font:700 14px Figtree,sans-serif;cursor:pointer;background:#2456ff;color:#fff}
  #auth button.ghost{background:transparent;color:#14202e;border:1px solid rgba(20,32,46,.18)}
  #auth .tabs{display:flex;gap:6px}#auth .tabs button{flex:1;background:transparent;color:#4a5a6c;border:1px solid rgba(20,32,46,.12)}#auth .tabs button.on{background:#14202e;color:#fff}
  #auth .err{color:#d6453d;font-weight:700;min-height:1em}#auth .ok{color:#1f9d6b;font-weight:700}
  #auth label{font-size:12px;font-weight:700;color:#4a5a6c;text-transform:uppercase;letter-spacing:.05em}`;
  document.head.append($$('style', {}, css));
  const box = $$('div', { id: 'auth' }), card = $$('div', { class: 'card' }); box.append(card);
  const show = () => { if (!box.isConnected) (document.body || document.documentElement).append(box); }, hide = () => box.remove();
  const title = () => [$$('h1', { text: CFG.appName || 'Virtual office' }), $$('p', { text: CFG.tagline || 'Sign in to walk into the office.' })];
  function loginForm(mode) {
    mode = mode || (CFG.invite ? 'up' : 'in'); const up = mode === 'up', err = $$('p', { class: 'err', role: 'alert' });
    const em = $$('input', { type: up ? 'email' : 'text', autocomplete: up ? 'email' : 'username', placeholder: 'you@company.com', 'aria-label': 'Email' }), pw = $$('input', { type: 'password', autocomplete: up ? 'new-password' : 'current-password', placeholder: up ? 'Choose a password (8+ characters)' : 'Password', 'aria-label': 'Password' }), nm = $$('input', { type: 'text', autocomplete: 'name', placeholder: 'Your name', 'aria-label': 'Name' });
    const btn = $$('button', { text: up ? 'Create account' : 'Sign in' });
    const go = async () => { err.textContent = ''; const e = em.value.trim(), p = pw.value; if (!e) { err.textContent = 'Enter your email.'; return; } if (up && p.length < 8) { err.textContent = 'Passwords need at least 8 characters.'; return; }
      btn.disabled = true; const r = await ajax(up ? 'register' : 'login', up ? { email: e, password: p, name: nm.value.trim(), code: CFG.invite } : { login: e, password: p, code: CFG.invite }); btn.disabled = false;
      if (!r.ok) { err.textContent = r.err || 'That did not work. Try again.'; return; } tok = r.token; ME = r.me; boot(); };
    btn.addEventListener('click', go);
    fill(card, ...title(), (CFG.allowSignup || CFG.invite) ? $$('div', { class: 'tabs' }, $$('button', { class: up ? '' : 'on', text: 'Sign in', onclick: () => loginForm('in') }), $$('button', { class: up ? 'on' : '', text: 'Create account', onclick: () => loginForm('up') })) : null,
      CFG.invite && up ? $$('p', { class: 'ok', text: 'You have an invitation. Create your account to walk straight in.' }) : null,
      up ? $$('label', { text: 'Name' }) : null, up ? nm : null, $$('label', { text: 'Email' }), em, $$('label', { text: 'Password' }), pw, err, btn,
      $$('p', { text: up ? 'No confirmation email is needed. Your account is created on this site.' : 'Forgot your password? Ask an office admin to reset it for you. No email is needed.' }));
    [em, pw, nm].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); })); show();
  }
  function waiting(status) {
    fill(card, ...title(), $$('h1', { text: status === 'blocked' ? 'Access declined' : status === 'full' ? 'This office is full' : 'Waiting in reception', style: 'font-size:20px' }),
      $$('p', { text: status === 'blocked' ? 'An admin has not approved this account. Contact them if you think this is a mistake.' : status === 'full' ? 'Every seat on this office plan is in use. Ask an admin to upgrade the plan or free a seat.' : 'Your account is waiting for an admin to approve it. This page lets you in automatically once they do.' }),
      $$('button', { class: 'ghost', text: 'Sign out', onclick: signOut })); show();
  }
  const signOut = () => ajax('logout').then(() => { location.href = CFG.self || location.href; });
  let started = false, waitT = 0;
  async function boot() {
    if (!tok || !ME) { loginForm(); return; }
    if (ME.status !== 'approved') { waiting(ME.status); clearTimeout(waitT); waitT = setTimeout(async () => { const r = await ajax('token'); if (r.ok) { tok = r.token; ME = r.me; } boot(); }, 7000); return; }
    hide(); if (started) return; started = true;
    window.OFFICE_SIGNOUT = signOut; window.OFFICE_ASSET_URL = id => CFG.files + String(id).split('/').map(encodeURIComponent).join('/');
    if (ME.role === 'owner' || ME.role === 'admin') window.OFFICE_ADMIN = ADMIN;
    setInterval(async () => { const r = await ajax('token'); if (r.ok) { tok = r.token; ME = r.me; } }, 3 * 3600 * 1000);
    window.OFFICE_HOOK = (conv, text) => { adm('slackpost', { conv, text }).catch(() => { }); };
    resolveReady(); startSync();
  }

  /* ---------------- the sync loop: one small request carries everything both ways ---------------- */
  const cols = {}, listeners = {}, pending = new Set(); let rc = 0, ec = -1, outW = [], outEv = [], mine = {}, peersNow = [], conn = false, firstDone, busy = false, lastT = 0, fastUntil = 0, slow = 1, fails = 0, api = CFG.api, useAjax = false;
  const first = new Promise(r => { firstDone = r; }); const peerFns = [], connFns = [], topicFns = {};
  const colOf = p => p.split('/')[0], idOf = p => p.slice(p.indexOf('/') + 1);
  const snap = (id, data) => ({ id, exists: data !== undefined, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } });
  function emit(col) { const m = cols[col] || new Map(), docs = [...m].map(([id, d]) => snap(id, d)); for (const f of listeners[col] || []) try { f({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }); } catch (e) { console.error(e); } }
  function setConn(c) { if (c === conn) return; conn = c; connFns.forEach(f => { try { f(c); } catch (e) { } }); }
  try { if (CFG.sw && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(CFG.sw, { scope: new URL(CFG.swScope, location.href).pathname }).catch(() => { }); } catch (e) { }
  function list() { const out = peersNow.map(p => ({ peer: p.peer, by: p.uid, isMe: p.uid === ME.id, sameTab: false, kind: 'viewer', guest: false, presence: p.p || {}, updatedAt: Date.now() })); out.push({ peer: ME.id + ':' + TAB, by: ME.id, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() }); return out; }
  async function sync() {
    if (busy) return; busy = true; lastT = Date.now(); const w = outW, ev = outEv; outW = []; outEv = []; const sentPaths = w.map(x => x.path);
    try {
      const body = JSON.stringify({ a: 'sync', tok, peer: ME.id + ':' + TAB, p: mine, ev, w, rc, ec }), t0 = performance.now();
      let res = await fetch(useAjax ? CFG.ajax + '?action=sdchq_api' : api, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain' }, body });
      let r = null; try { r = await res.json(); } catch (e) { r = null; }
      if (!r && !useAjax) { useAjax = true; throw new Error('fast endpoint blocked, switching to admin-ajax'); }       // some hosts block direct plugin files
      if (!r) throw new Error('bad response');
      if (!r.ok) { if (r.err === 'auth') { const t = await ajax('token'); if (t.ok) { tok = t.token; ME = t.me; } else { location.reload(); return; } } else if (r.err === 'status') { location.reload(); return; } throw new Error(r.err || 'sync'); }
      const dt = performance.now() - t0; slow = dt > (CFG.syncMs || 800) * .7 ? Math.min(4, slow * 1.4) : Math.max(1, slow * .9); fails = 0;
      sentPaths.forEach(p => pending.delete(p)); if (r.denied && r.denied.length) { rc = 0; console.warn('Office: not allowed to change', r.denied); for (const c in cols) cols[c] = new Map(); r = Object.assign({}, r, { docs: [] }); } else rc = r.rc;   // a refused change: reload the true state
      ec = r.ec; if (r.role && r.role !== ME.role) { ME.role = r.role; }
      const touched = new Set();
      for (const d of r.docs || []) { if (pending.has(d.path)) continue; const col = colOf(d.path), id = idOf(d.path), m = cols[col] || (cols[col] = new Map());
        if (d.del) { if (m.delete(id)) touched.add(col); } else { const old = m.get(id); if (old === undefined || JSON.stringify(old) !== JSON.stringify(d.data)) { m.set(id, d.data); touched.add(col); } } }
      const wasFirst = !sync.done; sync.done = true; if (wasFirst) { firstDone(); for (const c in listeners) touched.add(c); }
      touched.forEach(emit);
      peersNow = r.peers || []; const pl = list(); peerFns.forEach(f => { try { f({ peers: pl, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } });
      for (const e of r.ev || []) { if (e.topic === 'rtc') fastUntil = Date.now() + 6000; for (const f of topicFns[e.topic] || []) try { f(e.data, { by: e.by, peer: e.peer }); } catch (er) { console.error(er); } }
      setConn(true);
    } catch (e) { outW = w.concat(outW); outEv = ev.concat(outEv); if (++fails > 2) setConn(false); }
    finally { busy = false; }
  }
  function due() { const base = CFG.syncMs || 800, others = peersNow.length > 0; let gap = document.hidden ? 3000 : others ? base * slow : Math.max(base, 2000);
    if (Date.now() < fastUntil) gap = Math.min(gap, 300); if (outW.length || outEv.length) gap = Math.min(gap, 220); if (fails > 2) gap = Math.min(15000, 2000 * fails); return Date.now() - lastT >= gap; }
  function startSync() {
    const tick = () => { if (due()) sync(); };
    try { const wk = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),110)'], { type: 'text/javascript' }))); wk.onmessage = tick; } catch (e) { setInterval(tick, 110); }   // a worker keeps ticking when the tab is in the background
    sync(); addEventListener('online', () => { fails = 0; sync(); });
    addEventListener('pagehide', () => { try { navigator.sendBeacon(useAjax ? CFG.ajax + '?action=sdchq_api' : api, new Blob([JSON.stringify({ a: 'sync', tok, peer: ME.id + ':' + TAB, bye: 1, ev: outEv, w: outW })], { type: 'text/plain' })); } catch (e) { } });
  }
  const write = (path, data) => { const i = outW.findIndex(x => x.path === path); if (i >= 0) outW.splice(i, 1); outW.push(data === undefined ? { path } : { path, data }); pending.add(path); };
  const DB = {
    doc(path) { const col = colOf(path), id = idOf(path); return {
      id, path,
      async get() { await first; const m = cols[col]; return snap(id, m ? m.get(id) : undefined); },
      async set(data) { data = JSON.parse(JSON.stringify(data)); const m = cols[col] || (cols[col] = new Map()); m.set(id, data); write(path, data); emit(col); },
      async update(data) { const cur = cols[col] && cols[col].get(id); return this.set(Object.assign({}, cur || {}, data)); },
      async delete() { if (cols[col] && cols[col].delete(id)) emit(col); write(path); },
      onSnapshot(next) { const f = s => next(s.docs.find(x => x.id === id) || snap(id, undefined)); (listeners[col] = listeners[col] || []).push(f); first.then(() => emit(col)); return () => { listeners[col] = listeners[col].filter(x => x !== f); }; }
    }; },
    collection(col) { return {
      path: col, doc: id => DB.doc(col + '/' + (id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)))),
      async get() { await first; const m = cols[col] || new Map(); return { docs: [...m].map(([id, d]) => snap(id, d)) }; },
      onSnapshot(next) { (listeners[col] = listeners[col] || []).push(next); first.then(() => { const m = cols[col] || new Map(), docs = [...m].map(([id, d]) => snap(id, d)); try { next({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }); } catch (e) { console.error(e); } }); return () => { listeners[col] = (listeners[col] || []).filter(x => x !== next); }; },
      where() { return this; }, orderBy() { return this; }, limit() { return this; }
    }; }
  };
  const ROOM = {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } return Promise.resolve(); },
    onPeers(fn) { peerFns.push(fn); setTimeout(() => fn({ peers: list(), joined: [], left: [], updated: [] }), 0); return () => { const i = peerFns.indexOf(fn); if (i >= 0) peerFns.splice(i, 1); }; },
    onConnection(fn) { connFns.push(fn); setTimeout(() => fn(conn), 0); return () => { }; },
    peers: () => list(), connected: () => conn,
    emit(topic, data) { outEv.push({ topic, data, to: data && typeof data.to === 'string' ? data.to : null }); if (topic === 'rtc') fastUntil = Date.now() + 6000; return Promise.resolve(); },
    on(topic, fn) { (topicFns[topic] = topicFns[topic] || []).push(fn); return () => { topicFns[topic] = topicFns[topic].filter(x => x !== fn); }; }
  };
  const USER = {
    async me() { return { id: ME.id, name: ME.name || '', email: ME.email, avatarUrl: '', color: '#2456ff', isOwner: ME.role === 'owner', canEdit: ME.role === 'owner' || ME.role === 'admin' }; },
    async id() { return ME.id; }, async isOwner() { return ME.role === 'owner'; }, async canEdit() { return ME.role === 'owner' || ME.role === 'admin'; }, async can() { return true; },
    async profiles(ids) { await first; const out = {}, ppl = cols.people || new Map(); for (const i of [].concat(ids)) if (typeof i === 'string') { const d = ppl.get(i); out[i] = { id: i, name: (d && (d.nm || d.name)) || '', avatarUrl: '', color: '#888', email: null, isMe: i === ME.id, guest: false }; } return out; },
    async search() { return []; }
  };
  const ASSETS = {
    async upload(file) { const fd = new FormData(); fd.append('tok', tok); fd.append('file', file, file.name || 'file'); const r = await fetch(CFG.ajax + '?action=sdchq_upload', { method: 'POST', credentials: 'omit', body: fd }).then(x => x.json()).catch(() => ({ ok: false, err: 'Upload failed.' })); if (!r.ok) throw new Error(r.err || 'Upload failed.'); return { id: r.id, url: r.url, sizeBytes: r.size, contentType: file.type }; },
    async delete() { }, async list() { return { assets: [], usage: {} }; }
  };
  const adm = async (op, x) => { const r = await ajax('admin', Object.assign({ tok, op }, x || {})); if (!r.ok) throw new Error(r.err || 'Not allowed.'); return r; };
  const ADMIN = {
    list: async () => (await adm('list')).list, setStatus: (uid, status) => adm('status', { uid, status }), setRole: (uid, role) => adm('role', { uid, role }),
    invites: async () => (await adm('invites')).invites, invite: (email, role) => adm('invite', { email, role }), uninvite: email => adm('uninvite', { email }),
    resetPw: async uid => (await adm('resetpw', { uid })).password, link: async () => (await adm('link')).url, aikey: async k => adm('aikey', { key: k }), aistate: async () => (await adm('aistate')).set,  license: async key => { const r = await adm('license', { key }); return r; }, claim: async () => adm('claim'), slack: async (url, ch) => { const r = await adm('slack', { url, ch }); return r; }
  };
  const SAMPLE = async (prompt, o) => { const r = await adm('ai', { prompt: String(prompt).slice(0, 30000) }); if (o && o.onText) o.onText({ text: r.text }); return r.text; };
  window.OFFICE_AI = SAMPLE; window.OFFICE_ICS = async url => (await adm('ics', { url })).text;
  window.claude = { use: async name => { await ready; return { db: DB, room: ROOM, user: USER, assets: ASSETS, sample: SAMPLE }[name] || null; } };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
