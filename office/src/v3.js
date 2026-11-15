/* ============================ v3: check-in, messaging, requests, rooms, calls, tasks, gifts, review ============================ */
const today = () => dayKey();
const fmtT = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const ACTS = [['💻', 'Coding'], ['🎨', 'Designing'], ['✍️', 'Writing'], ['📞', 'On calls'], ['🔎', 'Reviewing'], ['📊', 'Planning'], ['📣', 'Marketing'], ['🧪', 'Testing'], ['🗂', 'Admin'], ['🤝', 'With a customer']];
const GIFTS = [['coffee', '☕', 'Coffee', 1], ['donut', '🍩', 'Doughnut', 1], ['flowers', '💐', 'Flowers', 2], ['pizza', '🍕', 'Pizza', 2], ['star', '⭐', 'Gold star', 3], ['trophy', '🏆', 'Trophy', 5]];
const REWARDS = [['early', '🎟', 'Early finish voucher', 8], ['eotm', '🥇', 'Employee of the month', 10], ['card', '🎁', 'Gift card', 8]];
const giftOf = k => GIFTS.concat(REWARDS).find(g => g[0] === k) || GIFTS[0];
const REQ = [['meet', '📅', 'Meeting'], ['brain', '💡', 'Brainstorm'], ['board', '🖊', 'Write on a board together'], ['review', '📄', 'Review a file together'], ['join', '👋', 'Come and join me'], ['call', '📞', 'Teams call']];
const BOARDS = [['studio-a', 'Whiteboard (Brainstorm Studio)'], ['kanban', 'Kanban board'], ['decide', 'Decision board'], ['room-thames', 'Thames Room whiteboard'], ['room-shard', 'Shard Room whiteboard']];
const PRES = p => (p && p.pres) || {};
Object.assign(me, { conv: 'all', hand: 0, spk: false, call: null, task: LS.get('task', null), view: null, cur: null, rv: null, out: false, att: LS.get('att', null) });

/* toast with an optional real link (window.open is blocked in the viewer) */
function toastLink(text, label, href, o) { o = o || {}; const t = el('div', { class: 'toast island' }, el('span', { text }), el('a', { class: 'btn sm', href, target: '_blank', rel: 'noopener noreferrer', text: label, onclick: () => { onTeamsOpen(href); t.remove(); } })); if (o.action) t.append(el('button', { class: 'btn sm ghost', text: o.action.label, onclick: () => { o.action.fn(); t.remove(); } })); $('#toasts').append(t); setTimeout(() => t.remove(), o.ms || 12000); }
const quiet = () => effStatus() === 'focus';
function notify(text, o) { if (quiet() && !(o && o.urgent)) return; toast(text, o); }

/* ---------- check-in, attendance, headcount ---------- */
function checkIn(silent) {
  if (!me.att || me.att.d !== today()) { me.att = { d: today(), inT: Date.now(), outT: 0 }; feed('in', 'checked in'); if (!silent) toast('Checked in at ' + fmtT(me.att.inT) + '. Have a good day.'); }
  else if (me.att.outT) { me.att.outT = 0; feed('in', 'checked back in'); }
  me.out = false; $('#checkedOut').style.display = 'none'; LS.set('att', me.att); saveProfile(true);
}
function checkOut(reason) {
  if (!me.att) checkIn(true); me.att.outT = Date.now(); me.out = true; if (me.game) leaveGame(); if (me.seat) stand(); me.hand = 0; me.spk = false; me.call = null;
  LS.set('att', me.att); LS.set('clock', clock); saveProfile(true); feed('out', 'checked out');
  const c = $('#checkedOut .island'); c.replaceChildren(el('h2', { text: 'You checked out at ' + fmtT(me.att.outT) }), el('p', { text: (typeof reason === 'string' ? reason + ' ' : '') + 'Today: ' + hm(clock.wk) + ' at work and ' + hm(clock.br) + ' on breaks. Teammates now see you as offline.' }), el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Check back in', onclick: () => checkIn() })));
  $('#checkedOut').style.display = 'grid'; sendPresence(performance.now() + 1e6);
}
function attSave() { if (!me.att || me.out) return; me.att.wk = Math.floor(clock.wk / 60); me.att.br = Math.floor(clock.br / 60); me.att.seen = Date.now(); LS.set('att', me.att); saveProfile(true); }
setInterval(attSave, 5 * 60000);
function headcount() { let n = me.out || me.removed ? 0 : 1; for (const p of peers.values()) if (!PRES(p).out) n++; return n; }
function renderHeadcount() {
  const n = headcount(), team = allPeople().length; $('#hcN').textContent = n; $('#hcOf').textContent = 'in the office · ' + team + ' on the team';
  const box = $('#hcBy'); const by = {}; if (!me.out && me.zone) by[me.zone.name] = (by[me.zone.name] || 0) + 1; for (const p of peers.values()) { const z = W.zones.find(z => z.id === p.zid); if (z) by[z.name] = (by[z.name] || 0) + 1; }
  $('#headcount').title = Object.entries(by).map(([k, v]) => k + ': ' + v).join('\n') || 'Nobody here yet';
  box.textContent = '';
}

/* ---------- activity feed ---------- */
function feed(k, text) { if (!text) return; Store.set('feed', Store.id(), { k, text: str(text, 140), by: me.uid, nm: me.name, t: Date.now() }); const all = [...Store.col('feed')]; if (all.length > 300) all.sort((a, b) => num(a[1].t, 0) - num(b[1].t, 0)).slice(0, 40).forEach(([id]) => Store.del('feed', id)); }
panels.today = b => {
  const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }); b.append(el('p', { text: 'What the team did today: check-ins, tasks started and finished, wins, gifts and decisions.' }), list);
  return () => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); const ev = [];
    for (const f of Store.col('feed').values()) if (f && num(f.t, 0) >= d0) ev.push([num(f.t, 0), nameOf(f.by, f.nm) + ' ' + str(f.text, 140), { in: '🟢', out: '⚪', task: '🛠', done: '✅' }[f.k] || '•']);
    for (const w of Store.col('wins').values()) if (w && num(w.t, 0) >= d0) ev.push([num(w.t, 0), nameOf(w.by, w.nm) + ' rang the bell: ' + winKind(w.kind)[1] + (w.text ? ', ' + str(w.text, 100) : ''), '🔔']);
    for (const g of Store.col('gifts').values()) if (g && num(g.t, 0) >= d0) ev.push([num(g.t, 0), nameOf(g.by, g.nm) + ' gave ' + str(g.toNm, 40) + ' ' + giftOf(g.g)[2].toLowerCase(), giftOf(g.g)[1]]);
    ev.sort((a, c) => c[0] - a[0]);
    list.replaceChildren(...(ev.length ? ev.slice(0, 80).map(([t, s, i]) => el('div', { class: 'card', style: 'flex-direction:row;gap:10px;align-items:baseline' }, el('span', { text: i }), el('span', { style: 'flex:1', text: s }), el('span', { class: 'meta', text: fmtT(t) }))) : [el('p', { text: 'Nothing yet today.' })])); };
};

