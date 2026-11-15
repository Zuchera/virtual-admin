#!/bin/sh
# dist/index.html: hosted artifact (libraries from CDNs). download/StartDotCom-HQ.html: everything inlined, works offline.
cd "$(dirname "$0")"
mkdir -p dist download
EX="environments/RoomEnvironment.js loaders/GLTFLoader.js utils/SkeletonUtils.js shaders/CopyShader.js shaders/LuminosityHighPassShader.js postprocessing/EffectComposer.js postprocessing/RenderPass.js postprocessing/ShaderPass.js postprocessing/UnrealBloomPass.js"
APP="src/world.js src/kit.js src/avatar.js src/human.js src/app.js src/extra.js src/v3.js src/v4.js src/v5.js src/v6.js src/v7.js src/build.js src/v8.js src/v9.js src/v10.js src/v11.js src/v12.js src/v13.js src/v14.js src/v15.js src/v16.js src/v17.js src/render.js src/boot.js"
{ cat src/head.html; echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  for f in $EX; do echo "<script src=\"https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/$f\"></script>"; done
  echo '<script>'; cat $APP; echo '</script></body></html>'; } > dist/index.html
{ cat src/head.html; echo '<script>'; cat node_modules/three/build/three.min.js; echo '</script>'
  for f in $EX; do echo '<script>'; cat node_modules/three/examples/js/$f; echo '</script>'; done
  echo '<script>'; cat $APP; echo '</script></body></html>'; } > download/StartDotCom-HQ.html
rm -rf dist/models && cp -r ../conv/models dist/models
cp download/StartDotCom-HQ.html dist/test.html
cat $APP > /tmp/all.js && node --check /tmp/all.js && echo syntax-ok
for f in $EX; do test -f node_modules/three/examples/js/$f || echo "MISSING $f"; done
wc -c dist/index.html download/StartDotCom-HQ.html
# deploy/: the upload-ready website for Vercel or WordPress (Supabase sign-in and live data)
rm -rf deploy && mkdir -p deploy/lib && cp -r ../conv/models deploy/models
cp node_modules/three/build/three.min.js deploy/lib/; for f in $EX; do cp node_modules/three/examples/js/$f deploy/lib/$(basename $f); done
cp node_modules/@supabase/supabase-js/dist/umd/supabase.js deploy/lib/supabase.js
cp standalone/shim.js standalone/config.js standalone/schema.sql standalone/README.md standalone/vercel.json standalone/.htaccess deploy/
{ cat src/head.html; echo '<script src="lib/three.min.js"></script>'; for f in $EX; do echo "<script src=\"lib/$(basename $f)\"></script>"; done
  echo '<script src="lib/supabase.js"></script><script src="config.js"></script><script src="shim.js"></script>'
  echo '<script>'; cat $APP; echo '</script></body></html>'; } > deploy/index.html
du -sh deploy
