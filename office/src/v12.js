/* ============================ v12: room and office signs, brand wall, images, calendar hosting and sync ============================ */
async function imgToData(file, maxW, maxB) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Use a JPG, PNG, WebP or GIF image.');
  const url = URL.createObjectURL(file); let img; try { img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that image.')); i.src = url; }); } finally { URL.revokeObjectURL(url); }
  let s = Math.min(1, maxW / Math.max(1, img.width)), q = .86, out = ''; const cv = document.createElement('canvas');
  for (let k = 0; k < 10; k++) { cv.width = Math.max(1, Math.round(img.width * s)); cv.height = Math.max(1, Math.round(img.height * s)); const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height); out = cv.toDataURL('image/jpeg', q); if (out.length <= maxB) break; if (q > .5) q -= .12; else s *= .8; }
  if (out.length > maxB * 1.1) throw new Error('That image is too large. Try a smaller one.'); return out;
}
const pickImage = (maxW, maxB) => new Promise((res, rej) => { const i = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', onchange: async () => { const f = i.files[0]; if (!f) return res(null); try { res(await imgToData(f, maxW, maxB)); } catch (e) { toast(String(e.message || e)); res(null); } } }); i.click(); });

/* ---- the sign outside every room: who is in, until when, and when it is free again ---- */
function evNow(where, ownerUid) {
  const now = Date.now(), evs = [...Store.col('cal')].map(([, e]) => e).filter(e => e && num(e.e, 0) > now && num(e.s, 0) < now + 864e5 && (where ? e.where === where : (e.by === ownerUid || (Array.isArray(e.inv) && (e.inv.includes(ownerUid) || e.inv.includes('*')) && (Store.col('rsvp').get(ownerUid ? '' : '') || true))))).sort((a, b) => a.s - b.s);
  return { cur: evs.find(e => e.s <= now) || null, next: evs.find(e => e.s > now) || null };
}
const mm = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min'; };
function roomSignDraw(r, R, ppl, tt) {
  const now = Date.now(), { cur, next } = evNow(r.name), timerEnd = tt && !tt.over && R.mode === 'down' && R.end > now ? R.end : 0, end = timerEnd || (cur ? cur.e : 0), busy = !!(cur || ppl.length || timerEnd), state = R.lock ? 'lock' : busy ? 'busy' : 'free';
  r.sign.draw((c, w, h) => { c.fillStyle = state === 'lock' ? '#b3261e' : state === 'busy' ? '#14202e' : '#1f7a4d'; rr(c, 0, 0, w, h, 20); c.fill(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = '700 44px ' + FONT_D; c.fillText(r.name + (state === 'lock' ? ' 🔒' : ''), w / 2, 40, w - 24);
    c.font = '600 30px ' + FONT_B; c.fillStyle = state === 'free' ? '#d8ffe9' : '#ffd36b'; c.fillText(state === 'free' ? 'Free to use' : (R.title || (cur && str(cur.title, 40)) || 'In session'), w / 2, 92, w - 24);
    c.font = '500 26px ' + FONT_B; c.fillStyle = 'rgba(255,255,255,.88)';
    c.fillText(state !== 'free' && end ? 'Until ' + fmtHM(end) + ' · ' + mm(end - now) + ' left' : state !== 'free' ? ppl.length + ' inside' : next ? 'Booked ' + fmtHM(next.s) + ' · ' + str(next.title, 22) : 'Book it in Calendar', w / 2, 140, w - 24); });
}
function officeSignDraw(d) {
  const uid = d.owner; if (!uid) return null; const p = uid === me.uid ? me : peerOf(uid), st = uid === me.uid ? effStatus() : (p ? p.status : 'away'), { cur } = evNow(null, uid), live = cur && (cur.by === uid || (cur.inv || []).includes(uid) || (cur.inv || []).includes('*'));
  return { name: d.ownerName || 'Office', status: p ? (STATUS[st] || STATUS.available) : ['#9aa6b2', 'Not in right now'], meet: live ? cur : null, locked: privLocked(d) };
}
function officeSigns() {
  for (const d of W.desks) { if (!d.priv) continue;
    if (!d.osign) { d.osign = dynTex(512, 192); const x = d.x - 1.3 + 2.525, m = new T.Mesh(new T.PlaneGeometry(1.2, .45), new T.MeshBasicMaterial({ map: d.osign.tex })); m.position.set(x, 2.2, 4.47); office.add(m); }
    const o = officeSignDraw(d), key = JSON.stringify(o && [o.name, o.status[1], o.meet && o.meet.e, o.locked]) + Math.floor(Date.now() / 60000); if (d.osk === key) continue; d.osk = key;
    d.osign.draw((c, w, h) => { c.fillStyle = '#14202e'; rr(c, 0, 0, w, h, 20); c.fill(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; if (!o) { c.font = '700 40px ' + FONT_D; c.fillText('Office ' + d.id.slice(1) + ' · free', w / 2, h / 2, w - 24); return; }
      c.font = '700 44px ' + FONT_D; c.fillText(o.name, w / 2, 42, w - 24); c.fillStyle = o.meet ? '#ffb627' : o.status[0]; c.font = '700 30px ' + FONT_B; c.fillText(o.meet ? '● In a meeting' : '● ' + o.status[1], w / 2, 96, w - 24); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '500 26px ' + FONT_B;
      c.fillText(o.meet ? 'until ' + fmtHM(o.meet.e) + ' · ' + str(o.meet.title, 22) : o.locked ? '🔒 Private: knock first' : 'Knock to come in', w / 2, 146, w - 24); }); }
}

/* ---- large brand and art wall owners can fill with their name or an image ---- */
Object.assign(LIBRARY, { brand_wall: { label: 'Brand or art wall (large)', icon: '🏷', cat: 'Walls and decor', text: true, img: true, build: it => {
  const g = new T.Group(); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; office.add(g); rbox(g, 6.2, 2.7, .08, .02, M_BLACKM, 0, 1.6, 0, { cast: 1 });
  const d = dynTex(1536, 640), paint = img => d.draw((c, w, h) => { c.fillStyle = '#14202e'; c.fillRect(0, 0, w, h); if (img) { const k = Math.max(w / img.width, h / img.height); c.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k); }
    if (it.tx) { c.fillStyle = img ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,0)'; if (img) c.fillRect(0, h - 190, w, 190); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 ' + (img ? 110 : 190) + 'px ' + FONT_D; c.fillText(it.tx, w / 2, img ? h - 95 : h / 2, w - 120); } else if (!img) { c.fillStyle = 'rgba(255,255,255,.5)'; c.textAlign = 'center'; c.font = '700 80px ' + FONT_D; c.fillText('Your brand or art here', w / 2, h / 2); } });
  paint(null); const m = new T.Mesh(new T.PlaneGeometry(6.1, 2.54), new T.MeshBasicMaterial({ map: d.tex })); m.position.set(0, 1.6, .045); g.add(m);
  const doc = Store.col('office').get('img_' + it.id); if (doc && /^data:image\//.test(doc.d || '')) { const im = new Image(); im.onload = () => paint(im); im.src = doc.d; } ob(it, 6.2, .5); } } });
async function imgSel() {
  const s = ED.sel; if (!s || s.k !== 'item') return; const it = itemById(s.id); if (!it) return; const data = await pickImage(1400, 150000); if (!data) return;
  Store.set('office', 'img_' + it.id, { d: data, t: Date.now() }); saveLayout(l => { const i = l.items.find(i => i.id === s.id); if (i) i.imv = Date.now(); }); toast('Image placed.');
}

/* ---- calendar: where it is hosted, outside calendars, .ics in and out ---- */
const HOSTS = { in: 'Here in Zuchera (voice, video and screen share in the room)', ext: 'An outside meeting link (Teams, Zoom, Meet…)', both: 'Both: meet here and share an outside link' };
function joinEvent(id, e) {
  if (e.host === 'ext' && /^https:\/\//.test(e.link || '')) { window.open(e.link, '_blank', 'noopener,noreferrer'); return; }
  work(false); goToEvent(e); if (e.host === 'both' && /^https:\/\//.test(e.link || '')) setTimeout(() => window.open(e.link, '_blank', 'noopener,noreferrer'), 600);
}
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'), icsD = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function icsExport() {
  const mine = [...Store.col('cal')].filter(([, e]) => e && (e.by === me.uid || (Array.isArray(e.inv) && (e.inv.includes(me.uid) || e.inv.includes('*'))))); const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zuchera//Virtual Office//EN', 'CALSCALE:GREGORIAN'];
  for (const [id, e] of mine) L.push('BEGIN:VEVENT', 'UID:' + id + '@zuchera', 'DTSTAMP:' + icsD(Date.now()), 'DTSTART:' + icsD(e.s), 'DTEND:' + icsD(e.e), 'SUMMARY:' + icsEsc(e.title), 'LOCATION:' + icsEsc(e.where), 'DESCRIPTION:' + icsEsc((e.notes || '') + (e.link ? '\nJoin: ' + e.link : '')), 'END:VEVENT'); L.push('END:VCALENDAR');
  const a = el('a', { href: URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })), download: 'zuchera-calendar.ics' }); a.click(); toast('Calendar file saved.');
}
function icsParse(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/), out = []; let ev = null;
  const dt = v => { const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v.trim()); if (!m) return null; return m[7] ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime(); };
  const un = s => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  for (const ln of lines) { if (ln === 'BEGIN:VEVENT') ev = {}; else if (ln === 'END:VEVENT') { if (ev && ev.s) out.push(ev); ev = null; } else if (ev) { const i = ln.indexOf(':'); if (i < 0) continue; const k = ln.slice(0, i).split(';')[0].toUpperCase(), v = ln.slice(i + 1);
    if (k === 'DTSTART') ev.s = dt(v); else if (k === 'DTEND') ev.e = dt(v); else if (k === 'SUMMARY') ev.title = un(v).slice(0, 100); else if (k === 'LOCATION') ev.where = un(v).slice(0, 60); else if (k === 'DESCRIPTION') ev.notes = un(v).slice(0, 600); else if (k === 'UID') ev.uid = v.slice(0, 120); else if (k === 'RRULE') ev.rr = v; } }
  return out.map(e => Object.assign(e, { e: e.e || e.s + 3600000 }));
}
function icsExpand(evs, horizon) {   // a few weeks of simple repeats (daily or weekly) so outside calendars still look right
  const out = [], now = Date.now(), lim = now + horizon;
  for (const e of evs) { if (!e.rr) { if (e.e > now - 864e5 && e.s < lim) out.push(e); continue; } const r = Object.fromEntries(e.rr.split(';').map(x => x.split('='))), step = r.FREQ === 'DAILY' ? 864e5 : r.FREQ === 'WEEKLY' ? 6048e5 : 0, iv = Math.max(1, +r.INTERVAL || 1), cnt = +r.COUNT || 400, until = r.UNTIL ? icsUntil(r.UNTIL) : Infinity; if (!step) { if (e.e > now - 864e5 && e.s < lim) out.push(e); continue; }
    for (let i = 0; i < cnt; i++) { const s = e.s + i * step * iv; if (s > lim || s > until) break; if (s + (e.e - e.s) > now - 864e5) out.push(Object.assign({}, e, { s, e: s + (e.e - e.s), uid: e.uid + '#' + i, rr: null })); } }
  return out;
}
const icsUntil = v => { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59) : Infinity; };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
function icsImport(text, src) {
  const evs = icsExpand(icsParse(text), 60 * 864e5); let n = 0; const keep = new Set();
  for (const e of evs.slice(0, 400)) { const id = 'x' + src + hash((e.uid || e.title) + ':' + e.s); keep.add(id); const cur = Store.col('cal').get(id); const doc = { title: e.title || 'Busy', s: e.s, e: e.e, where: e.where || 'Call (no room)', inv: [me.uid], notes: e.notes || '', by: me.uid, host: 'ext', link: (/https:\/\/[^\s<>"]+/.exec(e.notes || e.where || '') || [''])[0], ext: src, t: Date.now() }; if (!cur || cur.s !== doc.s || cur.title !== doc.title || cur.e !== doc.e) { Store.set('cal', id, doc); n++; } }
  for (const [id, e] of Store.col('cal')) if (e && e.ext === src && e.by === me.uid && !keep.has(id) && e.s > Date.now()) Store.del('cal', id);   // removed upstream: removed here
  return n;
}
panels.calsync = b => {
  const feed = Store.col('people').get(me.uid) || {}, u = el('input', { type: 'url', placeholder: 'https://calendar.google.com/calendar/ical/…/basic.ics', value: LS.get('icsUrl', ''), style: 'width:100%' }), file = el('input', { type: 'file', accept: '.ics,text/calendar', onchange: async () => { const f = file.files[0]; if (!f) return; const n = icsImport(await f.text(), 'file'); toast(n + ' events imported.'); } });
  b.append(el('p', { text: 'Bring your Google, Outlook or Apple calendar in so teammates see when you are busy, and so meetings can be booked from either side.' }),
    el('h3', { text: 'Keep it in sync (Google, Outlook, Apple)' }), el('ol', {}, el('li', { text: 'Google Calendar → Settings → your calendar → Integrate calendar → copy "Secret address in iCal format".' }), el('li', { text: 'Paste it below. It refreshes about every 30 minutes while the office is open.' })), u,
    el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Connect', onclick: async () => { const v = u.value.trim(); if (!/^https:\/\//.test(v)) { toast('Paste the https address.'); return; } try { const t = await fetchIcs(v); LS.set('icsUrl', v); const n = icsImport(t, 'url'); toast('Connected. ' + n + ' events brought in.'); } catch (e) { toast(String(e.message || e)); } } }), el('button', { class: 'btn ghost', text: 'Disconnect', onclick: () => { LS.set('icsUrl', ''); for (const [id, e] of Store.col('cal')) if (e && e.ext === 'url' && e.by === me.uid) Store.del('cal', id); u.value = ''; toast('Disconnected and removed.'); } })),
    el('h3', { text: 'One-off files' }), el('label', { class: 'btn ghost' }, '⬆ Import a .ics file', el('span', { style: 'display:none' }, file)), el('button', { class: 'btn ghost', text: '⬇ Download my calendar (.ics)', onclick: icsExport }), el('p', { class: 'meta', text: 'This brings outside events in and lets you export ours. Changes made in Google do not need a Google sign-in. Writing back to Google needs a Google Cloud app of your own, which is not set up here.' }));
  el.__f = file;
};
async function fetchIcs(url) {
  if (window.OFFICE_ICS) return window.OFFICE_ICS(url);             // hosted: the server fetches it (browsers block it)
  const r = await fetch(url, { mode: 'cors' }).catch(() => null); if (!r || !r.ok) throw new Error('Your browser cannot reach that calendar from here. In the WordPress office this works automatically; for now use "Import a .ics file".'); return r.text();
}
setInterval(() => { const u = LS.get('icsUrl', ''); if (u && document.visibilityState === 'visible' && Date.now() - num(LS.get('icsAt', 0), 0) > 30 * 60000) { LS.set('icsAt', Date.now()); fetchIcs(u).then(t => icsImport(t, 'url')).catch(() => { }); } }, 60000);
function initV12() { setInterval(officeSigns, 2500); Store.on('cal', () => { try { officeSigns(); } catch (e) { } }); }
