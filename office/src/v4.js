/* ============================ v4: realistic look picker, actions, tap on the shoulder, approval lobby, timeouts, branding, insights, assistant ============================ */
Object.assign(EMOJI, { cheer: '🎉', shrug: '🤷', think: '🤔', present: '📊', stretch: '🙆', jump: '⬆️', flip: '🤸', kick: '🦵', spin: '🌀', pushup: '💪', climb: '🧗', hug: '🤗', shake: '🤝', five: '✋', tap: '👆' });
Object.assign(EMO_DUR, { cheer: 3, shrug: 2.6, think: 4, present: 4.5, stretch: 5, invite: 3, knock: 2.4 });
const PAIR = { hug: ['🤗', 'a hug', 0.6], shake: ['🤝', 'a handshake', 0.9], five: ['✋', 'a high five', 0.9] };
me.act = null; me.hist = LS.get('hist', {}); me.req = 0; me.approved = false;

/* ---------- look picker: realistic people, female or male ---------- */
function lookPicker(onChange) {
  const box = el('div', { class: 'looks' }), g0 = me.cfg.m.charAt(0); let g = g0;
  const draw = () => box.replaceChildren(
    el('div', { class: 'chips' }, ...[['f', 'Female'], ['m', 'Male']].map(([k, t]) => el('button', { type: 'button', class: g === k ? 'sel' : '', text: t, onclick: () => { g = k; if (!HUMANS.length) { me.cfg.fig = k === 'f' ? 1 : 0; me.cfg.m = k + '1'; me.av.rebuild(me.cfg); saveProfile(); if (onChange) onChange(me.cfg.m); } draw(); } }))),
    !HUMANS.length ? el('p', { class: 'meta', text: window.OFFICE_WP ? 'Realistic people are not installed on this site yet, so everyone appears as a simple figure. A site admin can add them in WordPress under Virtual Office.' : 'This copy uses simple built-in figures.' }) : null,
    el('div', { class: 'lookgrid' }, ...HUMANS.filter(h => h[1] === g).map(([id]) => el('button', { type: 'button', class: 'look' + (me.cfg.m === id ? ' sel' : ''), title: 'Choose this look', 'aria-label': 'Look ' + id, onclick: () => { me.cfg.m = id; me.av.rebuild(me.cfg); saveProfile(); if (onChange) onChange(id); draw(); } }, el('img', { src: humanThumb(id), alt: '', loading: 'lazy' })))));
  draw(); return box;
}
panels.avatar = b => {
  cam.mirror = { yaw: me.ry + PI }; if (cam.fp) toggleView(); drawer.onClose = () => { cam.mirror = null; };
  const nm = el('input', { id: 'fName', type: 'text', maxLength: 40, value: me.name, oninput: e => { me.name = e.target.value.trim(); saveProfile(); recomputeDesks(); } }), rl = el('input', { id: 'fRole', type: 'text', maxLength: 40, value: me.role, oninput: e => { me.role = e.target.value.trim(); saveProfile(); } });
  const ht = el('input', { id: 'fHt', type: 'range', min: 0.92, max: 1.08, step: 0.01, value: me.cfg.ht, oninput: e => { me.cfg.ht = +e.target.value; me.av.rebuild(me.cfg); saveProfile(); } });
  b.append(el('p', { text: 'Pick the person who represents you. They are realistic 3D people with motion-captured movement; teammates see your choice straight away.' }), el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'Your look' }), lookPicker()), field('Height', ht),
    field('Display name', nm), field('Job title', rl), el('button', { class: 'btn ghost', text: 'Edit my details, Teams ID and call settings', onclick: () => showSetup(true) }), outlookCard(), el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Done', onclick: closeDrawer })),
    el('p', { class: 'meta', text: 'People: Microsoft Rocketbox Avatar Library (MIT licence).' }));
};

