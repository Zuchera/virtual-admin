/* ============================ v5: HQ Talk (messaging), HQ Calls (voice, video, screen share), hold-to-talk, service notices ============================
   Everything here works without Microsoft. Teams links stay available as an option when an admin turns them on. */
const V5 = { open: false, conv: 'all', reply: null, edit: null, q: '', att: null, mentionIx: 0, typingT: 0, rxSeen: null, chatSeen: null, tts: null, dict: null, voiceKind: null };
const MAX_UP = () => (window.OFFICE_CONFIG && window.OFFICE_CONFIG.maxUpload) || 20 * 1048576;
const RX = ['👍', '❤️', '😂', '🎉', '✅', '👀', '🙏', '🔥'];
const CH_SEED = [{ id: 'all', name: 'general', topic: 'Everyone in the office' }, { id: 'ch_ann', name: 'announcements', topic: 'Company news. Admins post, everyone reacts.', ann: true }, { id: 'ch_random', name: 'random', topic: 'Off-topic, links, pets and wins' }, { id: 'ch_help', name: 'help-desk', topic: 'Ask for help: IT, access, how-tos' }];
const VOICES = ['buttery', 'airy', 'glassy', 'rounded'];
const fmtDay = t => { const d = new Date(t), n = new Date(); const y = new Date(n); y.setDate(n.getDate() - 1); return d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); };
const fmtHM = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ---------- conversations ---------- */
function channels() {
  const out = CH_SEED.map(c => Object.assign({}, c));
  for (const [id, c] of Store.col('chans')) if (c && typeof c.name === 'string' && !c.gone) out.push({ id: 'ch_' + id, name: str(c.name, 30), topic: str(c.topic, 120), ann: !!c.ann, by: c.by, own: id });
  return out;
}
const chanOf = id => channels().find(c => c.id === id);
function convTitle(c) { if (c === 'room') return 'This area' + (me.zone ? ': ' + me.zone.name : ''); const ch = chanOf(c); if (ch) return '# ' + ch.name; const t = Store.col('threads').get(c); return t ? threadName([c, t]) : 'Conversation'; }
const canPost = c => { const ch = chanOf(c); return !ch || !ch.ann || net.admin || !Store.db; };
function sendMsg(conv, text, extra) {
  text = String(text || '').trim().slice(0, 2000); extra = extra || {}; if (!text && !extra.att) return false;
  if (!canPost(conv)) { toast('Only admins can post in #announcements. React or reply in #general.'); return false; }
  const mn = mentionsIn(text), base = Object.assign({ text, by: me.uid, nm: me.name, t: Date.now() }, mn.length ? { mn } : {}, extra.rp ? { rp: extra.rp } : {}, extra.att ? { att: extra.att } : {}, extra.v ? { v: 1 } : {}, extra.poll ? { poll: extra.poll } : {});
  if (conv === 'all' || conv === 'room' || conv.startsWith('ch_')) {
    const sc = conv === 'room' ? (me.zone ? me.zone.id : 'all') : conv; Store.set('chat', Store.id(), Object.assign(base, { sc }));
    if ((conv === 'all' || conv === 'room') && text) { me.say = text.slice(0, 240); me.saySc = sc; me.sayN++; me.av.say(me.say); }
    trim('chat', 2400);
  } else { Store.set('dms', Store.id(), Object.assign(base, { th: conv })); trim('dms', 2400); }
  markRead(conv); return true;
}
function trim(col, max) { const all = [...Store.col(col)]; if (all.length > max && (net.admin || !window.OFFICE_WP)) all.sort((a, b) => num(a[1].t, 0) - num(b[1].t, 0)).slice(0, 100).forEach(([id]) => Store.del(col, id)); }
function msgCol(conv) { return conv === 'all' || conv === 'room' || conv.startsWith('ch_') ? 'chat' : 'dms'; }
function mentionsIn(text) { const out = new Set(); if (!/@/.test(text)) return []; const low = text.toLowerCase(); for (const r of allPeople()) if (r.uid && r.nm && !r.me) { const n = r.nm.toLowerCase(), f = n.split(' ')[0]; if (low.includes('@' + n) || low.includes('@' + f)) out.add(r.uid); } if (/@(everyone|here|all)\b/i.test(text)) out.add('*'); return [...out]; }
const rxOf = mid => { const m = new Map(); for (const [, r] of Store.col('rx')) if (r && r.m === mid && RX[r.e]) { const a = m.get(r.e) || []; a.push(r.u); m.set(r.e, a); } return m; };
function toggleRx(mid, e) { const id = mid + '~' + me.uid + '~' + e; if (Store.col('rx').get(id)) Store.del('rx', id); else Store.set('rx', id, { m: mid, u: me.uid, e, t: Date.now() }); }
const allUnread = () => { let n = totalUnread(); for (const c of channels()) n += unread(c.id); return n; };

