/* ============================ v10: Zuchera Suites (Edu, Marketing, Sales, E-commerce, Law, Construction, Startup) ============================ */
const OFF = { thames: 1, shard: 1 };
Object.assign(PRESETS, {
  edu: { label: 'Zuchera Edu', icon: '🎓', note: 'Schools, universities, training academies', cols: ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#6d28d9'], hoods: ['Sciences', 'Humanities', 'Business', 'Computing', 'Arts', 'Languages', 'Health', 'Research'], floor: ['oak', 'tiles', 'cement'], z: { cafe: 'Student Café', lobby: 'Admissions & Reception', lounge: 'Library & Study Lounge', games: 'Common Room', brain: 'Seminar Studio', collab: 'Lecture Theatre', booth: 'Study Pods', thames: 'Classroom A', shard: 'Classroom B' }, games: true },
  marketing: { label: 'Marketing team', icon: '📣', note: 'Agencies, brand, content and growth teams', cols: ['#e11d48', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#3b82f6', '#ec4899'], hoods: ['Brand', 'Content', 'Social', 'Paid', 'SEO', 'Email', 'Events', 'Analytics'], floor: ['terrazzo', 'oak', 'cement'], z: { brain: 'Creative Studio', collab: 'Campaign War Room', lounge: 'Content Lounge', cafe: 'Coffee Bar' }, games: true },
  sales: { label: 'Sales team and business', icon: '💼', note: 'SDRs, account executives, partnerships, customer success', cols: ['#0f766e', '#1d4ed8', '#b45309', '#be123c', '#4d7c0f', '#7c3aed', '#0369a1', '#a16207'], hoods: ['Outbound', 'Inbound', 'Enterprise', 'Mid-market', 'Partners', 'Renewals', 'Success', 'Ops'], floor: ['oak', 'tiles', 'terrazzo'], z: { brain: 'Deal Room', collab: 'Pipeline Review', lounge: 'Client Lounge', cafe: 'Closers Café', booth: 'Call Booths' }, games: true },
  law: { label: 'Law firm', icon: '⚖️', note: 'Solicitors, barristers, in-house legal, compliance', cols: ['#1e3a5f', '#7f1d1d', '#365314', '#4c1d95', '#713f12', '#134e4a', '#334155', '#7c2d12'], hoods: ['Corporate', 'Litigation', 'Property', 'Employment', 'IP', 'Family', 'Tax', 'Compliance'], floor: ['oak', 'oak', 'tiles'], z: { lobby: 'Client Reception', brain: 'Case Strategy Room', collab: 'Boardroom', lounge: 'Library', cafe: 'Chambers Café', booth: 'Confidential Booths' }, games: false },
  construction: { label: 'Construction', icon: '🏗️', note: 'Contractors, architects, surveyors, site teams', cols: ['#d97706', '#475569', '#0f766e', '#b91c1c', '#65a30d', '#1d4ed8', '#a16207', '#7c3aed'], hoods: ['Estimating', 'Site Ops', 'Design', 'Safety', 'Procurement', 'Planning', 'Surveying', 'Handover'], floor: ['cement', 'cement', 'tiles'], z: { brain: 'Design Studio', collab: 'Site Briefing Room', lounge: 'Plan Room', cafe: 'Canteen', booth: 'Quiet Cabins' }, games: false }
});

/* each suite: what the office becomes, and the working boards it adds */
const SUITES = {
  edu: { icon: '🎓', name: 'Zuchera Edu', panel: 'edu', boards: [] },
  marketing: { icon: '📣', name: 'Zuchera Marketing', boards: [['Campaigns', ['Idea', 'Planned', 'Live', 'Reporting'], 'Budget £'], ['Content calendar', ['Draft', 'Review', 'Scheduled', 'Published'], '']] },
  sales: { icon: '💼', name: 'Zuchera Sales', boards: [['Pipeline', ['Lead', 'Contacted', 'Proposal', 'Won', 'Lost'], 'Deal £'], ['Accounts and renewals', ['Active', 'At risk', 'Renewal due', 'Renewed'], 'ARR £']] },
  ecommerce: { icon: '🛒', name: 'Zuchera Commerce', boards: [['Orders', ['New', 'Packed', 'Shipped', 'Returns'], 'Order £'], ['Products and stock', ['Idea', 'Sourcing', 'Live', 'Low stock'], 'Stock units']] },
  law: { icon: '⚖️', name: 'Zuchera Legal', boards: [['Matters', ['Intake', 'Active', 'Review', 'Closed'], 'Fee £'], ['Deadlines and filings', ['Upcoming', 'This week', 'Filed', 'Archived'], '']] },
  construction: { icon: '🏗️', name: 'Zuchera Build', boards: [['Sites and jobs', ['Planned', 'On site', 'Snagging', 'Handed over'], 'Value £'], ['Safety and RFIs', ['Open', 'In progress', 'Answered', 'Closed'], '']] },
  startup: { icon: '🚀', name: 'Zuchera Startup', boards: [['Roadmap', ['Now', 'Next', 'Later', 'Done'], ''], ['Goals (OKRs)', ['Objective', 'In progress', 'At risk', 'Achieved'], 'Progress %']] }
};
const curSuite = () => SUITES[conf.kind] || null;

/* ---- generic working board ---- */
function suiteBoard(b, sid, def) {
  const [title, cols, vl] = def, key = sid + ':' + title, box = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const draw = () => {
    const cards = [...Store.col('suite')].filter(([, c]) => c && c.k === key).sort((a, c) => num(a[1].t, 0) - num(c[1].t, 0)), cols_ = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    for (let i = 0; i < cols.length; i++) {
      const mine = cards.filter(([, c]) => num(c.col, 0) === i), tot = vl ? mine.reduce((s, [, c]) => s + num(c.v, 0), 0) : 0;
      cols_.append(el('div', { class: 'card' }, el('b', { text: cols[i] + ' · ' + mine.length + (vl && tot ? ' · ' + tot.toLocaleString() : '') }),
        ...mine.map(([id, c]) => el('div', { class: 'row', style: 'flex-direction:row;align-items:center;gap:6px;border-top:1px solid var(--line);padding-top:6px' }, el('span', { style: 'flex:1', text: str(c.text, 120) + (vl && c.v ? ' · ' + num(c.v, 0).toLocaleString() : '') + (c.nm ? ' · ' + str(c.nm, 30) : '') }),
          el('button', { class: 'btn sm ghost', 'aria-label': 'Move back', disabled: i === 0, text: '‹', onclick: () => Store.set('suite', id, Object.assign({}, c, { col: i - 1 })) }), el('button', { class: 'btn sm ghost', 'aria-label': 'Move forward', disabled: i === cols.length - 1, text: '›', onclick: () => Store.set('suite', id, Object.assign({}, c, { col: i + 1 })) }), el('button', { class: 'btn sm ghost', 'aria-label': 'Delete', text: '🗑', onclick: () => Store.del('suite', id) })))));
    }
    const t = el('input', { type: 'text', maxLength: 120, placeholder: 'Add to ' + cols[0] + '…', style: 'flex:1' }), v = vl ? el('input', { type: 'number', placeholder: vl, style: 'width:110px' }) : null;
    const add = () => { const x = t.value.trim(); if (!x) return; Store.set('suite', Store.id(), { k: key, col: 0, text: x.slice(0, 120), v: v ? num(v.value, 0) : 0, by: me.uid, nm: me.name, t: Date.now() }); t.value = ''; if (v) v.value = ''; };
    t.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    box.replaceChildren(el('div', { class: 'row', style: 'flex-direction:row;gap:6px' }, t, v, el('button', { class: 'btn', text: 'Add', onclick: add })), cols_);
  };
  draw(); b.append(box); return draw;
}

/* ---- suite home: switch suite, open its boards ---- */
panels.suite = b => {
  const s = curSuite(), ok = has('suites');
  b.append(el('p', { text: 'Zuchera Suites turn the whole office into the right place for your kind of work: names, colours, areas and working boards change to match. Every suite can be added or swapped at any time, and nothing is lost.' }));
  if (!ok) { b.append(el('p', { class: 'meta', text: 'Suites are part of the Business and Enterprise plans.' }), planCard()); return; }
  b.append(el('div', { class: 'actgrid' }, ...Object.keys(SUITES).map(k => { const S = SUITES[k], on = conf.kind === k; return el('button', { class: 'actbtn', style: on ? 'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand) inset' : '', onclick: () => { if (!net.admin) { toast('Only an admin can switch suites.'); return; } Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { kind: k, designed: true })); toast(S.name + ' applied.'); closeDrawer(); } }, el('span', { class: 'ai', text: S.icon }), el('span', { text: S.name }), el('small', { class: 'meta', text: (PRESETS[k] || {}).note || '' })); })));
  if (s && s.panel) b.append(el('button', { class: 'btn', text: s.icon + ' Open ' + s.name, onclick: () => openPanel(s.panel) }));
  const draws = []; if (s && s.boards.length) { for (const d of s.boards) { b.append(el('h3', { text: d[0] })); draws.push(suiteBoard(b, conf.kind, d)); } }
  if (!s) b.append(el('p', { class: 'meta', text: 'Your office currently uses the "' + ((PRESETS[conf.kind] || {}).label || 'standard') + '" look. Pick a suite above to add its tools.' }));
  return () => draws.forEach(f => f());
};

/* ================= Zuchera Edu ================= */
const EDU = { tab: 'present' };
const eduGrades = () => { const o = {}; for (const [id, g] of Store.col('grades')) o[id] = g; return o; };
const students = () => allPeople().filter(r => r.uid);
panels.edu = b => {
  if (!has('suites')) { b.append(el('p', { text: 'Zuchera Edu is part of the Business and Enterprise plans.' }), planCard()); return; }
  const tabs = [['present', '📊 Present'], ['courses', '📚 Courses'], ['class', '🧑‍🏫 Class'], ['rooms', '🏛 Rooms'], ['grades', '📝 Grades']], nav = el('div', { class: 'chips' }), body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  const draw = () => { nav.replaceChildren(...tabs.map(([k, t]) => el('button', { class: 'chip' + (EDU.tab === k ? ' on' : ''), style: EDU.tab === k ? 'background:var(--brand);color:#fff' : '', text: t, onclick: () => { EDU.tab = k; draw(); } }))); body.replaceChildren(); ({ present: ePresent, courses: eCourses, class: eClass, rooms: eRooms, grades: eGrades })[EDU.tab](body, draw); };
  b.append(nav, body); draw(); return draw;
};
function ePresent(b) {
  const files = [...Store.col('files')].filter(([, f]) => f && /pdf|image|text|presentation|word|sheet/.test(str(f.type, 80) + str(f.name, 120)) || /\.(pdf|pptx?|docx?|md|txt|png|jpe?g)$/i.test(str(f && f.name, 120))).sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0)).slice(0, 40);
  b.append(el('p', { text: 'Present slides, PDFs and documents from the Team Drive on the room screen. The presenter turns the pages and everyone follows; students can drop pins and comments.' }),
    ...(files.length ? files.map(([id, f]) => el('div', { class: 'row card', style: 'flex-direction:row;align-items:center;gap:8px' }, el('span', { style: 'flex:1', text: '📄 ' + str(f.name, 70) }), el('button', { class: 'btn sm', text: 'Present', onclick: () => actions.review(id) }))) : [el('p', { class: 'meta', text: 'No files yet. Upload slides or PDFs in 📁 Team Drive, or from your desk computer.' })]),
    el('div', { class: 'row' }, el('button', { class: 'btn', text: '🖥 Share my screen', onclick: () => shareScreen(true) }), el('button', { class: 'btn', text: '📷 Webcam', onclick: () => camOn(true) }), el('button', { class: 'btn ghost', text: '📝 Whiteboard', onclick: () => { toast('Walk to any whiteboard and press E, or add one from 🛠 Build.'); } }), el('button', { class: 'btn ghost', text: '🔌 Show a web app', onclick: () => openPanel('apps') })));
}
function eCourses(b, redraw) {
  const cat = (Store.col('courses').get('catalogue') || {}).list || [], en = Store.col('enrol').get(me.uid) || { ids: [] }, mineIds = new Set(Array.isArray(en.ids) ? en.ids : []);
  b.append(el('p', { text: 'Courses and training your admin has set up. Enrol to see it in your plan and to be included in its gradebook.' }),
    ...(cat.length ? cat.map((c, i) => el('div', { class: 'card' }, el('b', { text: str(c.t, 80) }), el('span', { class: 'meta', text: [c.lead && 'Led by ' + str(c.lead, 40), c.hrs && c.hrs + ' hours', c.room && 'Room: ' + str(c.room, 40)].filter(Boolean).join(' · ') }), c.d ? el('span', { text: str(c.d, 240) }) : null, el('div', { class: 'row' }, el('button', { class: 'btn sm' + (mineIds.has(i) ? ' ghost' : ''), text: mineIds.has(i) ? 'Enrolled ✓ (leave)' : 'Enrol', onclick: () => { mineIds.has(i) ? mineIds.delete(i) : mineIds.add(i); Store.set('enrol', me.uid, { ids: [...mineIds], nm: me.name, t: Date.now() }); redraw(); } }), c.room ? el('button', { class: 'btn sm ghost', text: 'Go to room', onclick: () => { const z = W.zones.find(z => z.name === c.room); if (z) goTo((z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2); closeDrawer(); } }) : null))) : [el('p', { class: 'meta', text: 'No courses yet.' })]));
  if (net.admin) { const ta = el('textarea', { rows: 6, style: 'width:100%;font-size:12px', placeholder: 'Title | Lead | Hours | Room | Description' }); ta.value = cat.map(c => [c.t, c.lead || '', c.hrs || '', c.room || '', c.d || ''].join(' | ')).join('\n'); b.append(el('h3', { text: 'Admin: set up the course list' }), ta, el('button', { class: 'btn', text: 'Save courses', onclick: () => { const list = ta.value.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(p => ({ t: p[0].slice(0, 80), lead: (p[1] || '').slice(0, 40), hrs: num(p[2], 0) || '', room: (p[3] || '').slice(0, 40), d: (p[4] || '').slice(0, 240) })); Store.set('courses', 'catalogue', { list }); toast('Saved.'); redraw(); } })); }
}
function eClass(b, redraw) {
  const hands = [...Store.col('hands')].filter(([, h]) => h && h.up).sort((a, c) => num(a[1].t, 0) - num(c[1].t, 0)), my = Store.col('hands').get(me.uid), bo = Store.col('breakout').get('now');
  b.append(el('div', { class: 'card' }, el('b', { text: '✋ Hands up (' + hands.length + ')' }), ...hands.map(([id, h]) => el('div', { class: 'row', style: 'flex-direction:row;align-items:center;gap:6px' }, el('span', { style: 'flex:1', text: str(h.nm, 40) }), net.admin ? el('button', { class: 'btn sm ghost', text: 'Lower', onclick: () => Store.set('hands', id, { up: false, nm: h.nm, t: Date.now() }) }) : null)), el('button', { class: 'btn' + (my && my.up ? ' ghost' : ''), text: my && my.up ? 'Lower my hand' : '✋ Raise my hand', onclick: () => { Store.set('hands', me.uid, { up: !(my && my.up), nm: me.name, t: Date.now() }); } })));
  if (!net.admin) { if (bo && bo.on) { const g = (bo.groups || []).find(g => (g.mem || []).includes(me.uid)); b.append(el('div', { class: 'card' }, el('b', { text: 'Breakout in progress' }), el('span', { text: g ? 'Your group: ' + g.name + ' (' + g.room + ')' : 'You are not in a group.' }), g ? el('button', { class: 'btn sm', text: 'Take me there', onclick: () => breakGo(g) }) : null)); } return; }
  const n = el('input', { type: 'number', min: 2, max: 8, value: 3, style: 'width:70px' }), mins = el('input', { type: 'number', min: 1, max: 90, value: 10, style: 'width:70px' });
  b.append(el('div', { class: 'card' }, el('b', { text: '👥 Breakout sessions' }), el('p', { class: 'meta', text: 'Splits the people who are in the office into groups and walks each group to its own room. Voice and chat stay within the group.' }), el('div', { class: 'row', style: 'flex-direction:row;gap:8px;align-items:center' }, el('span', { text: 'Groups' }), n, el('span', { text: 'Minutes' }), mins),
    bo && bo.on ? el('div', { class: 'row' }, ...((bo.groups || []).map(g => el('span', { class: 'chip', text: g.name + ': ' + (g.mem || []).length }))), el('button', { class: 'btn danger', text: 'Bring everyone back', onclick: () => { Store.set('breakout', 'now', { on: false, t: Date.now(), home: bo.home }); toast('Class called back.'); redraw(); } })) : el('button', { class: 'btn', text: 'Start breakout', onclick: () => startBreakout(clamp(num(n.value, 3), 2, 8), clamp(num(mins.value, 10), 1, 90)) })));
  const q = el('input', { type: 'text', maxLength: 140, placeholder: 'Quick poll question', style: 'width:100%' }), o = el('input', { type: 'text', maxLength: 200, placeholder: 'Options, separated by commas', style: 'width:100%' });
  b.append(el('div', { class: 'card' }, el('b', { text: '📊 Quick poll' }), q, o, el('button', { class: 'btn', text: 'Ask the class', onclick: () => { const opts = o.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6); if (!q.value.trim() || opts.length < 2) { toast('Add a question and at least two options.'); return; } Store.set('suite', Store.id(), { k: 'edu:poll', q: q.value.trim().slice(0, 140), o: opts, by: me.uid, t: Date.now(), votes: {} }); toast('Poll sent.'); q.value = o.value = ''; redraw(); } })),
    el('button', { class: 'btn ghost', text: '🔇 Mute everyone (class)', onclick: () => { Store.set('suite', 'mute_all', { k: 'edu:mute', t: Date.now(), by: me.uid }); toast('Mute request sent. Students are muted on their side.'); } }));
}
const polls = () => [...Store.col('suite')].filter(([, c]) => c && c.k === 'edu:poll').sort((a, c) => num(c[1].t, 0) - num(a[1].t, 0));
function pollCard() {
  const [pid, p] = polls()[0] || []; if (!p || Date.now() - num(p.t, 0) > 3600000) return null; const votes = Store.col('suite').get(pid).votes || {}, mineV = votes[me.uid];
  const tot = Object.values(votes).length; return el('div', { class: 'card' }, el('b', { text: '📊 ' + str(p.q, 140) }), ...p.o.map((o, i) => { const c = Object.values(votes).filter(v => v === i).length; return el('button', { class: 'btn ' + (mineV === i ? '' : 'ghost'), style: 'justify-content:space-between', onclick: () => { Store.set('suite', pid, Object.assign({}, p, { votes: Object.assign({}, votes, { [me.uid]: i }) })); }, }, el('span', { text: str(o, 60) }), el('span', { text: tot ? Math.round(c * 100 / tot) + '% (' + c + ')' : '' })); }));
}
function startBreakout(n, mins) {
  const room = W.zones.filter(z => z.room || ['brain', 'collab', 'lounge', 'games', 'cafe'].includes(z.id)), on = students().filter(r => r.online && !r.me), shuf = on.map(r => r.uid).sort(() => Math.random() - .5), groups = []; if (!on.length) { toast('Nobody else is in the office yet.'); return; }
  for (let i = 0; i < n; i++) groups.push({ name: 'Group ' + (i + 1), room: (room[i % room.length] || W.zones[0]).name, mem: [] }); shuf.forEach((u, i) => groups[i % n].mem.push(u));
  Store.set('breakout', 'now', { on: true, groups, end: Date.now() + mins * 60000, home: me.zone ? me.zone.name : 'Lobby', t: Date.now() }); toast('Breakout started.');
}
function breakGo(g) { const z = W.zones.find(z => z.name === g.room); if (z) goTo((z.x0 + z.x1) / 2 + (Math.random() - .5) * 2, (z.z0 + z.z1) / 2 + (Math.random() - .5) * 2); }
let boSeen = '';
function eduWatch() {
  const bo = Store.col('breakout').get('now'); if (!bo) return; const sig = bo.on + ':' + bo.t; if (sig === boSeen) return; boSeen = sig;
  if (bo.on) { const g = (bo.groups || []).find(g => (g.mem || []).includes(me.uid)); if (g) { toast('Breakout: you are in ' + g.name + ' (' + g.room + ').'); breakGo(g); } }
  else if (bo.home) { const z = W.zones.find(z => z.name === bo.home); if (z) { toast('Class is back together.'); goTo((z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2); } }
  const m = Store.col('suite').get('mute_all'); if (m && Date.now() - num(m.t, 0) < 8000 && !net.admin && typeof RTC !== 'undefined' && RTC.voice && !RTC.muted) { try { setMute(true); } catch (e) { } }
}
function eRooms(b) {
  const zs = W.zones.filter(z => z.room || ['brain', 'collab', 'lounge', 'games'].includes(z.id)), sel = el('select', {}, ...zs.map(z => el('option', { value: z.id, text: z.name, selected: me.zone && me.zone.id === z.id }))), kind = el('select', {}, ...[['rows', 'Lecture rows'], ['theatre', 'Tiered theatre with podium'], ['u', 'Seminar horseshoe'], ['pods', 'Group pods'], ['lab', 'Computer lab']].map(([v, t]) => el('option', { value: v, text: t }))), size = el('select', {}, ...[['6', 'Small (6)'], ['12', 'Medium (12)'], ['24', 'Large (24)']].map(([v, t]) => el('option', { value: v, text: t, selected: v === '12' })));
  if (!net.admin) { b.append(el('p', { text: 'Teachers and admins arrange the learning rooms.' })); return; }
  b.append(el('p', { text: 'Lay out a learning room in one click: pick the room, the style and the size. Everything it places can be moved or removed afterwards in 🛠 Build.' }), el('label', { class: 'field' }, el('span', { class: 'lbl', text: 'Room' }), sel), el('label', { class: 'field' }, el('span', { class: 'lbl', text: 'Style' }), kind), el('label', { class: 'field' }, el('span', { class: 'lbl', text: 'Size' }), size),
    el('button', { class: 'btn', text: 'Arrange this room', onclick: () => { layoutClassroom(sel.value, kind.value, +size.value); } }), el('button', { class: 'btn ghost', text: 'Clear what I placed in this room', onclick: () => { const z = W.zones.find(z => z.id === sel.value); saveLayout(l => { l.items = l.items.filter(i => !(z && i.cls && i.x >= z.x0 && i.x <= z.x1 && i.z >= z.z0 && i.z <= z.z1)); }); toast('Cleared.'); } }),
    el('p', { class: 'meta', text: 'Tip: use 🎨 Design to enclose rooms or open them up, and the item library for more boards, screens and desks.' }));
}
function layoutClassroom(zid, style, n) {
  const z = W.zones.find(z => z.id === zid); if (!z) return; const cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2, w = z.x1 - z.x0, d = z.z1 - z.z0, items = [], add = (t, x, zz, ry, c) => items.push({ id: newItemId(), t, x: Math.round(clamp(x, z.x0 + .6, z.x1 - .6) * 10) / 10, z: Math.round(clamp(zz, z.z0 + .6, z.z1 - .6) * 10) / 10, ry: ry || 0, c: c || 0, tx: '', cls: 1 });
  const front = z.z0 + 1.2; add('screen', cx, front, 0); add('lectern', cx + Math.min(2.6, w / 4), front + 1.3, 0); add('board', cx - Math.min(2.8, w / 4), front + .5, 0);
  const cols = Math.min(Math.max(2, Math.floor((w - 1.4) / 1.5)), n <= 6 ? 3 : n <= 12 ? 4 : 6), rowsN = Math.ceil(n / cols), x0 = cx - (cols - 1) * 1.5 / 2, zs = front + 3.2;
  if (style === 'rows' || style === 'lab') for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), c = i % cols; add(style === 'lab' ? 'desk_open' : 'student_desk', x0 + c * 1.5, Math.min(z.z1 - 1, zs + r * 1.5), style === 'lab' ? Math.PI : 0); }
  else if (style === 'theatre') for (let r = 0; r < Math.ceil(n / 6); r++) add('theatre_row', cx, Math.min(z.z1 - 1, zs + r * 1.4), 0);
  else if (style === 'u') { const rad = Math.min(w, d) / 2 - 1.4; for (let i = 0; i < n; i++) { const a = Math.PI * (.15 + .7 * (i / Math.max(1, n - 1))); add('student_desk', cx + Math.cos(a + Math.PI / 2 * 0) * rad * 1.2 * (-1), cz + 1 + Math.sin(a) * rad, a + Math.PI); } }
  else for (let i = 0; i < Math.ceil(n / 4); i++) { const px = cx + ((i % 2) - .5) * 3.4, pz = zs + Math.floor(i / 2) * 3; add('table_round', px, pz, 0, i); }
  saveLayout(l => { l.items = l.items.filter(i => !(i.cls && i.x >= z.x0 && i.x <= z.x1 && i.z >= z.z0 && i.z <= z.z1)).concat(items); }); toast(z.name + ' arranged.');
}
function eGrades(b, redraw) {
  const cfg = Store.col('courses').get('assess') || { cols: [] }, cols = Array.isArray(cfg.cols) ? cfg.cols : [], G = eduGrades();
  const wavg = g => { let s = 0, w = 0; for (let i = 0; i < cols.length; i++) { const v = g && g.marks ? g.marks[i] : null; if (v != null && v !== '') { s += num(v, 0) * num(cols[i].w, 1); w += num(cols[i].w, 1); } } return w ? Math.round(s / w * 10) / 10 : null; };
  const letter = v => v == null ? '–' : v >= 70 ? 'A / First' : v >= 60 ? 'B / 2:1' : v >= 50 ? 'C / 2:2' : v >= 40 ? 'D / Pass' : 'Fail';
  if (!net.admin) { const g = G[me.uid], avg = wavg(g); b.append(el('div', { class: 'card' }, el('b', { text: 'My marks' }), ...(cols.length ? cols.map((c, i) => el('div', { class: 'row', style: 'flex-direction:row;gap:8px' }, el('span', { style: 'flex:1', text: str(c.n, 50) + ' (weight ' + num(c.w, 1) + ')' }), el('b', { text: g && g.marks && g.marks[i] != null && g.marks[i] !== '' ? g.marks[i] + '/100' : 'Not marked' }), g && g.fb && g.fb[i] ? el('small', { class: 'meta', text: str(g.fb[i], 200) }) : null)) : [el('p', { class: 'meta', text: 'No assessments set yet.' })]), el('b', { text: 'Overall: ' + (avg == null ? '–' : avg + ' · ' + letter(avg)) }), el('p', { class: 'meta', text: 'Only you and your teachers can see your marks.' }))); return; }
  const ta = el('textarea', { rows: 3, style: 'width:100%', placeholder: 'Assessment | weight\nEssay | 3\nExam | 5' }); ta.value = cols.map(c => c.n + ' | ' + c.w).join('\n');
  b.append(el('div', { class: 'card' }, el('b', { text: 'Assessments' }), ta, el('button', { class: 'btn sm', text: 'Save assessments', onclick: () => { const L = ta.value.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).slice(0, 12).map(p => ({ n: p[0].slice(0, 50), w: clamp(num(p[1], 1), 0, 100) })); Store.set('courses', 'assess', { cols: L }); redraw(); } })));
  const roster = students().filter(r => !r.me || true), rows = roster.map(r => { const g = G[r.uid] || { marks: {}, fb: {} }; return el('tr', {}, el('td', { text: r.nm }), ...cols.map((c, i) => el('td', {}, el('input', { type: 'number', min: 0, max: 100, value: g.marks && g.marks[i] != null ? g.marks[i] : '', style: 'width:58px', title: 'Mark out of 100. Press Enter to save.', onchange: e => { const m = Object.assign({}, g.marks || {}, { [i]: e.target.value === '' ? '' : clamp(num(e.target.value, 0), 0, 100) }); Store.set('grades', r.uid, Object.assign({}, g, { marks: m, nm: r.nm, t: Date.now() })); } }), el('input', { type: 'text', maxLength: 200, placeholder: 'feedback', value: g.fb && g.fb[i] || '', style: 'width:100px;font-size:11px', onchange: e => { const f = Object.assign({}, g.fb || {}, { [i]: e.target.value.slice(0, 200) }); Store.set('grades', r.uid, Object.assign({}, g, { fb: f, nm: r.nm, t: Date.now() })); } }))), el('td', { text: (wavg(g) == null ? '–' : wavg(g)) + '' })); });
  b.append(el('div', { style: 'overflow:auto' }, el('table', { style: 'border-collapse:collapse;font-size:12.5px;width:100%' }, el('thead', {}, el('tr', {}, el('th', { text: 'Student', style: 'text-align:left' }), ...cols.map(c => el('th', { text: str(c.n, 20) })), el('th', { text: 'Avg' }))), el('tbody', {}, ...rows))), el('button', { class: 'btn ghost', text: '⬇ Export marksheet (CSV)', onclick: () => { const csv = [['Student', ...cols.map(c => c.n), 'Average'], ...roster.map(r => { const g = G[r.uid] || {}; return [r.nm, ...cols.map((c, i) => g.marks && g.marks[i] != null ? g.marks[i] : ''), wavg(g) == null ? '' : wavg(g)]; })].map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'); const a = el('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'marksheet.csv' }); a.click(); } }));
}