/* ---------- actions: gestures, moves, and things you do with someone ---------- */
function doAct(k, o) {
  o = o || {}; if (me.seat && k !== 'tap') stand(); me.path = null; me.pending = null;
  if (o.x != null) me.ry = Math.atan2(o.x - me.pos.x, o.z - me.pos.z);
  me.act = { k, n: Date.now(), x: o.x != null ? +o.x.toFixed(2) : null, z: o.z != null ? +o.z.toFixed(2) : null, w: o.w || null, t0: performance.now() }; if (EMOJI[k] && k !== 'climb') me.av.popEmoji(EMOJI[k]);
}
const actAge = a => a ? (performance.now() - a.t0) / 1000 : 99;
function actBusy() { const a = me.act; return a && actAge(a) < (ACT_DUR[a.k] || 2) && /pushup|climb|hug|shake|five/.test(a.k); }
function nearby(r) { const out = []; for (const [k, p] of peers) { const d = Math.hypot(p.x - me.pos.x, p.z - me.pos.z); if (d < (r || 7)) out.push([k, p, d]); } return out.sort((a, b) => a[2] - b[2]); }
function climbWall() { const spot = { x: 0.62, z: 14.4 }; goTo(spot.x + 0.4, spot.z, () => { me.pos.x = spot.x; me.pos.z = spot.z; doAct('climb', { x: 0, z: spot.z }); }); }
panels.actions = b => {
  const grp = (title, items) => el('div', { class: 'field' }, el('span', { class: 'lbl', text: title }), el('div', { class: 'actgrid' }, ...items.map(([icon, label, fn]) => el('button', { type: 'button', class: 'actbtn', onclick: fn }, el('span', { class: 'ai', text: icon }), el('span', { text: label })))));
  const E = e => () => { doEmote(e); }, A = k => () => { doAct(k); };
  const near = nearby(7), with_ = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  b.append(grp('Gestures', [['👋', 'Wave', E('wave')], ['👏', 'Clap', E('clap')], ['🎉', 'Cheer', E('cheer')], ['😂', 'Laugh', E('laugh')], ['👍', 'Thumbs up', E('thumbs')], ['❤️', 'Love it', E('heart')], ['🤷', 'Shrug', E('shrug')], ['🤔', 'Think', E('think')], ['📊', 'Present', E('present')], ['🙂', 'Nod', E('nod')], ['🙆', 'Stretch', E('stretch')], ['🕺', 'Dance', E('dance')]]),
    grp('Moves', [['⬆️', 'Jump', A('jump')], ['🤸', 'Backflip', A('flip')], ['🌀', 'Spin', A('spin')], ['🦵', 'Kick', A('kick')], ['💪', 'Push-ups', A('pushup')], ['🧗', 'Climb the wall', () => { closeDrawer(); climbWall(); }]]),
    el('span', { class: 'lbl', text: 'With someone near you' }), with_);
  with_.append(...(near.length ? near.map(([k, p]) => el('div', { class: 'card', style: 'flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap' }, el('b', { style: 'flex:1;min-width:100px', text: nameOf(p.uid, p.nick) }),
    ...Object.entries(PAIR).map(([a, [i, t]]) => el('button', { class: 'btn sm ghost', text: i + ' ' + t.replace(/^a /, ''), onclick: () => { askPair(k, a); closeDrawer(); } })),
    el('button', { class: 'btn sm ghost', text: '👆 Tap on the shoulder', onclick: () => { tapShoulder(k); closeDrawer(); } }))) : [el('p', { class: 'meta', text: 'Nobody is near you. Walk up to someone to hug, shake hands or high-five, or tap anyone on the shoulder from their name card.' })]));
};
function askPair(k, a) { const p = peers.get(k); if (!p) return; me.ping = { to: k, k: 'pair', a, n: Date.now() }; toast('Asked ' + nameOf(p.uid, p.nick) + ' for ' + PAIR[a][1] + '. Waiting for them to accept…'); }
function startPair(k, a) {
  const p = peers.get(k); if (!p) return; const dx = me.pos.x - p.x, dz = me.pos.z - p.z, d = Math.hypot(dx, dz) || 1, gap = PAIR[a][2];
  const go = () => { const q = peers.get(k); if (!q) return; doAct(a, { x: q.x, z: q.z, w: k }); };
  if (d < gap + 0.15) { go(); return; } const tx = p.x + dx / d * gap, tz = p.z + dz / d * gap; if (free(tx, tz)) goTo(tx, tz, () => { me.pos.x = tx; me.pos.z = tz; go(); }); else { const f = nearestFree(tx, tz); goTo(f.x, f.z, go); }
}
function tapShoulder(k) {
  const p = peers.get(k); if (!p) { toast('They are not in the office right now. Send them a message instead.'); return; }
  const send = () => { const q = peers.get(k); if (q) doAct('tap', { x: q.x, z: q.z }); me.ping = { to: k, k: 'tap', n: Date.now() }; };
  const d = Math.hypot(p.x - me.pos.x, p.z - me.pos.z); if (d < 1.6) send(); else { const f = nearestFree(p.x + (me.pos.x - p.x) / d * 0.9, p.z + (me.pos.z - p.z) / d * 0.9); goTo(f.x, f.z, send); }
  toast('Tapping ' + nameOf(p.uid, p.nick) + ' on the shoulder…');
}
function reply(k, r) { me.ping = { to: k, k: 'reply', r, n: Date.now() }; }
/* returns true when the ping was a v4 one */
function v4Ping(p, k, pg) {
  if (pg.to !== me.peer || !/^(pair|pairok|tap|reply)$/.test(pg.k)) return false; const who = nameOf(p.uid, p.nick), pd = Store.col('people').get(p.uid) || {};
  if (pg.k === 'pair' && PAIR[pg.a]) { if (quiet()) { reply(k, 'focus'); return true; } sfx('msg'); const t = el('div', { class: 'toast island req' }, el('span', { text: PAIR[pg.a][0] + ' ' + who + ' would like ' + PAIR[pg.a][1] + '.' }), el('button', { class: 'btn sm', text: 'Accept', onclick: () => { me.ping = { to: k, k: 'pairok', a: pg.a, n: Date.now() }; me.ry = Math.atan2(p.x - me.pos.x, p.z - me.pos.z); if (me.seat) stand(); t.remove(); } }), el('button', { class: 'btn sm ghost', text: 'No thanks', onclick: () => { reply(k, 'nopair'); t.remove(); } })); $('#toasts').append(t); setTimeout(() => t.remove(), 20000); return true; }
  if (pg.k === 'pairok' && PAIR[pg.a]) { startPair(k, pg.a); return true; }
  if (pg.k === 'tap') {
    if (quiet()) { reply(k, 'focus'); const m = LS.get('missedTaps', []); m.unshift({ who, uid: p.uid, t: Date.now() }); LS.set('missedTaps', m.slice(0, 20)); renderInboxBadge(); return true; }
    sfx('point'); me.av.popEmoji('👆');
    const t = el('div', { class: 'toast island req' }, el('span', { text: '👆 ' + who + ' tapped you on the shoulder.' }),
      el('button', { class: 'btn sm', text: '💬 Chat', onclick: () => { if (p.uid) openThread([p.uid]); reply(k, 'chat'); t.remove(); } }),
      isEmail(pd.teams) ? el('a', { class: 'btn sm ghost', href: TEAMS.call([pd.teams]), target: '_blank', rel: 'noopener noreferrer', text: '📞 Call', onclick: () => { reply(k, 'call'); t.remove(); } }) : null,
      el('button', { class: 'btn sm ghost', text: '👋 On my way', onclick: () => { reply(k, 'coming'); walkToPeer(k); t.remove(); } }),
      el('button', { class: 'btn sm ghost', text: '🪑 Come sit with me', onclick: () => { reply(k, 'come'); t.remove(); } }),
      el('button', { class: 'btn sm ghost', text: '⏳ Busy, later', onclick: () => { reply(k, 'later'); t.remove(); } }));
    $('#toasts').append(t); setTimeout(() => t.remove(), 30000); return true;
  }
  if (pg.k === 'reply') { const msg = { chat: who + ' opened a chat with you.', call: who + ' is calling you on Teams.', coming: who + ' is on the way over.', come: who + ' asks you to come and sit with them.', later: who + ' is busy right now and will get back to you.', focus: who + ' is focusing (Do not disturb). They will see it later.', nopair: who + ' said no thanks this time.' }[pg.r]; if (msg) toast(msg, pg.r === 'come' ? { action: { label: 'Walk over', fn: () => walkToPeer(k) } } : pg.r === 'chat' && p.uid ? { action: { label: 'Open chat', fn: () => openThread([p.uid]) } } : {}); return true; }
  return true;
}
/* a partner who started a hug, handshake or high five with me: join in */
function v4PeerActs() {
  for (const [k, p] of peers) { const a = PRES(p).act; if (!a || typeof a !== 'object') continue; const n = num(a.n, 0);
    if (n !== p.actN) { p.actN = n; const fresh = Date.now() - n < 6000; p.act = fresh && typeof a.k === 'string' ? { k: a.k, t0: performance.now() - Math.max(0, Date.now() - n), x: num(a.x, p.x), z: num(a.z, p.z) } : null;
      if (fresh && PAIR[a.k] && a.w === me.peer && !(me.act && actAge(me.act) < 1)) doAct(a.k, { x: p.x, z: p.z }); } }
}
function v4AvPeer(p) { const a = p.act; return a ? { act: { k: a.k, age: (performance.now() - a.t0) / 1000, x: a.x, z: a.z } } : {}; }
function v4AvMe() { const a = me.act; return a ? { act: { k: a.k, age: actAge(a), x: a.x, z: a.z } } : {}; }

