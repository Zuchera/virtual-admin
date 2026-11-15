/* ============================ realistic people: Microsoft Rocketbox avatars (MIT) with motion-captured animation ============================ */
const HUMANS = [
  ['f1', 'f', 'Business_Female_01'], ['f2', 'f', 'Business_Female_02'], ['f3', 'f', 'Business_Female_03'], ['f4', 'f', 'Business_Female_04'], ['f5', 'f', 'Female_Adult_01'], ['f6', 'f', 'Female_Adult_02'], ['f7', 'f', 'Female_Adult_03'], ['f8', 'f', 'Female_Adult_04'], ['f9', 'f', 'Female_Adult_05'], ['f10', 'f', 'Female_Adult_06'],
  ['m1', 'm', 'Business_Male_01'], ['m2', 'm', 'Business_Male_02'], ['m3', 'm', 'Business_Male_03'], ['m4', 'm', 'Business_Male_04'], ['m5', 'm', 'Business_Male_05'], ['m6', 'm', 'Business_Male_06'], ['m7', 'm', 'Business_Male_07'], ['m8', 'm', 'Male_Adult_01'], ['m9', 'm', 'Male_Adult_02'], ['m10', 'm', 'Male_Adult_03']];
if (Array.isArray(window.OFFICE_LOOKS)) { for (let i = HUMANS.length - 1; i >= 0; i--) if (!window.OFFICE_LOOKS.includes(HUMANS[i][0])) HUMANS.splice(i, 1); }   // a lighter install can ship fewer looks
const lookId = id => HUMANS.some(h => h[0] === id) ? id : ((HUMANS.find(h => h[1] === String(id || 'm')[0]) || HUMANS[0] || [id])[0]);
const HUMAN_BASE = (window.OFFICE_ASSETS || 'models/');
const humanThumb = id => { id = lookId(id); const h = HUMANS.find(x => x[0] === id); return h ? HUMAN_BASE + 'thumbs/' + h[2] + '.jpg' : ''; };
const Hm = { models: {}, anims: {}, imgs: {} };
function loadHumanModel(id) { id = lookId(id); return Hm.models[id] || (Hm.models[id] = new Promise((ok, no) => { if (!T.GLTFLoader) return no(new Error('no loader')); new T.GLTFLoader().load(HUMAN_BASE + id + '.json', ok, undefined, no); })); }
function loadHumanAnims(g) {
  return Hm.anims[g] || (Hm.anims[g] = fetch(HUMAN_BASE + 'anim_' + g + '.json').then(r => { if (!r.ok) throw new Error('anim'); return r.json(); }).then(j => {
    const bin = atob(j.b64), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const T16 = new Uint16Array(buf, 0, j.tn), V16 = new Int16Array(buf, j.tn * 2, j.vn), out = {};
    for (const c of j.clips) {
      const tracks = [];
      for (const [node, p, n, tOff, vOff] of c.t) {
        const times = new Float32Array(n), w = p === 'q' ? 4 : 3, vals = new Float32Array(n * w); for (let i = 0; i < n; i++) times[i] = T16[tOff + i] / c.f;
        for (let i = 0; i < n * w; i++) vals[i] = V16[vOff + i] / (w === 4 ? 32767 : 1000);
        const nm = T.PropertyBinding.sanitizeNodeName(node); tracks.push(w === 4 ? new T.QuaternionKeyframeTrack(nm + '.quaternion', times, vals) : new T.VectorKeyframeTrack(nm + '.position', times, vals));
      }
      out[c.n] = new T.AnimationClip(c.n, c.d, tracks);
    }
    return out;
  }));
}
function humanImg(id) { if (!Hm.imgs[id]) { const im = new Image(); im.src = humanThumb(id); Hm.imgs[id] = im; } return Hm.imgs[id]; }

