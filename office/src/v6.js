/* ============================ v6: the Workspace — HQ Mail, Calendar, shared Docs, polls, voice notes and the Continuity centre ============================
   Built so the team can keep working when outside email or chat is down or compromised: nothing here depends on Microsoft, Google or any other service. */
const V6 = { open: false, tab: 'mail', box: 'inbox', mail: null, compose: null, doc: null, docDirty: 0, docT: 0, ev: null, seenMail: null, reminded: new Set(LS.get('calrem', [])), rec: null };
const DOC_TPL = {
  blank: ['Blank page', ''],
  meeting: ['Meeting notes', 'Meeting: \nDate: \nPresent: \n\nAgenda\n1. \n2. \n\nNotes\n- \n\nDecisions\n- \n\nActions (who, what, by when)\n- \n'],
  standup: ['Daily stand-up', 'Stand-up, {date}\n\nName | Yesterday | Today | Blocked by\n---- | --------- | ----- | ----------\n\n'],
  incident: ['Incident log', 'INCIDENT LOG\nWhat is affected: \nStarted: {date}\nLead: \n\nTimeline (newest first)\n- {time}  \n\nWhat still works\n- This office: Talk, HQ Mail, Calendar, Docs, calls\n\nWhat to avoid until cleared\n- Do not open links or attachments from outside email\n- Do not approve sign-in prompts you did not start\n\nNext update at: \n'],
  decision: ['Decision record', 'Decision: \nDate: {date}\nOwner: \n\nContext\n\nOptions considered\n1. \n2. \n\nDecision and why\n\nFollow-ups\n- \n'],
  handover: ['Handover', 'Handover from:        to: \nDate: {date}\n\nIn progress\n- \n\nWaiting on others\n- \n\nWhere things are\n- \n\nWatch out for\n- \n']
};
const fmtWhen = t => { const d = new Date(t); return fmtDay(t) + ', ' + fmtHM(t); };
const mine = to => Array.isArray(to) && (to.includes(me.uid) || to.includes('*'));
const mst = id => Store.col('mailst').get(id + '~' + me.uid) || {};
const setMst = (id, patch) => Store.set('mailst', id + '~' + me.uid, Object.assign({}, mst(id), patch, { t: Date.now() }));
const whoList = to => !Array.isArray(to) ? '' : to.includes('*') ? 'Everyone' : to.map(u => nameOf(u)).join(', ');
function mailIn() { return [...Store.col('mail')].filter(([, m]) => m && mine(m.to) && m.by !== me.uid); }
const mailUnread = () => mailIn().filter(([id]) => !mst(id).r && !mst(id).arch).length;
function nextEvents(win) { const now = Date.now(); return [...Store.col('cal')].filter(([id, e]) => e && num(e.e, 0) > now && num(e.s, 0) < now + win && (e.by === me.uid || mine(e.inv)) && rsvpOf(id, me.uid) !== 'no').sort((a, b) => a[1].s - b[1].s); }
const rsvpOf = (eid, uid) => (Store.col('rsvp').get(eid + '~' + uid) || {}).a || '';
function workBadge() { const n = mailUnread() + nextEvents(15 * 60000).length; const b = $('#nWork'); if (b) { b.hidden = !n; b.textContent = String(n); } }

/* ---------- the Workspace window ---------- */
function buildWork() {
  const w = el('section', { id: 'work', class: 'island', role: 'dialog', 'aria-label': 'Workspace', hidden: true });
  w.innerHTML = `<aside class="tk-side"><div class="tk-head"><b>Workspace</b><span class="tk-sub">mail, calendar and documents that live in this office</span></div><div id="wkNav" class="tk-list"></div></aside>
    <section class="tk-main"><header class="tk-top"><button class="tk-back" id="wkBack" aria-label="Back">‹</button><div><h2 id="wkTitle"></h2><small id="wkSub"></small></div><div class="tk-acts" id="wkActs"></div><button class="tk-x" id="wkX" aria-label="Close Workspace">×</button></header><div id="wkBody" class="wk-body"></div></section>`;
  document.body.append(w); $('#wkX').onclick = () => work(false); $('#wkBack').onclick = () => { if (V6.mail || V6.compose || V6.doc || V6.ev) { flushDoc(); V6.mail = V6.compose = V6.doc = V6.ev = null; renderWork(); } else w.classList.remove('conv'); };
}
function work(open, tab) {
  V6.open = open !== undefined ? !!open : !V6.open; if (tab) { V6.tab = tab; V6.mail = V6.compose = V6.doc = V6.ev = null; $('#work').classList.add('conv'); }
  if (!V6.open) flushDoc(); $('#work').hidden = !V6.open; $('#bWork').classList.toggle('on', V6.open); if (V6.open) { if (V5.open) talk(false); renderWork(); } else canvas.focus();
}
function renderWork() {
  workBadge(); if (!V6.open) return; const nav = $('#wkNav'), mu = mailUnread(), up = nextEvents(24 * 3600000).length;
  const row = (tab, box, icon, label, n) => el('button', { class: 'tk-row' + (V6.tab === tab && (!box || V6.box === box) ? ' sel' : '') + (n ? ' unread' : ''), onclick: () => { flushDoc(); V6.tab = tab; if (box) V6.box = box; V6.mail = V6.compose = V6.doc = V6.ev = null; $('#work').classList.add('conv'); renderWork(); } }, el('span', { class: 'tk-ico', text: icon }), el('span', { class: 'tk-lbl' }, el('b', { text: label })), n ? el('span', { class: 'n', text: String(n) }) : null);
  nav.replaceChildren(el('div', { class: 'tk-sec', text: 'HQ Mail' }), row('mail', 'inbox', '📥', 'Inbox', mu), row('mail', 'sent', '📤', 'Sent'), row('mail', 'star', '⭐', 'Starred'), row('mail', 'arch', '🗄', 'Archive'),
    el('div', { class: 'tk-sec', text: 'Plan' }), row('cal', null, '🗓', 'Calendar', up), row('docs', null, '📄', 'Documents'),
    el('div', { class: 'tk-sec', text: 'Also here' }), el('button', { class: 'tk-row', onclick: () => { work(false); openPanel('kanban'); } }, el('span', { class: 'tk-ico', text: '🧩' }), el('span', { class: 'tk-lbl' }, el('b', { text: 'Task board' }))), el('button', { class: 'tk-row', onclick: () => { work(false); openPanel('files'); } }, el('span', { class: 'tk-ico', text: '🗂' }), el('span', { class: 'tk-lbl' }, el('b', { text: 'Team Drive' }))),
    el('div', { class: 'tk-sec', text: 'Resilience' }), row('cont', null, '🛟', 'Continuity centre'));
  const body = $('#wkBody'), acts = $('#wkActs'); acts.replaceChildren();
  if (V6.tab === 'mail') renderMail(body, acts); else if (V6.tab === 'cal') renderCal(body, acts); else if (V6.tab === 'docs') renderDocs(body, acts); else renderCont(body, acts);
}