/* ---------- approval lobby, idle timeout ---------- */
const membersMap = () => (Store.col('office').get('members') || {}).map || {};
function isApproved() {
  if (window.OFFICE_STANDALONE || net.admin || !conf.approval || me.uid === 'local' || !net.live) return true; const m = membersMap()[me.uid];
  if (m && m.s === 'ok') return true; if (m && m.s === 'no') return false;
  const em = (net.email || '').toLowerCase(); if (em && rosterList().some(r => (r.teams || '').toLowerCase() === em)) return true;
  if (em && (conf.allow || []).some(d => em.endsWith('@' + d))) return true; return false;
}
function renderLobby() {
  const ok = isApproved(), box = $('#lobby'); me.approved = ok;
  if (ok) { if (box.style.display === 'grid') { box.style.display = 'none'; toast('You have been approved. Welcome in!'); checkIn(); } return; }
  const m = membersMap()[me.uid], declined = m && m.s === 'no';
  if (!me.req && !declined && me.name) { me.req = Date.now(); saveProfile(true); }
  box.querySelector('.island').replaceChildren(el('h2', { text: declined ? 'Your request was declined' : 'Waiting in reception' }), el('p', { text: declined ? 'An admin declined your request to join ' + conf.name + '. If that is a mistake, ask them to approve you from the Admin panel.' : 'Welcome to ' + conf.name + '. Your request to join has gone to the admins. You will be let in automatically as soon as someone approves you.' }),
    !me.name ? el('button', { class: 'btn', text: 'Tell us who you are', onclick: () => showSetup(false) }) : el('p', { class: 'meta', text: 'Requested as ' + me.name + (me.role ? ', ' + me.role : '') + '.' }));
  box.style.display = 'grid';
}
let pendSeen = new Set(LS.get('pendSeen', []));
function adminPending() { if (!net.admin || !conf.approval) return []; const mm = membersMap(); return [...Store.col('people')].filter(([uid, p]) => p && num(p.req, 0) && !mm[uid] && !removedMap()[uid] && uid !== me.uid); }
function notifyPending() { for (const [uid, p] of adminPending()) { if (pendSeen.has(uid)) continue; pendSeen.add(uid); LS.set('pendSeen', [...pendSeen]); sfx('bell'); toast('🛎 ' + str(p.nm, 40) + (p.role ? ' (' + str(p.role, 40) + ')' : '') + ' is waiting in reception for approval.', { ms: 15000, action: { label: 'Review', fn: () => openPanel('members') } }); } }
function setMember(uid, s) { const map = Object.assign({}, membersMap()); map[uid] = { s, t: Date.now(), by: me.uid }; Store.set('office', 'members', { map }); }
panels.members = b => {
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }); b.append(box);
  return () => {
    const ext = window.OFFICE_ADMIN, pend = adminPending(), mm = membersMap(), people = Store.col('people');
    const row = (uid, nm, sub, btns) => el('div', { class: 'card', style: 'flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap' }, el('div', { style: 'flex:1;min-width:140px' }, el('b', { text: nm }), sub ? el('div', { class: 'meta', text: sub }) : null), ...btns);
    box.replaceChildren(el('p', { text: conf.approval ? 'New people wait in reception until an admin approves them. People you added by email on the team list, or from your allowed email domains, get in automatically.' : 'Approval is off: anyone you share the office with walks straight in. Turn it on under Office rules in the Admin panel.' }),
      el('h3', { text: 'Waiting for approval' }), ...(pend.length ? pend.map(([uid, p]) => row(uid, str(p.nm, 40) || 'New person', [str(p.role, 40), str(p.teams, 120), 'asked ' + new Date(num(p.req, 0)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })].filter(Boolean).join(' · '), [el('button', { class: 'btn sm go', text: 'Approve', onclick: () => setMember(uid, 'ok') }), el('button', { class: 'btn sm ghost', text: 'Decline', onclick: () => setMember(uid, 'no') })])) : [el('p', { class: 'meta', text: 'Nobody is waiting.' })]),
      el('h3', { text: 'Approved and declined' }), ...Object.entries(mm).map(([uid, m]) => row(uid, nameOf(uid, str((people.get(uid) || {}).nm, 40)), m.s === 'ok' ? 'Approved ' + new Date(num(m.t, 0)).toLocaleDateString() : 'Declined', [m.s === 'ok' ? el('button', { class: 'btn sm ghost', text: 'Revoke', onclick: () => setMember(uid, 'no') }) : el('button', { class: 'btn sm ghost', text: 'Approve', onclick: () => setMember(uid, 'ok') })])),
      ext ? el('p', { class: 'meta', text: 'Sign-in accounts, roles and email invitations are managed in the Accounts section below.' }) : el('p', { class: 'meta', text: 'Access to the link itself is controlled by Zuchera share settings: people must be signed in to Zuchera and shared with. Removing someone there cuts their access completely.' }),
      ext ? accountsSection(ext) : null);
  };
};
let idleWarned = false;
setInterval(() => {
  if (me.out || !conf.idleMin || me.call || (typeof OUT !== 'undefined' && OUT.busy) || me.game) { idleWarned = false; return; }
  const idle = (Date.now() - lastInput) / 60000;
  if (idle > conf.idleMin - 2 && !idleWarned) { idleWarned = true; toast('Still there? You will be checked out in 2 minutes without activity.', { ms: 110000, action: { label: 'I\'m here', fn: () => { lastInput = Date.now(); idleWarned = false; } } }); }
  if (idle > conf.idleMin) { idleWarned = false; checkOut('You were checked out after ' + conf.idleMin + ' minutes without activity.'); if (window.OFFICE_SIGNOUT && conf.idleSignOut) window.OFFICE_SIGNOUT(); }
}, 20000);

