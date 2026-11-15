/* ============================ v7: clear view, mobile menu, office designer, private office locks, self-service fixes ============================ */
const ERRS = []; addEventListener('error', e => { ERRS.push((e.message || 'error') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno); if (ERRS.length > 12) ERRS.shift(); });
addEventListener('unhandledrejection', e => { ERRS.push('promise: ' + String(e.reason && e.reason.message || e.reason).slice(0, 120)); if (ERRS.length > 12) ERRS.shift(); });
const V7 = { clear: false };
/* ---- plans and add-ons (set by the signed Zuchera licence on hosted installs; the preview shows everything with the watermark) ---- */
const ZPUB = 'hE26P1ziIx/WWA50kTc6owcr9/FoBhqCaF0NR7Oailc=', FEATS = ['build', 'media', 'ai', 'record', 'apps', 'photo', 'multi', 'brand', 'suites'];
const TIERS_JS = { starter: ['Starter', 5, [], true], team: ['Team', 30, ['build', 'media'], false], business: ['Business', 100, ['build', 'media', 'ai', 'record', 'apps', 'photo', 'suites'], false], enterprise: ['Enterprise', 0, FEATS, false], internal: ['Zuchera (internal)', 0, FEATS, false] };
const ub64 = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
let CLIC = null;
async function verifyKey(key) {
  try {
    const [p, s] = String(key).trim().split('.'); if (!p || !s) return { err: 'That key is not complete.' };
    const k = await crypto.subtle.importKey('raw', ub64(ZPUB), { name: 'Ed25519' }, false, ['verify']);
    if (!(await crypto.subtle.verify('Ed25519', k, ub64(s), new TextEncoder().encode(p)))) return { err: 'That key is not valid.' };
    const d = JSON.parse(new TextDecoder().decode(ub64(p))), t = TIERS_JS[d.tier]; if (!t) return { err: 'That key is not valid.' };
    if (d.exp && d.exp * 1000 < Date.now()) return { err: 'This licence has expired. Renew it to keep your plan.' };
    if (d.site && location.hostname && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && d.site.toLowerCase() !== location.hostname.replace(/^www\./, '').toLowerCase()) return { err: 'This key is for a different website.' };
    return { lic: { tier: d.tier, label: t[0], seats: d.seats > 0 ? d.seats : t[1], used: 0, addons: [...new Set(t[2].concat(d.addons || []))], wm: d.wm === false ? false : t[3], org: d.org || '', valid: true, exp: d.exp || 0 } };
  } catch (e) { return { err: 'This browser cannot check licence keys. Use a current Chrome, Edge, Firefox or Safari.' }; }
}
async function loadClientLic() { const k = LS.get('lickey', ''); if (!k) { CLIC = null; return; } const r = await verifyKey(k); CLIC = r.lic || null; if (!CLIC) LS.set('lickey', ''); }
const isPreview = () => !!(window.claude && typeof window.claude.use === 'function') && !window.OFFICE_CONFIG;
const LIC = () => {
  if (window.OFFICE_CONFIG && window.OFFICE_CONFIG.lic) return window.OFFICE_CONFIG.lic; if (CLIC) return CLIC;
  const pre = { addons: FEATS.slice(), wm: true, seats: 100, used: 0, valid: false };
  if (isPreview()) return Object.assign(pre, { tier: 'preview', label: 'Preview (every feature)', preview: true });
  let t0 = LS.get('trial0', 0); if (!t0) { t0 = Date.now(); LS.set('trial0', t0); } const left = Math.ceil((t0 + 14 * 864e5 - Date.now()) / 864e5);
  return left > 0 ? Object.assign(pre, { tier: 'trial', label: 'Free trial', trial: left }) : { tier: 'starter', label: 'Starter', seats: 5, used: 0, addons: [], wm: true, valid: false, ended: true };
};
const has = a => LIC().addons.includes(a);
const staff = () => LIC().tier === 'internal';
const TIER_INFO = [['trial', 'Free trial · 14 days', 'Everything switched on, with the Zuchera watermark.', ''], ['starter', 'Starter', 'Up to 5 people, core office, talk, mail, calendar, docs. Zuchera watermark.', '£10 a month'], ['team', 'Team', 'Up to 30 people, no watermark, layout editor and item library, media.', '£30 a month'], ['business', 'Business', 'Up to 100 people, every advanced feature: AI robot, app integrations, photo-matched office, recorded meetings.', '£50 a month'], ['enterprise', 'Enterprise', 'Unlimited people, multi-floor and community add-ons, white-label branding.', 'Talk to us']];
function upgradeUrl(plan) { const L = LIC(), base = L.buy || 'https://portal.zuchera.com'; return base.replace(/\/$/, '') + '/checkout?plan=' + plan + '&site=' + encodeURIComponent(L.site || location.hostname || 'offline') + '&org=' + encodeURIComponent(conf.name); }
function planCard() {
  const L = LIC(), key = el('textarea', { rows: 3, placeholder: 'Paste a licence key', style: 'width:100%;font-family:monospace;font-size:11px' }), msg = el('p', { class: 'meta' });
  const hosted = !!(window.OFFICE_CONFIG && window.OFFICE_CONFIG.lic);
  return el('div', { class: 'card' }, el('b', { text: 'Your plan: ' + L.label + (L.org ? ' · ' + L.org : '') }),
    el('span', { class: 'meta', text: L.tier === 'trial' ? L.trial + ' days left of your free trial. Every feature is on.' : L.ended ? 'Your trial has ended. Choose a plan to unlock features.' : L.preview ? 'Preview: every feature is on.' : (L.seats > 0 ? (L.used || '?') + ' of ' + L.seats + ' seats in use' : 'Unlimited seats') + (L.exp ? ' · renews ' + new Date(L.exp * 1000).toLocaleDateString() : '') + (staff() ? ' · full access' : '') }),
    ...TIER_INFO.map(([k, n, t, p]) => el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:6px' }, el('div', { style: 'flex:1;min-width:180px' }, el('b', { text: n + (p ? ' · ' + p : '') }), el('div', { class: 'meta', text: t })), k !== 'trial' && k !== L.tier && (net.admin || !hosted) ? el('a', { class: 'btn sm' + (k === 'enterprise' ? ' ghost' : ''), href: upgradeUrl(k), target: '_blank', rel: 'noopener', text: k === 'enterprise' ? 'Contact Zuchera' : 'Choose ' + n }) : (k === L.tier ? el('span', { class: 'meta', text: '✓ current' }) : null))),
    net.admin || !hosted ? el('div', { style: 'display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:8px' }, el('b', { text: 'Have a licence key?' }), key, el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'Activate', onclick: async () => { const k = key.value.trim(); if (!k) return; if (hosted) { const r = await (window.OFFICE_ADMIN && OFFICE_ADMIN.license ? OFFICE_ADMIN.license(k).catch(e => ({ err: String(e.message || e) })) : { err: 'Not available here.' }); msg.textContent = r && r.ok ? 'Activated. Reloading…' : (r && r.err) || 'Could not activate.'; if (r && r.ok) setTimeout(() => location.reload(), 1200); return; } const r = await verifyKey(k); if (r.lic) { LS.set('lickey', k); CLIC = r.lic; msg.textContent = 'Activated: ' + r.lic.label + '.'; toast('Plan activated: ' + r.lic.label); applyWatermark(); refreshPanel('plans'); } else msg.textContent = r.err; } }), !hosted && CLIC ? el('button', { class: 'btn sm ghost', text: 'Remove key', onclick: () => { LS.set('lickey', ''); CLIC = null; refreshPanel('plans'); applyWatermark(); } }) : null), msg) : null,
    hosted && net.admin && window.OFFICE_ADMIN && OFFICE_ADMIN.claim ? el('div', { class: 'row' }, el('button', { class: 'btn sm', text: 'I have paid: activate my plan', onclick: async () => { try { const r = await OFFICE_ADMIN.claim(); toast('Plan activated: ' + r.tier + '. Reloading…'); setTimeout(() => location.reload(), 1200); } catch (e) { toast(String(e.message || e)); } } })) : null,
    el('p', { class: 'meta', text: 'Ask your Zuchera account manager to upgrade or add seats.' }));
}
panels.plans = b => { b.append(planCard()); };
function applyWatermark() { let w = $('#zwm'); const on = LIC().wm; if (on && !w) { w = el('a', { id: 'zwm', href: 'https://zuchera.com', target: '_blank', rel: 'noopener', text: 'Powered by ZUCHERA' }); document.body.append(w); } else if (!on && w) w.remove(); }

