/* ============================ rendering quality: Lite, Standard or High (bloom on lights and holograms, antialiased HDR buffer, vignette) ============================ */
const FX = { on: false, comp: null, bloom: null, out: null };
const OUT_SHADER = {
  uniforms: { tDiffuse: { value: null }, vig: { value: .2 }, t: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig; uniform float t; varying vec2 vUv;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + t) * 43758.5453); }
    void main(){ vec3 c = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0); vec3 s = toSRGB(c); vec2 d = vUv - 0.5; s *= 1.0 - vig * dot(d, d) * 1.7; s += (hash(vUv * 917.0) - 0.5) / 255.0; gl_FragColor = vec4(s, 1.0); }`
};
function makeFX() {
  if (FX.comp) return true; if (!T.EffectComposer || !T.UnrealBloomPass || !T.RenderPass || !T.ShaderPass) return false;
  try {
    const sz = renderer.getDrawingBufferSize(new T.Vector2()), gl2 = renderer.capabilities.isWebGL2, o = { format: T.RGBAFormat, type: gl2 ? T.HalfFloatType : T.UnsignedByteType };
    const rt = gl2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(sz.x, sz.y, o) : new T.WebGLRenderTarget(sz.x, sz.y, o);
    const c = new T.EffectComposer(renderer, rt); c.addPass(new T.RenderPass(scene, camera));
    FX.bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), .55, .5, gl2 ? 1.0 : .97); c.addPass(FX.bloom);
    FX.out = new T.ShaderPass(OUT_SHADER); c.addPass(FX.out); FX.comp = c; return true;
  } catch (e) { console.warn('High quality effects unavailable', e); FX.comp = null; return false; }
}
function setQuality(q) {
  local.quality = q; LS.set('local', local); const hi = q === 'high', lite = q === 'lite'; renderer.shadowMap.enabled = !lite; sun.castShadow = !lite; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  sun.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  renderer.setPixelRatio(lite ? 1 : Math.min(devicePixelRatio || 1, hi ? 2 : 1.75)); FX.on = hi && makeFX(); renderer.setSize(innerWidth, innerHeight, false); fxResize();
}
function fxResize() { if (!FX.comp) return; FX.comp.setPixelRatio(renderer.getPixelRatio()); FX.comp.setSize(innerWidth, innerHeight); }
function renderFrame() { if (FX.on && FX.comp) { FX.out.uniforms.t.value = (performance.now() % 997) / 997; FX.comp.render(); } else renderer.render(scene, camera); }
const AUTO_QUALITY = () => (matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4) ? 'standard' : 'high';