/* ---------- branding ---------- */
const validLogo = f => typeof f === 'string' && f.length < 120000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f);
let logoImg = null;
function applyBrand() {
  const acc = /^#[0-9a-f]{6}$/i.test(conf.accent || '') ? conf.accent : '#2456ff'; document.documentElement.style.setProperty('--brand', acc);
  const dot = $('#brandDot'); if (validLogo(conf.logo)) { dot.style.backgroundImage = 'url(' + conf.logo + ')'; dot.style.backgroundSize = 'cover'; dot.textContent = ''; if (!logoImg || logoImg.src !== conf.logo) { logoImg = new Image(); logoImg.onload = drawSign; logoImg.src = conf.logo; } } else { dot.style.backgroundImage = ''; logoImg = null; }
  dot.style.backgroundColor = acc;
}
function drawSign() {
  const acc = /^#[0-9a-f]{6}$/i.test(conf.accent || '') ? conf.accent : '#2456ff';
  W.dyn.sign.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); c.fillStyle = acc; rr(c, 48, 62, 132, 132, 34); c.fill();
    if (logoImg && logoImg.complete && logoImg.naturalWidth) { c.save(); rr(c, 48, 62, 132, 132, 34); c.clip(); c.drawImage(logoImg, 48, 62, 132, 132); c.restore(); } else { c.fillStyle = '#fff'; c.font = '700 96px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((conf.name || 'S').trim().charAt(0).toUpperCase(), 114, 134); }
    c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = '700 92px ' + FONT_D; let t = conf.name; while (c.measureText(t).width > w - 270 && t.length > 3) t = t.slice(0, -2); c.fillText(t, 220, 108); c.fillStyle = '#ffb627'; c.font = '600 40px ' + FONT_B; c.fillText(str(conf.tagline, 60) || 'Virtual HQ · London · ' + W.desks.length + ' desks', 222, 190); });
  $('#teamName').textContent = conf.name; if (!validLogo(conf.logo)) $('#brandDot').textContent = (conf.name || 'S').trim().charAt(0).toUpperCase(); document.title = conf.name;
}
function brandSection() {
  const acc = el('input', { id: 'aAcc', type: 'color', value: /^#[0-9a-f]{6}$/i.test(conf.accent || '') ? conf.accent : '#2456ff' }), tag = el('input', { id: 'aTag', type: 'text', maxLength: 60, value: str(conf.tagline, 60), placeholder: 'e.g. Building the future of business' }), msg = el('p', { class: 'meta' });
  let logo = conf.logo || '';
  const lf = el('input', { id: 'aLogo', type: 'file', accept: 'image/*', onchange: e => { const f = e.target.files && e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), s = Math.min(im.width, im.height); x.fillStyle = '#fff'; x.fillRect(0, 0, 160, 160); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 160, 160); logo = c.toDataURL('image/png'); if (logo.length > 115000) logo = c.toDataURL('image/jpeg', 0.85); msg.textContent = 'Logo ready. Save to apply it for everyone.'; URL.revokeObjectURL(u); }; im.src = u; } });
  return el('div', { class: 'field' }, el('h3', { text: 'Company branding' }), field('Brand colour', acc), field('Tagline on the lobby wall', tag), field('Logo (square works best)', lf), msg,
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Save branding', onclick: () => { Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { accent: acc.value, tagline: tag.value.trim(), logo })); toast('Branding updated for everyone.'); } }), el('button', { class: 'btn ghost', text: 'Remove logo', onclick: () => { logo = ''; msg.textContent = 'Logo removed. Save to apply.'; } })));
}