/* which clip suits each state; female set has no phone call clip, so headphones is used instead */
const ONE_SHOT = { wave: 'wave_01', clap: 'claphands_01', laugh: 'gestic_laugh_loud', bell: 'cheer_01', cheer: 'cheer_01', coffee: 'drink_drinking', shrug: 'gestic_shrug_01', think: 'gestic_thoughtful_01', present: 'gestic_presentation_right_01', stretch: 'idle_stretch_arms_01', yawn: 'idle_yawn_01', knock: 'knock_door', gift: 'invite_sit', nod: 'gestic_listen_neutral_01', invite: 'invite_sit' };
const DANCES = ['dancing_neutral', 'dancing_cool', 'dancing_silly'];
const ACT_DUR = { jump: 1.15, flip: 1.5, kick: 1.1, hug: 3.2, shake: 2.6, five: 1.6, climb: 11, tap: 1.2, pushup: 4, spin: 1.4 };
const _v = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], _q = [new T.Quaternion(), new T.Quaternion(), new T.Quaternion()], UP = new T.Vector3(0, 1, 0);
function aimBone(b, child, dir, w) {           // rotate a bone (in world space) so it points along dir; works whatever the bone's own axes are
  if (!b || !child || w <= 0) return; b.updateMatrixWorld(true); const p0 = b.getWorldPosition(_v[0]), p1 = child.getWorldPosition(_v[1]), cur = p1.sub(p0).normalize();
  const d = _v[2].copy(dir).normalize(), q = _q[0].setFromUnitVectors(cur, d), bw = b.getWorldQuaternion(_q[1]), pw = b.parent.getWorldQuaternion(_q[2]);
  const target = q.multiply(bw); pw.invert(); target.premultiply(pw); b.quaternion.slerp(target, Math.min(1, w)); b.updateMatrixWorld(true);
}
function turnBone(b, axis, ang) { if (!b || !ang) return; b.updateMatrixWorld(true); const q = _q[0].setFromAxisAngle(axis, ang), bw = b.getWorldQuaternion(_q[1]), pw = b.parent.getWorldQuaternion(_q[2]); const t = q.multiply(bw); pw.invert(); t.premultiply(pw); b.quaternion.copy(t); b.updateMatrixWorld(true); }
const env = (a, d, f) => clamp(Math.min(a / f, (d - a) / f), 0, 1);