function setClear(on) { V7.clear = on; document.body.classList.toggle('clearview', on); const b = $('#bShow'); if (b) b.hidden = !on; if (on) { closeDrawer(); } }
function closeTop() { if ($('#drawer').classList.contains('open')) { closeDrawer(); return true; } const t = $('#talk'), w = $('#work'); if (t && !t.hidden) { talk(false); return true; } if (w && !w.hidden) { work(false); return true; } return false; }

/* ---- office designer ---- */
panels.design = b => {
  const sel = { kind: conf.kind, bays: conf.bays, view: conf.view };
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }); b.append(box);
  const draw = () => {
    box.replaceChildren(
      el('p', { text: 'Choose the kind of organisation this office is for. Colours, floors and area names change to suit it, and you can switch or redesign at any time. Nothing is lost when you switch.' }),
      el('h3', { text: 'Office type' }),
      el('div', { class: 'actgrid' }, ...Object.entries(PRESETS).map(([k, p]) => el('button', { class: 'actbtn' + (sel.kind === k ? ' sel' : ''), style: sel.kind === k ? 'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand) inset' : '', onclick: () => { sel.kind = k; draw(); } }, el('span', { class: 'ai', text: p.icon }), el('span', { text: p.label }), el('small', { class: 'meta', text: p.note })))),
      el('h3', { text: 'Size' }),
      el('div', { class: 'chips' }, ...[3, 4, 5, 6, 8].map(n => el('button', { type: 'button', class: sel.bays === n ? 'sel' : '', text: n * 12 - 6 + ' desks · ' + n + ' bays', onclick: () => { sel.bays = n; draw(); } }))),
      el('h3', { text: 'What is outside the windows' }),
      el('div', { class: 'chips' }, ...[['city', '🌆 City skyline'], ['sky', '☁️ Open sky only']].map(([k, t]) => el('button', { type: 'button', class: sel.view === k ? 'sel' : '', text: t, onclick: () => { sel.view = k; draw(); } }))),
      el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Apply to the office', onclick: () => { if (!net.admin) { toast('Only an admin can redesign the office.'); return; } Store.set('office', 'config', Object.assign({}, Store.col('office').get('config') || {}, { kind: sel.kind, bays: sel.bays, view: sel.view, designed: true, games: PRESETS[sel.kind].games })); toast('Office redesigned. Everyone sees the new look.'); closeDrawer(); } }), el('button', { class: 'btn ghost', text: 'Later', onclick: closeDrawer })),
      el('p', { class: 'meta', text: 'Coming with the multi-floor edition: extra floors and lifts, a street to walk on, and neighbouring businesses in a shared community.' }));
  }; draw();
};