/* ---------- HQ Mail: subject-and-body messages to people or everyone, with read state, replies, stars and attachments ---------- */
function renderMail(body, acts) {
  if (V6.compose) return composeMail(body, acts); if (V6.mail) return readMail(body, acts);
  const names = { inbox: 'Inbox', sent: 'Sent', star: 'Starred', arch: 'Archive' }; $('#wkTitle').textContent = names[V6.box]; $('#wkSub').textContent = 'HQ Mail stays inside this office. It keeps working when outside email is down.';
  acts.append(el('button', { class: 'btn sm', text: '✏️ New mail', onclick: () => { V6.compose = { to: new Set(), sub: '', body: '', re: null, att: null }; renderWork(); } }));
  let list = [...Store.col('mail')].filter(([, m]) => m && (m.by === me.uid || mine(m.to)));
  if (V6.box === 'inbox') list = list.filter(([id, m]) => m.by !== me.uid && mine(m.to) && !mst(id).arch); else if (V6.box === 'sent') list = list.filter(([, m]) => m.by === me.uid && !m.bc); else if (V6.box === 'star') list = list.filter(([id]) => mst(id).star); else list = list.filter(([id]) => mst(id).arch);
  list.sort((a, b) => num(b[1].t, 0) - num(a[1].t, 0));
  body.replaceChildren(...(list.length ? list.slice(0, 200).map(([id, m]) => { const unread = m.by !== me.uid && !mst(id).r;
    return el('button', { class: 'wk-mail' + (unread ? ' unread' : ''), onclick: () => { V6.mail = id; if (unread) setMst(id, { r: 1 }); renderWork(); } }, el('span', { class: 'tk-av sm', style: faceFor(m.by) ? 'background-image:url(' + faceFor(m.by) + ')' : '' }),
      el('span', { class: 'wk-from', text: V6.box === 'sent' ? 'To: ' + whoList(m.dto || m.to) : nameOf(m.by, m.nm) }), el('span', { class: 'wk-sub' }, el('b', { text: str(m.sub, 120) || '(no subject)' }), el('span', { text: ' — ' + str(m.body, 90).replace(/\s+/g, ' ') })), m.att ? el('span', { text: '📎' }) : null, mst(id).star ? el('span', { text: '⭐' }) : null, el('time', { text: fmtDay(num(m.t, 0)) === 'Today' ? fmtHM(num(m.t, 0)) : new Date(num(m.t, 0)).toLocaleDateString([], { day: 'numeric', month: 'short' }) })); })
    : [el('div', { class: 'tk-empty' }, el('b', { text: V6.box === 'inbox' ? 'Your inbox is clear.' : 'Nothing here yet.' }), el('span', { text: 'Use New mail for longer messages with a subject, to one person, several, or everyone.' }))]));
}
function readMail(body, acts) {
  const m = Store.col('mail').get(V6.mail); if (!m) { V6.mail = null; return renderMail(body, acts); } const id = V6.mail, s = mst(id);
  $('#wkTitle').textContent = str(m.sub, 120) || '(no subject)'; $('#wkSub').textContent = nameOf(m.by, m.nm) + ' to ' + whoList(m.dto || m.to) + ((m.dcc || []).length ? ' · Cc ' + whoList(m.dcc) : '') + (m.by === me.uid ? bccNote(m) : '') + ' · ' + fmtWhen(num(m.t, 0));
  const reply = all => { const vis = (m.dto || m.to || []).concat(m.dcc || []), to = new Set(all ? vis.filter(u => u !== me.uid).concat(m.by === me.uid ? [] : [m.by]) : [m.by === me.uid ? (m.dto || m.to || [])[0] : m.by]); V6.compose = { to, sub: /^re:/i.test(m.sub || '') ? m.sub : 'Re: ' + str(m.sub, 110), body: '\n\n— ' + nameOf(m.by, m.nm) + ' wrote on ' + fmtWhen(num(m.t, 0)) + ':\n' + str(m.body, 4000).split('\n').map(l => '> ' + l).join('\n'), re: id, att: null }; V6.mail = null; renderWork(); };
  acts.append(el('button', { class: 'btn sm', text: '↩ Reply', onclick: () => reply(false) }), ((m.dto || m.to || []).length + (m.dcc || []).length) > 1 || (m.to || []).includes('*') ? el('button', { class: 'btn sm ghost', text: 'Reply all', onclick: () => reply(true) }) : null,
    el('button', { class: 'btn sm ghost', text: 'Forward', onclick: () => { V6.compose = { to: new Set(), sub: 'Fwd: ' + str(m.sub, 110), body: '\n\n— Forwarded from ' + nameOf(m.by, m.nm) + ':\n' + str(m.body, 6000), re: null, att: m.att || null }; V6.mail = null; renderWork(); } }),
    el('button', { class: 'btn sm ghost', text: s.star ? '★ Starred' : '☆ Star', onclick: () => { setMst(id, { star: s.star ? 0 : 1 }); } }), el('button', { class: 'btn sm ghost', text: s.arch ? 'Move to inbox' : 'Archive', onclick: () => { setMst(id, { arch: s.arch ? 0 : 1 }); V6.mail = null; renderWork(); } }));
  const readers = m.by === me.uid ? [...Store.col('mailst')].filter(([k, v]) => k.startsWith(id + '~') && v && v.r).map(([k]) => nameOf(k.split('~')[1])) : [];
  body.replaceChildren(el('article', { class: 'wk-read' }, el('div', { class: 'tk-text' }, ...linkify(str(m.body, 20000), [])), attEl(m.att), m.by === me.uid ? el('p', { class: 'meta', text: readers.length ? 'Read by ' + readers.join(', ') : 'Not read yet' }) : null));
}
function peoplePicker(set, onChange, allowAll) {
  const ppl = allPeople().filter(r => r.uid && !r.me), box = el('div', { class: 'wk-pick' });
  const draw = () => box.replaceChildren(allowAll ? el('label', { class: 'chip' + (set.has('*') ? ' on' : '') }, el('input', { type: 'checkbox', checked: set.has('*'), onchange: e => { if (e.target.checked) { set.clear(); set.add('*'); } else set.delete('*'); draw(); onChange && onChange(); } }), '👥 Everyone') : null,
    ...ppl.map(r => el('label', { class: 'chip' + (set.has(r.uid) ? ' on' : '') + (set.has('*') ? ' dim' : '') }, el('input', { type: 'checkbox', checked: set.has(r.uid), disabled: set.has('*'), onchange: e => { e.target.checked ? set.add(r.uid) : set.delete(r.uid); draw(); onChange && onChange(); } }), (r.online ? '🟢 ' : '') + r.nm)),
    !ppl.length ? el('span', { class: 'meta', text: 'Nobody else has joined yet. Choose Everyone and they will see it when they arrive.' }) : null);
  draw(); return box;
}
function composeMail(body, acts) {
  const c = V6.compose; c.cc = c.cc || new Set(); c.bcc = c.bcc || new Set(); $('#wkTitle').textContent = c.re ? 'Reply' : 'New mail'; $('#wkSub').textContent = 'Delivered instantly inside the office';
  const sub = el('input', { id: 'wkSubj', type: 'text', maxLength: 140, value: c.sub, placeholder: 'Subject', oninput: e => { c.sub = e.target.value; } }), ta = el('textarea', { id: 'wkBodyIn', maxLength: 20000, placeholder: 'Write your message', oninput: e => { c.body = e.target.value; } }); ta.value = c.body;
  const attL = el('span', { class: 'meta', text: c.att ? '📎 ' + c.att.name : '' }), file = el('input', { type: 'file', id: 'wkFile', hidden: true, onchange: async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; attL.textContent = '⏳ Uploading ' + f.name + '…'; try { c.att = await uploadAtt(f); attL.textContent = '📎 ' + c.att.name; } catch (er) { attL.textContent = ''; toast(er.message); } } });
  const send = () => { if (!c.to.size && !c.cc.size && !c.bcc.size) { toast('Choose who it goes to.'); return; } if (!c.sub.trim() && !c.body.trim()) { toast('Write a subject or a message.'); return; }
    const allowed = new Set([...c.to, ...c.cc]), gid = Store.id(), base = Object.assign({ by: me.uid, nm: me.name, sub: c.sub.trim().slice(0, 140), body: c.body.slice(0, 20000), t: Date.now(), dto: [...c.to], dcc: [...c.cc], grp: gid }, c.re ? { re: c.re } : {}, c.att ? { att: c.att } : {});
    if (!allowed.size && !c.bcc.size) return; if (allowed.size) Store.set('mail', gid, Object.assign({ to: [...allowed] }, base));
    for (const u of c.bcc) if (u !== '*' && u !== me.uid && !allowed.has(u) && !allowed.has('*')) Store.set('mail', Store.id(), Object.assign({ to: [u], bc: 1 }, base));   // each blind copy is its own private document, so nobody else can read the Bcc list
    if (!allowed.size) Store.set('mail', gid, Object.assign({ to: [me.uid], self: 1 }, base));
    V6.compose = null; V6.box = 'sent'; toast('✉️ Sent' + (c.bcc.size ? ' (blind copies kept private)' : '') + '.'); renderWork(); };
  acts.append(el('button', { class: 'btn sm', text: 'Send', onclick: send }), el('button', { class: 'btn sm ghost', text: 'Discard', onclick: () => { V6.compose = null; renderWork(); } }));
  body.replaceChildren(el('div', { class: 'wk-form' }, el('div', { class: 'lbl', text: 'To' }), peoplePicker(c.to, null, true), el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: (c.showCc || c.cc.size ? '− Cc' : '＋ Cc'), onclick: () => { c.showCc = !c.showCc; renderWork(); } }), el('button', { class: 'btn sm ghost', text: (c.showBcc || c.bcc.size ? '− Bcc' : '＋ Bcc'), onclick: () => { c.showBcc = !c.showBcc; renderWork(); } })), (c.showCc || c.cc.size) ? el('div', { class: 'lbl', text: 'Cc (everyone sees these)' }) : null, (c.showCc || c.cc.size) ? peoplePicker(c.cc, null, true) : null, (c.showBcc || c.bcc.size) ? el('div', { class: 'lbl', text: 'Bcc (hidden from everyone else)' }) : null, (c.showBcc || c.bcc.size) ? peoplePicker(c.bcc, null, false) : null, field('Subject', sub), field('Message', ta), el('div', { class: 'row' }, el('label', { class: 'btn sm ghost', for: 'wkFile', text: '📎 Attach a file' }), file, attL, V5.canListen ? el('button', { class: 'btn sm ghost', text: '🎙 Dictate', onclick: e => dictateInto(ta, e.currentTarget) }) : null)));
  if (!c.sub) sub.focus(); else { ta.focus(); ta.setSelectionRange(0, 0); }
}
async function uploadAtt(f) {
  if (f.size > MAX_UP()) throw new Error('Files up to ' + Math.round(MAX_UP() / 1048576) + ' MB here.'); let asset = null, url = null;
  if (Store.db) { if (!net.assets) throw new Error('Uploads need Contributor access. Ask the owner.'); const r = await net.assets.upload(f); asset = r.id; url = r.url || null; } else url = URL.createObjectURL(f);
  const a = { name: str(f.name, 120), size: f.size, type: str(f.type, 80), asset, url: url && /^https?:|^blob:/.test(url) ? url : null }; Store.set('files', Store.id(), Object.assign({ by: me.uid, nm: me.name, t: Date.now(), via: 'HQ' }, a)); return a;
}
function onMail(map) {
  if (!V6.seenMail) { V6.seenMail = new Set(map.keys()); renderWork(); return; }
  for (const [id, m] of map) { if (V6.seenMail.has(id)) continue; V6.seenMail.add(id); if (!m || m.by === me.uid || !mine(m.to)) continue; sfx('msg');
    toast('✉️ ' + nameOf(m.by, m.nm) + ': ' + (str(m.sub, 70) || str(m.body, 70)), { ms: 9000, action: { label: 'Read', fn: () => { work(true, 'mail'); V6.box = 'inbox'; V6.mail = id; setMst(id, { r: 1 }); renderWork(); } } });
    if (document.hidden && local.desk && window.Notification && Notification.permission === 'granted') { try { new Notification('Mail from ' + nameOf(m.by, m.nm), { body: str(m.sub, 120), tag: 'hq-mail' }); } catch (e) { } } }
  renderWork();
}