/* ---------- insights for admins ---------- */
function histSave() { if (!me.att) return; const d = today(); me.hist[d] = [Math.floor(clock.wk / 60), Math.floor(clock.br / 60), me.att.inT ? new Date(me.att.inT).getHours() * 60 + new Date(me.att.inT).getMinutes() : null]; const keys = Object.keys(me.hist).sort(); while (keys.length > 30) delete me.hist[keys.shift()]; LS.set('hist', me.hist); }
setInterval(histSave, 5 * 60000);
panels.insights = b => {
  const cv = el('canvas', { width: 720, height: 220, style: 'width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:#fff' }), tb = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  b.append(el('p', { text: 'Last 14 days, from people\'s own check-ins. Everyone can see their own numbers on their badge; only admins see this page.' }), cv, tb);
  return () => {
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); days.push(d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate())); }
    const ppl = [...Store.col('people')].filter(([uid, p]) => p && !removedMap()[uid]), tot = days.map(d => { let h = 0, n = 0; for (const [, p] of ppl) { const x = p.hist && p.hist[d]; if (Array.isArray(x)) { h += num(x[0], 0) / 60; n++; } } return [h, n]; });
    const c = cv.getContext('2d'), w = cv.width, h = cv.height, mx = Math.max(1, ...tot.map(t => t[0])); c.clearRect(0, 0, w, h); c.font = '600 12px ' + FONT_B; c.fillStyle = '#4a5a6c'; c.fillText('Team hours per day', 14, 18);
    tot.forEach(([hrs, n], i) => { const bw = (w - 40) / 14, x = 20 + i * bw, bh = (h - 60) * hrs / mx; c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#2456ff'; rr(c, x + 4, h - 30 - bh, bw - 8, Math.max(2, bh), 4); c.fill(); c.fillStyle = '#4a5a6c'; c.textAlign = 'center'; c.fillText(days[i].slice(8), x + bw / 2, h - 12); if (hrs) c.fillText(Math.round(hrs) + 'h', x + bw / 2, h - 36 - bh); c.textAlign = 'left'; });
    tb.replaceChildren(...ppl.map(([uid, p]) => { const xs = days.map(d => p.hist && p.hist[d]).filter(Array.isArray); const avg = xs.length ? xs.reduce((s, x) => s + num(x[0], 0), 0) / xs.length : 0, ins = xs.map(x => x[2]).filter(v => v != null), ai = ins.length ? ins.reduce((s, v) => s + v, 0) / ins.length : null;
      return el('div', { class: 'card', style: 'flex-direction:row;gap:12px;flex-wrap:wrap' }, el('b', { style: 'flex:1;min-width:120px', text: nameOf(uid, str(p.nm, 40)) }), el('span', { text: xs.length + ' of 14 days' }), el('span', { text: 'avg ' + hm(avg * 60) + ' a day' }), el('span', { class: 'meta', text: ai != null ? 'usually in by ' + two(Math.floor(ai / 60)) + ':' + two(Math.round(ai % 60)) : '' })); }));
  };
};