const FACE_BONES = ['REye', 'LEye', 'MJaw', 'REyeBlinkTop', 'LEyeBlinkTop', 'REyeBlinkBottom', 'LEyeBlinkBottom', 'RMouthCorner', 'LMouthCorner', 'RCheek', 'LCheek', 'RInnerEyebrow', 'LInnerEyebrow', 'ROuterEyebrow', 'LOuterEyebrow', 'MMiddleEyebrow'];
class Avatar {
  constructor(cfg) {
    this.g = new T.Group(); this.pivot = new T.Group(); this.pivot.position.y = 0.95; this.inner = new T.Group(); this.inner.position.y = -0.95; this.g.add(this.pivot); this.pivot.add(this.inner); this.body = this.inner;
    this.ph = Math.random() * 6; this.labelKey = ''; this.bubT = 0; this.emoT = 9; this.S = 1; this.faceImg = null; this.headset = false; this.cur = null; this.curName = ''; this.lastEmo = -1; this.idleName = 'idle_neutral_01'; this.idleT = 8 + Math.random() * 10; this.acc = 0; this.frame = 0; this.shadowOn = null;
    const sh = new T.Mesh(geo('blobp', () => new T.PlaneGeometry(1, 1)), BLOB()); sh.rotation.x = -PI / 2; sh.position.y = 0.006; sh.scale.set(0.9, 0.7, 1); sh.renderOrder = 1; this.g.add(sh); this.shadow = sh;
    this.ghost = new T.Mesh(geo('ghost', () => new T.CylinderGeometry(0.2, 0.22, 1.7, 14)), new T.MeshStandardMaterial({ color: 0xb8c4d2, transparent: true, opacity: 0.35, depthWrite: false })); this.ghost.position.y = 0.85; this.g.add(this.ghost);
    this.labelD = dynTex(640, 256); this.label = new T.Sprite(new T.SpriteMaterial({ map: this.labelD.tex, transparent: true, depthWrite: false })); this.g.add(this.label);
    this.bubD = dynTex(512, 224); this.bub = new T.Sprite(new T.SpriteMaterial({ map: this.bubD.tex, transparent: true, depthWrite: false })); this.bub.scale.set(1.9, 0.83, 1); this.bub.visible = false; this.g.add(this.bub);
    this.emoD = dynTex(128, 128); this.emo = new T.Sprite(new T.SpriteMaterial({ map: this.emoD.tex, transparent: true, depthWrite: false })); this.emo.scale.set(.5, .5, 1); this.emo.visible = false; this.g.add(this.emo);
    this.handD = dynTex(128, 128); this.handD.draw((c, w, h) => { c.fillStyle = '#ffb627'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.font = '72px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', 64, 70); });
    this.handIcon = new T.Sprite(new T.SpriteMaterial({ map: this.handD.tex, transparent: true, depthWrite: false })); this.handIcon.scale.set(.42, .42, 1); this.handIcon.visible = false; this.g.add(this.handIcon);
    this.rebuild(cfg);
  }
  rebuild(cfg) {
    cfg = this.cfg = cleanCfg(cfg); this.S = cfg.ht; { const bw = [0.93, 1, 1.09][cfg.build] || 1; this.inner.scale.set(cfg.ht * bw, cfg.ht, cfg.ht * bw); } this.bub.position.y = 2.95 * this.S;
    const id = cfg.m, g = id.charAt(0); if (id === this.modelId) { this.applyTints(); return; } this.modelId = id; this.ready = false; this.labelKey = ''; this.thumb = humanImg(id); this.thumb.onload = () => { this.labelKey = ''; };
    Promise.all([loadHumanModel(id), loadHumanAnims(g)]).then(([gltf, clips]) => {
      if (this.modelId !== id || this.disposed) return;
      if (this.model) this.inner.remove(this.model); if (this.fallback) { this.inner.remove(this.fallback.body); this.fallback = null; }
      const m = this.model = T.SkeletonUtils.clone(gltf.scene); this.inner.add(m); this.bones = {};
      m.traverse(o => { if (o.isBone) this.bones[o.name.replace(/^Bip01_/, '')] = o; if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; const mt = o.material; if (mt) { mt.envMapIntensity = 0.55; if (mt.alphaTest > 0 || mt.name === 'opacity') { mt.alphaTest = 0.35; mt.transparent = false; mt.side = T.DoubleSide; } } } });
      this.ownMats(); this.applyTints();
      this.clips = clips; this.mixer = new T.AnimationMixer(m); this.actions = {}; this.cur = null; this.curName = '';
      this.attachProps(); this.ghost.visible = false; this.ready = true; this.play(this.idleName, 0); this.mixer.update(0.01); this.initFace();
    }).catch(() => this.useFallback());
  }
  ownMats() { this.model.traverse(o => { if (o.isMesh && o.material) o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); }); }
  applyTints() {            // skin depth, outfit colour and hair colour are tints on the person's own textures
    if (!this.model) return; const c = this.cfg, tm = TONE_MUL[c.tone] || [1, 1, 1], ot = c.otint ? new T.Color(TINT_SW[c.otint]) : null, ht = HAIR_T[c.htint] || [1, 1, 1];
    this.model.traverse(o => { if (!o.isMesh || !o.material) return; for (const m of [].concat(o.material)) { if (m.name === 'head') m.color.setRGB(tm[0], tm[1], tm[2]); else if (m.name === 'body') { if (ot) m.color.setRGB(.55 + ot.r * .45 + 0, .55 + ot.g * .45, .55 + ot.b * .45).multiply(new T.Color(tm[0] * .5 + .5, tm[1] * .5 + .5, tm[2] * .5 + .5)); else m.color.setRGB(tm[0] * .5 + .5, tm[1] * .5 + .5, tm[2] * .5 + .5); } else if (m.name === 'opacity') m.color.setRGB(ht[0], ht[1], ht[2]); } });
  }
  useFallback() {            // no model files (offline single-file preview): fall back to the built-in figure
    if (this.fallback || this.disposed) return; this.ghost.visible = false; this.fallback = new ProcAvatar(this.cfg); this.inner.add(this.fallback.body); this.fallback.body.position.set(0, 0, 0);
  }
  attachProps() {
    const B = this.bones, dark = mat('#14181d', { roughness: .3 });
    this.hs = new T.Group(); if (B.Head) { B.Head.add(this.hs); const M = (g, x, y, z, r) => { const me = new T.Mesh(g, dark); me.position.set(x, y, z); if (r) me.rotation.set(r[0], r[1], r[2]); this.hs.add(me); };
      // the Biped head bone points along +x (up the face) in its own space; a band, cups and a mic sized for it
      M(geo('hsb2', () => new T.TorusGeometry(0.105, 0.006, 6, 24, PI)), 0.1, 0, 0, [0, PI / 2, PI / 2]); M(geo('hsc2', () => new T.CylinderGeometry(0.03, 0.03, 0.02, 14)), 0.06, 0.0, 0.098); M(geo('hsc2', () => new T.CylinderGeometry(0.03, 0.03, 0.02, 14)), 0.06, 0, -0.098); }
    this.hs.visible = this.headset;
    this.mug = new T.Group(); if (B.R_Hand) { B.R_Hand.add(this.mug); const c = new T.Mesh(geo('mug4', () => new T.CylinderGeometry(0.036, 0.032, 0.09, 16)), mat('#ffffff', { roughness: .3 })); c.position.set(0.08, 0.02, 0.04); this.mug.add(c); } this.mug.visible = false;
  }
  /* the face: eyelids, eyes, brows, mouth corners and jaw are separate bones the body clips never touch, so they are driven here every frame from their rest pose */
  initFace() {
    const B = this.bones; this.face = null; if (!B.Head || !B.MJaw || !B.REyeBlinkTop) return; this.g.updateMatrixWorld(true);
    const q = this.g.getWorldQuaternion(new T.Quaternion()), fwd = new T.Vector3(0, 0, 1).applyQuaternion(q), right = new T.Vector3(-1, 0, 0).applyQuaternion(q), F = { rest: {}, ax: {}, blinkT: 1 + Math.random() * 4, blink: 0, eyeT: 0, ey: 0, ep: 0, eyc: 0, epc: 0, mouth: 0, smile: 0, brow: 0, far: 0 };
    for (const k of FACE_BONES) { const b = B[k]; if (!b) continue; F.rest[k] = [b.quaternion.clone(), b.position.clone()]; const inv = new T.Matrix4().copy(b.parent.matrixWorld).invert(), o = new T.Vector3().applyMatrix4(inv), L = v => v.clone().applyMatrix4(inv).sub(o); F.ax[k] = [L(UP), L(right), L(fwd)]; }
    this.face = F;
  }
  faceTick(dt, t, s, dist, right) {
    const F = this.face, B = this.bones; if (!F) return;
    if (dist > 11) { if (!F.far) { F.far = 1; for (const k in F.rest) { B[k].quaternion.copy(F.rest[k][0]); B[k].position.copy(F.rest[k][1]); } } return; } F.far = 0;
    for (const k in F.rest) { B[k].quaternion.copy(F.rest[k][0]); B[k].position.copy(F.rest[k][1]); }
    const laugh = s.emote === 'laugh' && s.emoteAge < 2.6, warm = (s.emote === 'wave' || s.emote === 'thumbs' || s.emote === 'heart') && s.emoteAge < 2.4, talking = s.speaking || this.bubT > 3.5 || s.call;
    F.blinkT -= dt; if (F.blinkT < 0 && !F.blink) { F.blink = 0.001; F.blinkT = (talking ? 1.6 : 2.4) + Math.random() * 4.5; } if (F.blink) { F.blink += dt / 0.16; if (F.blink >= 1) F.blink = 0; }
    const bl = F.blink ? Math.sin(F.blink * PI) : 0;
    let open = laugh ? 0.75 + 0.25 * Math.sin(t * 15) : typeof s.lvl === 'number' ? clamp((s.lvl - 0.012) * 8, 0, 1) : talking ? 0.25 + 0.75 * Math.abs(Math.sin(t * 9.3 + this.ph) * Math.sin(t * 5.1 + this.ph * 2)) : 0;
    F.mouth = lerp(F.mouth, open, Math.min(1, dt * 22)); F.smile = lerp(F.smile, laugh ? 1 : warm ? 0.8 : talking ? 0.22 : s.look ? 0.16 : 0.05, Math.min(1, dt * 6));
    F.brow = lerp(F.brow, laugh ? 0.8 : warm ? 0.5 : talking ? 0.5 * Math.max(0, Math.sin(t * 1.7 + this.ph)) : 0, Math.min(1, dt * 6));
    const mv = (k, u, r) => { const b = B[k], a = F.ax[k]; if (!b) return; if (u) b.position.addScaledVector(a[0], u); if (r) b.position.addScaledVector(a[1], r); };
    const lid = -0.0105 * bl - 0.0022 * F.smile; mv('REyeBlinkTop', lid); mv('LEyeBlinkTop', lid); mv('REyeBlinkBottom', 0.001 * bl + 0.0008 * F.smile); mv('LEyeBlinkBottom', 0.001 * bl + 0.0008 * F.smile);
    mv('RMouthCorner', 0.0055 * F.smile, 0.0065 * F.smile); mv('LMouthCorner', 0.0055 * F.smile, -0.0065 * F.smile); mv('RCheek', 0.003 * F.smile); mv('LCheek', 0.003 * F.smile);
    if (F.brow > 0.01) for (const k of ['RInnerEyebrow', 'LInnerEyebrow', 'ROuterEyebrow', 'LOuterEyebrow', 'MMiddleEyebrow']) mv(k, 0.0038 * F.brow);
    const jaw = 0.058 * F.mouth + (laugh ? 0.02 : 0); if (jaw > 0.002) turnBone(B.MJaw, right, -jaw);
    F.eyeT -= dt; if (F.eyeT < 0) { F.eyeT = 0.7 + Math.random() * 3.2; F.ey = (Math.random() - 0.5) * 0.26; F.ep = (Math.random() - 0.5) * 0.09; }
    F.eyc = lerp(F.eyc, F.ey + (this.lookA || 0) * 0.25, Math.min(1, dt * 28)); F.epc = lerp(F.epc, F.ep, Math.min(1, dt * 28));
    if (Math.abs(F.eyc) > 0.01 || Math.abs(F.epc) > 0.01) for (const k of ['REye', 'LEye']) { turnBone(B[k], UP, F.eyc); turnBone(B[k], right, F.epc); }
  }
  setHeadset(on) { this.headset = !!on; if (this.hs) this.hs.visible = this.headset; }
  setFace() { }
  play(name, fade, ts, once) {
    if (!this.mixer || !this.clips) return; const clip = this.clips[name] || this.clips.idle_neutral_01; if (!clip) return;
    let a = this.actions[clip.name]; if (!a) { a = this.actions[clip.name] = this.mixer.clipAction(clip); }
    a.timeScale = ts || 1; if (this.curName === clip.name && !once) return;
    a.reset(); a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!once; a.enabled = true; a.setEffectiveWeight(1);
    if (this.cur && this.cur !== a) { a.crossFadeFrom(this.cur, fade == null ? 0.3 : fade, false); } a.play(); this.cur = a; this.curName = clip.name;
  }
  setLabel(name, status, sub, task) {
    const img = this.thumb && this.thumb.complete && this.thumb.naturalWidth ? this.thumb : null;
    const key = name + '|' + status + '|' + sub + '|' + task + '|' + (img ? 1 : 0); if (key === this.labelKey) return; this.labelKey = key; const st = STATUS[status] || STATUS.available;
    this.labelD.draw((c, w, h) => {
      c.clearRect(0, 0, w, h); c.font = '700 54px ' + FONT_B; let nm = name || 'Teammate'; while (c.measureText(nm).width > 400 && nm.length > 3) nm = nm.slice(0, -2);
      const tw = c.measureText(nm).width; c.font = '700 32px ' + FONT_B; const line2 = st[1] + (sub ? ' · ' + sub : ''), sw = Math.min(410, c.measureText(line2).width);
      const bwid = Math.min(w - 6, Math.max(tw, sw) + 214), x0 = (w - bwid) / 2, y0 = 6, hh = 172;
      c.fillStyle = 'rgba(16,26,40,.9)'; rr(c, x0, y0, bwid, hh, 86); c.fill();
      const cx = x0 + 86, cy = y0 + 86; c.fillStyle = st[0]; c.beginPath(); c.arc(cx, cy, 78, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, 64, 0, 7); c.clip(); if (img) c.drawImage(img, cx - 64, cy - 64, 128, 128); else { c.fillStyle = '#f4f6f9'; c.fillRect(cx - 64, cy - 64, 128, 128); c.fillStyle = '#14202e'; c.font = '700 60px ' + FONT_D; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(initials(name), cx, cy + 4); } c.restore();
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = '700 54px ' + FONT_B; c.fillText(nm, x0 + 180, y0 + 62);
      c.fillStyle = st[0] === '#9aa6b2' ? '#c9d2dc' : st[0]; c.beginPath(); c.arc(x0 + 192, y0 + 122, 12, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '700 32px ' + FONT_B; c.fillText(line2, x0 + 214, y0 + 124, 410);
      if (task) { c.font = '700 30px ' + FONT_B; let tk = task; while (c.measureText(tk).width > w - 70 && tk.length > 4) tk = tk.slice(0, -2); const tw2 = c.measureText(tk).width + 44; c.fillStyle = 'rgba(255,255,255,.95)'; rr(c, (w - tw2) / 2, y0 + hh + 10, tw2, 56, 28); c.fill(); c.fillStyle = '#14202e'; c.textAlign = 'center'; c.fillText(tk, w / 2, y0 + hh + 39); c.textAlign = 'left'; }
    });
  }
  say(text) { ProcAvatar.prototype.say.call(this, text); }
  popEmoji(ch) { ProcAvatar.prototype.popEmoji.call(this, ch); }
  /* s: {moving, speed, seat, emote, emoteAge, emoteN, mug, pose, hand, speaking, call, look, activity, act:{k,age,x,z}, hideLabel} */
  update(dt, t, s) {
    const dist = camera.position.distanceTo(this.g.position), S = this.S;
    if (this.fallback) { this.fallback.update(dt, t, Object.assign({}, s, { hideLabel: true })); }
    // pick the clip for this moment
    let name = this.idleName, ts = 1, once = false, sy = 0, sz = 0;
    if (this.ready) {
      const act = s.act && s.act.age < (ACT_DUR[s.act.k] || 2) ? s.act : null;
      if (s.seat) { const k = s.seat.kind; name = k === 'desk' ? 'sit_table_idle_neutral_01' : 'sit_chair_idle_neutral_01'; sy = (s.seat.h || 0.5) - 0.5; sz = k === 'desk' ? -0.06 : -0.12; }
      else if (s.moving) { const sp = s.speed || 1.5; if (sp > 2.2) { name = 'run_neutral_01'; ts = clamp(sp / 2.8, 0.7, 1.4); } else { name = 'walk_neutral_01'; ts = clamp(sp / (this.cfg.m.charAt(0) === 'f' ? 1.21 : 1.02), 0.7, 1.7); } }
      else if (s.pose === 'paddle' || s.pose === 'cue') name = 'idle_neutral_01';
      else if (s.call) name = this.clips.cell_phone_talk_01 && !this.headset ? 'cell_phone_talk_01' : 'headphones_idle';
      else if (s.speaking) name = (Math.floor(t / 7 + this.ph) % 3) === 0 ? 'gestic_talk_excited_01' : (Math.floor(t / 7 + this.ph) % 2) ? 'gestic_talk_neutral_02' : 'gestic_talk_neutral_01';
      else if (s.listening) name = 'gestic_listen_neutral_01';
      else { this.idleT -= dt; if (this.idleT < 0) { this.idleT = 9 + Math.random() * 14; const r = Math.random(); this.idleName = r < 0.55 ? 'idle_neutral_01' : r < 0.85 ? 'idle_look_around_01' : r < 0.93 ? 'idle_stretch_arms_01' : 'idle_yawn_01'; } name = this.idleName; }
      if (s.emote && s.emoteAge < (EMO_DUR[s.emote] || 2.5) + 1.2 && !s.moving) {
        const clip = s.emote === 'dance' ? DANCES[Math.abs(s.emoteN || 0) % 3] : ONE_SHOT[s.emote];
        if (clip && this.clips[clip] && (!s.seat || /laugh|clap|cheer|drink|nod|shrug|think|wave/.test(clip))) { if (s.emoteN !== this.lastEmo) { this.lastEmo = s.emoteN; this.play(clip, 0.25, 1, true); } if (s.emoteAge < this.clips[clip].duration - 0.3 || s.emote === 'dance' && s.emoteAge < 8) name = clip; }
      }
      if (act && /jump|flip|kick|climb|pushup|spin/.test(act.k)) name = act.k === 'climb' ? 'idle_neutral_01' : name;
      if (name !== this.curName) this.play(name, s.moving || this.curName.startsWith('walk') || this.curName.startsWith('run') ? 0.22 : 0.4, ts); else if (this.cur) this.cur.timeScale = ts;
      // update the skeleton, at a lower rate when far away
      this.acc += dt; this.frame++; const every = dist > 30 ? 4 : dist > 18 ? 2 : 1;
      if (this.frame % every === 0 && this.mixer) { this.mixer.update(this.acc); this.acc = 0; this.post(dt, t, s, act, dist); }
      const wantShadow = dist < 20; if (wantShadow !== this.shadowOn) { this.shadowOn = wantShadow; this.model.traverse(o => { if (o.isMesh) o.castShadow = wantShadow; }); }
    }
    this.inner.position.y = -0.95 + (this.sitY = lerp(this.sitY || 0, sy, Math.min(1, dt * 8))); this.inner.position.z = this.sitZ = lerp(this.sitZ || 0, sz, Math.min(1, dt * 8));
    if (this.mug) this.mug.visible = !!s.mug && !s.hand;
    this.handIcon.visible = !!s.hand; if (s.hand) this.handIcon.position.y = (s.seat ? 1.95 : 2.35) * S + Math.sin(t * 4) * 0.04;
    this.shadow.visible = !s.seat && !(s.act && /flip|jump|climb/.test(s.act.k) && s.act.age < (ACT_DUR[s.act.k] || 2));
    const kd = clamp(dist / 12, 0.42, 2.6); this.label.scale.set(2.0 * kd, 0.8 * kd, 1); this.label.position.y = (s.seat ? 1.62 : 2.1) * S + 0.42 * kd + (this.climbY || 0); this.label.visible = !s.hideLabel;
    if (this.bubT > 0) { this.bubT -= dt; if (this.bubT <= 0) this.bub.visible = false; else { this.bub.material.opacity = Math.min(1, this.bubT * 2); this.bub.position.y = 2.5 * S + 0.84 * kd + 0.3 + (this.climbY || 0); } }
    if (this.emo.visible) { this.emoT += dt; this.emo.position.y = (2.3 + this.emoT * 0.45) * S + (this.climbY || 0); this.emo.material.opacity = clamp(1.8 - this.emoT, 0, 1); if (this.emoT > 1.8) this.emo.visible = false; }
  }
  /* procedural layer on top of the motion capture: head turns, raised hands, jaw, and the physical actions */
  post(dt, t, s, act, dist) {
    const B = this.bones; if (!B) return; this.g.updateMatrixWorld(true);
    const q = this.g.getWorldQuaternion(new T.Quaternion()), fwd = new T.Vector3(0, 0, 1).applyQuaternion(q), right = new T.Vector3(-1, 0, 0).applyQuaternion(q), up = UP;
    const V = (f, r, u) => new T.Vector3().addScaledVector(fwd, f).addScaledVector(right, r).addScaledVector(up, u);
    this.pivot.rotation.set(0, 0, 0); this.pivot.position.y = 0.95; this.climbY = 0;
    if (s.look && !s.moving && !act) { const dx = s.look.x - this.g.position.x, dz = s.look.z - this.g.position.z; let a = Math.atan2(dx, dz) - this.g.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.5) { const k = this.lookA = lerp(this.lookA || 0, clamp(a, -1.1, 1.1), Math.min(1, dt * 5)); turnBone(B.Neck, UP, k * 0.35); turnBone(B.Head, UP, k * 0.45); } } else this.lookA = lerp(this.lookA || 0, 0, Math.min(1, dt * 5));
    this.faceTick(dt, t, s, dist, right);
    if (s.seat && s.seat.kind === 'desk' && !s.call && s.activity !== 'read' && !s.hand && dist < 16) { const k = Math.sin(t * 14 + this.ph) * 0.04, k2 = Math.cos(t * 12 + this.ph) * 0.04; turnBone(B.R_Hand, right, k); turnBone(B.L_Hand, right, k2); }
    if (s.hand) { aimBone(B.R_UpperArm, B.R_Forearm, V(0.15, -0.1, 1), 0.95); aimBone(B.R_Forearm, B.R_Hand, V(0.1, 0, 1), 0.95); }
    if (s.emote === 'thumbs' && s.emoteAge < 2.2 && !s.moving) { const w = env(s.emoteAge, 2.2, 0.3); aimBone(B.R_UpperArm, B.R_Forearm, V(0.9, -0.2, -0.3), w); aimBone(B.R_Forearm, B.R_Hand, V(0.3, 0, 1), w); }
    if (s.emote === 'heart' && s.emoteAge < 2 && !s.moving) { const w = env(s.emoteAge, 2, 0.3); for (const [sd, sg] of [['R', 1], ['L', -1]]) { aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], V(0.4, sg * -0.2, -0.9), w); aimBone(B[sd + '_Forearm'], B[sd + '_Hand'], V(0.5, sg * 0.9, 0.35), w); } }
    if (s.pose === 'paddle') { turnBone(B.Spine, right, -0.12); turnBone(B.Spine1, right, -0.1); turnBone(B.Neck, right, 0.12); aimBone(B.R_UpperArm, B.R_Forearm, V(0.7, -0.4, -0.5), 1); aimBone(B.R_Forearm, B.R_Hand, V(1, 0, 0.1), 1); }
    if (s.pose === 'cue') { turnBone(B.Spine, right, -0.32); turnBone(B.Spine1, right, -0.3); turnBone(B.Neck, right, 0.34); aimBone(B.R_UpperArm, B.R_Forearm, V(-0.4, -0.3, -0.8), 1); aimBone(B.L_UpperArm, B.L_Forearm, V(1, 0.15, -0.2), 1); aimBone(B.L_Forearm, B.L_Hand, V(1, 0, -0.1), 1); }
    if (!act) return; const a = act.age, D = ACT_DUR[act.k] || 2, w = env(a, D, 0.2);
    if (act.k === 'jump') { const air = clamp((a - 0.3) / 0.6, 0, 1), h = Math.sin(air * PI) * 0.55, crouch = a < 0.3 ? Math.sin(a / 0.3 * PI / 2) : a > 0.9 ? Math.sin(clamp((a - 0.9) / 0.25, 0, 1) * PI) * 0.6 : 0;
      this.pivot.position.y = 0.95 + h - crouch * 0.18; for (const sd of ['R', 'L']) { aimBone(B[sd + '_Thigh'], B[sd + '_Calf'], V(0.6 * crouch + 0.2 * h, 0, -1), w); aimBone(B[sd + '_Calf'], B[sd + '_Foot'], V(-0.5 * crouch, 0, -1), w); aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], V(0.3, sd === 'R' ? 0.3 : -0.3, h > 0.05 ? 1 : -1), w); } }
    if (act.k === 'flip') { const p = smooth(0.25, 1.2, a), h = Math.sin(clamp((a - 0.2) / 1.05, 0, 1) * PI) * 1.25; this.pivot.position.y = 0.95 + h; this.pivot.rotation.x = -p * PI * 2; const tuck = Math.sin(p * PI);
      const pq = this.pivot.getWorldQuaternion(new T.Quaternion()), pf = new T.Vector3(0, 0, 1).applyQuaternion(pq), pu = new T.Vector3(0, 1, 0).applyQuaternion(pq), PV = (f, u) => new T.Vector3().addScaledVector(pf, f).addScaledVector(pu, u);
      for (const sd of ['R', 'L']) { aimBone(B[sd + '_Thigh'], B[sd + '_Calf'], PV(tuck, -1 + tuck * 0.9), w); aimBone(B[sd + '_Calf'], B[sd + '_Foot'], PV(-tuck * 0.2, -1), w); aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], PV(0.8 * tuck, 1 - tuck * 1.6), w); } }
    if (act.k === 'spin') { this.pivot.rotation.y = smooth(0, D, a) * PI * 2; for (const sd of ['R', 'L']) aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], V(0, sd === 'R' ? 1 : -1, 0.2), w); }
    if (act.k === 'kick') { const k = Math.sin(clamp((a - 0.15) / 0.7, 0, 1) * PI); aimBone(B.R_Thigh, B.R_Calf, V(k * 1.3, 0, -1 + k * 0.6), w); aimBone(B.R_Calf, B.R_Foot, V(k * 1.6, 0, -1 + k * 1.1), w); turnBone(B.Spine, right, k * 0.18); aimBone(B.L_UpperArm, B.L_Forearm, V(0.2, -1, -0.2), w); aimBone(B.R_UpperArm, B.R_Forearm, V(-0.3, 1, 0), w); }
    if (act.k === 'hug') { for (const [sd, sg] of [['R', 1], ['L', -1]]) { aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], V(1, sg * 0.35, 0.05), w); aimBone(B[sd + '_Forearm'], B[sd + '_Hand'], V(0.45, -sg * 1, 0.05), w); } turnBone(B.Head, UP, 0.35 * w); }
    if (act.k === 'shake') { const o = Math.sin(a * 11) * 0.12 * env(a, D, 0.6); aimBone(B.R_UpperArm, B.R_Forearm, V(0.55, 0.12, -0.8), w); aimBone(B.R_Forearm, B.R_Hand, V(1, -0.15, o), w); }
    if (act.k === 'five') { const k = smooth(0, 0.55, a); aimBone(B.R_UpperArm, B.R_Forearm, V(0.5, 0.15, 0.9), w); aimBone(B.R_Forearm, B.R_Hand, V(0.35 + k * 0.3, -0.1, 1), w); }
    if (act.k === 'tap') { const k = Math.sin(clamp(a / D, 0, 1) * PI); aimBone(B.R_UpperArm, B.R_Forearm, V(0.85, -0.25, -0.15), k); aimBone(B.R_Forearm, B.R_Hand, V(1, -0.2, 0.15 + Math.sin(a * 20) * 0.1), k); }
    if (act.k === 'pushup') { const k = env(a, D, 0.5), b = Math.sin(a * 6) * 0.5 + 0.5; this.pivot.rotation.x = k * 1.38; this.pivot.position.y = 0.95 - k * (0.62 - b * 0.12);
      const pq = this.pivot.getWorldQuaternion(new T.Quaternion()), pu = new T.Vector3(0, 1, 0).applyQuaternion(pq), pf = new T.Vector3(0, 0, 1).applyQuaternion(pq); for (const sd of ['R', 'L']) { aimBone(B[sd + '_UpperArm'], B[sd + '_Forearm'], new T.Vector3().addScaledVector(pf, 1).addScaledVector(pu, -0.4 + b * 0.3), k); aimBone(B[sd + '_Forearm'], B[sd + '_Hand'], new T.Vector3(0, -1, 0), k); aimBone(B[sd + '_Thigh'], B[sd + '_Calf'], new T.Vector3().addScaledVector(pu, -1), k); aimBone(B[sd + '_Calf'], B[sd + '_Foot'], new T.Vector3().addScaledVector(pu, -1), k); } }
    if (act.k === 'climb') { const up1 = smooth(0.4, 5, a), down = smooth(6.2, 10.6, a), hgt = (up1 - down) * 1.7, cyc = Math.sin(a * 5) * (a < 10.6 ? 1 : 0); this.climbY = hgt; this.pivot.position.y = 0.95 + hgt;
      aimBone(B.R_UpperArm, B.R_Forearm, V(0.25, 0.25, 1), w); aimBone(B.R_Forearm, B.R_Hand, V(0.3, 0, 0.6 + cyc * 0.4), w); aimBone(B.L_UpperArm, B.L_Forearm, V(0.25, -0.25, 1), w); aimBone(B.L_Forearm, B.L_Hand, V(0.3, 0, 0.6 - cyc * 0.4), w);
      aimBone(B.R_Thigh, B.R_Calf, V(0.55 + cyc * 0.35, 0, -0.8), w); aimBone(B.L_Thigh, B.L_Calf, V(0.55 - cyc * 0.35, 0, -0.8), w); aimBone(B.R_Calf, B.R_Foot, V(-0.2, 0, -1), w); aimBone(B.L_Calf, B.L_Foot, V(-0.2, 0, -1), w); }
  }
  dispose() { this.disposed = true; this.labelD.tex.dispose(); this.bubD.tex.dispose(); this.emoD.tex.dispose(); this.handD.tex.dispose(); if (this.mixer) this.mixer.stopAllAction(); if (this.g.parent) this.g.parent.remove(this.g); }
}