/* ---------- conversations: everyone, this room, direct and group ---------- */
const lastRead = LS.get('read', {});
const myThreads = () => [...Store.col('threads')].filter(([, t]) => t && Array.isArray(t.mem) && t.mem.includes(me.uid));
function threadName([id, t]) { if (t.name) return str(t.name, 40); const others = t.mem.filter(u => u !== me.uid); const nm = others.map(u => nameOf(u, str((Store.col('people').get(u) || {}).nm, 40))); return nm.length ? nm.join(', ') : 'Just you'; }
function msgsOf(conv) {
  if (typeof conv === 'string' && conv.startsWith('ch_')) return [...Store.col('chat')].filter(([, m]) => m && typeof m.text === 'string' && m.sc === conv);
  if (conv === 'all' || conv === 'room') { const zid = me.zone && me.zone.id; return [...Store.col('chat')].filter(([, m]) => m && typeof m.text === 'string' && (conv === 'all' ? (!m.sc || m.sc === 'all') : m.sc === zid)); }
  return [...Store.col('dms')].filter(([, m]) => m && m.th === conv && typeof m.text === 'string');
}
function unread(conv) { const lr = num(lastRead[conv], 0); return msgsOf(conv).filter(([, m]) => num(m.t, 0) > lr && m.by !== me.uid).length; }
function markRead(conv) { lastRead[conv] = Date.now(); LS.set('read', lastRead); }
function totalUnread() { let n = 0; for (const [id] of myThreads()) n += unread(id); return n; }
function openThread(uids, name) {
  const mem = [...new Set([me.uid].concat(uids.filter(u => typeof u === 'string')))].sort(); if (mem.length < 2) { toast('Pick at least one other person.'); return; }
  let id = mem.length === 2 && !name ? 'dm_' + mem.join('~') : null;
  if (!id) { const ex = myThreads().find(([, t]) => t.mem.length === mem.length && mem.every(u => t.mem.includes(u)) && (t.name || '') === (name || '')); id = ex ? ex[0] : 'g_' + Store.id(); }
  if (!Store.col('threads').get(id)) Store.set('threads', id, { mem, name: str(name, 40), by: me.uid, t: Date.now() });
  me.conv = id; convOpen = false; $('#chat').classList.remove('min'); $('#chat').style.display = ''; renderChat(); setTimeout(() => $('#chatIn').focus(), 30);
}
let convOpen = false, newPick = null;
function convLabel(c) { return c === 'all' ? 'Everyone' : c === 'room' ? 'This room' + (me.zone ? ' · ' + me.zone.name : '') : (() => { const t = Store.col('threads').get(c); return t ? threadName([c, t]) : 'Conversation'; })(); }
function renderChat() {
  const log = $('#chatLog'), btn = $('#convBtn'), n = totalUnread() + (me.conv !== 'all' ? unread('all') : 0);
  btn.replaceChildren(el('span', { text: convLabel(me.conv) }), el('span', { text: ' ▾' }), n ? el('span', { class: 'n', text: String(n) }) : null);
  $('#chatForm').style.display = convOpen ? 'none' : '';
  if (convOpen) {
    if (newPick) { const ppl = allPeople().filter(r => r.uid && !r.me), nm = el('input', { id: 'grpName', type: 'text', maxLength: 40, placeholder: 'Group name (optional)' });
      log.replaceChildren(el('div', { class: 'meta', text: 'Pick one person for a direct chat, or several for a group.' }), ...ppl.map(r => el('label', { class: 'tog', for: 'pk_' + r.uid }, el('input', { id: 'pk_' + r.uid, type: 'checkbox', checked: newPick.has(r.uid), onchange: e => { e.target.checked ? newPick.add(r.uid) : newPick.delete(r.uid); } }), el('span', {}, r.nm, el('small', { text: (STATUS[r.status] || STATUS.off)[1] })))),
        ppl.length ? field('Group name', nm) : el('p', { class: 'meta', text: 'Nobody else has joined the office yet.' }), el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Start chat', onclick: () => { const u = [...newPick]; newPick = null; openThread(u, u.length > 1 ? nm.value.trim() : ''); } }), el('button', { class: 'btn sm ghost', text: 'Back', onclick: () => { newPick = null; renderChat(); } })),
        el('p', { class: 'meta', text: 'Direct and group chats are shown only to their members in the office. They are not encrypted, so keep confidential matters in Teams.' })); return; }
    const row = (c, label, sub) => { const u = unread(c); return el('button', { class: 'conv' + (c === me.conv ? ' sel' : ''), onclick: () => { me.conv = c; convOpen = false; renderChat(); } }, el('b', { text: label }), sub ? el('small', { text: sub }) : null, u ? el('span', { class: 'n', text: String(u) }) : null); };
    const ts = myThreads().sort((a, c) => lastMsgT(c[0]) - lastMsgT(a[0]));
    log.replaceChildren(row('all', 'Everyone', 'The whole office'), row('room', 'This room', me.zone ? me.zone.name : ''), ...ts.map(t => row(t[0], threadName(t), t[1].mem.length > 2 ? t[1].mem.length + ' people' : 'Direct')), el('button', { class: 'btn sm', style: 'margin-top:6px', text: '+ New direct or group chat', onclick: () => { newPick = new Set(); renderChat(); } })); return;
  }
  const ms = msgsOf(me.conv).map(([, m]) => m).sort((a, c) => num(a.t, 0) - num(c.t, 0)).slice(-80);
  log.replaceChildren(...(ms.length ? ms.map(m => el('div', { class: 'm' + (m.by === me.uid ? ' mine' : '') }, el('b', { text: nameOf(m.by, m.nm) }), el('time', { text: fmtT(num(m.t, 0)) }), el('div', { text: str(m.text, 600) }))) : [el('div', { class: 'empty', text: me.conv === 'all' ? 'No messages yet. Say hello to the office.' : me.conv === 'room' ? 'Messages here only reach people in the same area as you.' : 'Start the conversation.' })]));
  log.scrollTop = log.scrollHeight; if (!$('#chat').classList.contains('min')) markRead(me.conv);
}
const lastMsgT = c => msgsOf(c).reduce((m, [, x]) => Math.max(m, num(x.t, 0)), num((Store.col('threads').get(c) || {}).t, 0));
$('#convBtn').onclick = () => { convOpen = !convOpen; newPick = null; $('#chat').classList.remove('min'); renderChat(); };
$('#chatMin').onclick = () => { $('#chat').classList.toggle('min'); renderChat(); };
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#chatIn'), text = inp.value.trim(); if (!text) return; inp.value = '';
  if (me.conv === 'all' || me.conv === 'room') { const sc = me.conv === 'room' && me.zone ? me.zone.id : 'all'; Store.set('chat', Store.id(), { text, by: me.uid, nm: me.name, sc, t: Date.now() }); me.say = text; me.saySc = sc; me.sayN++; me.av.say(text);
    const all = [...Store.col('chat')]; if (all.length > 200) all.sort((a, b) => num(a[1].t, 0) - num(b[1].t, 0)).slice(0, 40).forEach(([id]) => Store.del('chat', id)); }
  else { Store.set('dms', Store.id(), { th: me.conv, text, by: me.uid, nm: me.name, t: Date.now() }); const mine = msgsOf(me.conv); if (mine.length > 300) mine.sort((a, b) => num(a[1].t, 0) - num(b[1].t, 0)).slice(0, 40).forEach(([id]) => Store.del('dms', id)); }
  markRead(me.conv);
});
let dmSeen = null;
function onDms(m) {
  if (dmSeen === null) { dmSeen = new Set(m.keys()); renderChat(); return; }
  for (const [id, x] of m) { if (dmSeen.has(id)) continue; dmSeen.add(id); if (!x || x.by === me.uid) continue; const t = Store.col('threads').get(x.th); if (!t || !Array.isArray(t.mem) || !t.mem.includes(me.uid)) continue;
    if (me.conv === x.th && !$('#chat').classList.contains('min') && !convOpen) continue; sfx('msg');
    toast('💬 ' + nameOf(x.by, x.nm) + (t.mem.length > 2 ? ' in ' + threadName([x.th, t]) : '') + ': ' + str(x.text, 90), { ms: 8000, action: { label: 'Reply', fn: () => { me.conv = x.th; convOpen = false; $('#chat').classList.remove('min'); renderChat(); $('#chatIn').focus(); } } }); }
  renderChat(); renderInboxBadge();
}