/* ---------- the office assistant (asks Zuchera, in the shared office link) ---------- */
let sampleFn = null;
function officeContext() {
  const ppl = allPeople().map(r => '- ' + r.nm + (r.role ? ' (' + r.role + ')' : '') + ': ' + (STATUS[r.status] || STATUS.off)[1] + (r.task ? '; working on ' + taskLabel(r.task) : '') + (r.zone ? '; in ' + r.zone : '')).join('\n');
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const fd = [...Store.col('feed').values()].filter(f => f && num(f.t, 0) >= d0).sort((a, b) => num(a.t, 0) - num(b.t, 0)).map(f => '- ' + fmtT(num(f.t, 0)) + ' ' + nameOf(f.by, f.nm) + ' ' + str(f.text, 140)).join('\n');
  const notes = notesOf('studio-a').filter(([, n]) => !n.k).map(([, n]) => '- ' + str(n.text, 160) + ' (' + (Array.isArray(n.v) ? n.v.length : 0) + ' votes)').join('\n');
  const cards = cardsBy().map((l, i) => KCOLS[i] + ': ' + l.map(([, c]) => str(c.text, 80) + (c.who ? ' [' + str(c.who, 30) + ']' : '')).join('; ')).join('\n');
  const dec = [...Store.col('decisions')].filter(([, x]) => x).slice(0, 10).map(([id, x]) => { const t = tally(id); return '- ' + str(x.title, 120) + ': GO ' + t.go + ', NO-GO ' + t.no + (x.closed ? ' (closed: ' + x.closed + ')' : ''); }).join('\n');
  return 'Office: ' + conf.name + '\nPeople:\n' + ppl + '\n\nToday:\n' + (fd || 'nothing yet') + '\n\nWhiteboard notes:\n' + (notes || 'none') + '\n\nKanban:\n' + cards + '\n\nDecisions:\n' + (dec || 'none');
}
panels.assistant = b => {
  const out = el('div', { class: 'aiout' }), q = el('input', { id: 'aiQ', type: 'text', maxLength: 300, placeholder: 'Ask about the team, tasks, boards or decisions' });
  const ask = async (task) => {
    if (!sampleFn) { out.textContent = 'The assistant works in the shared office link in Zuchera. It is not available in this copy.'; return; }
    out.textContent = 'Thinking…'; try { await sampleFn('You are the friendly assistant of a virtual office. Answer in clear, short British English with bullet points where useful. Use only the data below; say so if something is not in it.\n\n' + officeContext() + '\n\nTask: ' + task, { onText: ({ text }) => { out.textContent = text; }, modelTier: 'quick', cache: false }); }
    catch (e) { out.textContent = e && e.code === 'rate_limited' ? 'The assistant is busy. Try again in a minute.' : e && e.code === 'not_granted' ? 'The assistant is not available for your access level.' : 'The assistant could not answer just now.'; }
  };
  b.append(el('p', { text: 'Your office assistant reads what is on the boards, tasks and today\'s activity, and drafts things for you.' }),
    el('div', { class: 'actgrid' }, ...[['📝', 'Draft today\'s stand-up', 'Draft a stand-up summary: what each person is working on, what was finished today, and any blockers you can infer.'], ['💡', 'Summarise the whiteboard', 'Summarise the brainstorm whiteboard notes into themes, with the most-voted ideas first.'], ['🗂', 'Where is the kanban at?', 'Summarise the kanban board: what is in progress, what is done, and what looks stuck.'], ['⚖️', 'Recap decisions', 'Recap the open and closed GO/NO-GO decisions and what is still waiting for votes.']].map(([i, t, task]) => el('button', { type: 'button', class: 'actbtn', onclick: () => ask(task) }, el('span', { class: 'ai', text: i }), el('span', { text: t })))),
    el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:200px' }, q), el('button', { class: 'btn', text: 'Ask', onclick: () => { if (q.value.trim()) ask(q.value.trim()); } })), out,
    el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: 'Copy answer', onclick: () => { try { navigator.clipboard.writeText(out.textContent); toast('Copied.'); } catch (e) { } } })));
};

