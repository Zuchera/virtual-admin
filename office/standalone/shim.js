/* StartDotCom HQ standalone: sign-in, approval and live data on Supabase.
   Gives the office the same "claude.use(...)" interface it uses inside Zuchera: db, room (presence), user and assets. */
(function () {
  'use strict';
  const CFG = window.OFFICE_CONFIG || {};
  const $$ = (t, a, ...k) => { const e = document.createElement(t); for (const x in a || {}) { if (x === 'text') e.textContent = a[x]; else if (x.startsWith('on')) e.addEventListener(x.slice(2), a[x]); else if (x === 'class') e.className = a[x]; else e.setAttribute(x, a[x]); } k.flat().forEach(c => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase) { console.warn('Office: no Supabase settings in config.js, running as a solo preview.'); return; }
  const WS = String(CFG.workspace || 'office').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'office';
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  window.OFFICE_STANDALONE = true; window.OFFICE_SB = sb;
  let ctx = null, resolveReady; const ready = new Promise(r => { resolveReady = r; });
  const TAB = Math.random().toString(36).slice(2, 8);

  /* ---------------- sign-in screen ---------------- */
  const css = `#auth{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:linear-gradient(160deg,#0f1b2d,#1d2b45 55%,#2456ff);font-family:Figtree,system-ui,sans-serif}
  #auth .card{width:min(420px,100%);background:#fafbfd;border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px;color:#14202e}
  #auth h1{margin:0;font:700 24px 'Bricolage Grotesque',Figtree,sans-serif}#auth p{margin:0;color:#4a5a6c;font-size:14px}
  #auth input{border:1px solid rgba(20,32,46,.18);border-radius:10px;padding:10px 12px;font:inherit;width:100%}
  #auth button{border:0;border-radius:10px;padding:11px 14px;font:700 14px Figtree,sans-serif;cursor:pointer;background:#2456ff;color:#fff}
  #auth button.ghost{background:transparent;color:#14202e;border:1px solid rgba(20,32,46,.18)}#auth button.ms{background:#fff;color:#14202e;border:1px solid rgba(20,32,46,.18);display:flex;gap:10px;align-items:center;justify-content:center}
  #auth .tabs{display:flex;gap:6px}#auth .tabs button{flex:1;background:transparent;color:#4a5a6c;border:1px solid rgba(20,32,46,.12)}#auth .tabs button.on{background:#14202e;color:#fff}
  #auth .err{color:#d6453d;font-weight:700;min-height:1em}#auth .ok{color:#1f9d6b;font-weight:700}#auth .or{display:flex;align-items:center;gap:10px;color:#9aa6b2;font-size:12px}#auth .or:before,#auth .or:after{content:"";flex:1;height:1px;background:rgba(20,32,46,.12)}
  #auth label{font-size:12px;font-weight:700;color:#4a5a6c;text-transform:uppercase;letter-spacing:.05em}`;
  document.head.append($$('style', {}, css));
  const box = $$('div', { id: 'auth' }), card = $$('div', { class: 'card' }); box.append(card);
  const show = () => { if (!box.isConnected) document.body.append(box); }, hide = () => box.remove();
  const title = () => [$$('h1', { text: CFG.appName || 'Virtual office' }), $$('p', { text: CFG.tagline || 'Sign in to walk into the office.' })];
  function loginForm(mode) {
    mode = mode || 'in'; const err = $$('p', { class: 'err' }), em = $$('input', { type: 'email', autocomplete: 'email', placeholder: 'you@company.com', 'aria-label': 'Email' }), pw = $$('input', { type: 'password', autocomplete: mode === 'up' ? 'new-password' : 'current-password', placeholder: 'Password (8+ characters)', 'aria-label': 'Password' }), nm = $$('input', { type: 'text', autocomplete: 'name', placeholder: 'Your name', 'aria-label': 'Name' });
    const go = async () => { err.textContent = ''; const e = em.value.trim(), p = pw.value; if (!/^\S+@\S+\.\S+$/.test(e)) { err.textContent = 'Enter your email.'; return; } if (p.length < 8) { err.textContent = 'Passwords need at least 8 characters.'; return; }
      const r = mode === 'up' ? await sb.auth.signUp({ email: e, password: p, options: { data: { name: nm.value.trim() }, emailRedirectTo: location.origin + location.pathname } }) : await sb.auth.signInWithPassword({ email: e, password: p });
      if (r.error) { err.textContent = r.error.message; return; } if (mode === 'up' && !r.data.session) { card.replaceChildren(...title(), $$('p', { class: 'ok', text: 'Check your email to confirm your account, then come back and sign in.' }), $$('button', { class: 'ghost', text: 'Back to sign in', onclick: () => loginForm('in') })); } };
    const magic = async () => { err.textContent = ''; const e = em.value.trim(); if (!/^\S+@\S+\.\S+$/.test(e)) { err.textContent = 'Enter your email first.'; return; } const r = await sb.auth.signInWithOtp({ email: e, options: { emailRedirectTo: location.origin + location.pathname } }); err.textContent = ''; if (r.error) err.textContent = r.error.message; else err.replaceWith($$('p', { class: 'ok', text: 'We emailed you a sign-in link.' })); };
    const ms = async () => { const r = await sb.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email openid profile', redirectTo: location.origin + location.pathname } }); if (r.error) err.textContent = r.error.message; };
    card.replaceChildren(...title(), CFG.allowSignup !== false ? $$('div', { class: 'tabs' }, $$('button', { class: mode === 'in' ? 'on' : '', text: 'Sign in', onclick: () => loginForm('in') }), $$('button', { class: mode === 'up' ? 'on' : '', text: 'Create account', onclick: () => loginForm('up') })) : null,
      CFG.microsoft ? $$('button', { class: 'ms', onclick: ms }, $$('span', { text: '⊞' }), 'Sign in with Microsoft') : null, CFG.microsoft ? $$('div', { class: 'or', text: 'or' }) : null,
      mode === 'up' ? $$('label', { text: 'Name' }) : null, mode === 'up' ? nm : null, $$('label', { text: 'Email' }), em, $$('label', { text: 'Password' }), pw, err,
      $$('button', { text: mode === 'up' ? 'Create account' : 'Sign in', onclick: go }), mode === 'in' ? $$('button', { class: 'ghost', text: 'Email me a sign-in link instead', onclick: magic }) : null,
      $$('p', { text: CFG.allowSignup !== false ? 'New accounts wait for an admin to approve them, unless you were invited.' : 'Accounts are by invitation only.' }));
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); show();
  }
  function waiting(status) {
    card.replaceChildren(...title(), $$('h1', { text: status === 'blocked' ? 'Access declined' : 'Waiting in reception', style: 'font-size:20px' }),
      $$('p', { text: status === 'blocked' ? 'An admin has not approved this account. Contact them if you think this is a mistake.' : 'Your account is waiting for an admin to approve it. This page lets you in automatically once they do.' }),
      $$('button', { class: 'ghost', text: 'Sign out', onclick: () => sb.auth.signOut().then(() => location.reload()) })); show();
  }

  /* ---------------- membership ---------------- */
  async function member(user) {
    let { data } = await sb.from('members').select('*').eq('ws', WS).eq('user_id', user.id).maybeSingle();
    if (!data) { const nm = (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) || (user.email || '').split('@')[0]; const ins = await sb.from('members').insert({ ws: WS, user_id: user.id, email: user.email, name: nm }).select().maybeSingle(); if (ins.error) throw ins.error; data = ins.data; }
    return data;
  }
  let started = false, memberTimer = 0;
  async function boot(session) {
    if (!session) { loginForm('in'); return; }
    let m; try { m = await member(session.user); } catch (e) { card.replaceChildren(...title(), $$('p', { class: 'err', text: 'Could not reach the office: ' + (e.message || e) }), $$('button', { text: 'Try again', onclick: () => location.reload() })); show(); return; }
    if (m.status !== 'approved') { waiting(m.status); clearTimeout(memberTimer); memberTimer = setTimeout(() => boot(session), 8000); return; }
    hide(); if (started) return; started = true;
    ctx = { user: session.user, m }; window.OFFICE_SIGNOUT = () => sb.auth.signOut().then(() => location.reload());
    window.OFFICE_ASSET_URL = id => sb.storage.from('office-files').getPublicUrl(id).data.publicUrl;
    if (m.role === 'owner' || m.role === 'admin') window.OFFICE_ADMIN = ADMIN;
    resolveReady(ctx);
  }
  sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_OUT') { if (started) location.reload(); else loginForm('in'); } else if (session && !started && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION' || ev === 'TOKEN_REFRESHED')) boot(session); else if (!session && ev === 'INITIAL_SESSION') loginForm('in'); });

  /* ---------------- db: JSON documents at paths, live ---------------- */
  const cols = {}, listeners = {}; let rtDocs = null;
  const colOf = p => p.split('/').slice(0, -1).join('/'), idOf = p => p.split('/').pop();
  function emit(col) { const m = cols[col] || new Map(); const docs = [...m].map(([id, data]) => ({ id, exists: true, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } })); for (const f of listeners[col] || []) try { f({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }); } catch (e) { console.error(e); } }
  function liveDocs() {
    if (rtDocs) return; rtDocs = sb.channel('docs:' + WS).on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'ws=eq.' + WS }, pl => {
      const row = pl.new && pl.new.path ? pl.new : pl.old; if (!row || !row.path) return; const col = row.col || colOf(row.path), m = cols[col] || (cols[col] = new Map());
      if (pl.eventType === 'DELETE') m.delete(idOf(row.path)); else m.set(idOf(row.path), pl.new.data); emit(col);
    }).subscribe();
  }
  const err = e => ({ code: e && /quota|limit/i.test(e.message || '') ? 'quota_exceeded' : 'invalid_argument', message: (e && e.message) || 'write failed' });
  const DB = {
    doc(path) { return {
      id: idOf(path), path,
      async get() { const { data } = await sb.from('docs').select('data').eq('ws', WS).eq('path', path).maybeSingle(); return { id: idOf(path), exists: !!data, data: () => data && data.data, metadata: { fromCache: false, hasPendingWrites: false } }; },
      async set(data) { const col = colOf(path), m = cols[col] || (cols[col] = new Map()); m.set(idOf(path), data); emit(col); const r = await sb.from('docs').upsert({ ws: WS, path, col, data, updated_by: ctx.user.id, updated_at: new Date().toISOString() }); if (r.error) throw err(r.error); },
      async update(data) { const cur = cols[colOf(path)] && cols[colOf(path)].get(idOf(path)); return this.set(Object.assign({}, cur || {}, data)); },
      async delete() { const col = colOf(path); if (cols[col]) { cols[col].delete(idOf(path)); emit(col); } const r = await sb.from('docs').delete().eq('ws', WS).eq('path', path); if (r.error) throw err(r.error); },
      onSnapshot(next) { const c = colOf(path); const f = s => { const d = s.docs.find(x => x.id === idOf(path)); next(d || { id: idOf(path), exists: false, data: () => undefined, metadata: {} }); }; (listeners[c] = listeners[c] || []).push(f); DB.collection(c).get(); return () => { listeners[c] = listeners[c].filter(x => x !== f); }; }
    }; },
    collection(col) { return {
      path: col, doc: id => DB.doc(col + '/' + (id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)))),
      async get() { const { data, error } = await sb.from('docs').select('path,data').eq('ws', WS).eq('col', col).limit(5000); if (error) throw err(error); const m = new Map(); for (const r of data || []) m.set(idOf(r.path), r.data); cols[col] = m; emit(col); return { docs: [...m].map(([id, d]) => ({ id, exists: true, data: () => d })) }; },
      onSnapshot(next, onErr) { (listeners[col] = listeners[col] || []).push(next); liveDocs(); this.get().catch(e => onErr && onErr(err(e))); return () => { listeners[col] = (listeners[col] || []).filter(x => x !== next); }; },
      where() { return this; }, orderBy() { return this; }, limit() { return this; }
    }; }
  };

  /* ---------------- room: who is here now (presence), throttled to stay inside realtime quotas ---------------- */
  let chan = null, mine = {}, trackT = 0, trackQ = null, conn = false; const peerFns = [], connFns = [], topicFns = {};
  function list() {
    const st = chan ? chan.presenceState() : {}, out = [];
    for (const [key, metas] of Object.entries(st)) { const m = metas[metas.length - 1] || {}; out.push({ peer: key, by: m.u || null, isMe: m.u === ctx.user.id, sameTab: key === ctx.user.id + ':' + TAB, kind: 'viewer', guest: false, presence: m.p || {}, updatedAt: Date.now() }); }
    if (!out.some(p => p.sameTab)) out.push({ peer: ctx.user.id + ':' + TAB, by: ctx.user.id, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() });
    return out;
  }
  function openRoom() {
    if (chan) return; chan = sb.channel('office:' + WS, { config: { private: true, presence: { key: ctx.user.id + ':' + TAB } } });
    chan.on('presence', { event: 'sync' }, () => { const peers = list(); peerFns.forEach(f => f({ peers, joined: [], left: [], updated: [] })); });
    chan.on('broadcast', { event: 'e' }, msg => { const pl = msg && msg.payload; if (!pl || typeof pl.topic !== 'string') return; for (const f of topicFns[pl.topic] || []) try { f(pl.data, { by: pl.by, peer: pl.peer }); } catch (e) { console.error(e); } });
    chan.subscribe(s => { conn = s === 'SUBSCRIBED'; connFns.forEach(f => f(conn)); if (conn) chan.track({ u: ctx.user.id, p: mine }); });
  }
  const minGap = CFG.presenceMs || 250;
  const ROOM = {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } const now = Date.now(); clearTimeout(trackQ);
      const send = () => { trackT = Date.now(); if (chan && conn) chan.track({ u: ctx.user.id, p: mine }); }; if (now - trackT > minGap) send(); else trackQ = setTimeout(send, minGap - (now - trackT)); return Promise.resolve(); },
    onPeers(fn) { peerFns.push(fn); openRoom(); setTimeout(() => fn({ peers: list(), joined: [], left: [], updated: [] }), 0); return () => { const i = peerFns.indexOf(fn); if (i >= 0) peerFns.splice(i, 1); }; },
    onConnection(fn) { connFns.push(fn); openRoom(); setTimeout(() => fn(conn), 0); return () => { }; },
    peers: () => list(), connected: () => conn,
    emit(topic, data) { openRoom(); if (!chan || !conn) return Promise.resolve(); return chan.send({ type: 'broadcast', event: 'e', payload: { topic, data, by: ctx.user.id, peer: ctx.user.id + ':' + TAB } }).then(() => { }); },
    on(topic, fn) { (topicFns[topic] = topicFns[topic] || []).push(fn); openRoom(); return () => { topicFns[topic] = topicFns[topic].filter(x => x !== fn); }; }
  };

  /* ---------------- user ---------------- */
  const names = {};
  const USER = {
    async me() { return { id: ctx.user.id, name: ctx.m.name || '', email: ctx.user.email, avatarUrl: '', color: '#2456ff', isOwner: ctx.m.role === 'owner', canEdit: ctx.m.role === 'owner' || ctx.m.role === 'admin' }; },
    async id() { return ctx.user.id; }, async isOwner() { return ctx.m.role === 'owner'; }, async canEdit() { return ctx.m.role === 'owner' || ctx.m.role === 'admin'; }, async can() { return true; },
    async profiles(ids) { ids = [].concat(ids).filter(x => typeof x === 'string'); const need = ids.filter(i => !(i in names) && /^[0-9a-f-]{36}$/.test(i)); if (need.length) { const { data } = await sb.from('members').select('user_id,name').eq('ws', WS).in('user_id', need); for (const r of data || []) names[r.user_id] = r.name || ''; need.forEach(i => { if (!(i in names)) names[i] = ''; }); }
      const out = {}; for (const i of ids) out[i] = { id: i, name: names[i] || '', avatarUrl: '', color: '#888', email: null, isMe: i === ctx.user.id, guest: false }; return out; },
    async search() { return []; }
  };
  /* ---------------- files ---------------- */
  const ASSETS = {
    async upload(file) { const safe = (file.name || 'file').replace(/[^\w.-]+/g, '_').slice(-80), path = WS + '/' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)) + '-' + safe; const r = await sb.storage.from('office-files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false }); if (r.error) throw r.error; return { id: path, url: sb.storage.from('office-files').getPublicUrl(path).data.publicUrl, sizeBytes: file.size, contentType: file.type }; },
    async delete(id) { await sb.storage.from('office-files').remove([id]); }, async list() { return { assets: [], usage: {} }; }
  };
  /* ---------------- admin: accounts, roles, invitations ---------------- */
  const ADMIN = {
    async list() { const { data, error } = await sb.from('members').select('*').eq('ws', WS).order('created_at'); if (error) throw error; return data; },
    async setStatus(uid, status) { const r = await sb.from('members').update({ status }).eq('ws', WS).eq('user_id', uid); if (r.error) throw r.error; },
    async setRole(uid, role) { const r = await sb.from('members').update({ role }).eq('ws', WS).eq('user_id', uid); if (r.error) throw r.error; },
    async invites() { const { data, error } = await sb.from('invites').select('*').eq('ws', WS).order('created_at'); if (error) throw error; return data; },
    async invite(email, role) { const r = await sb.from('invites').upsert({ ws: WS, email, role }); if (r.error) throw r.error; },
    async uninvite(email) { const r = await sb.from('invites').delete().eq('ws', WS).eq('email', email); if (r.error) throw r.error; }
  };

  window.claude = { use: async name => { await ready; return { db: DB, room: ROOM, user: USER, assets: ASSETS }[name] || null; } };
})();