/* ---------- requests: meetings, brainstorms, boards, file reviews, join me, calls ---------- */
const invites = () => [...Store.col('invites')].filter(([, i]) => i && typeof i.k === 'string');
const forMe = i => i.by !== me.uid && (i.to === 'all' || Array.isArray(i.to) && i.to.includes(me.uid));
const myResp = i => (i.resp && typeof i.resp === 'object' ? i.resp[me.uid] : null);
function reqWhere(i) { const l = i.loc || {}; if (i.k === 'meet') return (W.rooms.find(r => r.id === l.id) || { name: 'a meeting room' }).name; if (i.k === 'brain' || i.k === 'board') return (BOARDS.find(b => b[0] === l.id) || [0, 'a board'])[1]; if (i.k === 'review') return str((Store.col('files').get(l.id) || {}).name, 60) || 'a file'; if (i.k === 'join') return str(l.zn, 40) || 'their spot'; return 'Teams'; }
function reqTitle(i) { const k = REQ.find(r => r[0] === i.k) || REQ[0]; return k[1] + ' ' + k[2] + ' · ' + reqWhere(i) + (num(i.when, 0) > Date.now() + 60000 ? ' · ' + new Date(i.when).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ' · now'); }
function respond(id, i, v) { const resp = Object.assign({}, i.resp && typeof i.resp === 'object' ? i.resp : {}); resp[me.uid] = v; Store.set('invites', id, Object.assign({}, i, { resp })); if (v === 'yes' && num(i.when, 0) <= Date.now() + 60000) goToReq(i); }
function goToReq(i) {
  const l = i.loc || {};
  if (i.k === 'meet') { const r = W.rooms.find(r => r.id === l.id); if (r) { const s = W.seats.find(s => s.id.startsWith(r.id) && !seatTaken(s) && me.seat !== s); if (s) actions.sit(s); else goTo((r.x0 + r.x1) / 2, 4.6); } }
  else if (i.k === 'brain' || i.k === 'board') openBoard(l.id);
  else if (i.k === 'review') actions.review(l.id);
  else if (i.k === 'join') { const f = nearestFree(num(l.x, 12) + 0.8, num(l.z, 4)); goTo(f.x, f.z); }
  else if (i.k === 'call') { const p = Store.col('people').get(i.by); if (p && isEmail(p.teams)) toastLink('Call ' + nameOf(i.by, i.nm) + ' on Teams', 'Open Teams call', TEAMS.call([p.teams])); }
}
function openBoard(id) { const b = W.places; if (id === 'kanban') { goTo(W.xE + 10.2, 9.9); openPanel('kanban'); } else if (id === 'decide') { goTo(W.L - 1.6, 15.4); openPanel('decide'); } else if (id === 'studio-a') { goTo(W.xE + 4.2, 9.9); actions.board('studio-a', 'Whiteboard'); } else { const r = id.replace('room-', ''), rm = W.rooms.find(x => x.id === r); if (rm) goTo((rm.x0 + rm.x1) / 2, 4.6); actions.board(id, (rm ? rm.name : 'Room') + ' whiteboard'); } }
let invSeen = null; const reminded = new Set(LS.get('reminded', []));
function onInvites(m) {
  if (invSeen === null) { invSeen = new Set(m.keys()); renderInboxBadge(); return; }
  for (const [id, i] of m) { if (invSeen.has(id)) continue; invSeen.add(id); if (!i || !forMe(i)) continue; sfx('msg');
    const later = num(i.when, 0) > Date.now() + 60000;
    const t = el('div', { class: 'toast island req' }, el('span', { text: nameOf(i.by, i.nm) + ' invites you: ' + reqTitle(i) + (i.note ? '. "' + str(i.note, 120) + '"' : '') }), el('button', { class: 'btn sm', text: later ? 'Accept' : 'Accept and go', onclick: () => { respond(id, i, 'yes'); t.remove(); } }), el('button', { class: 'btn sm ghost', text: 'Not now', onclick: () => { respond(id, i, 'no'); t.remove(); } }));
    $('#toasts').append(t); setTimeout(() => t.remove(), 30000); }
  // replies to my requests
  for (const [id, i] of m) { if (!i || i.by !== me.uid || !i.resp) continue; for (const [u, v] of Object.entries(i.resp)) { const key = id + u + v; if (reminded.has(key)) continue; reminded.add(key); LS.set('reminded', [...reminded].slice(-300)); if (Date.now() - num(i.t, 0) < 6 * 3600e3) notify(nameOf(u, str((Store.col('people').get(u) || {}).nm, 40)) + (v === 'yes' ? ' accepted' : ' can\'t make') + ' your ' + (REQ.find(r => r[0] === i.k) || REQ[0])[2].toLowerCase() + ' request.'); } }
  renderInboxBadge(); refreshPanel('inbox');
}
setInterval(() => { const now = Date.now(); for (const [id, i] of invites()) { const w = num(i.when, 0); if (!w || w < now - 90000 || w > now + 60000) continue; const mine = i.by === me.uid || forMe(i) && myResp(i) === 'yes'; if (!mine || reminded.has('st' + id)) continue; reminded.add('st' + id); LS.set('reminded', [...reminded].slice(-300)); sfx('bell'); toast('Starting now: ' + reqTitle(i), { ms: 20000, action: { label: 'Go', fn: () => goToReq(i) } }); } }, 15000);
function renderInboxBadge() { const n = invites().filter(([, i]) => forMe(i) && !myResp(i) && num(i.t, 0) > Date.now() - 3 * 864e5).length + totalUnread() + giftsUnseen(); const b = $('#inboxN'); b.textContent = n; b.hidden = !n; }
panels.request = (b, preset) => {
  preset = preset || {}; let k = Math.max(0, REQ.findIndex(r => r[0] === (preset.k || 'meet'))), sel = new Set(preset.to || []), whenNow = true;
  const who = el('div', { class: 'chips' }), place = el('div', { class: 'field' }), dt = el('input', { id: 'rqWhen', type: 'datetime-local' }), dur = el('select', { id: 'rqDur' }, ...[15, 30, 45, 60, 90].map(m => el('option', { value: m, text: m + ' minutes', selected: m === 30 }))), note = el('input', { id: 'rqNote', type: 'text', maxLength: 160, placeholder: 'What is it about?' }), tm = el('input', { id: 'rqTeams', type: 'checkbox' }), msg = el('p', { class: 'err' });
  const d0 = new Date(Date.now() + 3600e3); d0.setMinutes(0, 0, 0); dt.value = new Date(d0 - d0.getTimezoneOffset() * 60000).toISOString().slice(0, 16); dt.disabled = true;
  let loc = el('select', { id: 'rqLoc' });
  const drawWho = () => who.replaceChildren(...allPeople().filter(r => r.uid && !r.me).map(r => el('button', { type: 'button', class: sel.has(r.uid) ? 'sel' : '', text: r.nm + (r.online ? ' ●' : ''), onclick: () => { sel.has(r.uid) ? sel.delete(r.uid) : sel.add(r.uid); drawWho(); } })), el('button', { type: 'button', class: sel.has('all') ? 'sel' : '', text: 'Everyone', onclick: () => { sel = sel.has('all') ? new Set() : new Set(['all']); drawWho(); } }));
  const drawPlace = () => { const kk = REQ[k][0]; let opts = [];
    if (kk === 'meet') opts = W.rooms.map(r => [r.id, r.name]); else if (kk === 'brain' || kk === 'board') opts = BOARDS; else if (kk === 'review') opts = [...Store.col('files')].filter(([, f]) => f).map(([id, f]) => [id, str(f.name, 60)]);
    loc = el('select', { id: 'rqLoc' }, ...opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === preset.loc })));
    place.replaceChildren(...(opts.length ? [el('label', { for: 'rqLoc', text: kk === 'review' ? 'File' : kk === 'meet' ? 'Room' : 'Board' }), loc] : kk === 'review' ? [el('p', { text: 'Upload a file to the Team Drive first.' })] : [el('p', { class: 'meta', text: kk === 'join' ? 'They will be asked to walk over to where you are now.' : 'Opens a Teams call with you.' })])); };
  const kchips = chips('What', REQ.map(r => r[1] + ' ' + r[2]), () => k, v => { k = v; drawPlace(); });
  drawWho(); drawPlace();
  b.append(el('p', { text: 'Send a request. People who are here get it straight away; others find it in their Inbox.' }), kchips, el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'Who' }), who), place,
    chips('When', ['Now', 'Later'], () => (whenNow ? 0 : 1), v => { whenNow = !v; dt.disabled = whenNow; }), field('Date and time', dt), field('How long', dur), field('Note', note),
    el('label', { class: 'tog', for: 'rqTeams' }, tm, el('span', {}, 'Also open a Teams meeting invite', el('small', { text: 'Creates the meeting in Teams with the same people and time, so it lands in Outlook calendars.' }))), msg,
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Send request', onclick: () => {
      const kk = REQ[k][0], to = sel.has('all') ? 'all' : [...sel]; if (to !== 'all' && !to.length) { msg.textContent = 'Pick at least one person.'; return; }
      if (kk === 'review' && !loc.value) { msg.textContent = 'Pick a file.'; return; }
      const when = whenNow ? Date.now() : Date.parse(dt.value); if (!whenNow && !(when > Date.now())) { msg.textContent = 'Pick a time in the future.'; return; }
      const l = kk === 'join' ? { x: +me.pos.x.toFixed(2), z: +me.pos.z.toFixed(2), zn: me.zone ? me.zone.name : '' } : { id: loc.value || null };
      const i = { k: kk, by: me.uid, nm: me.name, to, loc: l, when, mins: +dur.value, note: note.value.trim(), resp: {}, t: Date.now() }; Store.set('invites', Store.id(), i); msg.textContent = '';
      toast('Request sent.'); if (tm.checked) { const emails = (to === 'all' ? allPeople() : allPeople().filter(r => to.includes(r.uid))).filter(r => !r.me && isEmail(r.teams)).map(r => r.teams); if (emails.length) toastLink('Finish the Teams invite in Teams', 'Open Teams', TEAMS.meet(reqTitle(i).replace(/^\S+ /, ''), emails, when, when + i.mins * 60000, i.note)); else toast('Nobody you picked has a Teams email on file.'); }
      if (whenNow) goToReq(Object.assign({}, i, { k: kk === 'call' ? 'none' : kk })); closeDrawer(); } })));
};
panels.inbox = b => {
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }); b.append(el('div', { class: 'row' }, el('button', { class: 'btn', text: 'New request', onclick: () => openRequest() }), el('button', { class: 'btn ghost', text: 'Open chats', onclick: () => { convOpen = true; $('#chat').classList.remove('min'); renderChat(); } })), box);
  return () => {
    const mineIn = invites().filter(([, i]) => forMe(i) && num(i.t, 0) > Date.now() - 7 * 864e5).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)), sent = invites().filter(([, i]) => i.by === me.uid && num(i.t, 0) > Date.now() - 7 * 864e5).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0));
    const gifts = [...Store.col('gifts')].filter(([, g]) => g && g.to === me.uid).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)).slice(0, 10); LS.set('giftSeen', Date.now());
    box.replaceChildren(el('h3', { text: 'Requests for you' }), ...(mineIn.length ? mineIn.map(([id, i]) => { const r = myResp(i); return el('div', { class: 'card' }, el('b', { text: reqTitle(i) }), el('span', { class: 'meta', text: 'From ' + nameOf(i.by, i.nm) + (i.note ? ' · ' + str(i.note, 160) : '') }), el('div', { class: 'row' }, r ? el('span', { class: 'pill ' + (r === 'yes' ? 'available' : 'off') }, el('i'), r === 'yes' ? 'Accepted' : 'Declined') : null, r !== 'yes' ? el('button', { class: 'btn sm', text: 'Accept', onclick: () => respond(id, i, 'yes') }) : el('button', { class: 'btn sm ghost', text: 'Go there', onclick: () => goToReq(i) }), r !== 'no' ? el('button', { class: 'btn sm ghost', text: 'Decline', onclick: () => respond(id, i, 'no') }) : null)); }) : [el('p', { text: 'No requests.' })]),
      el('h3', { text: 'Requests you sent' }), ...(sent.length ? sent.map(([id, i]) => { const rs = Object.entries(i.resp || {}); return el('div', { class: 'card' }, el('b', { text: reqTitle(i) }), el('span', { class: 'meta', text: (i.to === 'all' ? 'Everyone' : (i.to || []).map(u => nameOf(u, str((Store.col('people').get(u) || {}).nm, 40))).join(', ')) + ' · ' + (rs.length ? rs.map(([u, v]) => nameOf(u, str((Store.col('people').get(u) || {}).nm, 40)) + (v === 'yes' ? ' ✓' : ' ✗')).join(', ') : 'no replies yet') }), el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: 'Go there', onclick: () => goToReq(i) }), el('button', { class: 'btn sm ghost', text: 'Cancel request', onclick: () => Store.del('invites', id) }))); }) : [el('p', { text: 'Nothing sent this week.' })]),
      el('h3', { text: 'Gifts you received' }), ...(gifts.length ? gifts.map(([, g]) => el('div', { class: 'card', style: 'flex-direction:row;gap:10px;align-items:center' }, el('span', { style: 'font-size:28px', text: giftOf(g.g)[1] }), el('span', { style: 'flex:1' }, el('b', { text: giftOf(g.g)[2] + (g.val ? ' (' + str(g.val, 30) + ')' : '') + ' from ' + nameOf(g.by, g.nm) }), g.msg ? el('div', { class: 'meta', text: str(g.msg, 140) }) : null))) : [el('p', { text: 'None yet.' })]));
    renderInboxBadge();
  };
};
function openRequest(preset) { openDrawer('request', 'New request', false, b => panels.request(b, preset)); }

