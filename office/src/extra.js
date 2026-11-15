/* ============================ v2: setup, Teams, true status, time, admin ============================ */
const TEAMS = {
  call: ids => 'https://teams.microsoft.com/l/call/0/0?users=' + ids.map(encodeURIComponent).join(','),
  chat: ids => 'https://teams.microsoft.com/l/chat/0/0?users=' + ids.map(encodeURIComponent).join(','),
  meet: (subject, ids, start, end, content) => 'https://teams.microsoft.com/l/meeting/new?subject=' + encodeURIComponent(subject) + '&attendees=' + ids.map(encodeURIComponent).join(',') + (start ? '&startTime=' + encodeURIComponent(new Date(start).toISOString()) + '&endTime=' + encodeURIComponent(new Date(end || start + 1800000).toISOString()) : '') + (content ? '&content=' + encodeURIComponent(content) : '')
};
const isEmail = s => typeof s === 'string' && /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s);
const isTeamsLink = s => typeof s === 'string' && /^https:\/\/(teams\.microsoft\.com|teams\.live\.com|teams\.cloud\.microsoft)\//i.test(s);
const hm = sec => Math.floor(sec / 3600) + 'h ' + two(Math.floor((sec % 3600) / 60)) + 'm';
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); };

/* sound: short synthesised effects, heard by each person as the event reaches them */
let actx = null;
function sfx(k) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime, tone = (f, d, type, g0, at) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(g0, t + (at || 0)); g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d); o.connect(g); g.connect(actx.destination); o.start(t + (at || 0)); o.stop(t + (at || 0) + d + 0.02); };
    if (k === 'tick') tone(900, 0.05, 'square', 0.05); else if (k === 'clack') tone(1500, 0.035, 'triangle', 0.09); else if (k === 'pot') tone(170, 0.28, 'sine', 0.22); else if (k === 'msg') tone(680, 0.12, 'sine', 0.05); else if (k === 'point') { tone(520, 0.12, 'sine', 0.1); tone(780, 0.2, 'sine', 0.1, 0.12); }
    else if (k === 'bell') for (let i = 0; i < 3; i++) { tone(1318, 1.5, 'sine', 0.22, i * 0.42); tone(2637, 0.9, 'sine', 0.08, i * 0.42); tone(3951, 0.5, 'sine', 0.04, i * 0.42); }
  } catch (e) { }
}
let lastInput = Date.now();
for (const ev of ['pointerdown', 'keydown', 'pointermove', 'wheel']) addEventListener(ev, () => { lastInput = Date.now(); if (ev !== 'pointermove' && actx && actx.state === 'suspended') actx.resume(); }, { passive: true });

/* true status: what the office observes, unless the person has set something stronger */
function effStatus() {
  if (me.out) return 'off'; if (me.call) return 'call'; if (typeof OUT !== 'undefined' && OUT.busy && (me.status === 'available' || document.hidden)) return 'outlook';
  if (document.hidden) return 'away';
  if (me.status !== 'available') return me.status;
  if (Date.now() - lastInput > 5 * 60000) return 'idle';
  const z = me.zone; if (z && (z.id === 'thames' || z.id === 'shard')) for (const p of peers.values()) if (p.zid === z.id) return 'meeting';
  if (me.game) return 'break';
  return 'available';
}
let clock = LS.get('clock', null); if (!clock || clock.d !== dayKey()) clock = { d: dayKey(), wk: 0, br: 0 };
let clockSave = 0, breakStart = 0, breakNudged = false;
function tickClock(dt) {
  if (clock.d !== dayKey()) clock = { d: dayKey(), wk: 0, br: 0 };
  if (!(dt > 0)) return; const s = effStatus(); if (s === 'break') clock.br += dt; else if (s !== 'away' && s !== 'idle') clock.wk += dt;
  if (s === 'break') { if (!breakStart) { breakStart = Date.now(); breakNudged = false; } else if (!breakNudged && Date.now() - breakStart > 15 * 60000) { breakNudged = true; toast('That is 15 minutes of break. Ready to head back?', { action: { label: 'End break', fn: () => setStatus('available') } }); } lastBreak = Date.now(); } else breakStart = 0;
  if ((clockSave += dt) > 15) { clockSave = 0; LS.set('clock', clock); }
  $('#clockChip').textContent = conf.track ? 'At work ' + hm(clock.wk) + ' · Breaks ' + hm(clock.br) : '';
  const bb = $('#bBreak'); bb.textContent = me.status === 'break' ? 'End break (' + Math.floor((Date.now() - (breakStart || Date.now())) / 60000) + ' min)' : 'Take a break'; bb.classList.toggle('on', me.status === 'break');
}
$('#bBreak').onclick = () => { if (me.status === 'break') setStatus('available'); else { setStatus('break'); toast('Break started. Your status shows "On a break" and the time is counted separately.', { action: { label: 'Walk to the café', fn: () => goTo(4.8, 5.2) } }); } };

/* everyone we know about: here now, signed up before, or added by an admin */
const removedMap = () => (Store.col('office').get('removed') || {}).map || {};
function rosterList() { const l = (Store.col('office').get('roster') || {}).list; return Array.isArray(l) ? l.filter(r => r && typeof r.fn === 'string').slice(0, 200).map(r => ({ id: str(r.id, 24), fn: str(r.fn, 40), role: str(r.role, 40), teams: str(r.teams, 120) })) : []; }
function allPeople() {
  const rows = [], seen = new Set(), rem = removedMap(), tseen = new Set(), people = Store.col('people');
  const push = r => { rows.push(r); if (r.uid) seen.add(r.uid); if (r.teams) tseen.add(r.teams.toLowerCase()); };
  push({ uid: me.uid, me: true, nm: nameOf(me.uid, me.name), role: me.role, tz: me.tz, online: !me.out, status: effStatus(), task: me.task, zone: me.zone && me.zone.name, face: humanThumb(me.cfg.m), teams: me.teams, tlink: me.tlink, calls: me.prefs.calls, wk: clock.wk, br: clock.br });
  for (const [k, p] of peers) { const d = p.uid ? people.get(p.uid) : null; push({ uid: p.uid, key: k, nm: nameOf(p.uid, p.nick), role: p.role, tz: p.tzName, online: true, status: p.status, task: PRES(p).task, inT: num(PRES(p).inT, 0), face: humanThumb(cleanCfg(PRES(p).av).m), zone: (W.zones.find(z => z.id === p.zid) || {}).name, teams: d ? str(d.teams, 120) : '', tlink: d ? str(d.tlink, 300) : '', calls: !d || !d.prefs || d.prefs.calls !== false, wk: p.wk, br: p.br, guest: p.guest }); }
  for (const [uid, d] of people) { if (seen.has(uid) || !d || rem[uid] || (uid === 'local' && Store.db)) continue; push({ uid, nm: nameOf(uid, str(d.nm, 40)), role: str(d.role, 40), tz: str(d.tz, 60), online: false, status: 'off', teams: str(d.teams, 120), tlink: str(d.tlink, 300), calls: !d.prefs || d.prefs.calls !== false, face: d.av ? humanThumb(cleanCfg(d.av).m) : '', last: num(d.t, 0) }); }
  for (const r of rosterList()) if (!r.teams || !tseen.has(r.teams.toLowerCase())) rows.push({ rid: r.id, nm: r.fn, role: r.role, online: false, status: 'off', teams: r.teams, calls: true, invited: true });
  return rows;
}
function badgeEl(r, lg) {
  const st = STATUS[r.status] || STATUS.off, b = el('button', { type: 'button', class: 'badge' + (lg ? ' lg' : '') + (r.online ? '' : ' off'), title: r.nm + ': ' + st[1] + (r.zone ? ', ' + r.zone : ''), 'aria-label': r.nm + ', ' + st[1], style: 'border-color:' + st[0] + ';--sc:' + st[0] + (r.face ? ';background-image:url(' + r.face + ')' : ''), text: r.face ? '' : initials(r.nm) });
  return b;
}
let stripSig = '';
function renderStrip() {
  const rows = allPeople().sort((a, b) => (b.online - a.online)), sig = rows.map(r => r.nm + r.status + (r.face ? 1 : 0)).join('|'); if (sig === stripSig) return; stripSig = sig;
  const shown = rows.slice(0, 12); $('#strip').replaceChildren(...shown.map(r => { const b = badgeEl(r); b.onclick = () => personCard(r); return b; }), ...(rows.length > 12 ? [el('span', { class: 'more', text: '+' + (rows.length - 12) })] : []));
  $('#nOnline').textContent = rows.filter(r => r.online).length;
}
function teamsButtons(r) {
  const out = [];
  if (isEmail(r.teams)) { if (r.calls !== false) out.push(el('a', { class: 'btn sm', href: TEAMS.call([r.teams]), target: '_blank', rel: 'noopener noreferrer', text: 'Call on Teams' })); out.push(el('a', { class: 'btn sm ghost', href: TEAMS.chat([r.teams]), target: '_blank', rel: 'noopener noreferrer', text: 'Chat on Teams' })); }
  if (isTeamsLink(r.tlink)) out.push(el('a', { class: 'btn sm ghost', href: r.tlink, target: '_blank', rel: 'noopener noreferrer', text: 'Open their Teams link' }));
  return out;
}
function personCard(r) {
  openDrawer('person', r.nm, false, b => {
    const st = STATUS[r.status] || STATUS.off, tb = teamsButtons(r);
    b.append(el('div', { class: 'row' }, badgeEl(r, true), el('div', {}, el('div', { class: 'big', text: r.nm + (r.me ? ' (you)' : '') }), el('div', { class: 'meta', text: [r.role, r.tz ? localTime(r.tz) + ' in ' + city(r.tz) : '', r.guest ? 'Guest' : ''].filter(Boolean).join(' · ') }), el('span', { class: 'pill ' + r.status }, el('i'), st[1] + (r.zone ? ' · ' + r.zone : '')))));
    if (r.online && conf.track && r.wk != null) b.append(el('p', { text: 'In the office today: ' + hm(num(r.wk, 0)) + ' at work, ' + hm(num(r.br, 0)) + ' on breaks.' }));
    if (!r.online) b.append(el('p', { text: r.invited ? 'Added by an admin. Has not joined the office yet.' : 'Not in the office right now.' + (r.last ? ' Last here ' + new Date(r.last).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '.' : '') }));
    if (r.task) b.append(el('p', { class: 'big', style: 'font-size:16px', text: taskLabel(r.task) }));
    if (r.uid && !r.me) b.append(el('div', { class: 'row' }, el('button', { class: 'btn sm', text: '💬 Message', onclick: () => { closeDrawer(); openThread([r.uid]); } }), el('button', { class: 'btn sm ghost', text: '📅 Request…', onclick: () => openRequest({ to: [r.uid] }) }), el('button', { class: 'btn sm ghost', text: '🎁 Send a gift', onclick: () => openGift(r.uid) })));
    const hq = hqCallButtons(r); if (hq) b.append(hq);
    if (conf.comms !== 'hq' && tb.length) b.append(el('div', { class: 'row' }, ...tb));
    if (isEmail(r.teams) && r.calls === false) b.append(el('p', { text: r.nm + ' prefers messages to calls.' }));
    if (r.key) b.append(el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: 'Walk over', onclick: () => { walkToPeer(r.key); closeDrawer(); } }), el('button', { class: 'btn sm ghost', text: 'Wave 👋', onclick: () => wavePeer(r.key) }), el('button', { class: 'btn sm ghost', text: 'Ask them to come here', onclick: () => { me.ping = { to: r.key, n: Date.now(), k: 'come', z: me.zone ? me.zone.name : '' }; toast('Invite sent to ' + r.nm + '.'); } })));
    if (net.admin && !r.me && (r.uid || r.rid)) b.append(el('button', { class: 'btn sm danger', text: r.rid ? 'Remove from the team list' : 'Remove from the office', onclick: () => { adminRemove(r); closeDrawer(); } }));
  });
}
function openPerson(k) { const r = allPeople().find(x => x.key === k); if (r) personCard(r); }
function adminRemove(r) {
  if (r.rid) Store.set('office', 'roster', { list: rosterList().filter(x => x.id !== r.rid) });
  else if (r.uid) { const map = Object.assign({}, removedMap()); map[r.uid] = Date.now(); Store.set('office', 'removed', { map }); const as = Object.assign({}, (Store.col('office').get('assign') || {}).map || {}); for (const k in as) if (as[k] === r.uid) delete as[k]; Store.set('office', 'assign', { map: as }); }
  toast(r.nm + ' removed.');
}