/* ---------- the Talk window ---------- */
function buildTalk() {
  const w = el('section', { id: 'talk', class: 'island', role: 'dialog', 'aria-label': 'HQ Talk', hidden: true });
  w.innerHTML = `<aside class="tk-side"><div class="tk-head"><b>HQ Talk</b><span class="tk-sub">messages, calls and files, no external apps</span></div>
    <input id="tkSearch" type="search" placeholder="Search messages" aria-label="Search messages"><div id="tkList" class="tk-list"></div>
    <div class="tk-foot"><button class="btn sm" id="tkNewDm">+ Direct or group</button><button class="btn sm ghost" id="tkNewCh">+ Channel</button></div></aside>
    <section class="tk-main"><header class="tk-top"><button class="tk-back" id="tkBack" aria-label="Back to conversations">‹</button><div><h2 id="tkTitle"></h2><small id="tkTopic"></small></div><div class="tk-acts" id="tkActs"></div><button class="tk-x" id="tkX" aria-label="Close Talk">×</button></header>
    <div id="tkPins" class="tk-pins" hidden></div><div id="tkLog" class="tk-log" aria-live="polite"></div><div id="tkTyping" class="tk-typing"></div>
    <div id="tkReply" class="tk-reply" hidden></div><div id="tkMention" class="tk-mention" hidden></div>
    <form id="tkForm" class="tk-form"><label class="tk-ic" title="Attach a file" for="tkFile">📎</label><input id="tkFile" type="file" hidden><textarea id="tkIn" rows="1" maxlength="2000" placeholder="Message" aria-label="Message"></textarea><button type="button" class="tk-ic" id="tkMic" title="Dictate (speak instead of typing)" hidden>🎙</button><button class="btn sm" type="submit">Send</button></form></section>`;
  document.body.append(w);
  $('#tkX').onclick = () => talk(false); $('#tkBack').onclick = () => w.classList.remove('conv');
  $('#tkSearch').addEventListener('input', e => { V5.q = e.target.value.trim().toLowerCase(); renderTalk(); });
  $('#tkNewDm').onclick = () => newDmSheet(); $('#tkNewCh').onclick = () => newChannelSheet();
  const inp = $('#tkIn');
  inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(160, inp.scrollHeight) + 'px'; V5.typingT = Date.now(); mentionSuggest(); });
  inp.addEventListener('keydown', e => {
    const box = $('#tkMention'); if (!box.hidden) { const items = [...box.children]; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { V5.mentionIx = (V5.mentionIx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((b, i) => b.classList.toggle('sel', i === V5.mentionIx)); e.preventDefault(); return; } if ((e.key === 'Enter' || e.key === 'Tab') && items[V5.mentionIx]) { items[V5.mentionIx].click(); e.preventDefault(); return; } if (e.key === 'Escape') { box.hidden = true; return; } }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#tkForm').requestSubmit(); }
    else if (e.key === 'ArrowUp' && !inp.value) { const mine = msgsOf(V5.conv).filter(([, m]) => m.by === me.uid && !m.del).sort((a, b) => num(b[1].t, 0) - num(a[1].t, 0))[0]; if (mine) { startEdit(mine[0], mine[1]); e.preventDefault(); } }
    else if (e.key === 'Escape') { if (V5.edit || V5.reply) { V5.edit = V5.reply = null; inp.value = ''; renderReply(); } else talk(false); }
  });
  $('#tkForm').addEventListener('submit', e => { e.preventDefault(); const t = inp.value;
    if (V5.edit) { const cur = Store.col(V5.edit.col).get(V5.edit.id); if (cur && cur.by === me.uid && t.trim()) Store.set(V5.edit.col, V5.edit.id, Object.assign({}, cur, { text: t.trim().slice(0, 2000), ed: Date.now(), mn: mentionsIn(t) })); V5.edit = null; inp.value = ''; renderReply(); inp.style.height = 'auto'; return; }
    if (sendMsg(V5.conv, t, { rp: V5.reply && V5.reply.id, att: V5.att })) { inp.value = ''; inp.style.height = 'auto'; V5.reply = null; V5.att = null; renderReply(); } });
  $('#tkFile').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > MAX_UP()) { toast('Files up to ' + Math.round(MAX_UP() / 1048576) + ' MB here.'); return; }
    V5.att = { name: str(f.name, 120), size: f.size, type: str(f.type, 80), up: true }; renderReply();
    try { let asset = null, url = null; if (Store.db) { if (!net.assets) throw new Error('no-assets'); const r = await net.assets.upload(f); asset = r.id; url = r.url || null; } else url = URL.createObjectURL(f);
      V5.att = { name: str(f.name, 120), size: f.size, type: str(f.type, 80), asset, url: url && /^https?:|^blob:/.test(url) ? url : null };
      Store.set('files', Store.id(), Object.assign({ by: me.uid, nm: me.name, t: Date.now(), via: convTitle(V5.conv) }, V5.att)); renderReply(); inp.focus(); }
    catch (er) { V5.att = null; renderReply(); toast(er.message === 'no-assets' ? 'Uploads need Contributor access. Ask the owner.' : 'Upload failed. Images, PDF, video, CSV, Markdown, JSON and text up to 20 MB.'); } });
  $('#tkMic').onclick = () => dictateInto(inp, $('#tkMic'));
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); talk(true); $('#tkSearch').focus(); } });
}
function talk(open, conv) {
  V5.open = open !== undefined ? !!open : !V5.open; const w = $('#talk'); w.hidden = !V5.open; $('#bTalk').classList.toggle('on', V5.open);
  if (conv) V5.conv = conv; if (V5.open) { if (conv) w.classList.add('conv'); renderTalk(); markRead(V5.conv); setTimeout(() => $('#tkIn').focus(), 30); } else canvas.focus();
}
function openConv(c) { V5.conv = c; V5.reply = V5.edit = null; V5.q = ''; $('#tkSearch').value = ''; $('#talk').classList.add('conv'); markRead(c); renderTalk(); renderReply(); $('#tkIn').focus(); }
function renderTalkBadge() { const n = allUnread(); const b = $('#nTalk'); if (b) { b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n); } document.title = (n ? '(' + n + ') ' : '') + (conf.name || 'StartDotCom HQ'); }
function renderTalk() {
  renderTalkBadge(); if (!V5.open) return;
  const list = $('#tkList'), row = (c, label, sub, icon) => { const u = unread(c); return el('button', { class: 'tk-row' + (c === V5.conv ? ' sel' : '') + (u ? ' unread' : ''), onclick: () => openConv(c) }, el('span', { class: 'tk-ico', text: icon }), el('span', { class: 'tk-lbl' }, el('b', { text: label }), sub ? el('small', { text: sub }) : null), u ? el('span', { class: 'n', text: String(u) }) : null); };
  const ts = myThreads().sort((a, c) => lastMsgT(c[0]) - lastMsgT(a[0]));
  list.replaceChildren(el('div', { class: 'tk-sec', text: 'Channels' }), ...channels().map(c => row(c.id, c.name, '', c.ann ? '📣' : '#')), row('room', 'This area', me.zone ? me.zone.name : '', '📍'),
    el('div', { class: 'tk-sec', text: 'Direct and groups' }), ...(ts.length ? ts.map(t => { const others = t[1].mem.filter(u => u !== me.uid); const on = others.some(u => [...peers.values()].some(p => p.uid === u)); return row(t[0], threadName(t), t[1].mem.length > 2 ? t[1].mem.length + ' people' : on ? 'In the office' : '', t[1].mem.length > 2 ? '👥' : on ? '🟢' : '⚪'); }) : [el('p', { class: 'meta', text: 'Click anyone in the office, or + Direct or group.' })]));
  const ch = chanOf(V5.conv); $('#tkTitle').textContent = convTitle(V5.conv); $('#tkTopic').textContent = V5.q ? 'Search results' : ch ? ch.topic : V5.conv === 'room' ? 'Only people in the same area see these' : (() => { const t = Store.col('threads').get(V5.conv); return t ? t.mem.length + ' members' : ''; })();
  const acts = $('#tkActs'); acts.replaceChildren();
  if (!V5.q && V5.conv !== 'room') { const t = Store.col('threads').get(V5.conv);
    if (t) acts.append(el('button', { class: 'btn sm', text: '📞 Call', title: 'Voice call (built in)', onclick: () => startCall(t.mem.filter(u => u !== me.uid), false) }), el('button', { class: 'btn sm ghost', text: '🎥 Video', onclick: () => startCall(t.mem.filter(u => u !== me.uid), true) }));
    else if (ch && ch.own && (ch.by === me.uid || net.admin)) acts.append(el('button', { class: 'btn sm ghost', text: 'Archive', onclick: () => { const c0 = Store.col('chans').get(ch.own); if (c0) Store.set('chans', ch.own, Object.assign({}, c0, { gone: 1 })); openConv('all'); } })); }
  const pins = [...Store.col('pins')].filter(([, p]) => p && p.c === V5.conv), pb = $('#tkPins'); pb.hidden = !pins.length || !!V5.q;
  if (pins.length) pb.replaceChildren(el('b', { text: '📌 Pinned' }), ...pins.map(([mid]) => { const m = Store.col(msgCol(V5.conv)).get(mid); return m ? el('button', { class: 'tk-pin', text: nameOf(m.by, m.nm) + ': ' + str(m.text, 80), onclick: () => jumpTo(mid) }) : null; }));
  const log = $('#tkLog'), atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  let ms;
  if (V5.q) { ms = []; for (const c of channels().map(c => c.id).concat(['room'], myThreads().map(t => t[0]))) for (const [id, m] of msgsOf(c)) if (!m.del && (str(m.text, 2000).toLowerCase().includes(V5.q) || (m.att && str(m.att.name, 120).toLowerCase().includes(V5.q)))) ms.push([id, m, c]); ms.sort((a, b) => num(b[1].t, 0) - num(a[1].t, 0)); ms = ms.slice(0, 60).reverse(); }
  else ms = msgsOf(V5.conv).map(([id, m]) => [id, m, V5.conv]).sort((a, b) => num(a[1].t, 0) - num(b[1].t, 0)).slice(-250);
  const out = []; let lastDay = '', lastBy = '', lastT = 0;
  for (const [id, m, c] of ms) {
    const t = num(m.t, 0), day = fmtDay(t); if (day !== lastDay) { out.push(el('div', { class: 'tk-day' }, el('span', { text: day }))); lastDay = day; lastBy = ''; }
    const grouped = !V5.q && m.by === lastBy && t - lastT < 5 * 60000 && !m.rp; lastBy = m.by; lastT = t; out.push(msgEl(id, m, c, grouped));
  }
  if (!out.length) out.push(el('div', { class: 'tk-empty' }, el('b', { text: V5.q ? 'Nothing found.' : 'No messages yet.' }), el('span', { text: V5.q ? 'Try another word.' : V5.conv === 'ch_ann' ? 'Admins post company news here.' : 'Say hello. Type @ to mention someone, 📎 to share a file.' })));
  log.replaceChildren(...out); if (atBottom || V5.forceBottom) { log.scrollTop = log.scrollHeight; V5.forceBottom = false; }
  const typers = [...peers.values()].filter(p => PRES(p).typ === V5.conv && p.uid !== me.uid).map(p => nameOf(p.uid, p.nick)); $('#tkTyping').textContent = typers.length ? typers.slice(0, 3).join(', ') + (typers.length > 1 ? ' are' : ' is') + ' typing…' : '';
  $('#tkIn').disabled = !canPost(V5.conv); $('#tkIn').placeholder = canPost(V5.conv) ? 'Message ' + convTitle(V5.conv) + ' (Enter to send, Shift+Enter for a new line)' : 'Only admins post here';
  if (!$('#talk').hidden && document.hasFocus()) markRead(V5.conv);
}
function faceFor(uid) { if (uid === me.uid) return humanThumb(me.cfg.m); for (const p of peers.values()) if (p.uid === uid) return humanThumb(cleanCfg(PRES(p).av).m); const d = Store.col('people').get(uid); return d && d.av ? humanThumb(cleanCfg(d.av).m) : ''; }
function linkify(text, mn) {
  const frag = []; const re = /(https?:\/\/[^\s<>"']{3,300})|(@[A-Za-z][\w.-]{1,30}(?: [A-Z][\w-]{1,20})?)/g; let i = 0, m;
  while ((m = re.exec(text))) { if (m.index > i) frag.push(document.createTextNode(text.slice(i, m.index)));
    if (m[1]) frag.push(el('a', { href: m[1], target: '_blank', rel: 'noopener noreferrer', text: m[1].length > 60 ? m[1].slice(0, 57) + '…' : m[1] })); else frag.push(el('span', { class: 'tk-at' + ((mn || []).includes(me.uid) ? ' me' : ''), text: m[2] }));
    i = m.index + m[0].length; }
  if (i < text.length) frag.push(document.createTextNode(text.slice(i))); return frag;
}
function attEl(a) {
  if (!a || typeof a !== 'object') return null; const href = a.asset ? fileHref({ asset: a.asset }) : (typeof a.url === 'string' && /^https?:|^blob:/.test(a.url) ? a.url : null), img = /^image\//.test(a.type || '');
  if (/^audio\//.test(a.type || '') && href) return el('div', { class: 'tk-att' }, el('audio', { controls: true, preload: 'metadata', src: href }), el('small', { class: 'meta', text: '🎤 Voice note' + (a.secs ? ' · ' + Math.floor(a.secs / 60) + ':' + String(a.secs % 60).padStart(2, '0') : '') }));
  return el('div', { class: 'tk-att' }, img && href ? el('a', { href, target: '_blank', rel: 'noopener' }, el('img', { src: href, alt: str(a.name, 120), loading: 'lazy' })) : null,
    el('div', { class: 'tk-file' }, el('span', { text: img ? '🖼' : /pdf/.test(a.type || '') ? '📄' : /video/.test(a.type || '') ? '🎞' : '📎' }), el('b', { text: str(a.name, 120) }), el('small', { text: a.up ? 'uploading…' : num(a.size, 0) < 1048576 ? Math.max(1, Math.round(num(a.size, 0) / 1024)) + ' KB' : (num(a.size, 0) / 1048576).toFixed(1) + ' MB' }), href ? el('a', { class: 'btn sm ghost', href, target: '_blank', rel: 'noopener', text: 'Open' }) : null));
}
function msgEl(id, m, conv, grouped) {
  const col = msgCol(conv), mine = m.by === me.uid, face = faceFor(m.by), rx = rxOf(id);
  const body = el('div', { class: 'tk-body' });
  if (!grouped) body.append(el('div', { class: 'tk-meta' }, el('b', { text: nameOf(m.by, m.nm) }), el('time', { text: fmtHM(num(m.t, 0)), title: new Date(num(m.t, 0)).toLocaleString() }), m.v ? el('span', { class: 'tk-tag', text: '🎙 spoken' }) : null, V5.q ? el('span', { class: 'tk-tag', text: convTitle(conv) }) : null));
  if (m.rp) { const p = Store.col(col).get(m.rp); body.append(el('button', { class: 'tk-quote', onclick: () => jumpTo(m.rp) }, el('b', { text: p ? nameOf(p.by, p.nm) : 'Message' }), el('span', { text: p ? (p.del ? 'deleted' : str(p.text, 120)) : 'not available' }))); }
  if (m.del) body.append(el('div', { class: 'tk-text del', text: 'Message deleted' }));
  else { if (m.text) body.append(el('div', { class: 'tk-text' }, ...linkify(str(m.text, 2000), m.mn), m.ed ? el('small', { class: 'tk-ed', text: ' (edited)' }) : null)); const a = attEl(m.att); if (a) body.append(a); const pl = pollEl(id, m); if (pl) body.append(pl); }
  if (rx.size) body.append(el('div', { class: 'tk-rx' }, ...[...rx].map(([e, us]) => el('button', { class: 'tk-rxb' + (us.includes(me.uid) ? ' on' : ''), title: us.map(u => nameOf(u)).join(', '), onclick: () => toggleRx(id, e) }, RX[e] + ' ' + us.length))));
  const tools = el('div', { class: 'tk-tools' }, ...RX.slice(0, 4).map((e, i) => el('button', { title: 'React ' + e, text: e, onclick: () => toggleRx(id, i) })), el('button', { title: 'More reactions', text: '＋', onclick: ev => moreRx(ev.currentTarget, id) }),
    el('button', { title: 'Reply', text: '↩', onclick: () => { V5.reply = { id, nm: nameOf(m.by, m.nm), text: str(m.text, 80) }; V5.edit = null; renderReply(); $('#tkIn').focus(); } }),
    el('button', { title: Store.col('pins').get(id) ? 'Unpin' : 'Pin to the top', text: '📌', onclick: () => { if (Store.col('pins').get(id)) Store.del('pins', id); else Store.set('pins', id, { c: conv, by: me.uid, t: Date.now() }); } }),
    mine && !m.del ? el('button', { title: 'Edit', text: '✏️', onclick: () => startEdit(id, m) }) : null,
    (mine || net.admin) && !m.del ? el('button', { title: 'Delete', text: '🗑', onclick: () => confirmBox('Delete this message for everyone?', 'Delete', () => Store.set(col, id, Object.assign({}, m, { text: '', att: null, del: 1 }))) }) : null);
  return el('div', { class: 'tk-msg' + (grouped ? ' grp' : '') + (mine ? ' mine' : '') + ((m.mn || []).includes(me.uid) ? ' ment' : ''), id: 'm_' + id }, grouped ? el('span', { class: 'tk-av gap' }) : el('span', { class: 'tk-av', style: face ? 'background-image:url(' + face + ')' : '', text: face ? '' : initials(nameOf(m.by, m.nm)) }), body, tools);
}
function moreRx(btn, id) { const pop = el('div', { class: 'tk-pop island' }, ...RX.map((e, i) => el('button', { text: e, onclick: () => { toggleRx(id, i); pop.remove(); } }))); btn.parentElement.append(pop); setTimeout(() => addEventListener('click', function f(ev) { if (!pop.contains(ev.target)) { pop.remove(); removeEventListener('click', f, true); } }, true), 0); }
function startEdit(id, m) { V5.edit = { id, col: msgCol(V5.conv) }; V5.reply = null; $('#tkIn').value = str(m.text, 2000); renderReply(); $('#tkIn').focus(); }
function jumpTo(mid) { const e = document.getElementById('m_' + mid); if (e) { e.scrollIntoView({ block: 'center', behavior: 'smooth' }); e.classList.add('flash'); setTimeout(() => e.classList.remove('flash'), 1600); } }
function renderReply() { const r = $('#tkReply'), a = V5.att; r.hidden = !(V5.reply || V5.edit || a); r.replaceChildren(...(V5.edit ? [el('span', { text: '✏️ Editing your message' })] : V5.reply ? [el('span', { text: '↩ Replying to ' + V5.reply.nm + ': ' + V5.reply.text })] : []), a ? el('span', { text: (a.up ? '⏳ ' : '📎 ') + a.name }) : null, el('button', { text: '×', 'aria-label': 'Cancel', onclick: () => { V5.reply = V5.edit = V5.att = null; renderReply(); } })); }
function confirmBox(text, ok, fn) { const t = toast(text, { ms: 9000, action: { label: ok, fn } }); return t; }
function mentionSuggest() {
  const inp = $('#tkIn'), box = $('#tkMention'), v = inp.value.slice(0, inp.selectionStart), m = /@([\w.-]{0,20})$/.exec(v); if (!m) { box.hidden = true; return; }
  const q = m[1].toLowerCase(), opts = allPeople().filter(r => r.uid && !r.me && r.nm.toLowerCase().includes(q)).slice(0, 6).map(r => ({ label: r.nm, sub: r.role || '', ins: r.nm })).concat('everyone'.startsWith(q) ? [{ label: 'everyone', sub: 'Notify everyone in this conversation', ins: 'everyone' }] : []);
  if (!opts.length) { box.hidden = true; return; } V5.mentionIx = 0; box.hidden = false;
  box.replaceChildren(...opts.map((o, i) => el('button', { type: 'button', class: i === 0 ? 'sel' : '', onclick: () => { const s = inp.selectionStart; inp.value = v.slice(0, m.index) + '@' + o.ins + ' ' + inp.value.slice(s); box.hidden = true; inp.focus(); } }, el('b', { text: '@' + o.label }), el('small', { text: ' ' + o.sub }))));
}
function newDmSheet() {
  const pick = new Set(), nm = el('input', { type: 'text', maxLength: 40, placeholder: 'Group name (optional)' }), ppl = allPeople().filter(r => r.uid && !r.me);
  const box = el('div', { class: 'tk-sheet island' }, el('h3', { text: 'New direct or group chat' }), ...(ppl.length ? ppl.map(r => el('label', { class: 'tog' }, el('input', { type: 'checkbox', onchange: e => { e.target.checked ? pick.add(r.uid) : pick.delete(r.uid); } }), el('span', {}, r.nm, el('small', { text: (r.online ? '🟢 ' : '') + (r.role || '') })))) : [el('p', { text: 'Nobody else has joined yet.' })]),
    field('Group name', nm), el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Start', onclick: () => { if (!pick.size) return; box.remove(); openThread([...pick], pick.size > 1 ? nm.value.trim() : ''); talk(true, me.conv); } }), el('button', { class: 'btn sm ghost', text: 'Cancel', onclick: () => box.remove() })));
  $('#talk').append(box);
}
function newChannelSheet() {
  const nm = el('input', { type: 'text', maxLength: 30, placeholder: 'e.g. product-launch' }), tp = el('input', { type: 'text', maxLength: 120, placeholder: 'What is it for?' }), an = el('input', { type: 'checkbox' });
  const box = el('div', { class: 'tk-sheet island' }, el('h3', { text: 'New channel' }), el('p', { class: 'meta', text: 'Channels are open to everyone in the office.' }), field('Name', nm), field('Topic', tp), net.admin ? el('label', { class: 'tog' }, an, el('span', {}, 'Admins only can post', el('small', { text: 'For announcements' }))) : null,
    el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Create', onclick: () => { const n = nm.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); if (!n) return; const id = Store.id(); Store.set('chans', id, { name: n, topic: tp.value.trim().slice(0, 120), ann: an.checked && net.admin, by: me.uid, t: Date.now() }); box.remove(); openConv('ch_' + id); } }), el('button', { class: 'btn sm ghost', text: 'Cancel', onclick: () => box.remove() })));
  $('#talk').append(box); nm.focus();
}

/* ---------- notifications for new messages: sound, toast, @mentions, desktop alert when the tab is hidden ---------- */
function canSee(m, col) { if (col === 'dms') { const t = Store.col('threads').get(m.th); return !!(t && Array.isArray(t.mem) && t.mem.includes(me.uid)); } return !m.sc || m.sc === 'all' || m.sc.startsWith('ch_') || m.sc === (me.zone && me.zone.id); }
function onNewMsgs(col, map) {
  const key = col === 'chat' ? 'chatSeen' : 'dmSeen5'; if (!V5[key]) { V5[key] = new Set(map.keys()); return; }
  for (const [id, m] of map) { if (V5[key].has(id)) continue; V5[key].add(id); if (!m || m.by === me.uid || m.del || !canSee(m, col)) continue;
    const conv = col === 'dms' ? m.th : m.sc && m.sc.startsWith('ch_') ? m.sc : (!m.sc || m.sc === 'all') ? 'all' : 'room', mentioned = (m.mn || []).includes(me.uid) || ((m.mn || []).includes('*') && conv !== 'all');
    const viewing = V5.open && V5.conv === conv && document.hasFocus();
    if (m.v && (conv === 'room' || conv === 'all') && V5.canSpeak) { if (local.readAloud) speakMsg(m); else if (!V5.askedRead) { V5.askedRead = true; toast('🎙 ' + nameOf(m.by, m.nm) + ' said: ' + str(m.text, 90), { ms: 12000, action: { label: '🔊 Read spoken messages aloud', fn: () => { local.readAloud = true; LS.set('local', local); speakMsg(m); } } }); } }
    if (mentioned && !viewing) { sfx('msg'); toast('🔔 ' + nameOf(m.by, m.nm) + ' mentioned you in ' + convTitle(conv) + ': ' + str(m.text, 90), { ms: 9000, action: { label: 'Open', fn: () => talk(true, conv) } }); }
    else if (col === 'chat' && conv.startsWith('ch_') && !viewing && conv === 'ch_ann') toast('📣 ' + str(m.text, 120), { ms: 9000, action: { label: 'Open', fn: () => talk(true, conv) } });
    if ((mentioned || col === 'dms') && document.hidden && local.desk && window.Notification && Notification.permission === 'granted') { try { new Notification(nameOf(m.by, m.nm) + ' · ' + convTitle(conv), { body: str(m.text, 140) || 'Sent a file', tag: 'hq-' + conv }); } catch (e) { } }
  }
  renderTalk();
}

/* ---------- speech: hold-to-talk and dictation (Zuchera dictation/voice, or the browser's own) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
async function initSpeech() {
  const c = window.claude; const use = n => c && c.use ? Promise.resolve().then(() => c.use(n)).catch(() => null) : Promise.resolve(null);
  if (!window.OFFICE_STANDALONE) { const [d, t] = await Promise.all([use('dictation'), use('tts')]); V5.dict = d; V5.tts = t; if (d) { d.onPartial(x => V5.onPart && V5.onPart(x.text)); d.onFinal(x => V5.onFin && V5.onFin(x.text)); d.onState(s => { if (s.state === 'idle' && V5.onIdle) V5.onIdle(s.reason); }); } }
  V5.canListen = !!(V5.dict || SR); V5.canSpeak = !!(V5.tts || window.speechSynthesis);
  $('#bPtt').hidden = !V5.canListen; $('#tkMic').hidden = !V5.canListen;
}
function listen(onPart, onFin, onIdle) {
  V5.onPart = onPart; V5.onFin = onFin; V5.onIdle = onIdle;
  if (V5.dict) return V5.dict.start().catch(e => { V5.onIdle && V5.onIdle(e && e.code || 'error'); if (e && e.code === 'not_granted') toast('Microphone access was declined, so typing it is.'); });
  if (!SR) return Promise.reject(new Error('no-speech')); const r = new SR(); V5.sr = r; r.interimResults = true; r.continuous = true; r.lang = navigator.language || 'en-GB';
  r.onresult = e => { let fin = '', part = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else part += e.results[i][0].transcript; } if (part) onPart(part); if (fin) onFin(fin); };
  r.onend = () => { V5.sr = null; onIdle && onIdle('stopped'); }; r.onerror = e => { if (e.error === 'not-allowed') toast('Microphone access was declined.'); };
  try { r.start(); } catch (e) { } return Promise.resolve();
}
function stopListen() { if (V5.dict) return V5.dict.stop().catch(() => { }); if (V5.sr) { try { V5.sr.stop(); } catch (e) { } } return Promise.resolve(); }
function speakMsg(m) {
  const text = nameOf(m.by, m.nm) + ' says: ' + str(m.text, 400); const vc = (Store.col('people').get(m.by) || {}).vc, vi = Math.max(0, VOICES.indexOf(vc));
  if (V5.tts) { V5.tts.speak(text, { voice: VOICES[vi] }).catch(() => { }); return; }
  if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (vs.length) u.voice = vs[vi % vs.length]; u.rate = 1.04; speechSynthesis.speak(u); } catch (e) { } }
}
function dictateInto(inp, btn) {
  if (V5.listening) { stopListen(); return; } V5.listening = true; btn.classList.add('rec'); const base = inp.value ? inp.value.replace(/\s*$/, ' ') : ''; let fin = '';
  listen(p => { inp.value = base + fin + p; }, f => { fin += f + ' '; inp.value = base + fin; }, () => { V5.listening = false; btn.classList.remove('rec'); inp.focus(); });
}
/* hold to talk: what you say appears over your head and in this area's chat, and nearby people can hear it read out */
const PTT = { on: false, text: '', part: '' };
function pttStart() {
  if (PTT.on || !V5.canListen) return; PTT.on = true; PTT.text = ''; PTT.part = ''; $('#bPtt').classList.add('rec'); $('#ptt').hidden = false; $('#pttTxt').textContent = 'Listening… let go to send';
  listen(p => { PTT.part = p; $('#pttTxt').textContent = PTT.text + p; me.av.say((PTT.text + p).slice(-120)); }, f => { PTT.text += f + ' '; PTT.part = ''; $('#pttTxt').textContent = PTT.text; }, () => pttFlush());
}
function pttEnd() { if (!PTT.on) return; PTT.on = false; $('#bPtt').classList.remove('rec'); stopListen().then(() => setTimeout(pttFlush, 350)); }
function pttFlush() { if (PTT.on) return; $('#ptt').hidden = true; const t = (PTT.text + PTT.part).trim(); PTT.text = PTT.part = ''; if (!t) return; sendMsg('room', t, { v: 1 }); }

/* ============================ HQ Calls: voice, video and screen share between browsers (WebRTC) ============================
   Runs in the self-hosted office (it needs the camera and microphone, which the Zuchera preview frame does not allow).
   Signalling travels over the office's private realtime channel; media goes browser to browser. */
const RTC = { ok: false, voice: false, muted: false, local: null, mic: null, cam: null, scr: null, call: null, peers: new Map(), pend: {}, back: {}, ice: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }], actx: null, ring: null, myLvl: 0, rc: null };
function rtcInit() {
  RTC.ok = !!(window.OFFICE_STANDALONE && window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const C = window.OFFICE_CONFIG || {}; if (Array.isArray(C.iceServers) && C.iceServers.length) RTC.ice = C.iceServers;
  if (RTC.ok && net.room && typeof net.room.on === 'function') net.room.on('rtc', (d, meta) => onSig(d, meta).catch(e => console.warn('rtc', e)));
}
const sig = (to, k, d, c) => { if (net.room && net.room.emit) net.room.emit('rtc', { to, from: me.peer, k, d, c: c || null }).catch(() => { }); };
function peerKeysOf(uids) { const out = []; for (const [k, p] of peers) if (p.uid && uids.includes(p.uid)) out.push(k); return out; }
async function voiceOn(video) {
  if (!RTC.ok) { voiceInfo(); return false; }
  try {
    if (!RTC.local) { RTC.local = new MediaStream(); }
    if (!RTC.mic) { const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, deviceId: local.micId ? { ideal: local.micId } : undefined } }); RTC.mic = s.getAudioTracks()[0]; RTC.local.addTrack(RTC.mic); RTC.myAna = analyser(new MediaStream([RTC.mic])); }
    RTC.voice = true; RTC.mic.enabled = !RTC.muted; if (video) await camOn(true); renderCall(); return true;
  } catch (e) { toast(e && e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in the address bar, then try again.' : 'No microphone found. Plug one in or check your browser settings.', { ms: 9000 }); return false; }
}
function voiceOff() {
  for (const k of [...RTC.peers.keys()]) dropPeer(k, true); if (RTC.call) leaveCall(true);
  for (const t of [RTC.mic, RTC.cam, RTC.scr]) if (t) t.stop(); RTC.mic = RTC.cam = RTC.scr = null; RTC.local = null; RTC.voice = false; RTC.rc = null; renderCall();
}
async function camOn(on) {
  if (on && !RTC.cam) { try { const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 }, deviceId: local.camId ? { ideal: local.camId } : undefined } }); RTC.cam = s.getVideoTracks()[0]; } catch (e) { toast('Camera unavailable or blocked.'); return; } }
  if (!on && RTC.cam) { RTC.cam.stop(); RTC.cam = null; } pushVideo(); renderCall();
}
async function shareScreen(on) {
  if (on) { try { const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 12 }, audio: false }); RTC.scr = s.getVideoTracks()[0]; RTC.scr.onended = () => shareScreen(false); } catch (e) { return; } }
  else if (RTC.scr) { RTC.scr.onended = null; RTC.scr.stop(); RTC.scr = null; } pushVideo(); renderCall();
}
const myVideo = () => RTC.scr || RTC.cam || null;
function pushVideo() { const v = myVideo(); for (const P of RTC.peers.values()) if (P.call && P.vt) P.vt.sender.replaceTrack(v).catch(() => { }); }
function analyser(stream) { try { if (!RTC.actx) RTC.actx = new (window.AudioContext || window.webkitAudioContext)(); const src = RTC.actx.createMediaStreamSource(stream), a = RTC.actx.createAnalyser(); a.fftSize = 512; src.connect(a); return { a, buf: new Uint8Array(a.fftSize) }; } catch (e) { return null; } }
function level(an) { if (!an) return 0; an.a.getByteTimeDomainData(an.buf); let s = 0; for (const v of an.buf) { const x = (v - 128) / 128; s += x * x; } return Math.sqrt(s / an.buf.length); }
/* the lower id always offers and the other side only answers; audio and video slots exist from the start, so cameras and screen shares only swap tracks */
function mkPeer(key, call, cid, responder) {
  const pc = new RTCPeerConnection({ iceServers: RTC.ice }), P = { cid: cid || Store.id(), retries: 0, key, pc, call: !!call, responder: !!responder, audio: new Audio(), ana: null, vstream: null, born: Date.now(), lvl: 0 };
  P.audio.autoplay = true; P.audio.setAttribute('playsinline', ''); P.audio.style.display = 'none'; document.body.append(P.audio);
  pc.onicecandidate = e => { if (e.candidate) sig(key, 'ice', e.candidate.toJSON(), P.cid); };
  pc.ontrack = e => { if (e.track.kind === 'audio') { const s0 = new MediaStream([e.track]); P.audio.srcObject = s0; P.audio.play().catch(() => { }); P.ana = analyser(s0); } else { P.vstream = new MediaStream([e.track]); e.track.onunmute = () => renderCall(); e.track.onmute = () => renderCall(); renderCall(); } };
  pc.onconnectionstatechange = () => { const st = pc.connectionState; if (st === 'failed' || st === 'closed') dropPeer(key); renderCall(); };
  RTC.peers.set(key, P);
  if (!responder) { P.at = pc.addTransceiver('audio', { direction: 'sendrecv' }); P.vt = pc.addTransceiver('video', { direction: 'sendrecv' }); if (RTC.mic) P.at.sender.replaceTrack(RTC.mic); if (P.call && myVideo()) P.vt.sender.replaceTrack(myVideo());
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => sig(key, 'sdp', { type: 'offer', sdp: pc.localDescription.sdp }, P.cid)).catch(e => console.warn('rtc offer', e)); }
  return P;
}
function dropPeer(key, silent) { const P = RTC.peers.get(key); if (!P) return; RTC.peers.delete(key); try { P.pc.close(); } catch (e) { } P.audio.srcObject = null; P.audio.remove(); if (!silent) sig(key, 'bye', null); renderCall(); }
async function onSig(m) {
  if (!m || m.to !== me.peer || typeof m.from !== 'string' || m.from === me.peer) return; const from = m.from;
  if (m.k === 'ring') return incomingCall(from, m.d || {});
  if (m.k === 'invite') { const p = peers.get(from), r = m.d && (W.rooms || []).find(x => x.id === m.d.rc); if (p && r) toast('📩 ' + nameOf(p.uid, p.nick) + ' invited you to the ' + r.name + ' call.', { ms: 15000, action: { label: 'Join', fn: () => joinRoomCall(r) } }); return; }
  if (m.k === 'accept') { if (RTC.call && m.d && m.d.id === RTC.call.id) { RTC.call.keys.add(from); RTC.call.pending.delete(from); stopRing(); rosterOut(); renderCall(); } return; }
  if (m.k === 'decline') { if (RTC.call && m.d && m.d.id === RTC.call.id) { RTC.call.pending.delete(from); const p = peers.get(from); toast((p ? nameOf(p.uid, p.nick) : 'They') + (m.d.busy ? ' is on another call.' : ' can\'t talk right now.') + ' Send a message instead?', { ms: 8000, action: { label: 'Message', fn: () => p && p.uid && (openThread([p.uid]), talk(true, me.conv)) } }); if (!RTC.call.keys.size && !RTC.call.pending.size) leaveCall(); } return; }
  if (m.k === 'roster') { if (RTC.call && m.d && m.d.id === RTC.call.id && Array.isArray(m.d.keys)) { for (const k of m.d.keys) if (k !== me.peer && typeof k === 'string') RTC.call.keys.add(k); RTC.call.keys.add(from); renderCall(); } return; }
  if (m.k === 'leave') { if (RTC.call && m.d && m.d.id === RTC.call.id) { RTC.call.keys.delete(from); dropPeer(from, true); if (!RTC.call.keys.size && !RTC.call.pending.size) { toast('The call ended.'); leaveCall(true); } } return; }
  if (m.k === 'bye') { dropPeer(from, true); return; }
  if (m.k === 'nack') { const P0 = RTC.peers.get(from); if (P0 && P0.cid === m.c) { dropPeer(from, true); RTC.back[from] = Date.now() + 3000; } return; }
  let P = RTC.peers.get(from); const isOffer = m.k === 'sdp' && m.d && m.d.type === 'offer';
  if (P && m.c && P.cid !== m.c) { if (isOffer) { dropPeer(from, true); P = null; } else return; }          // a fresh start replaces ours; stale replies are ignored
  if (!P) { if (m.k === 'ice') { const q = RTC.pend[m.c] = RTC.pend[m.c] || []; if (q.length < 40) q.push(m.d); return; } if (!isOffer) return; if (!RTC.voice || !allowed(from)) { sig(from, 'nack', null, m.c); return; } P = mkPeer(from, isCallPeer(from), m.c, true); }
  const pc = P.pc, flush = async () => { for (const c of RTC.pend[P.cid] || []) { try { await pc.addIceCandidate(c); } catch (e) { } } delete RTC.pend[P.cid]; };
  if (m.k === 'sdp' && m.d && typeof m.d.sdp === 'string') {
    if (isOffer) { if (!P.responder || pc.remoteDescription) return; await pc.setRemoteDescription(m.d); await flush();
      for (const tr of pc.getTransceivers()) { const kind = tr.receiver.track && tr.receiver.track.kind; tr.direction = 'sendrecv'; if (kind === 'audio') { P.at = tr; if (RTC.mic) await tr.sender.replaceTrack(RTC.mic); } else if (kind === 'video') { P.vt = tr; if (P.call && myVideo()) await tr.sender.replaceTrack(myVideo()); } }
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); sig(from, 'sdp', { type: 'answer', sdp: pc.localDescription.sdp }, P.cid); }
    else if (!P.responder && pc.signalingState === 'have-local-offer') { await pc.setRemoteDescription(m.d); await flush(); } }
  else if (m.k === 'ice' && m.d) { if (!pc.remoteDescription) { const q = RTC.pend[P.cid] = RTC.pend[P.cid] || []; q.push(m.d); return; } try { await pc.addIceCandidate(m.d); } catch (e) { } }
}
const isCallPeer = k => !!(RTC.call && RTC.call.keys.has(k)) || !!(RTC.rc && peers.get(k) && PRES(peers.get(k)).rc === RTC.rc);
function allowed(k) { if (isCallPeer(k)) return true; const p = peers.get(k); if (!p) return false; const d = PRES(p); return !RTC.call && !RTC.rc && !!d.vo && !d.cl && !d.rc && p.zid === (me.zone && me.zone.id) && Math.hypot(p.x - me.pos.x, p.z - me.pos.z) < 9; }
function wanted() {
  const want = new Map(); if (!RTC.voice) return want;
  if (RTC.call) { for (const k of RTC.call.keys) if (peers.has(k)) want.set(k, true); return want; }
  if (RTC.rc) { for (const [k, p] of peers) if (PRES(p).rc === RTC.rc && PRES(p).vo) want.set(k, true); return want; }
  const near = []; for (const [k, p] of peers) { const d = PRES(p); if (!d.vo || d.cl || d.rc || p.zid !== (me.zone && me.zone.id)) continue; const dist = Math.hypot(p.x - me.pos.x, p.z - me.pos.z); if (dist < (RTC.peers.has(k) ? 8.5 : 6.5)) near.push([dist, k]); }
  near.sort((a, b) => a[0] - b[0]).slice(0, 8).forEach(([, k]) => want.set(k, false)); return want;
}
function rtcTick() {
  if (!RTC.ok) return; const want = wanted();
  for (const [k, call] of want) { let P = RTC.peers.get(k); if (P && P.call !== call && !P.responder) { dropPeer(k); P = null; } if (!P && String(me.peer) < String(k) && !(RTC.back[k] > Date.now())) mkPeer(k, call); }   // the lower id offers; the other side answers
  for (const [k, P] of RTC.peers) { const age = Date.now() - P.born, sg = P.pc.signalingState, cs = P.pc.connectionState;
    if (!want.has(k) && age > 4000) dropPeer(k);
    else if ((!P.responder && sg === 'have-local-offer' && age > 20000) || ((cs === 'new' || cs === 'failed' || cs === 'disconnected') && age > (P.responder ? 40000 : 25000))) { P.retries = (P.retries || 0) + 1; dropPeer(k); } }   // unanswered or stuck: start again
  RTC.myLvl = RTC.voice && !RTC.muted ? level(RTC.myAna) : 0; me.talking = RTC.myLvl > .04;
  for (const P of RTC.peers.values()) { P.lvl = level(P.ana); const p = peers.get(P.key); if (!P.call && p) { const d = Math.hypot(p.x - me.pos.x, p.z - me.pos.z); P.audio.volume = clamp(1 - (d - 1.6) / 5.4, 0, 1); } else P.audio.volume = 1; if (p) p.talking = P.lvl > .035; }
  if (RTC.rc && !(me.zone && me.zone.id === RTC.rc)) { RTC.rc = null; toast('You left the room, so you left its call.'); renderCall(); }
  renderCallLevels(); roomScreenVideo();
}
/* calls with chosen people: ring, accept, roster */
function startCall(uids, video) {
  if (!RTC.ok) { voiceInfo(); return; } const keys = peerKeysOf(uids); if (!keys.length) { toast('They are not in the office right now. Leave a message instead.'); return; }
  voiceOn(video).then(ok => { if (!ok) return; if (!RTC.call) RTC.call = { id: Store.id(), keys: new Set(), pending: new Set(), video: !!video, t: Date.now() }; RTC.rc = null;
    for (const k of keys) { RTC.call.pending.add(k); sig(k, 'ring', { id: RTC.call.id, nm: me.name, video: !!video, keys: [...RTC.call.keys] }); } startRing(true); renderCall();
    setTimeout(() => { if (RTC.call && RTC.call.pending.size && !RTC.call.keys.size) { stopRing(); toast('No answer. Leave a message?', { ms: 8000, action: { label: 'Message', fn: () => { openThread(uids); talk(true, me.conv); } } }); leaveCall(); } }, 32000); });
}
function rosterOut() { if (!RTC.call) return; const keys = [...RTC.call.keys, me.peer]; for (const k of RTC.call.keys) sig(k, 'roster', { id: RTC.call.id, keys }); }
function incomingCall(from, d) {
  const p = peers.get(from); if (!p || !d.id) return; const nm = nameOf(p.uid, p.nick);
  if (RTC.call || effStatus() === 'focus') { sig(from, 'decline', { id: d.id, busy: !!RTC.call }); if (!RTC.call) toast('📞 ' + nm + ' tried to call (you are on Do not disturb).', { ms: 9000 }); return; }
  startRing(false); const t = el('div', { class: 'ringcard island', role: 'alertdialog', 'aria-label': 'Incoming call' }, el('span', { class: 'tk-av lg', style: 'background-image:url(' + humanThumb(cleanCfg(PRES(p).av).m) + ')' }), el('div', {}, el('b', { text: nm }), el('small', { text: d.video ? 'Video call' : 'Voice call' })),
    el('button', { class: 'btn', text: '📞 Accept', onclick: () => accept(false) }), d.video ? el('button', { class: 'btn ghost', text: '🎥 With video', onclick: () => accept(true) }) : null, el('button', { class: 'btn danger', text: 'Decline', onclick: () => { t.remove(); stopRing(); sig(from, 'decline', { id: d.id }); } }));
  document.body.append(t); const kill = setTimeout(() => { if (t.isConnected) { t.remove(); stopRing(); toast('📞 Missed call from ' + nm + '.', { ms: 12000, action: { label: 'Call back', fn: () => startCall([p.uid], false) } }); } }, 30000);
  function accept(video) { clearTimeout(kill); t.remove(); stopRing(); voiceOn(video).then(ok => { if (!ok) { sig(from, 'decline', { id: d.id }); return; } RTC.call = { id: d.id, keys: new Set([from].concat((d.keys || []).filter(k => typeof k === 'string' && k !== me.peer))), pending: new Set(), video: !!video, t: Date.now() }; RTC.rc = null; sig(from, 'accept', { id: d.id }); renderCall(); }); }
}
function leaveCall(silent) { if (!RTC.call) return; if (!silent) for (const k of RTC.call.keys) sig(k, 'leave', { id: RTC.call.id }); for (const k of RTC.call.keys) dropPeer(k, true); RTC.call = null; stopRing(); if (RTC.scr) shareScreen(false); if (RTC.cam) camOn(false); renderCall(); }
function startRing(out) { stopRing(); let n = 0; const tick = () => { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime, tone = (f, at) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(out ? .05 : .12, t + at + .02); g.gain.exponentialRampToValueAtTime(.0001, t + at + .35); o.connect(g).connect(actx.destination); o.start(t + at); o.stop(t + at + .4); }; tone(out ? 440 : 660, 0); tone(out ? 480 : 880, .4); } catch (e) { } if (++n > 20) stopRing(); }; tick(); RTC.ring = setInterval(tick, 2400); }
function stopRing() { clearInterval(RTC.ring); RTC.ring = null; }
/* the room call: everyone inside a meeting room who joins hears and sees each other; screen shares show on the wall screen */
function joinRoomCall(r) { if (!RTC.ok) { voiceInfo(); return; } voiceOn(false).then(ok => { if (!ok) return; if (RTC.call) leaveCall(); RTC.rc = r.id; renderCall(); toast('You joined the ' + r.name + ' call. Everyone in the room who joins can hear you.'); }); }
function voiceInfo() {
  openDrawer('voiceinfo', 'Voice and video', false, b => {
    b.append(el('p', { class: 'big', text: 'Built-in calls run in your self-hosted office.' }),
      el('p', { text: 'Voice, video, screen sharing, nearby audio and meeting-room calls work browser to browser in the version you host on Vercel or WordPress, with no Microsoft account. This Zuchera preview cannot use microphones or cameras, so here you can:' }),
      el('ul', {}, el('li', { text: 'Hold 🎙 Talk (or the T key) and speak: your words appear over your head and in this area\'s chat, and people nearby hear them read aloud.' }), el('li', { text: 'Use 💬 Talk for channels, direct and group messages, files, reactions and @mentions.' }), el('li', { text: 'Use Teams links only if an admin has turned them on.' })),
      el('div', { class: 'row' }, V5.canListen ? el('button', { class: 'btn', text: '🎙 Try hold-to-talk', onclick: () => { closeDrawer(); toast('Hold the 🎙 Talk button or the T key while you speak.'); } }) : null, el('button', { class: 'btn ghost', text: '💬 Open Talk', onclick: () => { closeDrawer(); talk(true); } })));
  });
}
/* the call bar: who you are talking to, video tiles, mute, camera, share, leave */
function renderCall() {
  const bar = $('#callbar'); if (!bar) return; const on = RTC.voice; bar.hidden = !on; $('#bVoice').classList.toggle('on', on); $('#bVoice').textContent = on ? (RTC.muted ? '🔇 Muted' : '🎧 Voice on') : '🎧 Voice';
  if (!on) { bar.replaceChildren(); return; }
  const inCall = !!(RTC.call || RTC.rc), room = RTC.rc && (W.rooms || []).find(r => r.id === RTC.rc);
  const who = [...RTC.peers.values()].map(P => { const p = peers.get(P.key); return { P, nm: p ? nameOf(p.uid, p.nick) : 'Someone', face: p ? humanThumb(cleanCfg(PRES(p).av).m) : '', scr: p && PRES(p).scr }; });
  const label = RTC.call ? (RTC.call.pending.size && !RTC.call.keys.size ? 'Calling…' : 'Call · ' + (who.length + 1) + ' people') : room ? room.name + ' call · ' + (who.length + 1) : who.length ? 'Nearby voice · ' + who.length + (who.length === 1 ? ' person' : ' people') + ' can hear you' : 'Nearby voice · walk up to someone to talk';
  const tiles = el('div', { class: 'cb-tiles' }, tileEl(null, me.name + ' (you)', humanThumb(me.cfg.m), myVideo() ? new MediaStream([myVideo()]) : null, true), ...who.map(w => tileEl(w.P, w.nm, w.face, w.P.vstream, false)));
  bar.replaceChildren(el('div', { class: 'cb-top' }, el('b', { text: label }), el('span', { class: 'cb-btns' },
    el('button', { class: RTC.muted ? 'on' : '', title: 'Mute (M)', text: RTC.muted ? '🔇' : '🎙', onclick: () => setMute(!RTC.muted) }),
    inCall ? el('button', { class: RTC.cam ? 'on' : '', title: 'Camera', text: '📷', onclick: () => camOn(!RTC.cam) }) : null,
    inCall ? el('button', { class: RTC.scr ? 'on' : '', title: 'Share your screen', text: '🖥', onclick: () => shareScreen(!RTC.scr) }) : null,
    el('button', { title: 'Add people', text: '➕', onclick: () => addToCall() }), el('span', { class: 'cb-view' }),
    el('button', { class: 'danger-t', title: inCall ? 'Leave the call' : 'Turn voice off', text: inCall ? 'Leave' : 'Voice off', onclick: () => { if (RTC.call) leaveCall(); else if (RTC.rc) { RTC.rc = null; renderCall(); } else voiceOff(); } }))), (inCall || who.some(w => w.P.vstream && w.P.vstream.getVideoTracks().some(v => !v.muted))) ? tiles : el('div', { class: 'cb-mini' }, ...who.map(w => el('span', { class: 'tk-av sm', 'data-k': w.P.key, title: w.nm, style: w.face ? 'background-image:url(' + w.face + ')' : '' }))));
  applyCbView(); roomScreenVideo();
}
function tileEl(P, nm, face, stream, mine) {
  const t = el('div', { class: 'cb-tile' + (mine ? ' me' : ''), 'data-k': P ? P.key : 'me' });
  if (stream && stream.getVideoTracks().some(v => v.readyState === 'live' && !v.muted)) { const v = el('video', { autoplay: '', playsinline: '', muted: '' }); v.muted = true; v.srcObject = stream; v.play().catch(() => { }); t.append(v); }
  else t.append(el('span', { class: 'tk-av lg', style: face ? 'background-image:url(' + face + ')' : '', text: face ? '' : initials(nm) }));
  t.append(el('small', { text: nm })); t.addEventListener('dblclick', () => t.classList.toggle('big')); return t;
}
function renderCallLevels() { const bar = $('#callbar'); if (!bar || bar.hidden) return; for (const e of bar.querySelectorAll('[data-k]')) { const k = e.getAttribute('data-k'), lv = k === 'me' ? RTC.myLvl : (RTC.peers.get(k) || {}).lvl || 0; e.classList.toggle('spk', lv > .035); } }
function setMute(m) { RTC.muted = m; if (RTC.mic) RTC.mic.enabled = !m; renderCall(); }
function addToCall() {
  const inRoom = !!RTC.rc && !RTC.call, ppl = allPeople().filter(r => r.key && !r.me && !(RTC.call && RTC.call.keys.has(r.key)) && !(RTC.peers && [...RTC.peers.values()].some(P => P.key === r.key)));
  const room = inRoom ? (W.rooms || []).find(r => r.id === RTC.rc) : null;
  openDrawer('addcall', inRoom ? 'Invite people to ' + (room ? room.name : 'this room') : 'Add people to the call', false, b => { b.append(...(ppl.length ? ppl.map(r => el('div', { class: 'row' }, badgeEl(r), el('span', { style: 'flex:1', text: r.nm }), el('button', { class: 'btn sm', text: inRoom ? 'Invite' : 'Ring', onclick: ev => {
      if (inRoom) { sig(r.key, 'invite', { rc: RTC.rc, nm: me.name }); toast('Invited ' + r.nm + '.'); }
      else if (!RTC.call) { startCall([r.uid], false); toast('Calling ' + r.nm + '…'); }
      else { RTC.call.pending.add(r.key); sig(r.key, 'ring', { id: RTC.call.id, nm: me.name, video: RTC.call.video, keys: [...RTC.call.keys] }); toast('Ringing ' + r.nm + '…'); } ev.target.disabled = true; ev.target.textContent = 'Sent'; } }))) : [el('p', { text: 'Nobody else is in the office right now.' })])); });
}
/* show a shared screen (or the speaker's camera) on the meeting room's wall screen */
let roomVid = null;
function roomVidRestore() { if (!roomVid) return; roomVid.mesh.material.map = roomVid.old; roomVid.mesh.material.needsUpdate = true; roomVid.tex.dispose(); roomVid.v.srcObject = null; roomVid = null; }
function roomScreenVideo() {
  const r = RTC.rc && (W.rooms || []).find(x => x.id === RTC.rc); let src = null;
  if (r) { if (RTC.scr) src = new MediaStream([RTC.scr]); else for (const P of RTC.peers.values()) { const p = peers.get(P.key); if (p && PRES(p).scr && P.vstream) { src = P.vstream; break; } } }
  if (!r || !src || !r.screenMesh) { roomVidRestore(); return; }
  if (roomVid && (roomVid.src === src || (RTC.scr && roomVid.track === RTC.scr))) return; roomVidRestore();
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = src; v.play().catch(() => { }); const tex = new T.VideoTexture(v); tex.encoding = T.sRGBEncoding;
  roomVid = { v, tex, src, track: RTC.scr, mesh: r.screenMesh, old: r.screenMesh.material.map }; r.screenMesh.material.map = tex; r.screenMesh.material.needsUpdate = true;
}