/* ---------- visitors ---------- */
function v4NewPeer(p, pr) { if (pr.guest && net.admin) { sfx('msg'); toast('🪪 A visitor (' + (str((pr.presence || {}).nm, 40) || 'guest') + ') has arrived.', { ms: 12000, action: { label: 'Walk over', fn: () => walkToPeer(pr.peer) } }); } }

const _settings = panels.settings;
panels.settings = b => { const r = _settings(b); if (window.OFFICE_SIGNOUT) b.append(el('h3', { text: 'Account' }), el('p', { class: 'meta', text: 'Signed in as ' + (net.email || 'you') + '.' }), el('button', { class: 'btn ghost', text: 'Sign out', onclick: () => window.OFFICE_SIGNOUT() })); return r; };
function initV4() {
  $('#bActions').onclick = () => openPanel('actions'); $('#bAssist').onclick = () => openPanel('assistant');
  Store.on('office', () => { renderLobby(); applyBrand(); drawSign(); refreshPanel('members'); });
  Store.on('people', () => { notifyPending(); refreshPanel('members'); refreshPanel('insights'); });
  setInterval(() => { renderLobby(); v4PeerActs(); }, 1000);
  (async () => { const c = window.claude; if (!c || typeof c.use !== 'function') return; try { sampleFn = await c.use('sample'); } catch (e) { sampleFn = null; } $('#bAssist').hidden = !sampleFn; })();
  applyBrand();
}