/* first-run setup */
function needSetup() { return !me.name || !me.role || (conf.reqTeams && !isEmail(me.teams)); }
function applyPrefs() { $('#chat').style.display = conf.chat && me.prefs.chat ? '' : 'none'; $('#bAdmin').hidden = !net.admin; }
function showSetup(edit) {
  const card = $('#setupCard'), err = el('p', { class: 'err' });
  const fn = el('input', { id: 'sFn', type: 'text', maxLength: 40, value: me.name, placeholder: 'e.g. Victoria', autocomplete: 'given-name' }), ro = el('input', { id: 'sRo', type: 'text', maxLength: 40, value: me.role, placeholder: 'e.g. Product Manager' });
  const tid = el('input', { id: 'sTid', type: 'text', maxLength: 120, value: me.teams, placeholder: 'you@company.com', autocomplete: 'email', inputMode: 'email' }), tl = el('input', { id: 'sTl', type: 'url', maxLength: 300, value: me.tlink, placeholder: 'https://teams.microsoft.com/…' });
  const cChat = el('input', { id: 'sChat', type: 'checkbox', checked: me.prefs.chat }), cCall = el('input', { id: 'sCall', type: 'checkbox', checked: me.prefs.calls });
  const save = () => {
    const a = fn.value.trim(), r = ro.value.trim(), t = tid.value.trim(), l = tl.value.trim();
    if (!a) { err.textContent = 'Enter your first name.'; fn.focus(); return; } if (!r) { err.textContent = 'Enter your job title.'; ro.focus(); return; }
    if ((conf.reqTeams || t) && !isEmail(t)) { err.textContent = 'Enter the work email you sign in to Teams with.'; tid.focus(); return; }
    if (l && !isTeamsLink(l)) { err.textContent = 'The Teams link must start with https://teams.microsoft.com/'; tl.focus(); return; }
    me.name = a; me.role = r; me.teams = t; me.tlink = l; me.prefs = { chat: cChat.checked, calls: cCall.checked }; saveProfile(); recomputeDesks(); applyPrefs();
    $('#setup').style.display = 'none'; LS.set('seen', true); if (!edit) checkIn(); if (!edit) { openPanel('avatar'); toast('You are in. Now make your avatar, then click the floor to walk.', { ms: 8000 }); }
  };
  card.replaceChildren(el('h2', { id: 'setupT', text: edit ? 'Your details' : 'Welcome to ' + conf.name }), el('p', { text: edit ? 'These show on your badge and let teammates reach you.' : 'Before you walk in, tell the team who you are and how to reach you.' }),
    field('First name', fn), field('Job title', ro), el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'Choose how you look (realistic 3D person)' }), lookPicker()), field('Teams ID (the work email you use for Teams)' + (conf.reqTeams ? '' : ', optional'), tid), field('Your Teams meeting or chat link, optional', tl),
    el('label', { class: 'tog', for: 'sChat' }, cChat, el('span', {}, 'Office chat', el('small', { text: 'Show the chat panel and speech bubbles.' }))),
    el('label', { class: 'tog', for: 'sCall' }, cCall, el('span', {}, 'Teams calls', el('small', { text: 'Let teammates start a Teams call with you from your badge.' }))),
    el('p', { text: 'Your name, title, status, Teams ID and today\'s time in the office are visible to everyone this office is shared with.' }), err,
    el('div', { class: 'row' }, el('button', { class: 'btn', text: edit ? 'Save' : 'Enter the office', onclick: save }), (!conf.req || edit) ? el('button', { class: 'btn ghost', text: edit ? 'Cancel' : 'Skip for now', onclick: () => { $('#setup').style.display = 'none'; if (!edit) { checkIn(); LS.set('skipSetup', dayKey()); if (!LS.get('seen', false)) { LS.set('seen', true); openPanel('avatar'); } } } }) : null));
  $('#setup').style.display = 'grid'; setTimeout(() => fn.focus(), 50);
}
function maybeSetup() {
  applyPrefs(); if (me.removed) return;
  if (needSetup() && (conf.req || LS.get('skipSetup', '') !== dayKey())) showSetup(false);
  else { checkIn(); if (!LS.get('seen', false)) { LS.set('seen', true); openPanel('avatar'); } }
}