/* ---- new library items: lectern, student desk, projector screen, tiered theatre row ---- */
Object.assign(LIBRARY, {
  lectern: { label: 'Lectern / podium', icon: '🎤', cat: 'Learning', build: it => { const g = new T.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; office.add(g); rbox(g, .75, 1.05, .5, .02, M_WALNUT, 0, .53, 0, { cast: 1 }); rbox(g, .85, .05, .6, .01, M_WALNUT, 0, 1.08, 0); box(g, .5, .02, .3, M_BLACKM, 0, 1.12, .04); ob(it, .9, .6); } },
  student_desk: { label: 'Student desk and laptop', icon: '💻', cat: 'Learning', build: it => { const g = new T.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; office.add(g); rbox(g, 1.1, .04, .6, .01, M_WALNUT, 0, .74, 0, { cast: 1 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, .04, .72, .04, M_ALU, sx * .5, .36, sz * .25); box(g, .34, .015, .24, M_ALU, 0, .765, -.05); const s = box(g, .34, .22, .012, M_BLACKM, 0, .88, -.17); s.rotation.x = -.22; rbox(g, .42, .05, .42, .02, mat(cc(it), { roughness: .8 }), 0, .46, .62); rbox(g, .42, .4, .05, .02, mat(cc(it), { roughness: .8 }), 0, .72, .82); ob(it, 1.1, 1.4); } },
  screen: { label: 'Projector screen', icon: '📽', cat: 'Learning', build: it => { const g = new T.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; office.add(g); rbox(g, 3.3, 1.9, .05, .01, M_BLACKM, 0, 1.9, 0); box(g, 3.15, 1.75, .02, mat(0xf4f6f8, { roughness: .5 }), 0, 1.9, .03); for (const sx of [-1, 1]) cyl(g, .025, .025, 2.9, M_ALU, sx * 1.7, 1.45, 0, { seg: 6 }); } },
  theatre_row: { label: 'Theatre seating row (6)', icon: '🎭', cat: 'Learning', build: it => { const g = new T.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; office.add(g); const rise = (Math.max(0, Math.round(((it.z || 0) % 5))) * .02); rbox(g, 7.2, .22, 1.2, .02, mat(0x3b3f4a, { roughness: .9 }), 0, .11, 0, { cast: 1 }); for (let i = -2.5; i <= 2.5; i++) { rbox(g, .55, .08, .5, .03, mat(cc(it), { roughness: .8 }), i * 1.1, .5, 0); rbox(g, .55, .5, .08, .03, mat(cc(it), { roughness: .8 }), i * 1.1, .8, .26); } ob(it, 7.2, 1.2); } }
});

/* ---- suite buttons, poll card in drawer, watchers ---- */
function initV10() {
  const top = $('#topbtns'); top.append(el('button', { class: 'tb', id: 'bSuite', text: '🧩 Suites', title: 'Zuchera Suites', onclick: () => openPanel('suite') }), el('button', { class: 'tb', id: 'bEdu', hidden: true, text: '🎓 Edu', onclick: () => openPanel('edu') }));
  setInterval(() => { const e = $('#bEdu'); if (e) e.hidden = conf.kind !== 'edu'; const s = $('#bSuite'); if (s && curSuite()) s.textContent = curSuite().icon + ' ' + curSuite().name.replace('Zuchera ', ''); eduWatch(); }, 1500);
  Store.on('breakout', eduWatch); for (const c of ['suite', 'courses', 'enrol', 'grades', 'hands', 'breakout']) Store.on(c, () => { refreshPanel('suite'); refreshPanel('edu'); });
}
const _eClass = eClass; eClass = function (b, r) { _eClass(b, r); const p = pollCard(); if (p) b.append(p); };
