#!/bin/sh
# Builds the WordPress plugin zips from the same app sources. Run after ../build.sh.
cd "$(dirname "$0")/.." || exit 1
P=wp/startdotcom-hq; EX="environments/RoomEnvironment.js loaders/GLTFLoader.js utils/SkeletonUtils.js shaders/CopyShader.js shaders/LuminosityHighPassShader.js postprocessing/EffectComposer.js postprocessing/RenderPass.js postprocessing/ShaderPass.js postprocessing/UnrealBloomPass.js"
APP=$(grep '^APP=' build.sh | cut -d'"' -f2)
rm -rf $P/app && mkdir -p $P/app/lib $P/app/models/thumbs
cp node_modules/three/build/three.min.js $P/app/lib/; for f in $EX; do cp node_modules/three/examples/js/$f $P/app/lib/$(basename $f); done
cp wp/shim-wp.js $P/app/shim-wp.js
{ cat src/head.html; echo '<script src="lib/three.min.js"></script>'; for f in $EX; do echo "<script src=\"lib/$(basename $f)\"></script>"; done
  echo '<script src="shim-wp.js"></script>'; echo '<script>'; cat $APP; echo '</script></body></html>'; } > $P/app/index.html
python3 - <<'PY'
import json, glob, os, shutil
from PIL import Image
src='../conv/models'; dst='wp/startdotcom-hq/app/models'
for f in glob.glob(src+'/*.json'):
    b=os.path.basename(f)
    if b.startswith('anim_'): shutil.copy(f, dst+'/'+b); continue
    d=json.load(open(f))
    for im in d.get('images', []):
        u=im['uri']; out=os.path.splitext(u)[0]+'.webp'; o=dst+'/'+out
        if not os.path.exists(o):
            i=Image.open(src+'/'+u); nrm='_n' in im.get('name','')
            i.save(o, 'WEBP', quality=88 if nrm else 80, method=6)
        im['uri']=out; im['mimeType']='image/webp'
    json.dump(d, open(dst+'/'+b,'w'), separators=(',',':'))
for f in glob.glob(src+'/thumbs/*'): shutil.copy(f, dst+'/thumbs/')
shutil.copy(src+'/LICENSE-Rocketbox.txt', dst+'/')
PY
cp wp/startdotcom-hq/app_icon.svg $P/app/models/icon.svg
cp wp/readme.txt $P/readme.txt 2>/dev/null
rm -f wp/startdotcom-hq.zip wp/startdotcom-hq-lite.zip wp/startdotcom-hq-core.zip wp/startdotcom-hq-people.zip
(cd wp && zip -qr -9 startdotcom-hq.zip startdotcom-hq)
# for hosts with a small upload limit: the plugin without the people (under 1 MB), and the people as a pack uploaded from the settings screen
(cd wp && zip -qr -9 startdotcom-hq-core.zip startdotcom-hq -x 'startdotcom-hq/app/models/*')
(cd $P/app && zip -qr -9 /home/claude/office/wp/startdotcom-hq-people.zip models)
du -sh $P/app/models; ls -la wp/*.zip | awk '{print $5, $9}'
