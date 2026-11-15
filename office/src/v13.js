/* ============================ v13: the TV wall (admin controlled, watched together), call bar view modes ============================ */
const TVP = { x: 0.1, z: 17.9, w: 4.2, h: 2.36 };
const TV = { tex: null, scr: null, vid: null, aud: null, vtex: null, key: '', open: null, vk: '' };
function tvDoc() { const d = Store.col('office').get('tv') || {}; return { on: !!d.on, u: typeof d.u === 'string' && /^https:\/\//.test(d.u) ? d.u.slice(0, 500) : '', k: d.k === 'video' || d.k === 'audio' || d.k === 'img' ? d.k : 'embed', n: str(d.n, 80), mute: d.mute !== false, play: d.play !== false, t0: num(d.t0, 0), pos: num(d.pos, 0), v: clamp(num(d.v, 0.7), 0, 1), im: /^data:image\//.test(d.im || '') ? d.im : '', rev: num(d.rev, 0) }; }
function tvSet(p) { if (!net.admin) { toast('Only an admin can control the TV wall.'); return; } const d = tvDoc(); Store.set('office', 'tv', Object.assign({ on: d.on, u: d.u, k: d.k, n: d.n, mute: d.mute, play: d.play, t0: d.t0, pos: d.pos, v: d.v, im: d.im }, p, { rev: Date.now() })); }
const tvAt = d => d.play ? d.pos + Math.max(0, Date.now() - d.t0) / 1000 : d.pos;
const tvKind = u => /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(u) ? 'video' : /\.(mp3|m4a|aac|ogg|wav|flac)(\?|#|$)/i.test(u) || /(icecast|shoutcast|radio|stream)/i.test(u) && !EMBED_OK.test(u) ? 'audio' : /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(u) ? 'img' : 'embed';
function tvEmbed(u, d) {
  let x; try { x = new URL(u); } catch (e) { return ''; } const h = x.hostname.replace(/^www\./, '');
  if (h === 'youtube.com' && x.pathname === '/watch' && x.searchParams.get('v')) x = new URL('https://www.youtube.com/embed/' + x.searchParams.get('v').replace(/[^\w-]/g, ''));
  else if (h === 'youtu.be') x = new URL('https://www.youtube.com/embed/' + x.pathname.slice(1).replace(/[^\w-]/g, ''));
  else if (h === 'vimeo.com' && /^\/\d+/.test(x.pathname)) x = new URL('https://player.vimeo.com/video' + x.pathname);
  if (!EMBED_OK.test(x.href)) return '';
  if (/youtube/.test(x.hostname)) { x.searchParams.set('autoplay', d.play ? '1' : '0'); x.searchParams.set('mute', d.mute || TV.lmute ? '1' : '0'); x.searchParams.set('start', String(Math.floor(tvAt(d)))); x.searchParams.set('rel', '0'); }
  else if (/vimeo/.test(x.hostname)) { x.searchParams.set('autoplay', d.play ? '1' : '0'); x.searchParams.set('muted', d.mute || TV.lmute ? '1' : '0'); x.hash = 't=' + Math.floor(tvAt(d)) + 's'; }
  return x.href;
}
function tvBuild() {
  const g = new T.Group(); g.position.set(TVP.x, 0, TVP.z); g.rotation.y = PI / 2; W.ext.w.parent ? W.ext.w.add(g) : office.add(g); g.position.set(0.02, 0, TVP.z); g.position.x = 0.02;
  box(g, TVP.w + 0.3, TVP.h + 0.3, 0.1, M_DARK, 0, 1.95, 0.05, { cast: 1 }); box(g, 4.2, 0.07, 0.25, M_DARK, 0, 0.62, 0.12, { cast: 1 });
  TV.tex = dynTex(1280, 720); TV.scr = new T.Mesh(new T.PlaneGeometry(TVP.w, TVP.h), new T.MeshBasicMaterial({ map: TV.tex.tex })); TV.scr.position.set(0, 1.95, 0.105); g.add(TV.scr); TV.key = ''; TV.vk = '';
  addPick({ x: 0.15, y: 1.95, z: TVP.z, w: 0.3, h: TVP.h, d: TVP.w, label: 'TV wall', ax: 1.9, az: TVP.z, act: () => openPanel('tv'), near: 3.2 });
  tvRender();
}
function tvPoster(d) {
  const key = JSON.stringify([d.on, d.u, d.k, d.n, d.play, d.mute, !!d.im]) + (d.on && d.play ? Math.floor(Date.now() / 5000) : ''); if (key === TV.key) return; TV.key = key;
  const ok = img => TV.tex.draw((c, w, h) => { c.fillStyle = '#05080d'; c.fillRect(0, 0, w, h); if (!d.on) { c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '600 44px ' + FONT_D; c.textAlign = 'center'; c.fillText('TV wall is off', w / 2, h / 2); c.font = '500 28px ' + FONT_B; c.fillText('An admin can switch it on', w / 2, h / 2 + 50); return; }
    if (img) { const k = Math.min(w / img.width, h / img.height); c.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k); return; }
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16233a'); gr.addColorStop(1, '#2a1647'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '700 64px ' + FONT_D; c.fillText(d.n || 'Now showing', w / 2, h / 2 - 20, w - 120);
    c.font = '600 34px ' + FONT_B; c.fillStyle = '#9fd0ff'; c.fillText((d.play ? '▶ Playing' : '⏸ Paused') + ' · ' + (d.mute ? '🔇 sound off' : '🔊 sound on'), w / 2, h / 2 + 50); c.font = '500 28px ' + FONT_B; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(d.k === 'embed' ? 'Click the TV to watch together' : d.k === 'audio' ? 'Audio plays in the lounge: the closer you stand the louder it is' : 'Playing on the wall', w / 2, h / 2 + 100); });
  if (d.on && d.k === 'img' && (d.im || d.u)) { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = d.im || d.u; } else ok(null);
}
function tvStop() { for (const k of ['vid', 'aud']) if (TV[k]) { try { TV[k].pause(); TV[k].removeAttribute('src'); TV[k].load(); } catch (e) { } TV[k] = null; } if (TV.vtex) { TV.vtex.dispose(); TV.vtex = null; } if (TV.scr) { TV.scr.material.map = TV.tex.tex; TV.scr.material.needsUpdate = true; } TV.vk = ''; }
function tvRender() {
  if (!TV.tex) return; const d = tvDoc(); tvPoster(d); const want = d.on && d.u && (d.k === 'video' || d.k === 'audio') ? d.k + d.u : '';
  if (want !== TV.vk) { tvStop(); TV.vk = want; if (want) { const m = document.createElement(d.k === 'video' ? 'video' : 'audio'); m.crossOrigin = 'anonymous'; m.playsInline = true; m.loop = true; m.preload = 'auto'; m.src = d.u; m.onerror = () => { toast('The TV could not load that file. Check the address allows sharing.'); }; if (d.k === 'video') { TV.vid = m; TV.vtex = new T.VideoTexture(m); TV.vtex.encoding = T.sRGBEncoding; TV.scr.material.map = TV.vtex; TV.scr.material.needsUpdate = true; } else TV.aud = m; } }
  const m = TV.vid || TV.aud; if (m) {
    const dist = Math.hypot(me.pos.x - 0, me.pos.z - TVP.z), near = TV.open ? 1 : clamp(1 - dist / 15, 0, 1), vol = d.mute || TV.lmute ? 0 : d.v * near; m.volume = clamp(vol, 0, 1); m.muted = vol === 0;
    if (m.readyState > 0 && d.play) { const dur = m.duration || 0, want = dur ? tvAt(d) % dur : tvAt(d); if (Math.abs(m.currentTime - want) > 2.2) m.currentTime = want; if (m.paused) m.play().catch(() => { m.muted = true; m.play().catch(() => { }); }); } else if (!d.play && !m.paused) m.pause(); }
  if (TV.open) { if (TV.open.rev !== d.rev || !d.on || d.u !== TV.open.u) { if (!d.on || !d.u || d.k !== 'embed') tvClose(); else tvWatch(); } }
}
function tvWatch() {
  const d = tvDoc(); if (!d.on || !d.u) { toast('The TV wall is off.'); return; } if (d.k !== 'embed') { toast(d.k === 'audio' ? 'Audio is playing in the lounge. Walk closer to hear it better.' : 'It is playing on the wall.'); return; }
  const src = tvEmbed(d.u, d); if (!src) { toast('That address cannot be shown inside the office.'); return; } tvClose(true);
  const box_ = el('div', { id: 'tvview', class: 'island', style: 'position:fixed;inset:5vh 5vw;z-index:30;display:flex;flex-direction:column;gap:8px;padding:10px;background:#0b1118' }, el('div', { class: 'row' }, el('b', { style: 'flex:1;color:#fff', text: '📺 ' + (d.n || 'TV wall') + ' · watching together' }), el('button', { class: 'btn sm ghost', text: TV.lmute ? '🔊 Sound on for me' : '🔇 Mute for me', onclick: () => { TV.lmute = !TV.lmute; tvWatch(); } }), el('button', { class: 'btn sm ghost', text: '⟲ Catch up', onclick: () => tvWatch() }), el('button', { class: 'btn sm', text: 'Close', onclick: () => tvClose() })),
    el('iframe', { src, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'no-referrer', style: 'flex:1;width:100%;border:0;border-radius:10px;background:#000' }));
  document.body.append(box_); TV.open = { rev: d.rev, u: d.u };
}
function tvClose(keep) { const v = $('#tvview'); if (v) v.remove(); if (!keep) TV.open = null; }
panels.tv = b => {
  const draw = () => { const d = tvDoc(); b.replaceChildren(); const adm = net.admin;
    b.append(el('p', { class: 'big', text: d.on ? (d.n || 'Showing') : 'The TV wall is off' }), el('p', { class: 'meta', text: d.on ? (d.play ? '▶ Playing' : '⏸ Paused') + ' · ' + (d.mute ? '🔇 sound off for everyone' : '🔊 sound on') : 'Everyone in the office sees the same thing at the same time.' }),
      el('div', { class: 'row' }, d.on && d.k === 'embed' ? el('button', { class: 'btn', text: '📺 Watch together (large)', onclick: () => { closeDrawer(); tvWatch(); } }) : null, el('button', { class: 'btn ghost', text: TV.lmute ? '🔊 Sound on for me' : '🔇 Mute for me', onclick: () => { TV.lmute = !TV.lmute; draw(); } })));
    if (!adm) { b.append(el('p', { class: 'meta', text: 'An admin chooses what is shown, and controls sound, play and pause for the whole office.' })); return; }
    const list = (Store.col('office').get('media') || {}).list || MEDIA_DEF, url = el('input', { type: 'url', placeholder: 'Paste a YouTube, Vimeo, Loom link, or a .mp4 / .mp3 / picture address', style: 'width:100%' });
    const show = (u, n, k) => { const kind = k || tvKind(u); if (kind === 'embed' && !tvEmbed(u, { play: 1, mute: 1, t0: 0, pos: 0 })) { toast('That site cannot be shown inside the office. Use a direct video, audio or picture address.'); return; } tvSet({ on: true, u, n, k: kind, play: true, mute: kind === 'embed' ? d.mute : d.mute, t0: Date.now(), pos: 0, im: '' }); toast('Now showing: ' + n); };
    b.append(el('h3', { text: 'Controls (admin)' }), el('div', { class: 'row' }, el('button', { class: 'btn' + (d.on ? ' danger' : ''), text: d.on ? '⏻ Switch off' : '⏻ Switch on', onclick: () => { tvSet({ on: !d.on }); } }),
      el('button', { class: 'btn ghost', text: d.play ? '⏸ Pause' : '▶ Play', onclick: () => tvSet(d.play ? { play: false, pos: tvAt(d) } : { play: true, t0: Date.now() }) }), el('button', { class: 'btn ghost', text: '⟲ From the start', onclick: () => tvSet({ pos: 0, t0: Date.now(), play: true }) }),
      el('button', { class: 'btn ghost', text: d.mute ? '🔊 Unmute and play on' : '🔇 Mute (keep playing)', onclick: () => tvSet(d.mute ? { mute: false, play: true, t0: d.play ? d.t0 : Date.now(), pos: d.play ? d.pos : d.pos } : { mute: true }) })),
      el('label', { class: 'meta', text: 'Volume ' }, el('input', { type: 'range', min: 0, max: 100, value: Math.round(d.v * 100), onchange: e => tvSet({ v: e.target.value / 100 }) })),
      el('h3', { text: 'Change what is shown' }), url, el('div', { class: 'row' }, el('button', { class: 'btn', text: 'Show it', onclick: () => { const u = url.value.trim(); if (!/^https:\/\//.test(u)) { toast('Paste an https address.'); return; } show(u, u.replace(/^https:\/\/(www\.)?/, '').slice(0, 50)); } }),
        el('button', { class: 'btn ghost', text: '🖼 Show a picture', onclick: async () => { const im = await pickImage(1280, 140000); if (im) { tvSet({ on: true, u: 'https://picture.local/', k: 'img', n: 'Picture', im, play: true, t0: Date.now(), pos: 0 }); } } })),
      el('p', { class: 'meta', text: 'Quick picks' }), el('div', { class: 'actgrid' }, ...list.slice(0, 12).map(x => el('button', { class: 'actbtn', onclick: () => show(x.u, x.n, 'embed') }, el('b', { text: x.n })))));
  }; draw(); return draw;
};
/* ---- call bar: enlarge or minimise ---- */
function cbView(v) { RTC.view = v; applyCbView(); }
function applyCbView() { const bar = $('#callbar'); if (!bar) return; bar.dataset.v = RTC.view || ''; const tg = bar.querySelector('.cb-view'); if (tg) { tg.replaceChildren(el('button', { title: RTC.view === 'min' ? 'Show the call' : 'Minimise', text: RTC.view === 'min' ? '▢' : '–', onclick: () => cbView(RTC.view === 'min' ? '' : 'min') }), el('button', { title: RTC.view === 'max' ? 'Back to normal size' : 'Enlarge', text: RTC.view === 'max' ? '⤡' : '⤢', onclick: () => cbView(RTC.view === 'max' ? '' : 'max') })); } }
function initV13() {
  const st = document.createElement('style'); st.textContent = '#callbar[data-v=max]{inset:70px 4vw 80px 4vw;right:auto;bottom:auto;width:auto;z-index:12}#callbar[data-v=max] .cb-tiles{max-height:none;flex:1;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-content:center}#callbar[data-v=min] .cb-tiles,#callbar[data-v=min] .cb-hint{display:none}#callbar[data-v=min]{width:auto;min-width:220px}.cb-view{display:inline-flex;gap:2px}#tvview iframe{min-height:0}'; document.head.append(st);
  Store.on('office', () => { try { tvRender(); } catch (e) { } }); setInterval(() => { try { tvRender(); } catch (e) { } }, 1000);
  window.addEventListener('pointerdown', () => { const m = TV.vid || TV.aud; if (m && m.paused) tvRender(); }, { once: false, passive: true });
}
