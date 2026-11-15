/* ============================ v8: DOT assistant, desk computer, tasks and time, media ============================ */
const DOT = Object.assign({ on: true, mem: [], rem: [], log: [], game: null }, LS.get('dot', {}));
const dotSave = () => { DOT.log = DOT.log.slice(-40); LS.set('dot', DOT); };
const dotSay = (t, who) => { DOT.log.push({ w: who || 'dot', t: String(t).slice(0, 1200), at: Date.now() }); dotSave(); refreshPanel('robot'); };
const TRIVIA = [['Which planet is known as the Red Planet?', 'mars'], ['What is the capital of Nigeria?', 'abuja'], ['How many minutes in a day?', '1440'], ['What does HTML stand for? (first word)', 'hypertext'], ['Which river runs through London?', 'thames'], ['What is 12 x 12?', '144'], ['Which ocean is the largest?', 'pacific']];
const RIDDLES = [['What has keys but cannot open locks?', 'keyboard'], ['What gets wetter the more it dries?', 'towel'], ['What has hands but cannot clap?', 'clock']];
function findPerson(name) { name = name.toLowerCase().trim(); return allPeople().find(r => r.uid && !r.me && String(r.nm).toLowerCase().includes(name)); }
function dotDm(r, text) { const mem = [me.uid, r.uid].sort(), id = 'dm_' + mem.join('~'); if (!Store.col('threads').get(id)) Store.set('threads', id, { mem, name: '', by: me.uid, t: Date.now() }); sendMsg(id, '🤖 ' + text + ' (sent by DOT for ' + me.name + ')'); }
function dotPlan() {
  const lines = []; const evs = (typeof nextEvents === 'function' ? nextEvents(12 * 3600000) : []).slice(0, 5); evs.forEach(([, e]) => lines.push('🗓 ' + new Date(e.s).toLocaleTimeString([], { timeStyle: 'short' }) + ' ' + str(e.title, 50)));
  const mine = [...Store.col('cards')].filter(([, c]) => c && c.col < 3 && (c.by === me.uid || c.who === me.name)).sort((a, b) => (num(a[1].due, 9e15)) - (num(b[1].due, 9e15))).slice(0, 6); mine.forEach(([, c]) => lines.push('☐ ' + str(c.text, 60) + (c.due ? ' (due ' + new Date(c.due).toLocaleDateString([], { dateStyle: 'medium' }) + ')' : '')));
  DOT.rem.filter(r => r.at > Date.now()).slice(0, 4).forEach(r => lines.push('⏰ ' + new Date(r.at).toLocaleTimeString([], { timeStyle: 'short' }) + ' ' + r.text));
  return lines.length ? 'Here is your plan:\n' + lines.join('\n') + '\n\nTip: start with the earliest deadline and protect one hour of focus.' : 'Your plan is clear. Add a task in My tasks, or tell me: remind me to call Ada in 30 minutes.';
}
function dotFix(t) { return t.replace(/\s+/g, ' ').replace(/\bteh\b/gi, 'the').replace(/\brecieve\b/gi, 'receive').replace(/\bdefinately\b/gi, 'definitely').replace(/\bi\b/g, 'I').replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\s+([,.!?])/g, '$1').trim(); }
async function dotAnswer(raw) {
  const t = raw.trim(), l = t.toLowerCase(); let m;
  if (DOT.game && DOT.game.k === 'guess' && /^\d+$/.test(l)) { const g = DOT.game, n = +l; g.n++; if (n === g.v) { DOT.game = null; return '🎉 Yes, ' + n + '! You got it in ' + g.n + ' guesses.'; } return n < g.v ? 'Higher ⬆️' : 'Lower ⬇️'; }
  if (DOT.game && DOT.game.k === 'q') { const g = DOT.game; DOT.game = null; return l.includes(g.a) ? '✅ Correct! The answer is ' + g.a + '.' : '❌ Not quite. It was ' + g.a + '.'; }
  if (/^(help|what can you do|\?)$/.test(l)) return 'I can: brief you, plan your day, remind you ("remind me to X in 30 minutes"), remember things ("remember that…", "what do you remember"), tell people ("tell Ada the files are ready"), prepare a meeting room ("prepare Thames room for standup"), correct your writing ("correct: …"), take you somewhere ("go to the café"), play games ("play guess", "trivia", "riddle"), and build ("add a round table", admins). Ask me anything else too.';
  if (/^(brief|brief me|what.s up|status)/.test(l)) return typeof robotBrief === 'function' ? (robotBrief(true) || 'All quiet.') : 'All quiet.';
  if (/plan (my|the) day|what.s next|my plan/.test(l)) return dotPlan();
  if ((m = l.match(/remind me (?:to |about )?(.+?)(?: in (\d+) ?(min|minute|minutes|hour|hours|h|m))?$/))) { const n = m[2] ? +m[2] * (/^h/.test(m[3]) ? 60 : 1) : 10; DOT.rem.push({ at: Date.now() + n * 60000, text: m[1] }); dotSave(); return '⏰ I will remind you to ' + m[1] + ' in ' + n + ' minutes.'; }
  if ((m = t.match(/^remember (?:that )?(.+)/i))) { DOT.mem.push(m[1].slice(0, 200)); DOT.mem = DOT.mem.slice(-60); dotSave(); return '🧠 Got it. I will remember: ' + m[1]; }
  if (/what do you remember|my memory|memories/.test(l)) return DOT.mem.length ? '🧠 ' + DOT.mem.map((x, i) => (i + 1) + '. ' + x).join('\n') : 'Nothing yet. Say "remember that…".';
  if (/^forget (everything|all)/.test(l)) { DOT.mem = []; dotSave(); return 'Memory cleared.'; }
  if ((m = t.match(/^tell (\S+)\s+(.+)/i))) { const r = findPerson(m[1]); if (!r) return 'I could not find ' + m[1] + ' in the office.'; dotDm(r, m[2]); return '📨 Delivered to ' + r.nm + '.'; }
  if ((m = t.match(/^correct:?\s+(.+)/i))) return '✍️ ' + dotFix(m[1]);
  if ((m = l.match(/prepare (?:the )?(\w+)(?: room)?(?: for (.+))?/))) { const r = (W.rooms || []).find(x => x.name.toLowerCase().includes(m[1]) || x.id.toLowerCase().includes(m[1])); if (!r) return 'Which room? Try: ' + (W.rooms || []).map(x => x.name).join(', '); saveRoom(r.id, { lock: false, title: m[2] ? m[2].slice(0, 80) : roomDoc(r.id).title, agenda: roomDoc(r.id).agenda || ('1. Welcome\n2. ' + (m[2] || 'Main topic') + '\n3. Decisions and owners\n4. Next steps'), mode: 'down', start: Date.now(), end: Date.now() + 30 * 60000 }); return '🏛 ' + r.name + ' is ready: door open, agenda on the wall screen and a 30 minute timer started.'; }
  if ((m = l.match(/^(?:go to|take me to|walk me to)(?: the)? (.+)/))) { const p = (W.places || []).find(x => x.name.toLowerCase().includes(m[1])); if (!p) return 'Places: ' + (W.places || []).map(x => x.name).join(', '); goTo(p.x, p.z); return '🚶 On our way to ' + p.name + '.'; }
  if (/play (a )?guess|guess game|number game/.test(l)) { DOT.game = { k: 'guess', v: 1 + Math.floor(Math.random() * 50), n: 0 }; return '🎲 I am thinking of a number from 1 to 50. Type your guess.'; }
  if (/trivia|quiz me/.test(l)) { const q = TRIVIA[Math.floor(Math.random() * TRIVIA.length)]; DOT.game = { k: 'q', a: q[1] }; return '🧩 ' + q[0]; }
  if (/riddle/.test(l)) { const q = RIDDLES[Math.floor(Math.random() * RIDDLES.length)]; DOT.game = { k: 'q', a: q[1] }; return '🤔 ' + q[0]; }
  if ((m = l.match(/^(?:add|build|place|put)(?: a| an| some)? (.+)/)) && net.admin) { const k = Object.entries(LIBRARY).find(([key, L]) => m[1].includes(L.label.toLowerCase().split(' (')[0]) || m[1].includes(key.replace('_', ' '))); if (!k) return 'I can add: ' + Object.values(LIBRARY).map(L => L.label).join(', '); if (!has('build')) return 'Building needs the Team plan.'; addItem(k[0]); return '🏗 Added ' + k[1].label + ' in front of you. Use Build mode to drag it.'; }
  if (/^(hi|hello|hey)\b/.test(l)) return 'Hello ' + me.name.split(' ')[0] + '! Say "help" to see what I can do.';
  if (has('ai') && typeof sampleFn === 'function') { try { let out = ''; const ctx = 'You are DOT, the friendly assistant robot of the virtual office ' + conf.name + '. The user is ' + me.name + ', ' + (me.role || '') + '. Memory: ' + DOT.mem.join('; ') + '. Answer in under 90 words.'; await sampleFn(ctx + '\n\nTask: ' + t, { onText: ({ text }) => { out = text; }, modelTier: 'quick', cache: false }); if (out) return out.slice(0, 1200); } catch (e) { } }
  return 'I am not sure. Say "help" for what I can do' + (has('ai') ? '.' : ', or upgrade to Business for open-ended AI answers.');
}
panels.robot = b => {
  const log = el('div', { class: 'aiout', style: 'max-height:46vh;display:flex;flex-direction:column;gap:6px' }), inp = el('input', { type: 'text', id: 'dotIn', maxLength: 300, placeholder: 'Ask DOT or give it a job' });
  const send = async v => { v = (v || inp.value).trim(); if (!v) return; inp.value = ''; dotSay(v, 'me'); const a = await dotAnswer(v); dotSay(a); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  const tog = el('label', { class: 'tog' }, el('input', { type: 'checkbox', checked: DOT.on, onchange: e => { DOT.on = e.target.checked; dotSave(); applyDot(); } }), el('span', {}, 'DOT is switched on', el('small', { text: 'Turn off to remove DOT from your view.' })));
  b.append(tog, log, el('div', { class: 'row' }, inp, el('button', { class: 'btn', text: 'Send', onclick: () => send() })), el('div', { class: 'row' }, ...['Brief me', 'Plan my day', 'Help', 'Play guess', 'Trivia', 'What do you remember'].map(t => el('button', { class: 'btn sm ghost', text: t, onclick: () => send(t) }))));
  if (!DOT.log.length) DOT.log.push({ w: 'dot', t: 'Hi, I am DOT. I remind, plan, remember, deliver messages, prepare meeting rooms, play games and fix your writing. Say "help".', at: Date.now() });
  return () => { log.replaceChildren(...DOT.log.map(m => el('div', { style: 'align-self:' + (m.w === 'me' ? 'flex-end;background:#2456ff;color:#fff' : 'flex-start;background:#eef2f8') + ';padding:6px 10px;border-radius:12px;max-width:88%;white-space:pre-wrap', text: m.t }))); log.scrollTop = 1e6; };
};
function applyDot() { if (W.dyn && W.dyn.robot) W.dyn.robot.visible = DOT.on; const bt = $('#bDot'); if (bt) bt.style.opacity = DOT.on ? 1 : .5; }

/* ---- my computer at the desk ---- */
me.pcOff = false; me.sharing = null;
function v8Presence() { return { pcoff: me.pcOff ? 1 : null }; }
function deskPcOff(d) { if (!d.owner) return false; if (d.owner === me.uid) return !!me.pcOff; for (const p of peers.values()) if (p.uid === d.owner) return !!PRES(p).pcoff; return false; }
panels.pc = b => {
  const sc = el('div', { style: 'background:#0f1b2d;color:#cfe;border-radius:12px;padding:14px;min-height:160px;display:flex;flex-direction:column;gap:8px' });
  const note = el('textarea', { rows: 5, maxLength: 4000, placeholder: 'Quick notes (saved on this device)', style: 'width:100%;border-radius:8px;border:0;padding:8px' }); note.value = LS.get('pcnote', ''); note.addEventListener('input', () => LS.set('pcnote', note.value));
  const draw = () => {
    if (me.pcOff) { sc.replaceChildren(el('p', { style: 'color:#789;margin:auto', text: '⏻ Your computer is off. Your monitor shows dark to everyone.' }), el('button', { class: 'btn', text: 'Switch on', onclick: () => { me.pcOff = false; draw(); } })); return; }
    const sh = RTC.scr; sc.replaceChildren(el('b', { text: '🖥 ' + me.name + '’s computer' }), note,
      el('div', { class: 'row' }, el('button', { class: 'btn sm', text: '✉ Mail', onclick: () => { work(true); } }), el('button', { class: 'btn sm', text: '✅ Tasks', onclick: () => openPanel('tasks') }), el('button', { class: 'btn sm', text: '🗓 Calendar', onclick: () => work(true) }), el('button', { class: 'btn sm', text: '💬 Talk', onclick: () => talk(true) })),
      el('h3', { style: 'color:#fff', text: 'Share my screen' }), el('p', { style: 'color:#9ab', text: sh ? 'Sharing now. Only people in your current call or room can see it. Stop any time.' : 'Choose a window or screen in your browser. Only people in your current call or room can see it, and nothing is recorded.' }),
      el('div', { class: 'row' }, sh ? el('button', { class: 'btn danger', text: '⛔ Stop sharing', onclick: async () => { await shareScreen(false); draw(); } }) : el('button', { class: 'btn go', text: '🖥 Share screen', onclick: async () => { if (!RTC.ok && !navigator.mediaDevices) { toast('Screen sharing works in the hosted office on https.'); return; } if (!RTC.call && !(me.zone && me.zone.room)) toast('Start a call or enter a meeting room so people can see it.'); await shareScreen(true); draw(); } }), el('button', { class: 'btn ghost', text: '🔒 Lock and shut down', onclick: async () => { await shareScreen(false); me.pcOff = true; draw(); toast('Computer shut down.'); } })));
  }; draw(); b.append(sc, el('p', { class: 'meta', text: 'Tip: sit at your desk, press E on the monitor, and your teammates see your screen glow with your task.' })); return draw;
};

/* ---- tasks with deadlines and time spent ---- */
const fmtDur = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
const spentOf = c => num(c.spent, 0) + (c.run ? Date.now() - c.run : 0);
panels.tasks = b => {
  const tx = el('input', { type: 'text', maxLength: 120, placeholder: 'New task' }), due = el('input', { type: 'datetime-local' }), who = el('select', {}, el('option', { value: '', text: 'For me' }), ...allPeople().filter(r => r.uid && !r.me).map(r => el('option', { value: r.nm, text: 'For ' + r.nm })));
  const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const add = () => { const t = tx.value.trim(); if (!t) return; Store.set('cards', Store.id(), { col: 0, text: t, who: who.value || me.name, by: me.uid, nm: me.name, due: due.value ? new Date(due.value).getTime() : 0, spent: 0, run: 0, ord: Date.now(), t: Date.now() }); tx.value = ''; due.value = ''; };
  tx.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  b.append(el('div', { class: 'row' }, el('div', { class: 'field', style: 'flex:1;min-width:160px' }, tx), due, who, el('button', { class: 'btn', text: 'Add', onclick: add })), list, el('p', { class: 'meta', text: 'These are the same cards as the Kanban board. Start the timer to log time on a task; DOT will remind you of deadlines.' }));
  return () => {
    const mine = [...Store.col('cards')].filter(([, c]) => c && (c.who === me.name || c.by === me.uid)).sort((a, b) => num(a[1].col, 0) - num(b[1].col, 0) || num(a[1].due, 9e15) - num(b[1].due, 9e15));
    list.replaceChildren(...(mine.length ? mine.map(([id, c]) => { const over = c.due && c.due < Date.now() && c.col < 3; return el('div', { class: 'card', style: 'flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap' }, el('div', { style: 'flex:1;min-width:150px' }, el('b', { style: c.col === 3 ? 'text-decoration:line-through' : '', text: str(c.text, 120) }), el('div', { class: 'meta', style: over ? 'color:var(--bad)' : '', text: (['To do', 'Doing', 'Review', 'Done'][clamp(num(c.col, 0), 0, 3)]) + (c.due ? ' · due ' + new Date(c.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + (over ? ' · overdue' : '') : '') + ' · ' + fmtDur(spentOf(c)) + ' spent' })),
        c.col < 3 ? el('button', { class: 'btn sm ' + (c.run ? 'danger' : 'go'), text: c.run ? '⏸ Stop' : '▶ Start', onclick: () => { Store.set('cards', id, Object.assign({}, c, c.run ? { spent: spentOf(c), run: 0 } : { run: Date.now(), col: c.col === 0 ? 1 : c.col })); } }) : null,
        c.col < 3 ? el('button', { class: 'btn sm ghost', text: '✔ Done', onclick: () => Store.set('cards', id, Object.assign({}, c, { col: 3, spent: spentOf(c), run: 0, ord: Date.now() })) }) : null); }) : [el('p', { text: 'No tasks yet.' })]));
  };
};

/* ---- media: music, news and video, chosen by the admin ---- */
const MEDIA_DEF = [{ n: 'Lo-fi focus radio', u: 'https://www.youtube.com/embed/jfKfPfyJRdk', k: 'music' }, { n: 'Calm piano', u: 'https://www.youtube.com/embed/lTRiuFIWV54', k: 'music' }, { n: 'Sky News live', u: 'https://www.youtube.com/embed/YDvsBbKfLPA', k: 'news' }, { n: 'Al Jazeera English live', u: 'https://www.youtube.com/embed/gCNeDWCI0vo', k: 'news' }];
function mediaList() { const d = Store.col('office').get('media'); return d && Array.isArray(d.list) ? d.list.filter(x => x && /^https:\/\//.test(x.u)) : MEDIA_DEF; }
panels.media = b => {
  if (!has('media')) { b.append(el('p', { text: 'Music, news and video screens are part of the Business plan.' }), planCard()); return; }
  const frame = el('div', { style: 'aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;display:grid;place-items:center;color:#789', text: 'Pick something to play' });
  const play = x => { frame.replaceChildren(el('iframe', { src: x.u + (x.u.includes('?') ? '&' : '?') + 'autoplay=1', allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: true, style: 'width:100%;height:100%;border:0' })); };
  b.append(el('p', { text: 'Watching or listening is private to you: others do not see or hear it. Admins choose what is on the list.' }), frame, el('div', { class: 'actgrid' }, ...mediaList().map(x => el('button', { class: 'actbtn', onclick: () => play(x) }, el('span', { class: 'ai', text: x.k === 'news' ? '📰' : x.k === 'video' ? '🎬' : '🎧' }), el('span', { text: x.n })))), el('button', { class: 'btn ghost', text: 'Stop', onclick: () => frame.replaceChildren(document.createTextNode('Stopped')) }));
  if (net.admin) { const ta = el('textarea', { rows: 4, style: 'width:100%', placeholder: 'One per line:  Name | https://embed-url | music, news or video' }); ta.value = mediaList().map(x => x.n + ' | ' + x.u + ' | ' + x.k).join('\n'); b.append(el('h3', { text: 'Admin: choose what people can play' }), ta, el('button', { class: 'btn', text: 'Save list', onclick: () => { const list = ta.value.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0] && /^https:\/\//.test(p[1] || '')).map(p => ({ n: p[0].slice(0, 40), u: p[1].slice(0, 300), k: ['music', 'news', 'video'].includes(p[2]) ? p[2] : 'video' })); Store.set('office', 'media', { list }); toast('Saved.'); } })); }
};

/* ---- board duster ---- */
function dusterBtns(id) { const wipe = all => { const ns = notesOf(id).filter(([, n]) => all || n.by === me.uid), saved = ns.map(([k, n]) => [k, n]); if (!ns.length) { toast('Nothing to clean.'); return; } for (const [k] of ns) Store.del('notes', k); toast('🧽 Board cleaned.', { ms: 9000, action: { label: 'Undo', fn: () => saved.forEach(([k, n]) => Store.set('notes', k, n)) } }); }; return [el('button', { class: 'btn ghost', text: '🧽 Wipe my notes', title: 'Remove only the notes you wrote', onclick: () => wipe(false) }), el('button', { class: 'btn ghost', text: '🧹 Clean whole board', onclick: () => wipe(true) })]; }

function initV8() {
  const top = $('#topbtns'); top.append(el('button', { class: 'tb', id: 'bDot', text: '🤖 DOT', onclick: () => openPanel('robot') }), el('button', { class: 'tb', id: 'bTasks', text: '✅ Tasks', onclick: () => openPanel('tasks') }), el('button', { class: 'tb', id: 'bMedia', text: '🎧 Media', onclick: () => openPanel('media') }));
  setInterval(() => { applyDot(); const now = Date.now(); for (const r of DOT.rem) if (!r.done && r.at <= now) { r.done = true; dotSave(); sfx('bell'); toast('⏰ DOT: ' + r.text, { ms: 30000 }); if (drawer.id === 'robot') dotSay('⏰ Reminder: ' + r.text); } DOT.rem = DOT.rem.filter(r => !r.done || now - r.at < 3600000); }, 5000);
  setInterval(() => { const due = [...Store.col('cards')].filter(([, c]) => c && c.col < 3 && c.due && (c.who === me.name || c.by === me.uid) && c.due - Date.now() < 3600000 && c.due > Date.now() && !(DOT.dueSeen || {})[c.due + c.text]); for (const [, c] of due) { (DOT.dueSeen = DOT.dueSeen || {})[c.due + c.text] = 1; sfx('bell'); toast('⏰ Task due within the hour: ' + str(c.text, 60), { ms: 20000 }); } }, 30000);
  Store.on('cards', () => { refreshPanel('tasks'); }); setInterval(() => refreshPanel('tasks'), 30000);
}