/* ---------- gifts and rewards ---------- */
const giftsUnseen = () => [...Store.col('gifts').values()].filter(g => g && g.to === me.uid && num(g.t, 0) > num(LS.get('giftSeen', 0), 0)).length;
const giftsToday = () => [...Store.col('gifts').values()].filter(g => g && g.by === me.uid && new Date(num(g.t, 0)).toDateString() === new Date().toDateString()).length;
function leaderboard() {
  const mk = new Date().toISOString().slice(0, 7), pts = {}; const add = (uid, nm, n) => { if (!uid) return; (pts[uid] = pts[uid] || { nm, p: 0 }).p += n; };
  const inMonth = t => new Date(num(t, 0)).toISOString().slice(0, 7) === mk;
  for (const w of Store.col('wins').values()) if (w && inMonth(w.t)) add(str(w.by, 80), nameOf(w.by, w.nm), 3);
  for (const k of Store.col('kudos').values()) if (k && k.toUid && inMonth(k.t)) add(str(k.toUid, 80), str(k.to, 40), 1);
  for (const g of Store.col('gifts').values()) if (g && inMonth(g.t)) add(str(g.to, 80), str(g.toNm, 40), giftOf(g.g)[3]);
  for (const id in pts) pts[id].nm = nameOf(id, pts[id].nm);
  return Object.values(pts).sort((a, b) => b.p - a.p).slice(0, 5);
}
panels.gift = (b, preset) => {
  let to = preset && preset.to || null, gi = 0, adm = false; const who = el('div', { class: 'chips' }), msgI = el('input', { id: 'gMsg', type: 'text', maxLength: 140, placeholder: 'Say why' }), val = el('input', { id: 'gVal', type: 'text', maxLength: 30, placeholder: 'e.g. £25 Amazon' }), info = el('p', { class: 'meta' }), gl = el('div', { class: 'chips' });
  const drawWho = () => who.replaceChildren(...allPeople().filter(r => r.uid && !r.me).map(r => el('button', { type: 'button', class: to === r.uid ? 'sel' : '', text: r.nm + (r.role ? ' · ' + r.role : ''), onclick: () => { to = r.uid; drawWho(); } })));
  const list = () => (adm ? REWARDS : GIFTS);
  const drawGifts = () => gl.replaceChildren(...list().map((g, i) => el('button', { type: 'button', class: gi === i ? 'sel' : '', text: g[1] + ' ' + g[2] + ' · ' + g[3] + ' pts', onclick: () => { gi = i; drawGifts(); } })));
  drawWho(); drawGifts();
  b.append(el('p', { text: 'Send a gift to anyone, managers included. It lands on their desk, they get a notification, and it counts on the reward board.' }), el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'To' }), who),
    net.admin ? chips('Type', ['Gift', 'Admin reward'], () => (adm ? 1 : 0), v => { adm = !!v; gi = 0; drawGifts(); valF.style.display = adm ? '' : 'none'; }) : null, el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'Gift' }), gl), field('Message', msgI));
  const valF = field('Reward value or details', val); valF.style.display = 'none'; b.append(valF, info);
  b.append(el('button', { class: 'btn', text: 'Send gift', onclick: () => {
    if (!to) { info.textContent = 'Pick who it is for.'; return; } if (!adm && !net.admin && giftsToday() >= 5) { info.textContent = 'You have sent 5 gifts today. More tomorrow.'; return; }
    const g = list()[gi], r = allPeople().find(x => x.uid === to); Store.set('gifts', Store.id(), { g: g[0], to, toNm: r ? r.nm : '', by: me.uid, nm: me.name, msg: msgI.value.trim(), val: adm ? val.value.trim() : '', t: Date.now() }); doEmote('gift'); info.textContent = g[1] + ' sent to ' + (r ? r.nm : 'them') + '.'; msgI.value = ''; } }));
  info.textContent = net.admin ? 'Admins can send unlimited gifts and rewards.' : 'You can send ' + Math.max(0, 5 - giftsToday()) + ' more gifts today.';
};
function openGift(to) { openDrawer('gift', 'Send a gift', false, b => panels.gift(b, { to })); }
let giftSeenSet = null; const deskGifts = new Map();
function onGifts(m) {
  if (giftSeenSet === null) giftSeenSet = new Set(m.keys());
  else for (const [id, g] of m) { if (giftSeenSet.has(id)) continue; giftSeenSet.add(id); if (!g) continue; const G = giftOf(g.g);
    if (g.to === me.uid) { sfx('bell'); burst(me.pos.x, me.pos.z); me.av.popEmoji(G[1]); toast(G[1] + ' ' + nameOf(g.by, g.nm) + ' sent you ' + G[2].toLowerCase() + (g.val ? ' (' + str(g.val, 30) + ')' : '') + (g.msg ? ': "' + str(g.msg, 100) + '"' : ''), { ms: 12000, action: { label: 'Say thanks', fn: () => openThread([g.by]) } }); }
    else { for (const p of peers.values()) if (p.uid === g.to) p.av.popEmoji(G[1]); } }
  drawDeskGifts(); drawWins(); refreshPanel('wins'); refreshPanel('inbox'); renderInboxBadge();
}
function drawDeskGifts() {
  for (const d of W.desks) { let g = deskGifts.get(d); if (!g || g.parent !== office) { g = new T.Group(); office.add(g); deskGifts.set(d, g); } while (g.children.length) g.remove(g.children[0]);
    if (!d.owner) continue; const gs = [...Store.col('gifts').values()].filter(x => x && x.to === d.owner && num(x.t, 0) > Date.now() - 7 * 864e5).sort((a, b) => num(b.t, 0) - num(a.t, 0)).slice(0, 3);
    gs.forEach((x, i) => { const k = 'gtex' + x.g; const tex = MC[k] || (MC[k] = ctex(128, 128, (c, w, h) => { c.font = '100px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(giftOf(x.g)[1], 64, 72); })); const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true })); s.scale.set(0.2, 0.2, 1); s.position.set(d.x - 0.45 * d.side + i * 0.16 * d.side, 0.88, d.z + d.side * 0.12); g.add(s); }); }
}

/* ---------- working on: the real task, shown on badge, desk screen and in the people list ---------- */
const taskLabel = t => { if (!t || typeof t !== 'object') return ''; const a = ACTS[clamp(Math.round(num(t.a, 0)), 0, ACTS.length - 1)]; const x = str(t.x, 60); return a[0] + ' ' + a[1] + (x ? ' · ' + (x.length > 30 ? x.slice(0, 29) + '…' : x) : '') + (num(t.p, -1) >= 0 && t.x ? ' · ' + clamp(Math.round(num(t.p, 0)), 0, 100) + '%' : ''); };
function setTask(t) { const old = me.task; me.task = t; LS.set('task', t); if (t && (!old || old.x !== t.x || old.a !== t.a)) feed('task', 'started ' + taskLabel(t)); if (t && t.focus) { setStatus('focus'); } }
panels.task = b => {
  const t0 = me.task || { a: 0, x: '', p: 0 }; let a = clamp(num(t0.a, 0), 0, ACTS.length - 1);
  const tx = el('input', { id: 'tkX', type: 'text', maxLength: 60, value: str(t0.x, 60), placeholder: 'e.g. Payroll API: tax codes' }), pr = el('input', { id: 'tkP', type: 'range', min: 0, max: 100, step: 5, value: num(t0.p, 0) }), prv = el('span', { class: 'meta', text: num(t0.p, 0) + '%' });
  pr.oninput = () => { prv.textContent = pr.value + '%'; }; const cards = cardsBy().flat().filter(([, c]) => c.col !== 3), card = el('select', { id: 'tkCard' }, el('option', { value: '', text: 'Not linked' }), ...cards.map(([id, c]) => el('option', { value: id, text: str(c.text, 60), selected: t0.card === id })));
  const save = extra => { if (!tx.value.trim()) { toast('Say what you are working on.'); return; } setTask(Object.assign({ a, x: tx.value.trim(), p: +pr.value, card: card.value || null, since: me.task && me.task.x === tx.value.trim() ? me.task.since : Date.now() }, extra || {}));
    if (card.value) { const c = Store.col('cards').get(card.value); if (c && c.col < 2) Store.set('cards', card.value, Object.assign({}, c, { col: 2, who: me.name, ord: Date.now() })); } toast('Teammates now see what you are working on.'); closeDrawer(); };
  b.append(el('p', { text: 'Show the team what you are really working on. It appears on your badge, your desk screen and the People list.' }), chips('Activity', ACTS.map(x => x[0] + ' ' + x[1]), () => a, v => { a = v; }), field('Task', tx), el('div', { class: 'field' }, el('label', { for: 'tkP', text: 'Progress' }), el('div', { class: 'row' }, pr, prv)), field('Kanban card', card),
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Update', onclick: () => save() }), el('button', { class: 'btn ghost', text: 'Focus 25 min', onclick: () => save({ focus: Date.now() + 25 * 60000 }) }), el('button', { class: 'btn ghost', text: 'Focus 50 min', onclick: () => save({ focus: Date.now() + 50 * 60000 }) })),
    me.task ? el('div', { class: 'row' }, el('button', { class: 'btn go', text: '✅ Mark done', onclick: () => { const t = me.task; feed('done', 'finished ' + taskLabel(Object.assign({}, t, { p: -1 }))); if (t.card) { const c = Store.col('cards').get(t.card); if (c) Store.set('cards', t.card, Object.assign({}, c, { col: 3, ord: Date.now() })); } setTask(null); doLocalEmote('clap'); toast('Nice work.', { action: { label: '🔔 Ring the bell', fn: () => openPanel('wins') } }); closeDrawer(); } }), el('button', { class: 'btn ghost', text: 'Clear', onclick: () => { setTask(null); closeDrawer(); } })) : null);
};
setInterval(() => { if (me.task && me.task.focus && Date.now() > me.task.focus) { me.task = Object.assign({}, me.task, { focus: 0 }); LS.set('task', me.task); if (me.status === 'focus') setStatus('available'); sfx('point'); toast('Focus session done. Take a short break?', { action: { label: 'Take a break', fn: () => setStatus('break') } }); } }, 10000);
function deskTaskMat(d) {
  if (!d.owner) return null; let t = null, online = false; if (d.owner === me.uid) { t = me.task; online = !me.out; } else for (const p of peers.values()) if (p.uid === d.owner) { t = PRES(p).task; online = true; }
  if (!online) return null; if (!t || !t.x) return undefined;
  const key = taskLabel(t) + num(t.p, 0); if (!d.taskD) { d.taskD = dynTex(256, 160); d.taskM = new T.MeshBasicMaterial({ map: d.taskD.tex }); }
  if (d.taskKey !== key) { d.taskKey = key; const A = ACTS[clamp(Math.round(num(t.a, 0)), 0, ACTS.length - 1)];
    d.taskD.draw((c, w, h) => { c.fillStyle = '#0f1b2d'; c.fillRect(0, 0, w, h); c.fillStyle = '#7fd1ff'; c.font = '700 18px ' + FONT_B; c.textBaseline = 'top'; c.fillText(A[0] + ' ' + A[1].toUpperCase(), 12, 12); c.fillStyle = '#fff'; c.font = '700 24px ' + FONT_B; wrapText(c, str(t.x, 60), w - 24, 3).forEach((l, i) => c.fillText(l, 12, 42 + i * 28)); const p = clamp(num(t.p, 0), 0, 100) / 100; c.fillStyle = 'rgba(255,255,255,.15)'; rr(c, 12, h - 26, w - 24, 12, 6); c.fill(); c.fillStyle = '#1f9d6b'; rr(c, 12, h - 26, Math.max(12, (w - 24) * p), 12, 6); c.fill(); }); }
  return d.taskM;
}

/* ---------- Teams calls and the shared team link ---------- */
function onTeamsOpen(href, room) { if (!/^https:\/\/(teams\.microsoft\.com|teams\.live\.com|teams\.cloud\.microsoft)\//i.test(href)) return; me.call = { t: Date.now(), room: room || (me.zone && me.zone.room ? me.zone.id : null) }; me.av.setHeadset(true); toast('Teammates see you as "In a Teams call". Click "Off the call" when you finish.'); renderMeetBar(); }
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /teams\.(microsoft|live|cloud)/i.test(a.href) && !a.dataset.nocall) onTeamsOpen(a.href); }, true);
function endCall() { me.call = null; me.av.setHeadset(false); renderMeetBar(); }
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (me.call && Date.now() - hiddenAt > 45000) toast('Welcome back. Are you still on the Teams call?', { ms: 15000, action: { label: 'Off the call', fn: endCall } }); sendPresence(performance.now() + 1e6); });
setInterval(() => { if (document.hidden) sendPresence(performance.now() + 1e6); }, 20000);

/* ---------- Outlook calendar: real "in a meeting" status through the Microsoft 365 connector ---------- */
const OUT = { on: LS.get('outlook', false), busy: false, until: 0, subj: '', err: '', at: 0, timer: 0, mcp: null, input: null };
const OUT_SRV = 'Microsoft 365', OUT_TOOL = 'outlook_calendar_search';
function outlookErr(e) { const c = e && e.code; return c === 'server_not_connected' ? 'Connect Microsoft 365 in your Zuchera settings under Connectors, then try again.' : c === 'needs_reauth' ? 'Reconnect Microsoft 365 in your Zuchera settings under Connectors.' : c === 'not_in_manifest' ? 'Access to Microsoft 365 was declined for this office.' : c === 'approval_required' ? 'Click "Sync with Outlook" again to approve access.' : c === 'blocked_by_policy' ? 'Your organisation blocks this connector here.' : c === 'tool_error' ? 'Outlook search failed: ' + str(e.message, 120) : 'Outlook is not reachable right now. Will try again in 5 minutes.'; }
async function outlookBuildInput() {
  if (OUT.input) return OUT.input; let sch = null; try { sch = (await OUT.mcp.describeTool(OUT_SRV, OUT_TOOL)).inputSchema; } catch (e) { }
  const now = Date.now(), iso = ms => new Date(ms).toISOString(), date = ms => new Date(ms).toISOString().slice(0, 10), inp = {};
  const props = sch && sch.properties || {}, req = new Set(sch && Array.isArray(sch.required) ? sch.required : []);
  for (const [k, v] of Object.entries(props)) { const d = ((v && v.description) || '') + ' ' + ((v && v.format) || ''), isDate = /^date$/.test(v && v.format) || /YYYY-MM-DD(?!T)/.test(d);
    if (/start|from|after|begin|min/i.test(k)) inp[k] = isDate ? date(now) : iso(now - 6 * 3600e3);
    else if (/end|to$|before|until|max/i.test(k)) inp[k] = isDate ? date(now + 864e5) : iso(now + 6 * 3600e3);
    else if (/limit|top|count|size/i.test(k) && (v.type === 'integer' || v.type === 'number')) inp[k] = 50;
    else if (req.has(k) && v.type === 'string') inp[k] = ''; }
  if (!sch) Object.assign(inp, { startDateTime: iso(now - 6 * 3600e3), endDateTime: iso(now + 6 * 3600e3) });
  return (OUT.input = inp);
}
function outlookParse(payload) {
  const now = Date.now(), evs = [], seen = new Set();
  const tm = (v, tz) => { if (!v) return NaN; if (typeof v === 'object') return tm(v.dateTime || v.date_time || v.date, v.timeZone || v.time_zone); if (typeof v !== 'string') return NaN; let s = v; if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s) && /T/.test(s) && (!tz || /utc/i.test(tz))) s += 'Z'; return Date.parse(s); };
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 7 || seen.has(o)) return; seen.add(o); if (Array.isArray(o)) { o.forEach(x => walk(x, d + 1)); return; }
    const s = tm(o.start || o.startTime || o.start_time || o.startDateTime), e = tm(o.end || o.endTime || o.end_time || o.endDateTime);
    if (Number.isFinite(s) && Number.isFinite(e)) evs.push({ s, e, subj: str(o.subject || o.title || o.name, 80), free: /free|workingelsewhere/i.test(String(o.showAs || o.show_as || '')), cancel: !!(o.isCancelled || o.is_cancelled), allDay: !!(o.isAllDay || o.is_all_day) });
    for (const v of Object.values(o)) walk(v, d + 1); };
  walk(typeof payload === 'string' ? (() => { try { return JSON.parse(payload); } catch (e) { return null; } })() : payload, 0);
  const cur = evs.filter(x => !x.free && !x.cancel && !x.allDay && x.s <= now && now < x.e).sort((a, b) => a.e - b.e)[0];
  return { busy: !!cur, until: cur ? cur.e : 0, subj: cur ? cur.subj : '', found: evs.length };
}
async function outlookCheck(fromClick) {
  if (!OUT.on && !fromClick) return; const c = window.claude; if (!c || typeof c.use !== 'function') { OUT.err = 'Outlook sync works only in the shared office link, not in the offline file.'; refreshPanel('avatar'); return; }
  try { OUT.mcp = OUT.mcp || await c.use('mcp'); if (!OUT.mcp) { OUT.err = 'Connectors are not available in this view.'; refreshPanel('avatar'); return; }
    const r = await OUT.mcp.callTool(OUT_SRV, OUT_TOOL, await outlookBuildInput(), { cache: false }), res = outlookParse(r.payload);
    Object.assign(OUT, res, { err: '', at: Date.now(), on: true }); LS.set('outlook', true);
    if (fromClick) toast(res.busy ? 'Outlook says you are in a meeting until ' + fmtT(res.until) + '. Your status shows that.' : 'Outlook connected. Your status will show "In a meeting" during calendar meetings.');
  } catch (e) { OUT.err = outlookErr(e); OUT.busy = false; if (fromClick || e.code !== 'server_unavailable') refreshPanel('avatar'); }
  refreshPanel('avatar');
}
setInterval(() => outlookCheck(false), 5 * 60000); setInterval(() => { if (OUT.busy && Date.now() > OUT.until) { OUT.busy = false; outlookCheck(false); } }, 30000);
function outlookCard() {
  const st = el('p', { class: 'meta' }), draw = () => { st.textContent = OUT.err ? OUT.err : OUT.on ? (OUT.busy ? 'Now: in a meeting until ' + fmtT(OUT.until) + (OUT.subj ? ' (' + OUT.subj + ', shown only to you)' : '') : 'Now: free.') + (OUT.at ? ' Checked ' + fmtT(OUT.at) + '.' : '') : 'Off.'; };
  draw();
  return el('div', { class: 'card' }, el('b', { text: 'Sync my status with Outlook' }), el('span', { class: 'meta', text: 'Uses your own Microsoft 365 connection in Zuchera to read your Outlook calendar every 5 minutes. Teammates only see "In a meeting (Outlook)", never the title. Teams presence itself cannot be read here.' }), st,
    el('div', { class: 'row' }, el('button', { class: 'btn sm', text: OUT.on ? 'Check now' : 'Sync with Outlook', onclick: () => outlookCheck(true) }), OUT.on ? el('button', { class: 'btn sm ghost', text: 'Turn off', onclick: () => { OUT.on = false; OUT.busy = false; LS.set('outlook', false); refreshPanel('avatar'); } }) : null));
}