/* ---------- presence, avatars and hooks for the rest of the office ---------- */
function v5Presence() {
  const typing = V5.open && Date.now() - V5.typingT < 4000 && $('#tkIn').value.trim() ? V5.conv : null;
  return { typ: typing && !typing.startsWith('dm_') && !typing.startsWith('g_') ? typing : (typing ? 'dm' : null), vo: RTC.voice ? 1 : null, mu: RTC.voice && RTC.muted ? 1 : null, cl: RTC.call ? 1 : null, rc: RTC.voice ? RTC.rc : null, scr: RTC.scr ? 1 : null, cam: RTC.cam ? 1 : null, ptt: PTT.on ? 1 : null };
}
function v5AvPeer(p) { const d = PRES(p); if (RTC.peers.size) for (const P of RTC.peers.values()) if (peers.get(P.key) === p && P.ana) { const l = level(P.ana); return l > 0.02 || p.talking ? { speaking: true, lvl: l } : { lvl: 0 }; } return p.talking || d.ptt ? { speaking: true } : {}; }   // on a call the mouth follows the real voice
function v5AvMe() { if (RTC.voice && !RTC.muted && RTC.myAna) { const l = level(RTC.myAna); return l > 0.02 ? { speaking: true, lvl: l } : { lvl: 0 }; } return me.talking || PTT.on ? { speaking: true } : {}; }
function deskBusy(d) {             // smart glass in private offices frosts while the owner is busy, on a call or in do-not-disturb
  if (!d || !d.owner) return false; if (d.owner === me.uid) return !!(me.seat && me.seat === d.seat) && (['meeting', 'focus', 'call'].includes(effStatus()) || !!RTC.call);
  for (const p of peers.values()) if (p.uid === d.owner) { const st = p.status, x = PRES(p); return !!(p.seat && p.seat === d.seat) && (['meeting', 'focus', 'call', 'outlook'].includes(st) || !!x.cl || !!x.rc); } return false;
}
function v5Slow() {
  rtcTick(); if (V5.open && (Date.now() / 1000 | 0) % 2 === 0) { const tp = $('#tkTyping'); if (tp) { const typers = [...peers.values()].filter(p => PRES(p).typ === V5.conv).map(p => nameOf(p.uid, p.nick)); tp.textContent = typers.length ? typers.slice(0, 3).join(', ') + (typers.length > 1 ? ' are' : ' is') + ' typing…' : ''; } }
  const list = [{ tz: me.tz, here: true }]; for (const p of peers.values()) list.push({ tz: p.tzName, here: true }); for (const [uid, d] of Store.col('people')) if (d && uid !== me.uid && !list.some(x => x.uid === uid)) list.push({ tz: str(d.tz, 60), here: false, uid }); try { setGlobePins(list.filter(x => x.tz)); } catch (e) { }
  renderNotice();
}
/* service notice: an admin can tell everyone, for example, that Microsoft is down and to use HQ Talk and HQ calls */
function renderNotice() {
  const n = $('#notice'); if (!n) return; const t = str(conf.notice, 200); if (!t || V5.noticeHidden === t) { n.hidden = true; return; }
  if (n.dataset.t !== t) { n.dataset.t = t; n.replaceChildren(el('b', { text: '⚠️ ' }), el('span', { text: t }), el('button', { class: 'btn sm', text: '💬 Open Talk', onclick: () => talk(true) }), el('button', { class: 'x', 'aria-label': 'Hide notice', text: '×', onclick: () => { V5.noticeHidden = t; n.hidden = true; } })); } n.hidden = false;
}
function commsSection() {
  const cm = el('select', { id: 'aComms' }, el('option', { value: 'hq', text: 'Built-in only (HQ Talk and HQ calls)', selected: conf.comms === 'hq' }), el('option', { value: 'both', text: 'Built-in first, Microsoft Teams buttons as well', selected: conf.comms !== 'hq' }));
  const nt = el('input', { id: 'aNotice', type: 'text', maxLength: 200, value: conf.notice || '', placeholder: 'e.g. Microsoft 365 is down. Use HQ Talk and HQ calls until further notice.' });
  return [el('h3', { text: 'Communication' }), field('Calls and chat', cm), field('Service notice for everyone (top of the screen)', nt),
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Save', onclick: () => { Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { comms: cm.value, notice: nt.value.trim().slice(0, 200) })); toast('Saved for everyone.'); } }),
      el('button', { class: 'btn ghost', text: '⚠️ Microsoft is down: switch everyone over', onclick: () => { nt.value = 'Microsoft 365 is having an outage. Use HQ Talk for messages and HQ calls for voice and video until it is fixed.'; cm.value = 'hq'; Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { comms: 'hq', notice: nt.value })); sendMsg('ch_ann', nt.value); toast('Everyone now sees the notice, and Teams buttons are hidden.'); } }),
      el('button', { class: 'btn ghost', text: 'Clear notice', onclick: () => { nt.value = ''; Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { notice: '' })); } }))];
}
function hqCallButtons(r) {
  if (!r.uid || r.me) return null;
  return el('div', { class: 'row' }, el('button', { class: 'btn sm', text: '📞 Call', title: 'Built-in voice call', onclick: () => { closeDrawer(); startCall([r.uid], false); } }), el('button', { class: 'btn sm ghost', text: '🎥 Video call', onclick: () => { closeDrawer(); startCall([r.uid], true); } }), el('button', { class: 'btn sm ghost', text: '💬 Talk', onclick: () => { closeDrawer(); openThread([r.uid]); talk(true, me.conv); } }));
}