/* photo for the avatar's face: cropped square, shrunk, stored with the profile */
function facePicker() {
  let img = null, zoom = 1.25, oy = 0; const msg = el('span', { class: 'meta', text: me.face ? 'Photo in use.' : 'A clear, front-on photo works best.' });
  const apply = () => { if (!img) return; const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d'), s = Math.min(img.width, img.height) / zoom, sx = (img.width - s) / 2, sy = clamp((img.height - s) / 2 + oy * img.height * 0.3, 0, img.height - s); x.drawImage(img, sx, sy, s, s, 0, 0, 192, 192); me.face = c.toDataURL('image/jpeg', 0.82); me.av.setFace(me.face); saveProfile(); msg.textContent = 'Photo in use. Adjust the sliders to frame your face.'; stripSig = ''; };
  const file = el('input', { id: 'fFace', type: 'file', accept: 'image/*', onchange: e => { const f = e.target.files && e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { img = im; apply(); URL.revokeObjectURL(u); }; im.onerror = () => { msg.textContent = 'That file could not be read as an image.'; }; im.src = u; } });
  const z = el('input', { id: 'fFz', type: 'range', min: 1, max: 3, step: 0.05, value: zoom, 'aria-label': 'Zoom', oninput: e => { zoom = +e.target.value; apply(); } }), o = el('input', { id: 'fFo', type: 'range', min: -1, max: 1, step: 0.05, value: 0, 'aria-label': 'Move up or down', oninput: e => { oy = +e.target.value; apply(); } });
  return el('div', { class: 'card' }, el('b', { text: 'Use your photo as your face' }), msg, file, el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Zoom' }), z, el('span', { class: 'lbl', text: 'Up / down' }), o), el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: 'Remove photo', onclick: () => { me.face = ''; me.av.setFace(''); saveProfile(); msg.textContent = 'Photo removed.'; stripSig = ''; } })));
}

/* people panel */
panels.people = b => {
  const sum = el('div', { class: 'card' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  b.append(el('p', { text: 'Status is what the office sees right now. Blue bars are each person\'s 9:00 to 18:00 day on the London clock; the yellow box is now.' }), sum, list);
  return () => {
    const rows = allPeople(), ld = Math.floor(londonHour()), base = new Date(); base.setUTCMinutes(0, 0, 0); const lNow = (tzHM('Europe/London', base) || { h: 0 }).h;
    const work = r => { const out = []; for (let i = 0; i < 24; i++) { const t = tzHM(r.tz || 'Europe/London', new Date(base.getTime() + (i - lNow) * 3600e3)); out.push(!!t && t.h >= 9 && t.h < 18); } return out; };
    const withTz = rows.filter(r => r.tz), all = withTz.map(work), ov = []; for (let i = 0; i < 24; i++) if (all.length > 1 && all.every(a => a[i])) ov.push(i);
    sum.replaceChildren(el('b', { text: withTz.length < 2 ? 'Shared working hours appear here once teammates join.' : ov.length ? 'Everyone overlaps ' + two(ov[0]) + ':00 to ' + two(ov[ov.length - 1] + 1) + ':00 London time.' : 'No hour where all ' + withTz.length + ' people are within 9:00 to 18:00. Rotate meeting times.' }), el('span', { class: 'meta', text: rows.filter(r => r.online).length + ' in the office now · ' + rows.length + ' on the team' }));
    list.replaceChildren(...rows.sort((a, c) => c.online - a.online).map(r => { const st = STATUS[r.status] || STATUS.off, bd = badgeEl(r); bd.onclick = () => personCard(r);
      return el('div', { class: 'card person', style: 'grid-template-columns:44px 1fr auto' }, bd,
        el('div', {}, el('div', { class: 'nm', text: r.nm + (r.me ? ' (you)' : '') }), el('div', { class: 'sub', text: [r.role, r.tz ? localTime(r.tz) + ' in ' + city(r.tz) : '', r.online && conf.track && r.wk != null ? hm(num(r.wk, 0)) + ' today' : ''].filter(Boolean).join(' · ') }), r.task ? el('div', { class: 'sub', style: 'color:var(--ink)', text: taskLabel(r.task) }) : null),
        el('span', { class: 'pill ' + r.status }, el('i'), r.invited ? 'Invited' : st[1] + (r.online && r.zone ? ' · ' + r.zone : '')),
        r.tz ? el('div', { class: 'hours' }, ...work(r).map((w, h) => el('i', { class: (w ? 'w' : '') + (h === ld ? ' now' : '') }))) : null,
        !r.me ? el('div', { class: 'row', style: 'grid-column:1/-1' }, ...teamsButtons(r), r.key ? el('button', { class: 'btn sm ghost', text: 'Walk over', onclick: () => walkToPeer(r.key) }) : null) : null); }));
  };
};

/* admin */
panels.admin = b => {
  if (!net.admin) { b.append(el('p', { text: 'Only office admins can use this panel.' })); return; }
  const fn = el('input', { id: 'aFn', type: 'text', maxLength: 40, placeholder: 'First name' }), ro = el('input', { id: 'aRo', type: 'text', maxLength: 40, placeholder: 'Job title' }), tm = el('input', { id: 'aTm', type: 'text', maxLength: 120, placeholder: 'Teams email' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:6px' }), gone = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  const nm = el('input', { id: 'fTeam', type: 'text', maxLength: 32, value: conf.name }), sz = el('select', { id: 'fSize' }, ...[3, 4, 5, 6, 7, 8].map(n => el('option', { value: n, text: n * 10 + ' people (' + n * 8 + ' open desks, ' + n * 2 + ' private offices)', selected: conf.bays === n })));
  const tg = (id, label, hint, v) => { const i = el('input', { id, type: 'checkbox', checked: v }); return [i, el('label', { class: 'tog', for: id }, i, el('span', {}, label, el('small', { text: hint })))]; };
  const [tReq, lReq] = tg('aReq', 'Setup is compulsory', 'New joiners must give name and job title before entering.', conf.req), [tTm, lTm] = tg('aTms', 'Ask for a Teams ID', 'Optional. Built-in calls and Talk work without it.', conf.reqTeams), [tCh, lCh] = tg('aCh', 'Office chat', 'Turn the chat panel on or off for everyone.', conf.chat), [tGm, lGm] = tg('aGm', 'Games', 'Table tennis, pool and Connect Four.', conf.games), [tTr, lTr] = tg('aTr', 'Show time at work', 'Each person\'s time in the office today is visible to the team.', conf.track);
  const an = el('input', { id: 'aAn', type: 'text', maxLength: 160, placeholder: 'e.g. All-hands in the Thames Room at 15:00', value: str((Store.col('office').get('announce') || {}).text, 160) });
  const tl = el('input', { id: 'aTl', type: 'url', maxLength: 300, value: conf.teamLink, placeholder: 'https://teams.microsoft.com/l/meetup-join/…' });
  const ap = el('input', { id: 'aAppr', type: 'checkbox', checked: conf.approval }), idl = el('select', { id: 'aIdle' }, ...[[0, 'Never'], [15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [120, '2 hours']].map(([v, t]) => el('option', { value: v, text: t, selected: conf.idleMin === v }))), iso = el('input', { id: 'aIso', type: 'checkbox', checked: conf.idleSignOut }), dom = el('input', { id: 'aDom', type: 'text', maxLength: 200, value: (conf.allow || []).join(', '), placeholder: 'e.g. startdotcom.co.uk' });
  b.append(el('div', { class: 'row' }, el('button', { class: 'btn', text: '🛎 Members and approvals', onclick: () => openPanel('members') }), el('button', { class: 'btn ghost', text: 'Today\'s attendance', onclick: () => openPanel('attendance') }), el('button', { class: 'btn ghost', text: '📈 Insights', onclick: () => openPanel('insights') }), el('button', { class: 'btn ghost', text: 'Today\'s activity', onclick: () => openPanel('today') })),
    el('h3', { text: 'Access and security' }), el('label', { class: 'tog', for: 'aAppr' }, ap, el('span', {}, 'New people need approval', el('small', { text: 'They wait in reception until an admin lets them in.' }))), field('Allowed email domains (get in without waiting)', dom), field('Check people out after inactivity', idl), el('label', { class: 'tog', for: 'aIso' }, iso, el('span', {}, 'Also sign them out', el('small', { text: 'Standalone version only: they must sign in again after the timeout.' }))),
    el('button', { class: 'btn', text: 'Save access settings', onclick: () => { Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { approval: ap.checked, idleSignOut: iso.checked, idleMin: +idl.value, allow: dom.value.split(/[\s,;]+/).map(s => s.trim().toLowerCase().replace(/^@/, '')).filter(Boolean) })); toast('Access settings saved.'); } }), brandSection(), el('h3', { text: 'Add a team member' }), el('p', { text: 'They appear on the team list straight away with Teams buttons, and take over the entry when they join with the same Teams email. To let them in, also share this office with them from Zuchera share settings.' }), el('div', { class: 'field' }, fn, ro, tm),
    el('button', { class: 'btn', text: 'Add to team', onclick: () => { const a = fn.value.trim(), t = tm.value.trim(); if (!a) { toast('Enter a first name.'); return; } if (t && !isEmail(t)) { toast('That Teams email does not look right.'); return; } Store.set('office', 'roster', { list: rosterList().concat({ id: Store.id(), fn: a, role: ro.value.trim(), teams: t }) }); fn.value = ro.value = tm.value = ''; } }),
    el('h3', { text: 'Team' }), list, el('h3', { text: 'Removed' }), gone,
    ...commsSection(), el('h3', { text: 'Office rules' }), field('Team name on the wall', nm), field('Floor size', sz), field('Team call link (a Teams meeting everyone can join from any meeting room)', tl), lReq, lTm, lCh, lGm, lTr,
    el('button', { class: 'btn', text: 'Save office rules', onclick: () => { if (tl.value.trim() && !/^https:\/\//.test(tl.value.trim())) { toast('The team call link must start with https://'); return; } Store.set('office', 'config', { ...(Store.col('office').get('config') || {}), name: nm.value.trim() || 'Our HQ', teamLink: tl.value.trim(), bays: +sz.value, req: tReq.checked, reqTeams: tTm.checked, chat: tCh.checked, games: tGm.checked, track: tTr.checked }); toast('Office updated for everyone.'); } }),
    el('h3', { text: 'Announcement' }), field('Banner shown to everyone', an), el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Post', onclick: () => Store.set('office', 'announce', { text: an.value.trim(), nm: me.name, t: Date.now() }) }), el('button', { class: 'btn ghost', text: 'Clear', onclick: () => { an.value = ''; Store.set('office', 'announce', { text: '', t: Date.now() }); } })),
    el('h3', { text: 'Housekeeping' }), el('div', { class: 'row' }, el('button', { class: 'btn sm ghost', text: 'Clear chat history', onclick: () => { for (const id of [...Store.col('chat').keys()]) Store.del('chat', id); toast('Chat cleared.'); } }), el('button', { class: 'btn sm ghost', text: 'Reset games', onclick: () => { Store.del('games', 'tt'); Store.del('games', 'pool'); Store.del('games', 'c4'); toast('Games reset.'); } })),
    el('p', { text: 'Removing someone here blocks this office for them and frees their desk. To cut their access completely, also remove them in Zuchera share settings.' }));
  return () => {
    const rem = removedMap(), people = Store.col('people');
    list.replaceChildren(...allPeople().map(r => el('div', { class: 'row card', style: 'flex-direction:row' }, el('span', { style: 'flex:1', text: r.nm + (r.me ? ' (you)' : '') + (r.role ? ' · ' + r.role : '') + (r.invited ? ' · invited' : r.online ? ' · here now' : '') }), !r.me && (r.uid || r.rid) ? el('button', { class: 'btn sm ghost', text: 'Remove', onclick: () => adminRemove(r) }) : null)));
    const ids = Object.keys(rem); gone.replaceChildren(...(ids.length ? ids.map(uid => el('div', { class: 'row card', style: 'flex-direction:row' }, el('span', { style: 'flex:1', text: nameOf(uid, str((people.get(uid) || {}).nm, 40)) }), el('button', { class: 'btn sm ghost', text: 'Restore', onclick: () => { const map = Object.assign({}, removedMap()); delete map[uid]; Store.set('office', 'removed', { map }); } }))) : [el('span', { class: 'meta', text: 'Nobody has been removed.' })]));
  };
};
$('#bAdmin').onclick = () => openPanel('admin');
function onOffice(m) {
  const rem = removedMap(); if (me.uid !== 'local' && rem[me.uid] && !me.removed) { me.removed = true; $('#removed').style.display = 'grid'; } else if (me.removed && !rem[me.uid]) { me.removed = false; $('#removed').style.display = 'none'; }
  const a = m.get('announce') || {}, bn = $('#banner'), txt = str(a.text, 160);
  if (txt && LS.get('annSeen', 0) !== num(a.t, 0)) { bn.replaceChildren(el('span', { text: '📣 ' + txt }), el('button', { class: 'btn sm ghost', text: 'Got it', onclick: () => { LS.set('annSeen', num(a.t, 0)); bn.style.display = 'none'; } })); bn.style.display = 'flex'; } else bn.style.display = 'none';
  applyPrefs(); stripSig = ''; refreshPanel('admin');
}

/* ============================ wins board, bell, confetti ============================ */
const WIN_KINDS = [['deal', 'Deal closed', '🤝'], ['sub', 'Subscription upgrade', '📈'], ['ship', 'Successful deployment', '🚀'], ['star', 'Milestone', '⭐']];
const winKind = k => WIN_KINDS.find(x => x[0] === k) || WIN_KINDS[3];
function leaderboard() {
  const mk = new Date().toISOString().slice(0, 7), pts = {}; const add = (uid, nm, n) => { if (!uid) return; (pts[uid] = pts[uid] || { nm, p: 0, w: 0 }).p += n; if (n === 3) pts[uid].w++; };
  for (const w of Store.col('wins').values()) if (w && new Date(num(w.t, 0)).toISOString().slice(0, 7) === mk) add(str(w.by, 80), nameOf(w.by, w.nm), 3);
  for (const k of Store.col('kudos').values()) if (k && k.toUid && new Date(num(k.t, 0)).toISOString().slice(0, 7) === mk) add(str(k.toUid, 80), str(k.to, 40), 1);
  return Object.values(pts).sort((a, b) => b.p - a.p).slice(0, 5);
}
function drawWins() {
  const d = W.dyn.wins; if (!d) return; const ws = [...Store.col('wins').values()].filter(Boolean).sort((a, b) => num(b.t, 0) - num(a.t, 0)).slice(0, 4), lb = leaderboard();
  d.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb627'; c.font = '700 64px ' + FONT_D; c.textBaseline = 'top'; c.fillText('Wins and rewards', 40, 30); c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '600 26px ' + FONT_B; c.fillText('Ring the bell for a closed deal, an upgrade or a clean deployment', 42, 108);
    ws.forEach((x, i) => { const y = 164 + i * 128, k = winKind(x.kind); c.fillStyle = 'rgba(255,255,255,.09)'; rr(c, 40, y, 580, 112, 18); c.fill(); c.font = '56px serif'; c.fillText(k[2], 56, y + 24); c.fillStyle = '#fff'; c.font = '700 30px ' + FONT_B; c.fillText(k[1] + ' · ' + nameOf(x.by, x.nm), 136, y + 16, 470); c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '500 24px ' + FONT_B; wrapText(c, str(x.text, 120), 470, 2).forEach((l, j) => c.fillText(l, 136, y + 54 + j * 28)); });
    if (!ws.length) { c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '600 30px ' + FONT_B; c.fillText('No wins rung in yet. Be the first.', 42, 200); }
    c.fillStyle = '#ffb627'; c.font = '700 34px ' + FONT_D; c.fillText('This month', 664, 164); lb.forEach((p, i) => { const y = 220 + i * 84; c.fillStyle = i === 0 ? '#ffb627' : 'rgba(255,255,255,.12)'; rr(c, 664, y, 320, 70, 16); c.fill(); c.fillStyle = i === 0 ? '#14202e' : '#fff'; c.font = '700 30px ' + FONT_B; c.fillText((i + 1) + '. ' + p.nm, 682, y + 18, 210); c.textAlign = 'right'; c.fillText(p.p + ' pts', 968, y + 18); c.textAlign = 'left'; }); });
}
const confetti = (() => { const N = 180, g = new T.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), c = new T.Color(); for (let i = 0; i < N; i++) { c.set(HOOD_COL[i % 8]).convertSRGBToLinear(); col.set([c.r, c.g, c.b], i * 3); } g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); const p = new T.Points(g, new T.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false })); p.visible = false; p.frustumCulled = false; scene.add(p); return { p, pos, vel, N, until: 0 }; })();
function burst(x, z) { const c = confetti; for (let i = 0; i < c.N; i++) { c.pos.set([x + (Math.random() - .5) * 0.6, 2.2 + Math.random() * 0.6, z + (Math.random() - .5) * 0.6], i * 3); c.vel.set([(Math.random() - .5) * 3.2, 1.5 + Math.random() * 3, (Math.random() - .5) * 3.2], i * 3); } c.until = performance.now() + 4200; c.p.visible = true; }
const bellSince = Date.now() - 4000, bellSeen = new Set();
function onWins(m) {
  for (const [id, w] of m) { if (!w || bellSeen.has(id)) continue; bellSeen.add(id); if (num(w.t, 0) < bellSince) continue; const k = winKind(w.kind);
    fx.bell = performance.now() + 3200; sfx('bell'); burst(me.pos.x, me.pos.z); if (w.by !== me.uid) doLocalEmote('clap'); toast('🔔 ' + k[1] + ': ' + nameOf(w.by, w.nm) + (w.text ? '. ' + str(w.text, 120) : ''), { ms: 9000 }); }
  drawWins(); refreshPanel('wins');
}
function doLocalEmote(e) { me.emote = e; me.emoteT = performance.now(); me.emN++; }
panels.wins = b => {
  let kind = 0; const tx = el('input', { id: 'wTx', type: 'text', maxLength: 120, placeholder: 'What happened? e.g. Signed first enterprise customer' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' }), lead = el('div', { class: 'card' });
  b.append(el('p', { text: 'Ring the bell and everyone in the office hears it, wherever they are standing.' }), chips('What are we celebrating?', WIN_KINDS.map(k => k[2] + ' ' + k[1]), () => kind, v => { kind = v; }), field('Details', tx),
    el('button', { class: 'btn', text: '🔔 Ring the bell', onclick: () => { doEmote('bell'); Store.set('wins', Store.id(), { kind: WIN_KINDS[kind][0], text: tx.value.trim(), by: me.uid, nm: me.name, t: Date.now() }); tx.value = ''; } }), el('h3', { text: 'Reward board, this month' }), lead, el('p', { text: 'Points this month: 3 for a win rung in, 1 for each kudos received, and 1 to 10 for each gift received.' }), el('button', { class: 'btn ghost', text: '🎁 Send a gift', onclick: () => openGift(null) }), el('h3', { text: 'Recent wins' }), list);
  return () => { const lb = leaderboard(); lead.replaceChildren(...(lb.length ? [el('div', { class: 'lead' }, ...lb.flatMap((p, i) => [el('b', { text: (i + 1) + '.' }), el('span', { text: p.nm }), el('b', { text: p.p + ' pts' })]))] : [el('span', { class: 'meta', text: 'No points yet this month.' })]));
    const ws = [...Store.col('wins')].filter(([, w]) => w).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)).slice(0, 30);
    list.replaceChildren(...ws.map(([id, w]) => { const k = winKind(w.kind); return el('div', { class: 'card win' }, el('b', { text: k[2] + ' ' + k[1] + ' · ' + nameOf(w.by, w.nm) }), w.text ? el('span', { text: str(w.text, 120) }) : null, el('div', { class: 'row' }, el('span', { class: 'meta', text: new Date(num(w.t, 0)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }), (w.by === me.uid || net.admin) ? el('button', { class: 'btn sm ghost', text: 'Remove', onclick: () => Store.del('wins', id) }) : null)); })); };
};

/* ============================ GO / NO-GO decisions ============================ */
function tally(did) { let go = 0, no = 0, mine = null; const why = []; for (const v of Store.col('votes').values()) if (v && v.d === did) { if (v.v === 'go') go++; else no++; if (v.by === me.uid) mine = v.v; if (v.why) why.push((v.v === 'go' ? 'GO' : 'NO-GO') + ' · ' + nameOf(v.by, v.nm) + ': ' + str(v.why, 140)); } return { go, no, mine, why }; }
function drawDecide() {
  const d = W.dyn.decide; if (!d) return; const ds = [...Store.col('decisions')].filter(([, x]) => x).sort((a, b) => num(b[1].t, 0) - num(a[1].t, 0)), cur = ds.find(([, x]) => !x.closed) || ds[0];
  d.draw((c, w, h) => { c.fillStyle = '#f7f8fa'; c.fillRect(0, 0, w, h); c.fillStyle = '#14202e'; c.font = '700 44px ' + FONT_D; c.textBaseline = 'top'; c.fillText('Decision board', 40, 30); c.font = '600 24px ' + FONT_B; c.fillStyle = '#4a5a6c';
    if (!cur) { c.fillText('No decision on the table. Walk up to put one to the team.', 42, 96); return; } const x = cur[1], t = tally(cur[0]);
    c.fillText(x.closed ? 'Decided' : 'Open for votes', 42, 92); c.fillStyle = '#14202e'; c.font = '700 54px ' + FONT_D; wrapText(c, str(x.title, 120), w - 80, 3).forEach((l, i) => c.fillText(l, 40, 136 + i * 62));
    const y = 360; c.fillStyle = '#1f9d6b'; rr(c, 40, y, 456, 220, 26); c.fill(); c.fillStyle = '#d6453d'; rr(c, 528, y, 456, 220, 26); c.fill(); c.fillStyle = '#fff'; c.font = '700 50px ' + FONT_D; c.fillText('GO', 70, y + 24); c.fillText('NO-GO', 558, y + 24); c.font = '700 120px ' + FONT_D; c.fillText(String(t.go), 70, y + 84); c.fillText(String(t.no), 558, y + 84);
    if (x.closed) { c.fillStyle = 'rgba(20,32,46,.85)'; rr(c, 300, y + 60, 424, 100, 20); c.fill(); c.fillStyle = '#fff'; c.font = '700 56px ' + FONT_D; c.textAlign = 'center'; c.fillText(x.closed === 'go' ? 'It is a GO' : 'NO-GO', w / 2, y + 78); c.textAlign = 'left'; } });
}
panels.decide = b => {
  const ti = el('input', { id: 'dTi', type: 'text', maxLength: 120, placeholder: 'e.g. Ship the payroll module on Friday?' }), dt = el('textarea', { id: 'dDt', maxLength: 600, placeholder: 'Context the team needs to decide' }), list = el('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  b.append(el('p', { text: 'Put a decision to the team. Everyone votes GO or NO-GO with a reason, then the proposer or an admin closes it.' }), field('Decision', ti), field('Context', dt), el('button', { class: 'btn', text: 'Put it to the team', onclick: () => { if (!ti.value.trim()) return; Store.set('decisions', Store.id(), { title: ti.value.trim(), why: dt.value.trim(), by: me.uid, nm: me.name, closed: null, t: Date.now() }); ti.value = dt.value = ''; } }), list);
  const reasons = {};
  return () => { const act = document.activeElement; if (act && act.dataset && act.dataset.why) return;      // do not rebuild while someone is typing a reason
    const ds = [...Store.col('decisions')].filter(([, x]) => x).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)).slice(0, 20);
    list.replaceChildren(...(ds.length ? ds.map(([id, x]) => { const t = tally(id), wy = el('input', { type: 'text', maxLength: 140, placeholder: 'Your reason (optional)', 'aria-label': 'Reason', 'data-why': id, value: reasons[id] || '', oninput: e => { reasons[id] = e.target.value; } });
      const vote = v => Store.set('votes', id + '_' + me.uid, { d: id, v, why: (reasons[id] || '').trim(), by: me.uid, nm: me.name, t: Date.now() });
      return el('div', { class: 'card' }, el('b', { class: 'big', text: str(x.title, 120) }), x.why ? el('span', { text: str(x.why, 600) }) : null, el('span', { class: 'meta', text: 'From ' + nameOf(x.by, x.nm) + ' · ' + new Date(num(x.t, 0)).toLocaleDateString() + (x.closed ? ' · closed as ' + (x.closed === 'go' ? 'GO' : 'NO-GO') : '') }),
        el('div', { class: 'tally' }, el('div', { class: 'go', text: 'GO  ' + t.go }), el('div', { class: 'nogo', text: 'NO-GO  ' + t.no })), ...t.why.slice(0, 8).map(s => el('span', { class: 'meta', text: s })),
        x.closed ? null : el('div', { class: 'field' }, wy), x.closed ? null : el('div', { class: 'row' }, el('button', { class: 'btn go', text: t.mine === 'go' ? 'You voted GO' : 'Vote GO', onclick: () => vote('go') }), el('button', { class: 'btn nogo', text: t.mine === 'no' ? 'You voted NO-GO' : 'Vote NO-GO', onclick: () => vote('no') }),
          (x.by === me.uid || net.admin) ? el('button', { class: 'btn ghost', text: 'Close with the majority', onclick: () => Store.set('decisions', id, Object.assign({}, x, { closed: t.go > t.no ? 'go' : 'no' })) }) : null),
        (x.by === me.uid || net.admin) ? el('div', { class: 'row' }, x.closed ? el('button', { class: 'btn sm ghost', text: 'Reopen', onclick: () => Store.set('decisions', id, Object.assign({}, x, { closed: null })) }) : null, el('button', { class: 'btn sm ghost', text: 'Delete', onclick: () => Store.del('decisions', id) })) : null); }) : [el('p', { text: 'Nothing to decide yet.' })])); };
};

/* ============================ kanban ============================ */
const KCOLS = ['Backlog', 'To do', 'Doing', 'Done'];
function cardsBy() { const cols = [[], [], [], []]; for (const [id, c] of Store.col('cards')) if (c) cols[clamp(Math.round(num(c.col, 0)), 0, 3)].push([id, c]); cols.forEach(l => l.sort((a, b) => num(a[1].ord, 0) - num(b[1].ord, 0))); return cols; }
function drawKanban() {
  const d = W.dyn.board_b; if (!d) return; const cols = cardsBy();
  d.draw((c, w, h) => { c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, w, h); c.textBaseline = 'top'; const cw = (w - 50) / 4;
    cols.forEach((list, i) => { const x = 20 + i * (cw + 4); c.fillStyle = 'rgba(20,32,46,.06)'; rr(c, x, 16, cw - 8, h - 32, 16); c.fill(); c.fillStyle = '#14202e'; c.font = '700 28px ' + FONT_D; c.fillText(KCOLS[i] + '  ' + list.length, x + 14, 28);
      list.slice(0, 5).forEach(([, k], j) => { const y = 74 + j * 70; c.fillStyle = '#fff'; rr(c, x + 10, y, cw - 28, 60, 10); c.fill(); c.fillStyle = HOOD_COL[i * 2 % 8]; c.fillRect(x + 10, y, 6, 60); c.fillStyle = '#14202e'; c.font = '600 18px ' + FONT_B; wrapText(c, str(k.text, 90), cw - 56, 2).forEach((l, n) => c.fillText(l, x + 24, y + 9 + n * 22)); }); }); });
}
panels.kanban = b => {
  const tx = el('input', { id: 'kTx', type: 'text', maxLength: 140, placeholder: 'New card, then Enter' }), who = el('input', { id: 'kWho', type: 'text', maxLength: 40, placeholder: 'Owner (optional)' }), wrap = el('div', { class: 'kan' });
  const add = () => { const t = tx.value.trim(); if (!t) return; Store.set('cards', Store.id(), { col: 0, text: t, who: who.value.trim(), by: me.uid, nm: me.name, ord: Date.now(), t: Date.now() }); tx.value = ''; };
  tx.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  b.append(el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:2;min-width:180px' }, tx), el('div', { class: 'field', style: 'flex:1;min-width:120px' }, who), el('button', { class: 'btn', text: 'Add card', onclick: add })), wrap, el('p', { text: 'Drag a card to another column, or use the arrows. The board on the studio wall updates for everyone.' }));
  const colEls = KCOLS.map((n, i) => { const e = el('div', { class: 'kcol', 'data-col': i }); wrap.append(e); return e; }); let dragging = false;
  const move = (id, k, col) => Store.set('cards', id, Object.assign({}, k, { col: clamp(col, 0, 3), ord: Date.now() }));
  return () => { if (dragging) return; const cols = cardsBy();
    colEls.forEach((ce, i) => ce.replaceChildren(el('h3', {}, el('span', { text: KCOLS[i] }), el('span', { text: String(cols[i].length) })), ...cols[i].map(([id, k]) => { const card = el('div', { class: 'kcard', style: 'border-left-color:' + HOOD_COL[i * 2 % 8] }, el('span', { text: str(k.text, 140) }), el('footer', {}, el('span', { text: str(k.who, 40) || nameOf(k.by, k.nm) }), i > 0 ? el('button', { text: '◀', title: 'Move left', onclick: () => move(id, k, i - 1) }) : null, i < 3 ? el('button', { text: '▶', title: 'Move right', onclick: () => move(id, k, i + 1) }) : null, el('button', { text: '×', title: 'Delete card', onclick: () => Store.del('cards', id) })));
      card.addEventListener('pointerdown', ev => { if (ev.target.tagName === 'BUTTON') return; card.setPointerCapture(ev.pointerId); dragging = true; const sx = ev.clientX, sy = ev.clientY; card.style.zIndex = 5; card.style.position = 'relative';
        const mv = m => { card.style.transform = 'translate(' + (m.clientX - sx) + 'px,' + (m.clientY - sy) + 'px) rotate(2deg)'; colEls.forEach(c2 => { const r = c2.getBoundingClientRect(); c2.classList.toggle('over', m.clientX >= r.left && m.clientX <= r.right); }); };
        const up = m => { card.removeEventListener('pointermove', mv); card.removeEventListener('pointerup', up); card.removeEventListener('pointercancel', up); dragging = false; card.style.transform = ''; let to = i; colEls.forEach((c2, n) => { const r = c2.getBoundingClientRect(); if (m.clientX >= r.left && m.clientX <= r.right) to = n; c2.classList.remove('over'); }); if (to !== i) move(id, k, to); else refreshPanel('kanban'); };
        card.addEventListener('pointermove', mv); card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up); });
      return card; }))); };
};

/* ============================ whiteboard: notes, pen, stickers ============================ */
const STICKERS = ['🚀', '⭐', '🔥', '💡', '✅', '❓', '❤️', '🎯', '⚠️', '🎉'], INK = ['#14202e', '#2456ff', '#d6453d', '#1f9d6b'];
const stickyOf = board => notesOf(board).filter(([, n]) => !n.k);
function drawBoards() {
  const d = W.dyn.board_a; if (!d) return; const all = notesOf('studio-a'), ns = all.filter(([, n]) => !n.k);
  d.draw((c, w, h) => { c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(20,32,46,.1)'; for (let y = 24; y < h; y += 32) for (let x = 24; x < w; x += 32) c.fillRect(x, y, 3, 3);
    c.lineCap = 'round'; c.lineJoin = 'round'; for (const [, n] of all) if (n.k === 'ink' && Array.isArray(n.p)) { c.strokeStyle = INK[clamp(num(n.c, 0), 0, 3)]; c.lineWidth = 5; c.beginPath(); for (let i = 0; i + 1 < n.p.length; i += 2) { const x = num(n.p[i], 0) * w, y = num(n.p[i + 1], 0) * h; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.textBaseline = 'top'; if (!all.length) { c.fillStyle = '#4a5a6c'; c.font = '600 28px ' + FONT_B; c.fillText('Empty whiteboard. Walk up to write, draw or add stickers.', 30, 28); }
    for (const [, n] of ns) { const x = clamp(num(n.x, .5), 0, 1) * (w - 180), y = clamp(num(n.y, .5), 0, 1) * (h - 118); c.fillStyle = NOTE_COL[clamp(num(n.c, 0), 0, 4)]; c.shadowColor = 'rgba(0,0,0,.2)'; c.shadowBlur = 8; c.fillRect(x, y, 170, 108); c.shadowBlur = 0; c.fillStyle = '#14202e'; c.font = '600 19px ' + FONT_B; wrapText(c, str(n.text, 160), 154, 4).forEach((l, i) => c.fillText(l, x + 8, y + 8 + i * 23)); }
    c.font = '64px serif'; for (const [, n] of all) if (n.k === 'st') c.fillText(str(n.e, 8), clamp(num(n.x, .5), 0, 1) * (w - 70), clamp(num(n.y, .5), 0, 1) * (h - 70)); });
}
actions.board = (id, title) => {
  openDrawer('notes:' + id, title, true, b => {
    let col = 0, tool = 0, ink = 0; const tx = el('input', { id: 'fNote', type: 'text', maxLength: 160, placeholder: 'Write an idea and press Enter' }), area = el('div', { class: 'board' }), cv = el('canvas'), els = new Map(); let dragging = null; area.append(cv);
    const add = () => { const t = tx.value.trim(); if (!t) return; Store.set('notes', Store.id(), { board: id, text: t, c: col, x: 0.08 + Math.random() * 0.7, y: 0.08 + Math.random() * 0.6, by: me.uid, nm: me.name, v: [], t: Date.now() }); tx.value = ''; };
    tx.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    const stk = el('div', { class: 'chips' }, ...STICKERS.map(s => el('button', { type: 'button', text: s, title: 'Add sticker', style: 'font-size:18px', onclick: () => Store.set('notes', Store.id(), { board: id, k: 'st', e: s, x: 0.1 + Math.random() * 0.75, y: 0.1 + Math.random() * 0.7, by: me.uid, t: Date.now() }) })));
    b.append(el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:200px' }, tx), swatches('Note colour', NOTE_COL, () => col, v => { col = v; }), el('button', { class: 'btn', text: 'Add note', onclick: add }), el('button', { class: 'btn ghost', text: '🖼 Add picture', onclick: async () => { const d = await pickImage(900, 90000); if (d) Store.set('notes', Store.id(), { board: id, k: 'img', im: d, x: 0.1 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.5, by: me.uid, nm: me.name, t: Date.now() }); } }), ...dusterBtns(id)),
      el('div', { class: 'row' }, chips('Tool', ['Move notes', 'Pen'], () => tool, v => { tool = v; area.classList.toggle('pen', v === 1); }), swatches('Pen colour', INK, () => ink, v => { ink = v; }), el('button', { class: 'btn sm ghost', text: 'Undo my last stroke', onclick: () => { const mine = notesOf(id).filter(([, n]) => n.k === 'ink' && n.by === me.uid).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0))[0]; if (mine) Store.del('notes', mine[0]); } }), el('button', { class: 'btn sm ghost', text: 'Wipe drawing', onclick: () => { for (const [nid, n] of notesOf(id)) if (n.k === 'ink') Store.del('notes', nid); } })),
      el('div', { class: 'field' }, el('span', { class: 'lbl', text: 'Stickers' }), stk), area, el('p', { text: 'Drag notes and stickers to arrange them. Switch to Pen to write or sketch straight on the board. Everyone sees it live, and it shows on the board in the room.' }));
    let live = null; const paint = () => { const r = area.getBoundingClientRect(); if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.max(1, Math.round(r.width)); cv.height = Math.max(1, Math.round(r.height)); } const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 3;
      const stroke = (p, ci) => { c.strokeStyle = INK[clamp(num(ci, 0), 0, 3)]; c.beginPath(); for (let i = 0; i + 1 < p.length; i += 2) { const x = num(p[i], 0) * cv.width, y = num(p[i + 1], 0) * cv.height; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); };
      for (const [, n] of notesOf(id)) if (n.k === 'ink' && Array.isArray(n.p)) stroke(n.p, n.c); if (live) stroke(live, ink); };
    area.addEventListener('pointerdown', ev => { if (tool !== 1) return; area.setPointerCapture(ev.pointerId); const r = area.getBoundingClientRect(), pt = m => [+((m.clientX - r.left) / r.width).toFixed(3), +((m.clientY - r.top) / r.height).toFixed(3)]; live = pt(ev);
      const mv = m => { const p = pt(m), n = live.length; if (Math.hypot(p[0] - live[n - 2], p[1] - live[n - 1]) > 0.006 && n < 600) { live.push(p[0], p[1]); paint(); } };
      const up = () => { area.removeEventListener('pointermove', mv); area.removeEventListener('pointerup', up); area.removeEventListener('pointercancel', up); if (live && live.length >= 4) Store.set('notes', Store.id(), { board: id, k: 'ink', p: live, c: ink, by: me.uid, t: Date.now() }); live = null; paint(); };
      area.addEventListener('pointermove', mv); area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up); });
    const drag = (e, nid, w, h) => e.addEventListener('pointerdown', ev => { if (ev.target.tagName === 'BUTTON' || tool === 1) return; e.setPointerCapture(ev.pointerId); dragging = nid; e.classList.add('drag'); const r = area.getBoundingClientRect(), ox = ev.clientX - e.offsetLeft, oy = ev.clientY - e.offsetTop;
      const mv = m => { e.style.left = clamp(m.clientX - ox, 0, r.width - w) + 'px'; e.style.top = clamp(m.clientY - oy, 0, r.height - h) + 'px'; };
      const upf = () => { e.removeEventListener('pointermove', mv); e.removeEventListener('pointerup', upf); e.removeEventListener('pointercancel', upf); e.classList.remove('drag'); dragging = null; const cur = Store.col('notes').get(nid); if (cur) Store.set('notes', nid, Object.assign({}, cur, { x: e.offsetLeft / Math.max(1, r.width - w), y: e.offsetTop / Math.max(1, r.height - h) })); };
      e.addEventListener('pointermove', mv); e.addEventListener('pointerup', upf); e.addEventListener('pointercancel', upf); });
    return () => {
      const ns = notesOf(id), keep = new Set(); paint();
      for (const [nid, n] of ns) { if (n.k === 'ink') continue; keep.add(nid); if (dragging === nid) continue; let e = els.get(nid); const st = n.k === 'st', im = n.k === 'img', w = st ? 48 : im ? 200 : 150, h = st ? 48 : im ? 150 : 92;
        if (!e) { e = el('div', { class: st || im ? 'stk' : 'note' }); els.set(nid, e); area.append(e); drag(e, nid, w, h); if (st) e.addEventListener('dblclick', () => Store.del('notes', nid)); }
        e.style.left = 'calc((100% - ' + w + 'px) * ' + clamp(num(n.x, .5), 0, 1) + ')'; e.style.top = 'calc((100% - ' + h + 'px) * ' + clamp(num(n.y, .5), 0, 1) + ')';
        if (im) { e.style.cssText += ';width:200px;height:150px;padding:0;background:#fff;overflow:hidden;font-size:0'; if (!e.firstChild) e.replaceChildren(el('img', { src: /^data:image\//.test(n.im || '') ? n.im : '', alt: 'Picture by ' + str(n.nm, 30), draggable: false, style: 'width:100%;height:100%;object-fit:cover' }), el('button', { text: '×', title: 'Delete picture', style: 'position:absolute;top:2px;right:2px;font-size:16px;font-weight:700;background:#fff;border-radius:50%;width:24px;height:24px', onclick: () => Store.del('notes', nid) })); continue; }
        if (st) { e.textContent = str(n.e, 8); e.title = 'Drag to move, double-click to remove'; continue; }
        const votes = Array.isArray(n.v) ? n.v.filter(x => typeof x === 'string') : []; e.style.background = NOTE_COL[clamp(num(n.c, 0), 0, 4)];
        e.replaceChildren(el('span', { text: str(n.text, 160) }), el('footer', {}, el('span', { text: nameOf(n.by, n.nm) }), el('button', { text: '👍 ' + votes.length, title: 'Vote', onclick: () => { const cur = Store.col('notes').get(nid); if (!cur) return; const v = votes.includes(me.uid) ? votes.filter(x => x !== me.uid) : votes.concat(me.uid); Store.set('notes', nid, Object.assign({}, cur, { v })); } }), el('button', { text: '×', title: 'Delete note', onclick: () => Store.del('notes', nid) }))); }
      for (const [nid, e] of els) if (!keep.has(nid)) { e.remove(); els.delete(nid); }
      const hint = area.querySelector('.hint'); if (!ns.length && !hint) area.append(el('div', { class: 'hint', text: 'Empty board. Add a note, pick up the pen or drop a sticker.' })); else if (ns.length && hint) hint.remove();
    };
  });
  refreshPanel();
};

/* ============================ games: table tennis and pool, played for real ============================ */
const here = p => p && typeof p.uid === 'string' && (p.uid === me.uid || [...peers.values()].some(q => q.uid === p.uid)) ? { uid: p.uid, nm: str(p.nm, 40) } : null;
const peerOf = uid => [...peers.values()].find(q => q.uid === uid) || null;
function rayPlane(cx, cy, y) { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const pl = new T.Plane(new T.Vector3(0, 1, 0), -y), v = new T.Vector3(); return ray.ray.intersectPlane(pl, v) ? v : null; }
const LOCAL = { tt: null, pool: null, chess: null };   // when a table is busy you get your own private practice game: nobody is ever kicked off
function enterGame(g, side) {
  if (me.seat) stand(); me.path = null; me.pending = null; me.game = g; me.side = side; closeDrawer(); if (cam.fp) toggleView();
  if (g === 'tt') { me.pos.x = TT.x + (side === 'a' ? -1.78 : 1.78) * (me.local ? 1.5 : 1); me.pos.z = TT.z; me.ry = side === 'a' ? PI / 2 : -PI / 2; cam.yaw = me.ry; cam.pitch = 0.5; cam.dist = 5.4; TT.pw = 0; }
  else { me.pos.x = PL.x; me.pos.z = PL.z + (side === 'a' ? 1.2 : -1.2) * (me.local ? 1.9 : 1); me.ry = side === 'a' ? PI : 0; cam.yaw = me.ry; cam.pitch = 1.12; cam.dist = 4.4; }
  TT.joinT = PL.joinT = performance.now() + 2000; $('#gamebar').style.display = 'flex';
}
function leaveGame() {
  if (!me.game) return; const g = me.game, side = me.side, lc = me.local; me.local = null; LOCAL[g] = null; me.game = null; me.side = null; me.tb = null; me.pb = null; PL.sim = null; $('#gamebar').style.display = 'none';
  if (lc) { } else if (g === 'tt') { const d = ttDoc(); if (d[side] && d[side].uid === me.uid) { d[side] = null; ttPut(d); } } else { const d = poolDoc(); if (d[side] && d[side].uid === me.uid) { d[side] = null; if (d.turn === side) d.turn = side === 'a' ? 'b' : 'a'; poolPut(d); } }
  const f = nearestFree(me.pos.x, me.pos.z); me.pos.x = f.x; me.pos.z = f.z; cam.pitch = 0.4; cam.dist = 10;
}
$('#gameLeave').onclick = leaveGame;
$('#gameAlt').onclick = () => { if (me.game === 'pool') { const d = poolDoc(); d.balls = poolRack(); d.turn = 'a'; d.ga = null; d.win = null; PL.sim = null; poolPut(d); } else if (me.game === 'tt') { const d = ttDoc(); d.sa = d.sb = 0; ttPut(d); ttServe(1); } };

/* table tennis: the player at the red end runs the ball; both ends steer with the mouse or A/D */
const TT = { x: 4.6, z: 11.6, hl: 1.37, hw: 0.68, u: 0, w: 0, vu: 0, vw: 0, serveT: 0, ai: 0, pw: 0, tgt: null, lastDir: 0 };
function ttDoc() { if (me.local === 'tt' && LOCAL.tt) return LOCAL.tt; const g = Store.col('games').get('tt') || {}; return { a: here(g.a), b: here(g.b), sa: clamp(num(g.sa, 0), 0, 99), sb: clamp(num(g.sb, 0), 0, 99) }; }
function ttPut(d) { if (me.local === 'tt') { LOCAL.tt = d; return; } Store.set('games', 'tt', { a: d.a, b: d.b, sa: d.sa, sb: d.sb, t: Date.now() }); }
function ttServe(dir) { TT.u = 0; TT.w = 0; TT.vu = dir * 2.3; TT.vw = (Math.random() - 0.5) * 1.4; TT.serveT = performance.now() + 900; }
actions.tt = () => {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.game) leaveGame(); const d = ttDoc(), side = !d.a ? 'a' : !d.b ? 'b' : null;
  if (!side) { me.local = 'tt'; LOCAL.tt = { a: { uid: me.uid, nm: me.name }, b: null, sa: 0, sb: 0 }; ttServe(1); enterGame('tt', 'a'); toast('That table is in use, so you have your own practice game beside it. Nobody is interrupted. Move with the mouse or A and D.'); return; }
  d[side] = { uid: me.uid, nm: me.name }; if (side === 'a') { d.sa = d.sb = 0; ttServe(1); } ttPut(d); enterGame('tt', side);
  toast(side === 'a' && !d.b ? 'Solo practice until someone takes the blue end. Move with the mouse or A and D.' : 'Game on. Move with the mouse or A and D. First to 7.');
};
function ttFrame(dt, now) {
  const d = ttDoc(), pads = W.dyn.pads, ball = W.dyn.ball; if (!pads) return;
  if (me.game === 'tt') {                                     // steer: mouse target or keys; the avatar side-steps with the paddle
    const sgn = me.side === 'a' ? 1 : -1, kx = ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0);
    if (kx) { TT.pw += kx * sgn * 2.2 * dt; TT.tgt = null; } else if (TT.tgt != null) TT.pw += clamp(TT.tgt - TT.pw, -3.2 * dt, 3.2 * dt);
    TT.pw = clamp(TT.pw, -0.66, 0.66); const nz = TT.z + TT.pw; me.moving = Math.abs(nz - me.pos.z) > 0.004; me.pos.z = nz;
    if (me.side === 'b' && !d.a && d.b && d.b.uid === me.uid) { d.a = d.b; d.b = null; d.sa = d.sb = 0; ttPut(d); enterGame('tt', 'a'); ttServe(1); }
    if (!d[me.side] || d[me.side].uid !== me.uid) { if (now - (TT.joinT || 0) > 3000) { me.game = null; $('#gamebar').style.display = 'none'; } } else TT.joinT = now;
  }
  const pw = s => { const p = d[s]; if (!p) return null; if (p.uid === me.uid) return me.pos.z - TT.z; const q = peerOf(p.uid); return q ? q.z - TT.z : null; };
  let wa = pw('a'), wb = pw('b'); const host = me.game === 'tt' && me.side === 'a';
  if (host) {
    if (wb === null) { TT.ai += clamp(TT.w - TT.ai, -1.25 * dt, 1.25 * dt); wb = TT.ai; }
    if (now > TT.serveT) {
      TT.u += TT.vu * dt; TT.w += TT.vw * dt; if (Math.abs(TT.w) > TT.hw) { TT.w = Math.sign(TT.w) * TT.hw; TT.vw *= -1; }
      const hit = (wp, dir) => { if (Math.abs(TT.w - wp) < 0.25) { TT.vu = dir * Math.min(5.5, Math.abs(TT.vu) * 1.06); TT.vw = clamp(TT.vw + (TT.w - wp) * 6, -3, 3); return true; } return false; };
      if (TT.vu > 0 && TT.u > TT.hl - 0.04) { if (TT.u < TT.hl + 0.12 && hit(wb, -1)) { } else if (TT.u > TT.hl + 0.3) { d.sa++; ttPoint(d, 1); } }
      if (TT.vu < 0 && TT.u < -(TT.hl - 0.04)) { if (TT.u > -(TT.hl + 0.12) && hit(wa, 1)) doLocalEmote('play'); else if (TT.u < -(TT.hl + 0.3)) { d.sb++; ttPoint(d, -1); } }
    }
    me.tb = me.local ? null : [+TT.u.toFixed(2), +TT.w.toFixed(2), +TT.vu.toFixed(1), +TT.vw.toFixed(1)];
  } else { const hp = d.a ? peerOf(d.a.uid) : null, tb = hp && hp.tb; if (tb) { TT.vu = tb[2]; TT.vw = tb[3]; TT.u += (tb[0] - TT.u) * Math.min(1, dt * 18) + TT.vu * dt * 0.5; TT.w += (tb[1] - TT.w) * Math.min(1, dt * 18); } else TT.vu = 0; if (wb === null && tb) wb = clamp(TT.w, -0.66, 0.66); me.tb = null;
    if (me.game === 'tt' && me.side === 'b' && TT.vu > 0 && TT.u > TT.hl - 0.15 && Math.abs(TT.w - (wb || 0)) < 0.25) doLocalEmote('play'); }
  const dir = Math.sign(TT.vu); if (dir && TT.lastDir && dir !== TT.lastDir && Math.hypot(me.pos.x - TT.x, me.pos.z - TT.z) < 9) sfx('tick'); if (dir) TT.lastDir = dir;
  const on = !!d.a; ball.visible = on || performance.now() < fx.ball; if (on) ball.position.set(TT.x + clamp(TT.u, -1.7, 1.7), 0.8 + Math.abs(Math.cos(TT.u * 2.3)) * 0.17, TT.z + TT.w);
  pads[0].visible = wa !== null; pads[1].visible = on && wb !== null; if (wa !== null) pads[0].position.z = TT.z + wa; if (wb !== null) pads[1].position.z = TT.z + wb;
}
function ttPoint(d, dir) { sfx('point'); if (d.sa >= 7 || d.sb >= 7) { toast((d.sa > d.sb ? (d.a ? nameOf(d.a.uid, d.a.nm) : 'Red') : (d.b ? nameOf(d.b.uid, d.b.nm) : 'The practice wall')) + ' wins ' + Math.max(d.sa, d.sb) + ' to ' + Math.min(d.sa, d.sb) + '.'); d.sa = d.sb = 0; } ttPut(d); ttServe(dir); }

/* pool: turn-based 8-ball. The shooter's browser runs the physics and streams ball positions to everyone watching. */
const PL = { x: 8.6, z: 8.6, hl: 1.12, hw: 0.56, r: 0.0286, sim: null, aim: null, shown: null };
const POCK = [[-1.12, -0.56], [0, -0.6], [1.12, -0.56], [-1.12, 0.56], [0, 0.6], [1.12, 0.56]];
function poolRack() { const b = new Array(32).fill(0); b[0] = -0.56; b[1] = 0; const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]; let k = 0; for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) { const n = order[k++]; b[n * 2] = 0.42 + row * PL.r * 1.78; b[n * 2 + 1] = (i - row / 2) * PL.r * 2.06; } return b; }
function poolDoc() { if (me.local === 'pool' && LOCAL.pool) return LOCAL.pool; const g = Store.col('games').get('pool') || {}; return { a: here(g.a), b: here(g.b), turn: g.turn === 'b' ? 'b' : 'a', balls: Array.isArray(g.balls) && g.balls.length === 32 ? g.balls.map(v => num(v, 99)) : poolRack(), ga: g.ga === 's' || g.ga === 't' ? g.ga : null, win: g.win === 'a' || g.win === 'b' ? g.win : null }; }
function poolPut(d) { if (me.local === 'pool') { LOCAL.pool = d; return; } Store.set('games', 'pool', { a: d.a, b: d.b, turn: d.turn, balls: d.balls.map(v => +v.toFixed(3)), ga: d.ga, win: d.win, t: Date.now() }); }
actions.pool = () => {
  if (!conf.games) { toast('Games are switched off by your admin.'); return; } if (me.game) leaveGame(); const d = poolDoc(), side = !d.a ? 'a' : !d.b ? 'b' : null;
  if (!side) { me.local = 'pool'; LOCAL.pool = { a: { uid: me.uid, nm: me.name }, b: null, turn: 'a', balls: poolRack(), ga: null, win: null }; enterGame('pool', 'a'); toast('That table is in use, so you have your own practice frame beside it. Nobody is interrupted.'); return; }
  d[side] = { uid: me.uid, nm: me.name }; if (!d.a || !d.b) { if (side === 'a') { d.balls = poolRack(); d.turn = 'a'; d.ga = null; d.win = null; } } poolPut(d); enterGame('pool', side);
  toast('Aim with the mouse: the further you point from the cue ball, the harder the shot. Click to shoot.');
};
const myShot = d => me.game === 'pool' && !PL.sim && !d.win && d[d.turn] && d[d.turn].uid === me.uid;
function poolAim(cx, cy) { const v = rayPlane(cx, cy, 0.83); PL.aim = v ? { u: v.x - PL.x, w: v.z - PL.z } : null; }
function poolShoot() {
  const d = poolDoc(); if (!myShot(d) || !PL.aim || d.balls[0] > 50) return; const dx = PL.aim.u - d.balls[0], dz = PL.aim.w - d.balls[1], l = Math.hypot(dx, dz); if (l < 0.05) return;
  const sp = clamp(l, 0.12, 1.3) * 4.2, v = new Float32Array(32); v[0] = dx / l * sp; v[1] = dz / l * sp; PL.sim = { b: Float32Array.from(d.balls), v, potted: [], side: d.turn, d }; sfx('clack'); doLocalEmote('play');
}
function poolStep(s, h) {
  const b = s.b, v = s.v, r = PL.r; let moving = false, clack = false;
  for (let i = 0; i < 16; i++) { if (b[i * 2] > 50) continue; let vx = v[i * 2], vz = v[i * 2 + 1], sp = Math.hypot(vx, vz); if (sp < 0.015) { v[i * 2] = v[i * 2 + 1] = 0; continue; } moving = true; const ns = Math.max(0, sp - 0.85 * h); vx *= ns / sp; vz *= ns / sp; b[i * 2] += vx * h; b[i * 2 + 1] += vz * h;
    for (const p of POCK) if (Math.hypot(b[i * 2] - p[0], b[i * 2 + 1] - p[1]) < 0.078) { b[i * 2] = 99; b[i * 2 + 1] = 0; vx = vz = 0; s.potted.push(i); sfx('pot'); break; }
    if (b[i * 2] < 50) { if (b[i * 2] > PL.hl - r) { b[i * 2] = PL.hl - r; vx = -Math.abs(vx) * 0.78; } if (b[i * 2] < -(PL.hl - r)) { b[i * 2] = -(PL.hl - r); vx = Math.abs(vx) * 0.78; } if (b[i * 2 + 1] > PL.hw - r) { b[i * 2 + 1] = PL.hw - r; vz = -Math.abs(vz) * 0.78; } if (b[i * 2 + 1] < -(PL.hw - r)) { b[i * 2 + 1] = -(PL.hw - r); vz = Math.abs(vz) * 0.78; } }
    v[i * 2] = vx; v[i * 2 + 1] = vz; }
  for (let i = 0; i < 16; i++) { if (b[i * 2] > 50) continue; for (let j = i + 1; j < 16; j++) { if (b[j * 2] > 50) continue; const dx = b[j * 2] - b[i * 2], dz = b[j * 2 + 1] - b[i * 2 + 1], dd = dx * dx + dz * dz; if (dd >= 4 * r * r || dd < 1e-9) continue; const dist = Math.sqrt(dd), nx = dx / dist, nz = dz / dist, ov = (2 * r - dist) / 2; b[i * 2] -= nx * ov; b[i * 2 + 1] -= nz * ov; b[j * 2] += nx * ov; b[j * 2 + 1] += nz * ov;
      const rel = (v[i * 2] - v[j * 2]) * nx + (v[i * 2 + 1] - v[j * 2 + 1]) * nz; if (rel > 0) { v[i * 2] -= rel * nx * 0.97; v[i * 2 + 1] -= rel * nz * 0.97; v[j * 2] += rel * nx * 0.97; v[j * 2 + 1] += rel * nz * 0.97; if (rel > 0.25) clack = true; } } }
  if (clack && (!s.ck || performance.now() - s.ck > 70)) { s.ck = performance.now(); sfx('clack'); }
  return moving;
}
function poolResolve(s) {
  const d = s.d, side = s.side, other = side === 'a' ? 'b' : 'a', grp = n => (n < 8 ? 's' : 't'), balls = Array.from(s.b), foul = s.potted.includes(0);
  const mine = () => (side === 'a' ? d.ga : d.ga ? (d.ga === 's' ? 't' : 's') : null); let keep = false;
  if (s.potted.includes(8)) { const my = mine(); let left = 0; for (let n = 1; n < 16; n++) if (n !== 8 && my && grp(n) === my && balls[n * 2] < 50) left++; d.win = !foul && my && left === 0 ? side : (d[other] ? other : side); toast(d.win === side ? 'Black ball down. Frame won!' : 'The black went down early. Frame lost.'); }
  else { const obj = s.potted.filter(n => n !== 0); if (!d.ga && obj.length) { const g0 = grp(obj[0]); d.ga = side === 'a' ? g0 : (g0 === 's' ? 't' : 's'); } const my = mine(); keep = !foul && obj.some(n => !my || grp(n) === my); }
  if (foul) { balls[0] = -0.56; balls[1] = 0; for (let n = 1; n < 16; n++) if (Math.hypot(balls[n * 2] + 0.56, balls[n * 2 + 1]) < PL.r * 2.1) balls[1] += PL.r * 2.3; toast('Cue ball potted: foul.'); }
  if (!keep && d[other]) d.turn = other; d.balls = balls; poolPut(d);
}
function poolFrame(dt) {
  const P = W.dyn.pool; if (!P) return; const d = poolDoc(); let show = d.balls;
  if (PL.sim) { let mv = false; const n = Math.max(1, Math.round(dt / 0.004)); for (let i = 0; i < n; i++) mv = poolStep(PL.sim, dt / n) || mv; show = PL.sim.b; me.pb = me.local ? null : Array.from(PL.sim.b, x => +x.toFixed(3)); if (!mv) { const s = PL.sim; PL.sim = null; me.pb = null; poolResolve(s); show = s.b; PL.hold = { b: s.b, until: performance.now() + 1500 }; } }
  else { me.pb = null; const sh = d[d.turn] ? peerOf(d[d.turn].uid) : null; if (sh && sh.pb) show = sh.pb; else if (PL.hold && performance.now() < PL.hold.until) show = PL.hold.b; }
  if (me.game === 'pool' && (!d[me.side] || d[me.side].uid !== me.uid)) { if (performance.now() - (PL.joinT || 0) > 3000) { me.game = null; $('#gamebar').style.display = 'none'; } } else PL.joinT = performance.now();
  for (let i = 0; i < 16; i++) { const g = P.balls[i], u = show[i * 2], w = show[i * 2 + 1]; g.visible = u < 50; if (g.visible) { const ox = g.position.x, oz = g.position.z; g.position.set(PL.x + u, 0.829, PL.z + w); const mx = g.position.x - ox, mz = g.position.z - oz; if (Math.abs(mx) + Math.abs(mz) < 0.3) { g.rotation.z -= mx / PL.r; g.rotation.x += mz / PL.r; } } }
  const can = myShot(d) && PL.aim && show[0] < 50; P.aim.visible = P.cue.visible = !!can;
  if (can) { const dx = PL.aim.u - show[0], dz = PL.aim.w - show[1], l = Math.max(0.05, Math.hypot(dx, dz)), len = clamp(l, 0.12, 1.3), a = Math.atan2(dz, dx); P.aim.scale.x = len; P.aim.position.set(PL.x + show[0] + Math.cos(a) * len / 2, 0.832, PL.z + show[1] + Math.sin(a) * len / 2); P.aim.rotation.y = -a;
    P.cue.position.set(PL.x + show[0] - Math.cos(a) * (0.78 + len * 0.12), 0.87, PL.z + show[1] - Math.sin(a) * (0.78 + len * 0.12)); P.cue.rotation.set(0, -a, -(PI / 2 - 0.04)); me.ry = Math.atan2(dx, dz); }
}
function gameAim(cx, cy) { if (me.game === 'pool') poolAim(cx, cy); else if (me.game === 'tt') { const v = rayPlane(cx, cy, 0.8); if (v) TT.tgt = clamp(v.z - TT.z, -0.66, 0.66); } }
function gameClick(cx, cy) { if (!me.game) return false; gameAim(cx, cy); if (me.game === 'pool') poolShoot(); return true; }
function gameBar() {
  if (!me.game) return; const alt = $('#gameAlt');
  if (me.game === 'tt') { const d = ttDoc(); $('#gameTxt').textContent = 'Table tennis · ' + (d.a ? nameOf(d.a.uid, d.a.nm) : 'Red') + ' ' + d.sa + ' : ' + d.sb + ' ' + (d.b ? nameOf(d.b.uid, d.b.nm) : 'Practice wall'); alt.textContent = 'Restart'; alt.hidden = me.side !== 'a'; }
  else { const d = poolDoc(), my = me.side === 'a' ? d.ga : d.ga ? (d.ga === 's' ? 't' : 's') : null, turnMine = d[d.turn] && d[d.turn].uid === me.uid; $('#gameTxt').textContent = 'Pool · ' + (d.win ? (d[d.win] && d[d.win].uid === me.uid ? 'You won the frame' : 'Frame over') : turnMine ? 'Your shot' : (d[d.turn] ? nameOf(d[d.turn].uid, d[d.turn].nm) + ' to shoot' : 'Waiting')) + (my ? ' · you are ' + (my === 's' ? 'solids' : 'stripes') : ' · open table') + (d.b ? '' : ' · solo practice'); alt.textContent = 'Re-rack'; alt.hidden = false; }
}
function gameFrame(dt, now) {
  ttFrame(dt, now); poolFrame(dt);
  const bell = W.dyn.bell; if (bell) { const left = (fx.bell - now) / 1000; bell.rotation.x = left > 0 ? Math.sin(now / 55) * 0.6 * Math.min(1, left / 1.5) : 0; }
  const c = confetti; if (c.p.visible) { if (now > c.until) c.p.visible = false; else { for (let i = 0; i < c.N; i++) { c.vel[i * 3 + 1] -= 5.5 * dt; c.pos[i * 3] += c.vel[i * 3] * dt; c.pos[i * 3 + 1] = Math.max(0.03, c.pos[i * 3 + 1] + c.vel[i * 3 + 1] * dt); c.pos[i * 3 + 2] += c.vel[i * 3 + 2] * dt; if (c.pos[i * 3 + 1] <= 0.03) c.vel[i * 3] = c.vel[i * 3 + 2] = 0; } c.p.geometry.attributes.position.needsUpdate = true; c.p.material.opacity = Math.min(1, (c.until - now) / 800); } }
}