/* ---------- meeting rooms: door, timer, hands, speaker, Teams ---------- */
function roomDoc(id) { const r = Store.col('rooms').get(id) || {}; return { title: str(r.title, 80), link: str(r.link, 300), agenda: str(r.agenda, 2000), mode: r.mode === 'down' || r.mode === 'up' ? r.mode : 'none', start: num(r.start, 0), end: num(r.end, 0), lock: !!r.lock, mem: Array.isArray(r.mem) ? r.mem.filter(x => typeof x === 'string').slice(0, 40) : [], t: num(r.t, 0) }; }
function saveRoom(id, patch) { Store.set('rooms', id, Object.assign(roomDoc(id), patch, { t: Date.now() })); }
function inRoom(r, x, z) { return x > r.x0 && x < r.x1 && z > 0 && z < 6; }
function roomPeople(id) { const out = []; if (!me.out && me.zone && me.zone.id === id) out.push({ me: true, uid: me.uid, nm: nameOf(me.uid, me.name), hand: me.hand, spk: me.spk, x: me.pos.x, z: me.pos.z }); for (const [k, p] of peers) if (p.zid === id) out.push({ key: k, uid: p.uid, nm: nameOf(p.uid, p.nick), hand: num(PRES(p).hand, 0), spk: !!PRES(p).spk, x: p.x, z: p.z }); return out; }
function timerText(d) { const now = Date.now(); if (d.mode === 'down' && d.end) { const s = Math.max(0, Math.round((d.end - now) / 1000)); return { t: two(Math.floor(s / 60)) + ':' + two(s % 60), lbl: s ? 'left' : 'time is up', over: !s }; } if (d.mode === 'up' && d.start) { const s = Math.max(0, Math.round((now - d.start) / 1000)); return { t: (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + two(Math.floor(s / 60) % 60) + ':' + two(s % 60), lbl: 'elapsed' }; } return null; }
function drawScreens() {
  for (const r of W.rooms || []) { const d = W.dyn['scr_' + r.id]; if (!d) continue; const R = roomDoc(r.id), ppl = roomPeople(r.id), hands = ppl.filter(p => p.hand).sort((a, b) => a.hand - b.hand), spk = ppl.find(p => p.spk), tt = timerText(R);
    d.draw((c, w, h) => { c.fillStyle = '#0f1b2d'; c.fillRect(0, 0, w, h); c.textBaseline = 'top'; c.fillStyle = '#7fd1ff'; c.font = '700 36px ' + FONT_B; c.fillText(r.name + ' · ' + ppl.length + ' here', 44, 34);
      c.fillStyle = R.lock ? '#d6453d' : '#1f9d6b'; rr(c, w - 250, 28, 206, 50, 25); c.fill(); c.fillStyle = '#fff'; c.font = '700 26px ' + FONT_B; c.textAlign = 'center'; c.fillText(R.lock ? '🔒 Locked' : '🔓 Door open', w - 147, 40); c.textAlign = 'left';
      c.fillStyle = '#fff'; c.font = '700 62px ' + FONT_D; c.fillText(R.title || (ppl.length ? 'Meeting in progress' : 'Room is free'), 44, 92, w - 90);
      c.font = '500 30px ' + FONT_B; c.fillStyle = 'rgba(255,255,255,.82)'; wrapText(c, R.agenda || 'Walk up to the screen for the agenda, timer, door and Teams call.', w - 470, 5).forEach((l, i) => c.fillText(l, 44, 186 + i * 40));
      if (spk) { c.fillStyle = '#ffb627'; c.font = '700 30px ' + FONT_B; c.fillText('🗣 Speaking: ' + spk.nm, 44, h - 160, w - 480); }
      if (hands.length) { c.fillStyle = '#fff'; c.font = '600 26px ' + FONT_B; c.fillText('✋ ' + hands.map((p, i) => (i + 1) + '. ' + p.nm).join('   '), 44, h - 116, w - 480); }
      c.fillStyle = R.link || conf.teamLink ? '#5b5fc7' : '#4a5a6c'; rr(c, 44, h - 74, 330, 50, 25); c.fill(); c.fillStyle = '#fff'; c.font = '700 24px ' + FONT_B; c.fillText(R.link ? 'Room Teams link ready' : conf.teamLink ? 'Team call link ready' : 'No Teams link yet', 66, h - 62);
      if (tt) { c.fillStyle = tt.over ? '#d6453d' : '#ffb627'; c.font = '700 120px ' + FONT_D; c.textAlign = 'right'; c.fillText(tt.t, w - 44, h - 230); c.font = '600 28px ' + FONT_B; c.fillText(tt.lbl, w - 48, h - 96); c.textAlign = 'left'; } });
    if (r.sign) roomSignDraw(r, R, ppl, tt); }
}
function applyDoors(dt) {
  for (const r of W.rooms || []) { const R = roomDoc(r.id), member = R.mem.includes(me.uid), inside = inRoom(r, me.pos.x, me.pos.z), block = R.lock && !member && !inside;
    if (r.blocked !== block) { r.blocked = block; for (let x = r.door[0] - 0.2; x <= r.door[1] + 0.2; x += CELL / 2) for (const z of [5.8, 6.0, 6.2]) { const i = Math.floor(x / CELL), j = Math.floor(z / CELL); if (i >= 0 && j >= 0 && i < NX && j < NZ) grid[j * NX + i] = block ? 2 : (grid[j * NX + i] === 2 ? 0 : grid[j * NX + i]); } }
    if (r.leaf) { const k = Math.min(1, (dt || 0.016) * 4); r.lt = lerp(r.lt == null ? 0 : r.lt, R.lock ? 1 : 0, k); const w = r.door[1] - r.door[0]; r.leaf.rotation.y = lerp(0, -PI / 2, r.lt); r.leaf.position.set(lerp(r.door[1] - 0.02, (r.door[0] + r.door[1]) / 2, r.lt), 1.12, lerp(6 - w / 2 + 0.02, 6, r.lt)); } }
}
function knock(r) { me.ping = { to: 'room:' + r.id, k: 'knock', n: Date.now() }; toast('You knocked on the ' + r.name + ' door. Someone inside can let you in.'); }
actions.meeting = r => {
  const R0 = roomDoc(r.id); if (R0.lock && !R0.mem.includes(me.uid) && !inRoom(r, me.pos.x, me.pos.z)) { openDrawer('rooms:' + r.id, r.name, false, b => { b.append(el('p', { class: 'big', text: '🔒 This meeting is private right now.' }), el('p', { text: (R0.title ? R0.title + '. ' : '') + roomPeople(r.id).length + ' people inside.' }), el('button', { class: 'btn', text: '✊ Knock', onclick: () => knock(r) })); }); return; }
  openDrawer('rooms:' + r.id, r.name, false, b => {
    const d0 = roomDoc(r.id), title = el('input', { id: 'fMT', type: 'text', maxLength: 80, value: d0.title, placeholder: 'e.g. Weekly product sync' }), link = el('input', { id: 'fML', type: 'url', maxLength: 300, value: d0.link, placeholder: 'https://teams.microsoft.com/l/meetup-join/…' }), ag = el('textarea', { id: 'fMA', maxLength: 2000, placeholder: 'Agenda, decisions, actions…' }); ag.value = d0.agenda;
    const join = el('div', { class: 'row' }), door = el('div', { class: 'row' }), timer = el('p', { class: 'big' }), hands = el('div', { class: 'card' }), msg = el('p', {}); let mins = 30;
    const save = extra => { const l = link.value.trim(); if (l && !/^https:\/\//i.test(l)) { msg.textContent = 'The call link must start with https://'; return; } msg.textContent = 'Saved for everyone.'; saveRoom(r.id, Object.assign({ title: title.value.trim(), link: l, agenda: ag.value }, extra || {})); };
    b.append(join, door, hands, el('h3', { text: 'Timer on the wall screen' }), timer,
      chips('Minutes', ['5', '15', '25', '30', '45', '60'], () => [5, 15, 25, 30, 45, 60].indexOf(mins), v => { mins = [5, 15, 25, 30, 45, 60][v]; }),
      el('div', { class: 'row' }, el('button', { class: 'btn sm', text: '⏳ Count down', onclick: () => saveRoom(r.id, { mode: 'down', end: Date.now() + mins * 60000, start: Date.now() }) }), el('button', { class: 'btn sm', text: '⏱ Count up', onclick: () => saveRoom(r.id, { mode: 'up', start: Date.now(), end: 0 }) }), el('button', { class: 'btn sm ghost', text: '+5 min', onclick: () => { const d = roomDoc(r.id); if (d.mode === 'down') saveRoom(r.id, { end: Math.max(Date.now(), d.end) + 5 * 60000 }); } }), el('button', { class: 'btn sm ghost', text: 'Stop', onclick: () => saveRoom(r.id, { mode: 'none' }) })),
      field('Meeting title', title), field('Teams meeting link for this room', link), field('Agenda and notes', ag), el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Save', onclick: () => save() }), el('button', { class: 'btn ghost', text: 'Clear room', onclick: () => { title.value = link.value = ag.value = ''; saveRoom(r.id, { title: '', link: '', agenda: '', mode: 'none', lock: false, mem: [] }); } })), msg,
      el('div', { class: 'row' }, el('button', { class: 'btn ghost', text: 'Room whiteboard', onclick: () => actions.board('room-' + r.id, r.name + ' whiteboard') }), el('button', { class: 'btn ghost', text: 'Invite people', onclick: () => openRequest({ k: 'meet', loc: r.id }) })),
      el('p', { class: 'meta', text: 'Teams audio and video play in the Teams app, not inside the office. Joining from here marks you "In a Teams call" and puts on your headset.' }));
    return () => { const d = roomDoc(r.id), tt = timerText(d), ppl = roomPeople(r.id), here = roomTeams(r.id); timer.textContent = tt ? tt.t + ' ' + tt.lbl : 'No timer running';
      const sit = () => { const s = W.seats.find(s => s.id.startsWith(r.id) && !seatTaken(s) && me.seat !== s); if (s && !(me.seat && me.seat.id.startsWith(r.id))) actions.sit(s); };
      join.replaceChildren(isTeamsLink(d.link) || /^https:\/\//.test(d.link) ? el('a', { class: 'btn', href: d.link, target: '_blank', rel: 'noopener noreferrer', text: '🎧 Join this room\'s Teams meeting', onclick: () => { onTeamsOpen(d.link, r.id); sit(); } }) : null,
        conf.teamLink ? el('a', { class: 'btn ' + (d.link ? 'ghost' : ''), href: conf.teamLink, target: '_blank', rel: 'noopener noreferrer', text: '🎧 Join the team call', onclick: () => { onTeamsOpen(conf.teamLink, r.id); sit(); } }) : null,
        here.length ? el('a', { class: 'btn ghost', href: TEAMS.call(here), target: '_blank', rel: 'noopener noreferrer', text: 'Call the ' + here.length + ' here on Teams', onclick: () => { onTeamsOpen(TEAMS.call(here), r.id); } }) : null,
        !d.link && !conf.teamLink && !here.length ? el('span', { class: 'meta', text: 'Paste a Teams meeting link below, or ask an admin to set the team call link.' }) : null);
      const knocks = [...peers.entries()].filter(([, p]) => { const pg = PRES(p).ping; return pg && pg.k === 'knock' && pg.to === 'room:' + r.id && Date.now() - num(pg.n, 0) < 120000 && !d.mem.includes(p.uid); });
      door.replaceChildren(el('button', { class: 'btn ' + (d.lock ? 'danger' : 'ghost'), text: d.lock ? '🔒 Locked: click to open the door' : '🔓 Door open: click to lock', onclick: () => saveRoom(r.id, d.lock ? { lock: false, mem: [] } : { lock: true, mem: ppl.map(p => p.uid).filter(Boolean) }) }),
        ...knocks.map(([k, p]) => el('button', { class: 'btn sm', text: 'Let ' + nameOf(p.uid, p.nick) + ' in', onclick: () => saveRoom(r.id, { mem: roomDoc(r.id).mem.concat(p.uid) }) })));
      const hs = ppl.filter(p => p.hand).sort((a, c) => a.hand - c.hand), spk = ppl.find(p => p.spk);
      hands.replaceChildren(el('b', { text: ppl.length + ' in the room' + (spk ? ' · 🗣 ' + spk.nm + ' is speaking' : '') }), el('span', { class: 'meta', text: hs.length ? '✋ Hands up: ' + hs.map((p, i) => (i + 1) + '. ' + p.nm).join(', ') : 'No hands raised.' }),
        hs.length ? el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Give ' + hs[0].nm + ' the floor', onclick: () => cmdPeer(hs[0], 'floor') }), el('button', { class: 'btn sm ghost', text: 'Lower all hands', onclick: () => hs.forEach(p => cmdPeer(p, 'lower')) })) : null); };
  });
  refreshPanel();
};
function cmdPeer(p, k) { if (p.me) { if (k === 'lower') me.hand = 0; if (k === 'floor') { me.hand = 0; me.spk = true; } renderMeetBar(); return; } me.ping = { to: p.key, k, n: Date.now() }; }
function v3Ping(p, peerKey, pg) {
  if (v4Ping(p, peerKey, pg)) return;
  const who = nameOf(p.uid, p.nick);
  if (pg.k === 'knock') { if (me.zone && 'room:' + me.zone.id === pg.to) { sfx('msg'); const r = W.rooms.find(x => 'room:' + x.id === pg.to); toast('✊ ' + who + ' is knocking on the ' + (r ? r.name : 'room') + ' door.', { ms: 15000, urgent: 1, action: { label: 'Let them in', fn: () => saveRoom(r.id, { mem: roomDoc(r.id).mem.concat(p.uid) }) } }); refreshPanel('rooms'); } return; }
  if (pg.to !== me.peer) return;
  if (pg.k === 'lower') { me.hand = 0; renderMeetBar(); toast(who + ' lowered your hand.'); return; }
  if (pg.k === 'floor') { me.hand = 0; me.spk = true; if (me.seat) stand(); renderMeetBar(); sfx('point'); toast(who + ' gave you the floor. You are speaking.', { urgent: 1 }); return; }
  if (quiet()) return; sfx('msg');
  if (pg.k === 'come') toast(who + ' is asking you to join them' + (pg.z ? ' in the ' + str(pg.z, 30) : '') + '.', { ms: 10000, action: { label: 'Walk over', fn: () => walkToPeer(peerKey) } });
  else toast(who + ' is waving at you 👋', { action: { label: 'Wave back', fn: () => doEmote('wave') } });
}
/* gestures bar: shown in meeting rooms and during calls */
function renderMeetBar() {
  const bar = $('#meetbar'), inMeet = !me.out && (me.call || (me.zone && me.zone.room)); bar.style.display = inMeet ? 'flex' : 'none'; if (!inMeet) return;
  bar.replaceChildren(el('button', { class: me.hand ? 'on' : '', text: me.hand ? '✋ Lower hand' : '✋ Raise hand', onclick: () => { me.hand = me.hand ? 0 : Date.now(); if (me.hand) sfx('tick'); renderMeetBar(); } }),
    el('button', { class: me.spk ? 'on' : '', text: me.spk ? '🗣 Done speaking' : '🗣 Stand to talk', onclick: () => { me.spk = !me.spk; if (me.spk) { me.hand = 0; if (me.seat) { me.spkSeat = me.seat; stand(); } } else if (me.spkSeat && !seatTaken(me.spkSeat)) { doSit(me.spkSeat); me.spkSeat = null; } renderMeetBar(); } }),
    ...[['nod', '🙂', 'Nod'], ['thumbs', '👍', 'Agree'], ['clap', '👏', 'Applaud'], ['laugh', '😂', 'Laugh']].map(([e, i, t]) => el('button', { class: 'em', title: t, text: i, onclick: () => doEmote(e) })),
    me.call ? el('button', { class: 'danger-t', text: '📞 Off the call', onclick: endCall }) : null);
}

/* ---------- co-presence: who else is looking at the same thing, live cursors ---------- */
function drawerWith() {
  const box = $('#drawerWith'); if (!drawer.id) { box.replaceChildren(); return; } const ppl = [...peers.values()].filter(p => PRES(p).view === drawer.id);
  box.replaceChildren(...ppl.slice(0, 5).map(p => { const r = { nm: nameOf(p.uid, p.nick), status: p.status, online: true, face: (Store.col('people').get(p.uid) || {}).face }; const bd = badgeEl(r); bd.classList.add('sm'); return bd; }), ppl.length ? el('span', { class: 'meta', text: ppl.length === 1 ? 'here with you' : 'here with you' }) : null);
}
const CUR_COL = ['#e0457b', '#1f9d6b', '#b04cff', '#ff7a45', '#0fa3b1', '#2456ff'];
function coCursor(area, key) {
  const layer = el('div', { class: 'curs' }); area.append(layer);
  area.addEventListener('pointermove', e => { const r = area.getBoundingClientRect(); me.cur = { k: key, x: +((e.clientX - r.left) / r.width).toFixed(3), y: +((e.clientY - r.top) / r.height).toFixed(3) }; });
  area.addEventListener('pointerleave', () => { me.cur = null; });
  const dots = new Map(); let i = 0;
  const tick = () => { if (!area.isConnected) { me.cur = null; return; } requestAnimationFrame(tick); if ((i++ % 4) !== 0) return; const live = new Set();
    for (const [k, p] of peers) { const c = PRES(p).cur; if (!c || c.k !== key) continue; live.add(k); let d = dots.get(k); if (!d) { d = el('div', { class: 'cur' }, el('i'), el('span')); d.style.setProperty('--c', CUR_COL[dots.size % CUR_COL.length]); layer.append(d); dots.set(k, d); } d.lastChild.textContent = nameOf(p.uid, p.nick); d.style.left = clamp(num(c.x, 0), 0, 1) * 100 + '%'; d.style.top = clamp(num(c.y, 0), 0, 1) * 100 + '%'; }
    for (const [k, d] of dots) if (!live.has(k)) { d.remove(); dots.delete(k); } };
  requestAnimationFrame(tick);
}

/* ---------- review files together ---------- */
let pdfLib = null;
function loadPdf() { if (pdfLib) return pdfLib; const ld = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load')); document.head.append(s); });
  return (pdfLib = ld('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js').then(() => ld('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js')).then(() => window.pdfjsLib).catch(e => { pdfLib = null; throw e; })); }
const fileHref = f => f.asset ? (window.OFFICE_ASSET_URL ? window.OFFICE_ASSET_URL(str(f.asset, 300)) : '/_blob/' + encodeURIComponent(str(f.asset, 200))) : (typeof f.url === 'string' && f.url.startsWith('blob:') ? f.url : null);
actions.review = id => {
  const f = Store.col('files').get(id); if (!f) { toast('That file is no longer in the Team Drive.'); return; }
  openDrawer('file:' + id, str(f.name, 80), true, b => {
    const href = fileHref(f), type = str(f.type, 80), view = el('div', { class: 'review' }), info = el('div', { class: 'row' }), comments = el('div', { style: 'display:flex;flex-direction:column;gap:6px' }), ci = el('input', { id: 'rvC', type: 'text', maxLength: 300, placeholder: 'Add a comment for this page' });
    let pg = 1, pages = 1, pdf = null, pin = false, lead = false, follow = true; const pinL = el('div', { class: 'pins' });
    const ctl = el('div', { class: 'row' }), ttl = el('span', { class: 'meta' });
    const drawPage = async () => { if (!pdf) return; pg = clamp(pg, 1, pages); const page = await pdf.getPage(pg), vp0 = page.getViewport({ scale: 1 }), wv = Math.max(300, view.clientWidth - 4), vp = page.getViewport({ scale: wv / vp0.width * (devicePixelRatio || 1) }); const cv = view.querySelector('canvas') || view.insertBefore(el('canvas'), view.firstChild); cv.width = vp.width; cv.height = vp.height; cv.style.width = '100%'; await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; ttl.textContent = 'Page ' + pg + ' of ' + pages; if (lead) me.rv = { f: id, pg }; refresh(); };
    const go = n => { pg = n; if (pdf) drawPage(); };
    view.append(pinL); coCursor(view, 'file:' + id);
    if (!href) view.append(el('p', { text: 'This file can only be opened by the person who uploaded it in this preview.' }));
    else if (/^image\//.test(type)) view.insertBefore(el('img', { src: href, alt: str(f.name, 80) }), pinL);
    else if (/^video\//.test(type)) view.insertBefore(el('video', { src: href, controls: true }), pinL);
    else if (/pdf/.test(type) || /\.pdf$/i.test(f.name)) { ttl.textContent = 'Loading PDF…'; loadPdf().then(lib => fetch(href).then(r => r.arrayBuffer()).then(buf => lib.getDocument({ data: buf }).promise)).then(d => { pdf = d; pages = d.numPages; ctl.style.display = ''; drawPage(); }).catch(() => { ttl.textContent = 'This PDF could not be shown here.'; view.append(el('a', { class: 'btn sm', href, target: '_blank', rel: 'noopener', text: 'Open the PDF' })); }); }
    else if (/^text\/|json|csv|markdown/.test(type) || /\.(md|txt|csv|json)$/i.test(f.name)) fetch(href).then(r => r.text()).then(t => { if (/csv/.test(type) || /\.csv$/i.test(f.name)) { const rows = t.split(/\r?\n/).slice(0, 200).map(l => l.split(',')); view.insertBefore(el('table', { class: 'csv' }, ...rows.map((r, i) => el('tr', {}, ...r.slice(0, 20).map(c => el(i ? 'td' : 'th', { text: c.slice(0, 80) }))))), pinL); } else view.insertBefore(el('pre', { text: t.slice(0, 60000) }), pinL); }).catch(() => view.append(el('p', { text: 'Could not load this file.' })));
    else view.append(el('p', { text: 'No preview for this type. Open it in a new tab and talk it through here.' }), el('a', { class: 'btn sm', href, target: '_blank', rel: 'noopener', text: 'Open file' }));
    view.addEventListener('click', e => { if (!pin) return; const r = view.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, t = ci.value.trim(); if (!t) { toast('Type the comment first, then click where it belongs.'); return; } Store.set('fcom', Store.id(), { f: id, pg, x: +x.toFixed(3), y: +y.toFixed(3), text: t, by: me.uid, nm: me.name, t: Date.now() }); ci.value = ''; pin = false; view.classList.remove('pinning'); refresh(); });
    ctl.style.display = 'none';
    ctl.append(el('button', { class: 'btn sm ghost', text: '◀', title: 'Previous page', onclick: () => go(pg - 1) }), ttl, el('button', { class: 'btn sm ghost', text: '▶', title: 'Next page', onclick: () => go(pg + 1) }));
    b.append(info, ctl, view, el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:200px' }, ci), el('button', { class: 'btn sm', text: 'Comment', onclick: () => { const t = ci.value.trim(); if (!t) return; Store.set('fcom', Store.id(), { f: id, pg, text: t, by: me.uid, nm: me.name, t: Date.now() }); ci.value = ''; } }), el('button', { class: 'btn sm ghost', text: '📍 Pin to a spot', onclick: () => { pin = true; view.classList.add('pinning'); toast('Click the spot on the file.'); } })), el('h3', { text: 'Comments' }), comments);
    drawer.onClose = () => { me.rv = null; };
    const refresh = () => {
      const leader = [...peers.values()].find(p => { const r = PRES(p).rv; return r && r.f === id; });
      if (leader && follow && !lead && pdf) { const lp = clamp(num(PRES(leader).rv.pg, 1), 1, pages); if (lp !== pg) { pg = lp; drawPage(); return; } }
      info.replaceChildren(el('button', { class: 'btn sm ' + (lead ? '' : 'ghost'), text: lead ? '🎙 You are leading: others follow your page' : '🎙 Lead the review', onclick: () => { lead = !lead; me.rv = lead ? { f: id, pg } : null; refresh(); } }),
        leader && !lead ? el('label', { class: 'tog', for: 'rvF' }, el('input', { id: 'rvF', type: 'checkbox', checked: follow, onchange: e => { follow = e.target.checked; } }), el('span', { text: 'Follow ' + nameOf(leader.uid, leader.nick) + '\'s page' })) : null,
        el('button', { class: 'btn sm ghost', text: 'Invite people to review', onclick: () => openRequest({ k: 'review', loc: id }) }), href ? el('a', { class: 'btn sm ghost', href, target: '_blank', rel: 'noopener', text: 'Open in new tab' }) : null);
      const cs = [...Store.col('fcom')].filter(([, c]) => c && c.f === id).sort((a, c) => num(a[1].t, 0) - num(c[1].t, 0));
      pinL.replaceChildren(...cs.filter(([, c]) => num(c.pg, 1) === pg && c.x != null).map(([, c], i) => el('div', { class: 'pin', title: nameOf(c.by, c.nm) + ': ' + str(c.text, 300), style: 'left:' + clamp(num(c.x, 0), 0, 1) * 100 + '%;top:' + clamp(num(c.y, 0), 0, 1) * 100 + '%', text: String(i + 1) })));
      comments.replaceChildren(...(cs.length ? cs.map(([cid, c]) => el('div', { class: 'card' }, el('span', {}, el('b', { text: nameOf(c.by, c.nm) }), pdf ? el('button', { class: 'btn sm ghost', style: 'margin-left:8px', text: 'p.' + num(c.pg, 1), onclick: () => go(num(c.pg, 1)) }) : null), el('span', { text: str(c.text, 300) }), (c.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Delete', onclick: () => Store.del('fcom', cid) }) : null)) : [el('p', { class: 'meta', text: 'No comments yet.' })]));
    };
    return refresh;
  });
  refreshPanel();
};

/* ---------- avatar state and presence from v3 ---------- */
function lookTarget(x, z, zid, selfSpk) {
  if (selfSpk) return null; const ppl = zid ? roomPeople(zid) : []; const spk = ppl.find(p => p.spk && Math.hypot(p.x - x, p.z - z) > 0.2); if (spk) return { x: spk.x, z: spk.z };
  let best = null, bd = 2.6; for (const p of peers.values()) { const d = Math.hypot(p.x - x, p.z - z); if (d > 0.3 && d < bd && (p.av.bubT > 0 || PRES(p).spk)) { bd = d; best = { x: p.x, z: p.z }; } }
  if (!best && Math.hypot(me.pos.x - x, me.pos.z - z) > 0.3 && Math.hypot(me.pos.x - x, me.pos.z - z) < 2.2) best = { x: me.pos.x, z: me.pos.z }; return best;
}
function v3AvPeer(p) { const d = PRES(p), t = d.task; p.av.setHeadset(!!d.call); const room = p.zid && W.zones.find(z => z.id === p.zid && z.room); return { hand: !!num(d.hand, 0), speaking: !!d.spk, call: !!d.call, activity: t && num(t.a, -1) === 3 ? 'call' : t && num(t.a, -1) === 4 ? 'read' : null, look: lookTarget(p.x, p.z, room ? p.zid : null, !!d.spk) }; }
function v3AvMe() { const room = me.zone && me.zone.room ? me.zone.id : null; return { hand: !!me.hand, speaking: me.spk, call: !!me.call, activity: me.task && me.task.a === 3 ? 'call' : me.task && me.task.a === 4 ? 'read' : null, look: lookTarget(me.pos.x, me.pos.z, room, me.spk) }; }
function v3Presence() { return { task: me.task ? { a: me.task.a, x: str(me.task.x, 60), p: me.task.p } : null, hand: me.hand || null, spk: me.spk || null, call: me.call ? 1 : null, ol: OUT.busy ? 1 : null, view: drawer.id || null, cur: me.cur, rv: me.rv, inT: me.att ? me.att.inT : null }; }
function v3Slow() {
  renderHeadcount(); renderMeetBar(); drawerWith(); renderInboxBadge();
  const zr = me.zone && me.zone.room; if (me.spk && !zr && !me.call) me.spk = false;
  if (me.hand && !zr && !me.call) me.hand = 0;
}
setInterval(() => { if (W.rooms && W.rooms.some(r => { const d = roomDoc(r.id); return d.mode !== 'none' || roomPeople(r.id).length; })) { drawScreens(); refreshPanel('rooms'); } }, 1000);

/* ---------- attendance (admins) ---------- */
panels.attendance = b => {
  const tb = el('div', { style: 'display:flex;flex-direction:column;gap:6px' }); b.append(el('p', { text: 'Who checked in today, when, and their time at work and on breaks. Updated every 5 minutes while people are in.' }), tb);
  return () => { const rows = [...Store.col('people')].filter(([uid, p]) => p && p.att && p.att.d === today() && !removedMap()[uid]).map(([uid, p]) => ({ nm: nameOf(uid, str(p.nm, 40)), a: p.att, online: [...peers.values()].some(q => q.uid === uid) || uid === me.uid }));
    tb.replaceChildren(el('b', { text: rows.length + ' checked in today' }), ...rows.sort((a, c) => num(a.a.inT, 0) - num(c.a.inT, 0)).map(r => el('div', { class: 'card', style: 'flex-direction:row;gap:12px;flex-wrap:wrap' }, el('b', { style: 'flex:1;min-width:120px', text: r.nm }), el('span', { text: 'In ' + fmtT(num(r.a.inT, 0)) }), el('span', { text: r.a.outT ? 'Out ' + fmtT(num(r.a.outT, 0)) : r.online ? 'Here now' : 'Last seen ' + fmtT(num(r.a.seen, r.a.inT)) }), el('span', { class: 'meta', text: hm(num(r.a.wk, 0) * 60) + ' work · ' + hm(num(r.a.br, 0) * 60) + ' breaks' })))); };
};

function initV3() {
  Store.on('dms', onDms); Store.on('threads', () => renderChat()); Store.on('invites', onInvites); Store.on('gifts', onGifts); Store.on('feed', () => refreshPanel('today')); Store.on('fcom', () => refreshPanel('file'));
  Store.on('people', () => { if (drawer.id === 'attendance') refreshPanel('attendance'); drawDeskGifts(); });
  $('#bInbox').onclick = () => openPanel('inbox'); $('#bTask').onclick = () => openPanel('task'); $('#bReq').onclick = () => openRequest(); $('#bGift').onclick = () => openDrawer('gift', 'Send a gift', false, b => panels.gift(b, {})); $('#bOut').onclick = () => checkOut(); $('#headcount').onclick = () => openPanel('people'); $('#bToday').onclick = () => openPanel('today');
}