/* ---- self-service fixes ---- */
panels.fixit = b => {
  const out = el('p', { class: 'meta' });
  const diag = () => ['StartDotCom HQ v7', new Date().toString(), navigator.userAgent, innerWidth + 'x' + innerHeight + ' dpr' + devicePixelRatio, 'quality ' + (local.quality || 'auto'), 'people ' + peers.size + ' · docs ' + [...Object.keys(Store.data)].length + ' collections', 'online ' + navigator.onLine, 'errors: ' + (ERRS.length ? '\n  ' + ERRS.join('\n  ') : 'none')].join('\n');
  const btn = (t, f, cls) => el('button', { class: 'btn ' + (cls || 'ghost'), text: t, onclick: f });
  b.append(el('p', { text: 'If something looks stuck or laggy, try these before asking anyone. Most problems clear in one click.' }),
    el('h3', { text: 'Screen' }),
    el('div', { class: 'row' }, btn('Reset my screen', () => { setClear(false); closeDrawer(); if ($('#talk')) talk(false); if ($('#work')) work(false); document.body.classList.remove('mmore'); toast('Screen reset.'); }, ''), btn('Reload latest version', () => location.reload())),
    el('h3', { text: 'Smoothness' }),
    el('div', { class: 'row' }, ...[['lite', 'Fast'], ['standard', 'Balanced'], ['high', 'Best looking']].map(([q, t]) => btn(t, () => { local.quality = q; LS.set('local', local); setQuality(q); toast('Graphics: ' + t); }))),
    el('h3', { text: 'My avatar' }),
    el('div', { class: 'row' }, btn('I am stuck: take me to the lobby', () => { if (me.seat) stand(); const f = nearestFree(12, 4.4); me.pos.x = f.x; me.pos.z = f.z; me.path = null; toast('Back in the lobby.'); }), btn('Refresh my look', () => { me.av.rebuild(me.cfg); toast('Refreshed.'); })),
    el('h3', { text: 'Tell your admin' }),
    el('p', { text: 'Copy these details and paste them in a message. They show what the app was doing.' }),
    btn('Copy diagnostics', async () => { try { await navigator.clipboard.writeText(diag()); toast('Copied.'); } catch (e) { out.textContent = diag(); } }, 'go'), out);
};