/* meeting rooms: start a Teams call with whoever is in the room */
function roomTeams(zid) { const ids = []; for (const r of allPeople()) if (r.online && !r.me && isEmail(r.teams) && r.key && peers.get(r.key) && peers.get(r.key).zid === zid) ids.push(r.teams); return ids; }

function initExtra() {
  Store.on('office', onOffice); Store.on('wins', onWins); Store.on('kudos', () => { drawWins(); refreshPanel('wins'); });
  Store.on('decisions', () => { drawDecide(); refreshPanel('decide'); }); Store.on('votes', () => { drawDecide(); refreshPanel('decide'); });
  Store.on('cards', () => { drawKanban(); refreshPanel('kanban'); }); Store.on('games', gameBar);
  Store.on('people', () => { stripSig = ''; for (const p of peers.values()) { const d = p.uid ? Store.col('people').get(p.uid) : null; p.av.setFace(d && d.face); } });
  Store.on('chat', m => { if (m.size > initExtra.chatN && initExtra.chatN >= 0 && document.hidden === false) { const last = [...m.values()].sort((a, b) => num(b.t, 0) - num(a.t, 0))[0]; if (last && last.by !== me.uid && Date.now() - num(last.t, 0) < 8000) sfx('msg'); } initExtra.chatN = m.size; });
  me.av.setFace(me.face); applyPrefs();
}
initExtra.chatN = -1;
function redrawExtra() { drawWins(); drawDecide(); drawKanban(); }