/* ---------- accounts (standalone deployments): sign-in accounts, roles, email invitations ---------- */
function accountsSection(ext) {
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }), em = el('input', { id: 'acEm', type: 'email', maxLength: 120, placeholder: 'name@company.com' }), role = el('select', { id: 'acRole' }, el('option', { value: 'member', text: 'Member' }), el('option', { value: 'admin', text: 'Admin' }));
  const load = async () => {
    box.replaceChildren(el('p', { class: 'meta', text: 'Loading accounts…' }));
    try {
      const [list, inv] = await Promise.all([ext.list(), ext.invites()]);
      const r = (m) => el('div', { class: 'card', style: 'flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap' }, el('div', { style: 'flex:1;min-width:150px' }, el('b', { text: m.name || m.email }), el('div', { class: 'meta', text: m.email + ' · ' + m.role + ' · ' + m.status })),
        m.status !== 'approved' ? el('button', { class: 'btn sm go', text: 'Approve', onclick: async () => { await ext.setStatus(m.user_id, 'approved'); load(); } }) : null,
        m.status !== 'blocked' && m.role !== 'owner' ? el('button', { class: 'btn sm ghost', text: m.status === 'pending' ? 'Decline' : 'Block', onclick: async () => { await ext.setStatus(m.user_id, 'blocked'); load(); } }) : null,
        ext.resetPw && m.role !== 'owner' ? el('button', { class: 'btn sm ghost', text: 'Reset password', onclick: async () => { try { const pw = await ext.resetPw(m.user_id); openDrawer('pw', 'New password for ' + (m.name || m.email), false, b => { b.append(el('p', { text: 'Give this to ' + (m.name || 'them') + ' by phone or in person. It replaces their old password now, and no email is sent.' }), el('p', { class: 'big', style: 'font-family:monospace;user-select:all', text: pw }), el('button', { class: 'btn', text: 'Copy', onclick: () => navigator.clipboard.writeText(pw).then(() => toast('Copied.'), () => { }) })); }); } catch (e) { toast(str(e.message, 120)); } } }) : null,
        m.role === 'member' && m.status === 'approved' ? el('button', { class: 'btn sm ghost', text: 'Make admin', onclick: async () => { await ext.setRole(m.user_id, 'admin'); load(); } }) : m.role === 'admin' ? el('button', { class: 'btn sm ghost', text: 'Make member', onclick: async () => { await ext.setRole(m.user_id, 'member'); load(); } }) : null);
      box.replaceChildren(el('h3', { text: 'Sign-in accounts' }), ...list.map(r), ext.link ? el('h3', { text: 'Invite link' }) : null, ext.link ? el('p', { class: 'meta', text: 'Anyone who opens this link can create an account and walk straight in. It works for 7 days. Share it by any channel you trust: no email needed.' }) : null, ext.link ? el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Create an invite link', onclick: async e => { try { const u = await ext.link(); const inp = el('input', { type: 'text', readOnly: true, value: u, style: 'flex:1;min-width:220px', onfocus: ev => ev.target.select() }); e.target.replaceWith(inp, el('button', { class: 'btn sm ghost', text: 'Copy', onclick: () => navigator.clipboard.writeText(u).then(() => toast('Link copied.'), () => inp.select()) })); } catch (er) { toast(str(er.message, 120)); } } })) : null,
        el('h3', { text: 'Invite by email address' }), el('p', { class: 'meta', text: 'People who sign up with an email on this list are approved automatically.' }),
        el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:180px' }, em), role, el('button', { class: 'btn sm', text: 'Invite', onclick: async () => { const e = em.value.trim().toLowerCase(); if (!isEmail(e)) { toast('Enter a valid email.'); return; } await ext.invite(e, role.value); em.value = ''; toast('Invited ' + e + '. Send them the office link.'); load(); } })),
        ...inv.map(i => el('div', { class: 'row card', style: 'flex-direction:row' }, el('span', { style: 'flex:1', text: i.email + ' · ' + i.role + (i.used ? ' · joined' : ' · not joined yet') }), el('button', { class: 'btn sm ghost', text: 'Cancel invite', onclick: async () => { await ext.uninvite(i.email); load(); } }))));
    } catch (e) { box.replaceChildren(el('p', { class: 'err', text: 'Could not load accounts: ' + str(e && e.message, 120) })); }
  };
  load(); return box;
}