/* ---- private office locks ---- */
function privDoc(d) { return Store.col('rooms').get('p_' + d.id) || {}; }
function privLocked(d) { return !!privDoc(d).lock; }
function lockButton(d) { const L = privLocked(d); return el('button', { class: 'btn ' + (L ? 'danger' : 'ghost'), text: L ? '🔒 Door locked: click to open it to visitors' : '🔓 Door open: click to lock for privacy', onclick: () => { Store.set('rooms', 'p_' + d.id, { lock: !L, by: me.uid, t: Date.now() }); toast(L ? 'Office open to visitors.' : 'Office locked. Visitors can knock.'); } }); }
function knockOffice(d) { me.ping = { to: 'room:office' + d.id.slice(1), k: 'knock', n: Date.now() }; toast('You knocked on ' + (d.ownerName || 'the') + ' office door.'); }
function applyPrivDoors() {
  for (const d of W.desks) { if (!d.priv) continue;
    const block = privLocked(d) && d.owner !== me.uid && !(me.zone && me.zone.id === 'office' + d.id.slice(1));
    const x0 = d.x - 1.3 + 2.0, x1 = d.x - 1.3 + 3.05;
    if (!d.leaf || d.leaf.parent !== office) { d.leaf = new T.Mesh(new T.BoxGeometry(x1 - x0, 2.1, 0.05), new T.MeshStandardMaterial({ color: 0x24303d, roughness: .5, transparent: true, opacity: .9 })); d.leaf.position.set((x0 + x1) / 2, 1.05, 4.4); office.add(d.leaf); d.leaf.visible = false; d.blk = false; }
    const lk = privLocked(d); if (d.leaf.visible !== lk) d.leaf.visible = lk;
    if (d.blk !== block) { d.blk = block; for (let x = x0 - 0.1; x <= x1 + 0.1; x += CELL / 2) for (const z of [4.2, 4.4, 4.6]) { const i = Math.floor(x / CELL), j = Math.floor(z / CELL); if (i >= 0 && j >= 0 && i < NX && j < NZ) grid[j * NX + i] = block ? 2 : (grid[j * NX + i] === 2 ? 0 : grid[j * NX + i]); } }
  }
}

function initV7() {
  const top = $('#topbtns');
  const mk = (id, t, f, hid) => { const b = el('button', { class: 'tb', id, text: t, onclick: f }); if (hid) b.hidden = true; return b; };
  const more = el('button', { class: 'tb', id: 'bMore', 'aria-label': 'More buttons', text: '☰', onclick: () => document.body.classList.toggle('mmore') });
  top.prepend(more);
  top.append(mk('bDesign', '🎨 Design', () => openPanel('design'), true), mk('bBuild', '🛠 Build', () => openPanel('library'), true), mk('bPlan', '💎 Plan', () => openPanel('plans')), mk('bFix', '🛠 Fix', () => openPanel('fixit')), mk('bClear', '👁 Clear view', () => setClear(true)));
  const show = el('button', { id: 'bShow', class: 'island', hidden: true, text: '👁 Show panels', onclick: () => setClear(false) }); document.body.append(show);
  const dk = el('button', { class: 'island', id: 'dockT', 'aria-label': 'Show or hide actions', text: '⌃ Actions', onclick: () => document.body.classList.toggle('dkopen') }); document.body.append(dk);
  addEventListener('keydown', e => { if (typing()) return; if (e.key === 'Escape') { if (!closeTop() && V7.clear) setClear(false); } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) setClear(!V7.clear); });
  $('#canvas') && $('#canvas').addEventListener('pointerdown', () => { if (innerWidth < 760) { document.body.classList.remove('mmore', 'dkopen'); if ($('#drawer').classList.contains('open')) closeDrawer(); } });
  document.addEventListener('click', e => { if (innerWidth < 760 && e.target.closest && e.target.closest('#topbtns .tb:not(#bMore)')) document.body.classList.remove('mmore'); });
  loadClientLic().then(() => { applyWatermark(); }); applyWatermark(); setInterval(() => { const a = $('#bDesign'); if (a) a.hidden = !net.admin; const bb = $('#bBuild'); if (bb) bb.hidden = !net.admin; const pb = $('#bPlan'); if (pb) { const L = LIC(); pb.textContent = L.tier === 'trial' ? '💎 Trial ' + L.trial + 'd' : '💎 ' + (L.label || 'Plan').replace(' (every feature)', ''); } applyWatermark(); applyPrivDoors(); }, 400);
  Store.on('rooms', () => { refreshPanel('desk'); });
  setTimeout(() => { if (net.admin && !conf.designed && !LS.get('designAsked', false)) { LS.set('designAsked', true); toast('Welcome! Design your office to suit your organisation.', { ms: 20000, action: { label: 'Design', fn: () => openPanel('design') } }); } }, 6000);
}