/* ---------- Calendar: the office's own diary, with invitations, replies and reminders that walk you to the room ---------- */
function renderCal(body, acts) {
  if (V6.ev) return editEvent(body, acts); $('#wkTitle').textContent = 'Calendar'; $('#wkSub').textContent = 'Your times: ' + (me.tz || 'local') + '. Reminders appear 5 minutes before and at the start.';
  acts.append(el('button', { class: 'btn sm ghost', text: '🔗 Sync / .ics', onclick: () => openPanel('calsync') }), el('button', { class: 'btn sm', text: '＋ New event', onclick: () => { const d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0); V6.ev = { id: null, title: '', s: d.getTime(), dur: 30, where: (W.rooms && W.rooms[0] && W.rooms[0].name) || '', inv: new Set(), notes: '' }; renderWork(); } }));
  const now = Date.now(), list = [...Store.col('cal')].filter(([, e]) => e && num(e.e, 0) > now - 3600000 && (e.by === me.uid || mine(e.inv) || net.admin)).sort((a, b) => a[1].s - b[1].s).slice(0, 120), out = []; let last = '';
  for (const [id, e] of list) { const day = fmtDay(e.s); if (day !== last) { out.push(el('div', { class: 'tk-day' }, el('span', { text: day }))); last = day; }
    const my = rsvpOf(id, me.uid), yes = [...Store.col('rsvp')].filter(([k, v]) => k.startsWith(id + '~') && v && v.a === 'yes').map(([k]) => nameOf(k.split('~')[1])), live = e.s <= now && e.e > now;
    out.push(el('div', { class: 'card wk-ev' + (live ? ' live' : '') }, el('div', { class: 'row' }, el('b', { style: 'flex:1', text: str(e.title, 100) || 'Untitled' }), live ? el('span', { class: 'tk-tag', text: '● now' }) : null, el('span', { class: 'meta', text: fmtHM(e.s) + ' – ' + fmtHM(e.e) })),
      el('div', { class: 'meta', text: '📍 ' + (str(e.where, 60) || 'No place set') + ' · by ' + nameOf(e.by) + ' · ' + (Array.isArray(e.inv) && e.inv.includes('*') ? 'everyone invited' : ((e.inv || []).length + ' invited')) + (yes.length ? ' · going: ' + yes.slice(0, 6).join(', ') : '') }),
      e.notes ? el('div', { class: 'tk-text', style: 'font-size:13px' }, ...linkify(str(e.notes, 600), [])) : null,
      el('div', { class: 'row' }, ...['yes', 'maybe', 'no'].map(a => el('button', { class: 'btn sm' + (my === a ? '' : ' ghost'), text: { yes: '✓ Going', maybe: 'Maybe', no: '✗ Can\'t' }[a], onclick: () => Store.set('rsvp', id + '~' + me.uid, { a, t: Date.now() }) })),
        el('button', { class: 'btn sm' + (live ? '' : ' ghost'), text: e.host === 'ext' ? '↗ Join link' : '🚶 Join here', onclick: () => joinEvent(id, e) }), (e.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Edit', onclick: () => { V6.ev = { id, title: e.title, s: e.s, dur: Math.round((e.e - e.s) / 60000), where: e.where, host: e.host, link: e.link, inv: new Set(e.inv || []), notes: e.notes || '' }; renderWork(); } }) : null))); }
  body.replaceChildren(...(out.length ? out : [el('div', { class: 'tk-empty' }, el('b', { text: 'Nothing scheduled.' }), el('span', { text: 'Create an event, pick a room and invite people. Everyone gets a reminder and a button that walks them there.' }))]));
}
function editEvent(body, acts) {
  const v = V6.ev, pad = n => String(n).padStart(2, '0'), d0 = new Date(v.s); $('#wkTitle').textContent = v.id ? 'Edit event' : 'New event'; $('#wkSub').textContent = '';
  const ti = el('input', { id: 'evT', type: 'text', maxLength: 100, value: v.title, placeholder: 'e.g. Sprint planning' }), da = el('input', { id: 'evD', type: 'date', value: d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate()) }), tm = el('input', { id: 'evH', type: 'time', value: pad(d0.getHours()) + ':' + pad(d0.getMinutes()) });
  const du = el('select', { id: 'evDur' }, ...[15, 30, 45, 60, 90, 120, 180].map(m => el('option', { value: m, text: m < 60 ? m + ' minutes' : (m / 60) + (m === 60 ? ' hour' : ' hours'), selected: v.dur === m })));
  const places = (W.places || []).map(p => p.name), wh = el('select', { id: 'evW' }, ...places.map(n => el('option', { value: n, text: n, selected: v.where === n })), el('option', { value: 'Call (no room)', text: 'Call (no room)', selected: v.where === 'Call (no room)' }));
  const no = el('textarea', { id: 'evN', maxLength: 600, placeholder: 'Agenda or notes (optional)' }); no.value = v.notes;
  const hs = el('select', { id: 'evHost' }, ...Object.entries(HOSTS).map(([k, t]) => el('option', { value: k, text: t, selected: (v.host || 'in') === k }))), lk = el('input', { id: 'evLink', type: 'url', placeholder: 'https:// link for Teams, Zoom or Meet', value: v.link || '' });
  const save = () => { const s = new Date(da.value + 'T' + (tm.value || '09:00')).getTime(); if (!ti.value.trim()) { toast('Give it a title.'); return; } if (!Number.isFinite(s)) { toast('Pick a date and time.'); return; } if (!v.inv.size) { toast('Invite at least one person, or Everyone.'); return; }
    const id = v.id || Store.id(); Store.set('cal', id, { title: ti.value.trim().slice(0, 100), s, e: s + (+du.value) * 60000, where: wh.value, host: hs.value, link: /^https:\/\//.test(lk.value.trim()) ? lk.value.trim().slice(0, 400) : '', inv: [...v.inv], notes: no.value.slice(0, 600), by: v.id ? (Store.col('cal').get(v.id) || {}).by || me.uid : me.uid, t: Date.now() });
    if (!v.id) { Store.set('rsvp', id + '~' + me.uid, { a: 'yes', t: Date.now() }); Store.set('mail', Store.id(), { by: me.uid, nm: me.name, to: [...v.inv], sub: 'Invitation: ' + ti.value.trim().slice(0, 100), body: fmtWhen(s) + ' for ' + du.value + ' minutes\nWhere: ' + wh.value + (no.value ? '\n\n' + no.value.slice(0, 600) : '') + '\n\nOpen Workspace → Calendar to reply.', t: Date.now(), cal: id }); }
    V6.ev = null; toast('🗓 Saved' + (v.id ? '.' : ' and invitations sent.')); renderWork(); };
  acts.append(el('button', { class: 'btn sm', text: 'Save', onclick: save }), v.id ? el('button', { class: 'btn sm ghost', text: 'Delete', onclick: () => { Store.del('cal', v.id); V6.ev = null; renderWork(); } }) : null, el('button', { class: 'btn sm ghost', text: 'Cancel', onclick: () => { V6.ev = null; renderWork(); } }));
  body.replaceChildren(el('div', { class: 'wk-form' }, field('Title', ti), el('div', { class: 'row' }, field('Date', da), field('Start', tm), field('Length', du)), field('Room', wh), field('Hosted', hs), field('Outside link (optional)', lk), el('div', { class: 'lbl', text: 'Invite' }), peoplePicker(v.inv, null, true), field('Notes', no))); ti.focus();
}
function goToEvent(e) {
  const p = (W.places || []).find(x => x.name === e.where), r = (W.rooms || []).find(x => x.name === e.where);
  if (!p) { toast('This one is a call: open Talk or ring the organiser.'); return; } goTo(p.x, p.z, () => { if (r) { if (RTC.ok) toast('You are at ' + r.name + '.', { ms: 9000, action: { label: '📞 Join room call', fn: () => joinRoomCall(r) } }); else actions.meeting(r); } });
}
function calTick() {
  const now = Date.now();
  for (const [id, e] of nextEvents(6 * 60000)) { const k1 = id + ':5', k0 = id + ':0', key = e.s - now > 30000 ? k1 : k0; if (V6.reminded.has(key) || (key === k0 && now - e.s > 10 * 60000)) continue; V6.reminded.add(key); LS.set('calrem', [...V6.reminded].slice(-200)); sfx('msg');
    toast('🗓 ' + str(e.title, 60) + (key === k1 ? ' starts in ' + Math.max(1, Math.round((e.s - now) / 60000)) + ' min' : ' is starting now') + ' · ' + str(e.where, 40), { ms: 20000, action: { label: '🚶 Go', fn: () => goToEvent(e) } }); }
  workBadge();
}

/* ---------- Documents: shared pages the whole team can edit, saved as you type ---------- */
function renderDocs(body, acts) {
  if (V6.doc) return editDoc(body, acts); $('#wkTitle').textContent = 'Documents'; $('#wkSub').textContent = 'Shared pages for notes, plans and logs. Saved as you type; everyone sees the latest.';
  const tpl = el('select', { id: 'docTpl', 'aria-label': 'Template' }, ...Object.entries(DOC_TPL).map(([k, v]) => el('option', { value: k, text: v[0] })));
  acts.append(tpl, el('button', { class: 'btn sm', text: '＋ New', onclick: () => newDoc(tpl.value) }));
  const list = [...Store.col('hdocs')].filter(([, d]) => d).sort((a, b) => num(b[1].t, 0) - num(a[1].t, 0));
  body.replaceChildren(...(list.length ? list.map(([id, d]) => { const here = [...peers.values()].filter(p => PRES(p).doc === id).map(p => nameOf(p.uid, p.nick));
    return el('button', { class: 'wk-mail', onclick: () => { V6.doc = id; renderWork(); } }, el('span', { text: '📄' }), el('span', { class: 'wk-sub' }, el('b', { text: str(d.title, 100) || 'Untitled' }), el('span', { text: ' — ' + str(d.body, 90).replace(/\s+/g, ' ') })), here.length ? el('span', { class: 'tk-tag', text: '✍ ' + here.join(', ') }) : null, el('time', { text: nameOf(d.eby || d.by) + ' · ' + fmtWhen(num(d.t, 0)) })); })
    : [el('div', { class: 'tk-empty' }, el('b', { text: 'No documents yet.' }), el('span', { text: 'Start from a template: meeting notes, stand-up, incident log, decision record or handover.' }))]));
}
function newDoc(k) { const t = DOC_TPL[k] || DOC_TPL.blank, id = Store.id(), now = new Date(); Store.set('hdocs', id, { title: k === 'blank' ? '' : t[0] + ' · ' + now.toLocaleDateString([], { day: 'numeric', month: 'short' }), body: t[1].replace(/\{date\}/g, now.toLocaleDateString()).replace(/\{time\}/g, fmtHM(now.getTime())), by: me.uid, eby: me.uid, t: Date.now() }); V6.doc = id; setTimeout(renderWork, 50); }
function editDoc(body, acts) {
  const id = V6.doc, d = Store.col('hdocs').get(id); if (!d) { V6.doc = null; return renderDocs(body, acts); }
  const cur = $('#docBody'); if (cur && cur.dataset.id === id) {                                  // already open: only merge in remote changes when I have nothing unsaved
    if (!V6.docDirty && cur.value !== str(d.body, 60000)) { const p = cur.selectionStart; cur.value = str(d.body, 60000); try { cur.setSelectionRange(p, p); } catch (e) { } } if (!V6.docDirty && document.activeElement !== $('#docTitle')) $('#docTitle').value = str(d.title, 100); docMeta(d); return; }
  $('#wkTitle').textContent = 'Document'; const ti = el('input', { id: 'docTitle', type: 'text', maxLength: 100, value: str(d.title, 100), placeholder: 'Title', oninput: () => docTouch() }), ta = el('textarea', { id: 'docBody', maxLength: 60000, spellcheck: true, placeholder: 'Start writing…', oninput: () => docTouch() }); ta.value = str(d.body, 60000); ta.dataset.id = id;
  acts.append(el('button', { class: 'btn sm ghost', text: 'Copy', onclick: () => { navigator.clipboard.writeText(ti.value + '\n\n' + ta.value).then(() => toast('Copied.'), () => toast('Select the text and copy it.')); } }),
    window.OFFICE_STANDALONE ? el('button', { class: 'btn sm ghost', text: 'Download', onclick: () => { const a = el('a', { href: URL.createObjectURL(new Blob([ti.value + '\n\n' + ta.value], { type: 'text/plain' })), download: (ti.value || 'document').replace(/[^\w -]+/g, '') + '.txt' }); document.body.append(a); a.click(); a.remove(); } }) : null,
    el('button', { class: 'btn sm ghost', text: '✉️ Mail it', onclick: () => { flushDoc(); V6.tab = 'mail'; V6.doc = null; V6.compose = { to: new Set(), sub: ti.value, body: ta.value, re: null, att: null }; renderWork(); } }),
    (d.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Delete', onclick: () => toast('Delete this document for everyone?', { ms: 8000, action: { label: 'Delete', fn: () => { V6.docDirty = 0; Store.del('hdocs', id); V6.doc = null; renderWork(); } } }) }) : null);
  body.replaceChildren(el('div', { class: 'wk-doc' }, ti, ta)); docMeta(d);
}
function docMeta(d) { const here = [...peers.values()].filter(p => PRES(p).doc === V6.doc).map(p => nameOf(p.uid, p.nick)); $('#wkSub').textContent = (V6.docDirty ? 'Saving…' : 'Saved') + ' · last edit by ' + nameOf(d.eby || d.by) + ', ' + fmtWhen(num(d.t, 0)) + (here.length ? ' · also here: ' + here.join(', ') : ''); }
function docTouch() { V6.docDirty = Date.now(); clearTimeout(V6.docT); V6.docT = setTimeout(flushDoc, 700); const s = $('#wkSub'); if (s && !/^Saving/.test(s.textContent)) s.textContent = s.textContent.replace(/^Saved/, 'Saving…'); }
function flushDoc() { clearTimeout(V6.docT); const ta = $('#docBody'), ti = $('#docTitle'); if (!V6.docDirty || !ta || !V6.doc || ta.dataset.id !== V6.doc) { V6.docDirty = 0; return; } const d = Store.col('hdocs').get(V6.doc) || {}; V6.docDirty = 0; Store.set('hdocs', V6.doc, Object.assign({}, d, { title: ti.value.slice(0, 100), body: ta.value.slice(0, 60000), eby: me.uid, t: Date.now() })); }

/* ---------- Continuity centre: what keeps working, what to do when email or Microsoft is down or compromised ---------- */
function renderCont(body, acts) {
  $('#wkTitle').textContent = 'Continuity centre'; $('#wkSub').textContent = 'How the team keeps working when outside email or chat is down or has been compromised';
  const ok = (name, text, good) => el('div', { class: 'wk-st' }, el('span', { class: 'dot ' + (good === false ? 'warn' : 'ok') }), el('b', { text: name }), el('span', { text: text }));
  const tel = el('input', { id: 'altC', type: 'text', maxLength: 80, value: me.alt || '', placeholder: 'e.g. mobile or WhatsApp number, personal email' });
  body.replaceChildren(el('div', { class: 'wk-form' },
    conf.notice ? el('div', { class: 'card', style: 'background:#fff4d6;border-color:#f0c96a' }, el('b', { text: '⚠️ ' + conf.notice })) : null,
    el('h3', { text: 'Runs entirely in this office' }),
    ok('Messages', 'Talk: channels, direct and group chats, files, polls'), ok('Mail', 'HQ Mail: subjects, replies, attachments, read receipts'), ok('Calendar', 'Events, invitations, reminders, meeting rooms'), ok('Documents', 'Shared pages with templates, saved as you type'), ok('Files', 'Team Drive and attachments'),
    ok('Voice and video', RTC.ok ? 'Nearby voice, calls, room calls and screen sharing, browser to browser' : 'In the self-hosted office. In this preview: hold-to-talk and messages', RTC.ok), ok('Sign-in', window.OFFICE_WP ? 'Accounts on your own website. Admins reset passwords here, without email' : window.OFFICE_STANDALONE ? 'Your own sign-in service' : 'Your Zuchera organisation sign-in'),
    ok('Microsoft Teams and Outlook', conf.comms === 'hq' ? 'Switched off by your admin. Nothing here depends on them' : 'Optional extras. Nothing here depends on them', conf.comms === 'hq' ? undefined : undefined),
    el('h3', { text: 'If email is hacked or down' }), el('ol', { class: 'wk-steps' }, el('li', { text: 'An admin presses the red button below. Everyone sees a notice and the Teams and Outlook buttons disappear.' }), el('li', { text: 'Do not open links, attachments or sign-in prompts from outside email until the admin gives the all-clear in #announcements.' }), el('li', { text: 'Use HQ Mail for anything you would have emailed, Talk for quick messages, and the Calendar for meetings.' }), el('li', { text: 'Keep an Incident log in Documents so everyone can follow what is happening.' }), el('li', { text: 'Locked out? An admin can reset your office password in Admin → Members. No email is involved.' })),
    net.admin ? el('div', { class: 'row' }, el('button', { class: 'btn danger', text: '🛟 Email or Microsoft is down: switch everyone to HQ', onclick: () => continuityOn() }), conf.notice ? el('button', { class: 'btn ghost', text: 'All clear: remove the notice', onclick: () => { Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { notice: '', comms: 'both' })); sendMsg('ch_ann', 'All clear. Outside email and Teams can be used again.'); toast('Notice removed.'); } }) : null, el('button', { class: 'btn ghost', text: 'Start an incident log', onclick: () => { V6.tab = 'docs'; newDoc('incident'); } })) : el('p', { class: 'meta', text: 'Admins can switch the whole office to continuity mode from here.' }),
    el('h3', { text: 'Your backup contact' }), el('p', { class: 'meta', text: 'Shown on your card to teammates, so people can still reach you if everything else fails.' }), el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:200px' }, tel), el('button', { class: 'btn sm', text: 'Save', onclick: () => { me.alt = tel.value.trim().slice(0, 80); saveProfile(); toast('Saved.'); } })),
    el('h3', { text: 'Team contact sheet' }), el('div', { class: 'wk-sheet' }, ...allPeople().filter(r => r.uid).map(r => { const d = r.me ? { alt: me.alt } : Store.col('people').get(r.uid) || {}; return el('div', { class: 'row' }, el('b', { style: 'min-width:140px', text: r.nm }), el('span', { class: 'meta', style: 'flex:1', text: r.role || '' }), el('span', { text: str(d.alt, 80) || '—' })); }))));
}
function continuityOn() {
  const text = 'Outside email or Microsoft 365 is down or may be compromised. Work from this office until the all-clear: HQ Mail for email, Talk for messages, Calendar for meetings, built-in calls for voice and video. Do not open links or sign-in prompts from outside email.';
  Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { comms: 'hq', notice: text.slice(0, 200) })); sendMsg('ch_ann', text);
  Store.set('mail', Store.id(), { by: me.uid, nm: me.name, to: ['*'], sub: 'Continuity mode is on: work from the office', body: text + '\n\nWhat to use:\n• HQ Mail (Workspace → Inbox)\n• Talk for quick messages\n• Calendar for meetings\n• Documents for notes and the incident log\n\nLocked out or unsure? Ask an admin in Talk.', t: Date.now() });
  toast('Continuity mode is on. Everyone has a notice, an announcement and a mail.'); renderWork();
}

/* ---------- polls and voice notes in Talk ---------- */
function pollSheet() {
  const q = el('input', { type: 'text', maxLength: 140, placeholder: 'Question' }), os = [0, 1, 2, 3].map(i => el('input', { type: 'text', maxLength: 60, placeholder: 'Option ' + (i + 1) + (i > 1 ? ' (optional)' : '') }));
  const box = el('div', { class: 'tk-sheet island' }, el('h3', { text: 'New poll' }), field('Question', q), ...os, el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Post poll', onclick: () => { const o = os.map(i => i.value.trim()).filter(Boolean); if (!q.value.trim() || o.length < 2) { toast('Add a question and at least two options.'); return; } box.remove(); sendMsg(V5.conv, '📊 ' + q.value.trim(), { poll: { o } }); } }), el('button', { class: 'btn sm ghost', text: 'Cancel', onclick: () => box.remove() })));
  $('#talk').append(box); q.focus();
}
function pollEl(id, m) {
  if (!m.poll || !Array.isArray(m.poll.o)) return null; const votes = [...Store.col('pv')].filter(([k, v]) => k.startsWith(id + '~') && v), total = votes.length, my = (Store.col('pv').get(id + '~' + me.uid) || {}).o;
  return el('div', { class: 'tk-poll' }, ...m.poll.o.slice(0, 6).map((o, i) => { const n = votes.filter(([, v]) => v.o === i).length, pc = total ? Math.round(n / total * 100) : 0;
    return el('button', { class: 'tk-opt' + (my === i ? ' on' : ''), title: votes.filter(([, v]) => v.o === i).map(([k]) => nameOf(k.split('~')[1])).join(', '), onclick: () => { if (my === i) Store.del('pv', id + '~' + me.uid); else Store.set('pv', id + '~' + me.uid, { o: i, t: Date.now() }); } }, el('span', { class: 'bar', style: 'width:' + pc + '%' }), el('span', { class: 'lbl2', text: str(o, 60) }), el('span', { class: 'pc', text: n + (total ? ' · ' + pc + '%' : '') })); }), el('small', { class: 'meta', text: total + (total === 1 ? ' vote' : ' votes') + ' · click to vote, click again to undo' }));
}
async function voiceNote(btn) {
  if (V6.rec) { V6.rec.stop(); return; }
  if (!window.MediaRecorder || !navigator.mediaDevices || !window.OFFICE_STANDALONE) { toast('Voice notes work in the self-hosted office. Here, use 🎙 to dictate text.'); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Microphone access was blocked.'); return; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '', rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [], t0 = Date.now(), conv = V5.conv; V6.rec = rec; btn.classList.add('rec'); btn.textContent = '■';
  const tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); $('#tkTyping').textContent = '● Recording ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' — press ■ to send'; if (s >= 180) rec.stop(); }, 400);
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = async () => { clearInterval(tick); V6.rec = null; btn.classList.remove('rec'); btn.textContent = '🎤'; $('#tkTyping').textContent = ''; stream.getTracks().forEach(t => t.stop()); const secs = Math.round((Date.now() - t0) / 1000); if (secs < 1 || !chunks.length) return;
    const type = (rec.mimeType || 'audio/webm').split(';')[0], ext = /mp4/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm'; try { const a = await uploadAtt(new File(chunks, 'voice-note-' + new Date().toISOString().slice(11, 19).replace(/:/g, '') + '.' + ext, { type })); a.secs = secs; sendMsg(conv, '', { att: a }); } catch (e) { toast(e.message || 'Could not send the voice note.'); } };
  rec.start();
}

/* ---------- hooks ---------- */
function v6Presence() { return { doc: V6.open && V6.tab === 'docs' && V6.doc ? V6.doc : null }; }
const _pcV6 = personCard;
personCard = function (r) { _pcV6(r); const d = r.me ? { alt: me.alt } : (r.uid && Store.col('people').get(r.uid)) || {}; const b = $('#drawerBody'); if (!b) return;
  if (r.uid && !r.me) b.append(el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: '✉️ Send mail', onclick: () => { closeDrawer(); work(true, 'mail'); V6.compose = { to: new Set([r.uid]), sub: '', body: '', re: null, att: null }; renderWork(); } }), el('button', { class: 'btn sm ghost', text: '🗓 Invite to a meeting', onclick: () => { closeDrawer(); work(true, 'cal'); const dd = new Date(Date.now() + 3600000); dd.setMinutes(0, 0, 0); V6.ev = { id: null, title: '', s: dd.getTime(), dur: 30, where: (W.rooms && W.rooms[0] && W.rooms[0].name) || '', inv: new Set([r.uid]), notes: '' }; renderWork(); } })));
  if (d.alt) b.append(el('p', { class: 'meta', text: '🛟 Backup contact: ' + str(d.alt, 80) })); };
function initV6() {
  const b = el('button', { class: 'tb', id: 'bWork', title: 'Workspace: HQ Mail, Calendar, Documents, Continuity (Ctrl+J)' }, '🗂 Work ', el('span', { class: 'n', id: 'nWork', hidden: true, text: '0' })); $('#topbtns').insertBefore(b, $('#bPeople')); b.onclick = () => work();
  buildWork();
  const form = $('#tkForm'), mic = $('#tkMic'); if (form) { const pb = el('button', { type: 'button', class: 'tk-ic', id: 'tkPoll', title: 'Create a poll', text: '📊', onclick: () => pollSheet() }), vb = el('button', { type: 'button', class: 'tk-ic', id: 'tkVoice', title: 'Record a voice note', text: '🎤', onclick: e => voiceNote(e.currentTarget) }); form.insertBefore(pb, mic); form.insertBefore(vb, mic); vb.hidden = !(window.OFFICE_STANDALONE && window.MediaRecorder); }
  Store.on('mail', onMail); for (const c of ['mailst', 'cal', 'rsvp', 'hdocs']) Store.on(c, () => renderWork()); Store.on('pv', () => renderTalk()); Store.on('office', () => { if (V6.open && V6.tab === 'cont') renderWork(); });
  setInterval(calTick, 15000); setTimeout(calTick, 4000);
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); work(); } else if (e.key === 'Escape' && V6.open && !typing()) work(false); });
  addEventListener('beforeunload', flushDoc);
}

function bccNote(m) { if (!m.grp) return ''; const n = [...Store.col('mail')].filter(([, x]) => x && x.grp === m.grp && x.bc).map(([, x]) => nameOf((x.to || [])[0])); return n.length ? ' · Bcc ' + n.join(', ') : ''; }