/* ---------- panels: settings (voice, devices, notifications), my avatar (speaking voice), meeting rooms (built-in room call) ---------- */
const _setV5 = panels.settings;
panels.settings = b => { const r = _setV5(b);
  const ra = el('input', { id: 'fRead', type: 'checkbox', checked: !!local.readAloud, onchange: e => { local.readAloud = e.target.checked; LS.set('local', local); } });
  const dn = el('input', { id: 'fDesk', type: 'checkbox', checked: !!local.desk && window.Notification && Notification.permission === 'granted', onchange: async e => { if (e.target.checked && window.Notification) { let p = Notification.permission; if (p === 'default') { try { p = await Notification.requestPermission(); } catch (er) { } } if (p !== 'granted') { e.target.checked = false; toast('Notifications are blocked for this site in your browser settings.'); } } local.desk = e.target.checked; LS.set('local', local); } });
  const sec = el('div', {}, el('h3', { text: 'Talk and calls' }), V5.canSpeak ? el('label', { class: 'tog', for: 'fRead' }, ra, el('span', {}, 'Read spoken messages aloud', el('small', { text: 'When someone nearby uses hold-to-talk, you hear it.' }))) : null,
    window.Notification ? el('label', { class: 'tog', for: 'fDesk' }, dn, el('span', {}, 'Desktop notifications', el('small', { text: 'For direct messages and @mentions while this tab is in the background.' }))) : null);
  if (RTC.ok && navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices().then(ds => { const mk = (kind, key, label) => { const opts = ds.filter(d => d.kind === kind); if (!opts.length) return null; const s0 = el('select', { onchange: e => { local[key] = e.target.value; LS.set('local', local); toast('Used from the next call.'); } }, el('option', { value: '', text: 'System default' }), ...opts.map((d, i) => el('option', { value: d.deviceId, text: d.label || label + ' ' + (i + 1), selected: local[key] === d.deviceId }))); return field(label, s0); }; sec.append(...[mk('audioinput', 'micId', 'Microphone'), mk('videoinput', 'camId', 'Camera')].filter(Boolean)); }).catch(() => { });
  else if (!RTC.ok) sec.append(el('p', { class: 'meta', text: 'Voice and video calls run in the self-hosted office. Here you can use Talk and hold-to-talk.' }));
  b.append(sec); return r; };
const _avV5 = panels.avatar;
if (_avV5) panels.avatar = b => { const r = _avV5(b); if (!V5.canSpeak) return r;
  b.append(el('h3', { text: 'Your speaking voice' }), el('p', { class: 'meta', text: 'Used when hold-to-talk messages are read aloud to people near you.' }), el('div', { class: 'row' }, ...VOICES.map(v => el('button', { class: 'btn sm' + ((me.vc || 'buttery') === v ? '' : ' ghost'), text: v[0].toUpperCase() + v.slice(1), onclick: e => { me.vc = v; saveProfile(); [...e.target.parentElement.children].forEach(x => x.classList.add('ghost')); e.target.classList.remove('ghost'); speakMsg({ by: me.uid, nm: me.name, text: 'Hello, this is my voice in the office.' }); } }))));
  return r; };
const _meetV5 = actions.meeting;
actions.meeting = r => { _meetV5(r); const body = $('#drawerBody'); if (!body || drawer.id !== 'rooms:' + r.id) return; const R0 = roomDoc(r.id); if (R0.lock && !R0.mem.includes(me.uid) && !inRoom(r, me.pos.x, me.pos.z)) return;
  const inThis = RTC.rc === r.id; body.prepend(el('div', { class: 'card hqcall' }, el('b', { text: '📞 Room call, built in' }), el('span', { class: 'meta', text: RTC.ok ? 'Voice, video and screen sharing for everyone in this room. Shared screens show on the wall.' : 'Available in the self-hosted office. Here, use hold-to-talk and the room chat.' }),
    el('div', { class: 'row' }, RTC.ok ? el('button', { class: 'btn sm', text: inThis ? 'Leave room call' : 'Join room call', onclick: () => { if (inThis) { RTC.rc = null; renderCall(); } else { if (!inRoom(r, me.pos.x, me.pos.z)) { goTo(r.x0 + (r.x1 - r.x0) / 2, 4.8); toast('Walking into the room… click Join again once you are inside.'); return; } joinRoomCall(r); } closeDrawer(); } }) : el('button', { class: 'btn sm ghost', text: 'How calls work', onclick: () => voiceInfo() }),
      el('button', { class: 'btn sm ghost', text: '💬 Room chat', onclick: () => { closeDrawer(); talk(true, 'room'); } })))); };

function initV5() {
  const tb = $('#topbtns'), b = el('button', { class: 'tb', id: 'bTalk', title: 'HQ Talk: channels, direct messages and files (Ctrl+K)' }, '💬 Talk ', el('span', { class: 'n', id: 'nTalk', hidden: true, text: '0' })); tb.insertBefore(b, $('#bPeople')); b.onclick = () => talk();
  const dock = $('#dock'), sel = $('#status'), vb = el('button', { id: 'bVoice', title: 'Voice: talk to people near you, join room calls (M mutes)', text: '🎧 Voice' }), pt = el('button', { id: 'bPtt', title: 'Hold and speak (or hold T)', text: '🎙 Talk', hidden: true });
  sel.after(el('span', { class: 'sep' }), vb, pt); vb.onclick = () => { if (RTC.voice) { if (RTC.call || RTC.rc) renderCall(); else voiceOff(); } else voiceOn(false).then(ok => ok && toast('Voice is on. Walk up to people to talk; they need Voice on too. M mutes.')); };
  for (const ev of ['pointerdown']) pt.addEventListener(ev, e => { e.preventDefault(); pt.setPointerCapture && pt.setPointerCapture(e.pointerId); pttStart(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pt.addEventListener(ev, () => pttEnd());
  document.body.append(el('div', { id: 'callbar', class: 'island', hidden: true, 'aria-label': 'Call' }), el('div', { id: 'ptt', class: 'island', hidden: true }, el('span', { class: 'recdot' }), el('span', { id: 'pttTxt' })), el('div', { id: 'notice', class: 'island', role: 'status', hidden: true }));
  addEventListener('keydown', e => { if (typing()) return; const k = e.key.toLowerCase(); if (k === 't' && !e.repeat && !e.ctrlKey && !e.metaKey) { if (V5.canListen) pttStart(); } else if (k === 'm' && RTC.voice) setMute(!RTC.muted); });
  addEventListener('keyup', e => { if (e.key.toLowerCase() === 't') pttEnd(); });
  buildTalk(); { const h = $('#chat header'); if (h) h.insertBefore(el('button', { class: 'chatexp', title: 'Open HQ Talk (Ctrl+K)', 'aria-label': 'Open HQ Talk', text: '⤢', onclick: () => talk(true, me.conv) }), $('#chatMin')); }
  Store.on('chat', m => onNewMsgs('chat', m)); Store.on('dms', m => onNewMsgs('dms', m)); Store.on('rx', () => renderTalk()); Store.on('pins', () => renderTalk()); Store.on('chans', () => renderTalk()); Store.on('threads', () => renderTalk()); Store.on('office', () => { renderNotice(); renderCall(); });
  addEventListener('focus', () => renderTalk());
  setInterval(v5Slow, 700); initSpeech();
  const waitNet = setInterval(() => { if (net.room) { clearInterval(waitNet); rtcInit(); } }, 500);
  if (!window.OFFICE_STANDALONE) RTC.ok = false;
  addEventListener('beforeunload', () => { if (RTC.call) for (const k of RTC.call.keys) sig(k, 'leave', { id: RTC.call.id }); });
}
